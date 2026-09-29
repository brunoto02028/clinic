import { NextResponse } from "next/server";
import { patientGate } from "@/lib/patient-gate";
import { ITENS_PARTILHAVEIS, partilhasDoPaciente } from "@/lib/care-share";

export const dynamic = "force-dynamic";

const ROTULO = new Map(ITENS_PARTILHAVEIS.map((i) => [i.value, i]));

/**
 * O que foi partilhado sobre mim, entre quem cuida de mim (102 T-9).
 *
 * O Bruno decidiu que **quem detém o paciente autoriza** — e a quarta
 * consequência disso é que *"o paciente vê, e pode revogar"*. Ele não autoriza
 * cada partilha, mas nada é invisível para ele: quem passou, o quê, para quem,
 * e quando.
 *
 * **Sem `module` na porta**, de propósito. Igual à tela de quem tem acesso
 * (T-3): saber quem vê o seu prontuário não é uma funcionalidade que uma clínica
 * possa desligar.
 *
 * O revogado vem junto, com a data: saber que algo foi partilhado e depois
 * cortado é parte do que ele tem direito de ver.
 */
export async function GET() {
  const gate = await patientGate();
  if (gate.response) return gate.response;
  const userId = gate.gate!.userId;

  const linhas = await partilhasDoPaciente(userId);

  return NextResponse.json({
    shares: linhas.map((s: any) => {
      const r = ROTULO.get(s.item);
      return {
        id: s.id,
        item: s.item,
        itemLabel: r?.label ?? s.item,
        itemLabelPt: r?.labelPt ?? s.item,
        note: s.note,
        // Quem passou e quem recebeu, por nome: é o que a frase "com quem" quer
        // dizer. A clínica aparece porque o nome sozinho não situa ninguém.
        from: [s.fromUser?.firstName, s.fromUser?.lastName].filter(Boolean).join(" ") || null,
        fromClinic: s.fromClinic?.name ?? null,
        to: [s.toUser?.firstName, s.toUser?.lastName].filter(Boolean).join(" ") || null,
        sharedAt: s.sharedAt,
        revokedAt: s.revokedAt,
        revokedReason: s.revokedReason,
      };
    }),
  });
}
