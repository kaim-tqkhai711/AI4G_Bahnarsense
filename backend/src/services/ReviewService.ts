import { ReviewRepository } from '@/repositories/ReviewRepository';

export class ReviewService {
    constructor(private readonly reviewRepository: ReviewRepository) { }

    async logError(uid: string, errorData: any) {
        // Tiền xử lý dữ liệu trước khi đẩy xuống Repo tính thuật toán
        return this.reviewRepository.logError(uid, errorData);
    }

    async fetchDailyTasks(uid: string) {
        let tasks = await this.reviewRepository.getDailyTasks(uid);
        
        // Enrich tasks with word and meaning from lessons table
        const { supabase } = await import('@/utils/supabaseAdmin');
        
        const itemIds = tasks.map((t: any) => t.item_id);
        if (itemIds.length > 0) {
            const { data: lessonsData } = await supabase
                .from('lessons')
                .select('lesson_id, content, description, type, correct_answer')
                .in('lesson_id', itemIds);
                
            if (lessonsData) {
                const validTasks: any[] = [];
                for (const task of tasks) {
                    const lesson = lessonsData.find((l: any) => l.lesson_id === task.item_id);
                    
                    if (!lesson) {
                        console.warn(`[Review] Bỏ qua thẻ ${task.item_id} vì không tìm thấy nội dung bài học tương ứng (có thể đã bị xóa).`);
                        continue;
                    }
                    
                    let wordStr = task.item_id;
                    let meaningStr = "Cần ôn tập lại";
                    
                    const content = typeof lesson.content === 'string' ? JSON.parse(lesson.content) : lesson.content || {};
                    wordStr = content.question || content.word || lesson.description || wordStr;
                    meaningStr = content.meaning || content.hint || (content.options ? Object.values(content.options).join(", ") : meaningStr);
                    
                    validTasks.push({
                        id: task.id,
                        item_id: task.item_id,
                        word: wordStr,
                        meaning: meaningStr,
                        errorCount: task.error_count || 1,
                        lesson_type: lesson?.type || 'quiz',
                        content: content,
                        description: lesson?.description || '',
                        correct_answer: lesson?.correct_answer || ''
                    });
                }
                tasks = validTasks;
            }
        }

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

    async resolveTask(uid: string, itemId: string) {
        return this.reviewRepository.resolveTask(uid, itemId);
    }
}
