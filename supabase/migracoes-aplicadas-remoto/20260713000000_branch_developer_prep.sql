ALTER TABLE solicitacoes
ADD COLUMN IF NOT EXISTS status_aprovacao_regional text
  CHECK (status_aprovacao_regional IS NULL OR
         status_aprovacao_regional IN ('pendente','aprovado','reprovado')),
ADD COLUMN IF NOT EXISTS coordenador_aprovador text,
ADD COLUMN IF NOT EXISTS data_aprovacao_regional date,
ADD COLUMN IF NOT EXISTS justificativa_reprovacao_regional text;

INSERT INTO perfis (codigo, nome_exibicao, descricao)
VALUES
  ('coordenador_regional', 'Coordenador Regional',
   'Coordenador da SRE — aprova atendimentos antes de seguirem para análise DORE'),
  ('diretor_dore', 'Diretor DORE',
   'Diretor da DORE — acesso equivalente ao administrador do sistema')
ON CONFLICT (codigo) DO NOTHING;

ALTER TYPE perfil_usuario
ADD VALUE IF NOT EXISTS 'coordenador_regional';

ALTER TYPE perfil_usuario
ADD VALUE IF NOT EXISTS 'diretor_dore';
