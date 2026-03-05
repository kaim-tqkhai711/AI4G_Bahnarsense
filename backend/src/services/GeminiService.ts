import { GoogleGenAI } from '@google/genai';
import { config } from '@/config/unifiedConfig';

// Init Gemini SDK
const ai = new GoogleGenAI({ apiKey: config.ai.geminiApiKey });

export class GeminiService {
    /**
     * Tương tác bằng Giọng nói (STT + LLM kết hợp qua Multimodal) hoặc Text
     */
    async evaluatePronunciation(text: string, topic: string, audioBase64?: string, mimeType?: string) {
        let systemPrompt = `Bạn là giáo viên dạy tiếng Ba Na nghiêm khắc nhưng tận tâm.
Học sinh đang trò chuyện về chủ đề: "${topic}".`;

        if (text) {
            systemPrompt += `\nNgười dùng đã nói câu: "${text}".`;
        }

        systemPrompt += `
Nhiệm vụ của bạn:
1. Đánh giá tính chính xác về cách nói/phát âm/ngữ pháp theo thang điểm từ 0 đến 100%. (Hãy thông cảm nếu lỗi nhỏ).
2. Phản hồi đối đáp lại câu của học sinh bằng Tiếng Ba Na (Kèm dịch tiếng Việt trong ngoặc vuông [] ở ngay sau).

Trả về phản hồi CHỈ DƯỚI ĐỊNH DẠNG JSON EXACTLY (Không có markdown text):
{
  "accuracy": <number>,
  "response_bhn": "<câu trút/động viên tiếng ba na>",
  "vietnamese_translation": "[<dịch nghĩa tiếng việt>]",
  "feedback": "<nhận xét ngắn gọn>"
}`;

        const parts: any[] = [{ text: systemPrompt }];

        if (audioBase64 && mimeType) {
            parts.unshift({
                inlineData: { data: audioBase64, mimeType: mimeType }
            });
        }

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: [
                { role: 'user', parts: parts }
            ],
            config: {
                responseMimeType: 'application/json',
            }
        });

        try {
            const textRes = response.text || "{}";
            return JSON.parse(textRes);
        } catch (e) {
            throw new Error('Gemini trả về format JSON không hợp lệ.');
        }
    }

    /**
     * Chấm điểm phát âm trực tiếp từ luồng Audio Base64.
     */
    async scorePronunciation(audioBase64: string, mimeType: string, expectedText: string) {
        const prompt = `
Bạn là giáo viên dạy tiếng Ba Na/Việt Nam.
Học sinh vừa đọc từ/câu sau: "${expectedText}".
Hãy lắng nghe đoạn âm thanh từ người dùng và đánh giá độ chính xác phát âm của họ so với từ/câu mẫu.
Trả về phản hồi CHỈ DƯỚI ĐỊNH DẠNG JSON EXACTLY:
{
  "score": <number từ 0-100 tương ứng với độ chính xác>,
  "feedback": "<nhận xét ngắn gọn, ví dụ: Rất tốt, hoặc Cần phát âm rõ âm 'x' hơn>"
}
`;
        // Gemini 1.5 Flash hỗ trợ Multimodal audio
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: [
                {
                    role: 'user',
                    parts: [
                        { inlineData: { data: audioBase64, mimeType: mimeType } },
                        { text: prompt }
                    ]
                }
            ],
            config: {
                responseMimeType: 'application/json',
            }
        });

        try {
            const textRes = response.text || "{}";
            return JSON.parse(textRes);
        } catch (e) {
            throw new Error('Gemini trả về format JSON không hợp lệ.');
        }
    }

    /**
     * Tạo thông điệp gợi ý ôn tập thông minh (Smart Review Reminder)
     */
    async generateSmartReminder(count: number) {
        try {
            if (count === 0) return "Tuyệt vời, bạn không có thẻ nào cần quá hạn ôn tập!";

            const prompt = `Bạn là trợ lý ảo thân thiện của ứng dụng học tiếng Ba Na. Người dùng có ${count} nội dung (thẻ từ vựng/ngữ pháp) cần ôn tập hôm nay. Hãy viết một câu nhắc nhở thật ngắn gọn, tự nhiên và động viên họ học bài (tối đa 1-2 câu, không dùng markdown, có thể dùng emoji).`;

            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: prompt,
            });

            return response.text || `Bạn có ${count} thẻ cần ôn tập. Hãy dành ít phút để củng cố kiến thức nhé!`;
        } catch (error) {
            console.error("Gemini gen error:", error);
            // Fallback tĩnh
            if (count === 0) return "Bạn không có bài tập ôn nào hôm nay.";
            return `Bạn đang có ${count} thẻ từ vựng cần ôn tập. Hãy ôn lại ngay để không quên nhé!`;
        }
    }
}
