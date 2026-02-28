-- ==========================================
-- Ba Na Hoc (Learn Bahnar) - Initial Schema
-- ==========================================
-- Optimized from a Senior Dev perspective:
-- 1. UUIDs used for all Primary Keys to prevent ID guessing and support distributed generation.
-- 2. `TIMESTAMPTZ` for timezone-aware timestamps.
-- 3. Enum types for strict data integrity instead of loosely typed strings.
-- 4. Reusable trigger for `updated_at`.
-- 5. Strict CHECK constraints for business logic constraints (XP >= 0 laws, etc)

-- Enums
CREATE TYPE user_role AS ENUM ('student', 'admin');
CREATE TYPE lesson_type AS ENUM ('vocab', 'grammar', 'culture');

-- Reusable function to automatically update `updated_at` timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ==========================================
-- TABLE: profiles
-- Extends auth.users (1:1 relationship)
-- ==========================================
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    username TEXT UNIQUE NOT NULL CHECK (char_length(username) >= 3),
    avatar_url TEXT,
    role user_role NOT NULL DEFAULT 'student'::user_role,
    
    -- Gamification Stats
    level INT NOT NULL DEFAULT 1 CHECK (level >= 1),
    xp INT NOT NULL DEFAULT 0 CHECK (xp >= 0),
    gongs INT NOT NULL DEFAULT 0 CHECK (gongs >= 0),
    gems INT NOT NULL DEFAULT 0 CHECK (gems >= 0),
    streak INT NOT NULL DEFAULT 0 CHECK (streak >= 0),
    last_study_date TIMESTAMPTZ,
    
    -- Metadata
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Trigger for `updated_at`
CREATE TRIGGER set_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Note: Policies will be defined completely in a later migration, 
-- but outlining the specific User-self access requirement initially:
CREATE POLICY "Users can view their own profile."
    ON public.profiles FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile."
    ON public.profiles FOR UPDATE
    USING (auth.uid() = id);


-- ==========================================
-- TABLE: topics
-- Representing the chapters/themes of lessons
-- ==========================================
CREATE TABLE public.topics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title_vn TEXT NOT NULL,
    title_bana TEXT NOT NULL,
    -- Strictly format theme color to HEX code
    theme_color TEXT NOT NULL CHECK (theme_color ~ '^#[0-9a-fA-F]{6}$'),
    order_index INT NOT NULL DEFAULT 0,
    
    -- Metadata
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Trigger for `updated_at`
CREATE TRIGGER set_topics_updated_at
BEFORE UPDATE ON public.topics
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (RLS)
ALTER TABLE public.topics ENABLE ROW LEVEL SECURITY;

-- Public Read allowed as defined in specs
CREATE POLICY "Public can view topics."
    ON public.topics FOR SELECT
    USING (true);


-- ==========================================
-- TABLE: lessons
-- Individual learning modules attached to topics
-- ==========================================
CREATE TABLE public.lessons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    topic_id UUID NOT NULL REFERENCES public.topics(id) ON DELETE CASCADE,
    type lesson_type NOT NULL,
    -- Limit difficulty scale
    difficulty INT NOT NULL CHECK (difficulty BETWEEN 1 AND 5),
    xp_reward INT NOT NULL DEFAULT 10 CHECK (xp_reward > 0),
    
    -- Additional logical fields
    title TEXT NOT NULL,
    is_published BOOLEAN NOT NULL DEFAULT false, -- Useful for draft lessons!
    
    -- Metadata
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for scaling performance
CREATE INDEX idx_lessons_topic_id ON public.lessons(topic_id);

-- Trigger for `updated_at`
CREATE TRIGGER set_lessons_updated_at
BEFORE UPDATE ON public.lessons
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (RLS)
ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;

-- Public Read allowed as defined in specs
CREATE POLICY "Public can view lessons."
    ON public.lessons FOR SELECT
    USING (true);
