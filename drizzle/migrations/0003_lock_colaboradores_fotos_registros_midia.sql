DROP POLICY IF EXISTS "Authenticated users can delete colaboradores fotos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete registros midia" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update colaboradores fotos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update registros midia" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload colaboradores fotos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload registros midia" ON storage.objects;

CREATE POLICY "Logged users upload colaboradores fotos" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'colaboradores-fotos');
CREATE POLICY "Logged users upload registros midia" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'registros-midia');

CREATE POLICY "Admin and administrativo update colaboradores fotos" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'colaboradores-fotos' AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'administrativo')))
  WITH CHECK (bucket_id = 'colaboradores-fotos' AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'administrativo')));
CREATE POLICY "Admin and administrativo update registros midia" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'registros-midia' AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'administrativo')))
  WITH CHECK (bucket_id = 'registros-midia' AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'administrativo')));

CREATE POLICY "Admin and administrativo delete colaboradores fotos" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'colaboradores-fotos' AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'administrativo')));
CREATE POLICY "Admin and administrativo delete registros midia" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'registros-midia' AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'administrativo')));