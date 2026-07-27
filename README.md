<div align="center">

# 💰 BalanceFlow

### Smart Expense Sharing · Debt Simplification · Real-Time Settlements

*Split bills effortlessly. Settle debts intelligently. Stay in sync — always.*

[![CI/CD](https://github.com/parvgoti/BalanceFlow/actions/workflows/ci-cd.yml/badge.svg)](https://github.com/parvgoti/BalanceFlow/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-22c55e.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-6.0-3178C6.svg?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB.svg?logo=react&logoColor=black)](https://react.dev/)
[![Supabase](https://img.shields.io/badge/Supabase-Realtime%20%2B%20RLS-3ECF8E.svg?logo=supabase&logoColor=white)](https://supabase.com)
[![Vite](https://img.shields.io/badge/Vite-8.0-646CFF.svg?logo=vite&logoColor=white)](https://vitejs.dev/)

</div>

---

## 🚀 What is BalanceFlow?

BalanceFlow is a **production-grade**, full-stack web application that eliminates the friction of shared expenses. Whether you're splitting rent with roommates, tracking a group trip, or managing team budgets — BalanceFlow combines **intelligent debt simplification**, **real-time synchronization**, and a **beautifully crafted mobile-first UI** into one seamless platform.

> Built with **React 19** · **TypeScript 6** · **Supabase** · **Tailwind CSS** · **Zustand** · **React Query** · **Recharts**

---

## ✨ Features at a Glance

<table>
<tr>
<td width="50%">

### 🧾 Smart Expense Splitting
- **Equal** — auto-distributes costs evenly
- **Percentage** — custom % per member (validated to 100%)
- **Exact** — assign precise amounts with a **live color-coded validation banner**:
  - 🟢 **Green** when splits match the total
  - 🔴 **Red** when amounts don't add up
- Toggle individual members in/out with one click

</td>
<td width="50%">

### 🧮 Debt Simplification Engine
- **Greedy algorithm** minimizes total peer-to-peer transactions
- Powered by **Supabase Edge Functions** (Deno runtime)
- Visual **"Who Owes Whom"** matrix with one-click settlements
- Handles complex multi-member debt chains automatically

</td>
</tr>
<tr>
<td width="50%">

### 👥 Intelligent Member Invitations
- **Search autocomplete** — find existing users by name or email with instant avatar preview
- **Registered users** → in-app + Web Push notification
- **Unregistered users** → grouped `mailto:` email with pre-filled invite link (BCC-consolidated)
- Works in both **Create Group** and **Group Settings**

</td>
<td width="50%">

### ⚡ Real-Time Everything
- **Supabase Realtime Channels** — expenses, balances, and settlements sync instantly across all sessions
- **Web Push Notifications** — group invites, settlement requests, and expense alerts
- **Interactive Notification Dropdown** — read, dismiss, or accept invitations inline

</td>
</tr>
<tr>
<td width="50%">

### 📊 Visual Analytics & Insights
- **Spending Trend Charts** — Weekly / Monthly / Yearly line charts
- **Member Contribution Bars** — compare spending across the group
- **Category Breakdowns** — Food, Travel, Rent, Utilities, Entertainment with color-coded icons

</td>
<td width="50%">

### 🛡️ Enterprise-Grade Security
- **Row-Level Security (RLS)** on every table — scoped to `auth.uid()` + group membership
- **Google OAuth 2.0** + Email/Password authentication
- **Role-Based Access** — Admins manage members and settings; Members add and settle expenses
- **Private Receipt Storage** — RLS-protected Supabase Storage bucket

</td>
</tr>
</table>

---

## 🎨 Design & UI

<table>
<tr>
<td align="center"><strong>Mobile-First Dashboard</strong></td>
<td align="center"><strong>Group Expense Feed</strong></td>
<td align="center"><strong>Add Expense Modal</strong></td>
<td align="center"><strong>Analytics View</strong></td>
</tr>
<tr>
<td align="center">Green hero balance card<br/>Owed/Owe summary<br/>Quick action buttons</td>
<td align="center">INR ₹ currency tag<br/>Avatar stack + Invite<br/>Full-width CTA</td>
<td align="center">Gradient amount section<br/>Split method selector<br/>✓/⚠ Validation banner</td>
<td align="center">Monthly spending hero<br/>Trend line charts<br/>Member contribution bars</td>
</tr>
</table>

**Design Highlights:**
- 🌗 **Dark / Light / System** theme with glassmorphic sidebar
- 📱 **Mobile Bottom Navigation** — 4-tab bar with animated active states
- 🖥️ **Desktop Sidebar** — collapsible glass panel with full navigation
- ✨ **Micro-animations** — hover effects, skeleton loaders, smooth transitions
- 🔤 **Premium Typography** — Inter (UI) + Playfair Display (logo wordmark)

---

## 🏗️ Tech Stack

| Layer | Technology | Purpose |
|:---|:---|:---|
| **Frontend** | React 19, TypeScript 6, Vite 8 | UI framework, type safety, blazing-fast dev server |
| **Styling** | Tailwind CSS 3.4, CVA, Radix UI | Utility-first CSS, component variants, accessible primitives |
| **State** | Zustand 5, React Query 5 | Global state (auth, UI, notifications), server state + caching |
| **Forms** | React Hook Form 7, Zod 4 | Performant forms with schema-based validation |
| **Charts** | Recharts 3 | Interactive data visualization |
| **Backend** | Supabase (PostgreSQL, Auth, Storage, Realtime, Edge Functions) | Full BaaS with RLS, real-time subscriptions, Deno serverless |
| **Routing** | React Router 7 | Client-side navigation with protected routes |
| **Icons** | Lucide React | Consistent, tree-shakeable icon library |

---

## 🗂️ Project Structure

```
src/
├── components/
│   ├── ui/             # Radix-based primitives (Button, Dialog, Input, Avatar, Tabs…)
│   ├── layout/         # AppLayout, TopBar, Sidebar, BottomNav, NotificationsDropdown
│   ├── expenses/       # AddExpenseModal (with split validation), ExpenseCard
│   ├── groups/         # CreateGroupModal, GroupCard
│   ├── settlements/    # SettleUpModal
│   ├── charts/         # SpendingTrendChart, BalanceBarChart, TopCategoriesList
│   └── shared/         # CurrencyDisplay, CategoryIcon, Skeleton, NotificationBell
├── hooks/              # useAuth, useGroups, useExpenses, useSettlements, useRealtime
├── lib/                # supabase.ts, queryClient.ts, utils.ts
├── pages/              # DashboardPage, GroupDetailPage, ActivityPage, SettingsPage
├── store/              # Zustand stores (authStore, uiStore, notificationStore)
├── schemas/            # Zod validation schemas
└── types/              # TypeScript database interfaces

supabase/
├── migrations/         # SQL schema, RLS policies, views, triggers, RPC functions
└── functions/
    ├── simplify-debts/       # Greedy debt simplification (Deno)
    └── send-notification/    # Web Push + in-app notification dispatcher (Deno)
```

---

## 🗄️ Database Architecture

| Table | Purpose | RLS Policy |
|:---|:---|:---|
| `profiles` | User details (name, avatar, push tokens) | Read: all authenticated · Write: owner only |
| `groups` | Expense groups (name, currency, created_by) | Members of `group_members` only |
| `group_members` | Membership + roles (`admin` / `member`) | Same-group members only |
| `expenses` | Individual expenses (amount, category, receipt) | Group members only |
| `expense_splits` | Per-member breakdown (amount, %, included) | Parent group membership |
| `settlements` | Recorded payments between members | Parent group membership |
| `notifications` | In-app alerts (invites, settlement requests) | Target `user_id` only |

---

## ⚡ Edge Functions

| Function | Runtime | Purpose |
|:---|:---|:---|
| `simplify-debts` | Deno | Server-side greedy debt simplification across all group balances |
| `send-notification` | Deno | Web Push + in-app notification dispatcher for invites & settlements |

---

## 📜 License

Distributed under the **MIT License**. See [`LICENSE`](LICENSE) for details.

---

<div align="center">

**Built with ❤️ by [Parv Goti](https://github.com/parvgoti)**

*If you find BalanceFlow useful, consider giving it a ⭐ on GitHub!*

</div>
