-- ============================================================
-- TABLE: group_requests
-- ============================================================

DROP TABLE IF EXISTS public.group_requests CASCADE;

CREATE TABLE IF NOT EXISTS public.group_requests (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  invited_by UUID NOT NULL CONSTRAINT group_requests_invited_by_fkey REFERENCES public.profiles(id),
  user_id UUID NOT NULL CONSTRAINT group_requests_user_id_fkey REFERENCES public.profiles(id),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.group_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own requests" ON public.group_requests
  FOR SELECT USING (auth.uid() = user_id OR auth.uid() = invited_by);

CREATE POLICY "Users can update their own requests" ON public.group_requests
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert requests if they are group members" ON public.group_requests
  FOR INSERT WITH CHECK (public.is_group_member(group_id));

CREATE POLICY "Users can delete their own requests or the inviter can" ON public.group_requests
  FOR DELETE USING (auth.uid() = user_id OR auth.uid() = invited_by);

-- Allow invited users to read the inviter's profile so they see the real name instead of "Someone"
CREATE POLICY "profiles_invitees_can_view_inviter" ON public.profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.group_requests
      WHERE user_id = auth.uid() AND invited_by = profiles.id
    )
  );

-- Allow invited users to read the group details so they see the group name
CREATE POLICY "groups_invitees_can_view" ON public.groups
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.group_requests
      WHERE group_id = groups.id AND user_id = auth.uid()
    )
  );

-- ============================================================
-- RPC: accept_group_request
-- ============================================================
CREATE OR REPLACE FUNCTION public.accept_group_request(p_request_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public, auth
AS $$
DECLARE
  v_group_id UUID;
  v_user_id UUID;
  v_status TEXT;
BEGIN
  SELECT group_id, user_id, status INTO v_group_id, v_user_id, v_status
  FROM public.group_requests
  WHERE id = p_request_id;

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Request not found';
  END IF;

  IF v_user_id != auth.uid() THEN
    RAISE EXCEPTION 'Not authorized to accept this request';
  END IF;

  -- Add to group_members
  INSERT INTO public.group_members (group_id, user_id, role)
  VALUES (v_group_id, v_user_id, 'member')
  ON CONFLICT (group_id, user_id) DO NOTHING;

  -- Delete the request
  DELETE FROM public.group_requests WHERE id = p_request_id;
END;
$$;

-- ============================================================
-- RPC: decline_group_request
-- ============================================================
CREATE OR REPLACE FUNCTION public.decline_group_request(p_request_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public, auth
AS $$
DECLARE
  v_user_id UUID;
BEGIN
  SELECT user_id INTO v_user_id
  FROM public.group_requests
  WHERE id = p_request_id;

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Request not found';
  END IF;

  IF v_user_id != auth.uid() THEN
    RAISE EXCEPTION 'Not authorized to decline this request';
  END IF;

  -- Delete the request
  DELETE FROM public.group_requests WHERE id = p_request_id;
END;
$$;
