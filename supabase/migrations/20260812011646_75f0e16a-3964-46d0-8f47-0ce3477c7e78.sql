CREATE POLICY "Item images are viewable by everyone"
ON storage.objects FOR SELECT
USING (bucket_id = 'item-images');

CREATE POLICY "Authenticated users can upload item images"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'item-images');

CREATE POLICY "Users can update their own item images"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'item-images' AND (owner = auth.uid() OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin')));

CREATE POLICY "Users can delete their own item images"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'item-images' AND (owner = auth.uid() OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin')));