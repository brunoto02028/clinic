import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";
import { prisma } from "@/lib/db";
import { revokeAllForUser } from "@/lib/mobile-tokens";
import { logAudit } from "@/lib/system-logger";

/**
 * Fechar a conta de um paciente. **Um lugar só.**
 *
 * A Apple exige isto de todo app que deixa criar conta (diretriz 5.1.1(v)), e
 * exige que aconteça dentro do app — não por e-mail, não pedindo à clínica.
 *
 * ## Por que este arquivo foi reescrito em 27/09/2026
 *
 * Existiam **duas** implementações de "fechar conta", e elas discordavam:
 *
 * | | `DELETE /api/patient/account` | `POST /api/patient/delete-account` |
 * |---|---|---|
 * | quem chamava | **o app** | ninguém |
 * | o prontuário | fica identificado | **era pseudonimizado** (nome → "Removed account") |
 * | `deletedAt` | marcava | não marcava |
 * | quem a pessoa cuidava | ia junto | **ficava ativo e inalcançável** |
 * | token do app revogado | não | sim |
 * | registro do pedido | nenhum | `ConsentLog` |
 *
 * Duas definições contraditórias da operação mais destrutiva do sistema, uma
 * delas morta. É assim que a errada é ligada depois, por quem achar ela
 * primeiro. Então: uma implementação, e ela é a união do que cada uma acertava.
 *
 * ## A pseudonimização saiu, e quem decidiu isso foi a tela
 *
 * A implementação morta apagava o nome do prontuário. A tela do app promete o
 * contrário, com estas palavras: *"Your clinical record is kept for the period
 * in the terms — the law requires it of the clinic, and **it is not ours to
 * delete on request**."*
 *
 * Apagar o nome é apagar parte do prontuário. Um registro clínico que não
 * identifica ninguém não cumpre o dever de guardá-lo — nem serve para
 * continuidade de cuidado, nem para prova de atendimento. A promessa publicada
 * é a decisão, e ela é a conservadora.
 *
 * **Então o que acaba aqui é o acesso:**
 *
 * - o login para de funcionar, na hora;
 * - a senha vira um valor que ninguém conhece — nem quem sabia a antiga;
 * - os aparelhos param de receber aviso, e os tokens do app são revogados;
 * - quem a pessoa cuidava é desligado junto;
 * - fica registrado que ela pediu, quando, e de onde.
 *
 * Conta de equipe não passa por aqui: não é autoatendimento, tem autoria
 * clínica pendurada, e um admin fechando a própria conta assim seria outra
 * decisão, com outras consequências.
 */

export class AccountClosureError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string
  ) {
    super(message);
  }
}

export interface CloseAccountInput {
  userId: string;
  /** Para o registro do pedido — é um pedido sobre os próprios dados dela. */
  ipAddress?: string | null;
  userAgent?: string | null;
}

export interface CloseAccountResult {
  closedAt: Date;
  /** Quantas pessoas geridas foram desligadas junto. Zero é o caso comum. */
  geridasDesligadas: number;
  /** `true` quando a conta já estava fechada e nada mudou agora. */
  jaEstavaFechada: boolean;
}

export async function closePatientAccount(input: CloseAccountInput): Promise<CloseAccountResult> {
  const user = await prisma.user.findUnique({
    where: { id: input.userId },
    select: { id: true, role: true, email: true, clinicId: true, deletedAt: true },
  });
  if (!user) throw new AccountClosureError("Not found", 404, "not_found");
  if (user.role !== "PATIENT") {
    throw new AccountClosureError(
      "Only a patient account can be closed from the app. Ask the clinic.",
      403,
      "not_a_patient"
    );
  }

  // Já fechada. Responder o mesmo sucesso é mais honesto que um erro: o estado
  // que ela pediu é o estado em que a conta está.
  if (user.deletedAt) {
    return { closedAt: user.deletedAt, geridasDesligadas: 0, jaEstavaFechada: true };
  }

  const closedAt = new Date();
  // Gerado fora da transação: `bcrypt.hash` é deliberadamente lento, e segurar
  // uma transação aberta por causa dele é prender linhas sem motivo.
  const senhaQueNinguemSabe = await bcrypt.hash(randomBytes(32).toString("hex"), 10);

  const geridasDesligadas = await prisma.$transaction(async (tx) => {
    /**
     * Escrito **primeiro**, e dentro da transação.
     *
     * Se o fechamento falhar não pode existir registro dizendo que aconteceu; e
     * se der certo tem de existir registro de que foi pedido. A linha sobrevive
     * porque a linha da conta sobrevive — o log cascateia dela.
     */
    await (tx as any).consentLog.create({
      data: {
        patientId: user.id,
        action: "DATA_DELETION_REQUEST",
        ipAddress: input.ipAddress ?? null,
        userAgent: input.userAgent ?? null,
        metadata: {
          closedAt: closedAt.toISOString(),
          accessRevoked: true,
          clinicalRecordRetained: true,
        },
      },
    });

    await (tx as any).user.update({
      where: { id: user.id },
      data: {
        deletedAt: closedAt,
        isActive: false,
        password: senhaQueNinguemSabe,
        pushEnabled: false,
        // Lembrete é endereçado a uma pessoa que usa o app. Não há mais.
        bpReminderEnabled: false,
      },
    });

    /**
     * Quem ela cuidava sai junto (091 T-7, achado 5 do QA de 27/09/2026).
     *
     * Sem isto, fechar a conta da mãe deixava a filha **ativa e inalcançável**:
     * apontando para uma conta morta, sem sessão possível — ninguém consegue
     * pedir a sessão dela, porque quem podia não existe mais — e ainda contando
     * como paciente ativa da clínica em qualquer rotina que varra pacientes.
     *
     * **Desligar, e não apagar.** Ela tem prontuário, e a mesma razão que
     * impede um `delete` na conta da mãe vale para o dela. É o mesmo que o
     * botão de remover dependente já faz, e os dois caminhos concordarem é
     * metade do valor disto.
     */
    const geridas = await (tx as any).user.updateMany({
      where: { managedById: user.id, deletedAt: null },
      data: { deletedAt: closedAt, isActive: false, pushEnabled: false },
    });

    // Os aparelhos param de tocar. Sem isto, uma conta fechada continuaria
    // fazendo o telefone vibrar — dela e de quem ela cuidava.
    await (tx as any).pushDeviceToken.deleteMany({
      where: { userId: { in: [user.id] } },
    });

    return geridas.count as number;
  });

  /**
   * Fora da transação de propósito: um armazenamento de token momentaneamente
   * indisponível não pode desfazer um fechamento que a pessoa pediu.
   *
   * `lib/mobile-actor.ts` já recusa qualquer token de conta com `isActive:
   * false`, então um refresh sobrevivente não compra acesso. Mas depender de
   * *todo* consumidor conferir `isActive` é depender de uma disciplina, e
   * revogar é um fato.
   */
  await revokeAllForUser(user.id).catch((e) =>
    console.error("[account-closure] token revocation failed:", e?.message)
  );

  /**
   * E o registro de auditoria, que **não existia** (achado de 27/09/2026).
   *
   * A chamada anterior passava `entityType` — campo que não existe em
   * `AuditLogInput`, que pede `entity` — e omitia `userEmail` e `userRole`, que
   * são obrigatórios no schema. O Prisma lançava, o `.catch(() => {})` engolia,
   * e **nenhuma linha nascia**. O único registro que prova que a pessoa pediu
   * para sair nunca foi escrito, em nenhum fechamento de conta.
   *
   * O `tsc` apontava isso desde sempre; o `npm run build` não, porque o Next
   * está configurado para ignorar erro de tipo.
   */
  await logAudit({
    userId: user.id,
    // O endereço vai aqui porque esta linha é a prova de quem pediu. Não é o
    // caso da pseudonimização — o prontuário fica identificado.
    userEmail: user.email,
    userRole: "PATIENT",
    // O nome de antes, de propósito: é o vocabulário da tela ("Apagar conta") e
    // renomear não compraria nada. Como nenhuma linha jamais nasceu, também não
    // há histórico para migrar — o que torna a tentação de renomear mais barata
    // e igualmente inútil.
    action: "PATIENT_ACCOUNT_DELETED",
    entity: "User",
    entityId: user.id,
    description:
      "Patient closed their own account from the app. Access revoked; clinical record retained under the published retention period.",
    metadata: {
      clinicId: user.clinicId,
      closedAt: closedAt.toISOString(),
      managedPatientsClosed: geridasDesligadas,
    },
    ip: input.ipAddress ?? undefined,
    userAgent: input.userAgent ?? undefined,
  });

  return { closedAt, geridasDesligadas, jaEstavaFechada: false };
}
