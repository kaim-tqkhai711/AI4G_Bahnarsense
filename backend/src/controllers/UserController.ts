import { Request, Response } from 'express';
import { BaseController } from './BaseController';
import { UserService } from '@/services/UserService';
import { surveySchema, updateProfileSchema } from '@/validators/user.schema';

export class UserController extends BaseController {
    constructor(private readonly userService: UserService) {
        super();
    }

    async getProfile(req: Request, res: Response): Promise<void> {
        try {
            const uid = req.user?.id;
            if (!uid) throw new Error('User not found in request');

            const profile = await this.userService.getProfile(uid);
            this.handleSuccess(res, profile);
        } catch (error) {
            this.handleError(error, res, 'UserController.getProfile');
        }
    }

    async updateProfile(req: Request, res: Response): Promise<void> {
        try {
            const uid = req.user?.id;
            if (!uid) throw new Error('User not found in request');

            const safeData = updateProfileSchema.parse(req.body);
            const updated = await this.userService.updateProfile(uid, safeData);

            this.handleSuccess(res, updated);
        } catch (error) {
            this.handleError(error, res, 'UserController.updateProfile');
        }
    }

    async submitSurvey(req: Request, res: Response): Promise<void> {
        try {
            const uid = req.user?.id;
            if (!uid) throw new Error('User not found in request');

            const surveyParams = surveySchema.parse(req.body);
            const mappingResult = await this.userService.processSurvey(uid, surveyParams);

            this.handleSuccess(res, mappingResult);
        } catch (error) {
            this.handleError(error, res, 'UserController.submitSurvey');
        }
    }
}
