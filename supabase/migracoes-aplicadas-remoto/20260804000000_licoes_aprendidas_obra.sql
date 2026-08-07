-- TABELA: licoes_aprendidas_obra
-- Registro de lições aprendidas preenchido pelo engenheiro na aba de mesmo nome
-- em Acompanhamento da Obra. Usado como condicional para liberar o encerramento
-- da obra (pelo menos 1 lição aprendida registrada).
CREATE TABLE public.licoes_aprendidas_obra (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  solicitacao_id uuid NOT NULL REFERENCES public.solicitacoes(id),
  descricao text NOT NULL,
  categoria text,
  usuario_id uuid REFERENCES public.usuarios(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.licoes_aprendidas_obra ENABLE ROW LEVEL SECURITY;

CREATE POLICY "autenticados podem ler" ON public.licoes_aprendidas_obra
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "autenticados podem inserir" ON public.licoes_aprendidas_obra
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "autenticados podem atualizar" ON public.licoes_aprendidas_obra
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "autenticados podem deletar licoes aprendidas" ON public.licoes_aprendidas_obra
  FOR DELETE TO authenticated USING (true);
