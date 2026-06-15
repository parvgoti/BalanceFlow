# BalanceFlow 💰

> Smart Expense Sharing & Settlement Platform — built with React, TypeScript, Supabase, and Tailwind CSS.

[![CI/CD](https://github.com/parvgoti/BalanceFlow/actions/workflows/ci-cd.yml/badge.svg)](https://github.com/parvgoti/BalanceFlow/actions)

---

## ✨ Features

- **Expense Splitting** — Equal, percentage, or exact splits with flexible participant control
- **Debt Simplification** — Greedy algorithm minimizes the number of transactions needed
- **Real-time Updates** — Supabase Realtime broadcasts balance changes to all group members instantly
- **Multi-currency** — USD, EUR, GBP, INR, JPY, and more
- **Receipt Storage** — Upload and store expense receipts in Supabase Storage
- **Dark Mode** — Full dark/light/system theme support
- **Google OAuth** — One-click sign in with Google
- **Role-based Access** — Group admins and members with separate permissions
- **Charts & Analytics** — Category breakdowns, spending trends, balance charts

---

## 🗂 Project Structure

```
src/
├── components/
│   ├── ui/           # ShadCN-style primitives (Button, Input, Dialog, Card…)
│   ├── layout/       # Sidebar, TopBar, AppLayout, AuthLayout
│   ├── auth/         # Auth form components
│   ├── expenses/     # AddExpenseModal, ExpenseCard
│   ├── groups/       # GroupCard, CreateGroupModal
│   ├── settlements/  # SettleUpModal
│   ├── charts/       # Recharts wrappers
│   └── shared/       # CurrencyDisplay, CategoryIcon, Skeleton, EmptyState
├── hooks/            # useAuth, useGroups, useExpenses, useSettlements, useRealtime
├── lib/              # supabase.ts, queryClient.ts, utils.ts
├── pages/            # Route-level page components
├── store/            # Zustand: authStore, uiStore, notificationStore
├── schemas/          # Zod validation schemas
└── types/            # TypeScript types matching DB schema

supabase/
├── migrations/       # SQL schema, storage policies, views
└── functions/        # Edge functions: simplify-debts, send-notification
```

---

## 🚀 Quick Start

### 1. Prerequisites

- Node.js 18+
- A Supabase project ([supabase.com](https://supabase.com))

### 2. Clone & Install

```bash
git clone https://github.com/your-org/balanceflow.git
cd balanceflow
npm install
```

### 3. Configure Environment

```bash
cp .env.example .env.local
```

Edit `.env.local`:
```env
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_ANON_KEY
VITE_APP_URL=http://localhost:5173
```

Find these in your [Supabase Dashboard](https://app.supabase.com) → Project Settings → API.

### 4. Set Up Database

**Option A: Supabase CLI (recommended)**
```bash
npm install -g supabase
supabase login
supabase link --project-ref YOUR_PROJECT_REF
supabase db push
```

**Option B: Manual**
Copy and run `supabase/migrations/001_initial_schema.sql`, then `002_storage_policies.sql`, then `003_views.sql` in your Supabase SQL Editor.

### 5. Configure Storage

In Supabase Dashboard → Storage, create a bucket named **`receipts`** with:
- Public: **No** (private)
- Allowed MIME types: `image/jpeg, image/png, image/webp, application/pdf`
- Max upload size: 10 MB

### 6. Enable Google OAuth

In Supabase Dashboard → Auth → Providers → Google:
- Enable Google
- Add your Google Client ID and Secret
- Set Redirect URL to: `https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback`

### 7. Run Development Server

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173)

---

## 🗄 Database Schema

| Table | Description |
|-------|-------------|
| `profiles` | Extended user data (linked to `auth.users`) |
| `groups` | Expense-sharing groups |
| `group_members` | Users in groups with roles (admin/member) |
| `expenses` | Individual expenses with category, split type |
| `expense_splits` | Per-user share of each expense |
| `settlements` | Payment records between users |
| `notifications` | In-app notifications |

All tables have **Row-Level Security** enabled. Users can only access data from groups they belong to.

---

## ⚡ Edge Functions

Deploy with:
```bash
supabase functions deploy simplify-debts
supabase functions deploy send-notification
```

Set secrets:
```bash
supabase secrets set RESEND_API_KEY=re_...
supabase secrets set APP_URL=https://your-app.vercel.app
```

---

## 🧪 Testing

```bash
# Unit tests (Vitest + React Testing Library)
npm test

# Type checking
npx tsc --noEmit

# E2E tests (Playwright)
npx playwright test

# DB tests (pgTAP via Supabase CLI)
supabase test db
```

---

## 📦 Deployment

### Vercel (Frontend)

1. Push to GitHub
2. Import repo in [vercel.com](https://vercel.com)
3. Set environment variables:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_APP_URL`
4. Deploy — Vercel auto-builds on every push to `main`

### Supabase (Backend)

```bash
supabase db push          # Apply schema migrations
supabase functions deploy # Deploy Edge Functions
```

---

## 🔐 Security Checklist

- [x] Row-Level Security on all tables
- [x] RLS policies scoped to `auth.uid()` and group membership
- [x] Storage RLS — only owners and group members can access receipts
- [x] Zod validation on all form inputs
- [x] No secrets in client-side code (anon key is safe, service role is Edge Function only)
- [x] CSRF protection via Supabase Auth cookies
- [ ] Rate limiting via Upstash Redis in Edge Functions (recommended for production)

---

## 📜 License

MIT © BalanceFlow
