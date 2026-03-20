export class NlpRulesService {
    /**
     * Lọc rác và chuẩn hóa ngôn ngữ (Quy tắc Rule-based cơ bản)
     */
    cleanChatbotResponse(text: string): string {
        if (!text) return "";
        
        let cleaned = text;

        // Xóa dấu hiệu Markdown thừa hoặc emoji nếu TTS không đọc được
        cleaned = cleaned.replace(/\*{1,2}/g, ''); // Xóa bold/italic
        cleaned = cleaned.replace(/\[.*?\]/g, ''); // Xóa cụm ngoặc vuông dịch tiếng Việt (TTS chỉ nên ráp Ba Na)
        
        // Chuẩn hóa khoảng trắng
        cleaned = cleaned.replace(/\s+/g, ' ').trim();

        return cleaned;
    }
}
