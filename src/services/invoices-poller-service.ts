import cron, { ScheduledTask } from "node-cron";

import { getFieldValues } from "../lib/utils";
import { productItems } from "../products";
import {
  CatalogElementLinksResponseSchemaType,
  EventSchemaType,
} from "../schemas/events-schema";
import { OutputDataSchemaType } from "../schemas/output-data-schema";
import APIService from "./api-service";
import emailLogger from "./email-logger-service";
import WebhookService from "./webhook-service";

const DEFAULT_CRON = "*/10 * * * *"; // Каждые 10 минут
const DEFAULT_SUBDOMAIN = "algovyborg";
const DEFAULT_LAST_PROCESSED = 1765095410;

class InvoicesPollerService {
  private readonly apiService: APIService;
  private readonly webhookService: WebhookService;
  private readonly cronExpression: string;
  private cronJob?: ScheduledTask;
  private isRunning = false;
  private lastProcessedCreatedAt: number;

  constructor(options?: {
    subdomain?: string;
    cronExpression?: string;
    catalogId?: number;
    lastProcessedCreatedAt?: number;
  }) {
    const subdomain = options?.subdomain ?? DEFAULT_SUBDOMAIN;
    this.cronExpression = options?.cronExpression ?? DEFAULT_CRON;
    this.lastProcessedCreatedAt =
      options?.lastProcessedCreatedAt ?? DEFAULT_LAST_PROCESSED;
    this.apiService = new APIService(subdomain);
    this.webhookService = new WebhookService(subdomain);
  }

  start(): void {
    if (this.cronJob) {
      console.log("[InvoicesPoller] Планировщик уже запущен");
      return;
    }

    this.cronJob = cron.schedule(this.cronExpression, () => this.runSafe());

    console.log(
      `[InvoicesPoller] Запущен cron с выражением ${this.cronExpression}`
    );
    emailLogger.logInfo(
      `[InvoicesPoller] Запущен. Cron: ${this.cronExpression}. Проверка каждые 10 минут.`
    );
  }

  stop(): void {
    if (!this.cronJob) {
      console.log("[InvoicesPoller] Планировщик уже остановлен");
      return;
    }

    this.cronJob.stop();
    this.cronJob = undefined;

    console.log("[InvoicesPoller] Планировщик остановлен");
    emailLogger.logInfo("[InvoicesPoller] Планировщик остановлен");
  }

  async runOnce(): Promise<void> {
    await this.runSafe();
  }

  getStatus(): { isRunning: boolean; cronExpression: string } {
    return {
      isRunning: Boolean(this.cronJob),
      cronExpression: this.cronExpression,
    };
  }

  private async runSafe() {
    if (this.isRunning) {
      console.warn(
        "[InvoicesPoller] Предыдущий опрос еще выполняется, пропуск"
      );
      return;
    }

    this.isRunning = true;
    try {
      await this.pollOnce();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error("[InvoicesPoller] Ошибка опроса:", message);
      await emailLogger.logError(`[InvoicesPoller] Ошибка опроса\n${message}`);
    } finally {
      this.isRunning = false;
    }
  }

  private async pollOnce() {
    const eventsResponse = await this.apiService.getInvoicePaidEvents(
      this.lastProcessedCreatedAt
    );
    const events = eventsResponse?._embedded?.events ?? [];

    if (!events.length) {
      console.log("[InvoicesPoller] Новых событий invoice_paid нет");
      return;
    }

    let maxCreatedAt = this.lastProcessedCreatedAt;

    for (const event of events) {
      await this.processEvent(event);
      const created = Number(event.created_at ?? 0);
      if (Number.isFinite(created) && created > maxCreatedAt) {
        maxCreatedAt = created;
      }
    }

    this.lastProcessedCreatedAt = maxCreatedAt + 1;
    console.log(
      `[InvoicesPoller] Завершено. lastProcessedCreatedAt=${this.lastProcessedCreatedAt}`
    );
  }

  private async processEvent(event: EventSchemaType) {
    try {
      const entityId = event.entity_id;
      const catalogId = event._embedded?.entity?.catalog_id;

      if (catalogId == null) {
        await emailLogger.logError(
          "[InvoicesPoller] Событие без catalog_id, пропускаем"
        );
        return;
      }

      if (entityId == null) {
        await emailLogger.logError(
          "[InvoicesPoller] Событие без entity_id, пропускаем"
        );
        return;
      }

      const catalogElement = await this.apiService.getCatalogElement(
        catalogId,
        entityId
      );
      const products = getFieldValues(catalogElement, "items");
      const leadId = await this.extractLeadId(entityId, catalogId);
      if (leadId == null) {
        await emailLogger.logError(
          `[InvoicesPoller] Не удалось получить связанный lead для элемента ${entityId}`
        );
        return;
      }

      const lead = await this.apiService.getLead(leadId);
      const outputDataItem: OutputDataSchemaType = {
        lead_id: lead.id ?? leadId,
        data: {
          name: lead.name,
          products,
        },
      };

      if (products.length !== 1) {
        await this.webhookService.saveUnprocessed(
          products.length === 0
            ? "Нет товаров в сделке"
            : "Больше одного товара в сделке",
          { ...outputDataItem, rawProducts: products }
        );
        await emailLogger.logInfo(
          `В сделке ${lead.id ?? leadId} обнаружено количество товаров: ${
            products.length
          }.`
        );
        return false;
      }

      const productItem = productItems.find(
        (item) => item.productId === products[0].product_id
      );

      if (!productItem) {
        await this.webhookService.saveUnprocessed(
          "Не найдена информация про такой товар",
          { ...outputDataItem, rawProduct: products[0] }
        );
        await emailLogger.logError(
          `В сделке ${lead.id ?? leadId} не найдена информация о товаре: ${
            products[0].product_id
          }`
        );
        return false;
      }

      outputDataItem.data.products.push({
        product_id: productItem.productId,
        product_name: products[0].description,
        price: productItem.price,
        lesson_count: productItem.lessonCount,
      });

      await this.webhookService.processOutputItem(outputDataItem);
      await emailLogger.logSuccess(
        `Успешно обработана сделка ${lead.id ?? leadId} с товаром ${
          products[0].product_id
        }`
      );
      return true;
    } catch (leadErr) {
      const message =
        leadErr instanceof Error ? leadErr.message : String(leadErr);
      await this.webhookService.saveUnprocessed(
        `Ошибка обработки события ${event} `,
        { event, error: message }
      );
      await emailLogger.logError(
        `Ошибка обработки события ${event} : ${message}`
      );
      return false;
    }
  }

  private async extractLeadId(
    elementId: string | number,
    catalogId: string | number
  ) {
    const linksResponse: CatalogElementLinksResponseSchemaType =
      await this.apiService.getCatalogElementLinks(
        catalogId,
        elementId,
        "leads"
      );

    const links = linksResponse?._embedded?.links ?? [];
    const firstLink = links.find((link) => link.to_entity_id != null);
    return firstLink?.to_entity_id ?? null;
  }
}

export default new InvoicesPollerService();
