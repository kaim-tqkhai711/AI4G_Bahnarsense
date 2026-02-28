-- ==========================================
-- Ba Na Hoc - Seed Data for Local Development
-- ==========================================

-- Insert Mock Topics
INSERT INTO public.topics (id, title_vn, title_bana, theme_color, order_index)
VALUES 
  ('a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d', 'Giao tiếp cơ bản', 'Bơ tơ̆k đe đe', '#059669', 1), -- Primary Emerald
  ('d4c3b2a1-6f5e-b8a7-d0c9-d6c5b4a3f2e1', 'Gia đình & Bản thân', 'Nhơm kâu', '#F97316', 2)   -- Secondary Orange
ON CONFLICT (id) DO NOTHING;

-- Insert Mock Lessons for Topic 1 (Giao tiếp cơ bản)
-- Using predictable UUIDs for easy testing and foreign key relationships
INSERT INTO public.lessons (id, topic_id, type, difficulty, xp_reward, title, is_published)
VALUES 
  ('11111111-1111-1111-1111-111111111111', 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d', 'vocab', 1, 15, 'Chào hỏi hằng ngày', true),
  ('22222222-2222-2222-2222-222222222222', 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d', 'grammar', 2, 20, 'Đại từ nhân xưng', true),
  ('33333333-3333-3333-3333-333333333333', 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d', 'vocab', 3, 25, 'Hỏi thăm sức khỏe', true)
ON CONFLICT (id) DO NOTHING;

-- Insert Mock Lessons for Topic 2 (Gia đình & Bản thân)
INSERT INTO public.lessons (id, topic_id, type, difficulty, xp_reward, title, is_published)
VALUES 
  ('44444444-4444-4444-4444-444444444444', 'd4c3b2a1-6f5e-b8a7-d0c9-d6c5b4a3f2e1', 'vocab', 1, 15, 'Thành viên gia đình', true),
  ('55555555-5555-5555-5555-555555555555', 'd4c3b2a1-6f5e-b8a7-d0c9-d6c5b4a3f2e1', 'culture', 2, 30, 'Văn hóa mẫu hệ Ba Na', true)
ON CONFLICT (id) DO NOTHING;

-- (Optional) If you wanted to seed dummy users, you'd need to insert into `auth.users` directly, 
-- but normally you rely on the trigger working through the app's sign up flow. 
-- The Supabase local studio makes it easy to mock users.
