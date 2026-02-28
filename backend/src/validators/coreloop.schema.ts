import { z } from 'zod';

export const submitLessonSchema = z.object({
    lesson_id: z.string().min(1, "lesson_id không được để trống"),
    question_id: z.string().min(1, "question_id không được để trống"),
    user_answer: z.any({
        required_error: "user_answer không được để trống"
    })
});

export const purchaseShopSchema = z.object({
    item_id: z.string().min(1, "Thiếu ID vật phẩm cần mua")
});
