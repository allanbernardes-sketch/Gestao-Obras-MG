import { useCallback, useEffect, useState } from 'react';
import { Chamado, StatusChamado } from '../types';
import {
  carregarChamados,
  criarChamado as criarChamadoDb,
  atualizarStatusChamado as atualizarStatusChamadoDb,
  atualizarCamposControleChamado as atualizarCamposControleChamadoDb,
} from '../lib/persistencia';

// Hook de dados do módulo de Chamados (Diretor de Escola → Coordenador Regional). A filtragem por
// perfil (diretor vê só os próprios; coordenador vê só os da(s) SRE(s) dele) é feita pelo caller,
// mesmo padrão client-side usado no resto do app. Ver [[modulo-chamados]].
export function useChamados() {
  const [chamados, setChamados] = useState<Chamado[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const recarregar = useCallback(async () => {
    setCarregando(true);
    setErro(null);
    try {
      const dados = await carregarChamados();
      setChamados(dados);
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Erro ao carregar chamados');
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => { recarregar(); }, [recarregar]);

  const criar = useCallback(async (
    dados: Parameters<typeof criarChamadoDb>[0],
    responsavelNome: string
  ) => {
    const novo = await criarChamadoDb(dados, responsavelNome);
    setChamados(prev => [novo, ...prev]);
    return novo;
  }, []);

  const atualizarStatus = useCallback(async (
    chamadoId: string,
    novoStatus: StatusChamado,
    responsavel: string,
    observacao?: string,
    camposExtra?: Parameters<typeof atualizarStatusChamadoDb>[4]
  ) => {
    await atualizarStatusChamadoDb(chamadoId, novoStatus, responsavel, observacao, camposExtra);
    await recarregar();
  }, [recarregar]);

  // Edição livre do Painel de Controle (priorização/vistoria/DORE) — update otimista local +
  // persistência; não mexe em status/histórico. Ver [[modulo-chamados]].
  const atualizarCampos = useCallback(async (
    chamadoId: string,
    campos: Parameters<typeof atualizarCamposControleChamadoDb>[1]
  ) => {
    setChamados(prev => prev.map(c => c.id === chamadoId ? { ...c, ...campos } as Chamado : c));
    try {
      await atualizarCamposControleChamadoDb(chamadoId, campos);
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Erro ao salvar o campo.');
      await recarregar();
      throw err;
    }
  }, [recarregar]);

  return { chamados, carregando, erro, recarregar, criar, atualizarStatus, atualizarCampos };
}
