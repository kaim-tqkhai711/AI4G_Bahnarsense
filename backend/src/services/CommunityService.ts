import { db } from '@/utils/firebaseAdmin';

export class CommunityService {
    /**
     * Truy vấn lấy danh sách những user có cùng Level để Matchmaking PVP.
     */
    async getMatchmakingList(uid: string, targetLevel?: string) {
        // Nếu client không truyền level, ta nỗ lực lấy level từ hồ sơ hiện tại.
        let searchLevel = targetLevel;

        if (!searchLevel) {
            const userDoc = await db.collection('profiles').doc(uid).get();
            if (!userDoc.exists) throw new Error('User profile not found.');
            searchLevel = userDoc.data()?.level_assigned || 'A1';
        }

        const snapshot = await db.collection('profiles')
            .where('level_assigned', '==', searchLevel)
            .limit(10) // Giới hạn lấy ra 10 người khả dụng làm đối thủ
            .get();

        const matches = snapshot.docs
            .map(doc => ({ id: doc.id, ...doc.data() }))
            .filter(user => user.id !== uid); // Loại trừ chính diện

        return {
            match_level: searchLevel,
            available_opponents: matches
        };
    }
}
