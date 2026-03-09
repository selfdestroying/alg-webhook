import cron, { ScheduledTask } from 'node-cron';

import ApiError from '../error/api-error';
import { Prisma, StudentLessonsBalanceChangeReason } from '../generated/prisma/browser';
import PollerStateStorage from '../lib/poller-state';
import { prisma } from '../lib/prisma';
import { normalizeNameParts } from '../lib/utils';
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
          organizationId: 1,
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
          organizationId: 1,
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
          organizationId: 1,
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
        organizationId: 1,
      },
    });
    if (!productItem) {
      await unprocessedPaymentRepository.create({
        data: {
          rawData: payment as unknown as Prisma.InputJsonValue,
          reason: 'Не найдена информация про такой товар',
          resolved: false,
          studentId: student?.id,
          organizationId: 1,
        },
      });
      return;
    }

    const price = productItem.price;
    const lessonCount = productItem.lessonCount;

    const studentWithGroups = await StudentRepository.findStudentWithWallet(student.id);
    const groups = studentWithGroups?.StudentGroup ?? [];

    if (groups.length === 0) {
      await unprocessedPaymentRepository.create({
        data: {
          rawData: payment as unknown as Prisma.InputJsonValue,
          reason: 'Студент не состоит ни в одной группе',
          resolved: false,
          studentId: student.id,
          organizationId: 1,
        },
      });
      return;
    }

    if (groups.length > 1) {
      await unprocessedPaymentRepository.create({
        data: {
          rawData: payment as unknown as Prisma.InputJsonValue,
          reason: 'Студент состоит в нескольких группах, невозможно определить кошелёк',
          resolved: false,
          studentId: student.id,
          organizationId: 1,
        },
      });
      return;
    }

    const studentGroup = groups[0];
    const wallet = studentGroup.Wallet;

    if (!wallet) {
      await unprocessedPaymentRepository.create({
        data: {
          rawData: payment as unknown as Prisma.InputJsonValue,
          reason: 'У группы студента нет привязанного кошелька',
          resolved: false,
          studentId: student.id,
          organizationId: 1,
        },
      });
      return;
    }

    const balanceBefore = wallet.lessonsBalance;

    await prisma.$transaction(async (tx) => {
      await tx.payment.create({
        data: {
          studentId: student.id,
          lessonCount,
          price,
          bidForLesson: price / lessonCount,
          leadName: payment.leadName,
          productName: payment.products[0].value.description,
          organizationId: 1,
          groupId: studentGroup.groupId,
          walletId: wallet.id,
        },
      });

      const updatedWallet = await tx.wallet.update({
        where: { id: wallet.id },
        data: {
          lessonsBalance: { increment: lessonCount },
          totalLessons: { increment: lessonCount },
          totalPayments: { increment: price },
        },
      });

      await tx.studentLessonsBalanceHistory.create({
        data: {
          studentId: student.id,
          reason: StudentLessonsBalanceChangeReason.PAYMENT_CREATED,
          delta: lessonCount,
          balanceBefore,
          balanceAfter: updatedWallet.lessonsBalance,
          meta: payment as unknown as Prisma.InputJsonValue,
          organizationId: 1,
          groupId: studentGroup.groupId,
          walletId: wallet.id,
        },
      });
    });
  }
}

export default new PollerService();
