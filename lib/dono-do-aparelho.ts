import { prisma } from "@/lib/db";

/**
 * De quem é o aparelho, quando ninguém abriu uma janela de medição (114 T-5).
 *
 * O Bruno, 30/09/2026: *"o medidor de pressão eu quero usar para a clínica e
 * também para mim, como paciente meu."*
 *
 * ## Isto reverte uma decisão, e a reversão é consciente
 *
 * `clinic-device.ts` argumenta, com todas as letras, que *sem sessão* **não**
 * quer dizer *foi o dono* — quer dizer *ninguém disse quem foi*. O atalho caiu
 * no review de 27/09/2026 porque a pressão de um paciente entrava no prontuário
 * do dono em silêncio e disparava alerta como sendo dele.
 *
 * O argumento continua verdadeiro. O Bruno ouviu-o duas vezes e escolheu assim
 * mesmo: o aparelho é dele, o risco é dele, e o que torna a escolha defensável é
 * a outra metade que ele pediu — **poder mover** uma leitura arquivada por
 * engano. Sem essa metade eu não a faria, porque seria irreversível.
 *
 * ## O que limita o estrago
 *
 * O dono não é adivinhado. Só existe quando **a mesma conta do provedor** está
 * ligada duas vezes: uma como aparelho da clínica e outra como ligação pessoal
 * de um paciente daquela clínica. É o próprio paciente que criou a segunda, pelo
 * app — ou seja, alguém disse *"esta conta é minha"*, e é essa a afirmação em
 * que isto se apoia.
 *
 * Sem essa segunda ligação, nada muda: a leitura continua a ir para a caixa, à
 * espera de uma pessoa.
 */

export interface DonoDoAparelho {
  patientId: string;
  connectionId: string;
}

/**
 * O paciente dono da conta deste aparelho de clínica, se houver.
 *
 * `null` sempre que houver qualquer dúvida — nenhuma conta do provedor gravada,
 * nenhuma ligação pessoal, mais do que uma, ou um dono que não é paciente desta
 * clínica. **Ambiguidade não vira palpite**; vira caixa de entrada.
 */
export async function donoDoAparelho(
  clinicConnectionId: string,
  clinicId: string
): Promise<DonoDoAparelho | null> {
  const aparelho = await (prisma as any).wearableConnection.findUnique({
    where: { id: clinicConnectionId },
    select: { providerUserId: true, provider: true, isClinicDevice: true },
  });
  // Sem a conta do provedor não há como saber que as duas ligações são a mesma
  // conta — e emparelhar por outra coisa seria exatamente o palpite que este
  // arquivo existe para não dar.
  if (!aparelho?.providerUserId || aparelho.isClinicDevice !== true) return null;

  const pessoais = await (prisma as any).wearableConnection.findMany({
    where: {
      provider: aparelho.provider,
      providerUserId: aparelho.providerUserId,
      isClinicDevice: false,
      status: { not: "DISCONNECTED" },
    },
    select: { id: true, userId: true },
    take: 2,
  });

  // Duas pessoas a reivindicar a mesma conta e o aparelho volta a não saber de
  // quem é a leitura. É o caso `ambiguous` de sempre, por outro caminho.
  if (pessoais.length !== 1) return null;

  const dono = await prisma.user.findUnique({
    where: { id: pessoais[0].userId },
    select: { id: true, role: true, clinicId: true, isActive: true },
  });
  if (!dono || !dono.isActive) return null;
  // O prontuário tem de ser desta clínica: arquivar a leitura no prontuário de
  // outro inquilino seria um vazamento, e não uma atribuição errada.
  if (dono.role !== "PATIENT" || dono.clinicId !== clinicId) return null;

  return { patientId: dono.id, connectionId: pessoais[0].id };
}
