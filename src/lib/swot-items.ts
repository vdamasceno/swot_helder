// Modelo do PPGDHO: Forças/Fraquezas por indicador CAPES + Ameaças/Oportunidades em seção geral única.

export type ParticipantType = "docente" | "discente" | "tecnico" | "egresso";

// Categorias internas (PF/FR ficam por indicador; AM/OP em seção geral)
export type SwotCategory = "strength" | "weakness" | "opportunity" | "threat";

export const PARTICIPANT_LABELS: Record<ParticipantType, string> = {
  docente: "Docente Permanente / Colaborador",
  discente: "Discente",
  tecnico: "Técnico-Administrativo",
  egresso: "Egresso",
};

export const SWOT_CATEGORIES: { key: SwotCategory; label: string; description: string }[] = [
  {
    key: "strength",
    label: "Forças (PF)",
    description: "Pontos positivos internos do programa que devemos manter e potencializar.",
  },
  {
    key: "weakness",
    label: "Fraquezas (FR)",
    description: "Pontos negativos internos sobre os quais temos competência para modificar ou fortalecer.",
  },
  {
    key: "opportunity",
    label: "Oportunidades (OP)",
    description: "Fatores externos que o programa pode aproveitar (editais, parcerias, contexto).",
  },
  {
    key: "threat",
    label: "Ameaças (AM)",
    description: "Fatores externos que podem prejudicar o programa (orçamento, regulação, concorrência).",
  },
];

// Limite definido pelo documento: até 5 entradas por categoria/seção.
export const MAX_ENTRIES_PER_BUCKET = 5;

// Código especial usado para Ameaças/Oportunidades (seção geral, sem indicador)
export const GENERAL_ITEM_CODE = "GERAL";

export interface CapesIndicator {
  code: string;
  title: string;
  description: string;
  profiles: ParticipantType[];
}

// Indicadores CAPES (quesitos 1–5 da Ficha de Avaliação), conforme segmentação do documento.
export const CAPES_INDICATORS: CapesIndicator[] = [
  {
    code: "Q1",
    title: "Proposta do Programa",
    description:
      "Coerência, consistência, abrangência e atualização das áreas de concentração, linhas de pesquisa e estrutura curricular.",
    profiles: ["docente", "discente", "tecnico", "egresso"],
  },
  {
    code: "Q2",
    title: "Corpo Docente",
    description:
      "Qualificação, composição, atividades de pesquisa e produção intelectual do corpo docente.",
    profiles: ["docente", "discente"],
  },
  {
    code: "Q3",
    title: "Corpo Discente e Formação",
    description:
      "Qualidade das dissertações/teses, índice de conclusão dentro do prazo e acompanhamento dos egressos.",
    profiles: ["docente", "discente", "egresso"],
  },
  {
    code: "Q4",
    title: "Inserção Social e Internacional",
    description:
      "Impacto educacional, social, econômico, cultural e visibilidade do programa.",
    profiles: ["docente", "discente", "egresso"],
  },
  {
    code: "Q5",
    title: "Infraestrutura",
    description:
      "Salas, laboratórios, bibliotecas, equipamentos e recursos de TI disponíveis ao programa.",
    profiles: ["docente", "tecnico"],
  },
  {
    code: "Q6",
    title: "Gestão e Apoio Técnico-Administrativo",
    description:
      "Coordenação acadêmica, secretaria, fluxos administrativos e apoio operacional ao programa.",
    profiles: ["docente", "tecnico"],
  },
];

export function indicatorsFor(profile: ParticipantType): CapesIndicator[] {
  return CAPES_INDICATORS.filter((i) => i.profiles.includes(profile));
}
