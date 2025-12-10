export interface InvoiceLinksFilters {
  toEntityType?: string;
}
export interface InvoiceCustomFieldValue {
  field_id: number;
  field_name: string;
  field_code: string;
  field_type: 'select' | 'payer' | 'supplier' | 'items' | 'numeric' | 'text' | 'date_time';
  values:
    | InvoiceSelectFieldValue[]
    | InvoicePayerFieldValue[]
    | InvoiceSupplierFieldValue[]
    | InvoiceItemsFieldValue[];
}

export interface InvoiceSelectFieldValue {
  value: string;
  enum_id: number;
  enum_code: string;
}

export interface InvoicePayerFieldValue {
  value: {
    name: string;
    entity_type: 'contacts';
    entity_id: number;
    phone: string;
    email: string;
  };
}

export interface InvoiceSupplierFieldValue {
  value: {
    entity_id: number;
  };
}

export interface InvoiceDiscount {
  type: 'percentage' | 'fixed';
  value: number;
}

export interface InvoiceItem {
  sku: string;
  product_id: number;
  description: string;
  unit_price: number;
  unit_type: string;
  quantity: number;
  discount: InvoiceDiscount;
  vat_rate_id: number;
  vat_rate_value: number;
  bonus_points_per_purchase: number;
  external_uid: string;
  metadata: unknown[];
  is_discount_recalculated: boolean;
  is_total_sum_recalculated: boolean;
  total_sum: number;
}

export interface InvoiceItemsFieldValue {
  value: InvoiceItem;
}

export interface Link {
  href: string;
}

export interface Links {
  self: Link;
}

export interface InvoiceWarning {
  message: string | null;
}

export interface InvoiceEmbedded {
  warning: InvoiceWarning;
}

export interface Invoice {
  id: number;
  name: string;
  created_by: number;
  updated_by: number;
  created_at: number;
  updated_at: number;
  is_deleted: null | boolean;
  custom_fields_values: InvoiceCustomFieldValue[];
  catalog_id: number;
  account_id: number;
  _links: Links;
  _embedded: InvoiceEmbedded;
}

/**
 * Вспомогательные типы для работы с custom fields
 */

export type CustomFieldValueType =
  | InvoiceSelectFieldValue
  | InvoicePayerFieldValue
  | InvoiceSupplierFieldValue
  | InvoiceItemsFieldValue
  | { value: string | number }
  | { value: number };

export interface InvoiceLink {
  to_entity_id: number;
  to_entity_type: string;
  metadata: unknown;
}

export interface InvoiceLinkEmbedded {
  links: InvoiceLink[];
}

export interface InvoiceLinks {
  _links: Links;
  _embedded: InvoiceLinkEmbedded;
}
