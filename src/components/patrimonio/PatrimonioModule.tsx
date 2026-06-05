import React, { useState, useEffect } from 'react';
import { ImovelPatrimonio, DOCUMENTOS_PATRIMONIO_PADRAO } from './types';
import CadastroPropriosView from './CadastroPropriosView';
import RegularizacaoDocumentalView from './RegularizacaoDocumentalView';
import VistoriasInspecoesView from './VistoriasInspecoesView';
import FichaConsolidadaView from './FichaConsolidadaView';
import ProjetosView from './ProjetosView';

export const STORAGE_KEY = 'patrimonio_imoveis_mg';
export const VISTORIAS_KEY = 'patrimonio_vistorias_mg';

export const SRES_MG = [
  'SRE Almenara', 'SRE Araçuaí', 'SRE Barbacena', 'SRE Carangola',
  'SRE Caratinga', 'SRE Caxambu', 'SRE Conselheiro Lafaiete',
  'SRE Coronel Fabriciano', 'SRE Curvelo', 'SRE Diamantina',
  'SRE Divinópolis', 'SRE Governador Valadares', 'SRE Guanhães',
  'SRE Itajubá', 'SRE Ituiutaba', 'SRE Janaúba', 'SRE Januária',
  'SRE Juiz de Fora', 'SRE Leopoldina', 'SRE Manhuaçu',
  'SRE Metropolitana A', 'SRE Metropolitana B', 'SRE Metropolitana C',
  'SRE Montes Claros', 'SRE Muriaé', 'SRE Nova Era', 'SRE Ouro Preto',
  'SRE Paracatu', 'SRE Passos', 'SRE Patos de Minas', 'SRE Patrocínio',
  'SRE Pirapora', 'SRE Poços de Caldas', 'SRE Ponte Nova',
  'SRE Pouso Alegre', 'SRE São João del-Rei',
  'SRE São Sebastião do Paraíso', 'SRE Sete Lagoas',
  'SRE Teófilo Otoni', 'SRE Uberaba', 'SRE Uberlândia',
  'SRE Unaí', 'SRE Varginha', 'SRE Viçosa',
].sort();

export const MUNICIPIOS_MG = [
  'Abaeté', 'Além Paraíba', 'Alfenas', 'Almenara', 'Andradas', 'Araguari',
  'Araçuaí', 'Araxá', 'Barbacena', 'Belo Horizonte', 'Betim', 'Bocaiúva',
  'Brumadinho', 'Carangola', 'Caratinga', 'Carmo do Paranaíba', 'Caxambu',
  'Congonhas', 'Conselheiro Lafaiete', 'Contagem', 'Coronel Fabriciano',
  'Curvelo', 'Diamantina', 'Divinópolis', 'Formiga', 'Frutal',
  'Governador Valadares', 'Guanhães', 'Ibirité', 'Ipatinga', 'Itabira',
  'Itajubá', 'Ituiutaba', 'Itaúna', 'Janaúba', 'Januária', 'João Monlevade',
  'Juiz de Fora', 'Lagoa Formosa', 'Lagoa Santa', 'Lavras', 'Leopoldina',
  'Manhuaçu', 'Mariana', 'Montes Claros', 'Muriaé', 'Nova Lima',
  'Ouro Branco', 'Ouro Preto', 'Paracatu', 'Passos', 'Patos de Minas',
  'Patrocínio', 'Pedra Azul', 'Pedro Leopoldo', 'Pirapora', 'Poços de Caldas',
  'Ponte Nova', 'Pouso Alegre', 'Ribeirão das Neves', 'Rio Paranaíba',
  'Sabará', 'Santa Luzia', 'São João del-Rei', 'São Lourenço',
  'São Sebastião do Paraíso', 'Serro', 'Sete Lagoas', 'Teófilo Otoni',
  'Três Corações', 'Três Pontas', 'Uberaba', 'Uberlândia', 'Unaí',
  'Varginha', 'Varjão de Minas', 'Viçosa',
].sort();

export function newImovel(): ImovelPatrimonio {
  return {
    id: `PAT-${Date.now()}`,
    nomeEscola: '', codesc: '', codigoEndereco: '', municipio: '', sre: '',
    enderecoCompleto: '', cep: '', coordLat: '', coordLng: '',
    formaOcupacao: 'PRÓPRIO', predio: 'PRINCIPAL',
    tombado: 'NÃO É TOMBADO', coabitado: 'NÃO',
    situacaoImovel: '',
    documentos: DOCUMENTOS_PATRIMONIO_PADRAO.map(d => ({ ...d })),
    dataCadastro: new Date().toISOString().split('T')[0],
    status: 'rascunho',
  };
}

interface PatrimonioModuleProps {
  activeSubTask?: string;
  perfilUsuario?: string;
  regionaisDoTecnico?: string[];
}

export default function PatrimonioModule({ activeSubTask, perfilUsuario, regionaisDoTecnico = [] }: PatrimonioModuleProps) {
  const [imoveis, setImoveis] = useState<ImovelPatrimonio[]>(() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); } catch { return []; }
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(imoveis));
  }, [imoveis]);

  // Técnico de Infraestrutura SRE só visualiza e cadastra imóveis das suas regionais
  const regionaisRestrita = perfilUsuario === 'tecnico_infra' ? regionaisDoTecnico : [];
  const imoveisVisiveis = regionaisRestrita.length
    ? imoveis.filter(i => !i.sre || regionaisRestrita.includes(i.sre))
    : imoveis;

  if (activeSubTask === 'blank_regularizacao')
    return <RegularizacaoDocumentalView imoveis={imoveisVisiveis} setImoveis={setImoveis} sreRestrita="" />;
  if (activeSubTask === 'blank_vistorias')
    return <VistoriasInspecoesView imoveis={imoveisVisiveis} sreRestrita="" />;
  if (activeSubTask === 'blank_ficha')
    return <FichaConsolidadaView imoveis={imoveisVisiveis} sreRestrita="" />;
  if (activeSubTask === 'blank_projetos')
    return <ProjetosView imoveis={imoveisVisiveis} sreRestrita="" />;

  return <CadastroPropriosView imoveis={imoveisVisiveis} setImoveis={setImoveis} regionaisRestrita={regionaisRestrita} />;
}
