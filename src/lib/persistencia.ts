import { supabase } from './supabase';
import { Solicitacao, DocumentoChecklist, UsuarioSistema } from '../types';

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
  const paraLinha = (doc: DocumentoChecklist, categoria: 'checklist_obrigatorio' | 'checklist_outros') => ({
    solicitacao_id: dbId,
    categoria,
    // Checklist padrão: nome_logico = id canônico ('doc_1'…). Outros documentos:
    // nome_logico = nome digitado (o id local 'doc_custom_<ts>' é descartável).
    nome_logico: categoria === 'checklist_obrigatorio' ? doc.id : doc.nome,
    obrigatorio: doc.obrigatorio,
    status: doc.status,
    justificativa: doc.justificativa ?? null,
    file_name: doc.fileName ?? null,
    file_type: doc.fileType ?? null,
    file_size_bytes: tamanhoEmBytes(doc.fileSize),
    uploaded_at: doc.uploadedAt ? `${doc.uploadedAt}T12:00:00` : null,
    uploaded_by: doc.fileName ? usuarioId : null,
  });

  const linhas = [
    ...(sol.documentos ?? []).map(d => paraLinha(d, 'checklist_obrigatorio')),
    ...(sol.outrosDocumentos ?? []).map(d => paraLinha(d, 'checklist_outros')),
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
    .in('categoria', ['checklist_obrigatorio', 'checklist_outros']);
  if (idsInseridos.length > 0) {
    remover = remover.not('id', 'in', `(${idsInseridos.join(',')})`);
  }
  const { error: erroDelete } = await remover;
  if (erroDelete) throw erroDelete;
}

export async function sincronizarHistoricoEtapas(
  dbId: string,
  sol: Solicitacao,
  usuarioId: string | null
): Promise<void> {
  // O modelo local só tem a data (YYYY-MM-DD); created_at determinístico
  // (12:00 + index) preserva a ordem do array na releitura.
  const linhas = (sol.historicoEtapas ?? []).map((h, index) => ({
    solicitacao_id: dbId,
    etapa_nova: h.etapa,
    etapa_anterior: index > 0 ? sol.historicoEtapas[index - 1].etapa : null,
    responsavel: h.responsavel || null,
    usuario_id: usuarioId,
    created_at: `${h.data}T12:${String(Math.floor(index / 60)).padStart(2, '0')}:${String(index % 60).padStart(2, '0')}`,
  }));

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
