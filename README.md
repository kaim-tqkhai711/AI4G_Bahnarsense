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
*Phát triển bởi đội ngũ kỹ sư Antigravity 🚀*
