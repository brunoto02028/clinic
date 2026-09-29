import { prisma } from "@/lib/db";
import { podeReceber, taxaEmCentavos, type DestinoDoRepasse } from "@/lib/repasse";

/**
 * O lado do repasse que fala com o banco (102 T-6).
 *
 * Separado de `lib/repasse.ts` porque aquele é importado por uma tela, e o
 * cliente do Prisma não entra em componente de navegador.
 */

/**
 * Para onde vai o dinheiro desta consulta, e quanto fica.
 *
 * `null` quer dizer **cobrança normal da BPR**: consulta da reabilitação, ou
 * profissional que ainda não pode receber. Nos dois casos o Checkout sai sem
 * destino nenhum, que é o comportamento de sempre.
 */
export async function destinoDoRepasse(
  clinicId: string,
  valorEmCentavos: number
): Promise<DestinoDoRepasse | null> {
  const clinic = await prisma.clinic.findUnique({
    where: { id: clinicId },
    select: {
      type: true,
      stripeAccountId: true,
      stripeOnboarded: true,
      platformFeePercent: true,
    },
  });
  if (!clinic || !podeReceber(clinic)) return null;

  return {
    destination: clinic.stripeAccountId!,
    applicationFeeCents: taxaEmCentavos(valorEmCentavos, clinic.platformFeePercent),
  };
}
