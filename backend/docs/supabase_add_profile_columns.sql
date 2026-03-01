-- Run this in Supabase SQL Editor if you already created tables and need columns for matchmaking/survey/win_count.
-- Adds: level_assigned, learning_path, survey_completed, updated_at, win_count to profiles.

alter table profiles
  add column if not exists level_assigned text,
  add column if not exists learning_path jsonb,
  add column if not exists survey_completed boolean default false,
  add column if not exists updated_at timestamptz,
  add column if not exists win_count int default 0;

-- Backfill level_assigned from level where null
update profiles set level_assigned = level where level_assigned is null;
