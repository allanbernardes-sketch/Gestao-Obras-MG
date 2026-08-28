-- Painel de Controle do Coordenador (planilha de acompanhamento de priorização/vistoria/DORE)
-- na tela de chamados. Campos livres de acompanhamento, sem impacto no fluxo de status/histórico
-- já existente (atualizarStatusChamado continua sendo o único caminho que grava chamado_historico).
-- Ver [[modulo-chamados]].

create type chamado_farol as enum ('verde', 'amarelo', 'vermelho');
create type chamado_status_vistoria as enum ('planejado', 'replanejado', 'realizado', 'aguardando');

alter table public.chamados
  add column tipo_obra text,
  add column pontuacao_atual integer,
  add column primeiro_retorno_ate date,
  add column engenheiro_fiscal_escola text,
  add column pontuacao_ajustada integer,
  add column farol_vistoria chamado_farol,
  add column farol_processo chamado_farol,
  add column data_planejada_vistoria date,
  add column data_replanejada_vistoria date,
  add column data_real_vistoria date,
  add column status_vistoria chamado_status_vistoria,
  add column numero_sei_processo_dore text,
  add column data_envio_dore date;
