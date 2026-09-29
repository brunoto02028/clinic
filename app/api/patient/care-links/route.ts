import { NextResponse } from "next/server";
import { patientGate } from "@/lib/patient-gate";
import { vinculosDoPaciente } from "@/lib/care-link";
import { tipoDoInquilino } from "@/lib/tenant-type";

export const dynamic = "force-dynamic";

/**
 * Quem tem acesso aos meus dados (102 T-3).
 *
 * O paciente não autoriza cada partilha — quem decide o que o colega vê é a
 * clínica que cuida dele (T-9) —, mas **nada disso é invisível para ele**. Esta
 * é a lista: quem, desde quando, e se ainda está valendo.
 *
 * Sem módulo no portão de propósito: saber quem lê o seu prontuário não é
 * funcionalidade de plano. É a lista de quem tem a chave da sua casa.
 */
export async function GET() {
  const gate = await patientGate();
  if (gate.response) return gate.response;
  const userId = gate.gate!.userId;

  const vinculos = await vinculosDoPaciente(userId);

  return NextResponse.json({
    careLinks: vinculos.map((v: any) => ({
      id: v.id,
      acceptedAt: v.acceptedAt,
      endedAt: v.endedAt,
      active: !v.endedAt,
      professional: {
        name: v.professionalClinic.name,
        // O rótulo do tipo, e não o valor do enum: "Doctor", não "DOCTOR".
        kind: tipoDoInquilino(v.professionalClinic.type).label,
        kindPt: tipoDoInquilino(v.professionalClinic.type).labelPt,
        registry: v.professionalClinic.professionalRegistry,
        registryKind: v.professionalClinic.registryKind,
      },
    })),
  });
}
