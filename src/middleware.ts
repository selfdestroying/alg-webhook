import { NextFunction, Request, Response } from "express";
import z from "zod";
import { WebhookSchema, WebhookSchemaType } from "./schemas/webhook-schema";
import emailLoggerService from "./services/email-logger-service";

export async function webhookMiddleware(
  req: Request<{}, {}, WebhookSchemaType>,
  res: Response,
  next: NextFunction
) {
  const webhookInfo = {
    timestamp: new Date().toISOString(),
    method: req.method,
    url: req.url,
    ip: req.ip?.toString() ?? "unknown",
    headers: req.headers,
    body: req.body,
  };

  await emailLoggerService.logInfo(
    `Incoming Webhook:\n\n${JSON.stringify(webhookInfo, null, 2)}`
  );

  const result = WebhookSchema.safeParse(req.body);
  if (!result.success) {
    const payload = {
      message: "Invalid payload",
      body: req.body,
      errors: z.treeifyError(result.error),
    };

    await emailLoggerService.logError(
      `Webhook Validation Error:\n\n${JSON.stringify(
        {
          error: "Validation failed",
          request: {
            method: req.method,
            url: req.url,
            ip: req.ip?.toString() ?? "unknown",
          },
          body: req.body,
          validationErrors: payload.errors,
        },
        null,
        2
      )}`
    );

    return res.status(400).json(payload);
  }

  req.body = result.data;
  next();
}
