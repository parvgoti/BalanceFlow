-- Fix for group_balances view
-- Resolves Cartesian product duplication that was causing incorrect, inflated balances
-- Corrects the settlement math signs (Paid settlements INCREASE balance toward 0, Received DECREASE balance toward 0)

CREATE OR REPLACE VIEW public.group_balances AS
WITH user_paid AS (
  SELECT group_id, paid_by AS user_id, SUM(amount) AS total_paid
  FROM public.expenses
  WHERE NOT is_deleted
  GROUP BY group_id, paid_by
),
user_owed AS (
  SELECT e.group_id, es.user_id, SUM(es.amount) AS total_owed
  FROM public.expense_splits es
  JOIN public.expenses e ON e.id = es.expense_id
  WHERE NOT e.is_deleted
  GROUP BY e.group_id, es.user_id
),
settlements_paid AS (
  SELECT group_id, payer_id AS user_id, SUM(amount) AS total_paid
  FROM public.settlements
  GROUP BY group_id, payer_id
),
settlements_received AS (
  SELECT group_id, payee_id AS user_id, SUM(amount) AS total_received
  FROM public.settlements
  GROUP BY group_id, payee_id
)
SELECT
  gm.group_id,
  gm.user_id,
  p.full_name,
  p.avatar_url,
  (
    COALESCE(up.total_paid, 0) 
    - COALESCE(uo.total_owed, 0)
    + COALESCE(sp.total_paid, 0)
    - COALESCE(sr.total_received, 0)
  ) AS net_balance
FROM public.group_members gm
JOIN public.profiles p ON p.id = gm.user_id
LEFT JOIN user_paid up ON up.group_id = gm.group_id AND up.user_id = gm.user_id
LEFT JOIN user_owed uo ON uo.group_id = gm.group_id AND uo.user_id = gm.user_id
LEFT JOIN settlements_paid sp ON sp.group_id = gm.group_id AND sp.user_id = gm.user_id
LEFT JOIN settlements_received sr ON sr.group_id = gm.group_id AND sr.user_id = gm.user_id;
