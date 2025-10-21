import z from "zod";
import {
  CatalogElementDataSchemaType,
  DateValueSchema,
  ItemValueSchema,
  NumericValueSchema,
  PayerValueSchema,
  SelectValueSchema,
  SupplierValueSchema,
} from "./dto/catalog-element.dto";

export function escapeHtml(text: string) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

type CustomField = CatalogElementDataSchemaType["customFieldsValues"][number];

type FieldTypeMap = {
  select: z.infer<typeof SelectValueSchema>[];
  payer: z.infer<typeof PayerValueSchema>[];
  supplier: z.infer<typeof SupplierValueSchema>[];
  items: z.infer<typeof ItemValueSchema>[];
  numeric: z.infer<typeof NumericValueSchema>[];
  date_time: z.infer<typeof DateValueSchema>[];
  text: z.infer<typeof DateValueSchema>[];
  linked_entity: z.infer<typeof DateValueSchema>[];
};

// Универсальный хелпер
export function getFieldValues<T extends CustomField["fieldType"]>(
  data: CatalogElementDataSchemaType,
  type: T
): FieldTypeMap[T] {
  const field = data.customFieldsValues.find((f) => f.fieldType === type) as
    | Extract<CustomField, { fieldType: T }>
    | undefined;

  if (!field) return [] as FieldTypeMap[T];

  // Разворачиваем values
  return (field.values as any).map((v: any) =>
    "value" in v && typeof v.value === "object" ? v.value : v
  ) as FieldTypeMap[T];
}
