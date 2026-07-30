ALTER TABLE ajustes_planilha
ADD COLUMN IF NOT EXISTS tipo_ajuste text,
ADD COLUMN IF NOT EXISTS responsavel_planilha text,
ADD COLUMN IF NOT EXISTS registro_profissional text,
ADD COLUMN IF NOT EXISTS ajuste_referente text,
ADD COLUMN IF NOT EXISTS valor_contrato numeric,
ADD COLUMN IF NOT EXISTS diferenca_planilhas numeric,
ADD COLUMN IF NOT EXISTS desconto numeric,
ADD COLUMN IF NOT EXISTS avanco_fisico numeric,
ADD COLUMN IF NOT EXISTS supressao numeric,
ADD COLUMN IF NOT EXISTS reprogramacao text
  CHECK (reprogramacao IS NULL OR
         reprogramacao IN ('Sim', 'Não')),
ADD COLUMN IF NOT EXISTS saldo_complementar text
  CHECK (saldo_complementar IS NULL OR
         saldo_complementar IN ('Sim', 'Não')),
ADD COLUMN IF NOT EXISTS percentual_contrato numeric,
ADD COLUMN IF NOT EXISTS parecer_dore text,
ADD COLUMN IF NOT EXISTS data_ajuste date,
ADD COLUMN IF NOT EXISTS analista_nome text,
ADD COLUMN IF NOT EXISTS observacoes text;

-- Necessária para handleExcluirAjuste apagar a linha correspondente no banco;
-- sem policy de DELETE a exclusão local reapareceria no próximo reload.
CREATE POLICY "autenticados podem deletar" ON public.ajustes_planilha
  FOR DELETE TO authenticated USING (true);
