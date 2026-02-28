import { z } from 'zod';

export const surveySchema = z.object({
    purpose: z.string().min(1, "Mục đích không được để trống"),
    platform_experience: z.string().min(1, "Vui lòng chọn nền tảng"),
    time_commitment: z.number().min(5, "Thời gian học tối thiểu 5 phút"),
});

export const updateProfileSchema = z.object({
    username: z.string().optional(),
    avatar_url: z.string().url("Avatar phải là một URL hợp lệ").optional(),
    equippedItems: z.array(z.string()).optional(),
    // Streak và Gongs không cho người dùng update trực tiếp từ API này để tránh cheat!
});
