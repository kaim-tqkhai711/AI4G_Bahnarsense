import { Router } from 'express';
import { ShopController } from '@/controllers/ShopController';
import { GameRepository } from '@/repositories/GameRepository';
import { authMiddleware } from '@/middleware/auth.middleware';
import { asyncErrorWrapper } from '@/middleware/asyncErrorWrapper';

const router = Router();

const repo = new GameRepository();
const controller = new ShopController(repo);

router.use(authMiddleware);

// POST /api/v1/shop/buy
router.post('/buy', asyncErrorWrapper(controller.buyItem.bind(controller)));

// POST /api/v1/shop/recover-streak
router.post('/recover-streak', asyncErrorWrapper(controller.recoverStreak.bind(controller)));

export default router;
