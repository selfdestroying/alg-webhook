import { Router } from 'express';
import leadsController from '../controllers/leads-controller';

const router = Router();

router.get('/', leadsController.getLeads);
router.get('/:id', leadsController.getLead);

export default router;
