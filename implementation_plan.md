# Kế hoạch Triển khai: Phòng Đọc truyện & Chatbot Kơ rai (Phiên bản Custom AI)

Bản kế hoạch này mô tả chi tiết các bước kỹ thuật để phát triển "Hệ thống ngầm" cho các tính năng Nghe mẫu, Giữ để đọc và trò chuyện với Chatbot. Điểm nhấn là việc tích hợp trực tiếp **Mô hình TTS Tiếng Ba Na tự train** của bạn.

## Tính khả thi của Custom TTS Ba Na
Việc bạn tự train model TTS hoàn toàn có thể kết hợp vào hệ thống, thậm chí đây là **phương pháp hoàn hảo nhất** vì giọng gốc chuẩn Ba Na sẽ giúp thuật toán DTW đo lường độ chính xác phát âm (MFCC) chuẩn hơn rất nhiều so với dùng giọng mượn từ tiếng Việt.

### Cách thức kết nối Model của bạn:
Sau khi Colab train xong, bạn có thể triển khai theo 2 hướng:
1. **Host thành API độc lập**: Bọc model bằng `FastAPI` + `ngrok` chạy thẳng trên Colab, hoặc đưa lên Hugging Face Spaces. Backend Node.js chỉ việc gọi API POST `/tts` là nhận được Audio.
2. **Chạy Local trên Backend**: Xuất file tạ (weights `.pth` hoặc `.onnx`) đem về bỏ chung vào folder `backend/src/scripts/`. Ta sẽ gọi model qua luồng Python `child_process`.

Dưới đây là kế hoạch đã được thiết kế lại để khớp với Model của bạn.

## Chi tiết Triển khai

### 1. Backend: Hệ thống Nghe mẫu & Custom TTS
#### [NEW] `backend/src/services/CustomTtsService.ts`
- Bỏ `google-tts-api`. Thay vào đó, viết service để kết nối với APIs Custom TTS của bạn (hoặc gọi lệnh Python local sinh file).
- Cài đặt cơ chế **Bộ nhớ đệm (Cache)**: Khi nhận chuỗi văn bản, Backend hash chuỗi đó để kiểm tra trong Cache (Redis/Map). Nếu đã có, trả về ngay File Audio trong 0.1s. Nếu chưa, gọi Model TTS sinh audio mới, lưu Cache rồi mới trả về.

### 2. Backend: DTW & MFCC (Giữ để đọc)
#### [NEW] `backend/src/scripts/dtw_scorer.py`
Viết 1 script Python chuẩn nhận 2 file/base64 âm thanh:
- **Audio 1**: Giọng chuẩn được sinh từ **Custom TTS Model của bạn**.
- **Audio 2**: Giọng thu qua mic của học viên.
Trích xuất họa đồ tần số MFCC qua `librosa`, và kết xuất độ sai lệch khoảng cách bằng `fastdtw`. Trả về `acoustic_score`.

#### [MODIFY] [backend/src/controllers/AiController.ts](file:///d:/vscode_repo/VIn/AI4G_Bahnarsense/backend/src/controllers/AiController.ts) & [AiService.ts](file:///d:/vscode_repo/VIn/AI4G_Bahnarsense/backend/src/services/AiService.ts)
Chỉnh sửa API [scorePronunciation](file:///d:/vscode_repo/VIn/AI4G_Bahnarsense/backend/src/services/AiService.ts#48-59):
1. Sinh file âm thanh TTS chuẩn từ Custom Model.
2. Gọi script Python `dtw_scorer.py` để lấy điểm số sinh trắc (DTW).
3. Song song, gọi Gemini 2.5 để bắt chính xác mảng (array) các chữ bị người dùng đọc sai (Ví dụ: `["tơ", "nưng"]`).
4. Hợp nhất thành 1 object JSON có 2 trường: [score](file:///d:/vscode_repo/VIn/AI4G_Bahnarsense/backend/src/services/AiService.ts#48-59) (trọng số từ DTW) và `wrong_words` (để Web tô màu Xanh/Đỏ).

### 3. Backend: Chatbot Kơ rai (Hybrid AI)
#### [NEW] `backend/src/services/NlpRulesService.ts`
Viết module Regex siêu nhẹ (Màng lọc số 1) để chuẩn hóa chính tả và xóa các từ nhiễu âm rác.
#### [MODIFY] [backend/src/services/GeminiService.ts](file:///d:/vscode_repo/VIn/AI4G_Bahnarsense/backend/src/services/GeminiService.ts) & [AiService.ts](file:///d:/vscode_repo/VIn/AI4G_Bahnarsense/backend/src/services/AiService.ts)
Luồng xử lý [chatSpeak](file:///d:/vscode_repo/VIn/AI4G_Bahnarsense/backend/src/services/AiService.ts#23-47) hoàn chỉnh:
1. **ASR Nhận diện Voice**: Gửi Base64 Voice cho Gemini 2.5 Flash để nghe ra Text.
2. **Màng lọc 1**: Văn bản đi qua `NlpRulesService` lọc nhiễu.
3. **Màng lọc 2**: Nhét Text sạch vào prompt "Giáo viên Ba Na" gửi LLM Gemini để sinh câu trả lời đối đáp.
4. **Custom TTS Output**: Đưa câu trả lời của Gemini truyền vào mô hình **Custom TTS của bạn** để sinh Giọng nói chân thực.
5. Trả `{ responseText, audioBase64 }` về cho Web UI mượt mà.

### 4. Frontend: Tích hợp Giao diện Web
#### [MODIFY] `frontend/src/pages/StoriesRoom.tsx` (Phòng đọc truyện)
- Nút "Nghe mẫu": Gọi API lấy audio và phát nhanh.
- Nút "Giữ để đọc" (Mic): Bóp nhỏ kích thước Base64 gửi lên Backend.
- Hiển thị Text Xanh/Đỏ: Dựa vào JSON trả về, bôi đỏ các từ nằm trong mảng `wrong_words`. Kích hoạt hiệu ứng Confetti thả sao vàng Gamification nếu `score > 80`.
#### [MODIFY] `frontend/src/pages/chat/ChatRoom.tsx` (Phòng hội thoại)
- Bổ sung nút Hold-to-Voice.
- Thiết lập thẻ `<audio>` ẩn để tự động bật lên âm thanh Kơ rai đọc bằng chính con Custom TTS của bạn.

## Phương án Xác thực (Verification)
1. Thử nghiệm End-to-End: Frontend gọi TTS -> Backend hit Cache/Gọi API Python gốc trả về.
2. Xác minh MFCC: Vẽ biểu đồ MFCC thực tế lúc rảnh ra ảnh log để so sánh DTW.
3. Test Voice Kơ Rai xem tốc độ sinh phản hồi bằng Mô hình của bạn.
