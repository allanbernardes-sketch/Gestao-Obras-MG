-- TABELA 1: medicoes
CREATE TABLE public.medicoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  solicitacao_id uuid NOT NULL REFERENCES public.solicitacoes(id),
  numero_medicao int NOT NULL,
  valor numeric NOT NULL CHECK (valor > 0),
  data_medicao date,
  status text NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente','aprovada','recusada')),
  observacao text,
  usuario_id uuid REFERENCES public.usuarios(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.medicoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "autenticados podem ler" ON public.medicoes
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "autenticados podem inserir" ON public.medicoes
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "autenticados podem atualizar" ON public.medicoes
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- TABELA 2: aditivos
CREATE TABLE public.aditivos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  solicitacao_id uuid NOT NULL REFERENCES public.solicitacoes(id),
  numero_aditivo int NOT NULL,
  tipo text CHECK (tipo IN ('valor','prazo','valor_prazo')),
  valor_adicional numeric,
  prazo_adicional_dias int,
  motivo text,
  status text NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente','aprovado','recusado')),
  analista_id uuid REFERENCES public.usuarios(id),
  usuario_id uuid REFERENCES public.usuarios(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.aditivos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "autenticados podem ler" ON public.aditivos
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "autenticados podem inserir" ON public.aditivos
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "autenticados podem atualizar" ON public.aditivos
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- TABELA 3: ajustes_planilha
CREATE TABLE public.ajustes_planilha (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  solicitacao_id uuid NOT NULL REFERENCES public.solicitacoes(id),
  numero_ajuste int NOT NULL,
  descricao text,
  valor_ajuste numeric,
  status text NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente','aprovado','recusado')),
  analista_id uuid REFERENCES public.usuarios(id),
  usuario_id uuid REFERENCES public.usuarios(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.ajustes_planilha ENABLE ROW LEVEL SECURITY;

CREATE POLICY "autenticados podem ler" ON public.ajustes_planilha
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "autenticados podem inserir" ON public.ajustes_planilha
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "autenticados podem atualizar" ON public.ajustes_planilha
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- TABELA 4: diarios_obra
CREATE TABLE public.diarios_obra (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  solicitacao_id uuid NOT NULL REFERENCES public.solicitacoes(id),
  data_registro date NOT NULL,
  conteudo text NOT NULL,
  clima text,
  percentual_execucao numeric CHECK (percentual_execucao >= 0 AND percentual_execucao <= 100),
  usuario_id uuid REFERENCES public.usuarios(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.diarios_obra ENABLE ROW LEVEL SECURITY;

CREATE POLICY "autenticados podem ler" ON public.diarios_obra
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "autenticados podem inserir" ON public.diarios_obra
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "autenticados podem atualizar" ON public.diarios_obra
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- TABELA 5: restricoes_obra
CREATE TABLE public.restricoes_obra (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  solicitacao_id uuid NOT NULL REFERENCES public.solicitacoes(id),
  descricao text NOT NULL,
  tipo text,
  status text NOT NULL DEFAULT 'ativa' CHECK (status IN ('ativa','resolvida')),
  data_abertura date,
  data_resolucao date,
  usuario_id uuid REFERENCES public.usuarios(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.restricoes_obra ENABLE ROW LEVEL SECURITY;

CREATE POLICY "autenticados podem ler" ON public.restricoes_obra
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "autenticados podem inserir" ON public.restricoes_obra
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "autenticados podem atualizar" ON public.restricoes_obra
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- TABELA 6: vistorias_obra
CREATE TABLE public.vistorias_obra (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  solicitacao_id uuid NOT NULL REFERENCES public.solicitacoes(id),
  data_vistoria date NOT NULL,
  resultado text NOT NULL DEFAULT 'pendente' CHECK (resultado IN ('aprovada','reprovada','pendente')),
  observacoes text,
  usuario_id uuid REFERENCES public.usuarios(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.vistorias_obra ENABLE ROW LEVEL SECURITY;

CREATE POLICY "autenticados podem ler" ON public.vistorias_obra
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "autenticados podem inserir" ON public.vistorias_obra
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "autenticados podem atualizar" ON public.vistorias_obra
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- TABELA 7: reequilibrios_financeiros
CREATE TABLE public.reequilibrios_financeiros (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  solicitacao_id uuid NOT NULL REFERENCES public.solicitacoes(id),
  valor_reequilibrio numeric NOT NULL,
  motivo text,
  status text NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente','aprovado','recusado')),
  analista_id uuid REFERENCES public.usuarios(id),
  usuario_id uuid REFERENCES public.usuarios(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.reequilibrios_financeiros ENABLE ROW LEVEL SECURITY;

CREATE POLICY "autenticados podem ler" ON public.reequilibrios_financeiros
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "autenticados podem inserir" ON public.reequilibrios_financeiros
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "autenticados podem atualizar" ON public.reequilibrios_financeiros
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- TABELA 8: saldos_complementares
CREATE TABLE public.saldos_complementares (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  solicitacao_id uuid NOT NULL REFERENCES public.solicitacoes(id),
  valor_saldo numeric NOT NULL,
  descricao text,
  status text NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente','aprovado','recusado')),
  usuario_id uuid REFERENCES public.usuarios(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.saldos_complementares ENABLE ROW LEVEL SECURITY;

CREATE POLICY "autenticados podem ler" ON public.saldos_complementares
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "autenticados podem inserir" ON public.saldos_complementares
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "autenticados podem atualizar" ON public.saldos_complementares
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
