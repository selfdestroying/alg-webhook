import { Request, Response } from "express";
import { escapeHtml } from "../lib/utils";
import { productItems } from "../products";
import { OutputDataSchemaType } from "../schemas/output-data-schema";
import { WebhookSchemaType } from "../schemas/webhook-schema";
import EmailLoggerService from "../services/email-logger-service";
import WebhookService from "../services/webhook-service";

class WebhookController {
  constructor() {}

  public handleWebhook = async (
    req: Request<{}, {}, WebhookSchemaType>,
    res: Response
  ) => {
    try {
      const payload = req.body;
      const subdomain = payload.account.subdomain || process.env.CRM_SUBDOMAIN;
      const actions = payload.leads?.add ?? payload.leads?.status ?? [];
      if (!Array.isArray(actions) || actions.length === 0) {
        throw new Error("No actions provided");
      }

      if (!subdomain) {
        throw new Error("Subdomain is not specified in the payload or env");
      }

      const webhookService = new WebhookService(subdomain);
      let processedCount = 0;
      let failedCount = 0;

      for (const { id: leadId } of actions) {
        if (!leadId) {
          await EmailLoggerService.logError(
            `Пропущено действие вебхука из-за отсутствия ID сделки: ${JSON.stringify(
              { action: { id: leadId } },
              null,
              2
            )}`
          );
          continue;
        }
        const ok = await this.processLeadAction(webhookService, leadId);
        if (ok) {
          processedCount += 1;
        } else {
          failedCount += 1;
        }
      }

      await EmailLoggerService.logInfo(
        `Webhook обработан: успешно=${processedCount}, неуспешно=${failedCount}, всего=${actions.length}.`
      );
      if (processedCount === 0) {
        return res
          .status(500)
          .json({ ok: false, error: "Все сделки не были обработаны" });
      }

      return res.status(200).json({ ok: true, processed: processedCount, failed: failedCount });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      await EmailLoggerService.logError(
        `Ошибка обработки вебхука: ${escapeHtml(
          message
        )}\nКонтекст: ${escapeHtml(
          JSON.stringify(req.body, null, 2)
        )}\nЗапрос: IP=${req.ip?.toString() ?? ""}, method=${req.method}, url=${
          req.url
        }`
      );
      return res.status(500).json({ ok: false, error: message });
    }
  };

  private async processLeadAction(
    webhookService: WebhookService,
    leadId: number | string
  ): Promise<boolean> {
    try {
      const lead = await webhookService.processLead(leadId);
      const products = await webhookService.processProducts(lead);

      const outputDataItem: OutputDataSchemaType = {
        lead_id: lead.id ?? leadId,
        data: {
          name: lead.name,
          products: [],
        },
      };

      if (products.length !== 1) {
        await webhookService.saveUnprocessed(
          products.length === 0
            ? "Нет товаров в сделке"
            : "Больше одного товара в сделке",
          { ...outputDataItem, rawProducts: products }
        );
        await EmailLoggerService.logInfo(
          `В сделке ${lead.id ?? leadId} обнаружено количество товаров: ${products.length}.`
        );
        return false;
      }

      const productItem = productItems.find(
        (item) => item.productId === products[0].product_id
      );

      if (!productItem) {
        await webhookService.saveUnprocessed(
          "Не найдена информация про такой товар",
          { ...outputDataItem, rawProduct: products[0] }
        );
        await EmailLoggerService.logError(
          `В сделке ${lead.id ?? leadId} не найдена информация о товаре: ${products[0].product_id}`
        );
        return false;
      }

      outputDataItem.data.products.push({
        product_id: productItem.productId,
        product_name: products[0].description,
        price: productItem.price,
        lesson_count: productItem.lessonCount,
      });

      await webhookService.processOutputItem(outputDataItem);
      await EmailLoggerService.logSuccess(
        `Успешно обработана сделка ${lead.id ?? leadId} с товаром ${products[0].product_id}`
      );
      return true;
    } catch (leadErr) {
      const message = leadErr instanceof Error ? leadErr.message : String(leadErr);
      await webhookService.saveUnprocessed(
        `Ошибка обработки сделки ${leadId}`,
        { leadId, error: message }
      );
      await EmailLoggerService.logError(
        `Ошибка обработки сделки ${leadId}: ${message}`
      );
      return false;
    }
  }
}

export default new WebhookController();
