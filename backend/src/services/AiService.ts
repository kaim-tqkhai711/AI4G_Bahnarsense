import { GeminiService } from './GeminiService';
// Import ReviewService / Firestore Repo nếu phát sinh lỗi để auto-trigger LogError (Thiết lập ở Nhóm 4)

export class AiService {
    constructor(private readonly geminiService: GeminiService) { }

    /**
     * Tính năng GET /audio/pronounce
     * Giải pháp lưu file gốc ở OneDrive và đưa các đoạn mp3 nén siêu nhỏ lên Firebase Storage.
     */
    async getPronounceUrl(word: string) {
        // Trong thực tế, bạn map tên Firebase Storage File theo Word.
        // Ví dụ: file nằm trong bucket "pronunciation/"
        // Do MVP ta không tải file lên vội, nên trả về public url tĩnh hợp lệ.
        const fileUrl = `https://firebasestorage.googleapis.com/v0/b/YOUR-PROJECT.appspot.com/o/pronunciation%2F${encodeURIComponent(word)}.mp3?alt=media`;

        return {
            word: word,
            audio_url: fileUrl
        };
    }

    /**
     * Tính năng POST /ai/chat/speak
     */
    async chatSpeak(uid: string, topicId: string, audioBase64?: string, sttText?: string) {

        // B1: Xử lý Speech-To-Text nếu Client gửi Audio.
        // (Vì giới hạn STT tiếng Ba-Na rất khó, MVP nên để FRONT-END xài Web Speech API ra text trươc
        // hoặc Backend gọi 1 service nội bộ. Ở đây ta ưu tiên xài sttText nếu có).

        const textToEvaluate = sttText || "Nội dung mặc định do chưa tích hợp STT Backend";

        // B2: Chuyển dữ liệu vào Gemini
        const geminiResult = await this.geminiService.evaluatePronunciation(textToEvaluate, topicId);

        // B3: Auto Trigger Log Data (sẽ làm ở Nhóm 4 - Spaced Repetition)
        if (geminiResult.accuracy < 80) {
            // Pseudo code: await this.reviewService.logError(uid, 'pronunciation', word, geminiResult.feedback);
        }

        return {
            stt_recognized: textToEvaluate,
            evaluation: geminiResult,
            passed: geminiResult.accuracy >= 80
        };
    }
}
