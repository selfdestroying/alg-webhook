import { z } from "zod";

// утилита для конвертации snake_case в camelCase
const toCamel = (str: string) =>
  str.replace(/_([a-z])/g, (_, g) => g.toUpperCase());

const transformKeysToCamel = (obj: any): any => {
  if (Array.isArray(obj)) return obj.map(transformKeysToCamel);
  if (obj !== null && typeof obj === "object") {
    return Object.fromEntries(
      Object.entries(obj).map(([k, v]) => [toCamel(k), transformKeysToCamel(v)])
    );
  }
  return obj;
};

// --- схемы для вложенных объектов ---
export const DiscountSchema = z.object({
  type: z.string(),
  value: z.number(),
});

export const ItemValueSchema = z.object({
  productId: z.number(),
  description: z.string(),
  unitPrice: z.number(),
  unitType: z.string(),
  quantity: z.number(),
  discount: DiscountSchema,
  totalSum: z.number(),
});

export const PayerValueSchema = z.object({
  name: z.string(),
  entityType: z.string().optional(),
  entityId: z.number().optional(),
  phone: z.string().optional(),
  email: z.email().optional(),
});

export const SupplierValueSchema = z.object({
  entityId: z.number(),
});

export const SelectValueSchema = z.object({
  value: z.string(),
  enumId: z.number(),
  enumCode: z.string(),
});

export const NumericValueSchema = z.object({
  value: z.string(),
});

export const DateValueSchema = z.object({
  value: z.number(),
});

export const LinkedEntity = z.object({
  name: z.string(),
  entityId: z.number().optional(),
  entityType: z.string().optional(),
  catalogId: z.union([z.number(), z.string(), z.null()]),
});

// --- Discriminated custom field schema ---
export const CustomFieldSchema = z.discriminatedUnion("fieldType", [
  z.object({
    fieldId: z.number(),
    fieldName: z.string(),
    fieldCode: z.string(),
    fieldType: z.literal("select"),
    values: z.array(SelectValueSchema),
  }),
  z.object({
    fieldId: z.number(),
    fieldName: z.string(),
    fieldCode: z.string(),
    fieldType: z.literal("payer"),
    values: z.array(z.object({ value: PayerValueSchema })),
  }),
  z.object({
    fieldId: z.number(),
    fieldName: z.string(),
    fieldCode: z.string(),
    fieldType: z.literal("supplier"),
    values: z.array(z.object({ value: SupplierValueSchema })),
  }),
  z.object({
    fieldId: z.number(),
    fieldName: z.string(),
    fieldCode: z.string(),
    fieldType: z.literal("items"),
    values: z.array(z.object({ value: ItemValueSchema })),
  }),
  z.object({
    fieldId: z.number(),
    fieldName: z.string(),
    fieldCode: z.string(),
    fieldType: z.literal("numeric"),
    values: z.array(NumericValueSchema),
  }),
  z.object({
    fieldId: z.number(),
    fieldName: z.string(),
    fieldCode: z.string(),
    fieldType: z.literal("date_time"),
    values: z.array(DateValueSchema),
  }),
  z.object({
    fieldId: z.number(),
    fieldName: z.string(),
    fieldCode: z.string(),
    fieldType: z.literal("text"),
    values: z.array(z.object({ value: z.string() })),
  }),
  z.object({
    fieldId: z.number(),
    fieldName: z.string(),
    fieldCode: z.string(),
    fieldType: z.literal("linked_entity"),
    values: z.array(z.object({ value: LinkedEntity })),
  }),
]);

// --- Главная схема ---
export const CatalogElementDataSchema = z.preprocess(
  transformKeysToCamel,
  z.object({
    id: z.number(),
    name: z.string(),
    createdAt: z.number(),
    updatedAt: z.number(),
    customFieldsValues: z.array(CustomFieldSchema),
    catalogId: z.number(),
  })
);

// --- Тип TypeScript ---
export type CatalogElementDataSchemaType = z.infer<
  typeof CatalogElementDataSchema
>;
