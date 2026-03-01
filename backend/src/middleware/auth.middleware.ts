import { Request, Response, NextFunction } from 'express';
import { verifySupabaseToken } from '@/utils/supabaseAuth';
import * as Sentry from '@sentry/node';

declare global {
    namespace Express {
        interface Request {
            user?: {
                id: string;
                email?: string;
                role: string;
            };
        }
    }
}

export const authMiddleware = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const authHeader = req.headers.authorization || req.headers.Authorization;

        if (!authHeader || typeof authHeader !== 'string') {
            res.status(401).json({ success: false, message: 'Unauthorized: missing token' });
            return;
        }

        const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader;

        if (!token) {
            res.status(401).json({ success: false, message: 'Unauthorized: invalid token format' });
            return;
        }

        const payload = verifySupabaseToken(token);

        req.user = {
            id: payload.sub,
            email: payload.email,
            role: payload.role || 'student',
        };

        next();
    } catch (error: unknown) {
        if (error && typeof error === 'object' && 'name' in error && error.name === 'TokenExpiredError') {
            res.status(401).json({ success: false, message: 'Unauthorized: token expired' });
            return;
        }

        Sentry.captureException(error, { extra: { context: 'authMiddleware' } });
        res.status(401).json({ success: false, message: 'Unauthorized: invalid token' });
    }
};
