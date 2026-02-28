import { db } from '@/utils/firebaseAdmin';

export class CmsService {
    /**
     * Nhận Payload array từ Google Sheets và ghi đè/cập nhật vào collection `lessons`
     */
    async syncLessons(lessonsData: any[]) {
        const batch = db.batch();
        const lessonsCollection = db.collection('lessons');

        let count = 0;
        for (const lesson of lessonsData) {
            if (!lesson.lesson_id) continue;

            const docRef = lessonsCollection.doc(lesson.lesson_id);
            batch.set(docRef, {
                ...lesson,
                updated_at: new Date().toISOString()
            }, { merge: true }); // Merge true để Cập nhật hoặc Thêm mới
            count++;
        }

        await batch.commit();
        return { synced_count: count };
    }
}
