/**
 * A língua em que se fala com cada paciente.
 *
 * Inglês é a língua primária do produto: é o que todo mundo recebe quando não
 * há versão em português, e é o que se escreve primeiro. O português é a
 * segunda versão, opcional, e vale para quem tem `preferredLocale` em pt.
 *
 * Existe como peça própria porque o envio manual e o automático precisam da
 * **mesma** regra. Duas implementações da mesma pergunta é como a clínica
 * acaba mandando inglês para quem só lê português — e sem ninguém perceber,
 * porque quem escreveu lê os dois.
 */

export type PatientLang = "en" | "pt";

export function langOf(preferredLocale?: string | null): PatientLang {
  return String(preferredLocale || "").toLowerCase().startsWith("pt") ? "pt" : "en";
}

export interface BilingualText {
  title?: string | null;
  content: string;
  titlePt?: string | null;
  contentPt?: string | null;
}

/**
 * O texto que **este** paciente lê.
 *
 * Sem versão em português, o falante de português recebe o inglês — e isso é
 * deliberado: uma mensagem numa língua que a pessoa talvez leia é melhor que
 * silêncio, e a alternativa seria a clínica ter de escrever duas vezes toda
 * vez, o que na prática significaria não escrever.
 */
export function pickForPatient(
  texto: BilingualText,
  preferredLocale?: string | null
): { title: string | null; content: string } {
  const lang = langOf(preferredLocale);
  const usaPt = lang === "pt" && !!texto.contentPt?.trim();

  return {
    title: (usaPt ? texto.titlePt?.trim() : texto.title?.trim()) || texto.title?.trim() || null,
    content: (usaPt ? texto.contentPt!.trim() : texto.content.trim()) || texto.content.trim(),
  };
}

/** Separa os destinatários por língua, para um envio por grupo. */
export function groupByLang<T extends { id: string; preferredLocale?: string | null }>(
  patients: T[]
): { en: T[]; pt: T[] } {
  const en: T[] = [];
  const pt: T[] = [];
  for (const p of patients) (langOf(p.preferredLocale) === "pt" ? pt : en).push(p);
  return { en, pt };
}
