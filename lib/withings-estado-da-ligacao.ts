/**
 * Quando uma ligação de wearable precisa da pessoa (121 T-3).
 *
 * ## O defeito
 *
 * Nada marcava isto. Procurar `status: "ERROR"` no caminho da reautorização
 * devolvia **zero**: a ligação do Bruno ficou `CONNECTED` e morta durante 27
 * dias, e a tela dele mostrava um mês de buracos como se ele não tivesse
 * medido. O erro existia — `Invalid Params: invalid refresh_token` — mas só na
 * consola do contentor, que já custou o manguito da clínica uma vez.
 *
 * ## O que é "precisa da pessoa"
 *
 * A Withings invalida a **cadeia inteira** quando um refresh token de uso único
 * é usado duas vezes. Não há API de volta: só reautorizar. É um estado da
 * ligação, não um erro passageiro, e por isso tem coluna e não log.
 */

import { prisma } from "@/lib/db";

/**
 * As mensagens que querem dizer *"a pessoa tem de reautorizar"*.
 *
 * O mesmo padrão que a tela do paciente já usa (`resumo-de-saude.ts`), para os
 * dois lados concordarem sobre o que é fatal — e não para a tela adivinhar.
 */
export const PRECISA_REAUTORIZAR = /refresh_token|invalid_grant|unauthor|reauthoris/i;

export function ehFatal(mensagem: unknown): boolean {
  return PRECISA_REAUTORIZAR.test(String(mensagem ?? ""));
}

/**
 * Regista o que correu mal, **de forma durável**, e marca o estado quando a
 * falha é das que só a pessoa resolve.
 *
 * Nunca lança: um erro a registar um erro não pode derrubar quem o chamou — e
 * todos os chamadores estão dentro de um `catch`.
 */
export async function registarFalhaDaLigacao(
  connectionId: string,
  erro: unknown
): Promise<void> {
  const mensagem = String((erro as any)?.message ?? erro ?? "erro desconhecido").slice(0, 500);
  const fatal = ehFatal(mensagem);

  await (prisma as any).wearableConnection
    .update({
      where: { id: connectionId },
      data: {
        lastSyncError: mensagem,
        lastSyncErrorAt: new Date(),
        /*
         * **O estado, e não só a mensagem.** Uma cadeia invalidada não volta
         * sozinha: enquanto isto estiver preenchido, a tela do paciente e o
         * painel da clínica dizem que falta reconectar.
         */
        ...(fatal ? { needsReauthAt: new Date(), status: "ERROR" } : {}),
      },
      select: { id: true },
    })
    .catch((e: any) =>
      console.error(`[ligacao] não consegui registar a falha de ${connectionId}:`, e?.message ?? e)
    );
}

/**
 * Uma renovação que correu bem apaga o estado.
 *
 * Sem isto, quem reconecta continua a ver *"precisa reconectar"* — e um aviso
 * que fica depois de resolvido mente tanto quanto um que nunca aparece.
 */
export async function limparEstadoDaLigacao(connectionId: string): Promise<void> {
  await (prisma as any).wearableConnection
    .updateMany({
      where: {
        id: connectionId,
        OR: [{ needsReauthAt: { not: null } }, { lastSyncError: { not: null } }],
      },
      data: { needsReauthAt: null, lastSyncError: null, lastSyncErrorAt: null },
    })
    .catch(() => {});
}
