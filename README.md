# Cove — Digital Wallet

A full-stack peer-to-peer digital wallet with real bank data via Basiq, user authentication on Supabase, and a slick dark-mode React frontend.

```
wallet/
├── backend/      Express API (Node.js)
└── frontend/     React + Vite UI
```

---

## Architecture

```
Browser (React)
    │  JWT in localStorage
    ▼
Backend (Express)            — only layer that ever touches Supabase / Basiq
    ├── Supabase (Postgres)  — users, transactions, balances
    └── Basiq API            — bank data & consent flow
```

The frontend **never** holds a Basiq user ID, Basiq API key, or Supabase key. All sensitive operations go through the backend.

---

## Prerequisites

- Node.js 18+
- A [Supabase](https://supabase.com) project
- A [Basiq](https://basiq.io) account (Australian open-banking API)

---

## 1 — Supabase setup

1. Create a new Supabase project.
2. In the SQL editor, run the contents of `backend/supabase-schema.sql`.
3. Copy your **Project URL** and **service_role** key (Settings → API).

---

## 2 — Basiq setup

1. Sign up at [dashboard.basiq.io](https://dashboard.basiq.io).
2. Create an application and grab the **API key**.
3. Make sure your app is configured for the **Australia** region (`au-api.basiq.io`).

---

## 3 — Backend

```bash
cd backend
cp .env.example .env
# Fill in SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, JWT_SECRET, BASIQ_API_KEY
npm install
npm run dev        # starts on :4000
```

### API routes

| Method | Path | Description |
|--------|------|-------------|
| POST | /api/auth/register | Create account + Basiq user |
| POST | /api/auth/login | Login, returns JWT |
| GET | /api/auth/me | Fetch current user |
| GET | /api/bank/link-token | Get Basiq consent URL |
| POST | /api/bank/confirm | Confirm bank connected |
| GET | /api/bank/accounts | List linked accounts |
| POST | /api/bank/refresh | Sync latest balances |
| POST | /api/transactions/pay | Send money to user |
| POST | /api/transactions/request | Request money from user |
| POST | /api/transactions/request/:id/accept | Accept a money request |
| POST | /api/transactions/request/:id/decline | Decline a money request |
| GET | /api/transactions/history | Full transaction history |
| GET | /api/users/search?q= | Search users by username |

---

## 4 — Frontend

```bash
cd frontend
cp .env.example .env
# VITE_API_URL=http://localhost:4000  (or leave blank — Vite proxies /api)
npm install
npm run dev        # starts on :5173
```

The Vite dev server proxies `/api/*` → `http://localhost:4000` so you don't need to touch CORS in development.

---

## User flow

1. **Register** — name, email, phone, username, password
2. **Connect bank** — backend generates a Basiq auth link; user completes consent in a popup; backend verifies and stores `bank_connected = true`
3. **Dashboard** — see balance, send money, request money, view history
4. **History entries** look like:
   - `You paid @alex $12.50`
   - `You received from @sam` `+$50.00`
   - `You requested $8.00 from @riley` (pending)

---

## Security notes

- Passwords are hashed with bcrypt (12 rounds).
- JWTs expire in 7 days.
- The backend uses the Supabase **service role** key — never expose it to the client.
- Basiq credentials never leave the backend.
- RLS is enabled on all Supabase tables as a defence-in-depth measure.

---

## Production checklist

- [ ] Set `JWT_SECRET` to a long random string
- [ ] Set `FRONTEND_URL` in backend `.env` to your deployed frontend domain
- [ ] Set `VITE_API_URL` in frontend `.env` to your deployed backend URL
- [ ] Enable HTTPS on both services
- [ ] Review Supabase RLS policies for direct DB access scenarios
