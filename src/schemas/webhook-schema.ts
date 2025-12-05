import z from "zod";

const LeadActionSchema = z.object({
  id: z.union([z.number(), z.string(), z.null()]).optional(),
  status_id: z.union([z.number(), z.string(), z.null()]).optional(),
  pipeline_id: z.union([z.number(), z.string(), z.null()]).optional(),
});

const AccountSchema = z.object({
  id: z.union([z.number(), z.string(), z.null()]).optional(),
  subdomain: z.union([z.string(), z.null()]).optional(),
});

const WebhookLeadSchema = z.object({
  add: z.union([z.array(LeadActionSchema), z.null()]).optional(),
  status: z.union([z.array(LeadActionSchema), z.null()]).optional(),
});

const WebhookSchema = z.object({
  leads: WebhookLeadSchema,
  account: AccountSchema,
});

type WebhookSchemaType = z.infer<typeof WebhookSchema>;

export { WebhookSchema, WebhookSchemaType };
