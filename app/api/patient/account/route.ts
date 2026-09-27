export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";
import { prisma } from "@/lib/db";
import { getEffectiveUser } from "@/lib/get-effective-user";
import { logAudit } from "@/lib/system-logger";

/**
 * Apagar a própria conta, de dentro do app (090).
 *
 * A Apple exige isto desde 2022 de todo app que deixa criar conta, e é um dos
 * motivos mais comuns de rejeição. Mas aqui ele esbarra noutra obrigação: o
 * registro clínico tem retenção legal de anos, e os nossos próprios termos
 * publicados dizem "no mínimo 5 anos após o seu último tratamento".
 *
 * **Então a conta some e o prontuário fica.** Apagar o `User` cascatearia
 * sobre consultas, notas clínicas, exames e medições que a clínica é obrigada
 * a guardar — e apagar aquilo a pedido de quem quer sair do app seria destruir
 * prova de atendimento.
 *
 * O que esta rota faz é acabar com o **acesso**, que é o que a pessoa está
 * pedindo quando pede para apagar a conta:
 *
 * - o login para de funcionar, na hora;
 * - a senha vira um valor que ninguém conhece — nem quem tinha a antiga;
 * - os aparelhos param de receber aviso;
 * - fica registrado quem pediu e quando.
 *
 * A tela do app diz exatamente isso antes de perguntar, porque prometer
 * "apagamos tudo" e guardar o prontuário seria mentir na hora em que a pessoa
 * está decidindo confiar menos.
 */
export async function DELETE(req: NextRequest) {
  const effectiveUser = await getEffectiveUser();
  if (!effectiveUser) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  // Quem está fingindo ser outra pessoa não apaga a conta dela. Seria a ação
  // mais destrutiva do sistema disponível justamente no modo de leitura.
  if (effectiveUser.isImpersonating) {
    return NextResponse.json(
      { error: "Cannot delete an account while viewing as someone else", errorPt: "Não dá para apagar uma conta enquanto você vê como outra pessoa" },
      { status: 403 }
    );
  }

  const userId = effectiveUser.userId;
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, role: true, deletedAt: true },
  });
  if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  // Só paciente. Um terapeuta que some leva junto o acesso da clínica ao
  // próprio trabalho dele, e isso é decisão de quem administra, não dele.
  if (user.role !== "PATIENT") {
    return NextResponse.json(
      { error: "Only a patient account can be deleted from the app. Ask the clinic." },
      { status: 403 }
    );
  }

  if (user.deletedAt) {
    // Já apagada. Responder sucesso de novo é mais honesto que um erro: o
    // estado que a pessoa pediu é o estado em que a conta está.
    return NextResponse.json({ success: true, deletedAt: user.deletedAt });
  }

  const agora = new Date();

  await prisma.$transaction(async (tx) => {
    await (tx as any).user.update({
      where: { id: userId },
      data: {
        deletedAt: agora,
        isActive: false,
        // Uma senha que ninguém conhece, nem quem sabia a antiga. Deixar a
        // anterior faria "conta apagada" significar "conta esperando".
        password: await bcrypt.hash(randomBytes(32).toString("hex"), 10),
        pushEnabled: false,
      },
    });

    /**
     * Quem ele cuidava sai junto (091 T-7, achado do QA de 27/09/2026).
     *
     * Sem isto, apagar a conta da mãe deixava a filha **ativa e inalcançável**:
     * apontando para uma conta morta, sem sessão possível — ninguém consegue
     * pedir a sessão dela, porque quem podia não existe mais — e ainda
     * contando como paciente ativa da clínica.
     *
     * Desligar, e não apagar: ela tem prontuário, e a mesma razão que impede
     * `user.delete` aqui em cima vale para ela.
     */
    await (tx as any).user.updateMany({
      where: { managedById: userId, deletedAt: null },
      data: { deletedAt: agora, isActive: false, pushEnabled: false },
    });

    // Os aparelhos param de receber aviso. Sem isto, uma conta apagada
    // continuaria fazendo o telefone tocar.
    await (tx as any).pushDeviceToken
      .deleteMany({ where: { userId } })
      .catch(() => {});
  });

  await logAudit({
    userId,
    action: "PATIENT_ACCOUNT_DELETED",
    entityType: "User",
    entityId: userId,
    description: `Patient deleted their own account from the app. Clinical records retained under the published retention period.`,
  }).catch(() => {});

  return NextResponse.json({ success: true, deletedAt: agora });
}
