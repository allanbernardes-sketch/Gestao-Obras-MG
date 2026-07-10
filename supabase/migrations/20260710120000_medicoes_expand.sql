ALTER TABLE medicoes
ADD COLUMN IF NOT EXISTS descricao text,
ADD COLUMN IF NOT EXISTS empresa_nome text,
ADD COLUMN IF NOT EXISTS empresa_cnpj text,
ADD COLUMN IF NOT EXISTS periodo_medicao text,
ADD COLUMN IF NOT EXISTS responsavel_medicao text,
ADD COLUMN IF NOT EXISTS porcentagem numeric
  CHECK (porcentagem IS NULL OR porcentagem BETWEEN 0 AND 100),
ADD COLUMN IF NOT EXISTS porcentagem_fisica numeric
  CHECK (porcentagem_fisica IS NULL OR porcentagem_fisica BETWEEN 0 AND 100),
ADD COLUMN IF NOT EXISTS numero_medicao_display text;
