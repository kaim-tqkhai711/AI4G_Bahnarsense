# Bahnarsense - Ứng dụng Học tiếng Ba Na Thông minh 🐘

![Project Banner](https://via.placeholder.com/1200x400/f3f4f6/4e9f76?text=Bahnarsense+-+Hoc+Tieng+Ba+Na+De+Dang)

Chào mừng bạn đến với **Bahnarsense**! Đây là một dự án ứng dụng học ngôn ngữ dân tộc Ba Na thông minh, ứng dụng các công nghệ giáo dục hiện đại như **Gamification**, **Spaced Repetition System (SRS)** (Lặp lại ngắt quãng), và các tính năng tương tác **Real-time**. Ứng dụng còn tận dụng khả năng của AI để hỗ trợ mạnh mẽ quá trình học tập.

## 🌟 Tính năng nổi bật

*   **Lộ trình học tập cá nhân hóa**: Lộ trình chữ "Z" trực quan giúp người học dễ dàng theo dõi tiến độ.
*   **Học tập Tương tác & Gamification**: Học từ vựng, ngữ pháp thông qua hình ảnh, âm thanh, game và hệ thống phần thưởng (Sao vàng, Chuỗi ngày học - Streak).
*   **Spaced Repetition (SRS)**: Ôn tập thông minh, tự động nhắc lại các từ hoặc câu hay sai.
*   **Tính năng Cộng đồng (Real-time)**: Thi đấu thời gian thực (PvP) với người chơi khác qua công nghệ WebSockets.
*   **Tích hợp AI Tiên tiến**: Sử dụng LLM (Google Gemini Flash) để phân tích, chấm điểm kỹ năng phát âm của người dùng.
*   **Admin Dashboard**: Quản lý bài học, người dùng và dữ liệu dễ dàng qua giao diện trực quan.

## 🏗 Tổng quan Kiến trúc Hệ thống

Dự án được xây dựng theo kiến trúc **Client-Server** kết hợp **Cloud Native Serverless** ở một số module, với sự tách biệt rõ ràng giữa các phân hệ:

```text
.
├── backend/                # Mã nguồn Server (Node.js/Express/Socket.io)
│   ├── src/                # Controllers, Routes, Services, Repositories, Sockets
│   └── tests/              # Unit & Integration Tests
├── frontend/               # Mã nguồn Client (React/Vite/TypeScript)
│   ├── src/                # Components, Pages, Store (Zustand), Hooks, Utils
│   └── public/             # Static Assets
├── database/               # Scripts/Schemas khởi tạo cấu trúc DB (PostgreSQL/Firebase)
├── infrastructure/         # Cấu hình DevOps, tự động hóa như Docker, Terraform
├── google-apps-script/     # Phụ trợ CMS/Data qua Google Sheets (Optional)
└── firestore.rules         # Security rules cho Firebase
```

### 🛠 Tech Stack

*   **Frontend**: React.js (Vite), TypeScript, Zustand (Quản lý State), Tailwind CSS (UI/UX), Framer Motion (Animation hiệu ứng cao cấp), Lucide React (Icons).
*   **Backend**: Node.js, Express.js, TypeScript, Zod (Data Validation), Socket.io (Xử lý Real-time Matchmaking).
*   **Database & Auth**: Firebase Authentication (SSO Google/Facebook), Firebase Firestore.
*   **Cloud & DevOps**: Vercel (Frontend Hosting), Render / Railway (Backend Hosting dự kiến).
*   **AI Integration**: Google Gemini API.

---

## 🚀 Hướng dẫn Cài đặt & Khởi chạy (Local Development)

### Yêu cầu hệ thống
*   **Node.js**: Phiên bản `v18+` trở lên (Khuyến nghị `v20+` LTS).
*   **Trình quản lý gói**: `npm` hoặc `yarn` / `pnpm`.
*   Tài khoản **Firebase** và file key `serviceAccount.json` cho Admin SDK.

### 1. Cấu hình Biến Môi Trường (.env)

Tạo file `.env` ở cả hai thư mục `backend` và `frontend`.

**Tại `backend/.env`:**
```env
PORT=8000
FRONTEND_URL=http://localhost:5173
FIREBASE_SERVICE_ACCOUNT_KEY={"type": "service_account", ...}
GEMINI_API_KEY=your_gemini_api_key_here
```

**Tại `frontend/.env`:**
```env
# URL kết nối API Server
VITE_API_URL=http://localhost:8000
VITE_SOCKET_URL=http://localhost:8000

# Cấu hình Firebase Client SDK
VITE_FIREBASE_API_KEY="your_api_key"
VITE_FIREBASE_AUTH_DOMAIN="your_project_id.firebaseapp.com"
VITE_FIREBASE_PROJECT_ID="your_project_id"
VITE_FIREBASE_STORAGE_BUCKET="your_project_id.appspot.com"
VITE_FIREBASE_MESSAGING_SENDER_ID="your_sender_id"
VITE_FIREBASE_APP_ID="your_app_id"
```

### 2. Khởi chạy Ứng dụng

Khởi chạy song song 2 dịch vụ (Nên dùng 2 Tab Terminal).

**Terminal 1 (Backend):**
```bash
cd backend
npm install
npm run dev
# Server lắng nghe tại http://localhost:8000
```

**Terminal 2 (Frontend):**
```bash
cd frontend
npm install
npm run dev
# Mở trình duyệt tại http://localhost:5173
```

---

## 👨‍💻 Dành cho Lập trình viên mới (Onboarding)

Nếu bạn mới tham gia dự án, hãy xem qua các flow sau để nắm bắt logic hiển thị:
1. **Flow Xác thực (Auth Flow)**:
   * Xem file `frontend/src/pages/auth/WelcomeScreen.tsx` (Màn hình đăng nhập/SSO).
   * Middleware Backend: `backend/src/middleware/authMiddleware.ts` (Giải mã Token từ Firebase).
2. **State Management**: Đọc `frontend/src/store/useUserStore.ts` để hiểu cách ứng dụng đồng bộ hóa trạng thái người dũng (Điểm kinh nghiệm, Số xu...).
3. **Cơ chế Real-time PVP**:
   * Frontend: `frontend/src/pages/community/CommunityRoom.tsx`.
   * Backend: `backend/src/sockets/matchmaking.ts`.

---

## 🎨 Giao diện & Design System

Dự án áp dụng Design System rất linh hoạt và trực quan, sử dụng Utility-classes từ **Tailwind CSS**.
* **Bảng màu (Palette)**: Focus nhiều vào tông màu tự nhiên như Cam đất (`orange-500`), Xanh ngọc (`emerald-500`), hệ thống nền sáng dịu (`stone-50`).
* **Micro-interactions**: Chú trọng sử dụng Framer Motion cho các tương tác nổi lên (Pop), thu nhỏ khi click (Scale down) mang lại trải nghiệm giống Ứng dụng Mobile Native (vd: Duolingo).

---
## 🧠 Kiến trúc Hệ thống (System Architecture)

Dựa trên tư duy hệ thống và kiến trúc giải pháp, tính năng cốt lõi của ứng dụng đánh giá phát âm thông minh được vận hành như sau:

*   **Công nghệ AI sử dụng**: Ứng dụng sức mạnh của **Large Language Model (LLM)** đa phương thức (Multimodal), cụ thể là **Google Gemini 2.5 Flash**. Thay vì phải huấn luyện một mô hình CNN hay RNN nhận diện giọng nói (STT) từ đầu, ứng dụng sử dụng Gemini để vừa nghe (audio chunk), vừa đọc ngữ cảnh (prompt) và đưa ra đánh giá.
*   **Quy trình vận hành**: 
    1. **Input**: Dữ liệu giọng nói của học viên được thu qua micro trên Web/App (Trình duyệt) và mã hóa thành chuỗi `Base64` cùng với MIME Type tương ứng.
    2. **Xử lý trung gian**: Gói dữ liệu chuyển tới Backend API. Tại đây, hệ thống tiêm thêm **System Prompt** chứa thông tin từ vựng tiếng Ba Na/Việt Nam đang học.
    3. **AI Processing**: Gọi tới thư viện `@google/genai` (Gemini SDK). Mô hình Gemini tiếp nhận Audio + Text context tiến hành phân tích tính chính xác của âm sắc, từ vựng.
    4. **Output**: Trả về một object JSON chứa điểm số (`score`/`accuracy`) và phản hồi (`feedback`).
    5. **Hiển thị**: Frontend nhận dữ liệu JSON, phân tách và hiển thị lên màn hình cùng các hiệu ứng chúc mừng hoặc khích lệ.

---

## 📊 Chi tiết về dữ liệu (Dataset)

Đây là phần quan trọng để đối chiếu với Bảng kiểm Đạo đức (Ethical AI Checklist):

*   **Nguồn dữ liệu**: Dữ liệu từ vựng tiếng Ba Na (làm mẫu chuẩn) được đội ngũ phát triển và giáo viên địa phương cung cấp thủ công. Dữ liệu âm thanh là dữ liệu **tự thu âm trong thời gian thực (Real-time voice capture)** từ thiết bị của người dùng cuối (học sinh) để so khớp. Hệ thống không sử dụng dữ liệu cào (crawl) trái phép từ Internet.
*   **Kích thước bộ dữ liệu**: 
    * Ứng dụng thừa hưởng trí tuệ nhân tạo từ mô hình nền tảng khổng lồ của Google (Gemini).
    * Bộ dữ liệu test kiểm thử (testing dataset) nội bộ bao gồm hàng trăm mẫu phát âm tiếng Ba Na được thu thập để kiểm tra tính chịu lỗi và tinh chỉnh Instruction prompt (few-shot prompting).
*   **Đảm bảo đạo đức**: Trước khi sử dụng tính năng đánh giá phát âm, ứng dụng yêu cầu cấp quyền sử dụng Micro rõ ràng. Dữ liệu Base64 truyền đi được mã hóa qua môi trường kết nối an toàn nhưng **HOÀN TOÀN ẨN DANH VÀ KHÔNG ĐƯỢC LƯU TRỮ** tệp thô vào cơ sở dữ liệu (Firestore) nhằm tôn trọng quyền riêng tư gốc.

---

## ⚙️ Logic lập trình & Thuật toán (Core Logic)

Thể hiện tư duy máy tính và khả năng phân rã bài toán:

*   **Phân rã bài toán**: Luồng xử lý phân tách theo nguyên tắc Single Responsibility:
    * Ở client, module Recorder Capture ghi âm và xuất ra định dạng nhẹ.
    * Ở Server, Backend Controller điều hướng endpoint, chuyển giao cho Layer `GeminiService`. Layer này chỉ chịu trách nhiệm cấu trúc hóa Payload và Call AI.
*   **Trừu tượng hóa**: 
    * Tận dụng SDK `@google/genai` như một cỗ máy black box. 
    * Trừu tượng hóa tính năng STT (Speech-to-Text) và Scoring phức tạp thành một lệnh gọi duy nhất `ai.models.generateContent` với role `user` và hai parameters: `inlineData` (Audio) và `text` (Context prompt).
*   **Xử lý lỗi**: 
    * Có cơ chế `try...catch` bọc việc parse JSON kết quả trả về. Nếu model rơi vào trạng thái ảo giác (hallucination), format sai lệch thay vì JSON -> Hệ thống ném lỗi cụ thể và dự phòng fallback text thân thiện thay vì làm server crash.

---

## 🚀 Kế hoạch triển khai kỹ thuật (Deployment Plan)

*   **Trình tự thực hiện**: 
    1. Nghiên cứu tài liệu Gemini Multimodal, lấy API key và thiết lập biến môi trường.
    2. Viết class `GeminiService` trên Node.js xử lý việc injection Prompt theo từng Use Case (đánh giá phát âm, đối đáp hội thoại, nhắc nhở).
    3. Thiết kế luồng Frontend dùng Web Audio API để luân chuyển gói chunk audio Base64 nhỏ nhẹ thay vì tập tin âm thanh nặng nề truyền thống.
    4. Testing Tích hợp giữa Client và Server.
*   **Tính tối ưu (Fine-Tuning)**: Đã tinh chỉnh **System prompt** (Prompt Engineering) chuyên sâu thay vì tinh chỉnh Weights Model nặng nề. Chọn model `gemini-2.5-flash` và thiết lập `responseMimeType: 'application/json'` nhằm tối ưu độ trễ xử lý (low-latency) nhanh nhất có thể, đáp ứng nhu cầu Gamification thời gian thực.

---

## ⚖️ Tự đánh giá về Đạo đức AI

*   **Xác nhận tuân thủ**: Dự án tuân thủ toàn diện các nguyên tắc an toàn, không có thiên kiến và tính riêng tư trong Bảng kiểm đạo đức của Ban Tổ chức. Hệ thống minh bạch trong việc thu thập thông tin (chỉ nghe qua quyền cấp chủ động).
*   **Giải thích kiểm soát rủi ro**:
    * LLM được kiểm soát bằng quy tắc cứng mã hóa trong source code: `"Bạn là giáo viên dạy tiếng Ba Na nghiêm khắc nhưng tận tâm..."`. Việc này khoanh vùng phạm vi của luồng thông tin, ngăn chặn sinh ra nội dung độc hại, bạo lực hay vi phạm lề thói văn hóa.
    * Cơ chế Ephemeral Architecture (Kiến trúc xử lý vô thường): Xóa dữ liệu Audio sinh trắc học ngay vào lúc kết thúc request đánh giá, chặn rủi ro dữ liệu bị lạm dụng cho Deepfake.

---
*Phát triển bởi đội ngũ kỹ sư Antigravity 🚀*
