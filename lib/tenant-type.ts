/**
 * O que um inquilino **é** (`Clinic.type`), e o que isso liga e desliga.
 *
 * ## Por que um mapa, e não mais um booleano
 *
 * Isto era `isPersonalTenant()` sozinho, e o resto do código perguntava
 * `type === "PERSONAL_TRAINER"` — um booleano para dois tipos. Com seis, o
 * mesmo desenho viraria cinco booleanos e uma chance de esquecer um deles em
 * cada tela.
 *
 * Aqui os tipos se descrevem, e quem pergunta pergunta ao mapa. Acrescentar um
 * sétimo passa a ser uma linha.
 *
 * ## A regra que este arquivo carrega
 *
 * O Bruno: *"uma vez que eu cadastrei os médicos, as modalidades de cada um vai
 * aparecer para o paciente… ou não. A gente que dá essas permissões."*
 *
 * Cadastrar um profissional **não** o põe à venda. `visibleInApp` nasce falso,
 * e `podeAparecerNoApp` é quem responde — nunca uma tela.
 */

export type TenantTypeValue =
  | "CLINIC"
  | "PERSONAL_TRAINER"
  | "DOCTOR"
  | "PSYCHOLOGIST"
  | "NUTRITIONIST"
  | "OTHER_PROFESSIONAL";

/** O conselho que emite o registro de cada profissão, no Brasil. */
export type RegistryKind = "CRM" | "CRP" | "CRN" | "CREFITO" | "OUTRO";

export interface TipoDeInquilino {
  value: TenantTypeValue;
  label: string;
  labelPt: string;
  /** Uma frase dizendo o que muda ao escolher este tipo. */
  hint: string;
  hintPt: string;
  /**
   * Profissional de saúde que a BPR intermedia — tem registro, agenda própria
   * e repasse. A clínica de reabilitação e o estúdio de personal não são:
   * eles **são** a casa, não convidados dela.
   */
  profissionalExterno: boolean;
  /**
   * O registro é obrigatório para este tipo?
   *
   * Em consulta à distância no Brasil, mostrar o número de quem atende não é
   * enfeite — é obrigação de quem atende e da plataforma que o apresenta.
   */
  registro: RegistryKind | null;
  /** Atende por vídeo sem precisar de sala física. */
  soVideoPossivel: boolean;
}

/**
 * Os tipos, num lugar só.
 *
 * A ordem é a da tela: primeiro o que a casa é, depois quem ela convida.
 */
export const TIPOS_DE_INQUILINO: TipoDeInquilino[] = [
  {
    value: "CLINIC",
    label: "Rehabilitation clinic",
    labelPt: "Clínica de reabilitação",
    hint: "The full clinical flow: protocols, exercises, scans, records.",
    hintPt: "O fluxo clínico inteiro: protocolos, exercícios, scans, prontuário.",
    profissionalExterno: false,
    registro: null,
    soVideoPossivel: false,
  },
  {
    value: "PERSONAL_TRAINER",
    label: "Personal training studio",
    labelPt: "Estúdio de personal",
    hint: "Students and workouts, with its own vocabulary. No clinical record.",
    hintPt: "Alunos e treinos, com vocabulário próprio. Sem prontuário clínico.",
    profissionalExterno: false,
    registro: null,
    soVideoPossivel: false,
  },
  {
    value: "DOCTOR",
    label: "Doctor",
    labelPt: "Médico",
    hint: "Receives what was shared, consults, and sends back a prescription.",
    hintPt: "Recebe o que foi partilhado, atende, e devolve receita.",
    profissionalExterno: true,
    registro: "CRM",
    soVideoPossivel: true,
  },
  {
    value: "PSYCHOLOGIST",
    label: "Psychologist",
    labelPt: "Psicólogo",
    hint: "Sessions and session notes, which are never shared by default.",
    hintPt: "Sessões e notas de sessão, que nunca são partilhadas por padrão.",
    profissionalExterno: true,
    registro: "CRP",
    soVideoPossivel: true,
  },
  {
    value: "NUTRITIONIST",
    label: "Nutritionist",
    labelPt: "Nutricionista",
    hint: "Assessment and eating plan, without exercise prescription.",
    hintPt: "Avaliação e plano alimentar, sem prescrição de exercício.",
    profissionalExterno: true,
    registro: "CRN",
    soVideoPossivel: true,
  },
  {
    value: "OTHER_PROFESSIONAL",
    label: "Other professional",
    labelPt: "Outro profissional",
    hint: "Consultation and documents. Pick the registry kind yourself.",
    hintPt: "Consulta e documentos. O tipo de registro é você quem escolhe.",
    profissionalExterno: true,
    registro: "OUTRO",
    soVideoPossivel: true,
  },
];

const PORVALOR = new Map(TIPOS_DE_INQUILINO.map((t) => [t.value, t]));

/** O tipo, ou o de clínica quando vier lixo. Nunca devolve `undefined`. */
export function tipoDoInquilino(type: string | null | undefined): TipoDeInquilino {
  return PORVALOR.get(type as TenantTypeValue) ?? PORVALOR.get("CLINIC")!;
}

/** `true` só para o valor exato do enum — nada de adivinhar por prefixo. */
export function tipoValido(type: string | null | undefined): type is TenantTypeValue {
  return PORVALOR.has(type as TenantTypeValue);
}

export function isPersonalTenant(type: string | null | undefined): boolean {
  return type === "PERSONAL_TRAINER";
}

/**
 * É um profissional que a BPR intermedia?
 *
 * Decide três coisas de uma vez: se precisa de registro, se entra no catálogo
 * do app, e se o dinheiro dele passa por repasse.
 */
export function isProfissionalExterno(type: string | null | undefined): boolean {
  return tipoDoInquilino(type).profissionalExterno;
}

/** O conselho que este tipo exige, ou `null` quando não exige nenhum. */
export function registroExigido(type: string | null | undefined): RegistryKind | null {
  return tipoDoInquilino(type).registro;
}

/**
 * Este inquilino pode aparecer no catálogo do app?
 *
 * **Três condições, e todas obrigatórias.** Ser profissional externo não basta,
 * e ter sido cadastrado menos ainda: alguém da BPR precisa ter ligado.
 *
 * O registro entra aqui de propósito. Um médico sem CRM visível no app é um
 * problema da plataforma que o apresenta, não só dele — então a falta do
 * número **esconde**, em vez de aparecer em branco.
 */
export function podeAparecerNoApp(clinic: {
  type?: string | null;
  visibleInApp?: boolean | null;
  professionalRegistry?: string | null;
}): boolean {
  if (!isProfissionalExterno(clinic.type)) return false;
  if (!clinic.visibleInApp) return false;
  const exige = registroExigido(clinic.type);
  if (exige && exige !== "OUTRO" && !clinic.professionalRegistry?.trim()) return false;
  return true;
}
