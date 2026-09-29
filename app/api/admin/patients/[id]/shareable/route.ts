import { NextRequest, NextResponse } from "next/server";
import { staffPatientAccess } from "@/lib/staff-patient-access";
import {
  ITENS_PARTILHAVEIS,
  colegasQueCuidam,
  itensQuePossoPartilhar,
} from "@/lib/care-share";

export const dynamic = "force-dynamic";

/**
 * O que eu posso partilhar, e com quem (102 T-9).
 *
 * As duas listas que a tela precisa para oferecer **um item e um nome**: os
 * itens do meu inquilino e os colegas que já cuidam desta pessoa. Nenhuma das
 * duas contém profissão, grupo ou clínica como destino — partilhar é sempre com
 * alguém nomeado, e uma tela que oferecesse "os médicos" seria a liberação
 * automática que o Bruno proibiu.
 */
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const g = await staffPatientAccess(req, params.id, "Patient not found", {
    // O profissional intermediado também partilha de volta o que escreveu.
    porVinculo: true,
  });
  if (g.response) return g.response;
  const actor = g.actor!;

  const [items, colleagues] = await Promise.all([
    itensQuePossoPartilhar(params.id, actor.clinicId!),
    colegasQueCuidam(params.id, actor.clinicId!),
  ]);

  return NextResponse.json({
    items,
    colleagues,
    kinds: ITENS_PARTILHAVEIS.map((i) => ({
      value: i.value,
      label: i.label,
      labelPt: i.labelPt,
      // A tela usa isto para pedir a confirmação a mais antes de enviar.
      extraStep: !!i.passoExtra,
    })),
  });
}
