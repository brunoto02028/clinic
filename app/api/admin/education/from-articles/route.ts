export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionStaffActor } from "@/lib/tenant-access";
import { logAudit } from "@/lib/system-logger";
import {
  CAMPOS_DO_ARTIGO,
  artigoMudouDepois,
  importarArtigo,
} from "@/lib/education-from-article";

/**
 * Os artigos do site, e quais deles já viraram material do paciente (096 T-2/T-4).
 *
 * ## Por que existe uma tela para escolher
 *
 * Artigo do site é material de marketing; conteúdo educacional é material
 * clínico. Nem todos servem a alguém em tratamento, e **essa escolha não é
 * minha**. Importar os 35 de uma vez seria repetir o erro da pasta de
 * exercícios: a lista do paciente encheria de textos que ninguém escolheu
 * para ele.
 */
export async function GET(req: NextRequest) {
  const actor = await getSessionStaffActor(req);
  if (!actor?.clinicId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Só artigo publicado. Rascunho não é material de ninguém.
  const artigos = await prisma.article.findMany({
    where: { published: true },
    select: { ...CAMPOS_DO_ARTIGO, createdAt: true },
    orderBy: { createdAt: "desc" },
  });

  const materiais = await prisma.educationContent.findMany({
    where: { clinicId: actor.clinicId, sourceArticleId: { not: null } },
    select: {
      id: true,
      sourceArticleId: true,
      sourceArticleUpdatedAt: true,
      isPublished: true,
      sourceArticle: { select: { updatedAt: true } },
    },
  });
  const porArtigo = new Map(materiais.map((m) => [m.sourceArticleId!, m]));

  return NextResponse.json({
    articles: artigos.map((a) => {
      const m = porArtigo.get(a.id);
      return {
        id: a.id,
        title: a.title,
        titlePt: a.titlePt,
        createdAt: a.createdAt,
        updatedAt: a.updatedAt,
        // Tem as duas línguas? É o que decide se o material nasce completo.
        temPortugues: !!(a.titlePt && a.contentPt),
        imported: m
          ? {
              contentId: m.id,
              isPublished: m.isPublished,
              // O artigo mudou depois da importação — o material está velho.
              desatualizado: artigoMudouDepois(m as any),
            }
          : null,
      };
    }),
  });
}

/**
 * Importa um artigo, ou vários.
 *
 * Importar **não atribui nada a ninguém**: trazer para a clínica e mandar para
 * um paciente são duas decisões, e juntá-las num clique faria a segunda
 * acontecer sem que alguém a tomasse.
 */
export async function POST(req: NextRequest) {
  const actor = await getSessionStaffActor(req);
  if (!actor?.clinicId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const ids: string[] = Array.isArray(body?.articleIds)
    ? body.articleIds.filter((x: any) => typeof x === "string")
    : [];
  if (ids.length === 0) {
    return NextResponse.json(
      { error: "Pick at least one article.", errorPt: "Escolha pelo menos um artigo." },
      { status: 400 }
    );
  }

  const artigos = await prisma.article.findMany({
    where: { id: { in: ids }, published: true },
    select: CAMPOS_DO_ARTIGO,
  });
  if (artigos.length === 0) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const criados: string[] = [];
  const atualizados: string[] = [];
  for (const artigo of artigos) {
    const r = await importarArtigo({
      artigo: artigo as any,
      clinicId: actor.clinicId,
      createdById: actor.userId,
      categoryId: typeof body?.categoryId === "string" ? body.categoryId : null,
    });
    (r.criado ? criados : atualizados).push(r.id);
  }

  await logAudit({
    userId: actor.userId,
    userEmail: "",
    userRole: String(actor.role),
    action: "EDUCATION_IMPORTED_FROM_ARTICLES",
    entity: "EducationContent",
    entityId: criados[0] ?? atualizados[0] ?? "",
    description: `${criados.length} imported, ${atualizados.length} updated from articles`,
    metadata: { articleIds: ids },
  }).catch(() => {});

  /**
   * Quantos nasceram e quantos foram atualizados, separados.
   *
   * "7 importados" quando cinco já existiam faria quem clicou achar que tem
   * doze materiais novos na lista.
   */
  return NextResponse.json({
    created: criados.length,
    updated: atualizados.length,
    contentIds: [...criados, ...atualizados],
  });
}
