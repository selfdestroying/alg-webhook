import z from "zod";
import { NextFunction, Request, Response } from "express";
import { WebhookSchemaType } from "./webhook.dto";


export function apiMiddleware(schema: z.ZodType<WebhookSchemaType>) {
    return (req: Request<{}, {}, WebhookSchemaType>, res: Response, next: NextFunction) => {
        const result = schema.safeParse(req.body)
        if (!result.success) {
            return res.status(400).json({
                message: 'Invalid payload',
                errors: z.treeifyError(result.error)
            })
        }

        req.body = result.data
        next()
    }
}