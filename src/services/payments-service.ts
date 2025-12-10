import { logInvocation } from '../lib/utils';
import { InvoiceItemsFieldValue } from '../types/invoice';
import { Payment } from '../types/payment';
import eventsService from './events-service';
import InvoicesService from './invoices-service';
import LeadsService from './leads-service';

class PaymentsService {
  @logInvocation
  async getLastPayments(created_at: number | string) {
    const {
      _embedded: { events },
    } = await eventsService.getEvents({ type: 'invoice_paid', created_at });

    const payments: Payment[] = [];

    for (const event of events) {
      const invoiceLink = (
        await InvoicesService.getInvoiceLinks(event._embedded.entity.id, {
          toEntityType: 'leads',
        })
      )._embedded.links[0];
      const lead = await LeadsService.getLead(invoiceLink.to_entity_id);
      const invoice = await InvoicesService.getInvoice(event._embedded.entity.id);
      const products = (invoice.custom_fields_values.find((field) => field.field_id === 891565)
        ?.values || []) as InvoiceItemsFieldValue[];
      const payment: Payment = {
        leadName: lead.name,
        invoiceName: invoice.name,
        products: products,
        createdAt: event.created_at,
      };
      payments.push(payment);
    }

    return payments;
  }
}

export default new PaymentsService();
