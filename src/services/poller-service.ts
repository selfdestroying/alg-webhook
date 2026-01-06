import cron, { ScheduledTask } from 'node-cron';

import ApiError from '../error/api-error';
import { Prisma } from '../generated/prisma/browser';
import PollerStateStorage from '../lib/poller-state';
import { prisma } from '../lib/prisma';
import { normalizeNameParts } from '../lib/utils';
import PaymentRepository from '../repositories/payment-repository';
import StudentRepository from '../repositories/student-repository';
import unprocessedPaymentRepository from '../repositories/unprocessed-payment-repository';
import { Payment } from '../types/payment';
import PaymentsService from './payments-service';

class PollerService {
  private cronJob?: ScheduledTask;
  private isRunning = false;

  start() {
    if (this.cronJob) {
      throw new ApiError(400, 'Планировщик уже запущен');
    }

    this.cronJob = cron.schedule(PollerStateStorage.getCronExpression(), () => this.trigger());
  }

  stop(): void {
    if (!this.cronJob) {
      throw new ApiError(400, 'Планировщик уже остановлен');
    }

    this.cronJob.stop();
    this.cronJob = undefined;
  }

  status() {
    return {
      isRunning: Boolean(this.cronJob),
      cronExpression: PollerStateStorage.getCronExpression(),
    };
  }

  async trigger() {
    if (this.isRunning) {
      throw new ApiError(400, 'Опрос уже выполняется в данный момент');
    }

    this.isRunning = true;

    try {
      const payments = await PaymentsService.getLastPayments(
        PollerStateStorage.getLastProcessedCreatedAt(),
      );
      const nextLastProcessed =
        payments.reduce(
          (max, payment) => Math.max(max, Number(payment.createdAt)),
          PollerStateStorage.getLastProcessedCreatedAt(),
        ) + 1;

      for (const payment of payments) {
        await this.processPayment(payment);
      }

      await PollerStateStorage.updateLastProcessed(nextLastProcessed);
    } finally {
      this.isRunning = false;
    }
  }

  private async processPayment(payment: Payment) {
    const normalizedParts = normalizeNameParts(payment.leadName);
    if (normalizedParts.length < 2) {
      await unprocessedPaymentRepository.create({
        data: {
          rawData: payment as unknown as Prisma.InputJsonValue,
          reason: 'Недостаточно частей в имени',
          resolved: false,
        },
      });
      return;
    }

    const student = await StudentRepository.findByNameCandidates([
      { firstName: normalizedParts[0], lastName: normalizedParts[1] },
      { firstName: normalizedParts[1], lastName: normalizedParts[0] },
    ]);

    if (!student) {
      await unprocessedPaymentRepository.create({
        data: {
          rawData: payment as unknown as Prisma.InputJsonValue,
          reason: 'Студент не найден по имени',
          resolved: false,
        },
      });
      return;
    }

    if (payment.products.length !== 1) {
      await unprocessedPaymentRepository.create({
        data: {
          rawData: payment as unknown as Prisma.InputJsonValue,
          reason: 'Ожидается один товар',
          resolved: false,
          studentId: student?.id,
        },
      });
      return;
    }

    const productItem = await prisma.paymentProduct.findFirst({
      where: {
        OR: [
          { productId: payment.products[0].value.product_id },
          { name: payment.products[0].value.description },
        ],
      },
    });
    if (!productItem) {
      await unprocessedPaymentRepository.create({
        data: {
          rawData: payment as unknown as Prisma.InputJsonValue,
          reason: 'Не найдена информация про такой товар',
          resolved: false,
          studentId: student?.id,
        },
      });
      return;
    }

    const price = productItem.price;
    const lessonCount = productItem.lessonCount;

    await PaymentRepository.create({
      data: {
        studentId: student.id,
        lessonCount,
        price,
        bidForLesson: price / lessonCount,
        leadName: payment.leadName,
        productName: payment.products[0].value.description,
      },
    });
    await StudentRepository.update(student.id, {
      lessonsBalance: { increment: lessonCount },
      totalLessons: { increment: lessonCount },
      totalPayments: { increment: price },
    });
  }
}

export default new PollerService();
