import { LessonRepository } from '@/repositories/LessonRepository';

// MOCK: Dữ liệu này thực tế sẽ được fetch từ Google Sheets API theo PLAN:
const CMS_MOCK_LESSONS = [
    { id: 'l1', title: 'Từ vựng Cơ bản', order: 1, type: 'vocabulary', correctAnswer: 'A' },
    { id: 'l2', title: 'Ngữ pháp nhập môn', order: 2, type: 'grammar', correctAnswer: 'B' },
    { id: 'l3', title: 'Phát âm cơ bản', order: 3, type: 'pronunciation', correctAnswer: 'C' },
];

export class LessonService {
    constructor(private readonly lessonRepository: LessonRepository) { }

    /**
     * GET /lessons
     */
    async getLessons(uid: string) {
        const progresses = await this.lessonRepository.getUserProgress(uid);
        const completedLessonIds = progresses.map(p => p.lesson_id);

        // Merge Mock JSON with Firestore Progress
        // Logic: Node tiếp theo chỉ active khi node trước hoàn thành 100%
        const processedLessons = CMS_MOCK_LESSONS.sort((a, b) => a.order - b.order).map((lesson, index) => {
            const isDone = completedLessonIds.includes(lesson.id);
            let status = 'locked';

            if (isDone) {
                status = 'done';
            } else if (index === 0 || completedLessonIds.includes(CMS_MOCK_LESSONS[index - 1].id)) {
                status = 'active';
            }

            return {
                id: lesson.id,
                title: lesson.title,
                type: lesson.type,
                status: status
            };
        });

        return processedLessons;
    }

    /**
     * POST /lessons/submit
     */
    async submitAnswer(uid: string, lessonId: string, questionId: string, userAnswer: any, correctCount: number = 10, totalQuestions: number = 10) {
        // 1. Phân giải câu hỏi thông qua CMS JSON/Google Sheets
        const lesson = CMS_MOCK_LESSONS.find(l => l.id === lessonId);
        if (!lesson) {
            throw new Error('Lesson not found');
        }

        // 2. Chấm điểm (Rule-based đơn giản)
        if (userAnswer !== lesson.correctAnswer) {
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
