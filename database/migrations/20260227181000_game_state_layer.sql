-- ==========================================
-- Ba Na Hoc - Game State Layer (Domain C)
-- ==========================================
-- 1. Matches (PVP Support)
-- 2. User Progress
-- 3. RPC: complete_lesson

CREATE TYPE match_status AS ENUM ('pending', 'active', 'finished', 'cancelled');
CREATE TYPE progress_status AS ENUM ('started', 'completed');

-- ==========================================
-- TABLE: matches (For synchronous PVP / Realtime)
-- ==========================================
CREATE TABLE public.matches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    player1_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    player2_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    status match_status NOT NULL DEFAULT 'pending',
    winner_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index to quickly find active matches for a user
CREATE INDEX idx_matches_p1 ON public.matches(player1_id);
CREATE INDEX idx_matches_p2 ON public.matches(player2_id);

CREATE TRIGGER set_matches_updated_at
BEFORE UPDATE ON public.matches
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;
-- Both players can read the match state
CREATE POLICY "Players can view their matches."
    ON public.matches FOR SELECT
    USING (auth.uid() = player1_id OR auth.uid() = player2_id);

-- Enable Supabase Realtime for this table
ALTER PUBLICATION supabase_realtime ADD TABLE public.matches;

-- ==========================================
-- TABLE: user_progress
-- Learning state and score tracking
-- ==========================================
CREATE TABLE public.user_progress (
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    lesson_id UUID NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
    status progress_status NOT NULL DEFAULT 'started',
    best_score INT NOT NULL DEFAULT 0 CHECK (best_score >= 0 AND best_score <= 100),
    completed_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- A user can only have one progress record per lesson
    PRIMARY KEY (user_id, lesson_id)
);

CREATE TRIGGER set_user_progress_updated_at
BEFORE UPDATE ON public.user_progress
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE public.user_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own progress."
    ON public.user_progress FOR SELECT
    USING (auth.uid() = user_id);
-- Insert/Update should ideally go through RPC below.

-- ==========================================
-- FUNCTION: complete_lesson
-- Secure calculation of XP and Gongs without trusting client values
-- ==========================================
CREATE OR REPLACE FUNCTION public.complete_lesson(p_user_id UUID, p_lesson_id UUID, p_score INT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_lesson RECORD;
    v_earned_xp INT := 0;
    v_earned_gongs INT := 0;
    v_previous_score INT := 0;
    v_is_first_completion BOOLEAN := false;
BEGIN
    -- Validate Score Constraint
    IF p_score < 0 OR p_score > 100 THEN
        RAISE EXCEPTION 'Invalid score. Must be between 0 and 100.';
    END IF;

    -- 1. Verify Lesson Exists & Fetch Base Rewards
    SELECT * INTO v_lesson FROM public.lessons WHERE id = p_lesson_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Lesson not found.';
    END IF;

    -- 2. Check Previous Progress
    SELECT best_score INTO v_previous_score 
    FROM public.user_progress 
    WHERE user_id = p_user_id AND lesson_id = p_lesson_id;

    IF NOT FOUND THEN
        v_is_first_completion := true;
    ELSIF p_score <= v_previous_score THEN
        -- If score didn't improve, maybe don't give base rewards again, 
        -- but we still UPSERT the updated_at timestamp below.
        -- For this logic, we only reward for First Completions or High Score beats.
        v_earned_xp := 0;
        v_earned_gongs := 0;
    END IF;

    -- 3. Calculate Rewards (Only if improved or first run)
    IF v_is_first_completion OR p_score > v_previous_score THEN
        -- Base Logic: XP is base * (score/100). Gongs is 1 for every 20 score points.
        v_earned_xp := ROUND(v_lesson.xp_reward * (p_score::numeric / 100.0));
        v_earned_gongs := FLOOR(p_score / 20.0);
    END IF;

    -- 4. Upsert Progress securely
    INSERT INTO public.user_progress (user_id, lesson_id, status, best_score, completed_at)
    VALUES (p_user_id, p_lesson_id, 'completed', p_score, NOW())
    ON CONFLICT (user_id, lesson_id) 
    DO UPDATE SET 
        best_score = GREATEST(public.user_progress.best_score, EXCLUDED.best_score),
        status = 'completed',
        completed_at = COALESCE(public.user_progress.completed_at, EXCLUDED.completed_at),
        updated_at = NOW();

    -- 5. Atomic Update to User Profile if rewards earned
    IF v_earned_xp > 0 OR v_earned_gongs > 0 THEN
        UPDATE public.profiles
        SET 
            xp = xp + v_earned_xp,
            gongs = gongs + v_earned_gongs,
            last_study_date = NOW()
        WHERE id = p_user_id;
        
        -- Log the reward
        INSERT INTO public.transaction_log (user_id, amount, currency, type, metadata)
        VALUES (
            p_user_id, 
            v_earned_gongs, 
            'gongs', 
            'lesson_reward', 
            jsonb_build_object('lesson_id', p_lesson_id, 'score', p_score)
        );
    END IF;

    -- The trigger `trigger_check_level_up` on `profiles` (created in prior migrations) 
    -- will automatically intercept this UPDATE and recalculate the level if needed!

    -- Return what was earned so the client can show a fancy animation UI
    RETURN jsonb_build_object(
        'success', true,
        'new_high_score', (v_is_first_completion OR p_score > v_previous_score),
        'earned_xp', v_earned_xp,
        'earned_gongs', v_earned_gongs
    );
END;
$$;
