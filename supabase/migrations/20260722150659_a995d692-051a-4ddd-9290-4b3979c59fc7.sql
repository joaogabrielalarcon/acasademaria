
-- Políticas de storage para midia-interna (privado, só autenticados internos)
CREATE POLICY "midia_interna_select_auth"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'midia-interna');

CREATE POLICY "midia_interna_insert_auth"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'midia-interna');

CREATE POLICY "midia_interna_update_auth"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'midia-interna')
WITH CHECK (bucket_id = 'midia-interna');

CREATE POLICY "midia_interna_delete_auth"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'midia-interna');

-- Políticas de storage para midia-cliente (escrita interna; SEM select público — leitura futura via URL assinada de edge function)
CREATE POLICY "midia_cliente_insert_auth"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'midia-cliente');

CREATE POLICY "midia_cliente_update_auth"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'midia-cliente')
WITH CHECK (bucket_id = 'midia-cliente');

CREATE POLICY "midia_cliente_delete_auth"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'midia-cliente');

-- Autenticados internos também podem SELECT no midia-cliente para uso interno (revisão do que foi publicado).
-- Cliente externo NÃO tem acesso — não há política para 'anon' e o bucket é privado.
CREATE POLICY "midia_cliente_select_auth_internal"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'midia-cliente');
