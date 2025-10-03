import { z } from "zod";

// --- CustomFieldValue ---
const RawCustomFieldValueSchema = z.object({
  value: z.union([z.string(), z.boolean(), z.number()]),
});
// --- CustomField ---
const RawCustomFieldSchema = z
  .object({
    field_id: z.number(),
    field_name: z.string(),
    values: z.array(RawCustomFieldValueSchema),
  })
  .transform((raw) => ({
    fieldId: raw.field_id,
    fieldName: raw.field_name,
    values: raw.values,
  }));

// --- CatalogElementMetadata ---
const RawCatalogElementMetadataSchema = z
  .object({
    quantity: z.number(),
    catalog_id: z.number(),
    price_id: z.union([z.number(), z.null()]),
  })
  .transform((raw) => ({
    quantity: raw.quantity,
    catalogId: raw.catalog_id,
    priceId: raw.price_id,
  }));

// --- CatalogElement ---
export const RawCatalogElementSchema = z.object({
  id: z.number(),
  metadata: RawCatalogElementMetadataSchema,
});

// --- EmbeddedData ---
const RawEmbeddedDataSchema = z
  .object({
    catalog_elements: z.array(RawCatalogElementSchema),
  })
  .transform((raw) => ({
    catalogElements: raw.catalog_elements,
  }));

// --- LeadData ---
export const RawLeadDataSchema = z
  .object({
    id: z.number(),
    name: z.string(),
    price: z.number(),
    status_id: z.number(),
    pipeline_id: z.number(),
    created_at: z.number(),
    updated_at: z.number(),
    custom_fields_values: z
      .union([z.array(RawCustomFieldSchema), z.null()])
      .optional(),
    _embedded: RawEmbeddedDataSchema,
  })
  .transform((raw) => ({
    id: raw.id,
    name: raw.name,
    price: raw.price,
    statusId: raw.status_id,
    pipelineId: raw.pipeline_id,
    createdAt: raw.created_at,
    updatedAt: raw.updated_at,
    customFieldsValues: raw.custom_fields_values,
    _embedded: raw._embedded,
  }));

export type CustomFieldValueDto = z.infer<typeof RawCustomFieldValueSchema>;
export type CustomFieldDto = z.infer<typeof RawCustomFieldSchema>;
export type CatalogElementMetadataDto = z.infer<
  typeof RawCatalogElementMetadataSchema
>;
export type CatalogElementDto = z.infer<typeof RawCatalogElementSchema>;
export type EmbeddedDataDto = z.infer<typeof RawEmbeddedDataSchema>;
export type LeadDataDto = z.infer<typeof RawLeadDataSchema>;
