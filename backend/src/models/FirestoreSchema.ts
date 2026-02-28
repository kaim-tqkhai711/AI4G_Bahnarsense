/**
 * 1. Collection `users`
 * Lưu toàn bộ UserState từ Onboarding đến Gamification
 */
export interface UserProfile {
    user_id: string; // Document ID (Match với Firebase Auth UID)
    name?: string;
    email?: string;
    avatar_url?: string;
    level: 'A1' | 'A2' | 'B'; // Trình độ phân loại
    xp: number; // Điểm kinh nghiệm tích luỹ
    sao_vang: number; // Số lượng vàng để mua đồ (Ví dụ: 0)
    streak: number; // Chuỗi ngày học liên tục (Ví dụ: 0)
    inventory: string[]; // Kho đồ đã mua
    equippedItems: {
        skin?: string;
        clothes?: string;
        hair?: string;
        accessory?: string;
    }; // Object chứa ID vật phẩm đang mặc theo danh mục
    danh_hieu: string; // Tên danh hiệu hiện tại
    win_count: number; // Số lần thách đấu thành công
    streak_recovery_count: number; // Số lần khôi phục chuỗi trong tháng
    streak_recovery_month: string; // Tháng hiện tại (YYYY-MM)
    created_at: string;
    updated_at: string;
}

/**
 * 2. Collection `lessons`
 * Lưu trữ dữ liệu bài học (đẩy từ CMS/JSON)
 */
export type SkillType = 'vocabulary' | 'grammar' | 'pronunciation' | 'listening';

export interface Lesson {
    lesson_id: string; // Document ID
    chapter: string; // Tên chương
    type: SkillType; // Loại bài học/kỹ năng
    order: number; // Thứ tự trong chương
    questions: any[]; // Mảng nội dung/câu hỏi chi tiết (tùy ý cấu trúc)
}

/**
 * 3. Collection `user_progress`
 * Lưu tiến trình học của User (Cơ chế Mở khóa tuần tự)
 */
export interface UserProgress {
    // Document ID: `${user_id}_${lesson_id}`
    user_id: string;
    lesson_id: string;
    status: 'locked' | 'active' | 'done';
    completion_rate: number; // 0 - 100
    completed_at?: string; // Bổ sung timestamp khi hoàn thành
}

/**
 * 4. Collection `review_items`
 * Lưu Trái tim của hệ thống Spaced Repetition (SuperMemo)
 */
export type ErrorItemType = 'vocab' | 'grammar' | 'pronunciation';

export interface ReviewItem {
    // Document ID: tự gen (random string)
    user_id: string;
    item_type: ErrorItemType;
    content: string; // Tên từ sai / Câu sai
    error_count: number; // Số lần sai liên tiếp để SM2 tính hệ số
    next_review_date: string; // ISO date timestamp cho lần xuất hiện tiếp theo
    created_at: string;
    updated_at: string;
}
