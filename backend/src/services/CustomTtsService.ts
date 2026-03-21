import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

export class CustomTtsService {
    // In-memory cache map: hash -> Audio Base64 String
    private cache: Map<string, string> = new Map();
    private readonly TTS_API_URL = process.env.CUSTOM_TTS_URL || 'http://localhost:5000/tts'; // Change to Ngrok/Colab URL later
    
    constructor() {
        console.log(`[CustomTtsService] Initialized with endpoint: ${this.TTS_API_URL}`);
    }

    /**
     * Hash chuỗi text để làm Key cho Cache
     */
    private hashText(text: string): string {
        return crypto.createHash('md5').update(text.trim().toLowerCase()).digest('hex');
    }

    /**
     * Gọi API Custom TTS Model (Base64)
     */
    async generateSpeech(text: string): Promise<string> {
        if (!text) throw new Error("Text is required for TTS");

        const textHash = this.hashText(text);

        // 1. Kiểm tra Cache
        if (this.cache.has(textHash)) {
            console.log(`[CustomTtsService] Cache HIT for text: "${text.substring(0, 20)}..."`);
            return this.cache.get(textHash)!;
        }

        console.log(`[CustomTtsService] Cache MISS. Calling Custom TTS API for: "${text.substring(0, 20)}..."`);

        try {
            // 2. Fetch từ API Custom Model của người dùng
            // Chúng ta quy ước API nhận JSON { text: string } và trả về { audio_base64: string }
            const response = await fetch(this.TTS_API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ text })
            });

            if (!response.ok) {
                console.warn(`[CustomTtsService] API error: ${response.status}. Throwing error instead of mock.`);
                throw new Error("TTS API is offline or responding with error");
            }

            const data = await response.json();
            const audioBase64 = data.audio_base64;

            if (audioBase64) {
                // 3. Lưu Cache
                this.cache.set(textHash, audioBase64);
                return audioBase64;
            } else {
                throw new Error("Invalid TTS payload");
            }
        } catch (error) {
            console.error(`[CustomTtsService] Error fetching TTS:`, error);
            throw error;
        }
    }


}
