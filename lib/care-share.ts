/**
 * A partilha item a item (102 T-9).
 *
 * O Bruno: *"a clínica de reabilitação só vai compartilhar aquilo que foi
 * necessário com os médicos. E a mesma coisa dos médicos. O paciente é um e a
 * gente pode trabalhar com uma equipe multidisciplinar."* E, duas vezes:
 * *"não pode ser automaticamente liberado para todo mundo, só com permissões."*
 *
 * ## As quatro regras que este arquivo existe para impor
 *
 * 1. **Nada nasce partilhado.** Não há configuração, não há "sempre mandar
 *    exames ao médico". Toda partilha é um clique de alguém, num item, para um
 *    colega.
 * 2. **Sempre uma pessoa nomeada.** Não há "mandar para a equipe" nem "liberar
 *    para os médicos": um botão desses é liberação automática com outro nome, e
 *    quem entrasse na equipe amanhã herdaria o acesso de hoje.
 * 3. **Nunca por perfil ou por tipo.** Mesma armadilha, um nível acima.
 * 4. **O paciente vê tudo, e pode revogar.** Ele não autoriza cada uma, mas
 *    nada é invisível para ele.
 *
 * O vínculo da T-3 responde *pode agir sobre este paciente?*. Este arquivo
 * responde a outra pergunta, que é a que o Bruno descreveu: **o que, deste
 * paciente, cada um vê.** Confundir as duas é o caminho para "quem tem vínculo
 * vê tudo", que é o oposto do pedido.
 */
import { prisma } from "@/lib/db";
import { logAudit } from "@/lib/system-logger";
import { inquilinosQueCuidam, vinculoVivo } from "@/lib/care-link";

/**
 * Auditoria, **sem `await`** e sem poder derrubar nada.
 *
 * `logAudit` exige `userEmail`, `userRole` e `description`; quem chama aqui tem
 * o id e às vezes o papel. O que falta vai vazio de propósito: uma linha de
 * auditoria incompleta vale mais que nenhuma, e ir buscar o e-mail seria uma
 * consulta a mais em cada leitura de item partilhado.
 */
function registrar(input: {
  action: string;
  entityId: string;
  userId: string;
  userRole?: string | null;
  description: string;
  metadata?: any;
}) {
  void logAudit({
    userId: input.userId,
    userEmail: "",
    userRole: String(input.userRole ?? ""),
    action: input.action,
    entity: "CareShare",
    entityId: input.entityId,
    description: input.description,
    metadata: input.metadata,
  });
}

export type ItemPartilhavel =
  | "EXAM"
  | "DIAGNOSIS"
  | "ANAMNESIS"
  | "PROFESSIONAL_DOCUMENT"
  | "SESSION_NOTE"
  | "MONITORING_REPORT";

interface Definicao {
  value: ItemPartilhavel;
  label: string;
  labelPt: string;
  /** O modelo do Prisma onde a linha vive. */
  model: string;
  /** Como aquele modelo aponta para o paciente. */
  campoDoPaciente: "patientId" | "userId";
  /**
   * Nota de sessão de psicologia tem tratamento próprio: não entra na partilha
   * comum. Quem partilha uma tem de dizer que sabe o que está partilhando.
   */
  passoExtra?: boolean;
  /**
   * O estado em que a linha **pode** ser partilhada, como fragmento de `where`.
   *
   * Vive aqui, e não na consulta do seletor, porque o seletor e a porta têm de
   * ler o mesmo critério. Quando eles divergiram — o seletor filtrando, a rota
   * não —, o médico passou a ler por inteiro uma receita encerrada e um
   * rascunho que o paciente nunca recebeu, mandando o id direto no corpo
   * (achado 3 da remedição do QA de 29/09/2026). Esconder botão não é fechar
   * porta.
   */
  partilhavelSe?: Record<string, any>;
}

export const ITENS_PARTILHAVEIS: Definicao[] = [
  {
    value: "EXAM",
    label: "Exam or image",
    labelPt: "Exame ou imagem",
    model: "patientDocument",
    campoDoPaciente: "patientId",
  },
  {
    value: "DIAGNOSIS",
    label: "Assessment",
    labelPt: "Avaliação",
    model: "aIDiagnosis",
    campoDoPaciente: "patientId",
  },
  {
    value: "ANAMNESIS",
    label: "History",
    labelPt: "Anamnese",
    model: "medicalScreening",
    campoDoPaciente: "userId",
  },
  {
    value: "PROFESSIONAL_DOCUMENT",
    label: "Prescription or report",
    labelPt: "Receita ou laudo",
    model: "professionalDocument",
    campoDoPaciente: "patientId",
    // Receita enviada e viva. Um rascunho partilhado mostraria ao colega o que o
    // paciente ainda não viu; um encerrado mostraria como válido o que foi
    // suspenso.
    partilhavelSe: { sentAt: { not: null }, revokedAt: null },
  },
  {
    value: "SESSION_NOTE",
    label: "Session note",
    labelPt: "Evolução",
    model: "sOAPNote",
    campoDoPaciente: "patientId",
    // A mais sensível da lista, e a única com passo a mais.
    passoExtra: true,
  },
  {
    value: "MONITORING_REPORT",
    label: "Monitoring report",
    labelPt: "Relatório de monitoramento",
    model: "clinicalEvidenceReport",
    campoDoPaciente: "patientId",
  },
];

const PORVALOR = new Map(ITENS_PARTILHAVEIS.map((i) => [i.value, i]));

export function itemValido(v: unknown): v is ItemPartilhavel {
  return typeof v === "string" && PORVALOR.has(v as ItemPartilhavel);
}

export function definicaoDoItem(v: ItemPartilhavel): Definicao {
  return PORVALOR.get(v)!;
}

export function exigePassoExtra(v: ItemPartilhavel): boolean {
  return !!PORVALOR.get(v)?.passoExtra;
}

export class ShareError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public messagePt?: string
  ) {
    super(message);
  }
}

/**
 * A linha existe, é **deste** paciente e é **do inquilino de quem partilha**?
 *
 * Os três juntos, e não um deles: o inquilino é o que impede alguém de
 * partilhar o exame que outro profissional anexou ao mesmo paciente. Você
 * partilha o que é seu.
 *
 * `medicalScreening` e `sOAPNote` têm `clinicId` opcional — escritos antes de
 * o campo existir. Nesses, a checagem cai para o inquilino do paciente, que é
 * o que `canAccessRecord` já faz no resto do sistema.
 */
async function itemDoInquilino(
  item: ItemPartilhavel,
  itemId: string,
  patientId: string,
  clinicId: string
): Promise<boolean> {
  if (typeof itemId !== "string" || !itemId) return false;
  const def = definicaoDoItem(item);
  const row = await (prisma as any)[def.model].findFirst({
    // `partilhavelSe` entra aqui, e não só no seletor: é esta consulta que a
    // rota faz, e era por ela que o id de um rascunho passava.
    where: { id: itemId, [def.campoDoPaciente]: patientId, ...(def.partilhavelSe ?? {}) },
    select: { id: true, clinicId: true },
  });
  if (!row) return false;
  if (row.clinicId) return row.clinicId === clinicId;

  const paciente = await prisma.user.findUnique({
    where: { id: patientId },
    select: { clinicId: true },
  });
  return paciente?.clinicId === clinicId;
}

/**
 * Partilhar **um** item com **uma** pessoa.
 *
 * A assinatura é singular de propósito: não há `toUserIds`, não há `items`.
 * Partilhar um exame com três profissionais são três chamadas, três linhas e
 * três datas — é mais trabalho, e é o trabalho que a palavra "permissão"
 * significa.
 */
export async function partilhar(p: {
  patientId: string;
  item: ItemPartilhavel;
  itemId: string;
  fromUserId: string;
  fromClinicId: string;
  toUserId: string;
  note?: string | null;
  /** Só a nota de sessão pede, e só quando é de psicologia. */
  cienteDoPassoExtra?: boolean;
  /** Só para a auditoria. */
  fromRole?: string | null;
}) {
  if (!itemValido(p.item)) {
    throw new ShareError(400, "bad_item", "That is not something you can share.");
  }

  if (!(await itemDoInquilino(p.item, p.itemId, p.patientId, p.fromClinicId))) {
    // 404, como sempre: dizer "existe, mas não é seu" conta que existe.
    throw new ShareError(404, "not_found", "That item is not available.");
  }

  /**
   * Para quem se pode partilhar: **quem já cuida desta pessoa**.
   *
   * Um colega do mesmo inquilino já vê o registro pelo `clinicId`; a partilha
   * existe para atravessar a parede, e atravessar só faz sentido para quem tem
   * vínculo vivo com este paciente. Sem isto, a partilha seria uma porta para
   * dar acesso a qualquer conta da plataforma.
   */
  const destino = await prisma.user.findUnique({
    where: { id: p.toUserId },
    select: { id: true, role: true, clinicId: true, isActive: true },
  });
  if (
    !destino ||
    !destino.isActive ||
    destino.role === "PATIENT" ||
    !destino.clinicId ||
    destino.clinicId === p.fromClinicId
  ) {
    throw new ShareError(
      404,
      "no_colleague",
      "That colleague is not available.",
      "Esse colega não está disponível."
    );
  }

  const paciente = await prisma.user.findUnique({
    where: { id: p.patientId },
    select: { clinicId: true },
  });
  const donoDoPaciente = paciente?.clinicId ?? null;
  const destinoEhDono = donoDoPaciente === destino.clinicId;
  if (!destinoEhDono && !(await vinculoVivo(p.patientId, destino.clinicId))) {
    throw new ShareError(
      409,
      "no_care_link",
      "That colleague is not treating this patient.",
      "Esse colega não está cuidando deste paciente."
    );
  }

  if (exigePassoExtra(p.item) && !p.cienteDoPassoExtra) {
    /**
     * A nota de sessão é a mais sensível da lista, e a de psicologia não entra
     * na partilha comum. O passo a mais não é burocracia: é a diferença entre
     * partilhar sem perceber e partilhar sabendo.
     */
    throw new ShareError(
      409,
      "extra_step_required",
      "A session note needs an extra confirmation before it is shared.",
      "A evolução exige uma confirmação a mais antes de ser partilhada."
    );
  }

  /**
   * Partilhar o que já foi partilhado é a **mesma** linha, reaberta.
   *
   * Sem isto, revogar uma deixaria a outra viva e o acesso de pé — e o paciente
   * veria duas partilhas idênticas onde houve uma decisão.
   */
  const share = await (prisma as any).careShare.upsert({
    where: {
      patientId_item_itemId_toUserId: {
        patientId: p.patientId,
        item: p.item,
        itemId: p.itemId,
        toUserId: p.toUserId,
      },
    },
    create: {
      patientId: p.patientId,
      item: p.item,
      itemId: p.itemId,
      fromClinicId: p.fromClinicId,
      fromUserId: p.fromUserId,
      toUserId: p.toUserId,
      toClinicId: destino.clinicId,
      note: p.note?.trim() || null,
    },
    update: {
      sharedAt: new Date(),
      fromUserId: p.fromUserId,
      note: p.note?.trim() || null,
      revokedAt: null,
      revokedReason: null,
      revokedById: null,
    },
  });

  registrar({
    action: "CARE_SHARE_CREATED",
    entityId: share.id,
    userId: p.fromUserId,
    userRole: p.fromRole,
    description: "One item shared with one named colleague",
    metadata: {
      item: p.item,
      itemId: p.itemId,
      toUserId: p.toUserId,
      patientId: p.patientId,
      fromClinicId: p.fromClinicId,
    },
  });

  return share;
}

/**
 * Revogar: corta dali para frente, e **não apaga**.
 *
 * Quem leu leu. Apagar a linha apagaria a prova de que houve acesso, que é
 * justamente o que o paciente tem direito de consultar depois.
 */
export async function revogar(p: {
  shareId: string;
  porUserId: string;
  /** Quem revoga é quem partilhou (pelo inquilino) ou o próprio paciente. */
  fromClinicId?: string | null;
  patientId?: string | null;
  motivo?: string | null;
  porRole?: string | null;
}) {
  const where: any = { id: p.shareId, revokedAt: null };
  if (p.fromClinicId) where.fromClinicId = p.fromClinicId;
  if (p.patientId) where.patientId = p.patientId;

  const r = await (prisma as any).careShare.updateMany({
    where,
    data: {
      revokedAt: new Date(),
      revokedById: p.porUserId,
      revokedReason: p.motivo?.trim() || null,
    },
  });
  if (r.count !== 1) throw new ShareError(404, "not_found", "That share is not available.");

  registrar({
    action: "CARE_SHARE_REVOKED",
    entityId: p.shareId,
    userId: p.porUserId,
    userRole: p.porRole,
    description: "A share was revoked — access stops here, the record stays",
    metadata: { fromClinicId: p.fromClinicId ?? null, patientId: p.patientId ?? null },
  });
}

/** Os ids que **este** profissional pode ver deste paciente, por tipo de item. */
export async function idsPartilhadosCom(
  toUserId: string,
  patientId: string
): Promise<Record<ItemPartilhavel, string[]>> {
  const linhas = await (prisma as any).careShare.findMany({
    where: { toUserId, patientId, revokedAt: null },
    select: { item: true, itemId: true },
  });
  const fora = Object.fromEntries(
    ITENS_PARTILHAVEIS.map((i) => [i.value, [] as string[]])
  ) as Record<ItemPartilhavel, string[]>;
  for (const l of linhas) {
    if (itemValido(l.item)) fora[l.item as ItemPartilhavel].push(l.itemId);
  }
  return fora;
}

/**
 * Este profissional pode ler **esta** linha?
 *
 * A pergunta é por linha, e não por área: é a diferença entre "o médico vê
 * exames" e "o médico vê este exame, que alguém lhe passou".
 *
 * Toda resposta verdadeira entra em auditoria — atravessar a parede é a
 * exceção, e exceção sem registro é exceção que ninguém audita. **Sem
 * `await`**: o registro não pode atrasar o atendimento.
 */
export async function podeVerItem(
  toUserId: string,
  item: ItemPartilhavel,
  itemId: string,
  role?: string | null
): Promise<boolean> {
  const linha = await (prisma as any).careShare.findFirst({
    where: { toUserId, item, itemId, revokedAt: null },
    select: { id: true, patientId: true, toClinicId: true },
  });
  if (!linha) return false;

  registrar({
    action: "CARE_SHARE_READ",
    entityId: linha.id,
    userId: toUserId,
    userRole: role,
    description: "A shared item was read",
    metadata: { item, itemId, patientId: linha.patientId, toClinicId: linha.toClinicId },
  });

  return true;
}

/** O que chegou para este profissional — a caixa de entrada. */
export async function caixaDeEntrada(toUserId: string, patientId?: string) {
  return (prisma as any).careShare.findMany({
    where: { toUserId, revokedAt: null, ...(patientId ? { patientId } : {}) },
    orderBy: { sharedAt: "desc" },
    select: {
      id: true,
      item: true,
      itemId: true,
      note: true,
      sharedAt: true,
      patientId: true,
      patient: { select: { firstName: true, lastName: true } },
      fromUser: { select: { firstName: true, lastName: true } },
      fromClinic: { select: { name: true } },
    },
  });
}

/**
 * O que o meu inquilino partilhou deste paciente, e com quem.
 *
 * **Sem a `note`**, de propósito. O vínculo de cuidado é do inquilino, então
 * qualquer pessoa da casa lê este registro — inclusive quem entrou ontem. O
 * item, o destinatário e a data são o registro de um ato administrativo; a
 * nota é uma frase clínica escrita **para uma pessoa**, e era a única prosa que
 * alguém lia no primeiro dia sem ninguém ter partilhado nada com ele (achado 2
 * do QA de 29/09/2026).
 */
export async function oQuePartilhei(fromClinicId: string, patientId: string) {
  return (prisma as any).careShare.findMany({
    where: { fromClinicId, patientId },
    orderBy: { sharedAt: "desc" },
    select: {
      id: true,
      item: true,
      itemId: true,
      sharedAt: true,
      revokedAt: true,
      revokedReason: true,
      toUser: { select: { firstName: true, lastName: true } },
      fromUser: { select: { firstName: true, lastName: true } },
    },
  });
}

/**
 * Tudo o que foi partilhado sobre este paciente — para **ele**.
 *
 * Inclui o revogado: saber que algo foi partilhado e depois cortado é parte do
 * que ele tem direito de ver. Sem inquilino nenhum no filtro: é o único lugar
 * onde a visão é do paciente inteiro, e é por isso que ele pode revogar.
 */
export async function partilhasDoPaciente(patientId: string) {
  return (prisma as any).careShare.findMany({
    where: { patientId },
    orderBy: { sharedAt: "desc" },
    select: {
      id: true,
      item: true,
      note: true,
      sharedAt: true,
      revokedAt: true,
      revokedReason: true,
      fromClinic: { select: { name: true } },
      fromUser: { select: { firstName: true, lastName: true } },
      toUser: { select: { firstName: true, lastName: true } },
    },
  });
}

/**
 * O perfil que um profissional intermediado vê: **identidade e o que lhe foi
 * partilhado**, e nada além.
 *
 * `GET /api/admin/patients/[id]` se anuncia *"Full patient profile with all
 * related data"* e devolvia anamnese, notas de sessão, exames, diagnósticos,
 * protocolos e pressão arterial a qualquer profissional com vínculo. Esta
 * função é a resposta dessa mesma rota quando quem pergunta chegou pelo
 * vínculo.
 *
 * As duas fontes que o Bruno descreveu, e só elas: **o que o paciente dá
 * diretamente** (a identidade com que marcou a consulta) e **o que a clínica
 * partilhou**, item a item. Sem endereço, sem contato de emergência, sem
 * protocolo de tratamento, sem pressão arterial — nada disso foi partilhado com
 * ninguém.
 */
export async function perfilPorPartilha(
  patientId: string,
  quem: { userId: string; role?: string | null }
) {
  const ids = await idsPartilhadosCom(quem.userId, patientId);
  const nenhum = { id: "__none__" };

  const [patient, screening, soapNotes, documents, diagnoses, reports, professionalDocuments] =
    await Promise.all([
      prisma.user.findUnique({
        where: { id: patientId },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          // A data de nascimento é do cadastro que o próprio paciente fez, e
          // uma receita sem ela não identifica ninguém.
          dateOfBirth: true,
          preferredLocale: true,
          isActive: true,
          createdAt: true,
        },
      }),
      ids.ANAMNESIS.length
        ? prisma.medicalScreening.findFirst({
            where: { id: { in: ids.ANAMNESIS }, userId: patientId },
          })
        : null,
      (prisma as any).sOAPNote.findMany({
        where: { id: { in: ids.SESSION_NOTE.length ? ids.SESSION_NOTE : [nenhum.id] }, patientId },
        orderBy: { createdAt: "desc" },
        include: { therapist: { select: { firstName: true, lastName: true } } },
      }),
      (prisma as any).patientDocument.findMany({
        where: { id: { in: ids.EXAM.length ? ids.EXAM : [nenhum.id] }, patientId },
        orderBy: { createdAt: "desc" },
      }),
      (prisma as any).aIDiagnosis.findMany({
        where: { id: { in: ids.DIAGNOSIS.length ? ids.DIAGNOSIS : [nenhum.id] }, patientId },
        orderBy: { createdAt: "desc" },
      }),
      (prisma as any).clinicalEvidenceReport.findMany({
        where: {
          id: { in: ids.MONITORING_REPORT.length ? ids.MONITORING_REPORT : [nenhum.id] },
          patientId,
        },
        orderBy: { createdAt: "desc" },
      }),
      (prisma as any).professionalDocument.findMany({
        where: {
          id: {
            in: ids.PROFESSIONAL_DOCUMENT.length ? ids.PROFESSIONAL_DOCUMENT : [nenhum.id],
          },
          patientId,
        },
        orderBy: { createdAt: "desc" },
      }),
    ]);

  const quantos =
    (screening ? 1 : 0) +
    soapNotes.length +
    documents.length +
    diagnoses.length +
    reports.length +
    professionalDocuments.length;

  registrar({
    action: "CARE_SHARE_READ",
    entityId: patientId,
    userId: quem.userId,
    userRole: quem.role,
    description: "A linked professional opened a patient limited to shared items",
    metadata: { patientId, itemsVisiveis: quantos },
  });

  return {
    /** A tela lê `porPartilha` para dizer, na cara, que a visão é parcial. */
    porPartilha: true,
    /**
     * Sem `hasPassword`: ele ia sempre `false`, e o paciente tem senha. Um
     * profissional intermediado não gerencia a conta de ninguém, então o campo
     * não é "falso" — ele não é assunto dele (achado 4 do QA de 29/09/2026).
     */
    patient,
    screening,
    soapNotes,
    documents,
    diagnoses,
    monitoringReports: reports,
    professionalDocuments,
    // Existem para a tela não quebrar, e vazios porque nada disto se partilha.
    footScans: [],
    bodyAssessments: [],
    protocols: [],
    bpReadings: [],
    unreadMessages: 0,
  };
}

export interface ItemOferecido {
  item: ItemPartilhavel;
  itemId: string;
  /** O que a tela mostra na lista e na prévia — o mesmo texto, nos dois. */
  titulo: string;
  quando: Date;
}

const corta = (s: string | null | undefined, n = 90) => {
  const t = (s ?? "").trim().replace(/\s+/g, " ");
  return t.length > n ? `${t.slice(0, n)}…` : t;
};

/**
 * O que **este inquilino** tem deste paciente, e portanto pode partilhar.
 *
 * Você partilha o que é seu. O exame que outro profissional anexou ao mesmo
 * paciente não aparece aqui — se ele quiser que eu veja, ele partilha.
 *
 * `medicalScreening` e `sOAPNote` têm `clinicId` opcional (linhas escritas
 * antes do campo existir); nesses, a linha conta como do inquilino do paciente,
 * que é o que o resto do sistema já faz.
 */
export async function itensQuePossoPartilhar(
  patientId: string,
  clinicId: string
): Promise<ItemOferecido[]> {
  const paciente = await prisma.user.findUnique({
    where: { id: patientId },
    select: { clinicId: true },
  });
  const souDono = paciente?.clinicId === clinicId;
  const meuOuSemDono = souDono
    ? { OR: [{ clinicId }, { clinicId: null }] }
    : { clinicId };

  const [exames, avaliacoes, anamnese, documentos, notas, relatorios] = await Promise.all([
    (prisma as any).patientDocument.findMany({
      where: { patientId, clinicId },
      orderBy: { createdAt: "desc" },
      select: { id: true, title: true, fileName: true, createdAt: true },
      take: 50,
    }),
    (prisma as any).aIDiagnosis.findMany({
      where: { patientId, clinicId },
      orderBy: { createdAt: "desc" },
      select: { id: true, summary: true, createdAt: true },
      take: 50,
    }),
    (prisma as any).medicalScreening.findFirst({
      where: { userId: patientId, ...meuOuSemDono },
      select: { id: true, createdAt: true },
    }),
    /**
     * Receita **enviada e viva**, e não qualquer linha.
     *
     * O seletor oferecia rascunho e documento encerrado (achado 3 do QA de
     * 29/09/2026): partilhar um rascunho mostraria ao colega algo que o próprio
     * paciente ainda não viu, e partilhar um encerrado mostraria como válido o
     * que foi suspenso.
     */
    (prisma as any).professionalDocument.findMany({
      // O mesmo critério que `itemDoInquilino` aplica, da mesma fonte: duas
      // cópias da regra é como o seletor e a porta discordaram.
      where: {
        patientId,
        clinicId,
        ...(definicaoDoItem("PROFESSIONAL_DOCUMENT").partilhavelSe ?? {}),
      },
      orderBy: { createdAt: "desc" },
      select: { id: true, title: true, kind: true, createdAt: true },
      take: 50,
    }),
    (prisma as any).sOAPNote.findMany({
      where: { patientId, ...meuOuSemDono },
      orderBy: { createdAt: "desc" },
      select: { id: true, subjective: true, createdAt: true },
      take: 50,
    }),
    (prisma as any).clinicalEvidenceReport.findMany({
      where: { patientId, clinicId },
      orderBy: { createdAt: "desc" },
      select: { id: true, createdAt: true },
      take: 50,
    }),
  ]);

  const fora: ItemOferecido[] = [];
  for (const e of exames) {
    fora.push({
      item: "EXAM",
      itemId: e.id,
      titulo: corta(e.title || e.fileName) || "Exam",
      quando: e.createdAt,
    });
  }
  for (const a of avaliacoes) {
    fora.push({
      item: "DIAGNOSIS",
      itemId: a.id,
      titulo: corta(a.summary) || "Assessment",
      quando: a.createdAt,
    });
  }
  if (anamnese) {
    fora.push({
      item: "ANAMNESIS",
      itemId: anamnese.id,
      titulo: "History and intake",
      quando: anamnese.createdAt,
    });
  }
  for (const d of documentos) {
    fora.push({
      item: "PROFESSIONAL_DOCUMENT",
      itemId: d.id,
      titulo: corta(d.title) || "Document",
      quando: d.createdAt,
    });
  }
  for (const n of notas) {
    fora.push({
      item: "SESSION_NOTE",
      itemId: n.id,
      titulo: corta(n.subjective) || "Session note",
      quando: n.createdAt,
    });
  }
  for (const r of relatorios) {
    fora.push({
      item: "MONITORING_REPORT",
      itemId: r.id,
      titulo: "Monitoring report",
      quando: r.createdAt,
    });
  }
  return fora.sort((a, b) => +new Date(b.quando) - +new Date(a.quando));
}

/**
 * Com quem se pode partilhar: **quem já cuida desta pessoa**, pessoa por pessoa.
 *
 * A lista vem dos vínculos vivos mais o inquilino de quem detém o paciente — e
 * nunca de "todos os médicos da plataforma". Ela existe para que a tela ofereça
 * **nomes**, porque partilhar é sempre com alguém nomeado: se a tela oferecesse
 * profissões ou clínicas, o clique seria liberação automática com outro nome.
 */
export async function colegasQueCuidam(patientId: string, meuClinicId: string) {
  const paciente = await prisma.user.findUnique({
    where: { id: patientId },
    select: { clinicId: true },
  });

  const inquilinos = new Set<string>(await inquilinosQueCuidam(patientId));
  if (paciente?.clinicId) inquilinos.add(paciente.clinicId);
  inquilinos.delete(meuClinicId);
  if (inquilinos.size === 0) return [];

  return prisma.user.findMany({
    where: {
      clinicId: { in: [...inquilinos] },
      isActive: true,
      role: { in: ["ADMIN", "THERAPIST"] },
    },
    orderBy: [{ firstName: "asc" }],
    select: {
      id: true,
      firstName: true,
      lastName: true,
      clinic: { select: { name: true, type: true } },
    },
  });
}
