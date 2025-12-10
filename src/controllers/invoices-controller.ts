import { NextFunction, Request, Response } from 'express';
import { logInvocation } from '../lib/utils';
import InvoicesService from '../services/invoices-service';
import { InvoiceLinksFilters } from '../types/invoice';
class InvoicesController {
  @logInvocation
  async getInvoices(req: Request, res: Response, next: NextFunction) {
    try {
      return res.status(200).json({ ok: true, message: 'Оплаты получены успешно', data: [] });
    } catch (error) {
      next(error);
    }
  }

  @logInvocation
  async getInvoice(req: Request, res: Response, next: NextFunction) {
    try {
      const invoice = await InvoicesService.getInvoice(req.params.id);
      return res.status(200).json({ ok: true, message: 'Оплата получена успешно', data: invoice });
    } catch (error) {
      next(error);
    }
  }

  @logInvocation
  async getInvoiceLinks(req: Request, res: Response, next: NextFunction) {
    try {
      const filters = req.query as InvoiceLinksFilters;
      const links = await InvoicesService.getInvoiceLinks(req.params.id, filters);
      return res
        .status(200)
        .json({ ok: true, message: 'Ссылки на оплаты получены успешно', data: links });
    } catch (error) {
      next(error);
    }
  }
}

export default new InvoicesController();
