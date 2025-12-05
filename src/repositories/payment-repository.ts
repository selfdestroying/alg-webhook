import { Payment, Prisma } from "../generated/prisma/client";
import { prisma } from "../lib/prisma";

export class PaymentRepository {
  async create(payload: Prisma.PaymentCreateArgs): Promise<Payment> {
    return prisma.payment.create(payload);
  }

  async findById(id: number): Promise<Payment | null> {
    return prisma.payment.findUnique({ where: { id } });
  }

  async listByStudent(studentId: number): Promise<Payment[]> {
    return prisma.payment.findMany({ where: { studentId } });
  }
}
