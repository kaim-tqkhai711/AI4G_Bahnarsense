import { z } from 'zod';

export const chatSpeakSchema = z.object({
    topic_id: z.string().min(1, "Bắt buộc phải có topic_id"),
    // Trong môi trường Web/Express, text hoặc audio thường truyền qua Base64 hoặc multipart/form-data
    // Cho MVP giản lược, giả định Front-end đã STT hoặc truyền audio_base64
    audio_base64: z.string().optional(),
    mime_type: z.string().optional(),
    stt_text: z.string().optional() // Nếu front-end dùng Web Speech API tự ra text 
}).refine(data => data.audio_base64 || data.stt_text, {
    message: "Phải gửi audio_base64 hoặc stt_text"
});

export const pronounceSchema = z.object({
    word: z.string().min(1, "Chưa truyền từ vựng cần đọc")
});
