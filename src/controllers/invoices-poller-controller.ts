import { Request, Response } from "express";

import invoicesPollerService from "../services/invoices-poller-service";

class InvoicesPollerController {
  start = (_req: Request, res: Response) => {
    invoicesPollerService.start();
    res.json({ ok: true, status: invoicesPollerService.getStatus() });
  };

  stop = (_req: Request, res: Response) => {
    invoicesPollerService.stop();
    res.json({ ok: true, status: invoicesPollerService.getStatus() });
  };

  status = (_req: Request, res: Response) => {
    res.json({ ok: true, status: invoicesPollerService.getStatus() });
  };

  runOnce = async (_req: Request, res: Response) => {
    await invoicesPollerService.runOnce();
    res.json({ ok: true, status: invoicesPollerService.getStatus() });
  };
}

export default new InvoicesPollerController();
