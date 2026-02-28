import { ReviewRepository } from '@/repositories/ReviewRepository';

export class ReviewService {
    constructor(private readonly reviewRepository: ReviewRepository) { }

    async logError(uid: string, errorData: any) {
        // Tiền xử lý dữ liệu trước khi đẩy xuống Repo tính thuật toán
        return this.reviewRepository.logError(uid, errorData);
    }

    async fetchDailyTasks(uid: string) {
        const tasks = await this.reviewRepository.getDailyTasks(uid);
        return {
            total_due: tasks.length,
            tasks: tasks,
            message: tasks.length > 0 ? "Bạn có bài tập cần ôn lại!" : "Bạn đã hoàn thành mọi thứ hôm nay."
        }
    }

    async getSmartReminder(uid: string, geminiService?: any) {
        const dueItems = await this.reviewRepository.getDueReviews(uid);
        const count = dueItems.length;

        // Gọi Gemini để tạo câu chào động viên
        let aiMessage = `Bạn có ${count} thẻ cần ôn tập.`;
        if (geminiService && typeof geminiService.generateSmartReminder === 'function') {
            aiMessage = await geminiService.generateSmartReminder(count);
        }

        return {
            hasTasks: count > 0,
            taskCount: count,
            aiMessage: aiMessage
        };
    }

    async postponeReviews(uid: string, daysToPostpone: number = 1) {
        const newDate = new Date();
        newDate.setDate(newDate.getDate() + daysToPostpone);

        const movedCount = await this.reviewRepository.postponeReviews(uid, newDate.toISOString());
        return { success: true, postponedCount: movedCount };
    }
}
