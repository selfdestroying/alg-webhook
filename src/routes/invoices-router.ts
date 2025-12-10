import { Router } from 'express';
import invoicesController from '../controllers/invoices-controller';

const router = Router();

router.get('/', invoicesController.getInvoices);
router.get('/:id', invoicesController.getInvoice);
router.get('/:id/links', invoicesController.getInvoiceLinks);

export default router;
