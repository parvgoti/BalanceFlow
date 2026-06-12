-- ============================================================
-- BalanceFlow: Reset Group Data RPC
-- ============================================================

CREATE OR REPLACE FUNCTION public.reset_group_data(group_id_input UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verify the caller is an admin of the group
  IF NOT public.is_group_admin(group_id_input) THEN
    RAISE EXCEPTION 'Only group admins can reset group data';
  END IF;

  -- Delete all settlements for the group
  DELETE FROM public.settlements WHERE group_id = group_id_input;
  
  -- Delete all expenses for the group (expense_splits will cascade delete)
  DELETE FROM public.expenses WHERE group_id = group_id_input;
END;
$$;
