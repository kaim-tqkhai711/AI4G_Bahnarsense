import { z } from 'zod';

export const logErrorSchema = z.object({
    source: z.enum(['vocabulary', 'grammar', 'pronunciation', 'reading']),
    item_id: z.string().min(1, "Bắt buộc có item_id để tạo thẻ ôn tập"),
    user_answer: z.any().optional(),
    correct_answer: z.any().optional(),
    feedback: z.string().optional()
});

export const matchmakeSchema = z.object({
    level: z.string().optional() // Tùy chọn filter theo Level. Mặc định lấy theo hồ sơ user.
});
