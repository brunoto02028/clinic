import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';
import { getEffectiveUser } from '@/lib/get-effective-user';

export const dynamic = 'force-dynamic';

// Patient updates their progress on a content item
export async function POST(req: NextRequest) {
  try {
    /**
     * `getEffectiveUser`, e não `getServerSession` (096 T-3).
     *
     * A sessão de cookie é a da web. O app manda **bearer**, e
     * `getServerSession` devolve nulo para ele — então *marcar como lido* pelo
     * aplicativo respondia **401**, em silêncio, desde sempre. A tela do
     * paciente tem o botão e ele nunca funcionou no telefone.
     */
    const effective = await getEffectiveUser();
    if (!effective) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });

    const user = { id: effective.userId };
    const body = await req.json();
    const { contentId, status, timeSpent, rating, feedback, difficulty } = body;

    if (!contentId) return NextResponse.json({ error: 'contentId required' }, { status: 400 });

    /**
     * **Só se a pessoa pode ver este material** (096 T-3).
     *
     * Antes, qualquer pessoa autenticada podia gravar progresso em **qualquer**
     * `contentId` — inclusive de outra clínica, e inclusive de um material
     * restrito atribuído a outro paciente. E a rota ainda incrementava o
     * `viewCount` daquele material, o que confirma a existência dele a quem
     * não deveria nem saber que ele existe.
     *
     * Pode ver quem tem **atribuição**, ou o que está **publicado na clínica
     * dela**. É a mesma conta que a listagem faz; aqui ela é o portão.
     *
     * 404 e não 403: dizer "existe, mas não é seu" conta a um estranho que
     * aquele material existe.
     */
    const quem = await prisma.user.findUnique({
      where: { id: user.id },
      select: { clinicId: true },
    });
    const podeVer = await prisma.educationContent.findFirst({
      where: {
        id: contentId,
        OR: [
          { assignments: { some: { patientId: user.id } } },
          { isPublished: true, clinicId: quem?.clinicId ?? "" },
        ],
      },
      select: { id: true },
    });
    if (!podeVer) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const progress = await prisma.educationProgress.upsert({
      where: { userId_contentId: { userId: user.id, contentId } },
      update: {
        status: status || undefined,
        completedAt: status === 'completed' ? new Date() : undefined,
        timeSpent: timeSpent ? parseInt(timeSpent) : undefined,
        rating: rating ? parseInt(rating) : undefined,
        feedback: feedback || undefined,
        difficulty: difficulty || undefined,
      },
      create: {
        userId: user.id,
        contentId,
        status: status || 'in_progress',
        completedAt: status === 'completed' ? new Date() : null,
        timeSpent: timeSpent ? parseInt(timeSpent) : null,
        rating: rating ? parseInt(rating) : null,
        feedback: feedback || null,
        difficulty: difficulty || null,
      },
    });

    // Also mark assignment as completed if exists
    if (status === 'completed') {
      await prisma.educationAssignment.updateMany({
        where: { patientId: user.id, contentId, isCompleted: false },
        data: { isCompleted: true, completedAt: new Date() },
      });
    }

    // Increment view count
    await prisma.educationContent.update({
      where: { id: contentId },
      data: { viewCount: { increment: 1 } },
    });

    return NextResponse.json({ progress });
  } catch (error: any) {
    console.error('[EDU PROGRESS] POST error:', error?.message);
    return NextResponse.json({ error: 'Failed to update progress' }, { status: 500 });
  }
}
