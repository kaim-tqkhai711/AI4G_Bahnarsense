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
            const uid = req.user?.id;
            if (!uid) throw new Error('User context missing');
            const query = req.query.query as string || req.query.user_id as string;
            if (!query) throw new Error('Cần cung cấp từ khóa để tìm kiếm.');
            const result = await this.communityService.searchFriend(query, uid);
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

    async getFriends(req: Request, res: Response): Promise<void> {
        try {
            const uid = req.user?.id;
            if (!uid) throw new Error('User context missing');
            const result = await this.communityService.getFriends(uid);
            this.handleSuccess(res, result);
        } catch (error) {
            this.handleError(error, res, 'CommunityController.getFriends');
        }
    }

    async getFriendRequests(req: Request, res: Response): Promise<void> {
        try {
            const uid = req.user?.id;
            if (!uid) throw new Error('User context missing');
            const result = await this.communityService.getFriendRequests(uid);
            this.handleSuccess(res, result);
        } catch (error) {
            this.handleError(error, res, 'CommunityController.getFriendRequests');
        }
    }

    async acceptFriend(req: Request, res: Response): Promise<void> {
        try {
            const uid = req.user?.id;
            if (!uid) throw new Error('User context missing');
            const { request_id } = req.body;
            if (!request_id) throw new Error('Missing request_id');
            const result = await this.communityService.acceptFriend(uid, request_id);
            this.handleSuccess(res, result);
        } catch (error) {
            this.handleError(error, res, 'CommunityController.acceptFriend');
        }
    }

    async declineFriend(req: Request, res: Response): Promise<void> {
        try {
            const uid = req.user?.id;
            if (!uid) throw new Error('User context missing');
            const { request_id } = req.body;
            if (!request_id) throw new Error('Missing request_id');
            const result = await this.communityService.declineFriend(uid, request_id);
            this.handleSuccess(res, result);
        } catch (error) {
            this.handleError(error, res, 'CommunityController.declineFriend');
        }
    }

    async inviteBuddy(req: Request, res: Response): Promise<void> {
        try {
            const uid = req.user?.id;
            if (!uid) throw new Error('User context missing');
            const { friend_id, daily_target } = req.body;
            if (!friend_id || !daily_target) throw new Error('Missing friend_id or daily_target');
            const result = await this.communityService.inviteBuddy(uid, friend_id, daily_target);
            this.handleSuccess(res, result);
        } catch (error) {
            this.handleError(error, res, 'CommunityController.inviteBuddy');
        }
    }

    async getBuddyProgress(req: Request, res: Response): Promise<void> {
        try {
            const uid = req.user?.id;
            if (!uid) throw new Error('User context missing');
            const result = await this.communityService.getBuddyProgress(uid);
            this.handleSuccess(res, result);
        } catch (error) {
            this.handleError(error, res, 'CommunityController.getBuddyProgress');
        }
    }

    async cancelBuddy(req: Request, res: Response): Promise<void> {
        try {
            const uid = req.user?.id;
            if (!uid) throw new Error('User context missing');
            const { buddy_id } = req.body;
            const result = await this.communityService.cancelBuddy(uid, buddy_id);
            this.handleSuccess(res, result);
        } catch (error) {
            this.handleError(error, res, 'CommunityController.cancelBuddy');
        }
    }
}
