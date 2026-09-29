export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getActor, isStaff } from "@/lib/tenant-access";
import { postcodeDoTexto, sugerirMinutosDeViagem } from "@/lib/tempo-de-viagem";

/**
 * Quanto tempo de viagem sugerir para um atendimento em domicílio (109 T-3).
 *
 * Devolve **uma sugestão**, e diz de onde ela veio. Quem marca decide.
 *
 * O `null` é uma resposta legítima: postcode que não existe, endereço sem
 * postcode nenhum, serviço fora do ar. A tela então pede o número em vez de
 * inventar um — e ninguém fica impedido de marcar porque uma estimativa falhou.
 */
export async function GET(req: NextRequest) {
  const actor = await getActor(req);
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isStaff(actor)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (!actor.clinicId) return NextResponse.json({ error: "No clinic context" }, { status: 400 });

  const patientId = new URL(req.url).searchParams.get("patientId");
  if (!patientId) {
    return NextResponse.json({ error: "patientId is required" }, { status: 400 });
  }

  // A parede junto do id: 404 para quem não é desta clínica, nunca 403.
  const paciente = await prisma.user.findFirst({
    where: { id: patientId, clinicId: actor.clinicId, role: "PATIENT" },
    select: { address: true, city: true, postcode: true },
  });
  if (!paciente) {
    return NextResponse.json({ error: "Patient not found" }, { status: 404 });
  }

  const clinica = await prisma.clinic.findUnique({
    where: { id: actor.clinicId },
    select: { address: true, city: true, postcode: true },
  });

  /**
   * O postcode onde ele estiver.
   *
   * O campo próprio primeiro; depois o endereço em texto livre, porque é ali
   * que ele costuma estar — a paciente deste caso tem
   * `"8 South Tadworth Farm Close, KT20 5BF"` numa linha só, com o campo
   * `postcode` vazio.
   */
  const daClinica =
    clinica?.postcode?.trim() || postcodeDoTexto(clinica?.address, clinica?.city);
  const doPaciente =
    paciente.postcode?.trim() || postcodeDoTexto(paciente.address, paciente.city);

  if (!daClinica || !doPaciente) {
    return NextResponse.json({
      minutes: null,
      reason: !daClinica ? "clinic_postcode_missing" : "patient_postcode_missing",
      clinicPostcode: daClinica,
      patientPostcode: doPaciente,
    });
  }

  const minutes = await sugerirMinutosDeViagem(daClinica, doPaciente);
  return NextResponse.json({
    minutes,
    reason: minutes === null ? "lookup_failed" : null,
    clinicPostcode: daClinica,
    patientPostcode: doPaciente,
  });
}
