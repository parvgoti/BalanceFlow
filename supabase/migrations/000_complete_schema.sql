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

CREATE OR REPLACE VIEW public.group_balances WITH (security_invoker = true) AS
SELECT
  gm.group_id,
  gm.user_id,
  p.full_name,
  p.avatar_url,
  (
    COALESCE(e_paid.total_paid, 0)
    - COALESCE(es_owed.total_owed, 0)
    - COALESCE(s_received.total_received, 0)
    + COALESCE(s_paid.total_paid, 0)
  ) AS net_balance
FROM public.group_members gm
JOIN public.profiles p ON p.id = gm.user_id
LEFT JOIN (
  SELECT group_id, paid_by, SUM(amount) as total_paid
  FROM public.expenses
  WHERE NOT is_deleted
  GROUP BY group_id, paid_by
) e_paid ON e_paid.group_id = gm.group_id AND e_paid.paid_by = gm.user_id
LEFT JOIN (
  SELECT e.group_id, es.user_id, SUM(es.amount) as total_owed
  FROM public.expense_splits es
  JOIN public.expenses e ON e.id = es.expense_id
  WHERE NOT e.is_deleted AND NOT es.is_settled
  GROUP BY e.group_id, es.user_id
) es_owed ON es_owed.group_id = gm.group_id AND es_owed.user_id = gm.user_id
LEFT JOIN (
  SELECT payee_id, group_id, SUM(amount) AS total_received
  FROM public.settlements GROUP BY payee_id, group_id
) s_received ON s_received.payee_id = gm.user_id AND s_received.group_id = gm.group_id
LEFT JOIN (
  SELECT payer_id, group_id, SUM(amount) AS total_paid
  FROM public.settlements GROUP BY payer_id, group_id
) s_paid ON s_paid.payer_id = gm.user_id AND s_paid.group_id = gm.group_id;

CREATE OR REPLACE VIEW public.activity_feed WITH (security_invoker = true) AS
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

-- ============================================================
-- RPC: Reset Group Data
-- ============================================================
CREATE OR REPLACE FUNCTION public.reset_group_data(group_id_input UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_group_admin(group_id_input) THEN
    RAISE EXCEPTION 'Only group admins can reset group data';
  END IF;

  DELETE FROM public.settlements WHERE group_id = group_id_input;
  DELETE FROM public.expenses WHERE group_id = group_id_input;
END;
$$;

DO $$
BEGIN
  EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.expenses, public.expense_splits, public.settlements, public.notifications';
EXCEPTION WHEN duplicate_object THEN
  -- Ignore error if tables are already in the publication
  NULL;
END $$;
- -   = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = =  
 - -   R P C   F u n c t i o n :   u p d a t e _ e x p e n s e  
 - -   U p d a t e s   a n   e x p e n s e   a n d   p e r f e c t l y   r e p l a c e s   a l l   o f   i t s   s p l i t s  
 - -   w i t h i n   a   s i n g l e   t r a n s a c t i o n   t o   p r e v e n t   m a t h   b u g s .  
 - -   = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = =  
  
 C R E A T E   O R   R E P L A C E   F U N C T I O N   p u b l i c . u p d a t e _ e x p e n s e (  
     p _ e x p e n s e _ i d   U U I D ,  
     p _ g r o u p _ i d   U U I D ,  
     p _ p a i d _ b y   U U I D ,  
     p _ a m o u n t   N U M E R I C ,  
     p _ d e s c r i p t i o n   T E X T ,  
     p _ c a t e g o r y   T E X T ,  
     p _ d a t e   D A T E ,  
     p _ n o t e s   T E X T ,  
     p _ s p l i t _ t y p e   T E X T ,  
     p _ s p l i t s   J S O N B  
 )  
 R E T U R N S   v o i d  
 L A N G U A G E   p l p g s q l  
 S E C U R I T Y   D E F I N E R   S E T   s e a r c h _ p a t h   =   p u b l i c  
 A S   $ $  
 D E C L A R E  
     v _ s p l i t   J S O N B ;  
 B E G I N  
     - -   1 .   V e r i f y   c a l l e r   h a s   p e r m i s s i o n   t o   u p d a t e   t h i s   e x p e n s e  
     - -   M u s t   b e   g r o u p   m e m b e r  
     I F   N O T   p u b l i c . i s _ g r o u p _ m e m b e r ( p _ g r o u p _ i d )   T H E N  
         R A I S E   E X C E P T I O N   ' N o t   a u t h o r i z e d   t o   u p d a t e   e x p e n s e s   i n   t h i s   g r o u p ' ;  
     E N D   I F ;  
  
     - -   E n s u r e   t h e   e x p e n s e   b e l o n g s   t o   t h e   g r o u p  
     I F   N O T   E X I S T S   ( S E L E C T   1   F R O M   p u b l i c . e x p e n s e s   W H E R E   i d   =   p _ e x p e n s e _ i d   A N D   g r o u p _ i d   =   p _ g r o u p _ i d )   T H E N  
         R A I S E   E X C E P T I O N   ' E x p e n s e   n o t   f o u n d   i n   t h i s   g r o u p ' ;  
     E N D   I F ;  
  
     - -   2 .   U p d a t e   t h e   m a i n   e x p e n s e   r e c o r d  
     U P D A T E   p u b l i c . e x p e n s e s  
     S E T    
         p a i d _ b y   =   p _ p a i d _ b y ,  
         a m o u n t   =   p _ a m o u n t ,  
         d e s c r i p t i o n   =   p _ d e s c r i p t i o n ,  
         c a t e g o r y   =   p _ c a t e g o r y ,  
         d a t e   =   p _ d a t e ,  
         n o t e s   =   p _ n o t e s ,  
         s p l i t _ t y p e   =   p _ s p l i t _ t y p e ,  
         u p d a t e d _ a t   =   N O W ( )  
     W H E R E   i d   =   p _ e x p e n s e _ i d ;  
  
     - -   3 .   D e l e t e   e x i s t i n g   s p l i t s  
     D E L E T E   F R O M   p u b l i c . e x p e n s e _ s p l i t s  
     W H E R E   e x p e n s e _ i d   =   p _ e x p e n s e _ i d ;  
  
     - -   4 .   I n s e r t   n e w   s p l i t s  
     F O R   v _ s p l i t   I N   S E L E C T   *   F R O M   j s o n b _ a r r a y _ e l e m e n t s ( p _ s p l i t s )  
     L O O P  
         I N S E R T   I N T O   p u b l i c . e x p e n s e _ s p l i t s   (  
             e x p e n s e _ i d ,  
             u s e r _ i d ,  
             a m o u n t ,  
             p e r c e n t a g e  
         )   V A L U E S   (  
             p _ e x p e n s e _ i d ,  
             ( v _ s p l i t - > > ' u s e r _ i d ' ) : : U U I D ,  
             ( v _ s p l i t - > > ' a m o u n t ' ) : : N U M E R I C ,  
             C A S E   W H E N   ( v _ s p l i t - > > ' p e r c e n t a g e ' )   I S   N O T   N U L L   T H E N   ( v _ s p l i t - > > ' p e r c e n t a g e ' ) : : N U M E R I C   E L S E   N U L L   E N D  
         ) ;  
     E N D   L O O P ;  
 E N D ;  
 $ $ ;  
 - -   = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = =  
 - -   T A B L E :   g r o u p _ r e q u e s t s  
 - -   = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = =  
  
 C R E A T E   T A B L E   I F   N O T   E X I S T S   p u b l i c . g r o u p _ r e q u e s t s   (  
     i d   U U I D   D E F A U L T   u u i d _ g e n e r a t e _ v 4 ( )   P R I M A R Y   K E Y ,  
     g r o u p _ i d   U U I D   N O T   N U L L   R E F E R E N C E S   p u b l i c . g r o u p s ( i d )   O N   D E L E T E   C A S C A D E ,  
     i n v i t e d _ b y   U U I D   N O T   N U L L   R E F E R E N C E S   a u t h . u s e r s ( i d ) ,  
     u s e r _ i d   U U I D   N O T   N U L L   R E F E R E N C E S   a u t h . u s e r s ( i d ) ,  
     s t a t u s   T E X T   D E F A U L T   ' p e n d i n g '   C H E C K   ( s t a t u s   I N   ( ' p e n d i n g ' ,   ' a c c e p t e d ' ,   ' d e c l i n e d ' ) ) ,  
     c r e a t e d _ a t   T I M E S T A M P T Z   D E F A U L T   n o w ( )  
 ) ;  
  
 A L T E R   T A B L E   p u b l i c . g r o u p _ r e q u e s t s   E N A B L E   R O W   L E V E L   S E C U R I T Y ;  
  
 C R E A T E   P O L I C Y   " U s e r s   c a n   v i e w   t h e i r   o w n   r e q u e s t s "   O N   p u b l i c . g r o u p _ r e q u e s t s  
     F O R   S E L E C T   U S I N G   ( a u t h . u i d ( )   =   u s e r _ i d   O R   a u t h . u i d ( )   =   i n v i t e d _ b y ) ;  
  
 C R E A T E   P O L I C Y   " U s e r s   c a n   u p d a t e   t h e i r   o w n   r e q u e s t s "   O N   p u b l i c . g r o u p _ r e q u e s t s  
     F O R   U P D A T E   U S I N G   ( a u t h . u i d ( )   =   u s e r _ i d ) ;  
  
 C R E A T E   P O L I C Y   " U s e r s   c a n   i n s e r t   r e q u e s t s   i f   t h e y   a r e   g r o u p   m e m b e r s "   O N   p u b l i c . g r o u p _ r e q u e s t s  
     F O R   I N S E R T   W I T H   C H E C K   ( p u b l i c . i s _ g r o u p _ m e m b e r ( g r o u p _ i d ) ) ;  
  
 C R E A T E   P O L I C Y   " U s e r s   c a n   d e l e t e   t h e i r   o w n   r e q u e s t s   o r   t h e   i n v i t e r   c a n "   O N   p u b l i c . g r o u p _ r e q u e s t s  
     F O R   D E L E T E   U S I N G   ( a u t h . u i d ( )   =   u s e r _ i d   O R   a u t h . u i d ( )   =   i n v i t e d _ b y ) ;  
  
 - -   = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = =  
 - -   R P C :   a c c e p t _ g r o u p _ r e q u e s t  
 - -   = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = =  
 C R E A T E   O R   R E P L A C E   F U N C T I O N   p u b l i c . a c c e p t _ g r o u p _ r e q u e s t ( p _ r e q u e s t _ i d   U U I D )  
 R E T U R N S   v o i d  
 L A N G U A G E   p l p g s q l  
 S E C U R I T Y   D E F I N E R   S E T   s e a r c h _ p a t h   =   p u b l i c ,   a u t h  
 A S   $ $  
 D E C L A R E  
     v _ g r o u p _ i d   U U I D ;  
     v _ u s e r _ i d   U U I D ;  
     v _ s t a t u s   T E X T ;  
 B E G I N  
     S E L E C T   g r o u p _ i d ,   u s e r _ i d ,   s t a t u s   I N T O   v _ g r o u p _ i d ,   v _ u s e r _ i d ,   v _ s t a t u s  
     F R O M   p u b l i c . g r o u p _ r e q u e s t s  
     W H E R E   i d   =   p _ r e q u e s t _ i d ;  
  
     I F   v _ u s e r _ i d   I S   N U L L   T H E N  
         R A I S E   E X C E P T I O N   ' R e q u e s t   n o t   f o u n d ' ;  
     E N D   I F ;  
  
     I F   v _ u s e r _ i d   ! =   a u t h . u i d ( )   T H E N  
         R A I S E   E X C E P T I O N   ' N o t   a u t h o r i z e d   t o   a c c e p t   t h i s   r e q u e s t ' ;  
     E N D   I F ;  
  
     - -   A d d   t o   g r o u p _ m e m b e r s  
     I N S E R T   I N T O   p u b l i c . g r o u p _ m e m b e r s   ( g r o u p _ i d ,   u s e r _ i d ,   r o l e )  
     V A L U E S   ( v _ g r o u p _ i d ,   v _ u s e r _ i d ,   ' m e m b e r ' )  
     O N   C O N F L I C T   ( g r o u p _ i d ,   u s e r _ i d )   D O   N O T H I N G ;  
  
     - -   D e l e t e   t h e   r e q u e s t  
     D E L E T E   F R O M   p u b l i c . g r o u p _ r e q u e s t s   W H E R E   i d   =   p _ r e q u e s t _ i d ;  
 E N D ;  
 $ $ ;  
  
 - -   = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = =  
 - -   R P C :   d e c l i n e _ g r o u p _ r e q u e s t  
 - -   = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = =  
 C R E A T E   O R   R E P L A C E   F U N C T I O N   p u b l i c . d e c l i n e _ g r o u p _ r e q u e s t ( p _ r e q u e s t _ i d   U U I D )  
 R E T U R N S   v o i d  
 L A N G U A G E   p l p g s q l  
 S E C U R I T Y   D E F I N E R   S E T   s e a r c h _ p a t h   =   p u b l i c ,   a u t h  
 A S   $ $  
 D E C L A R E  
     v _ u s e r _ i d   U U I D ;  
 B E G I N  
     S E L E C T   u s e r _ i d   I N T O   v _ u s e r _ i d  
     F R O M   p u b l i c . g r o u p _ r e q u e s t s  
     W H E R E   i d   =   p _ r e q u e s t _ i d ;  
  
     I F   v _ u s e r _ i d   I S   N U L L   T H E N  
         R A I S E   E X C E P T I O N   ' R e q u e s t   n o t   f o u n d ' ;  
     E N D   I F ;  
  
     I F   v _ u s e r _ i d   ! =   a u t h . u i d ( )   T H E N  
         R A I S E   E X C E P T I O N   ' N o t   a u t h o r i z e d   t o   d e c l i n e   t h i s   r e q u e s t ' ;  
     E N D   I F ;  
  
     - -   D e l e t e   t h e   r e q u e s t  
     D E L E T E   F R O M   p u b l i c . g r o u p _ r e q u e s t s   W H E R E   i d   =   p _ r e q u e s t _ i d ;  
 E N D ;  
 $ $ ;  
 