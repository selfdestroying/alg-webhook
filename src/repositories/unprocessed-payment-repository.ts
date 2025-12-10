import { Prisma, UnprocessedPayment } from '../generated/prisma/client';
import { prisma } from '../lib/prisma';

class UnprocessedPaymentRepository {
  async create(payload: Prisma.UnprocessedPaymentCreateArgs): Promise<UnprocessedPayment> {
    return prisma.unprocessedPayment.create(payload);
  }
}

export default new UnprocessedPaymentRepository();
