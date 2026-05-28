import { DocumentoChecklist } from '../types';

export interface AIParecerTemplate {
  statusRecomendado: 'aprovado' | 'recusado' | 'nao_se_aplica';
  justificativa: string;
}

export function gerarParecerIA(documento: DocumentoChecklist, escola: string): AIParecerTemplate {
  const escolaClean = escola.replace('E.E. ', '');
  
  switch (documento.id) {
    case 'doc_1': // Planilha Orçamentária
      return {
        statusRecomendado: 'recusado',
        justificativa: `Identificada divergência na alíquota do BDI (24.1%) em descompasso com as diretrizes do Decreto Estadual de Obras para a localidade de ${escolaClean}. Favor reajustar os encargos sociais conforme novas tabelas SINAPI vigentes para o presente quadrimestre.`
      };
    case 'doc_2': // Ata de Reunião do Colegiado
      return {
        statusRecomendado: 'aprovado',
        justificativa: 'Documento formalizado de forma impecável. Constam assinaturas de mais de 2/3 dos membros do colegiado da escola, além da anuência da diretoria regional. Sem ressalvas.'
      };
    case 'doc_3': // Projeto de Engenharia / Arquitetura (DWG)
      return {
        statusRecomendado: 'recusado',
        justificativa: 'O arquivo DWG está sem as hachuras de demolição (vermelho) e construção (amarelo) exigidas no manual de reformas. Além disso, as coordenadas georreferenciadas da poligonal do terreno da escola não constam nas notas gerais do desenho.'
      };
    case 'doc_4': // Relatório Fotográfico
      return {
        statusRecomendado: 'aprovado',
        justificativa: 'O relatório apresenta bom detalhamento visual da patologia de infiltração na cobertura. As fotos estão georreferenciadas, datadas e com setas indicativas de falha nas calhas.'
      };
    case 'doc_5': // Cronograma Físico-Financeiro
      return {
        statusRecomendado: 'aprovado',
        justificativa: 'O fluxo financeiro está coerente com os prazos físicos estipulados (120 dias). A curva S demonstra aderência aos marcos de medição.'
      };
    case 'doc_6': // Memorial Descritivo
      return {
        statusRecomendado: 'nao_se_aplica',
        justificativa: 'Para este tipo de manutenção pontual de telhado, as especificações técnicas já inseridas na Planilha de Preços e memorial simplificado anexo à ata são suficientes.'
      };
    case 'doc_7': // Laudo Técnico de Vistoria / ART
      return {
        statusRecomendado: 'aprovado',
        justificativa: 'Anotação de Responsabilidade Técnica (ART) emitida corretamente pela autarquia reguladora e com taxa devidamente quitada pelo profissional responsável.'
      };
    default:
      return {
        statusRecomendado: 'aprovado',
        justificativa: 'Documento lido e examinado. Atende aos critérios básicos do checklist padrão.'
      };
  }
}
