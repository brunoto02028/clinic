import { patientGate } from "@/lib/patient-gate";
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getEffectiveUser } from '@/lib/get-effective-user';
import { naLingua } from '@/lib/education-language';
import { emBlocos } from '@/lib/rich-text-blocks';

export const dynamic = 'force-dynamic';

// Patient-facing: get assigned content + published content for their clinic
export async function GET(req: NextRequest) {
  // Consentimento e plano valem no servidor, não só na tela (auditoria de paridade, 24/09/2026).
  const __gate = await patientGate({ module: "mod_education" });
  if (__gate.response) return __gate.response;

  try {
    const effectiveUser = await getEffectiveUser();
    if (!effectiveUser) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });

    const effectiveId = effectiveUser.userId;
    const clinicUser = await prisma.user.findUnique({
      where: { id: effectiveId },
      // A língua sai do próprio paciente, e não de um cabeçalho do aparelho:
      // é a mesma que decide o e-mail e o push dele.
      select: { clinicId: true, preferredLocale: true },
    });
    const clinicId = clinicUser?.clinicId;
    const locale = clinicUser?.preferredLocale;

    // Get assigned content
    const assignments = await prisma.educationAssignment.findMany({
      where: { patientId: effectiveId },
      include: {
        content: {
          /**
           * O **corpo** vem junto (096 T-1).
           *
           * A tela de detalhe do app lê `item.body` da lista que já está em
           * memória — e a lista nunca mandava corpo nenhum. Quer dizer: mesmo
           * depois de importar um artigo, o paciente veria título e resumo e
           * **nada do texto**.
           *
           * Mandar o corpo na lista engorda a resposta. Com a biblioteca desta
           * clínica (dezenas de textos) isso é aceitável, e tem a vantagem de
           * funcionar no aplicativo que já está instalado, sem build. Quando a
           * biblioteca passar de umas centenas, a resposta certa é uma rota de
           * detalhe — e aí a tela do app muda junto.
           */
          select: {
            id: true, title: true, description: true, contentType: true,
            body: true, titlePt: true, descriptionPt: true, bodyPt: true,
            thumbnailUrl: true, videoUrl: true, duration: true, difficulty: true,
            bodyParts: true, tags: true,
            category: { select: { id: true, name: true, color: true } },
          },
        },
        assignedBy: { select: { firstName: true, lastName: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Get patient's progress
    const progress = await prisma.educationProgress.findMany({
      where: { userId: effectiveId },
    });

    // Get published content for browsing
    const published = await prisma.educationContent.findMany({
      where: clinicId ? { clinicId, isPublished: true } : { isPublished: true },
      select: {
        id: true, title: true, description: true, contentType: true,
        body: true, titlePt: true, descriptionPt: true, bodyPt: true,
        thumbnailUrl: true, videoUrl: true, duration: true, difficulty: true, isFeatured: true,
        bodyParts: true, tags: true, viewCount: true,
        category: { select: { id: true, name: true, color: true } },
      },
      orderBy: [{ isFeatured: 'desc' }, { createdAt: 'desc' }],
    });

    // Get categories
    const categories = await prisma.educationCategory.findMany({
      where: clinicId ? { clinicId, isActive: true } : { isActive: true },
      include: { _count: { select: { content: true } } },
      orderBy: { sortOrder: 'asc' },
    });

    /**
     * A língua é escolhida **aqui**, e não na tela.
     *
     * É o mesmo desenho dos termos: a rota devolve o texto pronto, e nenhuma
     * tela decide língua por conta própria — senão um dia uma delas decide
     * diferente das outras. Os campos `*Pt` não saem daqui: a tela não os usa,
     * e mandá-los dobraria a resposta com texto que ninguém vai mostrar.
     */
    /**
     * O corpo vai **em blocos**, nao em HTML (28/09/2026).
     *
     * O material que vem dos artigos do site tem corpo em HTML, e a tela do
     * telefone o entregava a um `<Text>` — que desenha o que recebe. O
     * paciente lia `<h2><span style="background-color: transparent...` e
     * dezenas de `&nbsp;`.
     *
     * Traduzido aqui, num lugar so: o aplicativo desenha com a fonte da casa,
     * e a web continua podendo usar o HTML como sempre usou.
     */
    const comBlocos = (c: any) =>
      c ? { ...c, blocks: emBlocos(c.body || c.content) } : c;

    return NextResponse.json({
      assignments: assignments.map((a: any) => ({
        ...a,
        content: a.content ? comBlocos(naLingua(a.content, locale)) : a.content,
      })),
      progress: progress.reduce((acc: any, p: any) => { acc[p.contentId] = p; return acc; }, {}),
      published: published.map((c: any) => comBlocos(naLingua(c, locale))),
      categories,
    });
  } catch (error: any) {
    console.error('[EDU PATIENT] GET error:', error?.message);
    return NextResponse.json({ error: 'Failed to fetch education data' }, { status: 500 });
  }
}
