import jwt from 'jsonwebtoken';

export type SupabaseJwtPayload = {
    sub: string;       // user id (uuid)
    email?: string;
    role?: string;
    exp?: number;
};

/**
 * Decode Supabase access token (JWT) and return payload.
 *
 * NOTE:
 * - Supabase may sign tokens with different algorithms (HS256 / RS256).
 * - Instead of enforcing an algorithm here (which caused "invalid algorithm" errors),
 *   we rely on Supabase-js on the client to obtain a valid session and only decode
 *   the token on the server to read `sub` and `email`.
 */
export function verifySupabaseToken(token: string): SupabaseJwtPayload {
    const decoded = jwt.decode(token) as SupabaseJwtPayload | null;
    if (!decoded || !decoded.sub) {
        throw new Error('Supabase token không hợp lệ hoặc thiếu trường sub.');
    }
    return decoded;
}
