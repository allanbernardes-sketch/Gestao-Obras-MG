import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export interface Escola {
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

export function useEscolas() {
  const [escolas, setEscolas] = useState<Escola[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    let ativo = true;

    async function carregarEscolas() {
      setCarregando(true);
      setErro(null);

      const PAGE_SIZE = 1000;
      const todasEscolas: Escola[] = [];
      let pagina = 0;

      while (true) {
        const inicio = pagina * PAGE_SIZE;
        const fim = inicio + PAGE_SIZE - 1;

        const { data, error } = await supabase
          .from('escolas')
          .select('codesc, nome, municipio, sre')
          .eq('ativo', true)
          .order('nome')
          .range(inicio, fim);

        if (!ativo) return;

        if (error) {
          setErro(error.message);
          setEscolas([]);
          setCarregando(false);
          return;
        }

        todasEscolas.push(...(data ?? []));

        if (!data || data.length < PAGE_SIZE) break;
        pagina += 1;
      }

      setEscolas(todasEscolas);
      setCarregando(false);
    }

    carregarEscolas();
    return () => {
      ativo = false;
    };
  }, []);

  const buscarEnderecos = useCallback(async (codesc: string): Promise<EnderecoEscola[]> => {
    if (!codesc) return [];

    const { data, error } = await supabase
      .from('enderecos_escola')
      .select('codigo_endereco, codesc, descricao')
      .eq('codesc', codesc)
      .eq('ativo', true);

    if (error) {
      setErro(error.message);
      return [];
    }

    return (data ?? []).map((endereco) => ({
      codigoEndereco: endereco.codigo_endereco,
      codesc: endereco.codesc,
      descricao: endereco.descricao,
    }));
  }, []);

  return { escolas, buscarEnderecos, carregando, erro };
}
