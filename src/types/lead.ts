/**
 * Типизация для объекта сделки из AmoCRM API
 */

/**
 * Значение кастомного поля (enum)
 */
export interface CustomFieldValue {
  value: string | number | boolean;
  enum_id?: number;
  enum_code?: string | null;
}

/**
 * Кастомное поле сделки
 */
export interface CustomField {
  field_id: number;
  field_name: string;
  field_code?: string | null;
  field_type: 'select' | 'multiselect' | 'checkbox' | 'text' | 'date_time' | 'textarea';
  values: CustomFieldValue[];
}

/**
 * Тег сделки
 */
export interface LeadTag {
  id: number;
  name: string;
  color?: string | null;
}

/**
 * Элемент каталога (товар) в сделке
 */
export interface CatalogElement {
  id: number;
  metadata: {
    quantity: number;
    catalog_id: number;
    price_id?: number | null;
  };
  account_id: number;
}

/**
 * Компания, связанная со сделкой
 */
export interface LeadCompany {
  id: number;
  name?: string;
}

/**
 * Встроенные данные сделки (связанные объекты)
 */
export interface LeadEmbedded {
  tags?: LeadTag[];
  catalog_elements?: CatalogElement[];
  companies?: LeadCompany[];
}

/**
 * Ссылка для API
 */
export interface ApiLink {
  href: string;
}

/**
 * Ссылки сделки
 */
export interface LeadLinks {
  self: ApiLink;
}

/**
 * Основной объект сделки из AmoCRM
 */
export interface Lead {
  id: number;
  name: string;
  price: number;
  responsible_user_id: number;
  group_id: number;
  status_id: number;
  pipeline_id: number;
  loss_reason_id?: number | null;
  created_by: number;
  updated_by: number;
  created_at: number;
  updated_at: number;
  closed_at?: number | null;
  closest_task_at?: number | null;
  is_deleted: boolean;
  custom_fields_values: CustomField[];
  score?: number | null;
  account_id: number;
  labor_cost?: number | null;
  _links: LeadLinks;
  _embedded: LeadEmbedded;
}
