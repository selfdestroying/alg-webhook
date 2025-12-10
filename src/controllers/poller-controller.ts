import { NextFunction, Request, Response } from 'express';

import invoicesPollerService from '../services/poller-service';

class PollerController {
  start(_req: Request, res: Response, next: NextFunction) {
    try {
      invoicesPollerService.start();
      res.json({
        ok: true,
        message: 'Планировщик запущен',
        data: invoicesPollerService.status(),
      });
    } catch (error) {
      next(error);
    }
  }

  stop = (_req: Request, res: Response, next: NextFunction) => {
    try {
      invoicesPollerService.stop();
      res.json({
        ok: true,
        message: 'Планировщик остановлен',
        data: invoicesPollerService.status(),
      });
    } catch (error) {
      next(error);
    }
  };

  status = (_req: Request, res: Response, next: NextFunction) => {
    try {
      res.json({
        ok: true,
        message: 'Статус планировщика',
        data: invoicesPollerService.status(),
      });
    } catch (error) {
      next(error);
    }
  };

  trigger = async (_req: Request, res: Response, next: NextFunction) => {
    try {
      await invoicesPollerService.trigger();
      res.json({ ok: true, message: '' });
    } catch (error) {
      next(error);
    }
  };
}

export default new PollerController();
