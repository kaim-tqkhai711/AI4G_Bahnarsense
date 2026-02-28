import { Request, Response } from 'express';
import { BaseController } from './BaseController';
import { LessonService } from '@/services/LessonService';
import { submitLessonSchema } from '@/validators/coreloop.schema';

export class LessonController extends BaseController {
    constructor(private readonly lessonService: LessonService) {
        super();
    }

    async getLessons(req: Request, res: Response): Promise<void> {
        try {
            const uid = req.user?.id;
            if (!uid) throw new Error('User not found in request');

            const lessons = await this.lessonService.getLessons(uid);
            this.handleSuccess(res, lessons);
        } catch (error) {
            this.handleError(error, res, 'LessonController.getLessons');
        }
    }

    async submitAnswer(req: Request, res: Response): Promise<void> {
        try {
            const uid = req.user?.id;
            if (!uid) throw new Error('User not found in request');

            const { lesson_id, question_id, user_answer } = submitLessonSchema.parse(req.body);
            const result = await this.lessonService.submitAnswer(uid, lesson_id, question_id, user_answer);

            this.handleSuccess(res, result);
        } catch (error) {
            this.handleError(error, res, 'LessonController.submitAnswer');
        }
    }
}
