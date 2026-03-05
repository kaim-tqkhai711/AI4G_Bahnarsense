import { Router } from 'express';
import { CommunityController } from '@/controllers/CommunityController';
import { CommunityService } from '@/services/CommunityService';
import { authMiddleware } from '@/middleware/auth.middleware';
import { asyncErrorWrapper } from '@/middleware/asyncErrorWrapper';

const router = Router();

const service = new CommunityService();
const controller = new CommunityController(service);

router.use(authMiddleware);

// GET /api/v1/community/matchmaking
router.get('/matchmaking', asyncErrorWrapper(controller.getMatchmaking.bind(controller)));

// GET /api/v1/community/friends/search
router.get('/friends/search', asyncErrorWrapper(controller.searchFriend.bind(controller)));

// POST /api/v1/community/friends/add
router.post('/friends/add', asyncErrorWrapper(controller.addFriend.bind(controller)));

export default router;
