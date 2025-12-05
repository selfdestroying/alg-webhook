import { Prisma } from "../generated/prisma/client";
import { LeadDataDto } from "../schemas/lead-schema";
import { OutputDataSchemaType } from "../schemas/output-data-schema";

import { getFieldValues } from "../lib/utils";
import { PaymentRepository } from "../repositories/payment-repository";
import { StudentRepository } from "../repositories/student-repository";
import { UnprocessedPaymentRepository } from "../repositories/unprocessed-payment-repository";
import APIService from "./api-service";

export default class WebhookService {
  private apiService: APIService;
  private studentRepository: StudentRepository;
  private paymentRepository: PaymentRepository;
  private unprocessedPaymentRepository: UnprocessedPaymentRepository;

  constructor(subdomain: string) {
    this.apiService = new APIService(subdomain);
    this.studentRepository = new StudentRepository();
    this.paymentRepository = new PaymentRepository();
    this.unprocessedPaymentRepository = new UnprocessedPaymentRepository();
  }
  async processLead(leadId: string | number) {
    const lead = await this.apiService.getLead(leadId);
    return lead;
  }
  async processProducts(lead: LeadDataDto) {
    const lastCatalogElement = lead?._embedded?.catalog_elements?.at(-1);

    if (!lastCatalogElement) {
      await this.saveUnprocessed("Нет catalog_elements у сделки", {
        leadId: lead?.id ?? null,
        lead,
      });
      return [];
    }
    const catalogElementData = await this.apiService.getCatalogElement(
      lastCatalogElement.metadata?.catalog_id,
      lastCatalogElement.id
    );

    const products = getFieldValues(catalogElementData, "items");
    return products;
  }
  async processOutputItem(outputDataItem: OutputDataSchemaType) {
    if (!outputDataItem.data.name) {
      await this.saveUnprocessed("Отсутствует имя сделки", outputDataItem);
      return;
    }
    const normalizedParts = this.normalizeNameParts(outputDataItem.data.name);
    if (normalizedParts.length < 2) {
      await this.saveUnprocessed("Недостаточно частей в имени", {
        outputDataItem,
        normalizedParts,
      });
      return;
    }

    const nameCandidates = this.buildNameCandidates(normalizedParts);
    const student = await this.studentRepository.findByNameCandidates(
      nameCandidates
    );

    if (!student) {
      await this.saveUnprocessed("Студент не найден", {
        outputDataItem,
        nameCandidates,
      });
      return;
    }

    if (outputDataItem.data.products.length !== 1) {
      await this.saveUnprocessed("Ожидается один товар", outputDataItem, {
        studentId: student.id,
      });
      return;
    }

    const product = outputDataItem.data.products[0];
    const price = Number(product.price);
    const lessonCountValue =
      (product as Record<string, unknown>).lesson_count ??
      (product as Record<string, unknown>).lessonCount;
    const lessonCount = Number(lessonCountValue);

    if (
      !Number.isFinite(price) ||
      !Number.isFinite(lessonCount) ||
      lessonCount <= 0
    ) {
      await this.saveUnprocessed(
        "Некорректная цена или количество уроков",
        { outputDataItem, product },
        { studentId: student.id }
      );
      return;
    }

    await this.paymentRepository.create({
      data: {
        studentId: student.id,
        lessonCount,
        price,
        bidForLesson: price / lessonCount,
        leadName: outputDataItem.data.name,
        productName: product.product_name || undefined,
      },
    });

    await this.studentRepository.update(student.id, {
      totalLessons: { increment: lessonCount },
      totalPayments: { increment: price },
      lessonsBalance: { increment: lessonCount },
    });
  }

  async saveUnprocessed(
    reason: string,
    rawData: unknown,
    options?: { studentId?: number }
  ) {
    await this.unprocessedPaymentRepository.create({
      data: {
        rawData: rawData as Prisma.InputJsonValue,
        reason,
        resolved: false,
        studentId: options?.studentId,
      },
    });
  }

  private normalizeNameParts(name: string): string[] {
    return name
      .split(" ")
      .map((part) => part.trim())
      .filter(Boolean);
  }

  private buildNameCandidates(parts: string[]) {
    const candidates: Array<{ firstName: string; lastName: string }> = [];

    if (parts.length >= 2) {
      const first = parts[0];
      const last = parts[1];
      candidates.push({ firstName: first, lastName: last });
      if (parts.length === 3) {
        candidates.push({ firstName: first, lastName: parts[1] });
        candidates.push({ firstName: parts[1], lastName: last });
      }
      candidates.push({ firstName: last, lastName: first });
    }

    const seen = new Set<string>();
    return candidates.filter((c) => {
      const key = `${c.firstName.toLowerCase()}|${c.lastName.toLowerCase()}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }
}
