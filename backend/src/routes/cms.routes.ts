import { Router } from 'express';
import { CmsController } from '@/controllers/CmsController';
import { CmsService } from '@/services/CmsService';
import { asyncErrorWrapper } from '@/middleware/asyncErrorWrapper';

const router = Router();
const service = new CmsService();
const controller = new CmsController(service);

// POST /api/v1/cms/sync-lessons
// Không dùng authMiddleware vì đây là M2M Communication (Sheet -> Server)
router.post('/sync-lessons', asyncErrorWrapper(controller.syncLessons.bind(controller)));

export default router;
