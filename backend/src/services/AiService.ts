import { GeminiService } from './GeminiService';
import { CustomTtsService } from './CustomTtsService';
import { NlpRulesService } from './NlpRulesService';
import { spawn } from 'child_process';
import path from 'path';

export class AiService {
    private ttsService: CustomTtsService;
    private nlpRules: NlpRulesService;

    constructor(private readonly geminiService: GeminiService) {
        this.ttsService = new CustomTtsService();
        this.nlpRules = new NlpRulesService();
    }

    private runPythonDtw(baseAudioBase64: string, userAudioBase64: string): Promise<{ success: boolean, acoustic_score?: number, error?: string }> {
        return new Promise((resolve, reject) => {
            const scriptPath = path.join(__dirname, '../scripts/dtw_scorer.py');
            const pyProcess = spawn('python', [scriptPath]);
            
            let stdoutData = '';
            let stderrData = '';

            pyProcess.stdout.on('data', (data) => {
                stdoutData += data.toString();
            });

            pyProcess.stderr.on('data', (data) => {
                stderrData += data.toString();
            });

            pyProcess.on('close', (code) => {
                try {
                    const result = JSON.parse(stdoutData.trim());
                    resolve(result);
                } catch (e) {
                    reject(new Error(`Python output parse error: ${stderrData} || ${stdoutData}`));
                }
            });

            const payload = JSON.stringify({
                baseAudio: baseAudioBase64,
                userAudio: userAudioBase64
            });
            pyProcess.stdin.write(payload);
            pyProcess.stdin.end();
        });
    }

    /**
     * Tính năng GET /ai/pronounce
     */
    async getPronounceUrl(word: string) {
        // Tích hợp Custom TTS
        const audioBase64 = await this.ttsService.generateSpeech(word);
        
        return {
            word: word,
            audio_base64: `data:audio/mp3;base64,${audioBase64}`
        };
    }

    /**
     * Tính năng POST /ai/chat/speak
     */
    async chatSpeak(uid: string, topicId: string, audioBase64?: string, mimeType?: string, sttText?: string) {
        let textToEvaluate = sttText || "";

        // Multimodal Gemini: Vừa nghe vừa phán đoán.
        const geminiResult = await this.geminiService.evaluatePronunciation(textToEvaluate, topicId, audioBase64, mimeType);

        // Màng lọc 1: Xử lý NLP trên đoạn trả về Ba Na
        const cleanResponse = this.nlpRules.cleanChatbotResponse(geminiResult.response_bhn);
        geminiResult.response_bhn = cleanResponse;

        // Màng lọc TTS: Nhét text Ba Na (sạch) vào Custom TTS Model
        let responseAudioBase64 = "";
        try {
            responseAudioBase64 = await this.ttsService.generateSpeech(cleanResponse);
        } catch (error) {
            console.warn("[AiService] Lỗi TTS Server trong khi Chat:", error);
        }

        return {
            stt_recognized: textToEvaluate || "Voice detected via Audio",
            evaluation: geminiResult,
            audio_base64: responseAudioBase64 ? `data:audio/mp3;base64,${responseAudioBase64}` : null,
            passed: geminiResult.accuracy >= 80
        };
    }

    /**
     * Tính năng POST /ai/score-pronunciation
     */
    async scorePronunciation(uid: string, audioBase64: string, mimeType: string, expectedText: string) {
        let standardAudioBase64 = "";
        try {
            standardAudioBase64 = await this.ttsService.generateSpeech(expectedText);
        } catch (error) {
            console.warn("[AiService] Bỏ qua DTW Score do TTS Server tắt mạng.");
        }

        // Bước 2 & 3: Gọi Python DTW song song với Gemini nhận diện từ sai
        const [dtwResult, geminiResult] = await Promise.all([
            this.runPythonDtw(standardAudioBase64, audioBase64).catch(e => {
                console.error("DTW Error:", e);
                return { success: false, acoustic_score: 0, error: e.message };
            }),
            this.geminiService.scorePronunciation(audioBase64, mimeType, expectedText).catch(e => {
                console.error("Gemini Error:", e);
                return { score: 0, wrong_words: [], feedback: "Có lỗi khi phân tích giọng nói" };
            })
        ]);

        const acousticScore = dtwResult.success ? Math.round(dtwResult.acoustic_score!) : (geminiResult.score || 0);

        return {
            score: acousticScore,
            wrong_words: geminiResult.wrong_words || [],
            feedback: geminiResult.feedback
        };
    }
}
