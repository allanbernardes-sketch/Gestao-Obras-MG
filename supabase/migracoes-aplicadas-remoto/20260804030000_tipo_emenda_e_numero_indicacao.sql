-- Atendimento Inicial: a pergunta binária "É Emenda Impositiva?" (Sim/Não) virou uma
-- pergunta categórica "Qual é o tipo de emenda?" (Impositiva / Parceria Por Escolas
-- Melhores / Federal), e ganhou um campo companheiro "Nº de Indicação".
--
-- Reaproveita a coluna emenda_impositiva (renomeada) em vez de criar uma nova, preservando
-- o histórico já cadastrado: registros com 'Sim' viram 'Impositiva' (única categoria que já
-- existia antes); 'Não' não tem equivalente categórico e vira NULL.
ALTER TABLE public.solicitacoes RENAME COLUMN emenda_impositiva TO tipo_emenda;
ALTER TABLE public.solicitacoes DROP CONSTRAINT IF EXISTS solicitacoes_emenda_impositiva_check;

UPDATE public.solicitacoes SET tipo_emenda = 'Impositiva' WHERE tipo_emenda = 'Sim';
UPDATE public.solicitacoes SET tipo_emenda = NULL WHERE tipo_emenda = 'Não';

ALTER TABLE public.solicitacoes ADD CONSTRAINT solicitacoes_tipo_emenda_check
  CHECK ((tipo_emenda IS NULL) OR (tipo_emenda = ANY (ARRAY['Impositiva'::text, 'Parceria Por Escolas Melhores'::text, 'Federal'::text])));

ALTER TABLE public.solicitacoes ADD COLUMN IF NOT EXISTS numero_indicacao_emenda text;
