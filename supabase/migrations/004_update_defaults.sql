-- Change default currency to INR
ALTER TABLE public.profiles ALTER COLUMN currency SET DEFAULT 'INR';
ALTER TABLE public.groups ALTER COLUMN currency SET DEFAULT 'INR';

-- Update payment methods check constraint for Indian context
ALTER TABLE public.settlements DROP CONSTRAINT IF EXISTS settlements_payment_method_check;
ALTER TABLE public.settlements ADD CONSTRAINT settlements_payment_method_check 
  CHECK (payment_method IN ('cash', 'upi', 'card', 'netbanking', 'wallet', 'other', 'bank_transfer', 'venmo', 'cashapp', 'paypal'));
