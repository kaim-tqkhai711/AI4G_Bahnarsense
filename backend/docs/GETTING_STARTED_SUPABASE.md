# Getting started with Supabase (step-by-step)

You’ve created your Supabase account. Follow these steps in order.

---

## Step 1: Create a new project

1. Go to [app.supabase.com](https://app.supabase.com) and sign in.
2. Click **“New project”**.
3. Choose your **Organization** (or create one).
4. Fill in:
   - **Name:** e.g. `bahnarsense` or `ba-na-hoc`.
   - **Database password:** create a strong password and **save it somewhere safe** (you need it for direct DB access).
   - **Region:** pick one close to your users.
5. Click **“Create new project”**. Wait 1–2 minutes until the project is ready.

---

## Step 2: Get your project URL and API keys

1. In the left sidebar, click **“Project Settings”** (gear icon at the bottom).
2. Open the **“API”** section.
3. You’ll see:
   - **Project URL** — e.g. `https://xxxxxxxxxxxx.supabase.co`  
     → This is your **`SUPABASE_URL`**.
   - **Project API keys:**
     - **anon public** — for frontend (optional; your backend can use the service role).
     - **service_role** — **secret**; only use on the backend, never in the browser.  
       → This is your **`SUPABASE_SERVICE_ROLE_KEY`**.

Copy the **Project URL** and the **service_role** key; you’ll put them in `.env` in Step 4.

---

## Step 3: Create the database tables

1. In the left sidebar, open **“SQL Editor”**.
2. Click **“New query”**.
3. Paste the entire SQL below into the editor.
4. Click **“Run”** (or press Ctrl+Enter). You should see “Success. No rows returned.”

```sql
-- Profiles (users)
create table if not exists profiles (
  id text primary key,
  username text,
  email text,
  role text default 'student',
  level text default 'A1',
  level_assigned text,
  learning_path jsonb,
  survey_completed boolean default false,
  xp int default 0,
  gongs int default 0,
  sao_vang int default 0,
  gems int default 0,
  streak int default 0,
  win_count int default 0,
  inventory jsonb default '[]',
  equipped_items jsonb default '{"skin":"item_skin_2"}',
  streak_recovery_count int default 0,
  streak_recovery_month text,
  created_at timestamptz default now(),
  updated_at timestamptz
);

-- User progress (lesson completion)
create table if not exists user_progress (
  id text primary key,
  user_id text not null,
  lesson_id text not null,
  status text default 'done',
  completed_at timestamptz,
  unique(user_id, lesson_id)
);

-- Lessons (content – editable by many in Table Editor)
create table if not exists lessons (
  lesson_id text primary key,
  title text,
  description text,
  content jsonb,
  order_index int,
  type text,
  correct_answer text,
  updated_at timestamptz default now()
);

-- Shop items – editable by many
create table if not exists shop_items (
  id text primary key,
  name text,
  price int,
  type text,
  metadata jsonb
);

-- Inventory (user items)
create table if not exists inventory (
  id text primary key,
  user_id text not null,
  item_id text not null,
  is_equipped boolean default true,
  category text,
  acquired_at timestamptz default now(),
  unique(user_id, item_id)
);

-- Transaction log (purchases, streak recovery, etc.)
create table if not exists transaction_log (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  amount int,
  currency text,
  type text,
  metadata jsonb,
  created_at timestamptz default now()
);

-- Review cards (spaced repetition)
create table if not exists review_cards (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  item_id text not null,
  error_count int default 1,
  next_review_date timestamptz,
  updated_at timestamptz default now()
);
create index if not exists idx_review_cards_user_due on review_cards(user_id, next_review_date);
```

5. In the left sidebar, open **“Table Editor”**. You should see: `profiles`, `user_progress`, `lessons`, `shop_items`, `inventory`, `transaction_log`, `review_cards`. You can add or edit rows here so many people can edit data.

---

## Step 4: Connect your backend with `.env`

1. In your project, go to the **backend** folder.
2. Copy `.env.example` to `.env` if you don’t have a `.env` yet:
   - Windows (PowerShell): `Copy-Item .env.example .env`
   - Or create a new file named `.env`.
3. Open `.env` and set:

```env
SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

Replace with your real **Project URL** and **service_role** key from Step 2.

4. Keep your other vars (e.g. `PORT`, `NODE_ENV`). If you still use Firebase for auth, keep `GOOGLE_APPLICATION_CREDENTIALS` or `FIREBASE_SERVICE_ACCOUNT_KEY` as well.

---

## Step 5: (Optional) Invite teammates so they can edit data

1. In Supabase, go to **“Project Settings”** → **“Team”** (or your organization’s team settings).
2. Invite people by email. They get access to the project.
3. They can use **Table Editor** and **SQL Editor** to add or change data — no code required.

---

## Step 6: Seed Bahnar demo data (optional)

(1) If `lessons` has no `type`/`correct_answer`, run **`docs/supabase_add_lesson_columns.sql`**. (2) Run **`npm run seed`** from the backend folder to insert 10 Bahnar lessons, 11 shop items, 2 demo profiles. (3) Restart backend and open the app.

**To see lessons on the frontend:** You must be **logged in** (Firebase). The app calls `GET /api/v1/lessons` with your token; the backend returns lessons from Supabase. If you see an empty list: (a) Log in again and refresh the Learn page. (b) In the browser DevTools → Application → Local Storage, remove the key **`api_cache_ziczac_lessons_cache`** and refresh, so the app fetches fresh data from the API.

---

## What’s next?

- **Seed demo data:** run **`npm run seed`** in the backend folder to add Bahnar lessons and shop items (see Step 6 above).
- **If you already created tables with an older schema:** run **`docs/supabase_add_profile_columns.sql`** and **`docs/supabase_add_lesson_columns.sql`** in the SQL Editor.

---

**Auth:** The app uses **Supabase Auth** (no Firebase). In Supabase: **Authentication** → **Providers** → enable **Google** (and **Email** if you use email/password). In **Project Settings** → **API** copy the **JWT Secret** into backend `.env` as **`SUPABASE_JWT_SECRET`**. In the frontend `.env` set **`VITE_SUPABASE_URL`** and **`VITE_SUPABASE_ANON_KEY`** (same project, anon key from API settings).
