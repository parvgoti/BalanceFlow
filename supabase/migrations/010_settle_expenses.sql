-- ============================================================
-- 1. Remove `AND NOT es.is_settled` from the group_balances view
--    so balances are computed cleanly using expenses and settlements.
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
  WHERE NOT e.is_deleted
  GROUP BY e.group_id, es.user_id
) es_owed ON es_owed.group_id = gm.group_id AND es_owed.user_id = gm.user_id
LEFT JOIN (
  SELECT payee_id, group_id, SUM(amount) as total_received
  FROM public.settlements GROUP BY payee_id, group_id
) s_received ON s_received.payee_id = gm.user_id AND s_received.group_id = gm.group_id
LEFT JOIN (
  SELECT payer_id, group_id, SUM(amount) as total_paid
  FROM public.settlements GROUP BY payer_id, group_id
) s_paid ON s_paid.payer_id = gm.user_id AND s_paid.group_id = gm.group_id;

-- ============================================================
-- 2. Function to robustly calculate pair-wise net balance and update is_settled
-- ============================================================
CREATE OR REPLACE FUNCTION public.recalculate_pairwise_settlements(p_group_id UUID, p_user_a UUID, p_user_b UUID)
RETURNS void AS $$
DECLARE
  v_a_paid_for_b NUMERIC;
  v_b_paid_for_a NUMERIC;
  v_a_settled_to_b NUMERIC;
  v_b_settled_to_a NUMERIC;
  v_net_a_owes_b NUMERIC;
  v_remaining NUMERIC;
  v_split RECORD;
BEGIN
  -- Calculate totals
  SELECT COALESCE(SUM(es.amount), 0) INTO v_a_paid_for_b
  FROM public.expense_splits es JOIN public.expenses e ON e.id = es.expense_id
  WHERE e.group_id = p_group_id AND e.paid_by = p_user_a AND es.user_id = p_user_b AND NOT e.is_deleted;

  SELECT COALESCE(SUM(es.amount), 0) INTO v_b_paid_for_a
  FROM public.expense_splits es JOIN public.expenses e ON e.id = es.expense_id
  WHERE e.group_id = p_group_id AND e.paid_by = p_user_b AND es.user_id = p_user_a AND NOT e.is_deleted;

  SELECT COALESCE(SUM(amount), 0) INTO v_a_settled_to_b
  FROM public.settlements WHERE group_id = p_group_id AND payer_id = p_user_a AND payee_id = p_user_b;

  SELECT COALESCE(SUM(amount), 0) INTO v_b_settled_to_a
  FROM public.settlements WHERE group_id = p_group_id AND payer_id = p_user_b AND payee_id = p_user_a;

  v_net_a_owes_b := v_b_paid_for_a - v_a_paid_for_b - v_a_settled_to_b + v_b_settled_to_a;

  -- Mark ALL splits between A and B as settled initially
  UPDATE public.expense_splits es
  SET is_settled = true
  FROM public.expenses e
  WHERE e.id = es.expense_id
    AND e.group_id = p_group_id
    AND ((e.paid_by = p_user_a AND es.user_id = p_user_b) OR (e.paid_by = p_user_b AND es.user_id = p_user_a));

  -- If someone owes money, un-settle the NEWEST splits up to that exact amount
  IF v_net_a_owes_b > 0 THEN
    v_remaining := v_net_a_owes_b;
    -- Un-settle splits where A owes B (i.e. B paid for A)
    FOR v_split IN 
      SELECT es.id, es.amount
      FROM public.expense_splits es JOIN public.expenses e ON e.id = es.expense_id
      WHERE e.group_id = p_group_id AND e.paid_by = p_user_b AND es.user_id = p_user_a AND NOT e.is_deleted
      ORDER BY e.created_at DESC
    LOOP
      UPDATE public.expense_splits SET is_settled = false WHERE id = v_split.id;
      v_remaining := v_remaining - v_split.amount;
      IF v_remaining <= 0 THEN EXIT; END IF;
    END LOOP;
  ELSIF v_net_a_owes_b < 0 THEN
    v_remaining := -v_net_a_owes_b;
    -- Un-settle splits where B owes A (i.e. A paid for B)
    FOR v_split IN 
      SELECT es.id, es.amount
      FROM public.expense_splits es JOIN public.expenses e ON e.id = es.expense_id
      WHERE e.group_id = p_group_id AND e.paid_by = p_user_a AND es.user_id = p_user_b AND NOT e.is_deleted
      ORDER BY e.created_at DESC
    LOOP
      UPDATE public.expense_splits SET is_settled = false WHERE id = v_split.id;
      v_remaining := v_remaining - v_split.amount;
      IF v_remaining <= 0 THEN EXIT; END IF;
    END LOOP;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 3. Trigger to call recalculate_pairwise_settlements on settlement
-- ============================================================
CREATE OR REPLACE FUNCTION public.process_settlement()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM public.recalculate_pairwise_settlements(NEW.group_id, NEW.payer_id, NEW.payee_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_settlement_created ON public.settlements;
CREATE TRIGGER on_settlement_created
AFTER INSERT ON public.settlements
FOR EACH ROW EXECUTE FUNCTION public.process_settlement();
