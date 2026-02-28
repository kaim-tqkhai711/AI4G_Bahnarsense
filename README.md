# Bahnarsense - Dự án Ứng dụng Học tiếng Ba Na

Chào mừng bạn đến với dự án **Bahnarsense**, ứng dụng học tiếng dân tộc Ba Na thông minh tích hợp Gamification, Spaced Repetition và các tính năng Real-time tương tác.

Tài liệu này là **Guideline Onboard** dành cho lập trình viên mới tham gia dự án.

## 1. Tổng quan Kiến trúc (Architecture)
Dự án được xây dựng theo mô hình Client-Server với các công nghệ chính:

*   **Frontend**: React.js (Vite), TypeScript, Zustand (Quản lý State), Tailwind CSS (UI), Framer Motion (Animation).
*   **Backend**: Node.js, Express, TypeScript, Zod (Validation), Socket.io (Realtime/Matchmaking).
*   **Database & Auth**: Firebase Authentication (SSO Google/Facebook) và Firebase Firestore.
*   **AI Integration**: Sử dụng Google Gemini 3 Flash cho tính năng nhận diện, phân tích và chấm điểm Luyện Nói.

### Cấu trúc Thư mục
```text
.
├── backend/          # Mã nguồn Server (Node.js/Express)
├── frontend/         # Mã nguồn Client (React/Vite)
├── google-apps.../   # Phụ trợ CMS/Data qua Google Sheets (Optional)
└── firestore.rules   # Security rules DB
```

---

## 2. Thiết lập Môi trường (Environment Setup)

### Yêu cầu hệ thống
*   Node.js (`v18+` trở lên, khuyến nghị `v20+` hoặc `v22+`)
*   NPM hoặc Yarn / Pnpm
*   Tài khoản Firebase và File Key `serviceAccount.json` hoặc cặp key cấu hình SDK

### Biến Môi Trường (Environment Variables)
Bạn cần tạo các file `.env` trước khi khởi chạy dự án:

**Tại `backend/.env`:**
```env
PORT=8000
FIREBASE_SERVICE_ACCOUNT_KEY=...
# Các thông số bảo mật khác...
```

**Tại `frontend/.env`:**
```env
VITE_API_URL=http://localhost:8000/api/v1
VITE_FIREBASE_API_KEY="..."
VITE_FIREBASE_AUTH_DOMAIN="..."
VITE_FIREBASE_PROJECT_ID="..."
# ... (Copy từ Firebase Console)
```

---

## 3. Chạy Dự án (Run Project)

Để khởi chạy dự án tại Local, bạn cần khởi chạy song song cả Backend và Frontend.

### Bước 1: Khởi chạy Backend
Mở Terminal 1 và thực hiện các lệnh:
```bash
cd backend
npm install
npm run dev
```
👉 Server sẽ khởi chạy tại `http://localhost:8000`.

### Bước 2: Khởi chạy Frontend
Mở Terminal 2 và thực hiện các lệnh:
```bash
cd frontend
npm install
npm run dev
```
👉 Truy cập ứng dụng tại `http://localhost:5173`.

---

## 4. Nhiệm vụ đầu tiên (Good First Issue)
Để làm quen với dự án, bạn có thể xem qua:
1. Đọc lướt file `frontend/src/store/useUserStore.ts` để hiểu cách State người dùng được lưu trữ.
2. Kiểm thử flow Login SSO và Màn hình Cửa hàng (Shop).
3. (Task Khởi động): Thay thế logo mặc định trong `WelcomeScreen.tsx` hoặc bổ sung thêm một API dummy vào nhóm Cửa hàng Backend.

