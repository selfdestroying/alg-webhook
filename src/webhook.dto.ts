import z from "zod";

export const LeadActionSchema = z.object({
    id: z.union([z.number(), z.string()]),
    status_id: z.union([z.number(), z.string()]),
    pipeline_id: z.union([z.number(), z.string()])
}).transform((raw) => ({
    id: raw.id,
    statusId: raw.status_id,
    pipelineId: raw.pipeline_id
}))

const WebhookLeadSchema = z.object({
    add: z.array(LeadActionSchema)
})


const AccountSchema = z.object({
    id: z.union([z.number(), z.string()]),
    subdomain: z.string()
})

export const WebhookSchema = z.object({
    leads: WebhookLeadSchema,
    account: AccountSchema
})

export type WebhookSchemaType = z.infer<typeof WebhookSchema>