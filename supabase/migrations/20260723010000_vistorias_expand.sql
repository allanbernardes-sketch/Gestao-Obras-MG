ALTER TABLE vistorias_obra
DROP CONSTRAINT IF EXISTS vistorias_obra_resultado_check;

ALTER TABLE vistorias_obra
ADD COLUMN IF NOT EXISTS vistoriador text,
ADD COLUMN IF NOT EXISTS nome_relatorio text,
ADD COLUMN IF NOT EXISTS tamanho_relatorio text,
ADD COLUMN IF NOT EXISTS resultado text
  DEFAULT 'emitido';

-- Necessária para deletarVistoria apagar a linha correspondente no banco;
-- sem policy de DELETE a exclusão local reapareceria no próximo reload.
CREATE POLICY "autenticados podem deletar vistorias" ON public.vistorias_obra
  FOR DELETE TO authenticated USING (true);
