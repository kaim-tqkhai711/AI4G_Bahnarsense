import { LessonRepository } from '@/repositories/LessonRepository';

// Fallback when no lessons in DB (e.g. before seed)
const FALLBACK_LESSONS = [
    { lesson_id: 'l1', title: 'Từ vựng Cơ bản', order_index: 1, type: 'vocabulary', correct_answer: 'A' },
    { lesson_id: 'l2', title: 'Ngữ pháp nhập môn', order_index: 2, type: 'grammar', correct_answer: 'B' },
    { lesson_id: 'l3', title: 'Phát âm cơ bản', order_index: 3, type: 'pronunciation', correct_answer: 'C' },
];

export class LessonService {
    constructor(private readonly lessonRepository: LessonRepository) { }

    /**
     * GET /lessons — from Supabase when available, else fallback.
     */
    async getLessons(uid: string) {
        const progresses = await this.lessonRepository.getUserProgress(uid);
        const completedLessonIds = progresses.map(p => p.lesson_id);

        let lessons: { lesson_id: string; title: string; order_index?: number; type?: string }[];
        try {
            lessons = await this.lessonRepository.getLessonsFromDb();
        } catch {
            lessons = FALLBACK_LESSONS;
        }
        if (!lessons.length) lessons = FALLBACK_LESSONS;

        const sorted = [...lessons].sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0));
        const processedLessons = sorted.map((lesson, index) => {
            const isDone = completedLessonIds.includes(lesson.lesson_id);
            let status: 'locked' | 'active' | 'done' = 'locked';
            if (isDone) status = 'done';
            else if (index === 0 || completedLessonIds.includes(sorted[index - 1].lesson_id)) status = 'active';

            return {
                id: lesson.lesson_id,
                topic: lesson.title,
                difficulty: lesson.order_index ?? index + 1,
                type: lesson.type === 'vocabulary' ? 'vocab' : (lesson.type ?? 'vocabulary'),
                status,
            };
        });

        return processedLessons;
    }

    /**
     * POST /lessons/submit
     */
    async submitAnswer(uid: string, lessonId: string, questionId: string, userAnswer: unknown, correctCount: number = 10, totalQuestions: number = 10) {
        const lesson = await this.lessonRepository.getLessonById(lessonId)
            ?? FALLBACK_LESSONS.find(l => l.lesson_id === lessonId);
        if (!lesson) {
            throw new Error('Lesson not found');
        }

        const correctAnswer = (lesson as { correct_answer?: string }).correct_answer ?? (lesson as { correctAnswer?: string }).correctAnswer;
        if (userAnswer !== correctAnswer) {
            return {
                correct: false,
                hint: 'Sai rồi! Hãy thử suy nghĩ lại về ngữ cảnh của từ này nhé.',
            };
        }

        // 3. Nếu ĐÚNG -> Cộng điểm và Sao Vàng (Linh hoạt)
        // Ví dụ: >= 5/10 câu: +10 sao, < 5/10: +5 sao, 10/10: +15 sao
        const accuracy = correctCount / totalQuestions;
        let earnedSaoVang = 0;
        let earnedXp = 0;

        if (accuracy === 1) {
            earnedSaoVang = 15;
            earnedXp = 20;
        } else if (accuracy >= 0.5) {
            earnedSaoVang = 10;
            earnedXp = 10;
        } else {
            earnedSaoVang = 5;
            earnedXp = 5;
        }

        await this.lessonRepository.appendLessonSuccess(uid, lessonId, earnedSaoVang, earnedXp);

        return {
            correct: true,
            message: `Bạn đạt ${accuracy * 100}% ! Chúc mừng bạn đã hoàn thành bài học.`,
            rewards: {
                xp: earnedXp,
                sao_vang: earnedSaoVang
            }
        };
    }
}
