import ApiError from '../error/api-error';
import { logInvocation } from '../lib/utils';
import ApiRepository from '../repositories/api-repository';
import { InvoiceLinksFilters } from '../types/invoice';

class InvoicesService {
  @logInvocation
  async getInvoices() {}

  @logInvocation
  async getInvoice(id: number | string) {
    const invoice = await ApiRepository.fetchInvoice(id);

    if (!invoice) {
      throw new ApiError(404, `Счет с ID ${id} не найден`);
    }

    return invoice;
  }

  @logInvocation
  async getInvoiceLinks(id: number | string, filters: InvoiceLinksFilters = {}) {
    const links = await ApiRepository.fetchInvoiceLinks(id, filters);

    if (!links) {
      throw new ApiError(404, `Ссылки для счета с ID ${id} не найдены`);
    }

    return links;
  }
}

export default new InvoicesService();
