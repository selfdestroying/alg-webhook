import { Prisma, Student } from "@prisma/client";
import prisma from "../prisma";

export class StudentRepository {
  async findByName(
    firstName: string,
    lastName: string
  ): Promise<Student | null> {
    return prisma.student.findFirst({
      where: { AND: [{ firstName }, { lastName }] },
    });
  }

  async findById(id: number): Promise<Student | null> {
    return prisma.student.findUnique({ where: { id } });
  }

  async create(data: Prisma.StudentCreateInput): Promise<Student> {
    return prisma.student.create({ data });
  }

  async update(id: number, data: Prisma.StudentUpdateInput): Promise<Student> {
    return prisma.student.update({
      where: { id },
      data,
    });
  }

  async delete(id: number): Promise<Student> {
    return prisma.student.delete({ where: { id } });
  }
}


