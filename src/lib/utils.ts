import z from "zod";
import {
  CatalogElementDataSchemaType,
  DateValueSchema,
  ItemValueSchema,
  NumericValueSchema,
  PayerValueSchema,
  SelectValueSchema,
  SupplierValueSchema,
} from "../schemas/catalog-element-schema";

export function escapeHtml(text: string) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

type CustomField = CatalogElementDataSchemaType["custom_fields_values"][number];

type FieldTypeMap = {
  select: z.infer<typeof SelectValueSchema>[];
  payer: z.infer<typeof PayerValueSchema>[];
  supplier: z.infer<typeof SupplierValueSchema>[];
  items: z.infer<typeof ItemValueSchema>[];
  numeric: z.infer<typeof NumericValueSchema>[];
  date_time: z.infer<typeof DateValueSchema>[];
  text: z.infer<typeof DateValueSchema>[];
  linked_entity: z.infer<typeof DateValueSchema>[];
  [key: string]: any[];
};

// Универсальный хелпер
export function getFieldValues<T extends CustomField["field_type"]>(
  data: CatalogElementDataSchemaType,
  type: T
): FieldTypeMap[T] {
  const field = data.custom_fields_values.find((f) => f.field_type === type) as
    | Extract<CustomField, { field_type: T }>
    | undefined;

  if (!field) return [] as FieldTypeMap[T];

  // Разворачиваем values
  return (field.values as any).map((v: any) =>
    "value" in v && typeof v.value === "object" ? v.value : v
  ) as FieldTypeMap[T];
}
