# Replacing Firestore with Something Editable by Many People

You have three practical options. All are "good" and "editable by many people" in different ways.

---

## Option 1: **Supabase** (recommended)

**What it is:** PostgreSQL in the cloud with a built-in **Table Editor** and **SQL Editor** in the dashboard. Your team can edit data like a spreadsheet, run SQL, or use the API.

**Why it fits "editable by many people":**
- Invite teammates in Supabase Dashboard → **Authentication** → **Users** (or use your org’s SSO).
- Everyone with access can:
  - Edit rows in the **Table Editor** (add/change/delete).
  - Run **SQL** for bulk updates or reports.
  - Use **Realtime** if you need live updates.
- You already have `@supabase/supabase-js` in the backend; you only need to add the **service role** client and point repositories at Supabase instead of Firestore.

**Migration outline:**
1. Create a Supabase project at [supabase.com](https://supabase.com).
2. Add tables that mirror your Firestore collections (see schema below).
3. In the backend: add `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` to config and a small `supabaseAdmin` client.
4. Replace each repository’s Firestore calls with Supabase client calls (select/insert/update/upsert; use RPC or raw SQL for transactions like purchase/streak recovery).
5. Keep **Firebase Auth** for now if your app uses it; the backend still receives Firebase ID tokens and uses `uid` as the user id in Supabase tables. Optionally move to Supabase Auth later.

**Pros:** Real database, SQL, dashboard editing, realtime, good for many editors.  
**Cons:** One-time migration of repositories and any existing Firestore data.

---

## Option 2: **Google Sheets or Airtable as source of truth**

**What it is:** Keep Firestore (or another DB) as the **cache**, but let content (lessons, shop items, etc.) be edited in **Sheets** or **Airtable**. You already have `POST /api/v1/cms/sync-lessons` (Sheets → backend); you extend this pattern.

**Why it fits "editable by many people":**
- Many people can edit the same Sheet or Airtable base (familiar UI, comments, history).
- Backend (or a cron job) periodically syncs Sheets/Airtable → Firestore or Supabase.

**What you do:**
- Add more sync endpoints (e.g. sync shop items, CMS pages) from Sheets/Airtable.
- Optionally replace Firestore with Supabase and sync **into** Supabase tables; editors still use Sheets/Airtable, and the app reads from Supabase.

**Pros:** Very easy for non-technical editors; no schema migration for them.  
**Cons:** Not ideal for high-frequency or realtime user data (profiles, progress); better for "content" (lessons, items). You can mix: content from Sheets, user data in Supabase.

---

## Option 3: **PostgreSQL + Prisma + Admin UI**

**What it is:** Use a PostgreSQL database (e.g. Supabase Postgres, or Neon, or local) with **Prisma** as the ORM. You already have `prisma.config.ts`; add a `schema.prisma` and run migrations. For "editable by many people," use **Prisma Studio** or a custom admin (e.g. React Admin, Retool).

**Why it fits "editable by many people":**
- Prisma Studio gives a simple table view; multiple people can run it (or you host a small admin app).
- Full control over schema and business logic.

**Pros:** Type-safe, migrations, any host.  
**Cons:** More setup than Supabase (you add and host an admin or rely on Prisma Studio).

---

## Recommended path: **Supabase**

- **Editable by many:** Dashboard (Table + SQL) with team access.
- **Good:** PostgreSQL, realtime, auth optional, fits your stack.
- **Concrete steps:** See below for schema and backend changes.

---

## Supabase migration: schema sketch

Create these in Supabase (**SQL Editor**) so your tables match current Firestore usage. You can refine types and constraints later.

```sql
-- Profiles (was: profiles collection)
create table profiles (
  id text primary key,
  username text,
  email text,
  role text default 'student',
  level text default 'A1',
  xp int default 0,
  gongs int default 0,
  sao_vang int default 0,
  gems int default 0,
  streak int default 0,
  inventory jsonb default '[]',
  equipped_items jsonb default '{"skin":"item_skin_2"}',
  streak_recovery_count int default 0,
  streak_recovery_month text,
  created_at timestamptz default now()
);

-- User progress (was: user_progress)
create table user_progress (
  id text primary key,
  user_id text not null references profiles(id),
  lesson_id text not null,
  status text default 'done',
  completed_at timestamptz,
  unique(user_id, lesson_id)
);

-- Lessons (was: lessons) – editable by many in Table Editor
create table lessons (
  lesson_id text primary key,
  title text,
  description text,
  content jsonb,
  order_index int,
  updated_at timestamptz default now()
);

-- Shop items – editable by many
create table shop_items (
  id text primary key,
  name text,
  price int,
  type text,
  metadata jsonb
);

-- Inventory (was: inventory collection)
create table inventory (
  id text primary key,
  user_id text not null references profiles(id),
  item_id text not null references shop_items(id),
  is_equipped boolean default true,
  category text,
  acquired_at timestamptz default now(),
  unique(user_id, item_id)
);

-- Transaction log
create table transaction_log (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  amount int,
  currency text,
  type text,
  metadata jsonb,
  created_at timestamptz default now()
);

-- Review cards (was: review_cards_{uid} per-user collections → one table)
create table review_cards (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  item_id text not null,
  error_count int default 1,
  next_review_date timestamptz,
  updated_at timestamptz default now()
);
create index idx_review_cards_user_due on review_cards(user_id, next_review_date);
```

Then in the backend you would:
- Add **config**: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`.
- Add **`src/utils/supabaseAdmin.ts`**: create Supabase client with service role key (so backend can bypass RLS).
- Replace **each repository**: `AuthRepository`, `LessonRepository`, `GameRepository`, `ReviewRepository`, `CmsService`, and socket code that uses `db` → use the Supabase client (and for transactions like purchase/streak recovery, use Supabase RPC or a small PL/pgSQL function).

---

## Summary

| Goal                         | Best option                          |
|-----------------------------|--------------------------------------|
| DB + dashboard many can edit | **Supabase** (Table Editor + SQL)    |
| Non-devs edit content only  | **Sheets/Airtable** + sync to backend |
| Full control + your admin   | **PostgreSQL + Prisma + admin UI**   |

If you tell me which option you want (e.g. "Supabase only" or "Sheets for lessons, Supabase for the rest"), I can outline the exact file-by-file steps or generate the Supabase client and one sample repository (e.g. `AuthRepository`) so you can mirror the pattern for the others.
