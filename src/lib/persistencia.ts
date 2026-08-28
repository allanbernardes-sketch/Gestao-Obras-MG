import { supabase } from './supabase';
import {
  Solicitacao, DocumentoChecklist, UsuarioSistema, Chamado, ChamadoHistoricoItem, StatusChamado, montarDocumentosChamado,
  RolManutencaoPredial, RolManutencaoItem, ROL_MANUTENCAO_ITENS_PADRAO,
} from '../types';

// Comparação de SRE tolerante a caixa e acentos: o banco guarda 'SRE Araçuaí',
// as solicitações antigas guardam 'SRE ARACUAI'.
export function normalizarSre(nome: string | undefined | null): string {
  return (nome ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim();
}

// Resolve o nome exibido na UI para o uuid da tabela usuarios. Usuários criados
// localmente no módulo Segurança (ids 'USR-01'…) não existem no banco e não podem
// ir para FK — retorna null para eles.
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function resolverUsuarioIdPorNome(usuarios: UsuarioSistema[], nome?: string): string | null {
  if (!nome) return null;
  const usuario = usuarios.find(u => u.nome === nome && UUID_RE.test(u.id));
  if (!usuario) {
    console.warn(`Usuário "${nome}" não encontrado no banco — FK ficará nula.`);
    return null;
  }
  return usuario.id;
}

// O app exibe tamanho de arquivo como string ('1.2 MB' / '340 KB' — regra do upload
// em GestaoObrasViews); o banco guarda int8 em bytes. Round-trip estável.
export function tamanhoEmBytes(display?: string): number | null {
  if (!display) return null;
  const m = display.trim().match(/^([\d.,]+)\s*(MB|KB)$/i);
  if (!m) return null;
  const valor = parseFloat(m[1].replace(',', '.'));
  if (Number.isNaN(valor)) return null;
  return Math.round(valor * (m[2].toUpperCase() === 'MB' ? 1024 * 1024 : 1024));
}

// Datas do modelo local são 'YYYY-MM-DD'; qualquer outra coisa vira null para
// não derrubar o insert com timestamp inválido.
const DATA_ISO_RE = /^\d{4}-\d{2}-\d{2}$/;

function timestampDeData(data: string | undefined, horaMinSeg: string): string | null {
  if (!data || !DATA_ISO_RE.test(data)) return null;
  return `${data}T${horaMinSeg}`;
}

export function formatarTamanhoArquivo(bytes?: number | null): string | undefined {
  if (bytes == null) return undefined;
  return bytes > 1024 * 1024
    ? `${(bytes / (1024 * 1024)).toFixed(1)} MB`
    : `${(bytes / 1024).toFixed(0)} KB`;
}

// ---------------------------------------------------------------------------
// Sincronização replace-set idempotente (insert-first): insere o conjunto atual
// e só depois remove as linhas antigas que não estão entre as inseridas. Uma
// falha no meio nunca deixa o banco vazio; rodar duas vezes converge.
// ---------------------------------------------------------------------------

export async function sincronizarDocumentosDaSolicitacao(
  dbId: string,
  sol: Solicitacao,
  usuarioId: string | null
): Promise<void> {
  const paraLinha = (doc: DocumentoChecklist, categoria: 'checklist_obrigatorio' | 'checklist_outros' | 'ged_execucao') => ({
    solicitacao_id: dbId,
    categoria,
    // Checklist padrão e GED: nome_logico = id canônico ('doc_1', 'ged_art'…). Outros
    // documentos: nome_logico = nome digitado (o id local 'doc_custom_<ts>' é descartável).
    nome_logico: categoria === 'checklist_outros' ? doc.nome : doc.id,
    obrigatorio: doc.obrigatorio,
    status: doc.status,
    justificativa: doc.justificativa ?? null,
    file_name: doc.fileName ?? null,
    file_type: doc.fileType ?? null,
    file_size_bytes: tamanhoEmBytes(doc.fileSize),
    uploaded_at: timestampDeData(doc.uploadedAt, '12:00:00'),
    uploaded_by: doc.fileName ? usuarioId : null,
  });

  const linhas = [
    ...(sol.documentos ?? []).map(d => paraLinha(d, 'checklist_obrigatorio')),
    ...(sol.outrosDocumentos ?? []).map(d => paraLinha(d, 'checklist_outros')),
    ...(sol.documentosGED ?? []).map(d => paraLinha(d, 'ged_execucao')),
  ];

  let idsInseridos: string[] = [];
  if (linhas.length > 0) {
    const { data, error } = await supabase.from('documentos').insert(linhas).select('id');
    if (error) throw error;
    idsInseridos = (data ?? []).map((r: any) => r.id);
  }

  let remover = supabase
    .from('documentos')
    .delete()
    .eq('solicitacao_id', dbId)
    .in('categoria', ['checklist_obrigatorio', 'checklist_outros', 'ged_execucao']);
  if (idsInseridos.length > 0) {
    remover = remover.not('id', 'in', `(${idsInseridos.join(',')})`);
  }
  const { error: erroDelete } = await remover;
  if (erroDelete) throw erroDelete;
}

// Parcelas do PAF (recursos liberados) — mesmo padrão replace-set dos documentos acima.
// A tabela parcelas_paf existe desde a baseline mas nunca era sincronizada pelo front-end;
// parcelasPAF só vivia em React state + localStorage antes desta função existir.
export async function sincronizarParcelasDaSolicitacao(
  dbId: string,
  sol: Solicitacao
): Promise<void> {
  // Linhas com valor <= 0 (parcela em edição, ainda não preenchida no formulário) são
  // ignoradas aqui — a tabela tem CHECK (valor > 0) e um insert em lote falharia por inteiro
  // por causa de uma única linha incompleta.
  const linhas = (sol.parcelasPAF ?? [])
    .filter(p => (p.valor ?? 0) > 0)
    .map(p => ({
      solicitacao_id: dbId,
      valor: p.valor,
      data_pagamento: DATA_ISO_RE.test(p.dataPagamento || '') ? p.dataPagamento : null,
      ordem_pagamento: p.ordemPagamento ?? null,
    }));

  let idsInseridos: string[] = [];
  if (linhas.length > 0) {
    const { data, error } = await supabase.from('parcelas_paf').insert(linhas).select('id');
    if (error) throw error;
    idsInseridos = (data ?? []).map((r: any) => r.id);
  }

  let remover = supabase
    .from('parcelas_paf')
    .delete()
    .eq('solicitacao_id', dbId);
  if (idsInseridos.length > 0) {
    remover = remover.not('id', 'in', `(${idsInseridos.join(',')})`);
  }
  const { error: erroDelete } = await remover;
  if (erroDelete) throw erroDelete;
}

// ---------------------------------------------------------------------------
// Módulo de Chamados (Diretor de Escola → Coordenador Regional). Ver [[modulo-chamados]].
// ---------------------------------------------------------------------------

function documentoDeLinha(row: any): DocumentoChecklist {
  return {
    id: row.nome_logico,
    nome: DOCUMENTO_CHAMADO_NOME[row.nome_logico] ?? row.nome_logico,
    obrigatorio: row.obrigatorio,
    desc: 'Anexo opcional — marque e anexe se aplicável a este chamado.',
    status: row.status,
    justificativa: row.justificativa ?? undefined,
    fileName: row.file_name ?? undefined,
    fileType: row.file_type ?? undefined,
    fileSize: formatarTamanhoArquivo(row.file_size_bytes) ?? undefined,
    uploadedAt: row.uploaded_at ? String(row.uploaded_at).slice(0, 10) : undefined,
  };
}

// Mapa id → nome dos tipos de anexo do chamado, pra reconstituir o nome ao reler do banco
// (o banco só guarda nome_logico = id canônico, igual documentos de Solicitacao).
const DOCUMENTO_CHAMADO_NOME: Record<string, string> = Object.fromEntries(
  montarDocumentosChamado().map(d => [d.id, d.nome])
);

export function linhaParaChamado(
  row: any,
  documentos: DocumentoChecklist[],
  historico: ChamadoHistoricoItem[]
): Chamado {
  return {
    id: row.id,
    numero: row.numero,
    dataSolicitacao: row.data_solicitacao,
    sre: row.sre,
    municipio: row.municipio,
    escolaId: row.escola_id ?? undefined,
    escolaNome: row.escola_nome,
    codesc: row.codesc,
    codigoEndereco: row.codigo_endereco ?? undefined,
    predioDescricao: row.predio_descricao ?? undefined,
    responsavelCaixaEscolarNome: row.responsavel_caixa_escolar_nome ?? undefined,
    responsavelCaixaEscolarTelefone: row.responsavel_caixa_escolar_telefone ?? undefined,
    solicitanteMatriculaMasp: row.solicitante_matricula_masp ?? undefined,
    descricaoProblema: row.descricao_problema,
    localOcorrencia: row.local_ocorrencia ?? [],
    localOcorrenciaOutro: row.local_ocorrencia_outro ?? undefined,
    motivoTipo: row.motivo_tipo,
    motivoOrgaoControle: row.motivo_orgao_controle ?? undefined,
    motivoOrgaoNumeroOficio: row.motivo_orgao_numero_oficio ?? undefined,
    motivoOrgaoData: row.motivo_orgao_data ?? undefined,
    motivoOrgaoPrazoAtendimento: row.motivo_orgao_prazo_atendimento ?? undefined,
    motivoEmendaTipo: row.motivo_emenda_tipo ?? undefined,
    consequencias: row.consequencias ?? [],
    consequenciaOutro: row.consequencia_outro ?? undefined,
    qtdAlunosAfetados: row.qtd_alunos_afetados ?? undefined,
    numeroSalasAfetadas: row.numero_salas_afetadas ?? undefined,
    turnosAfetados: row.turnos_afetados ?? [],
    funcionamento: row.funcionamento ?? undefined,
    riscoImediato: row.risco_imediato ?? undefined,
    emendaNomeParlamentar: row.emenda_nome_parlamentar ?? undefined,
    emendaNumero: row.emenda_numero ?? undefined,
    emendaValor: row.emenda_valor ?? undefined,
    emendaExercicio: row.emenda_exercicio ?? undefined,
    emendaObjeto: row.emenda_objeto ?? undefined,
    documentos,
    status: row.status,
    prioridade: row.prioridade ?? undefined,
    coordenadorAtribuidoId: row.coordenador_atribuido_id ?? undefined,
    parecerCoordenador: row.parecer_coordenador ?? undefined,
    justificativaRecusa: row.justificativa_recusa ?? undefined,
    dataTriagem: row.data_triagem ?? undefined,
    dataConclusao: row.data_conclusao ?? undefined,
    tipoObra: row.tipo_obra ?? undefined,
    pontuacaoAtual: row.pontuacao_atual ?? undefined,
    primeiroRetornoAte: row.primeiro_retorno_ate ?? undefined,
    engenheiroFiscalEscola: row.engenheiro_fiscal_escola ?? undefined,
    pontuacaoAjustada: row.pontuacao_ajustada ?? undefined,
    farolVistoria: row.farol_vistoria ?? undefined,
    farolProcesso: row.farol_processo ?? undefined,
    dataPlanejadaVistoria: row.data_planejada_vistoria ?? undefined,
    dataReplanejadaVistoria: row.data_replanejada_vistoria ?? undefined,
    dataRealVistoria: row.data_real_vistoria ?? undefined,
    statusVistoria: row.status_vistoria ?? undefined,
    numeroSeiProcessoDore: row.numero_sei_processo_dore ?? undefined,
    dataEnvioDore: row.data_envio_dore ?? undefined,
    criadoPor: row.criado_por,
    historico,
    dataCriacao: row.created_at,
  };
}

// Carrega todos os chamados visíveis (filtragem por perfil é feita pelo caller, mesmo padrão
// client-side do resto do app), com documentos e histórico já hidratados.
export async function carregarChamados(): Promise<Chamado[]> {
  const [{ data: chamadosData, error: erroChamados }, { data: docsData }, { data: histData }] = await Promise.all([
    supabase.from('chamados').select('*').order('created_at', { ascending: false }),
    supabase.from('documentos').select('*').eq('categoria', 'chamado'),
    supabase.from('chamado_historico').select('*').order('data', { ascending: true }),
  ]);

  if (erroChamados) throw erroChamados;

  const docsPorChamado = new Map<string, any[]>();
  for (const d of docsData ?? []) {
    if (!d.chamado_id) continue;
    if (!docsPorChamado.has(d.chamado_id)) docsPorChamado.set(d.chamado_id, []);
    docsPorChamado.get(d.chamado_id)!.push(d);
  }

  const histPorChamado = new Map<string, ChamadoHistoricoItem[]>();
  for (const h of histData ?? []) {
    if (!histPorChamado.has(h.chamado_id)) histPorChamado.set(h.chamado_id, []);
    histPorChamado.get(h.chamado_id)!.push({
      status: h.status,
      data: h.data,
      responsavel: h.responsavel,
      observacao: h.observacao ?? undefined,
    });
  }

  return (chamadosData ?? []).map((row: any) => {
    const documentos = montarDocumentosChamado((docsPorChamado.get(row.id) ?? []).map(documentoDeLinha));
    return linhaParaChamado(row, documentos, histPorChamado.get(row.id) ?? []);
  });
}

function chamadoParaLinha(c: Omit<Chamado, 'id' | 'numero' | 'historico' | 'documentos' | 'dataCriacao'>) {
  return {
    data_solicitacao: c.dataSolicitacao,
    sre: c.sre,
    municipio: c.municipio,
    escola_id: c.escolaId ?? null,
    escola_nome: c.escolaNome,
    codesc: c.codesc,
    codigo_endereco: c.codigoEndereco ?? null,
    predio_descricao: c.predioDescricao ?? null,
    responsavel_caixa_escolar_nome: c.responsavelCaixaEscolarNome ?? null,
    responsavel_caixa_escolar_telefone: c.responsavelCaixaEscolarTelefone ?? null,
    solicitante_matricula_masp: c.solicitanteMatriculaMasp ?? null,
    descricao_problema: c.descricaoProblema,
    local_ocorrencia: c.localOcorrencia ?? [],
    local_ocorrencia_outro: c.localOcorrenciaOutro ?? null,
    motivo_tipo: c.motivoTipo,
    motivo_orgao_controle: c.motivoOrgaoControle ?? null,
    motivo_orgao_numero_oficio: c.motivoOrgaoNumeroOficio ?? null,
    motivo_orgao_data: c.motivoOrgaoData ?? null,
    motivo_orgao_prazo_atendimento: c.motivoOrgaoPrazoAtendimento ?? null,
    motivo_emenda_tipo: c.motivoEmendaTipo ?? null,
    consequencias: c.consequencias ?? [],
    consequencia_outro: c.consequenciaOutro ?? null,
    qtd_alunos_afetados: c.qtdAlunosAfetados ?? null,
    numero_salas_afetadas: c.numeroSalasAfetadas ?? null,
    turnos_afetados: c.turnosAfetados ?? [],
    funcionamento: c.funcionamento ?? null,
    risco_imediato: c.riscoImediato ?? null,
    emenda_nome_parlamentar: c.emendaNomeParlamentar ?? null,
    emenda_numero: c.emendaNumero ?? null,
    emenda_valor: c.emendaValor ?? null,
    emenda_exercicio: c.emendaExercicio ?? null,
    emenda_objeto: c.emendaObjeto ?? null,
    status: c.status,
    prioridade: c.prioridade ?? null,
    coordenador_atribuido_id: c.coordenadorAtribuidoId ?? null,
    parecer_coordenador: c.parecerCoordenador ?? null,
    justificativa_recusa: c.justificativaRecusa ?? null,
    data_triagem: c.dataTriagem ?? null,
    data_conclusao: c.dataConclusao ?? null,
    criado_por: c.criadoPor,
  };
}

// Cria o chamado + primeiro item de histórico ('aberto') + linhas de documentos marcadas.
// Retorna o Chamado já hidratado (id/numero reais do banco).
export async function criarChamado(
  dados: Omit<Chamado, 'id' | 'numero' | 'historico' | 'dataCriacao'>,
  responsavelNome: string
): Promise<Chamado> {
  const { data: inserido, error } = await supabase
    .from('chamados')
    .insert(chamadoParaLinha(dados))
    .select('*')
    .single();
  if (error) throw error;

  await supabase.from('chamado_historico').insert({
    chamado_id: inserido.id,
    status: 'aberto',
    responsavel: responsavelNome,
    observacao: 'Chamado aberto pela direção da escola.',
  });

  await sincronizarDocumentosDoChamado(inserido.id, dados.documentos ?? []);

  const documentos = montarDocumentosChamado(dados.documentos ?? []);
  return linhaParaChamado(inserido, documentos, [{
    status: 'aberto',
    data: new Date().toISOString(),
    responsavel: responsavelNome,
    observacao: 'Chamado aberto pela direção da escola.',
  }]);
}

// Transição de status (triagem do coordenador) — grava a mudança + histórico numa tacada.
export async function atualizarStatusChamado(
  chamadoId: string,
  novoStatus: StatusChamado,
  responsavel: string,
  observacao: string | undefined,
  camposExtra: Partial<{
    prioridade: Chamado['prioridade'];
    coordenadorAtribuidoId: string;
    parecerCoordenador: string;
    justificativaRecusa: string;
  }> = {}
): Promise<void> {
  const agora = new Date().toISOString();
  const update: Record<string, any> = { status: novoStatus };
  if (camposExtra.prioridade !== undefined) update.prioridade = camposExtra.prioridade;
  if (camposExtra.coordenadorAtribuidoId !== undefined) update.coordenador_atribuido_id = camposExtra.coordenadorAtribuidoId;
  if (camposExtra.parecerCoordenador !== undefined) update.parecer_coordenador = camposExtra.parecerCoordenador;
  if (camposExtra.justificativaRecusa !== undefined) update.justificativa_recusa = camposExtra.justificativaRecusa;
  if (novoStatus === 'em_analise' && !update.data_triagem) update.data_triagem = agora;
  if (novoStatus === 'concluido' || novoStatus === 'recusado') update.data_conclusao = agora;

  const { error } = await supabase.from('chamados').update(update).eq('id', chamadoId);
  if (error) throw error;

  const { error: erroHist } = await supabase.from('chamado_historico').insert({
    chamado_id: chamadoId,
    status: novoStatus,
    responsavel,
    observacao: observacao ?? null,
  });
  if (erroHist) throw erroHist;
}

// Painel de Controle do coordenador (priorização/vistoria/DORE) — edição livre de campos que não
// disparam transição de status nem gravam chamado_historico (isso continua exclusivo de
// atualizarStatusChamado). Ver [[modulo-chamados]].
export async function atualizarCamposControleChamado(
  chamadoId: string,
  campos: Partial<{
    tipoObra: string;
    pontuacaoAtual: number | null;
    prioridade: Chamado['prioridade'];
    primeiroRetornoAte: string | null;
    engenheiroFiscalEscola: string;
    pontuacaoAjustada: number | null;
    farolVistoria: Chamado['farolVistoria'] | null;
    farolProcesso: Chamado['farolProcesso'] | null;
    dataPlanejadaVistoria: string | null;
    dataReplanejadaVistoria: string | null;
    dataRealVistoria: string | null;
    statusVistoria: Chamado['statusVistoria'] | null;
    numeroSeiProcessoDore: string;
    dataEnvioDore: string | null;
    parecerCoordenador: string;
  }>
): Promise<void> {
  const mapa: Record<string, string> = {
    tipoObra: 'tipo_obra',
    pontuacaoAtual: 'pontuacao_atual',
    prioridade: 'prioridade',
    primeiroRetornoAte: 'primeiro_retorno_ate',
    engenheiroFiscalEscola: 'engenheiro_fiscal_escola',
    pontuacaoAjustada: 'pontuacao_ajustada',
    farolVistoria: 'farol_vistoria',
    farolProcesso: 'farol_processo',
    dataPlanejadaVistoria: 'data_planejada_vistoria',
    dataReplanejadaVistoria: 'data_replanejada_vistoria',
    dataRealVistoria: 'data_real_vistoria',
    statusVistoria: 'status_vistoria',
    numeroSeiProcessoDore: 'numero_sei_processo_dore',
    dataEnvioDore: 'data_envio_dore',
    parecerCoordenador: 'parecer_coordenador',
  };
  const update: Record<string, any> = {};
  for (const [chave, valor] of Object.entries(campos)) {
    update[mapa[chave]] = valor === '' ? null : valor;
  }
  if (Object.keys(update).length === 0) return;

  const { error } = await supabase.from('chamados').update(update).eq('id', chamadoId);
  if (error) throw error;
}

// Replace-set idempotente dos anexos do chamado (categoria 'chamado'), mesmo padrão de
// sincronizarDocumentosDaSolicitacao acima.
export async function sincronizarDocumentosDoChamado(
  chamadoId: string,
  documentos: DocumentoChecklist[]
): Promise<void> {
  const anexados = documentos.filter(d => d.status !== 'nao_se_aplica' || d.fileName);
  const linhas = anexados.map(doc => ({
    chamado_id: chamadoId,
    categoria: 'chamado' as const,
    nome_logico: doc.id,
    obrigatorio: doc.obrigatorio,
    status: doc.status,
    justificativa: doc.justificativa ?? null,
    file_name: doc.fileName ?? null,
    file_type: doc.fileType ?? null,
    file_size_bytes: tamanhoEmBytes(doc.fileSize),
    uploaded_at: doc.fileName ? new Date().toISOString() : null,
  }));

  let idsInseridos: string[] = [];
  if (linhas.length > 0) {
    const { data, error } = await supabase.from('documentos').insert(linhas).select('id');
    if (error) throw error;
    idsInseridos = (data ?? []).map((r: any) => r.id);
  }

  let remover = supabase.from('documentos').delete().eq('chamado_id', chamadoId);
  if (idsInseridos.length > 0) {
    remover = remover.not('id', 'in', `(${idsInseridos.join(',')})`);
  }
  const { error: erroDelete } = await remover;
  if (erroDelete) throw erroDelete;
}

// ---------------------------------------------------------------------------
// Rol de Manutenção Predial Anual Obrigatória (módulo Imóveis, diretor_escola). Ver [[modulo-chamados]].
// ---------------------------------------------------------------------------

function itemDeLinha(row: any, doc?: any): RolManutencaoItem {
  return {
    id: row.id,
    itemCodigo: row.item_codigo,
    status: row.status ?? undefined,
    dataExecucao: row.data_execucao ?? undefined,
    empresaProfissional: row.empresa_profissional ?? undefined,
    cnpjCpf: row.cnpj_cpf ?? undefined,
    comprovacaoDespesa: row.comprovacao_despesa ?? undefined,
    documento: doc ? {
      id: doc.id,
      nome: 'Comprovante de despesa',
      obrigatorio: false,
      desc: 'Nota fiscal/recibo da manutenção executada.',
      status: doc.status,
      fileName: doc.file_name ?? undefined,
      fileType: doc.file_type ?? undefined,
      fileSize: formatarTamanhoArquivo(doc.file_size_bytes) ?? undefined,
      uploadedAt: doc.uploaded_at ? String(doc.uploaded_at).slice(0, 10) : undefined,
    } : undefined,
  };
}

// Busca o Rol de um ano específico já hidratado (itens + anexos). null se ainda não existe.
export async function carregarRolManutencao(escolaId: string, ano: number): Promise<RolManutencaoPredial | null> {
  const { data: rol, error } = await supabase
    .from('rol_manutencao_predial')
    .select('*')
    .eq('escola_id', escolaId)
    .eq('ano', ano)
    .maybeSingle();
  if (error) throw error;
  if (!rol) return null;

  const [{ data: itensData, error: erroItens }, { data: docsData }] = await Promise.all([
    supabase.from('rol_manutencao_itens').select('*').eq('rol_id', rol.id),
    supabase.from('documentos').select('*').eq('categoria', 'rol_manutencao'),
  ]);
  if (erroItens) throw erroItens;

  const docsPorItem = new Map<string, any>();
  for (const d of docsData ?? []) {
    if (d.rol_item_id) docsPorItem.set(d.rol_item_id, d);
  }

  return {
    id: rol.id,
    escolaId: rol.escola_id,
    ano: rol.ano,
    criadoPor: rol.criado_por ?? undefined,
    dataCriacao: rol.created_at,
    itens: (itensData ?? []).map((row: any) => itemDeLinha(row, docsPorItem.get(row.id))),
  };
}

// Cria o Rol do ano (cabeçalho + 12 itens fixos) se ainda não existir; se já existir, retorna o
// existente hidratado. Idempotente — seguro de chamar toda vez que a tela abre.
export async function obterOuCriarRolManutencao(escolaId: string, ano: number, criadoPor: string | null): Promise<RolManutencaoPredial> {
  const existente = await carregarRolManutencao(escolaId, ano);
  if (existente) return existente;

  const { data: novoRol, error } = await supabase
    .from('rol_manutencao_predial')
    .insert({ escola_id: escolaId, ano, criado_por: criadoPor })
    .select('*')
    .single();
  if (error) throw error;

  const { data: itensInseridos, error: erroItens } = await supabase
    .from('rol_manutencao_itens')
    .insert(ROL_MANUTENCAO_ITENS_PADRAO.map(i => ({ rol_id: novoRol.id, item_codigo: i.codigo })))
    .select('*');
  if (erroItens) throw erroItens;

  return {
    id: novoRol.id,
    escolaId: novoRol.escola_id,
    ano: novoRol.ano,
    criadoPor: novoRol.criado_por ?? undefined,
    dataCriacao: novoRol.created_at,
    itens: (itensInseridos ?? []).map((row: any) => itemDeLinha(row)),
  };
}

export async function atualizarItemRolManutencao(
  itemId: string,
  campos: Partial<{
    status: RolManutencaoItem['status'] | null;
    dataExecucao: string | null;
    empresaProfissional: string;
    cnpjCpf: string;
    comprovacaoDespesa: boolean | null;
  }>
): Promise<void> {
  const mapa: Record<string, string> = {
    status: 'status',
    dataExecucao: 'data_execucao',
    empresaProfissional: 'empresa_profissional',
    cnpjCpf: 'cnpj_cpf',
    comprovacaoDespesa: 'comprovacao_despesa',
  };
  const update: Record<string, any> = {};
  for (const [chave, valor] of Object.entries(campos)) {
    update[mapa[chave]] = valor === '' ? null : valor;
  }
  if (Object.keys(update).length === 0) return;

  const { error } = await supabase.from('rol_manutencao_itens').update(update).eq('id', itemId);
  if (error) throw error;
}

// Anexo comprovante do item — no máximo 1 por item, replace-set (remove o antigo, insere o novo).
export async function sincronizarAnexoItemRol(
  itemId: string,
  doc: { fileName: string; fileType?: string; fileSize?: string } | null,
  usuarioId: string | null
): Promise<void> {
  const { error: erroDelete } = await supabase.from('documentos').delete().eq('rol_item_id', itemId);
  if (erroDelete) throw erroDelete;

  if (doc) {
    const { error } = await supabase.from('documentos').insert({
      rol_item_id: itemId,
      categoria: 'rol_manutencao',
      nome_logico: 'comprovante_despesa',
      obrigatorio: false,
      status: 'aprovado',
      file_name: doc.fileName,
      file_type: doc.fileType ?? null,
      file_size_bytes: tamanhoEmBytes(doc.fileSize),
      uploaded_at: new Date().toISOString(),
      uploaded_by: usuarioId,
    });
    if (error) throw error;
  }
}

export async function sincronizarHistoricoEtapas(
  dbId: string,
  sol: Solicitacao,
  usuarioId: string | null
): Promise<void> {
  // O modelo local só tem a data (YYYY-MM-DD); created_at determinístico
  // (12:00 + index) preserva a ordem do array na releitura.
  const linhas = (sol.historicoEtapas ?? []).map((h, index) => {
    const hora = `12:${String(Math.floor(index / 60)).padStart(2, '0')}:${String(index % 60).padStart(2, '0')}`;
    return {
      solicitacao_id: dbId,
      etapa_nova: h.etapa,
      etapa_anterior: index > 0 ? sol.historicoEtapas[index - 1].etapa : null,
      responsavel: h.responsavel || null,
      usuario_id: usuarioId,
      created_at: timestampDeData(h.data, hora) ?? new Date().toISOString(),
    };
  });

  let idsInseridos: string[] = [];
  if (linhas.length > 0) {
    const { data, error } = await supabase.from('solicitacao_historico_etapas').insert(linhas).select('id');
    if (error) throw error;
    idsInseridos = (data ?? []).map((r: any) => r.id);
  }

  let remover = supabase
    .from('solicitacao_historico_etapas')
    .delete()
    .eq('solicitacao_id', dbId);
  if (idsInseridos.length > 0) {
    remover = remover.not('id', 'in', `(${idsInseridos.join(',')})`);
  }
  const { error: erroDelete } = await remover;
  if (erroDelete) throw erroDelete;
}
