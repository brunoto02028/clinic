export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { getMobileUser } from "@/lib/mobile-auth-guard";
import { corsJson, corsPreflight } from "@/lib/mobile-cors";
import { signManagedPatientToken, ehSessaoDeTerceiro } from "@/lib/mobile-tokens";
import { pessoaGeridaMinha, pessoaPublica } from "@/lib/managed-patients";

export function OPTIONS() {
  return corsPreflight();
}

/**
 * A mãe passa a ver a clínica **como a filha** (091 T-7).
 *
 * O Bruno: *"é a criança que está fazendo o tratamento de reabilitação."* Ela
 * tem consulta, protocolo, exercício prescrito e nota clínica — e quem abre o
 * app é quem responde por ela.
 *
 * Esta rota troca o token do responsável por um token curto cujo `sub` é a
 * criança. Todas as rotas clínicas do app leem `payload.sub`, então elas
 * passam a responder sobre ela **sem nenhuma mudança** — que era a única
 * alternativa honesta a tocar em dezenas de rotas, uma a uma.
 *
 * Três limites, e cada um fecha um buraco diferente:
 *
 * 1. **`managedById` é conferido aqui**, contra a sessão de quem pede. Pedir a
 *    sessão do filho de outra pessoa devolve 404 — não confirma o id.
 * 2. **Não há refresh.** A criança nunca ganha credencial durável; o token é
 *    emprestado do responsável e, ao expirar, a checagem acontece de novo.
 * 3. **Não se aninha.** Quem já está agindo por alguém não pode pedir a sessão
 *    de um terceiro — seria um encadeamento sem dono claro.
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const payload = getMobileUser(request);
  if (!payload) return corsJson({ error: "Unauthorised" }, { status: 401 });

  if (ehSessaoDeTerceiro(payload)) {
    return corsJson(
      {
        error: "You are already viewing as someone else.",
        errorPt: "Você já está vendo como outra pessoa.",
        code: "already_on_behalf",
      },
      { status: 403 }
    );
  }

  const { id } = await params;
  const crianca = await pessoaGeridaMinha(id, payload.sub);
  if (!crianca) {
    return corsJson({ error: "Not found", errorPt: "Não encontrado" }, { status: 404 });
  }

  const accessToken = signManagedPatientToken({
    child: {
      id: crianca.id,
      firstName: crianca.firstName,
      lastName: crianca.lastName,
      clinicId: crianca.clinicId,
    },
    guardian: payload,
  });

  return corsJson({ accessToken, patient: pessoaPublica(crianca) });
}
