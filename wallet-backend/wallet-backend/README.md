# Wallet Backend

Node.js/Express backend for the digital wallet app. Bridges users to their bank accounts via [Basiq](https://basiq.io) (Australian open banking). Hosted on Render, talks to Supabase and Vercel.

## Architecture

```
Frontend (Vercel)
    │  JWT from Supabase Auth
    ▼
Backend (Render)  ─── Supabase (DB + Auth verification)
    │
    ▼
Basiq API (Australian open banking — reads bank balances & transactions)
```

The backend **never holds money**. It reads bank data on behalf of the user via Basiq, and stores only a reference (Basiq user ID) in your database.

---

## Setup

### 1. Supabase

1. Create a project at [supabase.com](https://supabase.com)
2. Go to **SQL Editor → New query** and run the contents of `supabase-schema.sql`
3. Go to **Settings → API** and copy:
   - `Project URL` → `SUPABASE_URL`
   - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY` (**keep secret**)

### 2. Basiq

1. Sign up at [basiq.io](https://basiq.io) and create an application
2. Copy your API key → `BASIQ_API_KEY`
3. During development, use the Basiq sandbox environment

### 3. Local development

```bash
cp .env.example .env
# Fill in your values in .env

npm install
npm run dev
# Server runs at http://localhost:3001
```

### 4. Deploy to Render

1. Push this folder to a GitHub repo
2. In Render: **New → Web Service** → connect your repo
3. Render auto-detects the `render.yaml` config
4. Add your environment variables in the Render dashboard (Settings → Environment)
5. Set `ALLOWED_ORIGINS` to your Vercel URL: `https://your-app.vercel.app`

---

## API Reference

### Auth
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/auth/register` | None | Create account |
| GET | `/api/auth/me` | JWT | Get current user |

### Users
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/users/profile` | JWT | Get full profile |
| PATCH | `/api/users/profile` | JWT | Update profile fields |

### Wallet (bank connection)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/wallet/connect` | JWT | Start bank linking — returns Basiq URL |
| GET | `/api/wallet/accounts` | JWT | List connected bank accounts |
| GET | `/api/wallet/summary` | JWT | Total balance across accounts |

### Transactions
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/transactions` | JWT | Transaction history (last 30 days by default) |
| GET | `/api/transactions/summary` | JWT | Spending by category |

#### Transaction query params
- `from` — YYYY-MM-DD
- `to` — YYYY-MM-DD
- `accountId` — filter to one account
- `limit` — max results (default 50, max 200)

### System
| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Health check (Render uses this) |

---

## Bank linking flow

```
1. User clicks "Connect bank" in your frontend
2. Frontend calls POST /api/wallet/connect
3. Backend creates a Basiq user, returns { connect_url }
4. Frontend redirects user to connect_url
5. User logs into their bank on Basiq's hosted UI
6. Basiq redirects back to your app (configure redirect URL in Basiq dashboard)
7. Bank is now connected — GET /api/wallet/accounts now returns data
```

---

## What's next

- **Payments**: Basiq supports payment initiation (NPP/PayID) — you can initiate a transfer from the user's bank without holding any funds yourself
- **Webhooks**: Basiq sends webhooks when new transactions arrive — add a `/api/webhooks/basiq` endpoint to handle these
- **Caching**: Cache Basiq responses in Supabase to reduce API calls and handle Basiq downtime gracefully
