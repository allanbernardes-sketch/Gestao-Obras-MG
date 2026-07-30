ALTER TABLE restricoes_obra
ADD COLUMN IF NOT EXISTS impacto text
  CHECK (impacto IS NULL OR impacto IN
    ('Alto', 'Médio', 'Baixo')),
ADD COLUMN IF NOT EXISTS previsao_resolucao date,
ADD COLUMN IF NOT EXISTS parecer_resolucao text;

-- Necessária para deletarRestricao apagar a linha correspondente no banco;
-- sem policy de DELETE a exclusão local reapareceria no próximo reload.
CREATE POLICY "autenticados podem deletar restricoes" ON public.restricoes_obra
  FOR DELETE TO authenticated USING (true);
