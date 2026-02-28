-- ==========================================
-- Ba Na Hoc - Auth Trigger & Automation
-- ==========================================

-- Function to handle new user sign ups from Supabase Auth
-- This ensures every user in auth.users gets a corresponding profile row automatically
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (
    id, 
    username, 
    avatar_url,
    level,
    xp,
    gongs,
    gems,
    streak
  )
  VALUES (
    NEW.id,
    -- Attempt to get a username from metadata, or fallback to email prefix, or gen a random string
    COALESCE(
      NEW.raw_user_meta_data->>'user_name',
      NEW.raw_user_meta_data->>'full_name',
      SPLIT_PART(NEW.email, '@', 1),
      'bana_learner_' || substr(md5(random()::text), 1, 6)
    ),
    COALESCE(
      NEW.raw_user_meta_data->>'avatar_url',
      'https://api.dicebear.com/7.x/notionists/svg?seed=' || NEW.id
    ),
    1, -- Default level
    0, -- Default xp
    0, -- Default gongs
    0, -- Default gems
    0  -- Default streak
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
-- `SECURITY DEFINER` is crucial here so the trigger runs with elevated privileges
-- allowing it to insert into the public.profiles table even if the user isn't fully authenticated yet.

-- Create the trigger on the auth.users table
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ==========================================
-- Automation: Level Up Logic (Optional stub)
-- ==========================================
-- This is a simple example of how XP updates could trigger a level up. 
-- For a real app, this might be handled via application logic or a more complex trigger.

CREATE OR REPLACE FUNCTION public.check_level_up()
RETURNS trigger AS $$
BEGIN
  -- Simple formula: Every 1000 XP is a level. 
  -- Example: 1500 XP = Floor(1500/1000) + 1 = Level 2
  IF NEW.xp IS DISTINCT FROM OLD.xp THEN
    NEW.level := FLOOR(NEW.xp / 1000) + 1;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_check_level_up
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.check_level_up();
