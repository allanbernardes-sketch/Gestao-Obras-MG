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
    case 'doc_2': // Registro do imóvel
      return {
        statusRecomendado: 'aprovado',
        justificativa: `Título de propriedade da ${escolaClean} verificado junto ao cartório de registro de imóveis. Matrícula atualizada e sem ônus ou gravames pendentes. Apto para intervenção física.`
      };
    case 'doc_3_pdf': // Projeto de Engenharia (PDF)
      return {
        statusRecomendado: 'aprovado',
        justificativa: 'Arquivo PDF do projeto técnico analisado. Plantas, cortes e fachadas apresentam legibilidade satisfatória, memorial descritivo completo e especificações técnicas coerentes com o escopo da intervenção.'
      };
    case 'doc_3_dwg': // Projeto de Engenharia (DWG)
      return {
        statusRecomendado: 'recusado',
        justificativa: 'O arquivo DWG está sem as hachuras de demolição (vermelho) e construção (amarelo) exigidas no manual de reformas. Além disso, as coordenadas georreferenciadas da poligonal do terreno da escola não constam nas notas gerais do desenho.'
      };
    case 'doc_4': // Parecer técnico
      return {
        statusRecomendado: 'aprovado',
        justificativa: `Parecer técnico emitido por profissional habilitado (CREA/CAU ativo) referente à intervenção na ${escolaClean}. Diagnóstico consistente, metodologia adequada e conclusões alinhadas ao escopo proposto. Sem ressalvas.`
      };
    case 'doc_ata': // Ata do Colegiado
      return {
        statusRecomendado: 'aprovado',
        justificativa: 'Ata do colegiado formalizada corretamente. Constam assinaturas de mais de 2/3 dos membros do colegiado da escola, além da anuência da diretoria regional. Aprovação da demanda registrada em livro de atas devidamente autenticado. Sem ressalvas.'
      };
    case 'doc_foto': // Relatório fotográfico
      return {
        statusRecomendado: 'aprovado',
        justificativa: 'O relatório apresenta bom detalhamento visual da patologia identificada. As fotos estão georreferenciadas, datadas e com setas indicativas das falhas apontadas, atendendo ao padrão exigido pelo checklist da DORE.'
      };
    case 'doc_5': // Imposto ISS
      return {
        statusRecomendado: 'aprovado',
        justificativa: 'Guia de recolhimento do ISS verificada e validada junto à Receita Municipal. Alíquota aplicada corretamente conforme legislação tributária local vigente.'
      };
    case 'doc_6': // Memorial Descritivo (legado)
      return {
        statusRecomendado: 'nao_se_aplica',
        justificativa: 'Para este tipo de manutenção pontual de telhado, as especificações técnicas já inseridas na Planilha de Preços e memorial simplificado anexo à ata são suficientes.'
      };
    case 'doc_7': // Laudo Técnico de Vistoria / ART (legado)
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
