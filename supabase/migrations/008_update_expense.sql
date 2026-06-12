-- ============================================================
-- RPC Function: update_expense
-- Updates an expense and perfectly replaces all of its splits
-- within a single transaction to prevent math bugs.
-- ============================================================

CREATE OR REPLACE FUNCTION public.update_expense(
  p_expense_id UUID,
  p_group_id UUID,
  p_paid_by UUID,
  p_amount NUMERIC,
  p_description TEXT,
  p_category TEXT,
  p_date DATE,
  p_notes TEXT,
  p_split_type TEXT,
  p_splits JSONB
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_split JSONB;
BEGIN
  -- 1. Verify caller has permission to update this expense
  -- Must be group member
  IF NOT public.is_group_member(p_group_id) THEN
    RAISE EXCEPTION 'Not authorized to update expenses in this group';
  END IF;

  -- Ensure the expense belongs to the group
  IF NOT EXISTS (SELECT 1 FROM public.expenses WHERE id = p_expense_id AND group_id = p_group_id) THEN
    RAISE EXCEPTION 'Expense not found in this group';
  END IF;

  -- 2. Update the main expense record
  UPDATE public.expenses
  SET 
    paid_by = p_paid_by,
    amount = p_amount,
    description = p_description,
    category = p_category,
    date = p_date,
    notes = p_notes,
    split_type = p_split_type,
    updated_at = NOW()
  WHERE id = p_expense_id;

  -- 3. Delete existing splits
  DELETE FROM public.expense_splits
  WHERE expense_id = p_expense_id;

  -- 4. Insert new splits
  FOR v_split IN SELECT * FROM jsonb_array_elements(p_splits)
  LOOP
    INSERT INTO public.expense_splits (
      expense_id,
      user_id,
      amount,
      percentage
    ) VALUES (
      p_expense_id,
      (v_split->>'user_id')::UUID,
      (v_split->>'amount')::NUMERIC,
      CASE WHEN (v_split->>'percentage') IS NOT NULL THEN (v_split->>'percentage')::NUMERIC ELSE NULL END
    );
  END LOOP;
END;
$$;
