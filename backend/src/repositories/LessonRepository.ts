import { db } from '@/utils/firebaseAdmin';

export class LessonRepository {
    /**
     * Truy xuất toàn bộ lịch sử học tập của user
     */
    async getUserProgress(uid: string) {
        const progressSnapshot = await db.collection('user_progress')
            .where('user_id', '==', uid)
            .get();

        return progressSnapshot.docs.map(doc => doc.data());
    }

    /**
     * Lưu hoặc cập nhật tiến độ sau khi user submit kết quả
     */
    async appendLessonSuccess(uid: string, lessonId: string, earnedSaoVang: number, earnedXp: number) {
        const progressRef = db.collection('user_progress').doc(`${uid}_${lessonId}`);
        const profileRef = db.collection('profiles').doc(uid);

        const admin = await import('firebase-admin');

        // Giao dịch Batch Write đảm bảo tăng XP, Vàng và gạch thẻ Progress thành công cùng lúc
        const batch = db.batch();

        batch.set(progressRef, {
            user_id: uid,
            lesson_id: lessonId,
            status: 'done',
            completed_at: new Date().toISOString()
        }, { merge: true });

        batch.update(profileRef, {
            sao_vang: admin.firestore.FieldValue.increment(earnedSaoVang),
            xp: admin.firestore.FieldValue.increment(earnedXp),
            // Giả lập tặng streak: Mọi lần pass logic streak có thể check Date. (Giản lược do MVP)
            streak: admin.firestore.FieldValue.increment(1)
        });

        await batch.commit();

        return true;
    }
}
