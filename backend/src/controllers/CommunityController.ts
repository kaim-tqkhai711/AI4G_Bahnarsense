import { Request, Response } from 'express';
import { BaseController } from './BaseController';
import { CommunityService } from '@/services/CommunityService';
import { matchmakeSchema } from '@/validators/retention.schema';

export class CommunityController extends BaseController {
    constructor(private readonly communityService: CommunityService) {
        super();
    }

    async getMatchmaking(req: Request, res: Response): Promise<void> {
        try {
            const uid = req.user?.id;
            if (!uid) throw new Error('User context missing');

            const { level } = matchmakeSchema.parse(req.query);

            const results = await this.communityService.getMatchmakingList(uid, level);
            this.handleSuccess(res, results);
        } catch (error) {
            this.handleError(error, res, 'CommunityController.getMatchmaking');
        }
    }
}
