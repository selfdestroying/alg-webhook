import { LeadDataDto } from "../dto/lead.dto";
import { OutputDataSchemaType } from "../dto/output-data.dto";
import prisma from "../lib/prisma";
import { PaymentRepository } from "../repositories/payment-repository";
import { StudentRepository } from "../repositories/student-repository";
import { getFieldValues } from "../utils";
import APIService from "./api-service";

export default class WebhookService {
  private apiService: APIService;
  private studentRepository: StudentRepository;
  private paymentRepository: PaymentRepository;

  constructor(subdomain: string) {
    this.apiService = new APIService(subdomain);
    this.studentRepository = new StudentRepository();
    this.paymentRepository = new PaymentRepository();
  }
  async processLead(leadId: string | number) {
    const lead = await this.apiService.getLead(leadId);
    return lead;
  }
  async processProducts(lead: LeadDataDto) {
    const lastCatalogElement = lead?._embedded?.catalogElements?.at(-1);

    if (!lastCatalogElement) {
      throw new Error(
        `No catalog elements in lead: ${JSON.stringify(lead, null, 2)}`
      );
    }
    const catalogElementData = await this.apiService.getCatalogElement(
      lastCatalogElement.metadata.catalogId,
      lastCatalogElement.id
    );

    const products = getFieldValues(catalogElementData, "items");
    return products;
  }
  async processOutputItem(outputDataItem: OutputDataSchemaType) {
    const splittedName = outputDataItem.data.name.split(" ");
    if (splittedName.length < 4 && splittedName.length > 6) {
      await prisma.unprocessedPayment.create({
        data: {
          rawData: outputDataItem,
          reason: "Неожиданное имя сделки",
          resolved: false,
        },
      });
      return;
    }
    const [firstName, lastName] = splittedName;
    const student = await prisma.student.findFirst({
      where: {
        OR: [
          { AND: [{ firstName: firstName }, { lastName: lastName }] },
          { AND: [{ firstName: lastName }, { lastName: firstName }] },
        ],
      },
    });

    if (!student) {
      await prisma.unprocessedPayment.create({
        data: {
          rawData: outputDataItem,
          reason: "Студент не найден",
          resolved: false,
        },
      });
      return;
    }

    if (outputDataItem.data.products.length === 1) {
      const product = outputDataItem.data.products[0];
      await this.paymentRepository.create({
        data: {
          studentId: student.id,
          lessonCount: product.lessonCount,
          price: product.price,
          bidForLesson: product.price / product.lessonCount,
          leadName: outputDataItem.data.name,
          productName: product.productName,
        },
      });

      await this.studentRepository.update(student.id, {
        totalLessons: { increment: product.lessonCount },
        totalPayments: { increment: product.price },
        lessonsBalance: { increment: product.lessonCount },
      });
    }
  }
}
