-- Fotos opcionales en reportes de problemas (Supabase Storage + URLs públicas)
-- Ejecutar en SQL Editor después de tener la tabla public.submissions

ALTER TABLE public.submissions
  ADD COLUMN IF NOT EXISTS image_urls text[] DEFAULT '{}';

COMMENT ON COLUMN public.submissions.image_urls IS 'URLs públicas en Storage (solo type=problema)';
