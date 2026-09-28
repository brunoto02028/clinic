import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

// POST — Send educational content to patients
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !["SUPERADMIN", "ADMIN"].includes((session.user as any).role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = session.user as any;
    const clinicId = user.clinicId;
    if (!clinicId) return NextResponse.json({ error: "No clinic context" }, { status: 400 });

    const body = await req.json();
    const { contentId, sendTo, conditionTags } = body;

    if (!contentId) {
      return NextResponse.json({ error: "contentId is required" }, { status: 400 });
    }

    /**
     * O material tem de ser **desta** clínica (28/09/2026).
     *
     * Era `findUnique({ where: { id } })`: o id vinha do corpo e ninguém
     * conferia o dono. Quem administra a clínica A mandava o id de um material
     * da clínica B e o distribuía aos próprios pacientes — e a resposta ainda
     * devolvia o título dele.
     */
    const content = await prisma.educationContent.findFirst({
      where: { id: contentId, clinicId },
      select: { id: true, title: true, tags: true, bodyParts: true, isPublished: true },
    });

    if (!content) {
      return NextResponse.json({ error: "Content not found" }, { status: 404 });
    }

    let targetPatients: { id: string; firstName: string; lastName: string; email: string; preferredLocale?: string }[] = [];

    if (sendTo === "all") {
      // Send to all patients in the clinic
      targetPatients = await prisma.user.findMany({
        where: { clinicId, role: "PATIENT", isActive: true },
        select: { id: true, firstName: true, lastName: true, email: true, preferredLocale: true } as any,
      }) as any;
    /**
     * **O ramo `"specific"` saiu** (28/09/2026).
     *
     * Ele lia `patientIds` do corpo e escrevia atribuicao para cada um — e
     * **nenhuma tela o chamava**: a caixa de envio so oferece "todos" e "por
     * condicao", e nunca mandou `patientIds`. Era uma porta que escrevia na
     * caixa de entrada de pacientes escolhidos por quem chamasse a rota a mao,
     * e que ate hoje de manha nem filtrava por clinica.
     *
     * Escolher paciente por paciente ja tem lugar:
     * `/admin/education/assignments`, com previa do que vai ser mandado.
     */
    } else if (sendTo === "condition" && Array.isArray(conditionTags) && conditionTags.length > 0) {
      // Find patients with matching diagnoses/protocols
      const lowerTags = conditionTags.map((t: string) => t.toLowerCase());

      // Search in treatment protocols for matching conditions
      const protocols = await (prisma as any).treatmentProtocol.findMany({
        where: {
          clinicId,
          OR: [
            { title: { contains: lowerTags[0], mode: "insensitive" } },
            ...lowerTags.map((tag: string) => ({
              title: { contains: tag, mode: "insensitive" },
            })),
          ],
        },
        select: { patientId: true },
      });

      const protocolPatientIds = [...new Set(protocols.map((p: any) => p.patientId))];

      // Also search in diagnoses
      let diagnosisPatientIds: string[] = [];
      try {
        const diagnoses = await (prisma as any).diagnosis.findMany({
          where: {
            clinicId,
            OR: lowerTags.flatMap((tag: string) => [
              { primaryDiagnosis: { contains: tag, mode: "insensitive" } },
              { affectedArea: { contains: tag, mode: "insensitive" } },
            ]),
          },
          select: { patientId: true },
        });
        diagnosisPatientIds = diagnoses.map((d: any) => d.patientId);
      } catch {
        // Diagnosis model might not have these fields
      }

      const allMatchedIds = [...new Set([...protocolPatientIds, ...diagnosisPatientIds])];

      if (allMatchedIds.length > 0) {
        targetPatients = await prisma.user.findMany({
          // `clinicId` aqui também. Os protocolos e diagnósticos já são
          // filtrados por clínica, então na prática não muda nada — e é
          // exatamente por isso que vale a linha: no dia em que a consulta
          // acima mudar, a rede de segurança tem de estar no lugar certo.
          where: { id: { in: allMatchedIds as string[] }, clinicId, role: "PATIENT", isActive: true },
          // `preferredLocale` aqui também: sem ele este ramo mandava o aviso
          // sempre em inglês, e os outros dois respeitavam a língua da pessoa.
          select: { id: true, firstName: true, lastName: true, email: true, preferredLocale: true } as any,
        }) as any;
      }
    }

    if (targetPatients.length === 0) {
      return NextResponse.json({
        error: "No matching patients found for the selected criteria.",
        sentCount: 0,
      }, { status: 404 });
    }

    /**
     * **Quem vai receber, antes de receber** (28/09/2026).
     *
     * O padrão da tela era "All Patients" e um clique em "Send Now" escrevia
     * uma atribuição e um aviso para **todo paciente ativo da clínica**, sem
     * que ninguém soubesse quantos eram. A regra da casa é que nada sai sem o
     * Bruno ver a prévia; um número faz parte dessa prévia.
     *
     * `dryRun` responde a mesma conta sem escrever nada, e a tela usa isso para
     * dizer "isto vai para 34 pessoas" antes de existir um botão que confirme.
     */
    if (body?.dryRun) {
      const jaTem = await (prisma as any).educationAssignment.findMany({
        where: { contentId, patientId: { in: targetPatients.map((p) => p.id) } },
        select: { patientId: true },
      });
      const jaTemIds = new Set(jaTem.map((a: any) => a.patientId));
      return NextResponse.json({
        dryRun: true,
        totalPatients: targetPatients.length,
        wouldSend: targetPatients.length - jaTemIds.size,
        alreadyAssigned: jaTemIds.size,
        patients: targetPatients.map((p) => ({
          id: p.id,
          name: `${p.firstName} ${p.lastName}`,
          already: jaTemIds.has(p.id),
        })),
      });
    }

    // Create assignments for each patient
    let assignedCount = 0;
    for (const patient of targetPatients) {
      // Check if already assigned
      const existing = await (prisma as any).educationAssignment.findFirst({
        where: { contentId, patientId: patient.id },
      });

      if (!existing) {
        await (prisma as any).educationAssignment.create({
          data: {
            contentId,
            patientId: patient.id,
            clinicId,
            assignedById: user.id,
          },
        });
        assignedCount++;
      }
    }

    // Send notifications to patients (bilingual based on patient's preferredLocale)
    try {
      for (const patient of targetPatients) {
        const isPt = ((patient as any).preferredLocale || 'en-GB').startsWith('pt');
        await (prisma as any).notification.create({
          data: {
            userId: patient.id,
            clinicId,
            type: "EDUCATION_ASSIGNED",
            title: isPt ? "Novo Conteúdo Educativo" : "New Educational Content",
            message: isPt
              ? `Novo conteúdo atribuído a você: "${content.title}"`
              : `New content assigned to you: "${content.title}"`,
            data: { contentId: content.id },
          },
        });
      }
    } catch (notifErr) {
      console.warn("[edu-send] Notification creation failed:", notifErr);
    }

    return NextResponse.json({
      success: true,
      sentCount: assignedCount,
      totalPatients: targetPatients.length,
      alreadyAssigned: targetPatients.length - assignedCount,
      patients: targetPatients.map(p => ({
        id: p.id,
        name: `${p.firstName} ${p.lastName}`,
      })),
    });
  } catch (err: any) {
    console.error("[edu-send] Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
