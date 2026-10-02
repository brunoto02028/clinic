/**
 * O que o formulário das metas faz com o que a pessoa escreveu (118 T-7).
 *
 * Vive fora da tela porque **é aqui que mora o defeito caro**: a pessoa escreve
 * o sono em horas e o banco guarda minutos, como a medição. Guardar 8 onde
 * devia ir 480 daria um progresso de 7,5 — a barra a dizer que ela dormiu sete
 * vezes a meta. A conta tem de ser verificável sem abrir o telemóvel, e o app
 * não tem harness de componente.
 *
 * As regras, todas vindas da decisão *"o paciente define as metas"*:
 *
 * - **Campo vazio é `null`, não "deixa como estava".** É apagar a meta, e tem
 *   de ser possível; uma meta que não se remove deixa de ser escolha.
 * - **A recusa fala na unidade em que a pessoa escreveu.** Dizer "escolha entre
 *   120 e 960" a quem digitou horas é mandá-la dividir de cabeça.
 * - **Nada é preenchido por nós.** O que vem do servidor como `null` chega à
 *   tela como campo vazio, não como zero.
 */

/**
 * As quatro metas, como o servidor as guarda e devolve.
 *
 * **A declaração vive aqui** porque este ficheiro não importa nada: o
 * `resumo-de-saude` e o cliente da API precisam dela e os dois são importados
 * por sítios diferentes. Enquanto estava declarada três vezes, mudar um campo
 * obrigava a mudar três listas e nada avisava se uma ficasse atrás.
 */
export interface Metas {
  steps: number | null;
  activeMinutes: number | null;
  sleepMinutes: number | null;
  activeCalories: number | null;
}

export interface CampoDeMeta {
  chave: "steps" | "activeMinutes" | "activeCalories" | "sleepMinutes";
  en: string;
  pt: string;
  min: number;
  max: number;
  /** O sono é guardado em minutos e escrito em horas. */
  emHoras?: boolean;
}

export const CAMPOS_DE_META: CampoDeMeta[] = [
  { chave: "steps", en: "Steps", pt: "Passos", min: 500, max: 100000 },
  { chave: "activeMinutes", en: "Active minutes", pt: "Minutos ativos", min: 5, max: 1440 },
  { chave: "activeCalories", en: "Active calories", pt: "Calorias ativas", min: 50, max: 10000 },
  { chave: "sleepMinutes", en: "Sleep", pt: "Sono", min: 120, max: 960, emHoras: true },
];

export type ValoresGuardados = Partial<Metas>;

/** O que cada caixa de texto mostra quando a tela abre. */
export function textoInicial(guardadas: ValoresGuardados | null | undefined): Record<string, string> {
  const texto: Record<string, string> = {};
  for (const c of CAMPOS_DE_META) {
    const v = guardadas?.[c.chave];
    /* `null` vira caixa **vazia**. Zero seria um alvo que ninguém escolheu. */
    texto[c.chave] = v === null || v === undefined ? "" : String(c.emHoras ? v / 60 : v);
  }
  return texto;
}

export type LeituraDoFormulario =
  | { ok: true; corpo: ValoresGuardados }
  | { ok: false; campo: CampoDeMeta; motivo: "nao-numero" | "fora-do-intervalo" };

/**
 * Lê as quatro caixas e devolve o corpo do PUT, ou **a primeira** recusa.
 *
 * Para na primeira porque a mensagem aponta uma caixa; listar quatro erros numa
 * linha não diz a ninguém onde pôr o dedo. O servidor, que não tem caixas,
 * nomeia todos — ver `app/api/patient/goals/route.ts`.
 */
export function lerFormulario(texto: Record<string, string>): LeituraDoFormulario {
  const corpo: ValoresGuardados = {};
  for (const c of CAMPOS_DE_META) {
    const bruto = (texto[c.chave] ?? "").trim().replace(",", ".");
    if (bruto === "") {
      corpo[c.chave] = null;
      continue;
    }
    const n = Number(bruto);
    if (!Number.isFinite(n)) return { ok: false, campo: c, motivo: "nao-numero" };

    const guardado = c.emHoras ? Math.round(n * 60) : Math.round(n);
    if (guardado < c.min || guardado > c.max) {
      return { ok: false, campo: c, motivo: "fora-do-intervalo" };
    }
    corpo[c.chave] = guardado;
  }
  return { ok: true, corpo };
}

/** Os limites na unidade em que a pessoa escreve — horas para o sono. */
export function limitesEscritos(c: CampoDeMeta): { min: number; max: number } {
  return c.emHoras ? { min: c.min / 60, max: c.max / 60 } : { min: c.min, max: c.max };
}

/** A mensagem da recusa, nas duas línguas, inglês primeiro. */
export function mensagemDaRecusa(r: Extract<LeituraDoFormulario, { ok: false }>): {
  en: string;
  pt: string;
} {
  const { campo, motivo } = r;
  if (motivo === "nao-numero") {
    return { en: `${campo.en}: not a number`, pt: `${campo.pt}: não é um número` };
  }
  const { min, max } = limitesEscritos(campo);
  return {
    en: `${campo.en}: choose between ${min} and ${max}`,
    pt: `${campo.pt}: escolha entre ${min} e ${max}`,
  };
}
