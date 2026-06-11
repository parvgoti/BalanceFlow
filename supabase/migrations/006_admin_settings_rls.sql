-- Allow admins to record settlements for anyone in the group.
-- Modifies the settlements INSERT policy.

DROP POLICY IF EXISTS "settlements: payer or payee can insert" ON public.settlements;

CREATE POLICY "settlements: payer, payee, or admin can insert"
  ON public.settlements FOR INSERT
  WITH CHECK (
    (auth.uid() = payer_id OR auth.uid() = payee_id OR public.is_group_admin(group_id)) 
    AND public.is_group_member(group_id)
  );
