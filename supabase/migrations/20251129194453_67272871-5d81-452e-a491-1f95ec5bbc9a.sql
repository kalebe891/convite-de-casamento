-- Configurar restrições no bucket wedding-photos
UPDATE storage.buckets
SET 
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  file_size_limit = 10485760 -- 10MB em bytes
WHERE id = 'wedding-photos';

-- Remover políticas antigas (se existirem)
DROP POLICY IF EXISTS "Anyone can view wedding photos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload wedding photos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update wedding photos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete wedding photos" ON storage.objects;

-- Política de leitura pública (mantém acesso público para visualização)
CREATE POLICY "Public can view wedding photos"
ON storage.objects
FOR SELECT
USING (bucket_id = 'wedding-photos');

-- Apenas usuários autenticados podem fazer upload
CREATE POLICY "Authenticated users can upload wedding photos"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'wedding-photos' AND
  (storage.foldername(name))[1] IS NOT NULL
);

-- Ninguém pode sobrescrever arquivos existentes
-- (Somente permitir UPDATE de metadata, não do arquivo em si)
CREATE POLICY "No one can overwrite wedding photos"
ON storage.objects
FOR UPDATE
TO authenticated
USING (false)
WITH CHECK (false);

-- Apenas usuários autenticados podem deletar suas próprias fotos
CREATE POLICY "Authenticated users can delete wedding photos"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'wedding-photos'
);