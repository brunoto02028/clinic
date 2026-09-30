import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';
import { accessErrorResponse, assertPatientAccess, getActor } from '@/lib/tenant-access';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });

    /**
     * **O filtro sumia quando não havia clínica** (096 T-6, passo 4).
     *
     * Era `const where = clinicId ? { clinicId } : {}` — e esse `{}` lista as
     * atribuições de **todas as clínicas**. Um superadmin sem clínica própria
     * via o material de toda a gente, e nada na resposta dizia isso.
     *
     * A regra da casa é a inversa: sem inquilino resolvido não se responde,
     * não se responde tudo. E o `patientId` vinha da barra de endereços sem
     * ninguém conferir que aquele paciente é desta clínica — a mesma forma do
     * vazamento da lista de pacientes por `?clinicId`, em 16/09/2026.
     */
    const actor = await getActor(req);
    if (!actor?.clinicId) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
    const clinicId = actor.clinicId;
    const { searchParams } = new URL(req.url);
    const patientId = searchParams.get('patientId');

    if (patientId) {
      try {
        await assertPatientAccess(actor, patientId);
      } catch (e) {
        return accessErrorResponse(e);
      }
    }

    const where: any = { clinicId };
    if (patientId) where.patientId = patientId;

    const assignments = await prisma.educationAssignment.findMany({
      where,
      include: {
        content: { select: { id: true, title: true, contentType: true, thumbnailUrl: true, duration: true } },
        patient: { select: { id: true, firstName: true, lastName: true, email: true } },
        assignedBy: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ assignments });
  } catch (error: any) {
    console.error('[EDU ASSIGNMENTS] GET error:', error?.message);
    return NextResponse.json({ error: 'Failed to fetch assignments' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });

    const user = session.user as any;

    const body = await req.json();
    const { contentId, patientId, note, dueDate, frequency, isRequired } = body;

    if (!contentId || !patientId) {
      return NextResponse.json({ error: 'Content and patient are required' }, { status: 400 });
    }

    /**
     * **Os dois ids vêm do corpo, e nenhum era conferido** (28/09/2026).
     *
     * `clinicId` saía da sessão e ia para a linha nova, mas `contentId` e
     * `patientId` entravam como vieram. Quem administra a clínica A podia
     * mandar o id de um material da clínica B — e ler o texto dela pela
     * resposta —, ou o id de um **paciente** da clínica B, e a atribuição
     * aparecia no aplicativo dele.
     *
     * É a mesma forma do vazamento do envio em massa de 11/09/2026: o id vem
     * de fora, o tenant vem da sessão, e ninguém verifica que os dois
     * combinam. 404 nos dois casos — dizer "existe, mas não é sua" já conta
     * que existe.
     */
    /**
     * **Um inquilino só, e é o do `getActor`** (096 T-6).
     *
     * Havia dois neste mesmo handler: a guarda do paciente perguntava ao
     * `getActor`, que honra o cookie de clínica selecionada, e a escrita usava
     * `session.user.clinicId`, que é a clínica **de origem** de quem está
     * logado. Para toda a gente menos um superadmin que trocou de clínica, os
     * dois dão a mesma resposta — e é por isso que ninguém reparou.
     *
     * Para esse, davam respostas diferentes: o paciente da clínica B passava a
     * guarda, o material tinha de ser da A, e a linha nascia carimbada com A.
     * **Material de uma clínica ligado ao paciente de outra**, exatamente a
     * forma do vazamento de 11/09/2026 — o id vem de fora, o tenant vem de
     * dois sítios, e a divergência não é conferida por ninguém.
     *
     * Um critério só, lido pelos dois lados.
     */
    const actor = await getActor(req);
    if (!actor?.clinicId) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
    const clinicDoAtor = actor.clinicId;
    try {
      await assertPatientAccess(actor, patientId);
    } catch (e) {
      return accessErrorResponse(e);
    }

    const material = await prisma.educationContent.findFirst({
      where: { id: contentId, clinicId: clinicDoAtor },
      select: { id: true },
    });
    if (!material) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const assignment = await prisma.educationAssignment.create({
      data: {
        clinicId: clinicDoAtor,
        contentId,
        patientId,
        assignedById: user.id,
        note: note || null,
        dueDate: dueDate ? new Date(dueDate) : null,
        frequency: frequency || null,
        isRequired: isRequired || false,
      },
      include: {
        content: { select: { id: true, title: true, contentType: true } },
        patient: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    return NextResponse.json({ assignment });
  } catch (error: any) {
    console.error('[EDU ASSIGNMENTS] POST error:', error?.message);
    return NextResponse.json({ error: 'Failed to create assignment' }, { status: 500 });
  }
}
