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
            let payload;
            try {
                payload = verifySupabaseToken(token);
            } catch (err) {
                // Surface a clear message to the client while logging the original error
                // eslint-disable-next-line no-console
                console.error('[AuthService.verifyLoginToken] JWT verify failed', err);
                throw new Error('Token Supabase không hợp lệ. Vui lòng đăng nhập lại.');
            }

            const { sub, email } = payload;

            if (!sub) {
                throw new Error('Token Supabase thiếu user id (sub). Vui lòng đăng nhập lại.');
            }

            let emailStr = email ?? undefined;
            if (!emailStr) {
                // Fallback: fetch user from Supabase Auth by id to get email
                const { data, error } = await supabase.auth.admin.getUserById(sub);
                if (error) {
                    // eslint-disable-next-line no-console
                    console.error('[AuthService.verifyLoginToken] getUserById failed', error);
                    throw new Error('Không thể lấy thông tin người dùng từ Supabase.');
                }
                emailStr = data.user.email ?? undefined;
            }

            if (!emailStr) {
                throw new Error('Không tìm thấy email hợp lệ trong tài khoản Supabase.');
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
