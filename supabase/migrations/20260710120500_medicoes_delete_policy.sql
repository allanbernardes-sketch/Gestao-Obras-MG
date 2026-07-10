CREATE POLICY "autenticados podem deletar" ON public.medicoes
  FOR DELETE TO authenticated USING (true);
