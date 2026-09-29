import { prisma } from "@/lib/db";
import { isProfissionalExterno } from "@/lib/tenant-type";

/**
 * O vínculo de cuidado — a única porta entre inquilinos (102 T-3).
 *
 * ## O que este arquivo carrega
 *
 * `User.clinicId` é a parede. O dia 28/09/2026 inteiro foi gasto **fechando**
 * furos onde um inquilino alcançava o paciente de outro — e os dois tinham a
 * mesma forma: *o id vem de fora, o inquilino vem da sessão, e ninguém verifica
 * que os dois combinam*.
 *
 * A 102 abre essa porta de propósito. A diferença entre vazamento e
 * funcionalidade é **uma linha dizendo que o paciente concordou** — e é por isso
 * que a pergunta se faz aqui, num lugar só, e nunca numa rota.
 *
 * ## O que o vínculo **não** dá
 *
 * Não dá prontuário. Ele responde *"posso agir sobre esta pessoa?"*; o que se vê
 * dela é decidido item a item na partilha (T-9). Ter vínculo e ver tudo seriam
 * a mesma coisa, e é justamente o que o Bruno pediu para não acontecer.
 */

/**
 * Existe vínculo vivo entre este profissional e este paciente?
 *
 * **Falha fechado.** Se a consulta estourar — banco fora, cliente sem a tabela,
 * o que for —, a resposta é "não". Deixar o erro subir transformaria um `404`
 * de acesso negado num `500`, e há um caminho em que isso vira acesso
 * concedido: qualquer chamador que trate exceção como "deu ruim, segue".
 *
 * Numa pergunta cuja resposta errada abre o prontuário de alguém, o silêncio
 * tem de ser "não".
 */
export async function vinculoVivo(
  patientId: string,
  professionalClinicId: string
): Promise<boolean> {
  try {
    const v = await (prisma as any).careLink.findFirst({
      where: { patientId, professionalClinicId, endedAt: null },
      select: { id: true },
    });
    return !!v;
  } catch {
    return false;
  }
}

/**
 * O vínculo nasce **do pagamento**, e de nenhum outro caminho.
 *
 * Não existe rota que crie um à mão: profissional não ganha paciente por estar
 * na plataforma. Esta função é chamada pelo webhook da Stripe (T-6), depois de
 * o dinheiro entrar.
 *
 * Idempotente por construção: pagar uma segunda consulta com o mesmo
 * profissional **reativa** o mesmo vínculo em vez de empilhar outro — um
 * encerrado ao lado de um vivo seria duas respostas para a mesma pergunta.
 */
export async function criarVinculoPorPagamento(opts: {
  patientId: string;
  professionalClinicId: string;
  appointmentId?: string | null;
}): Promise<{ id: string; criado: boolean }> {
  const { patientId, professionalClinicId, appointmentId } = opts;

  /**
   * Só profissional externo tem vínculo.
   *
   * A reabilitação alcança o paciente dela por `clinicId` e não precisa de um;
   * criar mesmo assim poria uma linha que diz "pode" onde a parede já dizia, e
   * um dia alguém a leria como a única fonte.
   */
  const clinica = await prisma.clinic.findUnique({
    where: { id: professionalClinicId },
    select: { type: true },
  });
  if (!clinica || !isProfissionalExterno(clinica.type)) {
    return { id: "", criado: false };
  }

  const existente = await (prisma as any).careLink.findUnique({
    where: { patientId_professionalClinicId: { patientId, professionalClinicId } },
    select: { id: true, endedAt: true },
  });

  if (existente) {
    // Reativar um encerrado é o caso de quem voltou ao mesmo médico meses
    // depois. `acceptedAt` volta para agora: é um consentimento novo.
    if (existente.endedAt) {
      await (prisma as any).careLink.update({
        where: { id: existente.id },
        data: {
          endedAt: null,
          endedById: null,
          acceptedAt: new Date(),
          createdByAppointmentId: appointmentId ?? null,
        },
      });
      return { id: existente.id, criado: true };
    }
    return { id: existente.id, criado: false };
  }

  const novo = await (prisma as any).careLink.create({
    data: {
      patientId,
      professionalClinicId,
      createdByAppointmentId: appointmentId ?? null,
    },
    select: { id: true },
  });
  return { id: novo.id, criado: true };
}

/**
 * Encerrar — pelo paciente, no app dele.
 *
 * Corta o acesso **dali para frente** e não apaga nada: a consulta que houve e
 * a receita que foi escrita são registro clínico. Apagar seria sumir com a
 * prova de uma prescrição.
 */
export async function encerrarVinculo(opts: {
  patientId: string;
  careLinkId: string;
  endedById: string;
}): Promise<boolean> {
  /**
   * O `patientId` no `where` é o que impede encerrar o vínculo de outra
   * pessoa: um id que não é dele simplesmente não existe aqui.
   */
  const r = await (prisma as any).careLink.updateMany({
    where: { id: opts.careLinkId, patientId: opts.patientId, endedAt: null },
    data: { endedAt: new Date(), endedById: opts.endedById },
  });
  return r.count === 1;
}

/** Quem tem acesso a este paciente, para ele ver no app. */
export async function vinculosDoPaciente(patientId: string) {
  return (prisma as any).careLink.findMany({
    where: { patientId },
    orderBy: [{ endedAt: "asc" }, { acceptedAt: "desc" }],
    select: {
      id: true,
      acceptedAt: true,
      endedAt: true,
      professionalClinic: {
        select: {
          id: true,
          name: true,
          type: true,
          professionalRegistry: true,
          registryKind: true,
        },
      },
    },
  });
}

/**
 * Os inquilinos que cuidam desta pessoa agora (102 T-9).
 *
 * Mora aqui, e não em `care-share.ts`, porque **toda leitura de `careLink`
 * mora aqui**: uma segunda consulta espalhada por aí seria uma segunda porta, e
 * ninguém saberia das duas. A varredura `toda-rota-de-paciente-tem-guarda`
 * existe para pegar exatamente isso, e pegou.
 *
 * Não responde "pode agir sobre este paciente" — para isso é `vinculoVivo`.
 * Responde "quem mais está nesse cuidado", que é o que a tela de partilha
 * precisa para oferecer **nomes**.
 */
export async function inquilinosQueCuidam(patientId: string): Promise<string[]> {
  const links = await (prisma as any).careLink.findMany({
    where: { patientId, endedAt: null },
    select: { professionalClinicId: true },
  });
  return links.map((l: any) => l.professionalClinicId as string);
}
