import { AuthRepository } from '@/repositories/AuthRepository';
import { verifySupabaseToken } from '@/utils/supabaseAuth';
import { supabase } from '@/utils/supabaseAdmin';

export class AuthService {
    constructor(private readonly authRepository: AuthRepository) { }

    /**
     * Register: use Supabase sign up on the frontend, then call POST /auth/login with the session token.
     * This backend route is kept for compatibility; returns a message to use frontend sign up.
     */
    async register(_email: string, _password_plain: string, _role: string = 'student', _defaultUsername?: string) {
        throw new Error('Use Supabase sign up on the frontend, then log in with the returned session token.');
    }

    /**
     * Verify Supabase access token and get or create profile in Supabase.
     */
    async verifyLoginToken(token: string) {
        try {
            const payload = verifySupabaseToken(token);
            const { sub, email } = payload;

            const emailStr = email ?? undefined;
            if (!emailStr) {
                throw new Error('Token không chứa email hợp lệ.');
            }

            const { profile, isNewUser } = await this.authRepository.getProfileOrCreate(
                sub,
                emailStr,
                'student',
                undefined
            );

            const { data: progressRows } = await supabase
                .from('user_progress')
                .select('lesson_id')
                .eq('user_id', sub);
            const completedLessons = (progressRows || []).map((r: { lesson_id: string }) => r.lesson_id);

            return {
                message: isNewUser ? 'User created successfully' : 'Login successful',
                isNewUser,
                user: {
                    ...profile,
                    name: profile.username,
                    completedLessons,
                },
            };
        } catch (error) {
            throw new Error('Verify Token thất bại: ' + (error instanceof Error ? error.message : String(error)));
        }
    }

    async setRole(_uid: string, _role: string) {
        throw new Error('Role is managed in Supabase; use Supabase dashboard or Auth hooks.');
    }
}
