import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { staffPatientAccess } from "@/lib/staff-patient-access";
import { podeEmitir, tipoValidoDeDocumento } from "@/lib/professional-document";

export const dynamic = "force-dynamic";

/**
 * O que o profissional escreveu para este paciente (102 T-8).
 *
 * `staffPatientAccess` é a porta, como em toda rota sob
 * `/api/admin/patients/[id]` — e é ela que carrega o vínculo de cuidado (T-3),
 * então um médico de outro inquilino chega aqui pelo mesmo caminho de sempre.
 *
 * A lista é **só do emissor**: um profissional não lê o que outro escreveu, a
 * menos que o paciente ou a clínica partilhe (T-9).
 */
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const g = await staffPatientAccess(req, params.id, "Patient not found", {
    /**
     * Esta rota **é** a travessia: é o médico de outro inquilino escrevendo
     * para o paciente que a reabilitação lhe encaminhou (T-8). Tudo o que ela
     * lê e grava já é filtrado pelo `clinicId` de quem está logado, então o
     * profissional continua vendo só o que ele próprio escreveu.
     */
    porVinculo: true,
  });
  if (g.response) return g.response;

  const docs = await (prisma as any).professionalDocument.findMany({
    where: { patientId: params.id, clinicId: g.actor!.clinicId! },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ documents: docs });
}

/**
 * Escrever — **rascunho**, sempre.
 *
 * Nada chega ao paciente por criar: `sentAt` nasce nulo, e quem envia é o
 * botão da rota `/send`, depois da prévia. É a regra da casa desde 17/09/2026.
 */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const g = await staffPatientAccess(req, params.id, "Patient not found", {
    /**
     * Esta rota **é** a travessia: é o médico de outro inquilino escrevendo
     * para o paciente que a reabilitação lhe encaminhou (T-8). Tudo o que ela
     * lê e grava já é filtrado pelo `clinicId` de quem está logado, então o
     * profissional continua vendo só o que ele próprio escreveu.
     */
    porVinculo: true,
  });
  if (g.response) return g.response;
  const actor = g.actor!;

  const body = await req.json().catch(() => ({}));
  const { kind, title, body: corpo, appointmentId } = body ?? {};

  if (!tipoValidoDeDocumento(kind)) {
    return NextResponse.json({ error: "Pick a document kind." }, { status: 400 });
  }
  if (!String(title ?? "").trim() || !String(corpo ?? "").trim()) {
    return NextResponse.json(
      { error: "A title and a body are required.", errorPt: "Título e texto são obrigatórios." },
      { status: 400 }
    );
  }

  /**
   * A assinatura é uma **fotografia** do momento de emitir.
   *
   * O registro de um profissional pode mudar; o que ele assinou, não. Uma
   * receita que "atualiza" o CRM sozinha deixa de ser prova do que foi
   * prescrito — então o número é copiado, e não lido por relação.
   */
  const quem = await prisma.user.findUnique({
    where: { id: actor.userId },
    select: {
      firstName: true,
      lastName: true,
      clinic: { select: { professionalRegistry: true, registryKind: true } },
    },
  });
  const registryNumber = quem?.clinic?.professionalRegistry ?? null;

  if (!podeEmitir(kind, registryNumber)) {
    return NextResponse.json(
      {
        error: "This kind of document needs your professional registry number.",
        errorPt: "Este tipo de documento exige o seu número de registro profissional.",
        code: "registry_required",
      },
      { status: 400 }
    );
  }

  /**
   * A consulta, se vier, tem de ser **desta** pessoa e de quem escreve.
   *
   * O campo é um `String?` sem chave estrangeira, então um id qualquer entrava
   * e ficava gravado — inclusive o de uma consulta de outro inquilino, o que
   * ligaria a receita à agenda de um estranho. Id que não confere vira nulo:
   * a receita vale por si, e não pela consulta.
   */
  let daConsulta: string | null = null;
  if (typeof appointmentId === "string" && appointmentId) {
    const c = await prisma.appointment.findFirst({
      where: { id: appointmentId, patientId: params.id, clinicId: actor.clinicId! },
      select: { id: true },
    });
    daConsulta = c?.id ?? null;
  }

  const doc = await (prisma as any).professionalDocument.create({
    data: {
      clinicId: actor.clinicId!,
      patientId: params.id,
      issuedById: actor.userId,
      kind,
      title: String(title).trim(),
      body: String(corpo).trim(),
      signerName: [quem?.firstName, quem?.lastName].filter(Boolean).join(" ") || "Professional",
      registryKind: quem?.clinic?.registryKind ?? null,
      registryNumber,
      appointmentId: daConsulta,
    },
  });

  return NextResponse.json({ document: doc });
}
