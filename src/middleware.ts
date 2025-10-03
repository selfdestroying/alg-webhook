import { NextFunction, Request, Response } from "express";
import z from "zod";
import { WebhookSchemaType } from "./dto/webhook.dto";
import botService from "./services/bot-service";
import { escapeHtml } from "./utils";

export function apiMiddleware(schema: z.ZodType<WebhookSchemaType>) {
  return async (
    req: Request<{}, {}, WebhookSchemaType>,
    res: Response,
    next: NextFunction
  ) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const payload = {
        message: "Invalid payload",
        body: req.body,
        errors: z.treeifyError(result.error),
      };
      await botService.sendToTelegram(
        `Ошибка:\n<pre>${escapeHtml(JSON.stringify(payload, null, 2))}</pre>`
      );
      return res.status(400).json(payload);
    }

    req.body = result.data;
    next();
  };
}
