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

    async searchFriend(req: Request, res: Response): Promise<void> {
        try {
            const userIdToSearch = req.query.user_id as string;
            if (!userIdToSearch) throw new Error('Cần cung cấp user_id để tìm kiếm.');
            const result = await this.communityService.searchFriend(userIdToSearch);
            this.handleSuccess(res, result);
        } catch (error) {
            this.handleError(error, res, 'CommunityController.searchFriend');
        }
    }

    async addFriend(req: Request, res: Response): Promise<void> {
        try {
            const uid = req.user?.id;
            if (!uid) throw new Error('User context missing');
            const { friend_id } = req.body;
            if (!friend_id) throw new Error('Missing friend_id');
            const result = await this.communityService.addFriend(uid, friend_id);
            this.handleSuccess(res, result);
        } catch (error) {
            this.handleError(error, res, 'CommunityController.addFriend');
        }
    }
}
