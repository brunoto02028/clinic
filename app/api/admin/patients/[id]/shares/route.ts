import { NextRequest, NextResponse } from "next/server";
import { staffPatientAccess } from "@/lib/staff-patient-access";
import {
  ShareError,
  caixaDeEntrada,
  itemValido,
  oQuePartilhei,
  partilhar,
} from "@/lib/care-share";

export const dynamic = "force-dynamic";

/**
 * O que foi partilhado deste paciente (102 T-9).
 *
 * Duas listas, e nunca uma só: **o que eu passei** (com quem, quando, e se foi
 * revogado) e **o que me passaram**. As duas existem porque a partilha vale nos
 * dois sentidos por simetria, e não por gentileza: um médico que vê a evolução
 * inteira da fisioterapia sem ninguém ter passado é o mesmo defeito que uma
 * fisioterapia lendo a sessão do psicólogo.
 */
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const g = await staffPatientAccess(req, params.id, "Patient not found", {
    /**
     * Quem chegou por vínculo vê a **sua** caixa de entrada — o que lhe foi
     * passado. `oQuePartilhei` filtra por `fromClinicId`, então ele não
     * descobre por aqui o que a clínica passou para um terceiro.
     */
    porVinculo: true,
  });
  if (g.response) return g.response;
  const actor = g.actor!;

  const [recebidas, enviadas] = await Promise.all([
    caixaDeEntrada(actor.userId, params.id),
    oQuePartilhei(actor.clinicId!, params.id),
  ]);

  return NextResponse.json({ received: recebidas, sent: enviadas });
}

/**
 * Partilhar **um** item com **um** colega.
 *
 * O corpo aceita um item e um destinatário, e nada em plural. Não há
 * `toUserIds`, não há "para a equipe", não há "para os médicos": qualquer um
 * desses seria a liberação automática que o Bruno proibiu — *"não pode ser
 * automaticamente liberado para todo mundo, só com permissões"* — com outro
 * nome, e quem entrasse na equipe amanhã herdaria o acesso de hoje.
 *
 * Partilhar o mesmo exame com três colegas são três chamadas e três linhas.
 */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const g = await staffPatientAccess(req, params.id, "Patient not found", {
    // Também é travessia legítima: o médico devolve ao terapeuta o que escreveu.
    porVinculo: true,
  });
  if (g.response) return g.response;
  const actor = g.actor!;

  const body = await req.json().catch(() => ({}));
  const { item, itemId, toUserId, note, acknowledgeSessionNote } = body ?? {};

  /**
   * Plural é recusado **explicitamente**, e não ignorado em silêncio.
   *
   * Uma tela futura que mandasse `toUserIds` receberia 400 em vez de partilhar
   * com o primeiro da lista e parecer que funcionou. O erro é a documentação de
   * que essa porta não existe.
   */
  if (Array.isArray(toUserId) || Array.isArray(item) || Array.isArray(itemId)) {
    return NextResponse.json(
      {
        error: "Share one item with one colleague at a time.",
        errorPt: "Partilhe um item com um colega por vez.",
        code: "one_at_a_time",
      },
      { status: 400 }
    );
  }
  if ("toUserIds" in (body ?? {}) || "toEveryone" in (body ?? {}) || "toClinicType" in (body ?? {})) {
    return NextResponse.json(
      {
        error: "There is no way to share with a group, a clinic or a profession.",
        errorPt: "Não existe partilhar com um grupo, uma clínica ou uma profissão.",
        code: "no_group_share",
      },
      { status: 400 }
    );
  }

  if (!itemValido(item) || typeof itemId !== "string" || typeof toUserId !== "string") {
    return NextResponse.json(
      { error: "Pick an item and a colleague.", errorPt: "Escolha um item e um colega." },
      { status: 400 }
    );
  }

  try {
    const share = await partilhar({
      patientId: params.id,
      item,
      itemId,
      fromUserId: actor.userId,
      fromClinicId: actor.clinicId!,
      fromRole: String(actor.role),
      toUserId,
      note: typeof note === "string" ? note : null,
      cienteDoPassoExtra: acknowledgeSessionNote === true,
    });
    return NextResponse.json({ share });
  } catch (e) {
    if (e instanceof ShareError) {
      return NextResponse.json(
        { error: e.message, errorPt: e.messagePt ?? e.message, code: e.code },
        { status: e.status }
      );
    }
    throw e;
  }
}
