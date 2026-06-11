-- ============================================================
-- BalanceFlow – Complete Database Schema
-- Run this single file in the Supabase SQL Editor
-- ============================================================

-- ── Extensions ───────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- TABLES
-- ============================================================

CREATE TABLE IF NOT EXISTS public.profiles (
  id                  UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email               TEXT NOT NULL,
  full_name           TEXT NOT NULL DEFAULT '',
  avatar_url          TEXT,
  currency            TEXT NOT NULL DEFAULT 'INR',
  timezone            TEXT NOT NULL DEFAULT 'UTC',
  email_notifications BOOLEAN NOT NULL DEFAULT TRUE,
  push_notifications  BOOLEAN NOT NULL DEFAULT FALSE,
  is_pro              BOOLEAN NOT NULL DEFAULT FALSE,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.groups (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        TEXT NOT NULL,
  description TEXT,
  image_url   TEXT,
  currency    TEXT NOT NULL DEFAULT 'INR',
  created_by  UUID NOT NULL REFERENCES public.profiles(id),
  is_archived BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.group_members (
  id        UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id  UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  user_id   UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role      TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (group_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.expenses (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id    UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  paid_by     UUID NOT NULL REFERENCES public.profiles(id),
  amount      NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
  description TEXT NOT NULL,
  category    TEXT NOT NULL DEFAULT 'other',
  date        DATE NOT NULL DEFAULT CURRENT_DATE,
  receipt_url TEXT,
  notes       TEXT,
  split_type  TEXT NOT NULL DEFAULT 'equal' CHECK (split_type IN ('equal', 'percentage', 'exact')),
  is_deleted  BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.expense_splits (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  expense_id UUID NOT NULL REFERENCES public.expenses(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES public.profiles(id),
  amount     NUMERIC(12, 2) NOT NULL,
  percentage NUMERIC(5, 2),
  is_settled BOOLEAN NOT NULL DEFAULT FALSE,
  settled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (expense_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.settlements (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id       UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  payer_id       UUID NOT NULL REFERENCES public.profiles(id),
  payee_id       UUID NOT NULL REFERENCES public.profiles(id),
  amount         NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
  payment_method TEXT NOT NULL DEFAULT 'cash'
                 CHECK (payment_method IN ('cash', 'bank_transfer', 'venmo', 'cashapp', 'paypal', 'other')),
  notes          TEXT,
  settled_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.notifications (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type       TEXT NOT NULL
             CHECK (type IN ('expense_added', 'expense_updated', 'settlement', 'group_invite', 'reminder')),
  title      TEXT NOT NULL,
  body       TEXT NOT NULL,
  is_read    BOOLEAN NOT NULL DEFAULT FALSE,
  related_id UUID,
  group_id   UUID REFERENCES public.groups(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- HELPER FUNCTIONS (to avoid RLS infinite recursion)
-- ============================================================

CREATE OR REPLACE FUNCTION public.is_group_member(p_group_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM group_members
    WHERE group_id = p_group_id AND user_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.is_group_admin(p_group_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM group_members
    WHERE group_id = p_group_id AND user_id = auth.uid() AND role = 'admin'
  );
$$;


-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE public.profiles     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.groups       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expense_splits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settlements  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;


-- Clean up existing policies for idempotency
DROP POLICY IF EXISTS "profiles: users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "profiles: users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "profiles: users can view member profiles" ON public.profiles;

DROP POLICY IF EXISTS "groups: members can view" ON public.groups;
DROP POLICY IF EXISTS "groups: creator can insert" ON public.groups;
DROP POLICY IF EXISTS "groups: admin can update" ON public.groups;
DROP POLICY IF EXISTS "groups: admin can delete" ON public.groups;

DROP POLICY IF EXISTS "group_members: members can view" ON public.group_members;
DROP POLICY IF EXISTS "group_members: admin or self can insert" ON public.group_members;
DROP POLICY IF EXISTS "group_members: admin or self can delete" ON public.group_members;

DROP POLICY IF EXISTS "expenses: group members can view" ON public.expenses;
DROP POLICY IF EXISTS "expenses: group members can insert" ON public.expenses;
DROP POLICY IF EXISTS "expenses: payer or admin can update" ON public.expenses;
DROP POLICY IF EXISTS "expenses: payer or admin can delete" ON public.expenses;

DROP POLICY IF EXISTS "expense_splits: group members can view" ON public.expense_splits;
DROP POLICY IF EXISTS "expense_splits: group members can insert" ON public.expense_splits;
DROP POLICY IF EXISTS "expense_splits: payer can update" ON public.expense_splits;

DROP POLICY IF EXISTS "settlements: group members can view" ON public.settlements;
DROP POLICY IF EXISTS "settlements: payer can insert" ON public.settlements;

DROP POLICY IF EXISTS "notifications: user can view own" ON public.notifications;
DROP POLICY IF EXISTS "notifications: user can update own" ON public.notifications;
DROP POLICY IF EXISTS "notifications: service can insert" ON public.notifications;


-- ── profiles policies ─────────────────────────────────────────
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
      SELECT 1 FROM public.group_members gm
      WHERE gm.user_id = profiles.id AND public.is_group_member(gm.group_id)
    )
  );

-- ── groups policies ───────────────────────────────────────────
CREATE POLICY "groups: members can view"
  ON public.groups FOR SELECT
  USING (
    auth.uid() = created_by OR public.is_group_member(id)
  );

CREATE POLICY "groups: creator can insert"
  ON public.groups FOR INSERT
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "groups: admin can update"
  ON public.groups FOR UPDATE
  USING (public.is_group_admin(id));

CREATE POLICY "groups: admin can delete"
  ON public.groups FOR DELETE
  USING (auth.uid() = created_by);

-- ── group_members policies ────────────────────────────────────
CREATE POLICY "group_members: members can view"
  ON public.group_members FOR SELECT
  USING (public.is_group_member(group_id));

CREATE POLICY "group_members: admin or self can insert"
  ON public.group_members FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    OR public.is_group_admin(group_id)
  );

CREATE POLICY "group_members: admin or self can delete"
  ON public.group_members FOR DELETE
  USING (
    auth.uid() = user_id
    OR public.is_group_admin(group_id)
  );

-- ── expenses policies ─────────────────────────────────────────
CREATE POLICY "expenses: group members can view"
  ON public.expenses FOR SELECT
  USING (public.is_group_member(group_id));

CREATE POLICY "expenses: group members can insert"
  ON public.expenses FOR INSERT
  WITH CHECK (public.is_group_member(group_id));

CREATE POLICY "expenses: payer or admin can update"
  ON public.expenses FOR UPDATE
  USING (
    auth.uid() = paid_by OR public.is_group_admin(group_id)
  );

CREATE POLICY "expenses: payer or admin can delete"
  ON public.expenses FOR DELETE
  USING (
    auth.uid() = paid_by OR public.is_group_admin(group_id)
  );

-- ── expense_splits policies ───────────────────────────────────
CREATE POLICY "expense_splits: group members can view"
  ON public.expense_splits FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.expenses e
      WHERE e.id = expense_splits.expense_id AND public.is_group_member(e.group_id)
    )
  );

CREATE POLICY "expense_splits: group members can insert"
  ON public.expense_splits FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.expenses e
      WHERE e.id = expense_splits.expense_id AND public.is_group_member(e.group_id)
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

-- ── settlements policies ──────────────────────────────────────
CREATE POLICY "settlements: group members can view"
  ON public.settlements FOR SELECT
  USING (public.is_group_member(group_id));

CREATE POLICY "settlements: payer can insert"
  ON public.settlements FOR INSERT
  WITH CHECK (
    auth.uid() = payer_id AND public.is_group_member(group_id)
  );

-- ── notifications policies ────────────────────────────────────
CREATE POLICY "notifications: user can view own"
  ON public.notifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "notifications: user can update own"
  ON public.notifications FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "notifications: service can insert"
  ON public.notifications FOR INSERT
  WITH CHECK (TRUE);

-- ============================================================
-- FUNCTIONS & TRIGGERS
-- ============================================================

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
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS expenses_updated_at ON public.expenses;
CREATE TRIGGER expenses_updated_at
  BEFORE UPDATE ON public.expenses
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS groups_updated_at ON public.groups;
CREATE TRIGGER groups_updated_at
  BEFORE UPDATE ON public.groups
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS profiles_updated_at ON public.profiles;
CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_group_members_group_id   ON public.group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_group_members_user_id    ON public.group_members(user_id);
CREATE INDEX IF NOT EXISTS idx_expenses_group_id        ON public.expenses(group_id);
CREATE INDEX IF NOT EXISTS idx_expenses_paid_by         ON public.expenses(paid_by);
CREATE INDEX IF NOT EXISTS idx_expenses_date            ON public.expenses(date DESC);
CREATE INDEX IF NOT EXISTS idx_expense_splits_expense_id ON public.expense_splits(expense_id);
CREATE INDEX IF NOT EXISTS idx_expense_splits_user_id   ON public.expense_splits(user_id);
CREATE INDEX IF NOT EXISTS idx_settlements_group_id     ON public.settlements(group_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id    ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read    ON public.notifications(is_read);

-- ============================================================
-- VIEWS
-- ============================================================

CREATE OR REPLACE VIEW public.group_balances AS
SELECT
  gm.group_id,
  gm.user_id,
  p.full_name,
  p.avatar_url,
  COALESCE(
    SUM(CASE WHEN e.paid_by = gm.user_id THEN e.amount ELSE 0 END)
    - SUM(CASE WHEN es.user_id = gm.user_id AND NOT es.is_settled THEN es.amount ELSE 0 END)
    + COALESCE(s_received.total_received, 0)
    - COALESCE(s_paid.total_paid, 0),
    0
  ) AS net_balance
FROM public.group_members gm
JOIN public.profiles p ON p.id = gm.user_id
LEFT JOIN public.expenses e   ON e.group_id = gm.group_id AND NOT e.is_deleted
LEFT JOIN public.expense_splits es ON es.expense_id = e.id
LEFT JOIN (
  SELECT payee_id, group_id, SUM(amount) AS total_received
  FROM public.settlements GROUP BY payee_id, group_id
) s_received ON s_received.payee_id = gm.user_id AND s_received.group_id = gm.group_id
LEFT JOIN (
  SELECT payer_id, group_id, SUM(amount) AS total_paid
  FROM public.settlements GROUP BY payer_id, group_id
) s_paid ON s_paid.payer_id = gm.user_id AND s_paid.group_id = gm.group_id
GROUP BY gm.group_id, gm.user_id, p.full_name, p.avatar_url,
         s_received.total_received, s_paid.total_paid;

CREATE OR REPLACE VIEW public.activity_feed AS
SELECT
  'expense'      AS type,
  e.id,
  e.group_id,
  g.name         AS group_name,
  e.description  AS title,
  e.amount,
  e.category,
  p.full_name    AS actor_name,
  p.avatar_url   AS actor_avatar,
  e.created_at
FROM public.expenses e
JOIN public.groups   g ON g.id = e.group_id
JOIN public.profiles p ON p.id = e.paid_by
WHERE NOT e.is_deleted

UNION ALL

SELECT
  'settlement'   AS type,
  s.id,
  s.group_id,
  g.name         AS group_name,
  'Settlement'   AS title,
  s.amount,
  'settlement'   AS category,
  p.full_name    AS actor_name,
  p.avatar_url   AS actor_avatar,
  s.created_at
FROM public.settlements s
JOIN public.groups   g ON g.id = s.group_id
JOIN public.profiles p ON p.id = s.payer_id
ORDER BY created_at DESC;

-- ============================================================
-- STORAGE POLICIES
-- ============================================================

-- Uncomment after creating 'receipts' bucket:
/*
CREATE POLICY "receipts: owners can upload"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'receipts' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "receipts: owners can read own files"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'receipts' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "receipts: group members can read"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'receipts' AND
    EXISTS (
      SELECT 1 FROM public.expenses e
      WHERE e.receipt_url LIKE '%' || name || '%'
        AND public.is_group_member(e.group_id)
    )
  );

CREATE POLICY "receipts: owners can delete"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'receipts' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );
*/

-- ============================================================
-- REALTIME
-- ============================================================

DO $$
BEGIN
  EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.expenses, public.expense_splits, public.settlements, public.notifications';
EXCEPTION WHEN duplicate_object THEN
  -- Ignore error if tables are already in the publication
  NULL;
END $$;
