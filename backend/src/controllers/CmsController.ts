import { Request, Response } from 'express';
import { BaseController } from './BaseController';
import { CmsService } from '@/services/CmsService';

export class CmsController extends BaseController {
    constructor(private readonly cmsService: CmsService) {
        super();
    }

    /**
     * POST /cms/sync-lessons
     * Header Cần có X-CMS-SECRET để bảo mật (Không dùng Firebase Auth vì gọi từ App Script)
     */
    async syncLessons(req: Request, res: Response): Promise<void> {
        try {
            const secret = req.headers['x-cms-secret'];
            // Trong thực tế, config.cms.secret. Ở đây ta code cứng 1 secret cho MVP.
            if (secret !== 'bahnarsense-super-secret-google-sheets') {
                res.status(403).json({ success: false, error: 'Forbidden CMS Access' });
                return;
            }

            const { data } = req.body;
            if (!Array.isArray(data)) {
                throw new Error('Payload format invalid. Expected { data: [...] }');
            }

            const result = await this.cmsService.syncLessons(data);
            this.handleSuccess(res, { message: "Đồng bộ thành công từ Sheets", ...result });
        } catch (error) {
            this.handleError(error, res, 'CmsController.syncLessons');
        }
    }
}
