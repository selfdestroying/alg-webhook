import { Prisma, Student } from '../generated/prisma/client';
import { prisma } from '../lib/prisma';

class StudentRepository {
  async findByName(firstName: string, lastName: string): Promise<Student | null> {
    return prisma.student.findFirst({
      where: { AND: [{ firstName }, { lastName }] },
    });
  }

  async findByNameVariants(firstName: string, lastName: string): Promise<Student | null> {
    return prisma.student.findFirst({
      where: {
        OR: [
          {
            AND: [
              {
                firstName: {
                  equals: firstName,
                  mode: Prisma.QueryMode.insensitive,
                },
              },
              {
                lastName: {
                  equals: lastName,
                  mode: Prisma.QueryMode.insensitive,
                },
              },
            ],
          },
          {
            AND: [
              {
                firstName: {
                  equals: lastName,
                  mode: Prisma.QueryMode.insensitive,
                },
              },
              {
                lastName: {
                  equals: firstName,
                  mode: Prisma.QueryMode.insensitive,
                },
              },
            ],
          },
        ],
      },
    });
  }

  async findByNameCandidates(
    candidates: Array<{ firstName: string; lastName: string }>,
  ): Promise<Student | null> {
    const orConditions = candidates
      .filter((c) => c.firstName && c.lastName)
      .map((c) => ({
        AND: [
          {
            firstName: {
              equals: c.firstName,
              mode: Prisma.QueryMode.insensitive,
            },
          },
          {
            lastName: {
              equals: c.lastName,
              mode: Prisma.QueryMode.insensitive,
            },
          },
        ],
      }));

    if (orConditions.length === 0) {
      return null;
    }

    return prisma.student.findFirst({ where: { OR: orConditions } });
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

export default new StudentRepository();
