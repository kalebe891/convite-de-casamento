-- Fix storage policies to restrict uploads and deletes to authorized roles only

-- Drop existing policies (including ones with the target names)
DROP POLICY IF EXISTS "Authorized users can upload wedding photos" ON storage.objects;
DROP POLICY IF EXISTS "Authorized users can delete wedding photos" ON storage.objects;

-- Create restricted INSERT policy - only authorized roles can upload
CREATE POLICY "Authorized users can upload wedding photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'wedding-photos' AND
  (has_role(auth.uid(), 'admin') OR 
   has_role(auth.uid(), 'couple') OR 
   has_role(auth.uid(), 'planner'))
);

-- Create restricted DELETE policy - only authorized roles can delete
CREATE POLICY "Authorized users can delete wedding photos"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'wedding-photos' AND
  (has_role(auth.uid(), 'admin') OR 
   has_role(auth.uid(), 'couple') OR 
   has_role(auth.uid(), 'planner'))
);