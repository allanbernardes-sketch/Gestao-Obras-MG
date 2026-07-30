-- Vincula os usuários regionais de teste às suas SREs.
-- A tabela usuario_regionais estava vazia, o que deixava o filtro regional sem efeito.
-- Inserts são inofensivos em ambientes onde os e-mails não existem (inserem 0 linhas).

insert into usuario_regionais (usuario_id, sre_id)
select u.id, r.id
from usuarios u, regionais_sre r
where u.email = 'tecnicoregional@educacao.mg.gov.br'
  and r.nome = 'SRE Metropolitana B'
on conflict do nothing;

insert into usuario_regionais (usuario_id, sre_id)
select u.id, r.id
from usuarios u, regionais_sre r
where u.email = 'coordenador@educacao.mg.gov.br'
  and r.nome = 'SRE Metropolitana B'
on conflict do nothing;
