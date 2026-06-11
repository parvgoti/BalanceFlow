-- ============================================================
-- BalanceFlow Storage Policies
-- Run after 001_initial_schema.sql
-- ============================================================

-- Create receipts bucket (run this in Supabase Storage dashboard or:)
-- INSERT INTO storage.buckets (id, name, public) VALUES ('receipts', 'receipts', false);

-- Storage RLS policies
CREATE POLICY "receipts: owners can upload"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'receipts' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "receipts: owners can read own files"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'receipts' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "receipts: group members can read"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'receipts' AND
    EXISTS (
      SELECT 1 FROM public.expenses e
      JOIN public.group_members gm ON gm.group_id = e.group_id
      WHERE e.receipt_url LIKE '%' || name || '%'
        AND gm.user_id = auth.uid()
    )
  );

CREATE POLICY "receipts: owners can delete"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'receipts' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );
