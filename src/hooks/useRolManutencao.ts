import { useCallback, useEffect, useState } from 'react';
import { RolManutencaoItem, RolManutencaoPredial } from '../types';
import {
  obterOuCriarRolManutencao,
  carregarRolManutencao,
  atualizarItemRolManutencao as atualizarItemRolManutencaoDb,
  sincronizarAnexoItemRol as sincronizarAnexoItemRolDb,
} from '../lib/persistencia';

// Rol de Manutenção Predial Anual Obrigatória — um registro por escola/ano. Cria automaticamente
// (com os 12 itens fixos) na primeira vez que a tela abre pra aquele ano — exceto em modo só
// leitura (coordenador_regional/admin/Diretor DORE), onde um ano sem rol registrado fica null em
// vez de criar um vazio. Ver [[modulo-chamados]].
export function useRolManutencao(escolaId: string | undefined, ano: number, usuarioId: string | null, somenteLeitura = false) {
  const [rol, setRol] = useState<RolManutencaoPredial | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    if (!escolaId) { setRol(null); setCarregando(false); return; }
    setCarregando(true);
    setErro(null);
    try {
      const dados = somenteLeitura
        ? await carregarRolManutencao(escolaId, ano)
        : await obterOuCriarRolManutencao(escolaId, ano, usuarioId);
      setRol(dados);
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Erro ao carregar o Rol de Manutenção.');
    } finally {
      setCarregando(false);
    }
  }, [escolaId, ano, usuarioId, somenteLeitura]);

  useEffect(() => { carregar(); }, [carregar]);

  const atualizarItem = useCallback(async (
    itemId: string,
    campos: Parameters<typeof atualizarItemRolManutencaoDb>[1]
  ) => {
    setRol(prev => prev ? { ...prev, itens: prev.itens.map(i => i.id === itemId ? { ...i, ...campos } as RolManutencaoItem : i) } : prev);
    try {
      await atualizarItemRolManutencaoDb(itemId, campos);
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Erro ao salvar o item.');
      await carregar();
      throw err;
    }
  }, [carregar]);

  const anexarComprovante = useCallback(async (
    itemId: string,
    doc: { fileName: string; fileType?: string; fileSize?: string } | null
  ) => {
    try {
      await sincronizarAnexoItemRolDb(itemId, doc, usuarioId);
      await carregar();
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Erro ao anexar o comprovante.');
      throw err;
    }
  }, [carregar, usuarioId]);

  return { rol, carregando, erro, recarregar: carregar, atualizarItem, anexarComprovante };
}
