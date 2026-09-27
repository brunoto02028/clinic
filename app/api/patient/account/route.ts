export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { AccountClosureError, closePatientAccount } from "@/lib/account-closure";
import { getEffectiveUser } from "@/lib/get-effective-user";

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

  /**
   * As checagens de "é paciente?" e "já está fechada?" moraram aqui e agora
   * moram no helper.
   *
   * Não é economia de linha: enquanto estavam nos dois lugares, um dos dois
   * caminhos de fechamento podia divergir do outro — e foi exatamente o que
   * aconteceu. Uma regra, um lugar.
   */
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    null;

  try {
    const { closedAt, geridasDesligadas } = await closePatientAccount({
      userId,
      ipAddress: ip,
      userAgent: req.headers.get("user-agent"),
    });
    // `deletedAt` mantido no nome antigo: e o que a tela do app le hoje, e
    // trocar o contrato exigiria um update do app para nada.
    return NextResponse.json({
      success: true,
      deletedAt: closedAt,
      managedPatientsClosed: geridasDesligadas,
    });
  } catch (e) {
    if (e instanceof AccountClosureError) {
      return NextResponse.json({ error: e.message, code: e.code }, { status: e.status });
    }
    console.error("[patient/account] close failed:", (e as any)?.message);
    return NextResponse.json(
      {
        error: "Could not close the account just now. Try again.",
        errorPt: "Não foi possível fechar a conta agora. Tente de novo.",
      },
      { status: 500 }
    );
  }
}
