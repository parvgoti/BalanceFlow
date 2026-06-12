-- ============================================================
-- BalanceFlow: Balance Computation Views
-- ============================================================

-- Net balance per user per group
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
  SELECT payee_id, group_id, SUM(amount) as total_received
  FROM public.settlements GROUP BY payee_id, group_id
) s_received ON s_received.payee_id = gm.user_id AND s_received.group_id = gm.group_id
LEFT JOIN (
  SELECT payer_id, group_id, SUM(amount) as total_paid
  FROM public.settlements GROUP BY payer_id, group_id
) s_paid ON s_paid.payer_id = gm.user_id AND s_paid.group_id = gm.group_id;

-- Recent activity view
CREATE OR REPLACE VIEW public.activity_feed WITH (security_invoker = true) AS
SELECT
  'expense' AS type,
  e.id,
  e.group_id,
  g.name AS group_name,
  e.description AS title,
  e.amount,
  e.category,
  p.full_name AS actor_name,
  p.avatar_url AS actor_avatar,
  e.created_at
FROM public.expenses e
JOIN public.groups g ON g.id = e.group_id
JOIN public.profiles p ON p.id = e.paid_by
WHERE NOT e.is_deleted

UNION ALL

SELECT
  'settlement' AS type,
  s.id,
  s.group_id,
  g.name AS group_name,
  'Settlement' AS title,
  s.amount,
  'settlement' AS category,
  p.full_name AS actor_name,
  p.avatar_url AS actor_avatar,
  s.created_at
FROM public.settlements s
JOIN public.groups g ON g.id = s.group_id
JOIN public.profiles p ON p.id = s.payer_id
ORDER BY created_at DESC;
