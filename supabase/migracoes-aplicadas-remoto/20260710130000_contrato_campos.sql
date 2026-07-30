ALTER TABLE solicitacoes
ADD COLUMN IF NOT EXISTS contrato_data_assinatura date,
ADD COLUMN IF NOT EXISTS contrato_inicio_vigencia date,
ADD COLUMN IF NOT EXISTS contrato_fim_vigencia date,
ADD COLUMN IF NOT EXISTS garantia_validade date,
ADD COLUMN IF NOT EXISTS garantia_valor numeric,
ADD COLUMN IF NOT EXISTS garantia_exigida text,
ADD COLUMN IF NOT EXISTS status_contrato_empresa text
  CHECK (status_contrato_empresa IS NULL OR
         status_contrato_empresa IN ('Ativa','Distratada')),
ADD COLUMN IF NOT EXISTS duracao_obra_meses integer;
