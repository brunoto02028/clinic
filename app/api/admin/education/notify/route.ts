import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getActor, isStaff } from "@/lib/tenant-access";
import { pushMaterialNovo } from "@/lib/push-notify";

export const dynamic = "force-dynamic";

/**
 * Avisar que há material novo — **individual e em massa, pela mesma porta**.
 *
 * O Bruno: *"quero poder dar aviso em massa e individual"* (29/09/2026).
 *
 * ## Por que uma porta só, e não duas
 *
 * Quem recebe o aviso é **quem foi atribuído àquele material e ainda não foi
 * avisado**. Se você atribuiu a uma pessoa, avisa uma; se mandou para todos,
 * avisa todos. A diferença entre individual e massa acontece **antes**, na
 * atribuição — e aqui é sempre a mesma regra.
 *
 * Duas rotas dariam duas contas de quem recebe, e é aí que um envio em massa
 * atravessa a parede: o incidente de 11/09/2026 foi exatamente uma segunda
 * contagem que ninguém tinha conferido.
 *
 * ## Nada dispara sem prévia
 *
 * `dryRun` responde a mesma conta — contagem e nomes — **sem tocar em telefone
 * nenhum**. A tela obriga a passar por ela antes de oferecer o botão que envia.
 *
 * ## E um segundo clique não toca de novo
 *
 * `notifiedAt: null` no filtro é o que torna o aviso idempotente. Telefone
 * tocando duas vezes pelo mesmo material faz a pessoa procurar o segundo.
 */
export async function POST(req: NextRequest) {
  const actor = await getActor(req);
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isStaff(actor)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (!actor.clinicId) return NextResponse.json({ error: "No clinic context" }, { status: 400 });

  const body = await req.json().catch(() => ({}));
  const contentId = typeof body?.contentId === "string" ? body.contentId : "";
  const dryRun = body?.dryRun === true;
  if (!contentId) {
    return NextResponse.json({ error: "Pick the material first." }, { status: 400 });
  }

  /**
   * O material tem de ser **deste** inquilino.
   *
   * O id vem do corpo e a clínica vem da sessão: conferir que combinam é
   * literalmente a forma dos três vazamentos de setembro.
   */
  const content = await prisma.educationContent.findFirst({
    where: { id: contentId, clinicId: actor.clinicId },
    select: { id: true, title: true },
  });
  if (!content) {
    return NextResponse.json({ error: "Material not found" }, { status: 404 });
  }

  /**
   * Quem recebe: atribuído, deste inquilino, ativo, e **ainda não avisado**.
   *
   * `clinicId` na atribuição **e** no paciente. A atribuição já carrega o
   * inquilino, mas um paciente que mudou de clínica depois de ser atribuído
   * continuaria na lista — e receberia aviso de uma casa que não é mais a dele.
   */
  const pendentes = await prisma.educationAssignment.findMany({
    where: {
      contentId: content.id,
      clinicId: actor.clinicId,
      notifiedAt: null,
      patient: { clinicId: actor.clinicId, role: "PATIENT", isActive: true },
    },
    select: {
      id: true,
      patientId: true,
      patient: { select: { firstName: true, lastName: true } },
    },
  });

  const pessoas = pendentes.map((a) => ({
    id: a.patientId,
    name: [a.patient?.firstName, a.patient?.lastName].filter(Boolean).join(" ") || "—",
  }));

  if (dryRun) {
    // A conta, sem telefone nenhum tocando. É o que a tela mostra antes de
    // oferecer o botão.
    const jaAvisados = await prisma.educationAssignment.count({
      where: { contentId: content.id, clinicId: actor.clinicId, notifiedAt: { not: null } },
    });
    return NextResponse.json({
      dryRun: true,
      title: content.title,
      count: pessoas.length,
      alreadyNotified: jaAvisados,
      patients: pessoas,
    });
  }

  if (pessoas.length === 0) {
    return NextResponse.json(
      {
        error: "Everyone assigned to this material has already been told.",
        errorPt: "Todos os atribuídos a este material já foram avisados.",
        code: "nobody_to_notify",
      },
      { status: 409 }
    );
  }

  /**
   * Marcar **antes** de tocar o telefone.
   *
   * Ao contrário do documento (102 T-8), onde o registro vem antes do aviso
   * pela mesma razão: se gravar falhar depois de avisar, o próximo clique
   * avisaria de novo. Aqui o pior caso é alguém ficar sem o aviso — e ficar sem
   * um aviso é melhor que o telefone tocar duas vezes pelo mesmo material.
   */
  await prisma.educationAssignment.updateMany({
    where: { id: { in: pendentes.map((a) => a.id) } },
    data: { notifiedAt: new Date() },
  });

  let enviados = 0;
  for (const p of pessoas) {
    // Um push que falha não derruba os outros: quem não tem aparelho
    // registrado simplesmente não recebe, e isso não é erro.
    const r = await pushMaterialNovo(p.id).catch(() => null);
    /**
     * Conta quem **recebeu**, não quem foi tentado (achado do QA, 29/09/2026).
     *
     * Era `if (r)`. Para quem não tem o aparelho registrado, `sendPushToUser`
     * devolve `{ sent: 0 }` — um objeto, portanto verdadeiro — e a pessoa
     * entrava na conta. A tela então dizia *"Their phones were told there is
     * new material"* quando nenhum telefone tinha sido tocado.
     *
     * `lib/push-send.ts` documenta exatamente este cuidado (*"sent: 0 porque
     * nada saiu"*), e era aqui que ele se perdia.
     */
    enviados += r?.sent ?? 0;
  }

  return NextResponse.json({
    notified: pessoas.length,
    delivered: enviados,
    patients: pessoas,
  });
}
