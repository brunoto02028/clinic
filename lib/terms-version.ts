import { prisma } from "@/lib/db";

/**
 * A versão dos termos de uso, e o registro de quem aceitou qual (26/09/2026).
 *
 * **O que estava errado.** Aceitar os termos gravava um `consentAcceptedAt` no
 * usuário e mais nada: em produção havia 6 pacientes com o carimbo e **uma**
 * linha em `ConsentLog` (um aviso de monitoramento). A pergunta *"qual texto
 * essa pessoa aceitou?"* não tinha resposta — e "aceitou" só significa algo
 * junto com "aceitou **este** texto". A versão existia, mas cravada no corpo de
 * um e-mail (`termsVersion: 'v1.0'`), onde ninguém consulta.
 *
 * O consentimento do exame (081) e o aviso de não-emergência (074) já faziam
 * certo. Isto alinha os termos gerais ao mesmo desenho: um texto, uma versão,
 * um lugar, e uma linha no log com IP e aparelho.
 */

/**
 * 1.1 porque `/terms` ganhou a seção **Laboratory Tests** em 26/09/2026 — quem
 * aceitou antes não leu que a análise é responsabilidade do laboratório, que o
 * resultado é da pessoa, nem a regra de reembolso.
 *
 * **Subir a versão não tranca ninguém.** O portão do paciente olha
 * `consentAcceptedAt`, não a versão, então os 6 aceites existentes continuam
 * valendo. O que a versão responde é outra coisa: *o que* cada um leu. Pedir
 * novo aceite a quem já aceitou é decisão de produto, e não é minha.
 */
export const TERMS_VERSION = "1.1";

/**
 * Registra o aceite dos termos, com versão, IP e aparelho.
 *
 * Nunca lança: um log que falha não pode impedir a pessoa de usar o app depois
 * de ela ter aceitado — o `consentAcceptedAt` já foi gravado por quem chamou, e
 * perder a linha do log é ruim, perder o aceite é pior.
 */
export async function registrarAceiteDosTermos(args: {
  patientId: string;
  req: { headers: { get(name: string): string | null } };
  /** Onde a pessoa aceitou: a tela do portal, a triagem, o cadastro no app. */
  onde: string;
}): Promise<void> {
  try {
    await prisma.consentLog.create({
      data: {
        patientId: args.patientId,
        action: "TERMS_ACCEPTED",
        termsVersion: TERMS_VERSION,
        // `ipAddress`, não `ip`: é como o modelo nomeia.
        ipAddress: args.req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null,
        userAgent: args.req.headers.get("user-agent") || null,
        metadata: { onde: args.onde },
      } as any,
    });
  } catch (e: any) {
    console.error("[terms] não foi possível registrar o aceite", args.patientId, e?.message);
  }
}

/** Qual versão esta pessoa aceitou, e quando — `null` quando não há registro. */
export async function aceiteDosTermos(
  patientId: string
): Promise<{ version: string; acceptedAt: Date } | null> {
  const log = await prisma.consentLog.findFirst({
    where: { patientId, action: "TERMS_ACCEPTED" },
    orderBy: { createdAt: "desc" },
    select: { termsVersion: true, createdAt: true },
  });
  return log ? { version: log.termsVersion, acceptedAt: log.createdAt } : null;
}
