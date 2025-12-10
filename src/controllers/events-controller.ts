import { NextFunction, Request, Response } from 'express';
import { logInvocation } from '../lib/utils';
import EventsService from '../services/events-service';
import { EventsFilters } from '../types/event';

class EventsController {
  @logInvocation
  async getEvents(req: Request, res: Response, next: NextFunction) {
    try {
      const filters = req.query as EventsFilters;
      const events = await EventsService.getEvents(filters);
      return res.status(200).json({ ok: true, message: 'События получены успешно', data: events });
    } catch (error) {
      next(error);
    }
  }

  @logInvocation
  async getEvent(req: Request, res: Response, next: NextFunction) {
    try {
      return res.status(200).json({ ok: true, message: 'Оплата получена успешно', data: {} });
    } catch (error) {
      next(error);
    }
  }
}

export default new EventsController();
