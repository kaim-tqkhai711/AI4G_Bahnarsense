/**
 * Seed mock/demo data for Bahnar language learning app.
 * Run from backend folder: npx ts-node -r tsconfig-paths/register src/scripts/seedBahnarDemo.ts
 */
import dotenv from 'dotenv';
dotenv.config();

import { supabase } from '@/utils/supabaseAdmin';

const LESSONS = [
  { lesson_id: 'bahnar_01', title: 'Chào hỏi (tiếng Bahnar)', description: 'Học cách chào hỏi cơ bản trong tiếng Bahnar', order_index: 1, type: 'vocabulary', correct_answer: 'A', content: { phrase: 'Ơi / Hơi', meaning: 'Xin chào' } },
  { lesson_id: 'bahnar_02', title: 'Số đếm 1–10', description: 'Số từ 1 đến 10 trong tiếng Bahnar', order_index: 2, type: 'vocabulary', correct_answer: 'B', content: { words: ['mơnao', 'bar', 'pơi', 'pôun', 'sơđăm', 'pơnam', 'pơđâu', 'pơđêt', 'pơđin', 'pơđit'] } },
  { lesson_id: 'bahnar_03', title: 'Gia đình', description: 'Từ vựng về gia đình: bố, mẹ, anh, chị', order_index: 3, type: 'vocabulary', correct_answer: 'A', content: { words: ['ama', 'ina', 'kơđi', 'kơsâu'] } },
  { lesson_id: 'bahnar_04', title: 'Màu sắc', description: 'Tên các màu cơ bản trong tiếng Bahnar', order_index: 4, type: 'vocabulary', correct_answer: 'C', content: { words: ['đơk', 'hơriăng', 'rơngao'] } },
  { lesson_id: 'bahnar_05', title: 'Động vật trong làng', description: 'Từ vựng động vật quen thuộc', order_index: 5, type: 'vocabulary', correct_answer: 'A', content: { words: ['rơgơi', 'kơtông', 'sơkô'] } },
  { lesson_id: 'bahnar_06', title: 'Cụm từ hàng ngày', description: 'Cảm ơn, xin lỗi, tạm biệt', order_index: 6, type: 'pronunciation', correct_answer: 'B', content: { phrases: ['Blơi ơn', 'Tơlah', 'Ơi gơi'] } },
  { lesson_id: 'bahnar_07', title: 'Giới thiệu bản thân', description: 'Tên tôi là... Tôi đến từ...', order_index: 7, type: 'grammar', correct_answer: 'A', content: {} },
  { lesson_id: 'bahnar_08', title: 'Thời tiết & thiên nhiên', description: 'Nắng, mưa, gió, rừng', order_index: 8, type: 'vocabulary', correct_answer: 'C', content: {} },
  { lesson_id: 'bahnar_09', title: 'Thức ăn & đồ uống', description: 'Cơm, nước, rau, thịt', order_index: 9, type: 'vocabulary', correct_answer: 'B', content: {} },
  { lesson_id: 'bahnar_10', title: 'Trong làng (địa điểm)', description: 'Nhà rông, nhà sàn, đường làng', order_index: 10, type: 'vocabulary', correct_answer: 'A', content: {} },
];

const SHOP_ITEMS = [
  { id: 'item_skin_1', name: 'Màu da truyền thống', price: 0, type: 'Màu da', metadata: { description: 'Mặc định' } },
  { id: 'item_skin_2', name: 'Màu da nâu đồng', price: 50, type: 'Màu da', metadata: { description: 'Sắc da nâu đồng' } },
  { id: 'item_skin_3', name: 'Màu da rừng', price: 80, type: 'Màu da', metadata: { description: 'Sắc da khỏe khoắn' } },
  { id: 'item_clothes_1', name: 'Áo Bahnar truyền thống', price: 120, type: 'Trang phục', metadata: { description: 'Áo thổ cẩm Bahnar' } },
  { id: 'item_clothes_2', name: 'Khố truyền thống', price: 100, type: 'Trang phục', metadata: { description: 'Trang phục nam truyền thống' } },
  { id: 'item_clothes_3', name: 'Váy thổ cẩm', price: 150, type: 'Trang phục', metadata: { description: 'Váy dệt hoa văn' } },
  { id: 'item_hair_1', name: 'Tóc dài truyền thống', price: 60, type: 'Tóc', metadata: { description: 'Kiểu tóc dài buông' } },
  { id: 'item_hair_2', name: 'Búi tóc đội khăn', price: 90, type: 'Tóc', metadata: { description: 'Búi tóc và khăn' } },
  { id: 'item_acc_1', name: 'Vòng tay đồng', price: 70, type: 'Phụ kiện', metadata: { description: 'Vòng tay truyền thống' } },
  { id: 'item_acc_2', name: 'Khăn đội đầu', price: 55, type: 'Phụ kiện', metadata: { description: 'Khăn thổ cẩm' } },
  { id: 'item_acc_3', name: 'Vòng cổ hạt cườm', price: 95, type: 'Phụ kiện', metadata: { description: 'Vòng cổ nhiều màu' } },
];

const DEMO_PROFILES = [
  { id: 'demo_student_01', username: 'Học viên Demo', email: 'demo1@bahnar.vn', role: 'student', level: 'A1', level_assigned: 'A1', xp: 45, sao_vang: 80, streak: 3, win_count: 1, inventory: ['item_skin_2'], equipped_items: { skin: 'item_skin_2' }, created_at: new Date().toISOString() },
  { id: 'demo_student_02', username: 'Người học Bahnar', email: 'demo2@bahnar.vn', role: 'student', level: 'A1', level_assigned: 'A1', xp: 20, sao_vang: 30, streak: 1, win_count: 0, inventory: [], equipped_items: { skin: 'item_skin_1' }, created_at: new Date().toISOString() },
];

const DEMO_PROGRESS = [
  { id: 'demo_student_01_bahnar_01', user_id: 'demo_student_01', lesson_id: 'bahnar_01', status: 'done', completed_at: new Date().toISOString() },
  { id: 'demo_student_01_bahnar_02', user_id: 'demo_student_01', lesson_id: 'bahnar_02', status: 'done', completed_at: new Date().toISOString() },
  { id: 'demo_student_01_bahnar_03', user_id: 'demo_student_01', lesson_id: 'bahnar_03', status: 'done', completed_at: new Date().toISOString() },
];

async function seed() {
  console.log('Seeding Bahnar demo data...\n');

  // 1. Lessons (ensure columns exist: run docs/supabase_add_lesson_columns.sql first)
  for (const row of LESSONS) {
    const { error } = await supabase.from('lessons').upsert({ ...row, updated_at: new Date().toISOString() }, { onConflict: 'lesson_id' });
    if (error) console.warn('Lesson', row.lesson_id, error.message);
    else console.log('  ✓ Lesson:', row.title);
  }

  // 2. Shop items
  for (const row of SHOP_ITEMS) {
    const { error } = await supabase.from('shop_items').upsert(row, { onConflict: 'id' });
    if (error) console.warn('Shop item', row.id, error.message);
    else console.log('  ✓ Shop:', row.name);
  }

  // 3. Demo profiles (optional; may conflict if you already have these IDs)
  for (const row of DEMO_PROFILES) {
    const { error } = await supabase.from('profiles').upsert(row, { onConflict: 'id' });
    if (error) console.warn('Profile', row.id, error.message);
    else console.log('  ✓ Profile:', row.username);
  }

  // 4. Demo progress for first user
  for (const row of DEMO_PROGRESS) {
    const { error } = await supabase.from('user_progress').upsert(row, { onConflict: 'id' });
    if (error) console.warn('Progress', row.id, error.message);
    else console.log('  ✓ Progress:', row.lesson_id, 'for', row.user_id);
  }

  console.log('\nDone. Open Supabase Table Editor to see lessons, shop_items, profiles, user_progress.');
}

seed().catch((e) => {
  console.error(e);
  process.exit(1);
});
