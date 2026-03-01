import jwt from 'jsonwebtoken';
import { config } from '@/config/unifiedConfig';

export type SupabaseJwtPayload = {
    sub: string;       // user id (uuid)
    email?: string;
    role?: string;
    exp?: number;
};

/**
 * Verify Supabase access token (JWT) and return payload.
 * Uses the JWT Secret from Supabase Project Settings → API → JWT Secret.
 */
export function verifySupabaseToken(token: string): SupabaseJwtPayload {
    const decoded = jwt.verify(token, config.supabase.jwtSecret, {
        algorithms: ['HS256'],
    }) as SupabaseJwtPayload;
    return decoded;
}
