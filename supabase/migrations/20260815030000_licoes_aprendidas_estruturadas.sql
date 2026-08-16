-- Aprimora o registro de Lições Aprendidas (Acompanhamento de Obras): antes só havia categoria
-- (administrativa) + descrição livre. Adiciona:
--   - etapas_servico: checklist (multisseleção) das etapas/serviços de obra a que a lição se refere
--     (telhado, terraplenagem, fundação, concretagem, estrutura, instalações etc.);
--   - natureza: classifica a lição como 'oportunidade_melhoria' ou 'risco_materializado' — não
--     qualifica a obra/responsável, só indica como o aprendizado deve orientar obras futuras;
--   - recomendacao: orientação/ação futura decorrente da lição;
--   - evidencias: fotos/vídeos/outros registros documentando a experiência (mesmo padrão simulado
--     de upload — nome/tamanho — usado no restante do sistema).
--
-- Ver [[licoes-aprendidas-estruturadas]] na memória do projeto.

alter table public.licoes_aprendidas_obra
  add column etapas_servico jsonb not null default '[]'::jsonb,
  add column natureza text,
  add column recomendacao text,
  add column evidencias jsonb not null default '[]'::jsonb;

alter table public.licoes_aprendidas_obra add constraint licoes_aprendidas_obra_natureza_check
  CHECK ((natureza IS NULL) OR (natureza = ANY (ARRAY['oportunidade_melhoria'::text, 'risco_materializado'::text])));
