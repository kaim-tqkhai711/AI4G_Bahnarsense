import { AuthRepository } from '@/repositories/AuthRepository';
import { auth } from '@/utils/firebaseAdmin';

export class AuthService {
    constructor(private readonly authRepository: AuthRepository) { }

    /**
     * Đăng ký người dùng mới bằng Firebase Admin API
     * NOTE: Thông thường nếu sử dụng Firebase Client SDK ở frontend, bạn ĐĂNG KÝ Ở FRONTEND.
     * Nhưng vì để giữ flow theo file Postman server cũ bạn muốn, ta có hàm Backend Firebase register:
     */
    async register(email: string, password_plain: string, role: string = 'student', defaultUsername?: string) {
        try {
            // 1. Tạo user bằng Firebase Admin
            const userRecord = await auth.createUser({
                email: email,
                password: password_plain,
            });

            // 2. Assign custom role (student hoặc seller)
            await auth.setCustomUserClaims(userRecord.uid, { role });

            // 3. Tạo record Profile trên Firestore Database 
            const userProfile = await this.authRepository.createProfile({
                uid: userRecord.uid,
                email: email,
                role: role,
                username: defaultUsername
            });

            // Để user có thể login trên các ứng dụng, Firebase sẽ expect Client đăng nhập (vì Admin ko trả Client JWT session trực tiếp).
            // Nhưng ta có thể sinh Custom Token cho Backend Client tự resolve.
            const customToken = await auth.createCustomToken(userRecord.uid);

            return {
                custom_token: customToken,
                message: 'Đăng ký thành công qua Firebase (Gửi custom_token này lên Firebase Client SDK signInWithCustomToken để có session auth_token).',
                user: userProfile
            };
        } catch (error: any) {
            if (error.code === 'auth/email-already-exists') {
                throw new Error('Email đã được sử dụng');
            }
            throw error; // Let the Controller's try-catch -> baseController handle the rest
        }
    }

    /**
     * Xác thực Firebase ID Token nhận được từ Frontend sau khi đăng nhập thành công.
     * Tự động lấy/tạo Profile người dùng.
     */
    async verifyLoginToken(token: string) {
        try {
            const decodedToken = await auth.verifyIdToken(token);
            const { uid, email, name, picture } = decodedToken;

            if (!email) {
                throw new Error("Token không chứa email hợp lệ.");
            }

            // Gọi Repository để lấy hoặc tạo mới Profile
            const { profile, isNewUser } = await this.authRepository.getProfileOrCreate(
                uid,
                email,
                'student', // Mặc định role
                name // Lấy name từ Google/Facebook nếu có
            );

            return {
                message: isNewUser ? 'User created successfully' : 'Login successful',
                isNewUser,
                user: {
                    ...profile,
                    avatar: picture, // Include avatar from provider if needed by UI
                }
            };
        } catch (error) {
            throw new Error('Verify Token thất bại: ' + (error instanceof Error ? error.message : String(error)));
        }
    }

    async setRole(uid: string, role: string) {
        await auth.setCustomUserClaims(uid, { role });
        return { success: true, role };
    }
}
