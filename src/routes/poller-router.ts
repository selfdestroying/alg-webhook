import { Router } from 'express';
import pollerController from '../controllers/poller-controller';

const router = Router();

router.get('/start', pollerController.start);
router.get('/stop', pollerController.stop);
router.get('/status', pollerController.status);
router.get('/trigger', pollerController.trigger);

export default router;
