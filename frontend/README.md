# Frontend - Bahnarsense Client

Mã nguồn Frontend cho ứng dụng Bahnarsense.

## Tech Stack
*   **Core**: React 18, Vite, TypeScript.
*   **State Management**: Zustand (Lưu trữ trạng thái người dùng toàn cục).
*   **Routing**: React Router DOM.
*   **Styling**: Tailwind CSS & Lucide Icons.
*   **Animation**: Framer Motion & Canvas Confetti.
*   **Realtime**: Socket.io-client.

## Cấu trúc thư mục chính
*   `/src/components/`: Chứa các Component dùng chung (UI elements, Mascot, Layout).
*   `/src/pages/`: Chứa các View/Screen chính:
    *   `/auth`: Đăng nhập, Khảo sát khảo sát trình độ.
    *   `/chat`: Phòng luyện nói có chatbot AI.
    *   `/community`: Khu vực thách đấu Real-time bằng Socket.io.
    *   `/learn`: Bản đồ bài học kiểu Zic-zac chuyên nghiệp.
    *   `/shop`: Cửa hàng mua vật trang bị/trang phục.
    *   `/stories`: Phòng đọc truyện song ngữ có âm thanh.
*   `/src/store/`: Cấu hình Zustand stores chuyên biệt.
*   `/src/lib/`: Các tiện ích cấu hình (firebase, socket, monitor, fetch wrapper).

## Các lệnh npm
*   `npm run dev`: Khởi chạy môi trường Dev.
*   `npm run build`: Build JS production.
*   `npm run lint`: Quét lỗi của code ESLint.

## Lưu ý cho Dev
*   App áp dụng nguyên tắc `1 màn hình - 1 hành động` và `Emotional Design`.
*   Tính năng *Fallback Monitor API* (trong `src/lib/monitor.ts`) dùng để log lỗi đường truyền, ép fallback nếu Network Time > 3s. Luôn dùng `fetchWithMonitor()` thay cho fetch thuần!
