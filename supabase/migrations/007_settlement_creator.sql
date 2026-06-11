-- Add created_by to settlements table
ALTER TABLE public.settlements 
  ADD COLUMN created_by UUID REFERENCES public.profiles(id);

-- Set existing rows to default to the payer_id (since previously only payers could insert)
UPDATE public.settlements SET created_by = payer_id WHERE created_by IS NULL;

-- Make it NOT NULL for future inserts (handled by application or defaults to auth.uid())
ALTER TABLE public.settlements ALTER COLUMN created_by SET NOT NULL;
ALTER TABLE public.settlements ALTER COLUMN created_by SET DEFAULT auth.uid();
