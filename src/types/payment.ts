import { InvoiceItemsFieldValue } from './invoice';

export interface Payment {
  leadName: string;
  invoiceName: string;
  createdAt: number | string;
  products: InvoiceItemsFieldValue[];
}
