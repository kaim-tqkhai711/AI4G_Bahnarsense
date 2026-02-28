import { db } from '@/utils/firebaseAdmin';

export class AuthRepository {
    /**
     * Tạo tài khoản mới vào Firestore Profiles collection (đồng bộ với Firebase Auth uid)
     */
    async createProfile(data: { uid: string; email: string; role: string; username?: string }) {
        const profileRef = db.collection('profiles').doc(data.uid);

        const profileData = {
            username: data.username || data.email.split('@')[0],
            email: data.email,
            role: data.role,
            level: 'A1', // Default level cho người mới
            xp: 0,
            gongs: 0, // Cần dọn dẹp biến này nếu không dùng
            sao_vang: 0,
            gems: 0,
            streak: 0,
            inventory: [],
            equippedItems: { skin: 'item_skin_2' }, // Default skin
            createdAt: new Date().toISOString()
        };

        await profileRef.set(profileData);

        return { id: data.uid, ...profileData };
    }

    async getProfile(uid: string) {
        const doc = await db.collection('profiles').doc(uid).get();
        if (!doc.exists) return null;
        return { id: doc.id, ...doc.data() };
    }

    async getProfileOrCreate(uid: string, email: string, role: string = 'student', username?: string) {
        let profile = await this.getProfile(uid);
        let isNewUser = false;

        if (!profile) {
            profile = await this.createProfile({ uid, email, role, username });
            isNewUser = true;
        }

        return { profile, isNewUser };
    }
}
