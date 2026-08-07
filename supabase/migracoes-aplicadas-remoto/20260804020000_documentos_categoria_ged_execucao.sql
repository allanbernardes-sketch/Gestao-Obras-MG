-- Nova categoria de documento para o checklist obrigatório da GED (Execução → Documentações),
-- ex.: ART, Projetos de Execução do Objeto. Anexado pelo fiscal da obra; itens obrigatórios
-- pendentes bloqueiam o checklist de Conclusão de Obra (ver SolicitacaoDetalhes.tsx).
--
-- ALTER TYPE ... ADD VALUE precisa rodar isolado (não pode ser combinado, na mesma transação,
-- com um uso do valor novo) — por isso esta migration só adiciona o valor ao enum.
ALTER TYPE public.documento_categoria ADD VALUE IF NOT EXISTS 'ged_execucao';
