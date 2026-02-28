# Backend - Bahnarsense API Server

Mã nguồn Backend cho ứng dụng Bahnarsense. Middleware cung cấp API, giao tiếp với CSDL Firebase và quản lý phòng thách đấu Real-time.

## Tech Stack
*   **Core**: Node.js, Express, TypeScript.
*   **Database & Auth**: Firebase Admin SDK (Xác thực Token người dùng từ App, Query lên Firestore).
*   **Validation**: Zod (Ràng buộc cấu trúc Params / Body cho API).
*   **Realtime/PVP**: Socket.io Server (Native module).
*   **CORS/Security**: helmet, cors module.

## Cấu trúc thư mục chính
*   `/src/controllers/`: Xử lý logic Request/Response (User, Auth, Shop, Lessons, v.v..).
*   `/src/routes/`: Định nghĩa các API endpoints (`/api/v1/...`).
*   `/src/models/`: Chứa các interface/Type và định nghĩa Schema cấu trúc dữ liệu (`FirestoreSchema.ts`).
*   `/src/sockets/`: Các mô đun xử lý kết nối Socket.io theo từng Namespace/Room (VD: `communitySocket.ts`).
*   `/src/validators/`: Các Schema do thư viện `Zod` đảm nhận để sanitize Security payload ở đầu vào.
*   `app.ts`: Nơi khai báo và apply middlewares cho Express Server.
*   `server.ts`: Điểm nối Entrypoint (Start server HTTP + WebSockets).

## Môi trường & Start server
File `.env` nằm ở thư mục root cài đặt `FIREBASE_SERVICE_ACCOUNT_KEY` dưới dạng base64 chuỗi JSON hoặc đường dẫn.

*   `npm run dev`: Chạy server dev (Sử dụng lệnh ts-node-dev tự động reload).
*   `npm run build`: Compile ra /dist folder (JavaScript thuần).
*   `npm start`: Chạy App trên Production.

## Endpoint API Core
1.  **Auth**: `POST /auth/login` - Giải mã token gửi từ Client, tạo Profile Firebase.
2.  **User**: `GET` / `PUT /user/profile` - Lấy / Sửa đổi data thông tin cá nhân.
    `POST /user/survey` - Khảo sát đầu vào người học.
3.  **Shop**: `POST /shop/buy` - Engine xử lý giao dịch tiền ảo an toàn.
4.  **Community**: 
    - API: `GET /community/matchmaking`.
    - WebSockets Events: `receive_challenge`, `match_start`, `opponent_progress`, v.v...

*Chúc bạn trải nghiệm vui vẻ!*
