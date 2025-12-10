import { Router } from 'express';
import eventsRouter from './events-router';
import invoicesRouter from './invoices-router';
import leadsRouter from './leads-router';
import paymentsRouter from './payments-router';
import pollerRouter from './poller-router';

const router = Router();

router.use('/leads', leadsRouter);
router.use('/invoices', invoicesRouter);
router.use('/events', eventsRouter);
router.use('/payments', paymentsRouter);
router.use('/poller', pollerRouter);

export default router;
