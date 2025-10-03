import { Request, Response } from "express";
import { OutputDataSchemaType } from "../dto/output-data.dto";
import { WebhookSchemaType } from "../dto/webhook.dto";
import prisma from "../lib/prisma";
import { productItems } from "../products";
import botService from "../services/bot-service";
import WebhookService from "../services/webhook-service";
import { escapeHtml } from "../utils";

class WebhookController {
  constructor() {}

  public handleWebhook = async (
    req: Request<{}, {}, WebhookSchemaType>,
    res: Response
  ) => {
    try {
      const payload = req.body;
      const subdomain = payload.account.subdomain;
      const actions = payload.leads.add ?? payload.leads.status ?? [];
      if (!Array.isArray(actions) || actions.length === 0) {
        throw new Error("No actions provided");
      }

      const webhookService = new WebhookService(subdomain);

      for (const { id: leadId } of actions) {
        const lead = await webhookService.processLead(leadId);
        const products = await webhookService.processProducts(lead);

        const outputDataItem: OutputDataSchemaType = {
          leadId: lead.id,
          data: {
            name: lead.name,
            products: [],
          },
        };

        if (products.length > 1) {
          await prisma.unprocessedPayment.create({
            data: {
              rawData: {
                ...outputDataItem,
                rawProducts: products,
              },
              reason: "Больше одного товара в сделке",
              resolved: false,
            },
          });
        } else if (products.length === 1) {
          const productItem = productItems.find(
            (item) => item.productId === products[0].productId
          );
          if (!productItem) {
            await prisma.unprocessedPayment.create({
              data: {
                rawData: {
                  ...outputDataItem,
                  rawProduct: products[0],
                },
                reason: "Не найдена информация про такой товар",
                resolved: false,
              },
            });
            continue;
          }
          outputDataItem.data.products.push({
            ...productItem,
            productName: products[0].description,
          });
          await webhookService.processOutputItem(outputDataItem);
        }
      }

      return res.status(200).json({ ok: true });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      await botService.sendToTelegram(
        `Ошибка обработки вебхука:\n<pre>${escapeHtml(message)}</pre>`
      );

      return res.status(500).json({ ok: false, error: message });
    }
  };
}

export default new WebhookController();
