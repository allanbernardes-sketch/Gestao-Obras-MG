-- Persiste os campos da aba "Conclusão de Obra" (que até então só existiam no front-end/
-- localStorage, sem coluna correspondente em public.solicitacoes) e adiciona os campos do
-- Termo de Aceite Provisório e do Termo de Aceite Definitivo.
--
-- Regra de negócio: o Termo de Aceite Definitivo só pode ser emitido 90 dias corridos após
-- a data do Termo de Aceite Provisório — aplicada no front-end (SolicitacaoDetalhes.tsx);
-- aqui só garantimos a coluna que guarda a data que ancora essa contagem.
ALTER TABLE public.solicitacoes
  ADD COLUMN IF NOT EXISTS data_conclusao date,
  ADD COLUMN IF NOT EXISTS laudo_conclusivo_file_name text,
  ADD COLUMN IF NOT EXISTS laudo_conclusivo_file_size text,
  ADD COLUMN IF NOT EXISTS laudo_conclusivo_uploaded_at date,
  ADD COLUMN IF NOT EXISTS relatorio_fotografico_file_name text,
  ADD COLUMN IF NOT EXISTS relatorio_fotografico_file_size text,
  ADD COLUMN IF NOT EXISTS relatorio_fotografico_uploaded_at date,
  ADD COLUMN IF NOT EXISTS planilha_medicao_final_file_name text,
  ADD COLUMN IF NOT EXISTS planilha_medicao_final_file_size text,
  ADD COLUMN IF NOT EXISTS planilha_medicao_final_uploaded_at date,
  ADD COLUMN IF NOT EXISTS termo_aceite_provisorio_data date,
  ADD COLUMN IF NOT EXISTS termo_aceite_provisorio_file_name text,
  ADD COLUMN IF NOT EXISTS termo_aceite_provisorio_file_size text,
  ADD COLUMN IF NOT EXISTS termo_aceite_provisorio_uploaded_at date,
  ADD COLUMN IF NOT EXISTS termo_aceite_definitivo_data date,
  ADD COLUMN IF NOT EXISTS termo_aceite_definitivo_file_name text,
  ADD COLUMN IF NOT EXISTS termo_aceite_definitivo_file_size text,
  ADD COLUMN IF NOT EXISTS termo_aceite_definitivo_uploaded_at date;
