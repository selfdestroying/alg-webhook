import { z } from "zod";

// --- CustomFieldValue ---
const RawCustomFieldValueSchema = z.object({
  value: z.union([z.string(), z.boolean(), z.number(), z.null()]).optional(),
});
// --- CustomField ---
const RawCustomFieldSchema = z.object({
  field_id: z.union([z.number(), z.string(), z.null()]).optional(),
  field_name: z.union([z.string(), z.null()]).optional(),
  values: z.array(RawCustomFieldValueSchema).optional(),
});

// --- CatalogElementMetadata ---
const RawCatalogElementMetadataSchema = z.object({
  quantity: z.union([z.number(), z.string(), z.null()]).optional(),
  catalog_id: z.union([z.number(), z.string(), z.null()]).optional(),
  price_id: z.union([z.number(), z.string(), z.null()]).optional(),
});

// --- CatalogElement ---
export const RawCatalogElementSchema = z.object({
  id: z.union([z.number(), z.string(), z.null()]).optional(),
  metadata: RawCatalogElementMetadataSchema.optional(),
});

// --- EmbeddedData ---
const RawEmbeddedDataSchema = z.object({
  catalog_elements: z.array(RawCatalogElementSchema).optional(),
});

// --- LeadData ---
export const RawLeadDataSchema = z.object({
  id: z.union([z.number(), z.string(), z.null()]).optional(),
  name: z.union([z.string(), z.null()]).optional(),
  price: z.union([z.number(), z.string(), z.null()]).optional(),
  status_id: z.union([z.number(), z.string(), z.null()]).optional(),
  pipeline_id: z.union([z.number(), z.string(), z.null()]).optional(),
  created_at: z.union([z.number(), z.string(), z.null()]).optional(),
  updated_at: z.union([z.number(), z.string(), z.null()]).optional(),
  custom_fields_values: z
    .union([z.array(RawCustomFieldSchema), z.null()])
    .optional(),
  _embedded: RawEmbeddedDataSchema.optional(),
});

export type CustomFieldValueDto = z.infer<typeof RawCustomFieldValueSchema>;
export type CustomFieldDto = z.infer<typeof RawCustomFieldSchema>;
export type CatalogElementMetadataDto = z.infer<
  typeof RawCatalogElementMetadataSchema
>;
export type CatalogElementDto = z.infer<typeof RawCatalogElementSchema>;
export type EmbeddedDataDto = z.infer<typeof RawEmbeddedDataSchema>;
export type LeadDataDto = z.infer<typeof RawLeadDataSchema>;
