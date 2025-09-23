interface CustomFieldValue {
  value: string | boolean;
}

interface CustomField {
  fieldId: number;
  fieldName: string;
  values: CustomFieldValue[];
}

interface CatalogElementMetadata {
  quantity: number;
  catalogId: number;
  priceId: number;
}

interface CatalogElement {
  id: number;
  metadata: CatalogElementMetadata;
}

interface EmbeddedData {
  catalogElements: CatalogElement[];
}

interface LeadData {
  id: number;
  name: string;
  price: number;
  statusId: number;
  pipelineId: number;
  createdAt: number;
  updatedAt: number;
  customFieldsValues: CustomField[];
  _embedded: EmbeddedData;
}
