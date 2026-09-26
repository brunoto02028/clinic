import { prisma } from "@/lib/db";
import type { TenantType } from "@prisma/client";

/**
 * Quais profissionais esta pessoa pode ver (083).
 *
 * O app deixou de ser a porta de uma clínica: um médico, um psicólogo, um
 * nutricionista podem entrar como tenants próprios, e quem baixou o app para
 * comprar um exame pode querer marcar com um deles.
 *
 * Duas regras decidem quem aparece, e as duas existem pelo mesmo motivo —
 * **não oferecer o que não se pode cumprir**:
 *
 * 1. `acceptingPatients`: o profissional disse que aceita gente nova. Nasce
 *    falso; aparecer é decisão de alguém, nunca consequência de existir.
 * 2. `languages`: a língua em que ele atende contém a língua da pessoa. Um
 *    médico que só fala português não deve aparecer para quem lê o app em
 *    inglês — a consulta não aconteceria. Lista vazia quer dizer "sem
 *    restrição", que é o caso de toda clínica que já existia antes disto.
 *
 * O tenant onde a pessoa já está nunca é listado aqui: ele não é uma opção a
 * escolher, é onde ela está.
 */

export interface ProviderCard {
  id: string;
  name: string;
  slug: string;
  type: TenantType;
  languages: string[];
  logoUrl: string | null;
}

/** `pt-BR` e `pt` contam como a mesma língua; o app guarda a forma longa. */
function sameLanguage(a: string, b: string): boolean {
  return a.slice(0, 2).toLowerCase() === b.slice(0, 2).toLowerCase();
}

export function servesLanguage(languages: string[], locale: string): boolean {
  if (languages.length === 0) return true;
  return languages.some((l) => sameLanguage(l, locale));
}

export async function providersFor(patientId: string): Promise<ProviderCard[]> {
  const me = await prisma.user.findUnique({
    where: { id: patientId },
    select: { clinicId: true, preferredLocale: true },
  });
  if (!me) return [];

  const abertos = await prisma.clinic.findMany({
    where: {
      acceptingPatients: true,
      ...(me.clinicId ? { id: { not: me.clinicId } } : {}),
    },
    select: { id: true, name: true, slug: true, type: true, languages: true, logoUrl: true },
    orderBy: { name: "asc" },
  });

  return abertos.filter((c) => servesLanguage(c.languages, me.preferredLocale));
}
