-- ============================================================
-- TABLE: group_reset_requests
-- Tracks member approval for admin resetting group data
-- ============================================================

CREATE TABLE IF NOT EXISTS public.group_reset_requests (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  requested_by UUID NOT NULL REFERENCES public.profiles(id),
  user_id UUID NOT NULL REFERENCES public.profiles(id),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'denied')),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(group_id, user_id)
);

ALTER TABLE public.group_reset_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view reset requests for their groups" ON public.group_reset_requests
  FOR SELECT USING (public.is_group_member(group_id));

CREATE POLICY "Admins can insert reset requests for their groups" ON public.group_reset_requests
  FOR INSERT WITH CHECK (public.is_group_member(group_id));

CREATE POLICY "Members can update their own status or admin can manage" ON public.group_reset_requests
  FOR UPDATE USING (auth.uid() = user_id OR auth.uid() = requested_by);

CREATE POLICY "Members or admins can delete reset requests for their groups" ON public.group_reset_requests
  FOR DELETE USING (public.is_group_member(group_id));
