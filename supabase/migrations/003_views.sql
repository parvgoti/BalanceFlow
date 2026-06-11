-- ============================================================
-- BalanceFlow: Balance Computation Views
-- ============================================================

-- Net balance per user per group
CREATE OR REPLACE VIEW public.group_balances AS
SELECT
  gm.group_id,
  gm.user_id,
  p.full_name,
  p.avatar_url,
  COALESCE(
    SUM(CASE WHEN e.paid_by = gm.user_id THEN e.amount ELSE 0 END)
    - SUM(CASE WHEN es.user_id = gm.user_id AND NOT es.is_settled THEN es.amount ELSE 0 END)
    + COALESCE(s_received.total_received, 0)
    - COALESCE(s_paid.total_paid, 0),
    0
  ) AS net_balance
FROM public.group_members gm
JOIN public.profiles p ON p.id = gm.user_id
LEFT JOIN public.expenses e ON e.group_id = gm.group_id AND NOT e.is_deleted
LEFT JOIN public.expense_splits es ON es.expense_id = e.id
LEFT JOIN (
  SELECT payee_id, group_id, SUM(amount) as total_received
  FROM public.settlements GROUP BY payee_id, group_id
) s_received ON s_received.payee_id = gm.user_id AND s_received.group_id = gm.group_id
LEFT JOIN (
  SELECT payer_id, group_id, SUM(amount) as total_paid
  FROM public.settlements GROUP BY payer_id, group_id
) s_paid ON s_paid.payer_id = gm.user_id AND s_paid.group_id = gm.group_id
GROUP BY gm.group_id, gm.user_id, p.full_name, p.avatar_url, s_received.total_received, s_paid.total_paid;

-- Recent activity view
CREATE OR REPLACE VIEW public.activity_feed AS
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
