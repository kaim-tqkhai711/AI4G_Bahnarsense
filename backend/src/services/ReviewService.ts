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
        const lessonItemIds = itemIds.filter((id: string) => !id.startsWith('story_'));
        const storyItemIds = itemIds.filter((id: string) => id.startsWith('story_'));
        
        let lessonsData: any[] = [];
        let storyData: any[] = [];

        if (lessonItemIds.length > 0) {
            const { data } = await supabase
                .from('lessons')
                .select('lesson_id, content, description, type, correct_answer')
                .in('lesson_id', lessonItemIds);
            if (data) lessonsData = data;
        }

        if (storyItemIds.length > 0) {
            // storyItemIds form: 'story_1_0', extract '1'
            const storyIds = [...new Set(storyItemIds.map((id: string) => id.split('_')[1]))];
            const { data } = await supabase
                .from('ReadStoryRoom')
                .select('id, quizzes')
                .in('id', storyIds);
            if (data) storyData = data;
        }
        
        const validTasks: any[] = [];
        
        for (const task of tasks) {
            if (task.item_id.startsWith('story_')) {
                const parts = task.item_id.split('_');
                const storyId = parts[1];
                const quizIdx = parseInt(parts[2], 10);
                
                const story = storyData.find((s: any) => s.id == storyId);
                if (!story) {
                    console.warn(`[Review] Bỏ qua thẻ truyện ${task.item_id} vì không tìm thấy truyện.`);
                    continue;
                }
                
                const quizzes = typeof story.quizzes === 'string' ? JSON.parse(story.quizzes) : (story.quizzes || []);
                const quiz = quizzes[quizIdx];
                if (!quiz) {
                    console.warn(`[Review] Bỏ qua thẻ truyện ${task.item_id} vì không tìm thấy câu hỏi quiz.`);
                    continue;
                }
                
                const mappedOptions: any = {};
                if (quiz.options && Array.isArray(quiz.options)) {
                    quiz.options.forEach((opt: string, idx: number) => {
                        mappedOptions[String.fromCharCode(65 + idx)] = opt; // A, B, C, D
                    });
                }
                
                validTasks.push({
                    id: task.id,
                    item_id: task.item_id,
                    word: quiz.question || 'Câu hỏi Truyện',
                    meaning: "Ôn tập câu hỏi truyện",
                    errorCount: task.error_count || 1,
                    lesson_type: 'quiz', // Render as a quiz
                    content: {
                        options: mappedOptions,
                        question: quiz.question,
                        media_type: null,
                        media_source: null
                    },
                    description: 'Phòng đọc truyện',
                    correct_answer: quiz.correct_answer || ''
                });
            } else {
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
        }
        tasks = validTasks;

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
