# Kế Hoạch Đánh Giá & Hoàn Thiện MVP - AI4G Bahnarsense
**Ngày tạo:** 06/03/2026
**Mục tiêu:** Thống kê trạng thái 14 hạng mục MVP dựa trên tình trạng codebase hiện tại và lên kế hoạch hoàn thiện các phần còn thiếu.

---

## 🟢 PHẦN 1: THỐNG KÊ TRẠNG THÁI MVP

Dựa trên quá trình kiểm tra source code (cả `frontend` và `backend`), đây là bức tranh tổng thể về 14 hạng mục trong hình bạn cung cấp:

### Ngành 1: Đã Hoàn Thành Tốt (Ready / Done)
Đây là các tính năng cốt lõi đã có mặt đầy đủ logic cả Frontend và Backend (hoặc tích hợp dịch vụ bên thứ 3) và có thể sử dụng được:

1. **[#1] Đăng nhập / Đăng ký (User - High):** ✅ **Hoàn thành**
   - Đã tích hợp Supabase Auth (Google SSO), lưu State vào Zustand `useUserStore.ts`. Đã xử lý lỗi Timeout Cold Start trên Render.
2. **[#2] Quản lý nội dung (Admin - High):** ✅ **Hoàn thành**
   - Đã có `AdminRoom.tsx` và các API CRUD cho bài học, từ vựng, truyện cổ, vật phẩm tại `cms.routes.ts`.
3. **[#3] Điều hướng (User - High):** ✅ **Hoàn thành**
   - Bottom Navigation Pill-shaped và Top Navbar hiển thị tài sản ảo đã hoạt động trơn tru.
4. **[#4] Học tập (User - High):** ✅ **Hoàn thành**
   - Giao diện `LearnRoom.tsx` với Timeline dích dắc, trạng thái Node và UI vào bài học (`LessonIntro`) đã được thiết kế tối ưu hóa.
5. **[#5] Logic tiến độ học (Hệ thống - High):** ✅ **Hoàn thành**
   - Logic cộng điểm (XP, Gongs, Gems) và quản lý Streak đã hoàn tất và kết nối với Backend.
6. **[#6] Củng cố (Review Room) (User - Medium):** ✅ **Hoàn thành**
   - Có màn hình `ReviewRoom.tsx` hiển thị thẻ từ vựng sai và cơ chế ôn tập.
7. **[#7] Cộng đồng (Community) (User - Medium):** ✅ **Hoàn thành**
   - Có màn hình `CommunityRoom.tsx` chia tab Shared Goal, Friends list.
8. **[#8] Thách đấu 1v1 (User - Low):** ✅ **Hoàn thành**
   - Đã tích hợp socket.io để ghép cặp thi đấu trong `CommunityRoom.tsx`.
11. **[#11] Chat (AI Room) (User - High):** ✅ **Hoàn thành**
    - Màn hình chat `ChatRoom.tsx` thân thiện, bong bóng chat hiển thị tiếng Ba Na và Việt.
12. **[#12] Phản hồi Chat AI (Hệ thống - High):** ✅ **Hoàn thành**
    - Tích hợp Gemini 3 Flash qua `@google/genai` chạy API tại `ai.routes.ts`.
13. **[#13] Cửa hàng (Shop Room) (User - Medium):** ✅ **Hoàn thành**
    - Màn hình mua đồ `ShopRoom.tsx` hoạt động mượt, có hiệu ứng `canvas-confetti`.
14. **[#14] Mascot (Hệ thống - Medium):** ✅ **Hoàn thành**
    - Đã có Layering items trang bị từ Inventory lên "Voi emoji".

---

### Ngành 2: Đang Thiếu Sót (Pending / In-Progress)
Đây là các tính năng chưa hoàn thiện trọn vẹn so với mô tả chi tiết:

9. **[#9] Truyện cổ (Stories) (User - High):** ⚠️ **Cần hoàn thiện**
   - **Tình trạng:** Khung giao diện (`StoriesRoom.tsx`, Grid thẻ truyện) đã có.
   - **Đang thiếu:** *Nút "Hold To Record"* cho chế độ đọc (Phát âm). Hiện tại chưa có nút bấm ghi âm trực tiếp vào màn hình này.
10. **[#10] Đánh giá phát âm (Hệ thống - High):** ❌ **Chưa hoàn thành**
    - **Tình trạng:** Chưa có luồng Audio Recorder từ Frontend gửi về Backend.
    - **Đang thiếu:** Chưa gọi API Gemini / Text-to-Speech (hoặc Speech-to-Text) để kiểm tra phát âm giọng đọc tiếng Ba Na, so sánh và trả về nhận xét.

---

## 🟡 PHẦN 2: KẾ HOẠCH HÀNH ĐỘNG (NEXT STEPS)

> [!WARNING] Rủi ro
> Tính năng "Đánh giá phát âm tính phí âm thanh / Speech-to-Text" (Mục #9 và #10) là rào cản lớn nhất của MVP hiện tại, cần được tích hợp cẩn thận với Gemini API để tránh vượt quá Hạn mức miễn phí (Rate Limits) và đảm bảo Audio được nén đúng chuẩn trước khi upload.

Dựa trên phân tích, chúng ta cần hoàn thiện **Mục #9 và #10** để đạt mốc MVP 100%.

**Kế hoạch thực thi (Theo thứ tự ưu tiên):**
1. **Frontend (Audio Recorder):** Cài đặt Web Audio API cho nút `Hold to Record` ở màn hình Truyện cổ (`StoriesRoom`).
2. **Backend (Audio Processing):** Viết logic nhận Blob Audio, gửi tới Google Gemini API (bản hỗ trợ Multimodal cho Âm thanh) ở `ai.routes.ts`.
3. **Hệ thống (Scoring):** AI phân tích độ chính xác phát âm và trả lời nhận xét về UI cho người học.

---

## 🔵 PHẦN 3: PHƯƠNG ÁN XÁC MINH (VERIFICATION)
- **Tự động (Automated):** Viết Test kiểm tra tính toàn vẹn của luồng tải File âm thanh từ Client -> Server.
- **Thủ công (Manual):** Dùng thiết bị thật thu âm đọc một câu chuyện cổ tiếng Ba Na, sau đó nghe nhận xét trả về từ loa.
