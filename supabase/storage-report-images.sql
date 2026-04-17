-- Bucket y políticas para fotos de "Reportar problema"
-- Si en el sitio falla la subida con "Bucket not found", tenés que crear el bucket.
--
-- Opción A (manual): Dashboard → Storage → New bucket → Name: report-images → id: report-images → Public: ON
-- Opción B (este script): ejecutar TODO en SQL Editor (rol con permisos sobre storage).
--
-- 1) En Supabase: Storage > Create bucket > id: report-images > Public bucket: ON
--    (El INSERT abajo también crea el bucket si no existe.)

INSERT INTO storage.buckets (id, name, public)
VALUES ('report-images', 'report-images', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Lectura pública (para <img src="..."> en el admin y en mails)
DROP POLICY IF EXISTS "Lectura pública report-images" ON storage.objects;
CREATE POLICY "Lectura pública report-images"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'report-images');

-- Subida anónima solo dentro de la carpeta reports/ (desde la web pública con anon key)
DROP POLICY IF EXISTS "Anon sube solo en reports/" ON storage.objects;
CREATE POLICY "Anon sube solo en reports/"
  ON storage.objects FOR INSERT
  TO anon
  WITH CHECK (
    bucket_id = 'report-images'
    AND name LIKE 'reports/%'
  );

-- Autenticados también pueden subir (por si usás otro flujo)
DROP POLICY IF EXISTS "Auth sube en reports/" ON storage.objects;
CREATE POLICY "Auth sube en reports/"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'report-images'
    AND name LIKE 'reports/%'
  );

-- Respaldo: algunas claves/API usan el rol "public" en lugar de "anon" explícito
DROP POLICY IF EXISTS "Public sube solo en reports/" ON storage.objects;
CREATE POLICY "Public sube solo en reports/"
  ON storage.objects FOR INSERT
  TO public
  WITH CHECK (
    bucket_id = 'report-images'
    AND name LIKE 'reports/%'
  );

-- Comprobación: debería devolver una fila con id report-images
SELECT id, name, public FROM storage.buckets WHERE id = 'report-images';
