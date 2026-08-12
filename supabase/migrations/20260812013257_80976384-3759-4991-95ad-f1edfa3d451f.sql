CREATE TABLE public.storage_config (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  provider text NOT NULL DEFAULT 'supabase',
  cloudinary_cloud_name text,
  cloudinary_upload_preset text,
  folder text,
  fallback_to_supabase boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT ON public.storage_config TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.storage_config TO authenticated;
GRANT ALL ON public.storage_config TO service_role;

ALTER TABLE public.storage_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view storage config"
ON public.storage_config FOR SELECT USING (true);

CREATE POLICY "Admins can insert storage config"
ON public.storage_config FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Admins can update storage config"
ON public.storage_config FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_storage_config_updated_at
BEFORE UPDATE ON public.storage_config
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.storage_config (provider) VALUES ('supabase');