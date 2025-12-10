import { Router } from 'express';
import eventsController from '../controllers/events-controller';

const router = Router();

router.get('/', eventsController.getEvents);
router.get('/:id', eventsController.getEvent);

export default router;
