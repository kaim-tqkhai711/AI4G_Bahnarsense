import { Router } from 'express';
import { AiController } from '@/controllers/AiController';
import { AiService } from '@/services/AiService';
import { GeminiService } from '@/services/GeminiService';
import { authMiddleware } from '@/middleware/auth.middleware';
import { asyncErrorWrapper } from '@/middleware/asyncErrorWrapper';

const router = Router();

const geminiService = new GeminiService();
const service = new AiService(geminiService);
const controller = new AiController(service);

router.use(authMiddleware);

// GET /api/v1/ai/pronounce?word=...
router.get('/pronounce', asyncErrorWrapper(controller.pronounce.bind(controller)));

// POST /api/v1/ai/chat/speak
router.post('/chat/speak', asyncErrorWrapper(controller.chatSpeak.bind(controller)));

export default router;
