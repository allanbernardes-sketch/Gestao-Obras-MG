import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export interface Escola {
  id: string;
  codesc: string;
  nome: string;
  municipio: string;
  sre: string;
}

export interface EnderecoEscola {
  codigoEndereco: string;
  codesc: string;
  descricao: string;
}

async function carregarPaginado<T>(tabela: string, colunas: string, ordenarPor: string): Promise<T[]> {
  const PAGE_SIZE = 1000;
  const todos: T[] = [];
  let pagina = 0;

  while (true) {
    const inicio = pagina * PAGE_SIZE;
    const fim = inicio + PAGE_SIZE - 1;

    const { data, error } = await supabase
      .from(tabela)
      .select(colunas)
      .eq('ativo', true)
      .order(ordenarPor)
      .range(inicio, fim);

    if (error) throw error;

    todos.push(...((data ?? []) as T[]));

    if (!data || data.length < PAGE_SIZE) break;
    pagina += 1;
  }

  return todos;
}

export function useEscolas() {
  const [escolas, setEscolas] = useState<Escola[]>([]);
  const [enderecos, setEnderecos] = useState<EnderecoEscola[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    let ativo = true;

    async function carregarEscolasEEnderecos() {
      setCarregando(true);
      setErro(null);

      try {
        const [todasEscolas, todosEnderecos] = await Promise.all([
          carregarPaginado<Escola>('escolas', 'id, codesc, nome, municipio, sre', 'nome'),
          carregarPaginado<{ codigo_endereco: string; codesc: string; descricao: string }>(
            'enderecos_escola',
            'codigo_endereco, codesc, descricao',
            'codesc'
          ),
        ]);

        if (!ativo) return;

        setEscolas(todasEscolas);
        setEnderecos(todosEnderecos.map((e) => ({
          codigoEndereco: e.codigo_endereco,
          codesc: e.codesc,
          descricao: e.descricao,
        })));
      } catch (err) {
        if (!ativo) return;
        setErro(err instanceof Error ? err.message : 'Erro ao carregar escolas');
        setEscolas([]);
        setEnderecos([]);
      } finally {
        if (ativo) setCarregando(false);
      }
    }

    carregarEscolasEEnderecos();
    return () => {
      ativo = false;
    };
  }, []);

  const buscarEnderecos = useCallback(async (codesc: string): Promise<EnderecoEscola[]> => {
    if (!codesc) return [];
    return enderecos.filter((e) => e.codesc === codesc);
  }, [enderecos]);

  return { escolas, enderecos, buscarEnderecos, carregando, erro };
}
