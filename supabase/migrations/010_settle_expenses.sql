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
-- 2. Trigger to mark expense splits as settled using FIFO
-- ============================================================
CREATE OR REPLACE FUNCTION public.process_settlement()
RETURNS TRIGGER AS $$
DECLARE
  v_remaining_amount NUMERIC;
  v_split RECORD;
BEGIN
  v_remaining_amount := NEW.amount;

  -- Find all pending splits where the NEW.payer_id owes NEW.payee_id
  FOR v_split IN 
    SELECT es.id, es.amount
    FROM public.expense_splits es
    JOIN public.expenses e ON e.id = es.expense_id
    WHERE e.group_id = NEW.group_id
      AND e.paid_by = NEW.payee_id
      AND es.user_id = NEW.payer_id
      AND es.is_settled = false
      AND NOT e.is_deleted
    ORDER BY e.created_at ASC
  LOOP
    IF v_remaining_amount >= v_split.amount THEN
      -- Fully settle this split
      UPDATE public.expense_splits SET is_settled = true WHERE id = v_split.id;
      v_remaining_amount := v_remaining_amount - v_split.amount;
    ELSE
      -- Partial settlement: we don't track partial splits currently, so we just stop
      EXIT;
    END IF;
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_settlement_created ON public.settlements;
CREATE TRIGGER on_settlement_created
AFTER INSERT ON public.settlements
FOR EACH ROW EXECUTE FUNCTION public.process_settlement();
