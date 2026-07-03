# Relatório de Gaps — Schema do banco × `src/types.ts` (protótipo)

> **Data:** 2026-07-02
> **Comparação:** schema Postgres do Supabase (20 tabelas) × modelo de domínio do protótipo ([src/types.ts](../../src/types.ts)).
> **Objetivo:** mapear o que já está no banco, o que falta, e as divergências que a integração app↔banco (Recorte #1) precisa resolver.

## Resumo executivo

São **dois paradigmas de modelagem** para o mesmo domínio:

| | Protótipo (`types.ts`) | Banco (Postgres) |
|---|---|---|
| Forma | 1 objeto gigante `Solicitacao` com **coleções aninhadas** | **Relacional normalizado** (tabelas-filhas + lookups) |
| Pessoas | strings de nome (`analistaAtribuido: "João"`) | **uuid FK** → `usuarios` (↔ `auth.users`) |
| Arquivos | triplas `xFileName/xFileSize/xUploadedAt` espalhadas | tabela **`documentos`** com storage/checksum |
| Enums | uniões de string TS | **tipos ENUM** + check constraints |
| Nomes | `camelCase` | `snake_case` |
| Referências | texto livre (`sre`, `municipio`, `tipo`) | FK + `escolas`/`enderecos_escola` (3.4k/3.9k linhas) |

**Manchete:** o banco está **à frente** no fluxo até PAF (Recorte #1) e **atrás** na Execução (Recorte #2) — todo o bloco de execução existe no protótipo como arrays aninhados, mas **não tem tabela** no banco. E nenhum lado está conectado ao outro (o app ainda usa `localStorage`).

---

## Gap 1 — Coleções aninhadas do protótipo → tabelas (parcial)

Cada array dentro de `Solicitacao` deveria virar uma tabela. Situação:

| Coleção no protótipo | Tabela no banco | Situação |
|---|---|---|
| `historicoEtapas[]` | `solicitacao_historico_etapas` | ✅ mapeado (banco é mais rico: `etapa_anterior`, `usuario_id`, `observacao`) |
| `documentos[]` + `outrosDocumentos[]` | `documentos` (via `categoria`) | ✅ mapeado (ver Gap 5 para campos perdidos) |
| *(correção — sem tipo no protótipo, tratada ad-hoc)* | `solicitacao_historico_correcoes` + `historico_correcao_motivos` + `historico_correcao_docs_recusados` | ✅ **banco formalizou** o que o protótipo fazia solto |
| *(retorno administrativo — inexistente no protótipo)* | `solicitacao_retornos_administrativos` | ✅ só no banco |
| `pago: boolean` | `parcelas_paf` | ⚠️ divergente (ver Gap 2) |
| `medicoes[]` (`Medicao`) | ❌ **sem tabela** | 🔴 GAP (Execução) |
| `aditivos[]` (`Aditivo`) | ❌ **sem tabela** (só `documentos.aditivo_id` pendurado) | 🔴 GAP (Execução) |
| `ajustes[]` (`AjustePlanilha`) | ❌ **sem tabela** (só `documentos.ajuste_id` pendurado) | 🔴 GAP (Execução) |
| `empresasAnteriores[]` (contratos/distratos) | ❌ **sem tabela** (`contratos`) | 🔴 GAP (Execução) |
| `diariosObra[]` | ❌ **sem tabela** | 🔴 GAP (Execução) |
| `restricoesObra[]` | ❌ **sem tabela** | 🔴 GAP (Execução) |
| `vistoriasObra[]` | ❌ **sem tabela** | 🔴 GAP (Execução) |

**Conclusão:** o banco cobre o núcleo (cadastro → análise → correção → PAF). **Toda a Execução (Recorte #2)** está modelada só no protótipo. As colunas `documentos.aditivo_id/ajuste_id` e `solicitacoes.imovel_id` são "ganchos" para tabelas que ainda não existem.

---

## Gap 2 — Enums / domínios divergentes

| Conceito | Protótipo | Banco | Divergência |
|---|---|---|---|
| Etapa | `EtapaProcesso` (8) | enum `etapa_processo` (8) | ✅ idênticos |
| Status documento | 4 valores | enum `documento_status` (4) | ✅ idênticos |
| **Status da obra** | `'Não Iniciada' \| 'Em Andamento' \| 'Paralisada' \| 'Concluída'` (4, Title Case) | enum `status_obra_computado`: `nao_iniciada, em_andamento, paralisada, concluida, **distratada**` (5, snake) | ⚠️ casing/acentos diferentes + banco tem `distratada` |
| **Status PAF** | `'Aguardando Geração' \| 'Aguardando Pagamento' \| 'Pago e Liberado'` (3) | check `status_paf`: +`'Pago Parcialmente'` (4) | ⚠️ banco suporta pagamento parcial (coerente com `parcelas_paf`); protótipo usa `pago: boolean` |
| **Validações da análise** | **8 campos** (`validacaoEscolar, Patrimonial, FormaOcupacao, PredioEscola, Tombamento, Coabitado, Tecnica, ReferenciaDotacao`), enum de **3** (`validado/nao_validado/editado`) | **4 colunas** (`status_identificacao_escolar, classificacao_patrimonial, detalhamento_tecnico, referencia_dotacao`), enum `status_validacao` de **4** (+`pendente`) | 🔴 banco **consolidou 8→4**; `FormaOcupacao/PredioEscola/Tombamento/Coabitado` **perderam coluna dedicada**; protótipo não tem `pendente` (usa `undefined`) |
| Perfil | `PerfilUsuario` (6) | enum `perfil_usuario` (7, +`admin`) e tabela `perfis` (`codigo text`) | ⚠️ banco é superset; enum pode estar sem uso (tabela usa `codigo`) |
| Classe/complexidade IEE | `classeObra: string` + `pontuacaoComplexidade: number` | `iee_classe` (enum I–IV) + `iee`, `iee_pontos`, `iee_complexidade` | ⚠️ nomes e granularidade diferentes; banco tornou classe um enum |

---

## Gap 3 — Referências texto livre → FK (o coração da normalização)

| Protótipo (texto) | Banco (FK) | Nota |
|---|---|---|
| `sre: string` | `sre_id` FK → `regionais_sre` **+** `sre text` | banco mantém os dois (denormalizado) |
| `municipio: string` | `municipio_id` FK → `municipios` **+** `municipio text` | idem |
| `tipo: string` / `tipoObra` | `tipo_obra_id` FK → `tipos_obra` **+** `tipo text` | idem |
| `nomeEscola` + `codesc` (strings) | `escola_id` FK → `escolas` (3.444) + `endereco_id` FK → `enderecos_escola` (3.910) | banco tem cadastro real de escolas |
| `analistaAtribuido: string` (nome) | `analista_atribuido_id` uuid FK → `usuarios` | **resolve o bug Roberto→João** |
| `fiscalObraAtribuido: string` (nome) | `fiscal_obra_atribuido_id` uuid FK → `usuarios` | idem |
| `analistasSugeridos: string[]` | *(sem coluna)* — banco usa `usuarios.capacidade_maxima_iee` | lógica de sugestão muda |

⚠️ **Denormalização remanescente:** `solicitacoes` guarda **FK e texto** para SRE/município/tipo. Definir a fonte de verdade (provável: FK; texto só como cache de exibição/importação).

---

## Gap 4 — Campos só no banco (banco à frente)

Conceitos novos que **não existem no protótipo** e precisam de UI/regra:

- `codigo_sgo` (unique) — código SGO oficial da demanda (protótipo só tem `id`).
- `origem_demanda` — check de 7 valores (Escola/SRE/Programa Gov./Fiscalização/Notificação/Determ. Judicial/Atend. Político).
- `emenda_impositiva` (Sim/Não) e `ano_emenda`.
- **Priorização:** `prioridade_score`, `estrelas`, `etiquetas_prioridade` (jsonb) — sistema de priorização inexistente no protótipo.
- `valores_originais_tecnico` (jsonb) — snapshot pré-análise.
- `atribuicao_forcada`, `cadastro_obra_confirmado`, `contador_analises`.
- `cnpj_caixa_escolar`, `data_ordem_servico_fiscal`, `prazo_estimado_obra` + `prazo_estimado_meses`.
- Auditoria de tempo: `created_at` / `updated_at` (protótipo só tem `dataCriacao: string`).

---

## Gap 5 — Campos só no protótipo (risco de perda na migração)

Campos/conceitos do protótipo **sem lar no banco** — decidir se migram, viram tabela, ou são descartados:

- 🔴 `notificacao: string` — **usado por `syncChecklistDocs()`** para injetar o doc "Comprovante da Notificação". Não há coluna equivalente → a regra de checklist condicional fica sem input persistido.
- 🔴 `parecerConsolidado: string` (e `Aditivo.parecerConsolidado`, `AjustePlanilha.parecerDore`) — pareceres da DORE não têm coluna. (Coerente com "IA parecer é mock", mas o **texto do parecer real** precisa de lugar.)
- `observacoesAnalistaDadosGerais`, `observacoesAnalistaChecklist` — sem coluna.
- **Paralisação:** `dataParalizacao`, `justificativaParalizacao` — `status_obra` tem `paralisada`, mas **não há data/justificativa**.
- **Conclusão:** `dataConclusao` sem coluna; laudo/relatório/planilha final → devem virar linhas em `documentos` (categorias `conclusao`).
- **Contrato:** `statusContratoEmpresa` ('Ativa'/'Distratada'), `contratoDataAssinatura`, `contratoInicioVigencia/FimVigencia`, `garantiaExigida`, `garantiaValor`, `garantiaValidade` — mapeamento **parcial** (banco tem `empresa_contratada`, `cnpj_empresa`, `valor_contrato`, `garantia_inicio/fim/tipo`); o resto e o histórico `empresasAnteriores[]` não têm tabela `contratos`.
- `EmpresaSeguranca` (cadastro de empresas do módulo Segurança) — **sem tabela** (é o "cadastro de empresas" do Recorte #2).
- `fichaVerificadaPor` / `fichaVerificadaData` — banco tem `ficha_verificada` (bool) mas dropou quem/quando.
- Triplas de arquivo (`cronogramaFisicoFinanceiro*`, `laudoConclusivo*`, `relatorioFotografico*`, `planilhaMedicaoFinal*`, `documentoDistrato*`) → devem migrar para linhas em `documentos` (definir a `categoria` de cada).

---

## Gap 6 — Representação de tipos (mecânico, mas obrigatório)

| Aspecto | Protótipo | Banco | Ação na migração |
|---|---|---|---|
| IDs | `string` arbitrária | `uuid` | gerar uuids; **remapear nome→uuid** de analistas/fiscais |
| Datas | `string` (pt-BR/ISO) | `date` / `timestamptz` | parse/format nas duas pontas |
| Dinheiro | `number` | `numeric` | ok (cuidar de precisão) |
| Nomenclatura | `camelCase` | `snake_case` | **camada de mapeamento** (ou tipos gerados + transform) |
| Listas | arrays aninhados | tabelas-filhas | quebrar em inserts relacionais |

---

## O que o banco já resolveu melhor que o protótipo

- **Auth real** (`usuarios` ↔ `auth.users`) e pessoas por FK → elimina o bug Roberto→João.
- **Correção formalizada** (motivos + docs recusados em tabelas) vs. tratamento solto.
- **Arquivos com metadados sérios** (storage_path, provider, checksum_sha256, file_size_bytes) vs. filenames soltos.
- **RLS habilitado** em todas as tabelas (base de segurança por perfil).
- **Dados de referência reais** carregados (3.444 escolas, 3.910 endereços, 47 SREs).

---

## Recomendações para o Recorte #1 (integração)

1. **Baseline de migrations primeiro** — capturar o schema atual (`supabase db pull`) antes de qualquer mudança; hoje há 0 migrations rastreadas.
2. **Gerar tipos do banco** (`generate_typescript_types`) e criar uma **camada de mapeamento** camelCase↔snake_case (não usar `types.ts` direto contra o banco).
3. **Decidir denormalização** SRE/município/tipo: FK como verdade, texto como cache.
4. **Fechar os 4 gaps de campo do protótipo que impactam o fluxo até PAF**: `notificacao` (checklist condicional), `parecerConsolidado`, observações do analista, e a consolidação 8→4 das validações (confirmar com a DORE que Forma/Prédio/Tombamento/Coabitado cabem em `classificacao_patrimonial`).
5. **Alinhar enums**: `statusObra`/`statusPAF` (casing + `Pago Parcialmente`/`distratada`), e o modelo `pago:boolean` → `parcelas_paf`.
6. **Deixar Execução (Gap 1) explicitamente para o Recorte #2** — não tentar modelar aditivos/ajustes/medições/contratos/diários/vistorias agora; os ganchos (`aditivo_id`, `ajuste_id`, `imovel_id`) já reservam o espaço.
