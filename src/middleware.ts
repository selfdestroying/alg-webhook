import z from "zod";
import { LeadDataDto, RawLeadDataSchema } from "./lead.dto";
import { NextFunction, Request, Response } from "express";

export const apiMiddleware = (schema: z.ZodType<LeadDataDto>) => {
    return (req: Request, res: Response, next: NextFunction) => {
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