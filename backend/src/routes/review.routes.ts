import { Router } from 'express';
import { ReviewController } from '@/controllers/ReviewController';
import { ReviewService } from '@/services/ReviewService';
import { ReviewRepository } from '@/repositories/ReviewRepository';
import { authMiddleware } from '@/middleware/auth.middleware';
import { asyncErrorWrapper } from '@/middleware/asyncErrorWrapper';

const router = Router();

// DI 
const repository = new ReviewRepository();
const service = new ReviewService(repository);
const controller = new ReviewController(service);

router.use(authMiddleware);

// POST /api/v1/review/log_error
router.post('/log_error', asyncErrorWrapper(controller.logError.bind(controller)));

// GET /api/v1/review/daily_tasks
router.get('/daily_tasks', asyncErrorWrapper(controller.getDailyTasks.bind(controller)));

// GET /api/v1/review/smart_reminder
router.get('/smart_reminder', asyncErrorWrapper(controller.getSmartReminder.bind(controller)));

// POST /api/v1/review/postpone
router.post('/postpone', asyncErrorWrapper(controller.postponeReviews.bind(controller)));

export default router;
