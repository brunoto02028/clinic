import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { staffPatientAccess } from "@/lib/staff-patient-access";
import { pushDocumento } from "@/lib/push-notify";

export const dynamic = "force-dynamic";

/**
 * Enviar ao paciente — **um botão, apertado por uma pessoa** (102 T-8).
 *
 * A regra da casa desde 17/09/2026: nada sai para paciente sozinho. Criar o
 * documento não envia; a prévia vem antes; e este é o único caminho.
 *
 * Idempotente de propósito: um segundo toque não reenvia o aviso. O telefone
 * tocando duas vezes pela mesma receita faz a pessoa procurar a segunda.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string; docId: string } }
) {
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

  /**
   * Só o próprio emissor envia o que escreveu.
   *
   * `clinicId` no `where` é o que impede um profissional de enviar o documento
   * que outro redigiu — e responde 404, como sempre: dizer "existe, mas não é
   * seu" conta que existe.
   */
  const r = await (prisma as any).professionalDocument.updateMany({
    where: {
      id: params.docId,
      patientId: params.id,
      clinicId: actor.clinicId!,
      sentAt: null,
      revokedAt: null,
    },
    data: { sentAt: new Date() },
  });

  if (r.count !== 1) {
    return NextResponse.json(
      {
        error: "That document is not waiting to be sent.",
        errorPt: "Esse documento não está esperando envio.",
        code: "not_sendable",
      },
      { status: 404 }
    );
  }

  /**
   * O aviso no telefone, **depois** de o envio ter acontecido.
   *
   * Se ele falhar, o documento já está no app da pessoa — ela o encontra
   * abrindo. Avisar antes e falhar ao gravar seria o contrário: telefone
   * tocando para algo que não chegou.
   */
  await pushDocumento(params.id).catch(() => {});

  return NextResponse.json({ sent: true });
}

/**
 * Encerrar — e **nunca apagar**.
 *
 * Receita é registro clínico: sumir com ela é sumir com a prova de uma
 * prescrição. O paciente continua vendo, com a tarja de encerrada e o motivo —
 * que é o que ele precisa para saber que não deve mais tomar aquilo.
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string; docId: string } }
) {
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
  const motivo = String(body?.reason ?? "").trim();
  if (!motivo) {
    // Encerrar sem motivo deixa o paciente vendo "encerrada" e sem saber por
    // quê — e é exatamente quando ele precisa saber.
    return NextResponse.json(
      {
        error: "Say why it is being closed — the patient reads this.",
        errorPt: "Diga por que está encerrando — o paciente lê isto.",
        code: "reason_required",
      },
      { status: 400 }
    );
  }

  const r = await (prisma as any).professionalDocument.updateMany({
    where: { id: params.docId, patientId: params.id, clinicId: actor.clinicId!, revokedAt: null },
    data: { revokedAt: new Date(), revokedReason: motivo },
  });

  if (r.count !== 1) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ revoked: true });
}
