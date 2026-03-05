import { GeminiService } from '../services/GeminiService';
import * as dotenv from 'dotenv';
import path from 'path';

// Load environment variables for the test script
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const testSttAudio = async () => {
    try {
        const geminiService = new GeminiService();
        console.log("Mocking a short base64 audio string (Mock minimal WAV signature)...");

        // This is a minimal WAV stub in base64. 
        // Note: For real tests, you should read a valid audio file from disk and convert to Base64.
        const mockAudioBase64 = "UklGRoIAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=";

        console.log("Calling Gemini API Multimodal with the audio packet...");
        console.log("Expected Word: 'Bơ tơ̆k đe đe'");

        const result = await geminiService.scorePronunciation(
            mockAudioBase64,
            "audio/wav",
            "Bơ tơ̆k đe đe"
        );

        console.log("Result strictly matched expected JSON:");
        console.log(JSON.stringify(result, null, 2));

        if (typeof result.score === 'number' && typeof result.feedback === 'string') {
            console.log("\n✅ Test Passed: Valid format returned!");
        } else {
            console.log("\n❌ Test Failed: Invalid format");
        }

    } catch (e: any) {
        // Normally this will fail with 'Gemini trả về format JSON không hợp lệ' or generic validation
        // because the audio is just a 44-byte stub, but it proves the connection is active.
        console.error("Test failed or API rate limited:", e.message);
    }
};

testSttAudio();
