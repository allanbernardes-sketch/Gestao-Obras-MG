ALTER TABLE diarios_obra
ADD COLUMN IF NOT EXISTS categoria text
  CHECK (categoria IS NULL OR categoria IN (
    'Ocorrência', 'Clima', 'Trabalho',
    'Materiais', 'Equipe', 'Segurança'
  )),
ADD COLUMN IF NOT EXISTS anexo_foto text,
ADD COLUMN IF NOT EXISTS autor text;

-- Necessária para deletarDiario apagar a linha correspondente no banco;
-- sem policy de DELETE a exclusão local reapareceria no próximo reload.
CREATE POLICY "autenticados podem deletar diarios" ON public.diarios_obra
  FOR DELETE TO authenticated USING (true);
