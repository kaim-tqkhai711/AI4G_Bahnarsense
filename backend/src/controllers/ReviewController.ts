import { Request, Response } from 'express';
import { BaseController } from './BaseController';
import { ReviewService } from '@/services/ReviewService';
import { logErrorSchema } from '@/validators/retention.schema';

export class ReviewController extends BaseController {
    constructor(private readonly reviewService: ReviewService) {
        super();
    }

    async logError(req: Request, res: Response): Promise<void> {
        try {
            const uid = req.user?.id;
            if (!uid) throw new Error('User context missing');

            const safeData = logErrorSchema.parse(req.body);
            const result = await this.reviewService.logError(uid, safeData);

            this.handleSuccess(res, result);
        } catch (error) {
            this.handleError(error, res, 'ReviewController.logError');
        }
    }

    async getDailyTasks(req: Request, res: Response): Promise<void> {
        try {
            const uid = req.user?.id;
            if (!uid) throw new Error('User context missing');

            const tasks = await this.reviewService.fetchDailyTasks(uid);
            this.handleSuccess(res, tasks);
        } catch (error) {
            this.handleError(error, res, 'ReviewController.getDailyTasks');
        }
    }

    async getSmartReminder(req: Request, res: Response): Promise<void> {
        try {
            const uid = req.user?.id;
            if (!uid) throw new Error('User context missing');

            const { GeminiService } = await import('@/services/GeminiService');
            const geminiService = new GeminiService();

            const result = await this.reviewService.getSmartReminder(uid, geminiService);
            this.handleSuccess(res, result);
        } catch (error) {
            this.handleError(error, res, 'ReviewController.getSmartReminder');
        }
    }

    async postponeReviews(req: Request, res: Response): Promise<void> {
        try {
            const uid = req.user?.id;
            if (!uid) throw new Error('User context missing');

            // Default dời 1 ngày
            const days = Number(req.body.days) || 1;
            const result = await this.reviewService.postponeReviews(uid, days);

            this.handleSuccess(res, result);
        } catch (error) {
            this.handleError(error, res, 'ReviewController.postponeReviews');
        }
    }
}
