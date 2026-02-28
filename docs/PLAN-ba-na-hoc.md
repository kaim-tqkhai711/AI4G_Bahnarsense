# 🗺️ Kế hoạch Phát triển: Ba Na Học (Learn Bahnar)

## 🎯 Mục tiêu
Xây dựng MVP cho ứng dụng học ngôn ngữ "Ba Na Học" nhắm tới học sinh cấp 2 với phong cách thiết kế "Warm Organic", mang lại cảm giác thân thiện, mềm mại và không cứng nhắc.

## 🛠️ Tech Stack
- **Core:** React 18, TypeScript, Vite
- **Styling & UI:** Tailwind CSS, Framer Motion, Lucide React
- **Backend & Data:** Supabase (Auth/DB)
- **Data Visualization:** Recharts

## 📐 Kiến trúc & Hệ thống Thiết kế (Design System)

### 1. Palette "Warm Organic"
- **Nền:** `#FDFCF8` (bg-paper)
- **Chính:** `#059669` (emerald-600)
- **Phụ:** `#F97316` (orange-500)
- **Nhấn:** `#3B82F6` (blue-500), `#FACC15` (yellow-400)
- **Văn bản:** `stone-800` (chính), `stone-500` (phụ)
- **Bo góc:** `rounded-2xl`, `rounded-3xl`, `rounded-[40px]`
- **Hiệu ứng:** Đổ bóng màu (tinted shadows), chuyển động bằng Framer Motion (scale-95).
- **Typography:** Quicksand (Chính/Body), JetBrains Mono (Data).

### 2. Cấu trúc Thư mục Dự kiến
```text
src/
├── assets/        # Hình ảnh, SVG (Mascot Voi)
├── components/    # UI cơ bản (Buttons, Cards, Modals)
├── features/
│   ├── auth/      # Welcome screen, Login logic
│   ├── learn/     # Zig-zag timeline, Daily Goal
│   ├── review/    # Mistake cards
│   ├── community/ # 1v1 Arena, Server Goal
│   ├── stories/   # Thu âm, hiển thị truyện
│   ├── chat/      # Gì Na Teacher UI
│   ├── shop/      # Mascot preview, inventory
│   └── admin/     # CMS Table
├── layouts/       # MainLayout (TopNav, BottomNav)
├── lib/           # Supabase client, utils
├── types/         # Định nghĩa kiểu dữ liệu (UserState, Lesson, v.v)
├── data/          # mockData.ts
└── App.tsx        # Cấu hình Routing
```

## 🚀 Trình tự Thực thi (Phiên bản MVP)

1. **Khởi tạo & Cấu hình:** Setup Vite, Tailwind, Framer Motion, định nghĩa biến CSS theo chuẩn "Warm Organic".
2. **Mock Data & Types:** Tạo `types.ts` và `mockData.ts` làm nền tảng.
3. **Shell & Auth:** Xây dựng màn hình Welcome (Mascot Voi, Đăng nhập/Chơi thử), Navbar, Bottom Nav.
4. **Phòng Học (Learn Room):** Làm timeline zig-zag và widget mục tiêu ngày.
5. **Các Phòng Khác:**
   - Review Room (Thẻ học lật mở).
   - Community Room (Thách đấu 1v1).
   - Stories (Giao diện đọc truyện & nút thu âm).
   - Chat (Gì Na Teacher chat UI).
   - Shop (Mascot và Cửa hàng).
6. **Admin CMS:** Xây dựng trang quản lý cơ bản.

## ⚠️ Đánh giá rủi ro & Lưu ý
- **Timeline Zig-zag:** Cần tính toán CSS khéo léo để hiển thị responsive đẹp trên Mobile.
- **Trạng thái Mascot (Equip Items):** Cần cấu trúc layer ảnh (SVG/PNG) hợp lý để ghép nối phụ kiện.
- **Framer Motion:** Tối ưu hóa animation tránh gây giật lag trên thiết bị di động cũ.

---
Vui lòng phê duyệt hoặc góp ý sửa đổi trước khi bắt đầu thực thi code ở Phase 3!
