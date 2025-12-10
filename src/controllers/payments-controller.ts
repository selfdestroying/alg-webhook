import { NextFunction, Request, Response } from 'express';
import { logInvocation } from '../lib/utils';
import PaymentsService from '../services/payments-service';

class PaymentsController {
  @logInvocation
  async getPayments(req: Request, res: Response, next: NextFunction) {
    try {
      const { created_at } = req.query;
      const payments = await PaymentsService.getLastPayments(created_at as string);
      return res.status(200).json({ ok: true, message: 'Оплаты получены успешно', data: payments });
    } catch (error) {
      next(error);
    }
  }
}

export default new PaymentsController();
