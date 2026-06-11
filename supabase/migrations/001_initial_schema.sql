-- ============================================================
-- BalanceFlow Database Schema
-- Run this in Supabase SQL Editor or via CLI migration
-- ============================================================

-- ── Extensions ───────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── PROFILES ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.profiles (
  id           UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email        TEXT NOT NULL,
  full_name    TEXT NOT NULL DEFAULT '',
  avatar_url   TEXT,
  currency     TEXT NOT NULL DEFAULT 'INR',
  timezone     TEXT NOT NULL DEFAULT 'UTC',
  email_notifications BOOLEAN NOT NULL DEFAULT TRUE,
  push_notifications  BOOLEAN NOT NULL DEFAULT FALSE,
  is_pro       BOOLEAN NOT NULL DEFAULT FALSE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles: users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "profiles: users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "profiles: users can view member profiles"
  ON public.profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.group_members gm1
      JOIN public.group_members gm2 ON gm1.group_id = gm2.group_id
      WHERE gm1.user_id = auth.uid() AND gm2.user_id = profiles.id
    )
  );

-- ── GROUPS ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.groups (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name         TEXT NOT NULL,
  description  TEXT,
  image_url    TEXT,
  currency     TEXT NOT NULL DEFAULT 'INR',
  created_by   UUID NOT NULL REFERENCES auth.users(id),
  is_archived  BOOLEAN NOT NULL DEFAULT FALSE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "groups: members can view"
  ON public.groups FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.group_members
      WHERE group_id = groups.id AND user_id = auth.uid()
    )
  );

CREATE POLICY "groups: creator can insert"
  ON public.groups FOR INSERT
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "groups: admin can update"
  ON public.groups FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.group_members
      WHERE group_id = groups.id AND user_id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "groups: admin can delete"
  ON public.groups FOR DELETE
  USING (auth.uid() = created_by);

-- ── GROUP_MEMBERS ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.group_members (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id     UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role         TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  joined_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (group_id, user_id)
);

ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "group_members: members can view"
  ON public.group_members FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.group_members gm
      WHERE gm.group_id = group_members.group_id AND gm.user_id = auth.uid()
    )
  );

CREATE POLICY "group_members: admin can insert"
  ON public.group_members FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.group_members gm
      WHERE gm.group_id = group_members.group_id
        AND gm.user_id = auth.uid()
        AND gm.role = 'admin'
    )
    OR auth.uid() = user_id  -- allow self-join on invite
  );

CREATE POLICY "group_members: admin can delete"
  ON public.group_members FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.group_members gm
      WHERE gm.group_id = group_members.group_id
        AND gm.user_id = auth.uid()
        AND gm.role = 'admin'
    )
    OR auth.uid() = user_id  -- allow self-removal
  );

-- ── EXPENSES ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.expenses (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id     UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  paid_by      UUID NOT NULL REFERENCES auth.users(id),
  amount       NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
  description  TEXT NOT NULL,
  category     TEXT NOT NULL DEFAULT 'other',
  date         DATE NOT NULL DEFAULT CURRENT_DATE,
  receipt_url  TEXT,
  notes        TEXT,
  split_type   TEXT NOT NULL DEFAULT 'equal' CHECK (split_type IN ('equal', 'percentage', 'exact')),
  is_deleted   BOOLEAN NOT NULL DEFAULT FALSE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "expenses: group members can view"
  ON public.expenses FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.group_members
      WHERE group_id = expenses.group_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "expenses: group members can insert"
  ON public.expenses FOR INSERT
  WITH CHECK (
    auth.uid() = paid_by AND
    EXISTS (
      SELECT 1 FROM public.group_members
      WHERE group_id = expenses.group_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "expenses: payer or admin can update"
  ON public.expenses FOR UPDATE
  USING (
    auth.uid() = paid_by OR
    EXISTS (
      SELECT 1 FROM public.group_members
      WHERE group_id = expenses.group_id AND user_id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "expenses: payer or admin can delete"
  ON public.expenses FOR DELETE
  USING (
    auth.uid() = paid_by OR
    EXISTS (
      SELECT 1 FROM public.group_members
      WHERE group_id = expenses.group_id AND user_id = auth.uid() AND role = 'admin'
    )
  );

-- ── EXPENSE_SPLITS ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.expense_splits (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  expense_id   UUID NOT NULL REFERENCES public.expenses(id) ON DELETE CASCADE,
  user_id      UUID NOT NULL REFERENCES auth.users(id),
  amount       NUMERIC(12, 2) NOT NULL,
  percentage   NUMERIC(5, 2),
  is_settled   BOOLEAN NOT NULL DEFAULT FALSE,
  settled_at   TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (expense_id, user_id)
);

ALTER TABLE public.expense_splits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "expense_splits: group members can view"
  ON public.expense_splits FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.expenses e
      JOIN public.group_members gm ON gm.group_id = e.group_id
      WHERE e.id = expense_splits.expense_id AND gm.user_id = auth.uid()
    )
  );

CREATE POLICY "expense_splits: payer can insert"
  ON public.expense_splits FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.expenses e
      WHERE e.id = expense_splits.expense_id AND e.paid_by = auth.uid()
    )
  );

CREATE POLICY "expense_splits: payer can update"
  ON public.expense_splits FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.expenses e
      WHERE e.id = expense_splits.expense_id AND e.paid_by = auth.uid()
    )
  );

-- ── SETTLEMENTS ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.settlements (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id       UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  payer_id       UUID NOT NULL REFERENCES auth.users(id),
  payee_id       UUID NOT NULL REFERENCES auth.users(id),
  amount         NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
  payment_method TEXT NOT NULL DEFAULT 'cash' CHECK (payment_method IN ('cash', 'bank_transfer', 'venmo', 'cashapp', 'paypal', 'other')),
  notes          TEXT,
  settled_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.settlements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "settlements: group members can view"
  ON public.settlements FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.group_members
      WHERE group_id = settlements.group_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "settlements: payer can insert"
  ON public.settlements FOR INSERT
  WITH CHECK (
    auth.uid() = payer_id AND
    EXISTS (
      SELECT 1 FROM public.group_members
      WHERE group_id = settlements.group_id AND user_id = auth.uid()
    )
  );

-- ── NOTIFICATIONS ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.notifications (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type         TEXT NOT NULL CHECK (type IN ('expense_added', 'expense_updated', 'settlement', 'group_invite', 'reminder')),
  title        TEXT NOT NULL,
  body         TEXT NOT NULL,
  is_read      BOOLEAN NOT NULL DEFAULT FALSE,
  related_id   UUID,  -- expense_id or settlement_id
  group_id     UUID REFERENCES public.groups(id),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notifications: user can view own"
  ON public.notifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "notifications: user can update own"
  ON public.notifications FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "notifications: service can insert"
  ON public.notifications FOR INSERT
  WITH CHECK (TRUE);  -- Edge Functions use service role key

-- ── FUNCTIONS & TRIGGERS ──────────────────────────────────────
-- Auto-create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER expenses_updated_at
  BEFORE UPDATE ON public.expenses
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER groups_updated_at
  BEFORE UPDATE ON public.groups
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ── INDEXES ───────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_group_members_group_id ON public.group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_group_members_user_id ON public.group_members(user_id);
CREATE INDEX IF NOT EXISTS idx_expenses_group_id ON public.expenses(group_id);
CREATE INDEX IF NOT EXISTS idx_expenses_paid_by ON public.expenses(paid_by);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON public.expenses(date DESC);
CREATE INDEX IF NOT EXISTS idx_expense_splits_expense_id ON public.expense_splits(expense_id);
CREATE INDEX IF NOT EXISTS idx_expense_splits_user_id ON public.expense_splits(user_id);
CREATE INDEX IF NOT EXISTS idx_settlements_group_id ON public.settlements(group_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON public.notifications(is_read);

-- ── REALTIME ──────────────────────────────────────────────────
-- Enable realtime for key tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.expenses;
ALTER PUBLICATION supabase_realtime ADD TABLE public.expense_splits;
ALTER PUBLICATION supabase_realtime ADD TABLE public.settlements;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
