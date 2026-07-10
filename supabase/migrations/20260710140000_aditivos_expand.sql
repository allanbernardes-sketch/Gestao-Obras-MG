ALTER TABLE aditivos
ADD COLUMN IF NOT EXISTS supressao numeric,
ADD COLUMN IF NOT EXISTS reprogramacao text
  CHECK (reprogramacao IS NULL OR reprogramacao IN ('Sim', 'Não')),
ADD COLUMN IF NOT EXISTS saldo_complementar text
  CHECK (saldo_complementar IS NULL OR saldo_complementar IN ('Sim', 'Não')),
ADD COLUMN IF NOT EXISTS valor_aditivo numeric,
ADD COLUMN IF NOT EXISTS percentual_contrato numeric,
ADD COLUMN IF NOT EXISTS parecer_consolidado text,
ADD COLUMN IF NOT EXISTS data_aditivo date,
ADD COLUMN IF NOT EXISTS analista_nome text;

-- Necessária para handleExcluirAditivo (Sistema A) apagar a linha correspondente
-- no banco; sem policy de DELETE a exclusão local reapareceria no próximo reload.
CREATE POLICY "autenticados podem deletar" ON public.aditivos
  FOR DELETE TO authenticated USING (true);
