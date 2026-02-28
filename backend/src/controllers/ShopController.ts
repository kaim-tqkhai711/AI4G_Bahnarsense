import { Request, Response } from 'express';
import { BaseController } from './BaseController';
import { GameRepository } from '@/repositories/GameRepository';
import { purchaseShopSchema } from '@/validators/coreloop.schema';

export class ShopController extends BaseController {
    constructor(private readonly gameRepo: GameRepository) {
        super();
    }

    /**
     * POST /shop/buy
     */
    async buyItem(req: Request, res: Response): Promise<void> {
        try {
            const { item_id } = purchaseShopSchema.parse(req.body);

            const userId = req.user?.id;
            if (!userId) throw new Error('User context missing');

            const success = await this.gameRepo.purchaseItem(userId, item_id);

            this.handleSuccess(res, { success, message: "Mua vật phẩm thành công!" });
        } catch (error) {
            this.handleError(error, res, 'ShopController.buyItem');
        }
    }

    /**
     * POST /shop/recover-streak
     */
    async recoverStreak(req: Request, res: Response): Promise<void> {
        try {
            const userId = req.user?.id;
            if (!userId) throw new Error('User context missing');

            const success = await this.gameRepo.recoverStreak(userId);

            this.handleSuccess(res, { success, message: "Khôi phục chuỗi thành công!" });
        } catch (error) {
            this.handleError(error, res, 'ShopController.recoverStreak');
        }
    }
}
