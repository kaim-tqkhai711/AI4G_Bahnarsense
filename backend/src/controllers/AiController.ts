import { Request, Response } from 'express';
import { BaseController } from './BaseController';
import { AiService } from '@/services/AiService';
import { chatSpeakSchema, pronounceSchema } from '@/validators/ai.schema';

export class AiController extends BaseController {
    constructor(private readonly aiService: AiService) {
        super();
    }

    async pronounce(req: Request, res: Response): Promise<void> {
        try {
            const { word } = pronounceSchema.parse(req.query);

            const result = await this.aiService.getPronounceUrl(word);
            this.handleSuccess(res, result);
        } catch (error) {
            this.handleError(error, res, 'AiController.pronounce');
        }
    }

    async chatSpeak(req: Request, res: Response): Promise<void> {
        try {
            const uid = req.user?.id;
            if (!uid) throw new Error('User context missing');

            const payload = chatSpeakSchema.parse(req.body);
            const result = await this.aiService.chatSpeak(uid, payload.topic_id, payload.audio_base64, payload.mime_type, payload.stt_text);

            this.handleSuccess(res, result);
        } catch (error) {
            this.handleError(error, res, 'AiController.chatSpeak');
        }
    }

    async scorePronunciation(req: Request, res: Response): Promise<void> {
        try {
            const uid = req.user?.id;
            if (!uid) throw new Error('User context missing');

            const { audioBase64, mimeType, expectedText } = req.body;
            if (!audioBase64 || !expectedText) {
                res.status(400).json({ success: false, error: 'Missing audio or expected text' });
                return;
            }

            const result = await this.aiService.scorePronunciation(uid, audioBase64, mimeType, expectedText);
            this.handleSuccess(res, result);
        } catch (error) {
            this.handleError(error, res, 'AiController.scorePronunciation');
        }
    }
}
