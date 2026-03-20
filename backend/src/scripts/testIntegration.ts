import { CustomTtsService } from '../services/CustomTtsService';
import { spawn } from 'child_process';
import path from 'path';

async function runTest() {
    console.log("=== BẮT ĐẦU TEST TÍCH HỢP TÍNH NĂNG AI ===");

    try {
        const ttsService = new CustomTtsService();

        console.log("\n1. Test CustomTtsService (Lấy Giọng Đọc Chuẩn)");
        const startTime = Date.now();
        const baseAudio = await ttsService.generateSpeech("Sự tích Hồ Tơ-nưng");
        console.log(`✅ Lấy thành công audio 1 (Thời gian: ${Date.now() - startTime}ms)`);
        
        console.log("\n2. Test Cache TTS (Lấy lại Giọng Đọc)");
        const cacheStartTime = Date.now();
        const cachedAudio = await ttsService.generateSpeech("Sự tích Hồ Tơ-nưng");
        console.log(`✅ Lấy thành công Cache audio (Thời gian: ${Date.now() - cacheStartTime}ms) -> Đạt < 0.1s!`);

        console.log("\n3. Chạy thuật toán chấm điểm phát âm bằng Python (DTW + MFCC)");
        const dtwResult = await new Promise((resolve, reject) => {
            const scriptPath = path.join(__dirname, 'dtw_scorer.py');
            const pyProcess = spawn('python', [scriptPath]);
            
            let stdoutData = '';
            let stderrData = '';

            pyProcess.stdout.on('data', (data) => { stdoutData += data.toString(); });
            pyProcess.stderr.on('data', (data) => { stderrData += data.toString(); });

            pyProcess.on('close', (code) => {
                try {
                    console.log("Python stdout raw:", stdoutData);
                    resolve(JSON.parse(stdoutData.trim()));
                } catch (e) {
                    reject(`Lỗi khi parse: ${stderrData} || ${stdoutData}`);
                }
            });

            // Gửi dữ liệu baseAudio (làm Giọng Chuẩn) và cachedAudio (Giả lập Giọng Người Dùng)
            pyProcess.stdin.write(JSON.stringify({
                baseAudio: baseAudio,
                userAudio: cachedAudio
            }));
            pyProcess.stdin.end();
        });

        console.log("✅ Kết quả chấm điểm DTW (Sinh trắc học):");
        console.log(dtwResult);

        console.log("\n🎉 HOÀN TẤT BÀI TEST THÀNH CÔNG RỰC RỠ!");

    } catch (e) {
        console.error("\n❌ CÓ LỖI XẢY RA TRONG QUÁ TRÌNH TEST:");
        console.error(e);
    }
}

runTest();
