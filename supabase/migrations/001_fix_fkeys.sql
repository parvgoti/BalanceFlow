-- Fix foreign keys to reference public.profiles instead of auth.users
-- This allows PostgREST to automatically resolve nested queries like `group_members(profiles(...))`

ALTER TABLE public.groups 
  DROP CONSTRAINT IF EXISTS groups_created_by_fkey,
  ADD CONSTRAINT groups_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id);

ALTER TABLE public.group_members 
  DROP CONSTRAINT IF EXISTS group_members_user_id_fkey,
  ADD CONSTRAINT group_members_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.expenses 
  DROP CONSTRAINT IF EXISTS expenses_paid_by_fkey,
  ADD CONSTRAINT expenses_paid_by_fkey FOREIGN KEY (paid_by) REFERENCES public.profiles(id);

ALTER TABLE public.expense_splits 
  DROP CONSTRAINT IF EXISTS expense_splits_user_id_fkey,
  ADD CONSTRAINT expense_splits_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id);

ALTER TABLE public.settlements 
  DROP CONSTRAINT IF EXISTS settlements_payer_id_fkey,
  ADD CONSTRAINT settlements_payer_id_fkey FOREIGN KEY (payer_id) REFERENCES public.profiles(id);

ALTER TABLE public.settlements 
  DROP CONSTRAINT IF EXISTS settlements_payee_id_fkey,
  ADD CONSTRAINT settlements_payee_id_fkey FOREIGN KEY (payee_id) REFERENCES public.profiles(id);

ALTER TABLE public.notifications 
  DROP CONSTRAINT IF EXISTS notifications_user_id_fkey,
  ADD CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
