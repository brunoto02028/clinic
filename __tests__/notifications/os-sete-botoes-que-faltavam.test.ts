/**
 * @jest-environment node
 *
 * Os sete botões que o portão cobria e nenhum teste cobria.
 *
 * O QA da atividade 104 achou o buraco por mutação: as nove rotas passavam
 * pelo portão, mas **só duas** tinham teste provando "sem `notify`, a ação
 * acontece e nada sai". Nas outras sete o `if (permissao.ok)` podia ser
 * apagado sem a suíte reclamar — ou seja, o conserto estava certo e
 * invisível, que é o estado em que ele volta a quebrar sozinho.
 *
 * A qa-spec pedia nove pares, "não uma amostra". Isto fecha a conta.
 */

jest.mock("@/lib/db", () => {
  const p: any = {
    user: { findUnique: jest.fn(), findFirst: jest.fn(), findMany: jest.fn() },
    patientTask: { create: jest.fn(), update: jest.fn() },
    patientDocument: { create: jest.fn() },
    exerciseSubmission: { findFirst: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
    treatmentPackage: { create: jest.fn() },
    patientQuestion: { create: jest.fn(), findMany: jest.fn().mockResolvedValue([]), deleteMany: jest.fn() },
    membershipPlan: { create: jest.fn() },
    emailContact: { count: jest.fn(), findMany: jest.fn() },
    article: { findUnique: jest.fn() },
    treatmentProtocol: { findFirst: jest.fn(), findUnique: jest.fn() },
    patientOutboundEmail: { count: jest.fn() },
    systemLog: { count: jest.fn(), create: jest.fn() },
  };
  p.$transaction = (ops: any) => (typeof ops === "function" ? ops(p) : Promise.all(ops));
  return { prisma: p };
});
jest.mock("next-auth", () => ({ getServerSession: jest.fn() }));
jest.mock("@/lib/auth-options", () => ({ authOptions: {} }));
jest.mock("@/lib/notify-patient", () => ({
  ...jest.requireActual("@/lib/notify-patient"),
  notifyPatient: jest.fn(),
}));
jest.mock("@/lib/push-notify", () => ({
  pushTarefa: jest.fn(),
  pushDocumento: jest.fn(),
  pushRespostaAoVideo: jest.fn(),
}));
// `logAudit(...).catch(...)` em algumas rotas: um `jest.fn()` cru devolve
// `undefined` e a rota estoura no `.catch`.
jest.mock("@/lib/system-logger", () => ({
  logAudit: jest.fn().mockResolvedValue(undefined),
  logSystem: jest.fn().mockResolvedValue(undefined),
}));
jest.mock("@/lib/tenant-access", () => ({
  ...jest.requireActual("@/lib/tenant-access"),
  getSessionStaffActor: jest.fn(),
}));
jest.mock("@/lib/staff-patient-access", () => ({
  staffPatientAccess: jest.fn(),
  recordOfPatient: jest.fn().mockResolvedValue(true),
}));
// `camposDoFormulario` normaliza o multipart; aqui o corpo é montado à mão,
// então ele é substituído por um mapa simples.
jest.mock("@/lib/form-fields", () => ({
  camposDoFormulario: jest.fn(),
}));
jest.mock("@/lib/patient-documents", () => ({
  storePatientDocument: jest.fn().mockResolvedValue({ id: "doc-1", fileName: "x.pdf" }),
  // Devolve a **mensagem de erro**, ou nada quando está tudo bem: a rota faz
  // `if (invalid) return 400`. Um `{ ok: true }` é truthy e virava 400 — e o
  // teste de "não avisou" passava por vacuidade, sem a rota chegar ao envio.
  validatePatientFile: jest.fn().mockReturnValue(null),
}));
jest.mock("@/lib/article-newsletter", () => ({ sendArticleNewsletter: jest.fn().mockResolvedValue({ queued: 3 }) }));
jest.mock("@/lib/email-templates", () => ({ sendTemplatedEmail: jest.fn(), wrapInLayout: jest.fn() }));
jest.mock("@/lib/clinic-context", () => ({
  // `userRole` é o que o guard do POST olha; sem ele a rota devolve 401 e o
  // teste de "não enviou" passaria por vacuidade — a requisição nem chega ao
  // envio. Foi assim que a primeira versão deste arquivo mentiu.
  getClinicContext: jest.fn().mockResolvedValue({ clinicId: "clinica-bpr", userRole: "ADMIN" }),
  getClinicContextFromSession: jest.fn().mockResolvedValue({ clinicId: "clinica-bpr", userRole: "ADMIN" }),
  getDefaultClinic: jest.fn().mockResolvedValue({ id: "clinica-bpr" }),
}));
jest.mock("@/lib/stripe", () => ({ stripe: null }));
jest.mock("@/lib/card-fee", () => ({
  getCardFeePercent: jest.fn().mockResolvedValue(0),
  applyCardFee: (v: number) => v,
}));

import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth";
import { notifyPatient as notifyPatientRaw } from "@/lib/notify-patient";
const notifyPatient = notifyPatientRaw as jest.Mock;
import { pushTarefa, pushDocumento, pushRespostaAoVideo } from "@/lib/push-notify";
import { getSessionStaffActor } from "@/lib/tenant-access";
import { staffPatientAccess } from "@/lib/staff-patient-access";
import { sendArticleNewsletter } from "@/lib/article-newsletter";
import { camposDoFormulario } from "@/lib/form-fields";

const db = prisma as any;
const CLINICA = "clinica-bpr";
const PACIENTE = "p1";

const pedido = (url: string, corpo: any) =>
  new NextRequest(`http://localhost${url}`, { method: "POST", body: JSON.stringify(corpo) }) as any;

/** Todo mundo que manda mensagem ao paciente, num lugar só. */
const CANAIS = () => [notifyPatient, pushTarefa, pushDocumento, pushRespostaAoVideo] as jest.Mock[];
const nadaSaiu = () => CANAIS().every((c) => c.mock.calls.length === 0);

beforeEach(() => {
  jest.clearAllMocks();
  const sessao = { user: { id: "staff-1", role: "ADMIN", clinicId: CLINICA, email: "admin@bpr.clinic" } };
  (getServerSession as jest.Mock).mockResolvedValue(sessao);
  (getSessionStaffActor as jest.Mock).mockResolvedValue({ userId: "staff-1", clinicId: CLINICA, role: "ADMIN" });
  (staffPatientAccess as jest.Mock).mockResolvedValue({ response: null });

  const paciente = { id: PACIENTE, firstName: "Ana", lastName: "P", email: "ana@x.com", clinicId: CLINICA };
  db.user.findUnique.mockResolvedValue(paciente);
  db.user.findFirst.mockResolvedValue(paciente);
  db.user.findMany.mockResolvedValue([paciente]);
  db.patientOutboundEmail.count.mockResolvedValue(0);
  db.systemLog.count.mockResolvedValue(0);
  db.systemLog.create.mockResolvedValue({});
  // Várias rotas fazem `notifyPatient(...).catch(...)`. Um `jest.fn()` cru
  // devolve `undefined` e a rota estoura no `.catch` — 500 em vez do envio.
  notifyPatient.mockResolvedValue({ channel: "EMAIL", success: true });
  for (const push of [pushTarefa, pushDocumento, pushRespostaAoVideo] as jest.Mock[]) {
    push.mockResolvedValue(undefined);
  }
});

// ─────────────────────────────────────────────────────────────────────────
describe("criar tarefa", () => {
  const { POST } = require("@/app/api/admin/patient-tasks/route");
  const chamar = (corpo: any) =>
    POST(pedido("/api/admin/patient-tasks", { patientId: PACIENTE, title: "Assinar consentimento", ...corpo }));

  beforeEach(() => db.patientTask.create.mockResolvedValue({ id: "t1" }));

  it("sem `notify`: cria e não manda e-mail nem push", async () => {
    await chamar({});
    expect(db.patientTask.create).toHaveBeenCalled();
    expect(nadaSaiu()).toBe(true);
  });

  it("com `notify: true`: manda o par e-mail + push", async () => {
    await chamar({ notify: true });
    expect(notifyPatient).toHaveBeenCalledTimes(1);
    expect(pushTarefa).toHaveBeenCalledTimes(1);
  });
});

// ─────────────────────────────────────────────────────────────────────────
describe("montar as perguntas", () => {
  const { POST } = require("@/app/api/admin/patients/[id]/questions/route");
  const chamar = (corpo: any) =>
    POST(pedido(`/api/admin/patients/${PACIENTE}/questions`, { questions: ["Dói ao subir escada?"], ...corpo }), {
      params: { id: PACIENTE },
    });

  beforeEach(() => db.patientQuestion.create.mockResolvedValue({ id: "q1" }));

  it("sem `notify`: monta e não envia — existe rascunho agora", async () => {
    await chamar({});
    expect(nadaSaiu()).toBe(true);
  });

  it("com `notify: true`: envia", async () => {
    await chamar({ notify: true });
    expect(notifyPatient).toHaveBeenCalledTimes(1);
  });
});

// ─────────────────────────────────────────────────────────────────────────
describe("criar pacote de tratamento", () => {
  const { POST } = require("@/app/api/admin/patients/[id]/packages/route");
  const chamar = (corpo: any) =>
    POST(pedido(`/api/admin/patients/${PACIENTE}/packages`, { protocolId: "pr1", name: "10 sessões", totalSessions: 10, ...corpo }), {
      params: { id: PACIENTE },
    });

  beforeEach(() => {
    db.treatmentProtocol.findUnique.mockResolvedValue({ id: "pr1", title: "LCA" });
    db.treatmentPackage.create.mockResolvedValue({
      id: "pk1", name: "10 sessões", status: "DRAFT", priceFullPackage: 500,
      patient: { firstName: "Ana", lastName: "P", email: "ana@x.com" },
      protocol: null,
    });
  });

  /** O pacote nasce `DRAFT`: cobrar um rascunho interno era o defeito. */
  it("sem `notify`: cria o rascunho e **não cobra**", async () => {
    await chamar({});
    expect(db.treatmentPackage.create).toHaveBeenCalled();
    expect(nadaSaiu()).toBe(true);
  });

  it("com `notify: true`: cobra", async () => {
    await chamar({ notify: true });
    expect(notifyPatient).toHaveBeenCalledTimes(1);
  });
});

// ─────────────────────────────────────────────────────────────────────────
describe("criar plano de assinatura", () => {
  const { POST } = require("@/app/api/admin/memberships/route");
  const chamar = (corpo: any) =>
    POST(pedido("/api/admin/memberships", { name: "Mensal", price: 50, interval: "MONTHLY", patientScope: "specific", patientId: PACIENTE, ...corpo }));

  beforeEach(() =>
    db.membershipPlan.create.mockResolvedValue({
      id: "m1", name: "Mensal", price: 50, interval: "MONTHLY", isFree: false,
      patient: { id: PACIENTE, firstName: "Ana", lastName: "P", email: "ana@x.com" },
    })
  );

  it("sem `notify`: cadastra e não avisa", async () => {
    const res = await chamar({});
    // O status importa: sem ele, uma rota que devolvesse 401 passaria neste
    // teste sem ter chegado perto do envio.
    expect(res.status).toBe(200);
    expect(nadaSaiu()).toBe(true);
  });

  it("com `notify: true`: avisa", async () => {
    const res = await chamar({ notify: true });
    expect(res.status).toBe(200);
    expect(notifyPatient).toHaveBeenCalledTimes(1);
  });
});

// ─────────────────────────────────────────────────────────────────────────
describe("anexar documento ao prontuário", () => {
  const { POST } = require("@/app/api/admin/patients/[id]/documents/route");

  const chamar = (campos: Record<string, any>) => {
    const mapa = new Map<string, any>(Object.entries({
      file: { name: "exame.pdf", size: 10, type: "application/pdf" },
      documentType: "EXAM",
      source: "ADMIN_UPLOAD",
      ...campos,
    }));
    (camposDoFormulario as jest.Mock).mockResolvedValue({ get: (k: string) => mapa.get(k) ?? null });
    return POST(pedido(`/api/admin/patients/${PACIENTE}/documents`, {}), { params: { id: PACIENTE } });
  };

  /** Anexar ao prontuário é arquivo, não recado — nem em upload da clínica. */
  it("sem `notify`: anexa e não vibra o celular", async () => {
    const res = await chamar({});
    expect(res.status).toBe(201);
    expect(pushDocumento).not.toHaveBeenCalled();
  });

  it("com `notify: true`: avisa", async () => {
    const res = await chamar({ notify: "true" });
    expect(res.status).toBe(201);
    expect(pushDocumento).toHaveBeenCalledTimes(1);
  });
});

// ─────────────────────────────────────────────────────────────────────────
describe("marcar o vídeo como revisado", () => {
  const { POST } = require("@/app/api/admin/exercise-submissions/[id]/review/route");
  const chamar = (corpo: any) =>
    POST(pedido("/api/admin/exercise-submissions/s1/review", corpo), { params: { id: "s1" } });

  beforeEach(() => {
    db.exerciseSubmission.findFirst.mockResolvedValue({ id: "s1", patientId: PACIENTE, clinicId: CLINICA });
    db.exerciseSubmission.update.mockResolvedValue({ id: "s1" });
  });

  it("com resposta mas sem `notify`: revisa e não vibra o celular", async () => {
    await chamar({ note: "Ficou bom, siga assim" });
    expect(db.exerciseSubmission.update).toHaveBeenCalled();
    expect(pushRespostaAoVideo).not.toHaveBeenCalled();
  });

  it("com resposta e `notify: true`: avisa", async () => {
    await chamar({ note: "Ficou bom", notify: true });
    expect(pushRespostaAoVideo).toHaveBeenCalledTimes(1);
  });

  /**
   * O defeito que a 104 achou: marcar como revisado com a nota vazia
   * mandava *"seu Terapeuta respondeu"* sobre um silêncio. O paciente abria
   * o app e não achava resposta nenhuma.
   */
  it("sem resposta nenhuma, `notify: true` não basta — não há o que avisar", async () => {
    await chamar({ note: "", notify: true });
    expect(db.exerciseSubmission.update).toHaveBeenCalled();
    expect(pushRespostaAoVideo).not.toHaveBeenCalled();
  });
});

// ─────────────────────────────────────────────────────────────────────────
describe("notificar sobre um artigo", () => {
  const { POST, GET } = require("@/app/api/admin/articles/[id]/notify/route");

  beforeEach(() => {
    db.article.findUnique.mockResolvedValue({ id: "a1", published: true, slug: "x" });
    db.emailContact.count.mockResolvedValue(37);
  });

  it("o GET diz para quantas pessoas vai, antes do clique", async () => {
    const res = await GET();
    expect((await res.json()).subscribers).toBe(37);
  });

  /** A confirmação é o **número**, não um booleano: um `true` prova que
   *  alguém clicou, não que leu para quantos ia. */
  it("sem `confirmedCount`: não dispara", async () => {
    const res = await POST(pedido("/api/admin/articles/a1/notify", {}), { params: { id: "a1" } });
    expect(res.status).toBe(400);
    expect(sendArticleNewsletter).not.toHaveBeenCalled();
  });

  it("com o número errado — a lista mudou entre ver e apertar — para com 409", async () => {
    const res = await POST(pedido("/api/admin/articles/a1/notify", { confirmedCount: 30 }), { params: { id: "a1" } });
    expect(res.status).toBe(409);
    expect((await res.json()).code).toBe("COUNT_MISMATCH");
    expect(sendArticleNewsletter).not.toHaveBeenCalled();
  });

  it("com o número certo: dispara", async () => {
    const res = await POST(pedido("/api/admin/articles/a1/notify", { confirmedCount: 37 }), { params: { id: "a1" } });
    expect(res.status).toBe(200);
    expect(sendArticleNewsletter).toHaveBeenCalledTimes(1);
  });
});
