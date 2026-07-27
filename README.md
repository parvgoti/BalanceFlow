# BalanceFlow 💰

> **Smart Expense Sharing, Debt Simplification & Real-Time Settlement Platform** — built with React 18, TypeScript, Supabase, Tailwind CSS, and Recharts.

[![CI/CD](https://github.com/parvgoti/BalanceFlow/actions/workflows/ci-cd.yml/badge.svg)](https://github.com/parvgoti/BalanceFlow/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-emerald.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue.svg)](https://www.typescriptlang.org/)
[![Supabase](https://img.shields.io/badge/Supabase-Realtime%20%26%20RLS-3ECF8E.svg)](https://supabase.com)

BalanceFlow is a modern, full-stack web application designed to take the friction out of shared expenses. Whether splitting bills with roommates, tracking trip costs with friends, or managing team budgets, BalanceFlow combines intelligent debt simplification algorithms, real-time balance synchronization, and hybrid push/email notifications into a beautiful, responsive interface.

---

## ✨ Comprehensive Feature Showcase

### 1. 🧾 Intelligent Expense Splitting & Validation
- **Equal Splitting (`= Equal`)**: Automatically calculates and distributes costs evenly across all included group members.
- **Percentage Splitting (`% Pct`)**: Custom percentage allocations per member, with strict validation ensuring totals equal exactly `100%`.
- **Exact Currency Splitting (`$ Exact`)**:
  - Assign explicit currency amounts to each participant.
  - **Live Matching Validation Banner**: Displays a real-time summary indicator below the split options and above the receipt uploader (`e.g., 50.00 out of 100.00`).
  - **Color-Coded Status**: Automatically highlights in **Green** when the sum of entered splits matches the total expense amount, and in **Red** when unmatched, preventing calculation errors before submission.
- **Member Toggle**: Seamlessly include or exclude specific participants from any expense split with a single click.

### 2. 🧮 Automated Debt Simplification
- **Greedy Simplification Algorithm**: Evaluates all debts across the group and minimizes the total number of peer-to-peer transactions required to settle up.
- **Visual Debt Matrix**: Easily inspect "Who owes Whom" with clear, simplified payment cards and one-click settlement triggers.

### 3. 👥 Smart Group & Member Invitations
- **Intelligent Search Autocomplete (`UserSearchInput`)**: Look up existing BalanceFlow users by name or email with instant avatar and profile preview in both the **Create Group Modal** and **Group Settings**.
- **Hybrid Invitation Routing**:
  - **In-App & Push Notifications (Registered Users)**: Inviting an existing BalanceFlow user instantly triggers the Supabase `send-notification` Edge Function, delivering real-time in-app alerts and browser Web Push notifications.
  - **Grouped `mailto:` Email Fallback (Unregistered Users)**: When inviting email addresses not yet registered on BalanceFlow, the platform opens your default email client with a pre-populated invitation link and groups multiple recipients via `BCC`—sending one consolidated invite rather than cluttering your screen with individual email windows.

### 4. ⚡ Real-Time Synchronization & Web Push
- **Supabase Realtime Channels**: Live synchronization across all active sessions. Expense additions, edits, deletions, group balance changes, and settlements update instantly without refreshing the page.
- **Web Push Notifications**: Edge Function powered Web Push notifications (`web-push`) alert users when:
  - They are invited to join a group (`group_invite`).
  - A settlement payment request is sent or completed (`settleup_request`).
  - Important expense updates occur.
- **Interactive Notification Dropdown**: Read, dismiss, and accept group invitations directly from the navigation bar.

### 5. 📊 Visual Analytics & Spending Insights
- **Spending Trend Charts**: Interactive line charts tracking expense patterns over configurable intervals (`Weekly`, `Monthly`, `Yearly`).
- **Member Balance Bar Charts**: Recharts-powered comparative charts visualizing individual total spending versus net balance.
- **Category Breakdowns**: Categorize expenses (Food, Travel, Entertainment, Rent, Utilities, etc.) with dedicated iconography and curated color schemes.

### 6. 📎 Receipt Storage & Management
- **Supabase Storage Integration**: Attach receipt images (`JPG`, `PNG`, `WEBP`) or `PDF` invoices to any expense.
- **Private RLS Storage Policies**: Cryptographic Row-Level Security ensures receipts are accessible only by authenticated members of that specific group.
- **Inline Receipt Preview**: Inspect or download attached receipts directly from expense cards or the editing modal.

### 7. 🛡️ Enterprise-Grade Security & Authentication
- **Multi-Modal Authentication**: Supports standard Email/Password sign-up/login and **Google OAuth 2.0** single sign-on.
- **Row-Level Security (RLS)**: Every database table (`profiles`, `groups`, `group_members`, `expenses`, `expense_splits`, `settlements`, `notifications`) is protected by strict RLS policies scoped to `auth.uid()` and verified group membership.
- **Role-Based Group Access**: Group creators/admins have administrative permissions (managing members, resetting group test data, deleting groups) while standard members can add and settle expenses.

### 8. 🎨 Premium Design & UI/UX
- **Full Dark/Light/System Theme Mode**: Sleek dark mode with glassmorphic accents and high-contrast typography.
- **Responsive Mobile-First Architecture**: Seamless experience across mobile phones, tablets, and desktop viewports.

---

## 🗂 Project Architecture & Structure

```
src/
├── components/
│   ├── ui/           # ShadCN-style reusable primitives (Button, Input, Dialog, UserSearchInput…)
│   ├── layout/       # AppLayout, TopBar, Sidebar, NotificationsDropdown, AuthLayout
│   ├── auth/         # Login, Signup, and OAuth form components
│   ├── expenses/     # AddExpenseModal (with exact split validation), ExpenseCard
│   ├── groups/       # CreateGroupModal, GroupCard
│   ├── settlements/  # SettleUpModal
│   ├── charts/       # Recharts wrappers (SpendingTrendChart, BalanceBarChart)
│   └── shared/       # CurrencyDisplay, CategoryIcon, Skeleton loaders, EmptyState
├── hooks/            # useAuth, useGroups, useExpenses, useSettlements, useRealtime, useUserSearch
├── lib/              # supabase.ts, queryClient.ts, utils.ts (formatCurrency, cn)
├── pages/            # Route pages (Dashboard, GroupDetailPage, ActivityPage, SettingsPage)
├── store/            # Zustand global stores: authStore, uiStore, notificationStore
├── schemas/          # Zod validation schemas for strict type safety
└── types/            # TypeScript database schema interfaces
supabase/
├── migrations/       # SQL schema, RLS policies, views, triggers, and RPC functions
└── functions/        # Deno Edge Functions:
    ├── simplify-debts/      # Server-side debt simplification logic
    └── send-notification/   # Web Push & in-app notification dispatcher
```

---

## 🚀 Quick Start & Local Development

### 1. Prerequisites
- **Node.js** 18.x or later
- **npm** / **yarn** / **pnpm**
- A **Supabase** Project ([https://supabase.com](https://supabase.com))

### 2. Clone Repository & Install Dependencies
```bash
git clone https://github.com/parvgoti/BalanceFlow.git
cd BalanceFlow
npm install
```

### 3. Environment Variables Configuration
Copy the sample environment file:
```bash
cp .env.example .env.local
```

Edit `.env.local` with your Supabase Project credentials:
```env
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
VITE_APP_URL=http://localhost:5173
```
*(You can locate these under **Supabase Dashboard → Project Settings → API**).*

### 4. Start Development Server
```bash
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## 🗄️ Database Schema & Security Overview

| Table | Primary Purpose | Security Policy / RLS |
| :--- | :--- | :--- |
| `profiles` | User profile details (full name, avatar, push tokens) | Readable by authenticated users; writable by owner (`id = auth.uid()`) |
| `groups` | Expense groups (name, currency, description, created_by) | Accessible only by users in `group_members` for that group |
| `group_members` | Membership mappings and roles (`admin`, `member`) | Accessible only by members of the same group |
| `expenses` | Individual expenses (amount, category, date, receipt_url) | Accessible and writable only by members of the target group |
| `expense_splits` | Per-member expense breakdown (amount, percentage, included) | Scoped to parent group membership |
| `settlements` | Recorded payments settling balances between two members | Scoped to parent group membership |
| `notifications` | In-app alerts (`group_invite`, `settleup_request`, etc.) | Writable via Edge Functions/RPC; readable only by target `user_id` |

---

## ⚡ Supabase Edge Functions

BalanceFlow leverages Deno-powered Supabase Edge Functions for asynchronous server-side tasks:
- **`simplify-debts`**: Server-side greedy debt simplification calculation.
- **`send-notification`**: Web Push and in-app alert dispatcher for group invitations and settlement requests.

---

## 🧪 Testing & Verification

```bash
# Run unit tests (Vitest + React Testing Library)
npm test

# Run TypeScript type validation across the entire project
npx tsc --noEmit

# Build production bundle
npm run build
```

---

## 📦 Deployment Guide

### Frontend Deployment (Vercel)
1. Push your changes to your GitHub repository.
2. Import the repository into [Vercel](https://vercel.com).
3. Set the production environment variables (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_APP_URL`).
4. Deploy — Vercel will automatically build and publish whenever commits are pushed to `main`.

---

## 📜 License

Distributed under the **MIT License**. See `LICENSE` for more information.

---

*Built with passion by the BalanceFlow Team.*
