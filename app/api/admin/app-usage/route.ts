export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionStaffActor } from "@/lib/tenant-access";
import { JANELA_SESSAO_MS, duracaoDaSessao } from "@/lib/app-usage";

/**
 * Quem usa o app, onde está, e há quanto tempo (085, T-3).
 *
 * O Bruno: *"eu quero acompanhar todas as pessoas que têm o app, quero saber a
 * localização, o IP."*
 *
 * **O dado já estava sendo gravado.** `AppSession` guarda cidade, país,
 * plataforma e versão desde a T-1; o app manda o sinal a cada três minutos; a
 * cidade sai do IP no login e na renovação. O que não existia era onde olhar:
 * `/admin/analytics` mostra visitante do site, que é outra coisa.
 *
 * **O IP não é guardado, e isso é de propósito.** Ele vira cidade e país na
 * hora e é descartado — guardar o IP de um paciente é guardar um identificador
 * de pessoa que ninguém precisa para responder "onde estão". A cidade responde
 * a pergunta; o IP responderia outra.
 */

/** Quantos dias o painel resume por padrão. */
const DIAS = 30;

export async function GET(req: NextRequest) {
  const actor = await getSessionStaffActor(req);
  if (!actor?.clinicId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const dias = Math.min(90, Math.max(1, parseInt(req.nextUrl.searchParams.get("dias") || "", 10) || DIAS));
  const desde = new Date(Date.now() - dias * 24 * 60 * 60 * 1000);
  const agora = new Date();

  /**
   * O teto é grande **e a resposta diz quando bateu nele**.
   *
   * Era `take: 2000` calado. Uma pessoa que usa o app todo dia gera de duas a
   * seis sessões diárias, então trinta dias de vinte pessoas já encostavam no
   * teto — e como a ordem é a mais recente primeiro, as linhas antigas caíam
   * fora e o total, o tempo por pessoa e as cidades ficavam errados **sem
   * nenhum sinal**. Um número errado com cara de certo é pior que um número
   * ausente (revisão de 26/09/2026).
   */
  const TETO = 20000;
  const sessoes = await (prisma as any).appSession.findMany({
    where: { clinicId: actor.clinicId, lastSeenAt: { gte: desde } },
    orderBy: { lastSeenAt: "desc" },
    take: TETO,
    select: {
      userId: true,
      startedAt: true,
      lastSeenAt: true,
      endedAt: true,
      platform: true,
      appVersion: true,
      city: true,
      country: true,
      user: { select: { id: true, firstName: true, lastName: true } },
    },
  });

  interface Pessoa {
    id: string;
    nome: string;
    sessoes: number;
    ms: number;
    ultimaVez: Date;
    cidade: string | null;
    pais: string | null;
    plataforma: string | null;
    versao: string | null;
    agora: boolean;
  }

  const porPessoa = new Map<string, Pessoa>();
  const porCidade = new Map<string, number>();
  const porVersao = new Map<string, number>();

  for (const s of sessoes) {
    const p = porPessoa.get(s.userId) ?? {
      id: s.userId,
      nome: `${s.user?.firstName ?? ""} ${s.user?.lastName ?? ""}`.trim() || "—",
      sessoes: 0,
      ms: 0,
      // A lista vem por `lastSeenAt` decrescente, então a primeira que se vê de
      // cada pessoa é a mais recente: cidade, versão e plataforma saem dela.
      ultimaVez: s.lastSeenAt,
      cidade: s.city,
      pais: s.country,
      plataforma: s.platform,
      versao: s.appVersion,
      agora: false,
    };
    p.sessoes += 1;
    p.ms += duracaoDaSessao(s);
    // Aberta agora = viva dentro da janela de silêncio. Sem isto, "online"
    // seria qualquer um que abriu o app algum dia.
    if (!s.endedAt && agora.getTime() - new Date(s.lastSeenAt).getTime() < JANELA_SESSAO_MS) {
      p.agora = true;
    }
    porPessoa.set(s.userId, p);

    const onde = s.city ? `${s.city}${s.country ? `, ${s.country}` : ""}` : s.country || null;
    if (onde) porCidade.set(onde, (porCidade.get(onde) ?? 0) + 1);
    if (s.appVersion) porVersao.set(s.appVersion, (porVersao.get(s.appVersion) ?? 0) + 1);
  }

  const pessoas = [...porPessoa.values()].sort((a, b) => b.ultimaVez.getTime() - a.ultimaVez.getTime());

  return NextResponse.json({
    dias,
    // Bateu no teto: a tela precisa saber que está olhando uma parte.
    truncado: sessoes.length >= TETO,
    pessoas,
    // Zero pessoas com o app é uma resposta, e é diferente de "a tela não
    // carregou". O total deixa a tela dizer qual das duas.
    total: pessoas.length,
    agora: pessoas.filter((p) => p.agora).length,
    cidades: [...porCidade.entries()].map(([nome, n]) => ({ nome, n })).sort((a, b) => b.n - a.n),
    versoes: [...porVersao.entries()].map(([nome, n]) => ({ nome, n })).sort((a, b) => b.n - a.n),
  });
}
