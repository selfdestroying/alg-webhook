import { z } from "zod";

export const DiscountSchema = z.object({
  type: z.union([z.string(), z.null()]).optional(),
  value: z.union([z.number(), z.string(), z.null()]).optional(),
});

export const ItemValueSchema = z.object({
  product_id: z.union([z.number(), z.string(), z.null()]).optional(),
  description: z.union([z.string(), z.null()]).optional(),
  unit_price: z.union([z.number(), z.string(), z.null()]).optional(),
  unit_type: z.union([z.string(), z.null()]).optional(),
  quantity: z.union([z.number(), z.string(), z.null()]).optional(),
  discount: DiscountSchema.optional(),
  total_sum: z.union([z.number(), z.string(), z.null()]).optional(),
});

export const PayerValueSchema = z.object({
  name: z.union([z.string(), z.null()]).optional(),
  entity_type: z.union([z.string(), z.null()]).optional(),
  entity_id: z.union([z.number(), z.string(), z.null()]).optional(),
  phone: z.union([z.string(), z.null()]).optional(),
  email: z.union([z.string(), z.null()]).optional(),
});

export const SupplierValueSchema = z.object({
  entity_id: z.union([z.number(), z.string(), z.null()]).optional(),
});

export const SelectValueSchema = z.object({
  value: z.union([z.string(), z.null()]).optional(),
  enum_id: z.union([z.number(), z.string(), z.null()]).optional(),
  enum_code: z.union([z.string(), z.null()]).optional(),
});

export const NumericValueSchema = z.object({
  value: z.union([z.string(), z.null()]).optional(),
});

export const DateValueSchema = z.object({
  value: z.union([z.number(), z.string(), z.null()]).optional(),
});

export const LinkedEntity = z.object({
  name: z.union([z.string(), z.null()]).optional(),
  entity_id: z.union([z.number(), z.string(), z.null()]).optional(),
  entity_type: z.union([z.string(), z.null()]).optional(),
  catalog_id: z.union([z.number(), z.string(), z.null()]).optional(),
});

// --- Custom field schema with catch-all for unknown types ---
export const CustomFieldSchema = z.union([
  z.object({
    field_id: z.union([z.number(), z.string(), z.null()]).optional(),
    field_name: z.union([z.string(), z.null()]).optional(),
    field_code: z.union([z.string(), z.null()]).optional(),
    field_type: z.literal("select"),
    values: z.array(SelectValueSchema).optional(),
  }),
  z.object({
    field_id: z.union([z.number(), z.string(), z.null()]).optional(),
    field_name: z.union([z.string(), z.null()]).optional(),
    field_code: z.union([z.string(), z.null()]).optional(),
    field_type: z.literal("payer"),
    values: z
      .array(z.object({ value: PayerValueSchema.optional() }))
      .optional(),
  }),
  z.object({
    field_id: z.union([z.number(), z.string(), z.null()]).optional(),
    field_name: z.union([z.string(), z.null()]).optional(),
    field_code: z.union([z.string(), z.null()]).optional(),
    field_type: z.literal("supplier"),
    values: z
      .array(z.object({ value: SupplierValueSchema.optional() }))
      .optional(),
  }),
  z.object({
    field_id: z.union([z.number(), z.string(), z.null()]).optional(),
    field_name: z.union([z.string(), z.null()]).optional(),
    field_code: z.union([z.string(), z.null()]).optional(),
    field_type: z.literal("items"),
    values: z.array(z.object({ value: ItemValueSchema.optional() })).optional(),
  }),
  z.object({
    field_id: z.union([z.number(), z.string(), z.null()]).optional(),
    field_name: z.union([z.string(), z.null()]).optional(),
    field_code: z.union([z.string(), z.null()]).optional(),
    field_type: z.literal("numeric"),
    values: z.array(NumericValueSchema).optional(),
  }),
  z.object({
    field_id: z.union([z.number(), z.string(), z.null()]).optional(),
    field_name: z.union([z.string(), z.null()]).optional(),
    field_code: z.union([z.string(), z.null()]).optional(),
    field_type: z.literal("date_time"),
    values: z.array(DateValueSchema).optional(),
  }),
  z.object({
    field_id: z.union([z.number(), z.string(), z.null()]).optional(),
    field_name: z.union([z.string(), z.null()]).optional(),
    field_code: z.union([z.string(), z.null()]).optional(),
    field_type: z.literal("text"),
    values: z
      .array(z.object({ value: z.union([z.string(), z.null()]).optional() }))
      .optional(),
  }),
  z.object({
    field_id: z.union([z.number(), z.string(), z.null()]).optional(),
    field_name: z.union([z.string(), z.null()]).optional(),
    field_code: z.union([z.string(), z.null()]).optional(),
    field_type: z.literal("linked_entity"),
    values: z.array(z.object({ value: LinkedEntity.optional() })).optional(),
  }),
  // Catch-all для неизвестных типов полей
  z.object({
    field_id: z.union([z.number(), z.string(), z.null()]).optional(),
    field_name: z.union([z.string(), z.null()]).optional(),
    field_code: z.union([z.string(), z.null()]).optional(),
    field_type: z.string(),
    values: z.any().optional(),
  }),
]);

// --- Главная схема ---
export const CatalogElementDataSchema = z.object({
  id: z.union([z.number(), z.string(), z.null()]).optional(),
  name: z.union([z.string(), z.null()]).optional(),
  created_at: z.union([z.number(), z.string(), z.null()]).optional(),
  updated_at: z.union([z.number(), z.string(), z.null()]).optional(),
  custom_fields_values: z.array(CustomFieldSchema),
  catalog_id: z.union([z.number(), z.string(), z.null()]).optional(),
});

// --- Тип TypeScript ---
export type CatalogElementDataSchemaType = z.infer<
  typeof CatalogElementDataSchema
>;
