import { Router } from 'express';
import { UserController } from '@/controllers/UserController';
import { UserService } from '@/services/UserService';
import { UserRepository } from '@/repositories/UserRepository';
import { authMiddleware } from '@/middleware/auth.middleware';
import { asyncErrorWrapper } from '@/middleware/asyncErrorWrapper';

const router = Router();

// DI Container Pattern
const repository = new UserRepository();
const service = new UserService(repository);
const controller = new UserController(service);

// Apply auth middleware to all user routes
router.use(authMiddleware);

// GET /api/v1/user/profile
router.get('/profile', asyncErrorWrapper(controller.getProfile.bind(controller)));

// PUT /api/v1/user/profile
router.put('/profile', asyncErrorWrapper(controller.updateProfile.bind(controller)));

// POST /api/v1/user/survey
router.post('/survey', asyncErrorWrapper(controller.submitSurvey.bind(controller)));

export default router;
