-- Seed do stack Supabase LOCAL (rodado por `supabase db reset`; ver config.toml [db.seed]).
-- Dados de referência copiados do projeto remoto (ids preservados) + usuários de
-- teste com senha conhecida. ZERO solicitações: cada teste e2e cria as suas.
--
-- Senha de TODOS os usuários de teste: senha-teste-sgo

-- ---------------------------------------------------------------------------
-- 1. Perfis (ids do remoto)
-- ---------------------------------------------------------------------------
insert into perfis (id, codigo, nome_exibicao, descricao) values
('3802eddc-eb87-4eb0-bd9d-083d95992b33','admin','Administrador do Sistema','Acesso total; gerencia usuários, perfis e configurações do SGO'),
('4f3400cd-29aa-442e-97a3-baaf275134e5','administrativo_dore','Administrativo DORE','Suporte administrativo do departamento; acesso restrito a operações auxiliares'),
('4ad95cfb-160e-42fa-b660-4371b7ee8f4a','analista_dore','Analista de Engenharia (DORE)','Realiza a análise técnica, homologação de PAF e acompanha execução'),
('1300db43-e724-488e-9f70-3e13632736da','coordenador_regional','Coordenador Regional','Coordenador da SRE — aprova atendimentos antes de seguirem para análise DORE'),
('6db11572-143d-4894-a895-3b3e881a949a','diretor_dore','Diretor DORE','Diretor da DORE — acesso equivalente ao administrador do sistema'),
('1bba26c8-4838-4348-80e4-7b71a392cbd8','fiscal_obra','Fiscal de Obra','Acompanha a execução física da obra em campo'),
('ec898e00-1bb5-45ef-a047-0d1b9cf633c2','gestor_dore','Gestor de Atendimento (DORE)','Coordena a fila de análise e distribui processos entre analistas'),
('9e12c3b9-6c95-4aaf-ba9a-d079b3baf8f9','gestor_paf','Gestor PAF','Responsável pela autorização e acompanhamento financeiro do PAF'),
('0c59bf53-114f-4cb0-9e83-5e3e42f0a6d3','tecnico_infra','Técnico de Infraestrutura (SRE)','Técnico lotado na SRE; registra e acompanha solicitações da sua regional')
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- 2. Regionais SRE (as 47, ids do remoto)
-- ---------------------------------------------------------------------------
insert into regionais_sre (id, codigo, nome) values
('68ede1e9-f126-4b7e-8c71-744754c44ec4','SRE-01','SRE Almenara'),
('56edd260-8de3-46b6-881d-f8b9a8e1ccae','SRE-02','SRE Araçuaí'),
('2fb80d43-2f5b-416e-9855-165494d840ba','SRE-03','SRE Barbacena'),
('674255d8-ff24-45ac-ae4f-6734dbc1c4b7','SRE-04','SRE Campo Belo'),
('67c73771-42b4-47cc-b31d-55555a652a3a','SRE-05','SRE Carangola'),
('bb246f7a-7b61-42aa-904a-5a42802d6d2d','SRE-06','SRE Caratinga'),
('abee24b1-d6b0-4047-b94d-eed78f68083a','SRE-07','SRE Caxambu'),
('2785c33b-357a-40d2-b4ae-d52ab27644ed','SRE-08','SRE Conselheiro Lafaiete'),
('28cf9a28-a5b7-4ce6-8532-b19c5c9ee92e','SRE-09','SRE Coronel Fabriciano'),
('cd5b0ebb-523b-4b7a-bbf4-f21fab517c5c','SRE-10','SRE Curvelo'),
('a301f6d2-4ac7-4bc0-ab44-8aaba44f5ada','SRE-11','SRE Diamantina'),
('4bc03cf1-28ee-4e70-bc49-8d8c8a3078b2','SRE-12','SRE Divinópolis'),
('bded893e-434f-4e61-b933-053a370399f6','SRE-13','SRE Governador Valadares'),
('0f0072ec-45cb-4e47-9ebb-42e9e102eb28','SRE-14','SRE Guanhães'),
('5d59f0d3-eaf6-445c-8475-3642821ade63','SRE-15','SRE Itajubá'),
('16ca3006-8f43-4626-875b-b0a677d6986b','SRE-16','SRE Ituiutaba'),
('f8396657-5160-4431-8637-fc6efdec250d','SRE-17','SRE Janaúba'),
('88c48bc7-d68e-40fa-a11f-190ff63a8f1d','SRE-18','SRE Januária'),
('bf9d270d-d546-4007-8b7f-a02fe0a32104','SRE-19','SRE Juiz de Fora'),
('082b838b-e50e-4262-9f9b-4d6acea8b238','SRE-20','SRE Leopoldina'),
('b3823541-63a7-47a8-a42c-16df41da7ca4','SRE-21','SRE Manhuaçu'),
('6be34cc0-2dd0-4999-9d41-f96dd02e2fff','SRE-22','SRE Metropolitana A'),
('5e1cbb85-8358-4a6c-8e38-cf8715de4deb','SRE-23','SRE Metropolitana B'),
('8f239331-3952-453b-b30f-639d61c77101','SRE-24','SRE Metropolitana C'),
('05d11c1a-3c50-4f87-9b2b-0bf1d3df669d','SRE-25','SRE Monte Carmelo'),
('b89ecc18-1f2d-471a-ab89-71f27b50cb8e','SRE-26','SRE Montes Claros'),
('fa39e91d-deda-4316-a6b4-2f3b62b25f1f','SRE-27','SRE Muriaé'),
('dc181d48-aae3-4ca2-9eb4-05e3c9c5c5ad','SRE-28','SRE Nova Era'),
('ebce4c5b-4f25-40aa-80fc-d7feeced9a57','SRE-29','SRE Ouro Preto'),
('af335cd3-1474-4670-8393-42d54b9f4657','SRE-30','SRE Pará de Minas'),
('5bf2c584-e39f-4025-9fee-3672d6f048ff','SRE-31','SRE Paracatu'),
('4278699f-474c-45ed-b7fa-8781c5174fc8','SRE-32','SRE Passos'),
('85550cb8-d63d-4eea-be72-d3cbb382100f','SRE-33','SRE Patos de Minas'),
('09e29ee3-0038-466d-a8e0-24d0669865eb','SRE-34','SRE Patrocínio'),
('4391193b-fa55-435e-8f73-d3dba9abd794','SRE-35','SRE Pirapora'),
('19166673-aa1e-41a8-abce-32e8682eeaf3','SRE-36','SRE Poços de Caldas'),
('3f3bb28d-8247-4ff3-87fd-4564af11ac1e','SRE-37','SRE Ponte Nova'),
('9ccb16fa-2a28-4429-b13e-3024d383ae45','SRE-38','SRE Pouso Alegre'),
('79ac840d-e6e2-4267-b55b-d24477e867ec','SRE-39','SRE São João del Rei'),
('41f741c1-9f08-4dd4-a8f7-7032eff6b9d4','SRE-40','SRE São Sebastião do Paraíso'),
('466e8803-01f2-40d1-801c-6b6df11b89f9','SRE-41','SRE Sete Lagoas'),
('4fa9bda4-9816-4673-89b6-7e2ec2b47265','SRE-42','SRE Teófilo Otoni'),
('4bb1b495-74d0-4931-8f7e-23a8aa1988da','SRE-43','SRE Ubá'),
('420f52c0-d573-4439-ae88-bdd74bf645f1','SRE-44','SRE Uberaba'),
('783daa31-c966-44f2-b7f4-07b85a8743ab','SRE-45','SRE Uberlândia'),
('d8c5f2f8-3c5e-45f7-b8f4-b68094038e63','SRE-46','SRE Unaí'),
('d5be1c60-561a-4880-b52b-0d19165c1cc5','SRE-47','SRE Varginha')
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- 3. Tipos de obra (nota IEE)
-- ---------------------------------------------------------------------------
insert into tipos_obra (id, nome, nota_iee) values
('349eb253-0967-4479-a45e-821bec86abc6','ENGENHEIRO PARA ELABORAÇÃO DE PROJETO',1.0),
('f51ae2af-3ff6-4834-8799-dd8a672ed9ff','ACESSIBILIDADE',2.0),
('0bc0f3ac-3896-4cda-a77f-cb34b09946e1','REFORMA',3.0),
('d336b734-c56e-4eda-b899-5b5f83107b06','AMPLIAÇÃO',4.0),
('28552f9c-dc73-4316-b501-219804aaf322','QUADRA',4.0),
('e72945c7-baa8-4fb2-bb8c-43ed88951f5b','CONSTRUÇÃO',5.0)
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- 4. Escolas — amostra real: 15 da SRE METROPOLITANA B + 5 da SRE METROPOLITANA A.
--    Atenção: o campo `sre` fica em CAIXA ALTA de propósito (é assim no remoto;
--    o app normaliza acentos/caixa via normalizarSre).
-- ---------------------------------------------------------------------------
insert into escolas (id, codesc, nome, municipio, sre, ativo) values
('3dc3eb9f-df15-4a5c-9ef8-45379b4dff28','31000027','EE AARÃO REIS','BELO HORIZONTE','SRE METROPOLITANA B',true),
('39e594e0-3186-4830-8612-153d39bc7300','31000051','EE GUIA LOPES','BELO HORIZONTE','SRE METROPOLITANA B',true),
('d8edb110-cd1a-49f3-b641-08ea762f3a62','31000108','EE SANDRA RISOLETA DE LIMA HAUCK','BELO HORIZONTE','SRE METROPOLITANA B',true),
('707d68b3-b546-476f-8e0d-db14c75cf5a4','31000116','EE CABANA DO PAI TOMÁS','BELO HORIZONTE','SRE METROPOLITANA B',true),
('27f511c3-60e9-4b22-904e-0061ab6c70de','31000124','EE DOUTOR SIMÃO TAMM BIAS FORTES','BELO HORIZONTE','SRE METROPOLITANA B',true),
('57073f53-aea2-4642-87de-4f02ca2fdedf','31000132','EE GUIMARÃES ROSA','BELO HORIZONTE','SRE METROPOLITANA B',true),
('d88445da-587a-4a4e-ae0a-eb87b0d00b22','31000159','EE MANUEL CASASANTA','BELO HORIZONTE','SRE METROPOLITANA B',true),
('3c2a3a86-d917-428e-867f-ee6e1d346f7c','31000183','EE DOUTOR AMARO NEVES BARRETO','BELO HORIZONTE','SRE METROPOLITANA B',true),
('33a3f4c5-cb3d-4cb4-84c8-8763b07e755b','31000191','EE CAIO NELSON DE SENA','BELO HORIZONTE','SRE METROPOLITANA B',true),
('9cf7f393-71ed-427c-add8-447547558eae','31000256','EE JOSÉ MIGUEL DO NASCIMENTO','BELO HORIZONTE','SRE METROPOLITANA B',true),
('88aac8d5-af85-4371-8f60-7d501bdb8449','31000299','EE HERMENEGILDO CHAVES','BELO HORIZONTE','SRE METROPOLITANA B',true),
('9b6843ea-52c8-41cf-9106-ec8aeda41b77','31000311','EE MARGARIDA BROCHADO','BELO HORIZONTE','SRE METROPOLITANA B',true),
('0994038d-707e-4684-8840-309710035551','31000329','EE SANTOS ANJOS','BELO HORIZONTE','SRE METROPOLITANA B',true),
('0b2520b6-3d04-49ed-9bcf-369ea165c4a4','31000400','EE SÃO BENTO','BELO HORIZONTE','SRE METROPOLITANA B',true),
('6a030790-8671-4e0f-b95a-b94ce9c03ac9','31000426','EE ALBERTO DELPINO','BELO HORIZONTE','SRE METROPOLITANA B',true),
('107e273d-097d-4f2c-9c88-65b5a2ecb488','31000035','EE BUENO BRANDÃO','BELO HORIZONTE','SRE METROPOLITANA A',true),
('89c0dd30-abfa-40f4-ad60-8e28bdc214a4','31000060','EE PERO VAZ DE CAMINHA','BELO HORIZONTE','SRE METROPOLITANA A',true),
('41b137fd-9283-4193-88ee-df56feee87e0','31000078','EE MAJOR DELFINO DE PAULA RICARDO','BELO HORIZONTE','SRE METROPOLITANA A',true),
('c6ddf97e-7878-4392-93a8-7f1cb0bd0f63','31000086','EE PROFESSOR JOSÉ MESQUITA DE CARVALHO','BELO HORIZONTE','SRE METROPOLITANA A',true),
('77520c35-c7ad-4572-a401-be0d494167c9','31000175','EE MARIA DE LOURDES DE OLIVEIRA','BELO HORIZONTE','SRE METROPOLITANA A',true)
on conflict (id) do nothing;

insert into enderecos_escola (id, codigo_endereco, escola_id, codesc, descricao, ativo) values
('7bf8229a-ad44-43a6-a5a5-40ac34a3d19f','285','3dc3eb9f-df15-4a5c-9ef8-45379b4dff28','31000027','Principal',true),
('310b6a44-cf0c-4cc5-88d0-ccef32e745e8','386','39e594e0-3186-4830-8612-153d39bc7300','31000051','Principal',true),
('05afe6cf-df9e-47c6-afce-f0473fc2c0d4','370','d8edb110-cd1a-49f3-b641-08ea762f3a62','31000108','Principal',true),
('9ee13251-5803-4a38-97ce-884723c715af','250','707d68b3-b546-476f-8e0d-db14c75cf5a4','31000116','Principal',true),
('5ca2989b-f707-4c77-bf53-1793625d1411','280','27f511c3-60e9-4b22-904e-0061ab6c70de','31000124','Principal',true),
('a85ddac4-3366-47ac-bd82-3e01e159ad05','318','57073f53-aea2-4642-87de-4f02ca2fdedf','31000132','Principal',true),
('6e5f03da-4ad9-4e5a-a081-f94166437ca1','330','d88445da-587a-4a4e-ae0a-eb87b0d00b22','31000159','Principal',true),
('90fbd28e-56c6-4b94-9317-4dffbf7173d6','276','3c2a3a86-d917-428e-867f-ee6e1d346f7c','31000183','Principal',true),
('07961568-a9ad-4661-a11a-b7a40bd0de1c','251','33a3f4c5-cb3d-4cb4-84c8-8763b07e755b','31000191','Principal',true),
('5c6da021-8979-4943-a805-82ab0ea1d1ca','397','9cf7f393-71ed-427c-add8-447547558eae','31000256','Principal',true),
('75247705-8744-43d5-918b-4d5e377ba6a6','321','88aac8d5-af85-4371-8f60-7d501bdb8449','31000299','Principal',true),
('6f4bd13d-8498-40d3-8f1f-27de129662de','331','9b6843ea-52c8-41cf-9106-ec8aeda41b77','31000311','Principal',true),
('e2dedb14-d301-497b-b73d-0cc187595fe9','449','0994038d-707e-4684-8840-309710035551','31000329','Principal',true),
('4e3b53b1-d1ba-4f8e-bda1-5e66e358f08a','371','0b2520b6-3d04-49ed-9bcf-369ea165c4a4','31000400','Principal',true),
('f4a3a899-e71e-4ae6-b229-6e5df4d116b4','289','6a030790-8671-4e0f-b95a-b94ce9c03ac9','31000426','Principal',true),
('a511bbde-936c-494d-81b9-a9efca0af5da','249','107e273d-097d-4f2c-9c88-65b5a2ecb488','31000035','Principal',true),
('0664cb7e-ea04-42a8-8dac-f47d7fda503d','426','89c0dd30-abfa-40f4-ad60-8e28bdc214a4','31000060','Principal',true),
('3e46d86b-a751-41f9-bc21-8e6728cf75de','404','41b137fd-9283-4193-88ee-df56feee87e0','31000078','Principal',true),
('95a37822-7122-466a-b9f4-921b9c60406e','435','c6ddf97e-7878-4392-93a8-7f1cb0bd0f63','31000086','Principal',true),
('ad25c3d9-e3a2-438a-b800-a6c409f4ef30','409','77520c35-c7ad-4572-a401-be0d494167c9','31000175','Principal',true)
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- 5. Usuários de teste — auth.users + auth.identities + public.usuarios.
--    uuids fixos ...0001–...0010; public.usuarios.id DEVE ser igual a auth.users.id
--    (não há trigger handle_new_user). Tokens são '' e não NULL (GoTrue quebra
--    o scan com NULL); crypt/gen_salt vivem no schema extensions no stack local.
-- ---------------------------------------------------------------------------
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change, email_change_token_new,
  email_change_token_current, phone_change, phone_change_token,
  reauthentication_token, is_sso_user, is_anonymous
)
select
  '00000000-0000-0000-0000-000000000000', u.id::uuid, 'authenticated', 'authenticated',
  u.email, extensions.crypt('senha-teste-sgo', extensions.gen_salt('bf')), now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  jsonb_build_object('nome', u.nome), now(), now(),
  '', '', '', '', '', '', '', '', false, false
from (values
  ('00000000-0000-0000-0000-000000000001','tecnicoregional@educacao.mg.gov.br','João Técnico'),
  ('00000000-0000-0000-0000-000000000002','coordenador@educacao.mg.gov.br','Coordenador Teste'),
  ('00000000-0000-0000-0000-000000000003','gestordore@educacao.mg.gov.br','Aline'),
  ('00000000-0000-0000-0000-000000000004','analistadore@educacao.mg.gov.br','Flavia Analista Teste'),
  ('00000000-0000-0000-0000-000000000005','gestorpaf@educacao.mg.gov.br','Silas'),
  ('00000000-0000-0000-0000-000000000006','administrativo@educacao.mg.gov.br','Rui'),
  ('00000000-0000-0000-0000-000000000007','diretor@educacao.mg.gov.br','Diretor Teste'),
  ('00000000-0000-0000-0000-000000000008','sofia.viana@educacao.mg.gov.br','Administrador SGO'),
  ('00000000-0000-0000-0000-000000000009','fiscal@educacao.mg.gov.br','Fiscal de Obras Teste'),
  ('00000000-0000-0000-0000-000000000010','tecnico.sre-a@educacao.mg.gov.br','Técnico SRE A')
) as u(id, email, nome)
on conflict (id) do nothing;

insert into auth.identities (provider_id, user_id, identity_data, provider,
  last_sign_in_at, created_at, updated_at)
select id::text, id,
  jsonb_build_object('sub', id::text, 'email', email, 'email_verified', true),
  'email', now(), now(), now()
from auth.users
where email like '%@educacao.mg.gov.br'
on conflict (provider_id, provider) do nothing;

insert into usuarios (id, nome, email, perfil_id, capacidade_maxima_iee, ativo)
select u.id::uuid, u.nome, u.email,
  (select id from perfis where codigo = u.perfil), 10, true
from (values
  ('00000000-0000-0000-0000-000000000001','João Técnico','tecnicoregional@educacao.mg.gov.br','tecnico_infra'),
  ('00000000-0000-0000-0000-000000000002','Coordenador Teste','coordenador@educacao.mg.gov.br','coordenador_regional'),
  ('00000000-0000-0000-0000-000000000003','Aline','gestordore@educacao.mg.gov.br','gestor_dore'),
  ('00000000-0000-0000-0000-000000000004','Flavia Analista Teste','analistadore@educacao.mg.gov.br','analista_dore'),
  ('00000000-0000-0000-0000-000000000005','Silas','gestorpaf@educacao.mg.gov.br','gestor_paf'),
  ('00000000-0000-0000-0000-000000000006','Rui','administrativo@educacao.mg.gov.br','administrativo_dore'),
  ('00000000-0000-0000-0000-000000000007','Diretor Teste','diretor@educacao.mg.gov.br','diretor_dore'),
  ('00000000-0000-0000-0000-000000000008','Administrador SGO','sofia.viana@educacao.mg.gov.br','admin'),
  ('00000000-0000-0000-0000-000000000009','Fiscal de Obras Teste','fiscal@educacao.mg.gov.br','fiscal_obra'),
  ('00000000-0000-0000-0000-000000000010','Técnico SRE A','tecnico.sre-a@educacao.mg.gov.br','tecnico_infra')
) as u(id, nome, email, perfil)
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- 6. Vínculos usuário × SRE (absorve a migração seed_usuario_regionais da
--    Frente 1). João Técnico e Coordenador → SRE Metropolitana B; o Técnico
--    SRE A existe para o teste do filtro regional.
-- ---------------------------------------------------------------------------
insert into usuario_regionais (usuario_id, sre_id) values
('00000000-0000-0000-0000-000000000001','5e1cbb85-8358-4a6c-8e38-cf8715de4deb'),
('00000000-0000-0000-0000-000000000002','5e1cbb85-8358-4a6c-8e38-cf8715de4deb'),
('00000000-0000-0000-0000-000000000010','6be34cc0-2dd0-4999-9d41-f96dd02e2fff')
on conflict do nothing;

-- 7. Zero solicitações: cada teste e2e cria as suas.
