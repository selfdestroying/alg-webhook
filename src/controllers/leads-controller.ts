import { NextFunction, Request, Response } from 'express';
import { logInvocation } from '../lib/utils';
import LeadsService from '../services/leads-service';
class LeadsController {
  @logInvocation
  async getLeads(req: Request, res: Response, next: NextFunction) {
    try {
      return res.status(200).json({ ok: true, message: 'Сделки получены успешно', data: [] });
    } catch (error) {
      next(error);
    }
  }

  @logInvocation
  async getLead(req: Request, res: Response, next: NextFunction) {
    try {
      const lead = await LeadsService.getLead(req.params.id);
      return res.status(200).json({ ok: true, message: 'Сделка получена успешно', data: lead });
    } catch (error) {
      return next(error);
    }
  }
}

export default new LeadsController();
