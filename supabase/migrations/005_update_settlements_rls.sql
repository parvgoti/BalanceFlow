-- Update settlements RLS policy to allow users to record payments they received.
-- Previously, only the payer could record a settlement.

DROP POLICY IF EXISTS "settlements: payer can insert" ON public.settlements;

CREATE POLICY "settlements: payer or payee can insert"
  ON public.settlements FOR INSERT
  WITH CHECK (
    (auth.uid() = payer_id OR auth.uid() = payee_id) AND public.is_group_member(group_id)
  );
