-- ============================================================
-- Update activity_feed to include deleted expenses
-- ============================================================

CREATE OR REPLACE VIEW public.activity_feed WITH (security_invoker = true) AS
SELECT
  CASE WHEN e.is_deleted THEN 'deleted_expense' ELSE 'expense' END AS type,
  e.id,
  e.group_id,
  g.name AS group_name,
  e.description AS title,
  e.amount,
  e.category,
  p.full_name AS actor_name,
  p.avatar_url AS actor_avatar,
  CASE WHEN e.is_deleted THEN e.updated_at ELSE e.created_at END AS created_at
FROM public.expenses e
JOIN public.groups g ON g.id = e.group_id
JOIN public.profiles p ON p.id = e.paid_by

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
