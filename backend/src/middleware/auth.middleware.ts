import { Request, Response, NextFunction } from 'express';
import { auth } from '@/utils/firebaseAdmin';
import * as Sentry from '@sentry/node';

// Extend Express Request type
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

        // Verify token using Firebase Admin
        const decodedToken = await auth.verifyIdToken(token);

        // Attach to request
        req.user = {
            id: decodedToken.uid,
            email: decodedToken.email,
            role: decodedToken.role || 'student', // Custom claims can hold roles
        };

        next();
    } catch (error: any) {
        if (error.code === 'auth/id-token-expired') {
            res.status(401).json({ success: false, message: 'Unauthorized: Firebase token expired' });
            return;
        }

        Sentry.captureException(error, { extra: { context: 'authMiddleware' } });
        res.status(401).json({ success: false, message: 'Unauthorized: internal auth error' });
    }
};
