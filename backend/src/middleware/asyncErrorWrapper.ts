import { Request, Response, NextFunction } from 'express';

type AsyncExpressRoute = (req: Request, res: Response, next: NextFunction) => Promise<void>;

/**
 * Wraps async Express routes to automatically catch unhandled promises
 * and forward them to the global Express error handler (which eventually goes to Sentry).
 */
export const asyncErrorWrapper = (fn: AsyncExpressRoute) => {
    return (req: Request, res: Response, next: NextFunction) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
};
