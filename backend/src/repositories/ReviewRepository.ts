import { db } from '@/utils/firebaseAdmin';

export class ReviewRepository {
    /**
     * Log một lỗi mới. Nếu item_id này đã từng sai, cập nhật lại thuật toán.
     */
    async logError(uid: string, data: any) {
        const errorRef = db.collection(`review_cards_${uid}`).doc(data.item_id);

        // Thuật toán ghi đè cơ bản của SuperMemo-2 (SM-2 simplified)
        const doc = await errorRef.get();
        let nextReviewFactor = 1;

        if (doc.exists) {
            const existing = doc.data()!;
            nextReviewFactor = (existing.error_count || 1) + 1;
        }

        // Thời gian nhắc lại = today + (số lần sai * 1 ngày) -> logic thô
        const nextReviewDate = new Date();
        nextReviewDate.setDate(nextReviewDate.getDate() + nextReviewFactor);

        await errorRef.set({
            ...data,
            error_count: nextReviewFactor,
            next_review_date: nextReviewDate.toISOString(),
            updated_at: new Date().toISOString()
        }, { merge: true });

        return { success: true };
    }

    /**
     * Lấy danh sách nhiệm vụ cần ôn tập ngày hôm nay (Next Review Date <= Now)
     */
    async getDailyTasks(uid: string) {
        const today = new Date().toISOString();

        const snapshot = await db.collection(`review_cards_${uid}`)
            .where('next_review_date', '<=', today)
            .limit(20) // Chỉ lấy max 20 từ mỗi ngày đỡ ngợp
            .get();

        return snapshot.docs.map(doc => doc.data());
    }

    /**
     * Lấy tất cả các thẻ đang đến hạn ôn tập (phục vụ Smart Reminder)
     */
    async getDueReviews(uid: string) {
        const today = new Date().toISOString();
        const snapshot = await db.collection(`review_cards_${uid}`)
            .where('next_review_date', '<=', today)
            .get();

        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    }

    /**
     * Dời lịch tất cả các thẻ đang đến hạn sang một ngày khác
     */
    async postponeReviews(uid: string, newDate: string) {
        const today = new Date().toISOString();
        const snapshot = await db.collection(`review_cards_${uid}`)
            .where('next_review_date', '<=', today)
            .get();

        if (snapshot.empty) return 0;

        const batch = db.batch();
        snapshot.docs.forEach(doc => {
            batch.update(doc.ref, {
                next_review_date: newDate,
                updated_at: new Date().toISOString()
            });
        });

        await batch.commit();
        return snapshot.docs.length;
    }
}
