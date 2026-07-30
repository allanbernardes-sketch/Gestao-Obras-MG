-- A coluna resultado já existia (do esquema antigo de aprovação/reprovação) com
-- DEFAULT 'pendente'; a migration anterior usava ADD COLUMN IF NOT EXISTS, que não
-- altera o default de uma coluna já existente. Ajusta explicitamente para 'emitido'.
ALTER TABLE public.vistorias_obra ALTER COLUMN resultado SET DEFAULT 'emitido';
