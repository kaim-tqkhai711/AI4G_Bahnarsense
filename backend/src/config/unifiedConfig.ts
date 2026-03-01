import dotenv from 'dotenv';
import { z } from 'zod';

// Load environment variables immediately
dotenv.config();

// Define strictly validated schema for config
const configSchema = z.object({
    env: z.enum(['development', 'production', 'test']).default('development'),
    port: z.string().default('8000').transform(Number),
    sentry: z.object({
        dsn: z.string().optional(), // Make it optional for local dev without errors
    }),
    db: z.object({
        databaseUrl: z.string().optional(),
    }),
    supabase: z.object({
        url: z.string().min(1, 'SUPABASE_URL is required'),
        serviceRoleKey: z.string().min(1, 'SUPABASE_SERVICE_ROLE_KEY is required'),
        jwtSecret: z.string().min(1, 'SUPABASE_JWT_SECRET is required for auth'),
    }),
    auth: z.object({
        jwtSecret: z.string().default('super-secret-dev-key'),
    }),
    ai: z.object({
        geminiApiKey: z.string().default('MY_GEMINI_API_KEY'),
    }),
});

// Parse and validate environment variables
const parsedConfig = configSchema.safeParse({
    env: process.env.NODE_ENV,
    port: process.env.PORT,
    sentry: {
        dsn: process.env.SENTRY_DSN,
    },
    db: {
        databaseUrl: process.env.DATABASE_URL,
    },
    supabase: {
        url: process.env.SUPABASE_URL,
        serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
        jwtSecret: process.env.SUPABASE_JWT_SECRET,
    },
    auth: {
        jwtSecret: process.env.JWT_SECRET,
    },
    ai: {
        geminiApiKey: process.env.GEMINI_API_KEY,
    }
});

if (!parsedConfig.success) {
    console.error('❌ Invalid environment configuration:', parsedConfig.error.format());
    process.exit(1);
}

// Export a typed, immutable config object as the single source of truth
export const config = parsedConfig.data;
