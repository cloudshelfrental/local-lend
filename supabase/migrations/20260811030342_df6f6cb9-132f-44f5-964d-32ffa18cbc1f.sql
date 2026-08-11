ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS start_date date,
  ADD COLUMN IF NOT EXISTS end_date date,
  ADD COLUMN IF NOT EXISTS rental_days integer NOT NULL DEFAULT 1;