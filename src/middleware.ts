import { NextFunction, Request, Response } from "express";
import z from "zod";
import { WebhookSchemaType } from "./dto/webhook.dto";
import { escapeHtml } from "./utils";
import { errorEmailService } from "./services/email-service";

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
      await errorEmailService.sendError(
        {
          error: new Error(`Ошибка:\n<pre>${escapeHtml(JSON.stringify(payload, null, 2))}</pre>`),
          context: escapeHtml(JSON.stringify(req.body, null, 2)),
          request: {
            ip: req.ip?.toString() ?? '',
            method: req.method,
            url: req.url,
          },
        }
      );
      return res.status(400).json(payload);
    }

    req.body = result.data;
    next();
  };
}
