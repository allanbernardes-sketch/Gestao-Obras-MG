ALTER TABLE reequilibrios_financeiros
ADD COLUMN IF NOT EXISTS data_referencia_see date,
ADD COLUMN IF NOT EXISTS desconto_contratual numeric,
ADD COLUMN IF NOT EXISTS valor_original numeric,
ADD COLUMN IF NOT EXISTS analista_nome text;

ALTER TABLE saldos_complementares
ADD COLUMN IF NOT EXISTS valor_tc numeric,
ADD COLUMN IF NOT EXISTS valor_liberado numeric,
ADD COLUMN IF NOT EXISTS valor_pago numeric,
ADD COLUMN IF NOT EXISTS saldo_em_conta numeric,
ADD COLUMN IF NOT EXISTS necessidade_aditivo numeric,
ADD COLUMN IF NOT EXISTS analista_nome text,
ADD COLUMN IF NOT EXISTS documentos_checklist jsonb
  DEFAULT '[]';

CREATE POLICY "autenticados podem deletar reequilibrios"
ON reequilibrios_financeiros FOR DELETE
TO authenticated USING (true);

CREATE POLICY "autenticados podem deletar saldos"
ON saldos_complementares FOR DELETE
TO authenticated USING (true);
