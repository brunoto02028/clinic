export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getActor, isStaff } from "@/lib/tenant-access";
import { prisma } from "@/lib/db";

/**
 * O prontuário de quem está logado, quando essa pessoa também é paciente da
 * própria clínica (114 T-5).
 *
 * O Bruno usa **um** medidor de pressão nos dois papéis: mede pacientes e mede a
 * si próprio. A leitura chega pela ligação da clínica, e sem uma sessão de
 * medição aberta ela fica na caixa, à espera de alguém dizer de quem é — de
 * propósito, porque um aparelho partilhado não sabe quem pôs o braço.
 *
 * O que faltava não era a regra: era o gesto. Dizer "esta é minha" custava
 * buscar o próprio nome numa lista de pacientes.
 *
 * Esta rota responde **quem é você, do lado do paciente**, para a caixa poder
 * oferecer um toque. Ela não atribui nada: a atribuição continua na rota de
 * sempre, com a guarda de sempre.
 *
 * O laço é pelo **e-mail**, dentro da própria clínica, porque é o e-mail que a
 * mesma pessoa usa nos dois lados. Sem correspondência, devolve `null` e a
 * caixa não mostra o botão — **não há adivinhação**, e é isso que impede a
 * leitura de um paciente de cair no prontuário de um terapeuta por engano.
 */
export async function GET(req: NextRequest) {
  const actor = await getActor(req);
  if (!actor || !isStaff(actor) || !actor.clinicId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // O `Actor` nao carrega o e-mail, e e por ele que a mesma pessoa se liga dos
  // dois lados.
  const eu = await prisma.user.findUnique({
    where: { id: actor.userId },
    select: { email: true },
  });
  const email = eu?.email;
  if (!email) return NextResponse.json({ patient: null });

  const patient = await prisma.user.findFirst({
    where: {
      role: "PATIENT",
      clinicId: actor.clinicId,
      email: { equals: email, mode: "insensitive" },
    },
    select: { id: true, firstName: true, lastName: true },
  });

  return NextResponse.json({ patient: patient ?? null });
}
