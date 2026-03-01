-- Run in Supabase SQL Editor so LessonService can use lessons from DB (type, correct_answer).
alter table lessons
  add column if not exists type text,
  add column if not exists correct_answer text;
