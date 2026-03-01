import './instrument';

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import * as Sentry from '@sentry/node';
import { config } from '@/config/unifiedConfig';

import authRoutes from '@/routes/auth.routes';
import userRoutes from '@/routes/user.routes';
import lessonRoutes from '@/routes/lesson.routes';
import shopRoutes from '@/routes/shop.routes';
import aiRoutes from '@/routes/ai.routes';
import reviewRoutes from '@/routes/review.routes';
import communityRoutes from '@/routes/community.routes';
import cmsRoutes from '@/routes/cms.routes';

export const app = express();

// ==========================================
// 1. Core Middlewares
// ==========================================
// In development, disable CSP so Chrome DevTools and frontend (different origin) are not blocked
app.use(helmet({
    contentSecurityPolicy: config.env === 'development' ? false : undefined,
}));
app.use(cors());
app.use(express.json());

// ==========================================
// 2. Health & Base Routes
// ==========================================
// Root: avoid 404 when visiting http://localhost:8000/
app.get('/', (req: Request, res: Response) => {
    res.status(200).json({
        message: 'Ba Na Học API',
        docs: 'Use the frontend at http://localhost:5173',
        health: '/health',
    });
});
// Chrome DevTools probes this; respond so it does not 404 or trigger CSP
app.get('/.well-known/appspecific/com.chrome.devtools.json', (req: Request, res: Response) => {
    res.status(204).end();
});
app.get('/health', (req: Request, res: Response) => {
    res.status(200).json({ status: 'ok', environment: config.env });
});

// Quick way to verify Supabase connection (e.g. open http://localhost:8000/health/supabase)
app.get('/health/supabase', async (req: Request, res: Response) => {
    try {
        const { supabase } = await import('@/utils/supabaseAdmin');
        const { error } = await supabase.from('profiles').select('id').limit(1);
        if (error) throw error;
        res.status(200).json({ supabase: 'ok', message: 'Connected to Supabase. Tables are reachable.' });
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        res.status(503).json({ supabase: 'error', message });
    }
});

// Sentry test endpoint (intentional error)
app.get('/debug-sentry', (req: Request, res: Response) => {
    throw new Error('My first Sentry error!');
});

// ==========================================
// 3. API Routes
// ==========================================
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/user', userRoutes);
app.use('/api/v1/lessons', lessonRoutes);
app.use('/api/v1/shop', shopRoutes);
app.use('/api/v1/ai', aiRoutes);
app.use('/api/v1/review', reviewRoutes);
app.use('/api/v1/community', communityRoutes);
app.use('/api/v1/cms', cmsRoutes);


// ==========================================
// 4. Global Error Handling
// ==========================================
// The Sentry error handler must be registered before any other error middleware
// and after all controllers.
app.use(Sentry.Handlers.errorHandler());

// Fallback universal error middleware
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
    console.error('[Global Error]', err.message);
    res.status(500).json({
        success: false,
        message: 'Internal Application Error. Has been reported.',
    });
});
