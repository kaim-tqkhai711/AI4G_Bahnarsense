import { db } from '@/utils/firebaseAdmin';

export class UserRepository {
    async getProfile(uid: string) {
        const doc = await db.collection('profiles').doc(uid).get();
        if (!doc.exists) {
            throw new Error('User profile not found');
        }
        return { id: doc.id, ...doc.data() };
    }

    async updateProfile(uid: string, data: any) {
        const profileRef = db.collection('profiles').doc(uid);
        // Bỏ qua các field nhạy cảm nếu lỡ bị lọt xuống
        const safeData = { ...data };
        delete safeData.gongs;
        delete safeData.gems;
        delete safeData.xp;
        delete safeData.streak;

        if (Object.keys(safeData).length > 0) {
            await profileRef.update({
                ...safeData,
                updatedAt: new Date().toISOString()
            });
        }

        return this.getProfile(uid);
    }

    async updateLevelAndPath(uid: string, level: string, path: string[]) {
        const profileRef = db.collection('profiles').doc(uid);
        await profileRef.update({
            level_assigned: level,
            learning_path: path,
            survey_completed: true,
            updatedAt: new Date().toISOString()
        });

        return { level_assigned: level, learning_path: path };
    }
}
