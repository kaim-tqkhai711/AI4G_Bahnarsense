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

// GET /api/v1/community/friends
router.get('/friends', asyncErrorWrapper(controller.getFriends.bind(controller)));

// GET /api/v1/community/friends/requests
router.get('/friends/requests', asyncErrorWrapper(controller.getFriendRequests.bind(controller)));

// POST /api/v1/community/friends/accept
router.post('/friends/accept', asyncErrorWrapper(controller.acceptFriend.bind(controller)));

// POST /api/v1/community/friends/decline
router.post('/friends/decline', asyncErrorWrapper(controller.declineFriend.bind(controller)));

// POST /api/v1/community/buddy/invite
router.post('/buddy/invite', asyncErrorWrapper(controller.inviteBuddy.bind(controller)));

// GET /api/v1/community/buddy
router.get('/buddy', asyncErrorWrapper(controller.getBuddyProgress.bind(controller)));

// POST /api/v1/community/buddy/cancel
router.post('/buddy/cancel', asyncErrorWrapper(controller.cancelBuddy.bind(controller)));

export default router;
