import { NextResponse } from "next/server";
import { patientGate } from "@/lib/patient-gate";
import { bookingOptionsFor } from "@/lib/booking-options";

export const dynamic = "force-dynamic";

/**
 * O que a tela precisa saber antes de o paciente tocar em "Marcar".
 *
 * Responde a mesma pergunta que a marcação responde, pela mesma função — a
 * tela prometendo um preço e o servidor cobrando outro é o defeito que isto
 * existe para impedir.
 */
export async function GET() {
  // `mod_appointments` é o mesmo módulo que a tela de marcar já exige.
  const gate = await patientGate({ module: "mod_appointments" });
  if (gate.response) return gate.response;

  const opcao = await bookingOptionsFor(gate.gate!.userId);
  return NextResponse.json(opcao);
}
