import { Router } from 'express';
import { LessonController } from '@/controllers/LessonController';
import { LessonService } from '@/services/LessonService';
import { LessonRepository } from '@/repositories/LessonRepository';
import { authMiddleware } from '@/middleware/auth.middleware';
import { asyncErrorWrapper } from '@/middleware/asyncErrorWrapper';

const router = Router();

const repository = new LessonRepository();
const service = new LessonService(repository);
const controller = new LessonController(service);

router.use(authMiddleware);

// GET /api/v1/lessons
router.get('/', asyncErrorWrapper(controller.getLessons.bind(controller)));

// POST /api/v1/lessons/submit
router.post('/submit', asyncErrorWrapper(controller.submitAnswer.bind(controller)));

export default router;
