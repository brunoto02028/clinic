import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { patientGate } from "@/lib/patient-gate";
import { assinatura, rotuloDoTipo } from "@/lib/professional-document";

export const dynamic = "force-dynamic";

/**
 * O que os profissionais devolveram a este paciente (102 T-8).
 *
 * **Só o que foi enviado.** Rascunho é do profissional, e um documento que
 * aparecesse antes de alguém decidir enviá-lo tornaria o botão de enviar
 * enfeite.
 *
 * O encerrado **continua aparecendo**, com a data e o motivo: é registro
 * clínico, e é justamente quando ele foi encerrado que a pessoa precisa saber
 * — para não continuar tomando o que foi suspenso.
 */
export async function GET() {
  const gate = await patientGate({ module: "mod_documents" });
  if (gate.response) return gate.response;
  const userId = gate.gate!.userId;

  const docs = await (prisma as any).professionalDocument.findMany({
    where: { patientId: userId, sentAt: { not: null } },
    orderBy: { sentAt: "desc" },
    select: {
      id: true,
      kind: true,
      title: true,
      body: true,
      signerName: true,
      registryKind: true,
      registryNumber: true,
      sentAt: true,
      revokedAt: true,
      revokedReason: true,
      clinic: { select: { name: true } },
    },
  });

  return NextResponse.json({
    documents: docs.map((d: any) => {
      const tipo = rotuloDoTipo(d.kind);
      return {
        id: d.id,
        kind: d.kind,
        kindLabel: tipo.label,
        kindLabelPt: tipo.labelPt,
        title: d.title,
        body: d.body,
        // Pronta, de um lugar só: "Ana Medica · CRM 123456".
        signature: assinatura(d),
        from: d.clinic?.name ?? null,
        sentAt: d.sentAt,
        revokedAt: d.revokedAt,
        revokedReason: d.revokedReason,
      };
    }),
  });
}
