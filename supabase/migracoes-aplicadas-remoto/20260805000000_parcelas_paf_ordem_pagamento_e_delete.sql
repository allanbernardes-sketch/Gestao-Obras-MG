-- parcelas_paf existia desde a baseline mas nunca era sincronizada pelo front-end (o campo
-- parcelasPAF só vivia em React state + localStorage). Ao ligar a sincronização real
-- (sincronizarParcelasDaSolicitacao em persistencia.ts, replace-set como documentos/histórico),
-- faltavam duas coisas nessa tabela:
--   1. Coluna para o nº da ordem de pagamento (ParcelaPAF.ordemPagamento no front-end).
--   2. Policy de DELETE — sem ela, o replace-set (remove linhas antigas fora do conjunto atual
--      re-inserido) falha silenciosamente sob RLS.
ALTER TABLE public.parcelas_paf ADD COLUMN IF NOT EXISTS ordem_pagamento text;

CREATE POLICY "autenticados podem deletar parcelas_paf"
  ON public.parcelas_paf FOR DELETE
  TO authenticated
  USING (true);
