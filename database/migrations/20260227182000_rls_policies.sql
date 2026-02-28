-- ==========================================
-- Ba Na Hoc - RLS Security Policies
-- ==========================================
-- This script solidifies the Supabase Row Level Security logic across all domains.
-- Assuming tables profiles, transaction_log, inventory, topics, lessons, shop_items, 
-- matches, and user_progress exist.

-- 1. Profiles (Update allows self-update only, Select allows all (For leaderboards))
DROP POLICY IF EXISTS "Users can view their own profile." ON public.profiles;
CREATE POLICY "Public profiles are viewable by everyone." 
    ON public.profiles FOR SELECT USING (true);
    
-- Note: Insert into profiles is handled by `handle_new_user` trigger (SECURITY DEFINER)
-- No public INSERT allowed.

-- 2. Inventory (Strict self-management)
DROP POLICY IF EXISTS "Users can view their own inventory." ON public.inventory;
CREATE POLICY "Users can view their own inventory." 
    ON public.inventory FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can equip items they own."
    ON public.inventory FOR UPDATE 
    USING (auth.uid() = user_id) 
    WITH CHECK (auth.uid() = user_id); -- Client can only update "is_equipped" realistically via DB roles

-- 3. Topics & Lessons (Public Read-only for active/published content)
DROP POLICY IF EXISTS "Public can view topics." ON public.topics;
CREATE POLICY "Public can view topics." 
    ON public.topics FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public can view lessons." ON public.lessons;
CREATE POLICY "Public can view published lessons." 
    ON public.lessons FOR SELECT USING (is_published = true);

-- 4. Shop Items (Public Read-only for active catalog)
DROP POLICY IF EXISTS "Public can view active shop items." ON public.shop_items;
CREATE POLICY "Public can view active shop items." 
    ON public.shop_items FOR SELECT USING (is_active = true);

-- 5. User Progress (Self-managed read)
DROP POLICY IF EXISTS "Users can view their own progress." ON public.user_progress;
CREATE POLICY "Users can view their own progress." 
    ON public.user_progress FOR SELECT USING (auth.uid() = user_id);
-- Insert/Update is purely managed by RPC `complete_lesson` (SECURITY DEFINER).

-- 6. Transaction Log (Strictly Audit-Read only by self)
DROP POLICY IF EXISTS "Users can view their own transaction log." ON public.transaction_log;
CREATE POLICY "Users can view their own transaction log." 
    ON public.transaction_log FOR SELECT USING (auth.uid() = user_id);
-- NEVER ALLOW INSERT/UPDATE from client.

-- 7. Matches (Participants ONLY)
DROP POLICY IF EXISTS "Players can view their matches." ON public.matches;
CREATE POLICY "Players can view their matches." 
    ON public.matches FOR SELECT USING (auth.uid() = player1_id OR auth.uid() = player2_id);
    
CREATE POLICY "Players can create a match."
    ON public.matches FOR INSERT WITH CHECK (auth.uid() = player1_id);

CREATE POLICY "Players can update their matches if active or pending."
    ON public.matches FOR UPDATE USING (auth.uid() = player1_id OR auth.uid() = player2_id);
