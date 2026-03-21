import crypto from 'crypto';
import { spawn } from 'child_process';
import path from 'path';

export class CustomTtsService {
    // In-memory cache map: hash -> Audio Base64 String
    private cache: Map<string, string> = new Map();
    
    constructor() {
        console.log(`[CustomTtsService] Initialized with Microsoft Edge TTS Neural voice fallback`);
    }

    /**
     * Hash chuỗi text để làm Key cho Cache
     */
    private hashText(text: string): string {
        return crypto.createHash('md5').update(text.trim().toLowerCase()).digest('hex');
    }

    /**
     * Dùng Python subprocess gọi thư viện edge-tts sinh âm thanh Base64
     */
    async generateSpeech(text: string, voice: string = 'vi-VN-HoaiMyNeural'): Promise<string> {
        if (!text) throw new Error("Text is required for TTS");

        const textHash = this.hashText(text + voice);

        // 1. Kiểm tra Cache
        if (this.cache.has(textHash)) {
            console.log(`[CustomTtsService] Cache HIT for text: "${text.substring(0, 20)}..."`);
            return this.cache.get(textHash)!;
        }

        console.log(`[CustomTtsService] Cache MISS. Generating Edge TTS for: "${text.substring(0, 20)}..."`);

        return new Promise((resolve) => {
            const command = process.platform === 'win32' ? 'python' : 'python3';
            const scriptPath = path.join(__dirname, '../scripts/edge_tts_generator.py');
            const pyProcess = spawn(command, [scriptPath]);
            
            let stdoutData = '';
            let stderrData = '';

            pyProcess.on('error', (err) => {
                console.error(`[CustomTtsService] Failed to start subprocess: ${err.message}`);
                resolve(""); 
            });

            pyProcess.stdout.on('data', (data) => {
                stdoutData += data.toString('utf-8');
            });

            pyProcess.stderr.on('data', (data) => {
                stderrData += data.toString('utf-8');
            });

            pyProcess.on('close', (code) => {
                try {
                    if (!stdoutData.trim()) {
                        console.error(`[CustomTtsService] Edge TTS Empty Output. Stderr: ${stderrData}`);
                        return resolve("");
                    }
                    const result = JSON.parse(stdoutData.trim());
                    if (result.success && result.audio_base64) {
                        this.cache.set(textHash, result.audio_base64);
                        resolve(result.audio_base64);
                    } else {
                        console.error(`[CustomTtsService] Edge TTS Error: ${result.error || 'Unknown'}`);
                        resolve("");
                    }
                } catch (e) {
                    console.error(`[CustomTtsService] Python parse error in TTS: ${stderrData} || ${stdoutData}`);
                    resolve("");
                }
            });

            const payload = JSON.stringify({
                text: text,
                voice: voice
            });
            
            try {
                pyProcess.stdin.write(payload, 'utf-8');
                pyProcess.stdin.end();
            } catch(e) {
                console.error("[CustomTtsService] Failed to write to python stdin", e);
                resolve("");
            }
        });
    }
}
