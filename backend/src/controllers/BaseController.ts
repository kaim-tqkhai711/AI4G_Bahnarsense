import { Response } from 'express';
import * as Sentry from '@sentry/node';

export abstract class BaseController {

    /**
     * Helper to format successful API responses
     */
    protected handleSuccess<T>(res: Response, data: T, statusCode: number = 200): void {
        res.status(statusCode).json({
            success: true,
            data,
        });
    }

    /**
     * Helper to format error API responses and report strictly to Sentry
     */
    protected handleError(error: unknown, res: Response, contextMessage: string): void {
        // Report all errors to Sentry
        Sentry.captureException(error, {
            extra: { context: contextMessage },
        });

        // Check if it's a known error (e.g. Zod validation or custom Error)
        if (error instanceof Error) {
            res.status(400).json({
                success: false,
                message: error.message,
            });
            return;
        }

        // Fallback for unexpected internal errors
        res.status(500).json({
            success: false,
            message: 'Internal server error.',
        });
    }
}
