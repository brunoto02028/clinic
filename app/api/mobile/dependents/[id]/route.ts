export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getMobileUser } from "@/lib/mobile-auth-guard";
import { ehSessaoDeTerceiro } from "@/lib/mobile-tokens";
import { corsJson, corsPreflight } from "@/lib/mobile-cors";
import { validarPessoa, pessoaPublica, pessoaGeridaMinha } from "@/lib/managed-patients";

export function OPTIONS() {
  return corsPreflight();
}

/**
 * Editar ou desligar uma pessoa gerida (091 T-7).
 *
 * `pessoaGeridaMinha` leva o responsável junto do id. **Achar pelo id e depois
 * conferir o dono são duas operações, e a segunda é a que alguém esquece.**
 * Com os dois na busca, a criança de outra conta simplesmente não existe — e a
 * resposta é 404, que não confirma nem desmente que aquele id exista.
 */
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const payload = getMobileUser(request);
  if (!payload) return corsJson({ error: "Unauthorised" }, { status: 401 });

  if (ehSessaoDeTerceiro(payload)) {
    return corsJson(
      {
        error: "Switch back to your own account to manage this.",
        errorPt: "Volte para a sua conta para gerir isto.",
        code: "on_behalf_read_only",
      },
      { status: 403 }
    );
  }

  const { id } = await params;
  if (!(await pessoaGeridaMinha(id, payload.sub))) {
    return corsJson({ error: "Not found", errorPt: "Não encontrado" }, { status: 404 });
  }

  const body = await request.json().catch(() => ({}));
  const r = validarPessoa(body);
  if ("erro" in r) return corsJson({ error: r.erro, errorPt: r.erroPt }, { status: 400 });

  const atualizada = await prisma.user.update({
    where: { id },
    data: {
      firstName: r.pessoa.firstName,
      lastName: r.pessoa.lastName,
      dateOfBirth: r.pessoa.dateOfBirth,
      sex: r.pessoa.sex,
      managedRelationship: r.pessoa.relationship,
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      dateOfBirth: true,
      sex: true,
      managedRelationship: true,
    },
  });
  return corsJson({ dependent: pessoaPublica(atualizada) });
}

/**
 * Remover é **desligar, não apagar**.
 *
 * Agora que a pessoa gerida é paciente de verdade, ela pode ter consulta, nota
 * clínica e exame no nome dela. `user.delete` cascatearia sobre tudo isso — o
 * mesmo motivo pelo qual a exclusão de conta do próprio paciente nunca apaga
 * a linha. O registro clínico não é do responsável para apagar a pedido.
 */
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const payload = getMobileUser(request);
  if (!payload) return corsJson({ error: "Unauthorised" }, { status: 401 });

  if (ehSessaoDeTerceiro(payload)) {
    return corsJson(
      {
        error: "Switch back to your own account to manage this.",
        errorPt: "Volte para a sua conta para gerir isto.",
        code: "on_behalf_read_only",
      },
      { status: 403 }
    );
  }

  const { id } = await params;
  if (!(await pessoaGeridaMinha(id, payload.sub))) {
    return corsJson({ error: "Not found", errorPt: "Não encontrado" }, { status: 404 });
  }

  await prisma.user.update({
    where: { id },
    data: { deletedAt: new Date(), isActive: false },
  });
  return corsJson({ success: true });
}
