# Adding real data to the backend

The backend uses **Firebase Firestore** as the database (not SQL). To use real data:

---

## 1. Create a Firebase project and Firestore

1. Go to [Firebase Console](https://console.firebase.google.com/) and create a project (or use an existing one).
2. Enable **Firestore Database** (Create database → start in test or production mode).
3. (Optional) Enable **Authentication** (e.g. Email/Password or Google) if the app uses it.

---

## 2. Get a service account key

1. In Firebase Console: **Project settings** (gear) → **Service accounts**.
2. Click **Generate new private key** and download the JSON file.
3. Put the file somewhere safe (e.g. `backend/keys/firebase-service-account.json` – **do not commit it to git**).

---

## 3. Point the backend at Firebase

In the backend folder, create a `.env` file (see `.env.example`).

**Option A – use the key file path**

```env
GOOGLE_APPLICATION_CREDENTIALS=./keys/firebase-service-account.json
```

**Option B – use JSON in env (single line, no line breaks)**

```env
FIREBASE_SERVICE_ACCOUNT_KEY={"type":"service_account","project_id":"your-project-id",...}
```

Restart the backend (`npm run dev`). It will now read/write real data in your Firestore.

---

## 4. Firestore collections used by the app

| Collection            | Purpose |
|----------------------|--------|
| `profiles`           | User profiles (uid, email, xp, sao_vang, streak, etc.) |
| `user_progress`      | Lesson progress per user (`{uid}_{lessonId}`) |
| `lessons`            | Lesson content (synced via CMS) |
| `shop_items`         | Shop items (id, price, name, …) |
| `inventory`          | User inventory (`{userId}_{itemId}`) |
| `transaction_log`    | Purchase history |
| `review_cards_{uid}`  | Review cards per user |

---

## 5. How to add real data

### A. Firebase Console (manual)

- Open [Firestore in Firebase Console](https://console.firebase.google.com/) → your project → **Firestore Database**.
- Create collections and documents by hand (e.g. `lessons`, `shop_items`, `profiles`).
- Use the same field names and structure as the code (see `AuthRepository`, `CmsService`, `LessonRepository`, `GameRepository`).

### B. Sync lessons from Google Sheets (CMS)

- The backend has **POST /api/v1/cms/sync-lessons**.
- Send a JSON body: `{ "data": [ { "lesson_id": "lesson_1", ... }, ... ] }`.
- Header: `X-CMS-SECRET: bahnarsense-super-secret-google-sheets`.
- This writes/updates documents in the `lessons` collection (see `CmsService.syncLessons`).
- You can call this from Google Apps Script or any HTTP client (Postman, curl).

### C. Let the app create data

- **Profiles**: when a user signs in, the auth flow creates a document in `profiles` (see `AuthRepository.createProfile`).
- **Progress, inventory, review cards**: created when users complete lessons, buy items, or use review.

### D. Seed script (optional)

- You can add a script (e.g. `scripts/seed.ts`) that uses `db` from `@/utils/firebaseAdmin` to create initial `lessons` and `shop_items` documents.
- Run it once with `npx ts-node -r tsconfig-paths/register scripts/seed.ts` (after setting `.env`).

---

## 6. Quick checklist

- [ ] Firebase project created and Firestore enabled  
- [ ] Service account JSON downloaded and path (or key) set in `.env`  
- [ ] Backend restarted and no Firebase errors in logs  
- [ ] Add data via Console, CMS sync, or seed script  
- [ ] Use the app; it will read/write real data from Firestore  
