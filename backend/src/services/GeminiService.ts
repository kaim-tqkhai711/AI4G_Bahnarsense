import { GoogleGenAI } from '@google/genai';
import { config } from '@/config/unifiedConfig';

// Init Gemini SDK
const ai = new GoogleGenAI({ apiKey: config.ai.geminiApiKey });

export class GeminiService {
    /**
     * Truyền Text thu được từ STT vào đóng vai giáo viên chấm điểm.
     */
    async evaluatePronunciation(text: string, topic: string) {
        const prompt = `
Bạn là giáo viên dạy tiếng Ba Na nghiêm khắc nhưng tận tâm. 
Học sinh vừa nói câu liên quan đến chủ đề: "${topic}".
Nội dung hệ thống STT nhận diện được từ giọng học sinh là: "${text}".

Nhiệm vụ của bạn:
1. Đánh giá tính chính xác ngữ pháp và từ vựng của câu trên theo thang điểm từ 0 đến 100%.
2. Phản hồi lại học sinh bằng Tiếng Ba Na (Kèm dịch tiếng Việt trong ngoặc vuông [] ở câu tiếp theo).

Trả về phản hồi CHỈ DƯỚI ĐỊNH DẠNG JSON EXACTLY (Không render markdown block rác):
{
  "accuracy": <number>,
  "response_bhn": "<câu trút/động viên tiếng ba na>",
  "vietnamese_translation": "[<dịch nghĩa tiếng việt>]",
  "feedback": "<nhận xét ngắn gọn>"
}
    `;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash', // hoặc gemini-3-flash nếu bạn access được
            contents: prompt,
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
