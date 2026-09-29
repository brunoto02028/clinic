/**
 * @jest-environment node
 */

/**
 * O vínculo de cuidado (102 T-3).
 *
 * A 102 abre, de propósito, uma porta entre inquilinos: um profissional de
 * outra área alcança este paciente **porque existe um vínculo que o paciente
 * aceitou**. A diferença entre isto e os dois vazamentos de 28/09/2026 é essa
 * linha — e o fato de a pergunta se fazer num lugar só.
 */

/**
 * O mock nasce **dentro** da fábrica.
 *
 * `jest.mock` é içado para o topo do arquivo, acima de qualquer `const` — então
 * uma fábrica que fecha sobre uma variável de fora estoura com "cannot access
 * before initialization". O jeito que funciona é criar ali e buscar depois.
 */
jest.mock("@/lib/db", () => ({
  prisma: {
    user: { findUnique: jest.fn() },
    clinic: { findUnique: jest.fn() },
    careLink: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
  },
}));

const db: any = (jest.requireMock("@/lib/db") as any).prisma;

import { lerCodigo } from "../helpers/codigo";
import { AccessError, assertPatientAccess, type Actor } from "@/lib/tenant-access";
import { criarVinculoPorPagamento, encerrarVinculo, vinculoVivo } from "@/lib/care-link";

const medico: Actor = {
  userId: "u-medico",
  role: "ADMIN",
  clinicId: "c-medico",
} as Actor;

const paciente = { id: "p-1", role: "PATIENT", clinicId: "c-bpr" };

beforeEach(() => {
  for (const m of [db.user, db.clinic, db.careLink]) {
    for (const f of Object.values(m)) (f as jest.Mock).mockReset();
  }
});

describe("quem alcança o paciente", () => {
  it("**quem é do mesmo inquilino alcança, sem vínculo nenhum**", async () => {
    db.user.findUnique.mockResolvedValue(paciente);
    const r = await assertPatientAccess({ ...medico, clinicId: "c-bpr" }, "p-1");
    expect(r).toEqual({ id: "p-1", clinicId: "c-bpr" });
    // A reabilitação não consulta vínculo: a parede já respondeu.
    expect(db.careLink.findFirst).not.toHaveBeenCalled();
  });

  it("**de fora, com vínculo vivo, alcança — e diz que foi por vínculo**", async () => {
    db.user.findUnique.mockResolvedValue(paciente);
    db.careLink.findFirst.mockResolvedValue({ id: "v-1" });
    const r = await assertPatientAccess(medico, "p-1");
    expect(r).toEqual({ id: "p-1", clinicId: "c-bpr", porVinculo: true });
  });

  it("**de fora, sem vínculo, é 404 — nunca 403**", async () => {
    /**
     * A mesma frase para "não existe" e "não é seu": distinguir as duas
     * contaria a um estranho que aquele paciente existe.
     */
    db.user.findUnique.mockResolvedValue(paciente);
    db.careLink.findFirst.mockResolvedValue(null);
    await expect(assertPatientAccess(medico, "p-1")).rejects.toMatchObject({
      status: 404,
      message: "Not found",
    });
  });

  it("**vínculo encerrado não alcança**", async () => {
    db.user.findUnique.mockResolvedValue(paciente);
    // `vinculoVivo` procura com `endedAt: null`, então o encerrado não volta.
    db.careLink.findFirst.mockResolvedValue(null);
    await expect(assertPatientAccess(medico, "p-1")).rejects.toBeInstanceOf(AccessError);
    expect(db.careLink.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ endedAt: null }) })
    );
  });

  it("o paciente continua alcançando só a si mesmo", async () => {
    const eu: Actor = { userId: "p-1", role: "PATIENT", clinicId: "c-bpr" } as Actor;
    await expect(assertPatientAccess(eu, "p-1")).resolves.toMatchObject({ id: "p-1" });
    await expect(assertPatientAccess(eu, "p-2")).rejects.toMatchObject({ status: 404 });
    // E não passa nem perto do vínculo: paciente não tem vínculo com ninguém.
    expect(db.careLink.findFirst).not.toHaveBeenCalled();
  });

  it("**quem não é paciente nunca é alcançado, nem com vínculo**", async () => {
    db.user.findUnique.mockResolvedValue({ id: "x", role: "THERAPIST", clinicId: "c-bpr" });
    db.careLink.findFirst.mockResolvedValue({ id: "v-1" });
    await expect(assertPatientAccess(medico, "x")).rejects.toMatchObject({ status: 404 });
  });

  it("e ator sem inquilino não alcança ninguém", async () => {
    db.user.findUnique.mockResolvedValue(paciente);
    await expect(
      assertPatientAccess({ ...medico, clinicId: null } as Actor, "p-1")
    ).rejects.toMatchObject({ status: 404 });
  });
});

describe("o vínculo nasce do pagamento, e de nada mais", () => {
  it("**só profissional externo ganha vínculo**", async () => {
    /**
     * A reabilitação alcança o paciente dela por `clinicId`. Criar um vínculo
     * mesmo assim poria uma linha dizendo "pode" onde a parede já dizia — e um
     * dia alguém a leria como a única fonte.
     */
    db.clinic.findUnique.mockResolvedValue({ type: "CLINIC" });
    const r = await criarVinculoPorPagamento({ patientId: "p-1", professionalClinicId: "c-bpr" });
    expect(r.criado).toBe(false);
    expect(db.careLink.create).not.toHaveBeenCalled();
  });

  it("médico ganha", async () => {
    db.clinic.findUnique.mockResolvedValue({ type: "DOCTOR" });
    db.careLink.findUnique.mockResolvedValue(null);
    db.careLink.create.mockResolvedValue({ id: "v-1" });
    const r = await criarVinculoPorPagamento({
      patientId: "p-1",
      professionalClinicId: "c-medico",
      appointmentId: "a-1",
    });
    expect(r).toEqual({ id: "v-1", criado: true });
    expect(db.careLink.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ createdByAppointmentId: "a-1" }),
      })
    );
  });

  it("**pagar de novo não empilha um segundo vínculo**", async () => {
    // Um encerrado ao lado de um vivo seriam duas respostas para a mesma
    // pergunta.
    db.clinic.findUnique.mockResolvedValue({ type: "DOCTOR" });
    db.careLink.findUnique.mockResolvedValue({ id: "v-1", endedAt: null });
    const r = await criarVinculoPorPagamento({ patientId: "p-1", professionalClinicId: "c-medico" });
    expect(r).toEqual({ id: "v-1", criado: false });
    expect(db.careLink.create).not.toHaveBeenCalled();
  });

  it("**e voltar ao mesmo médico reativa, com consentimento novo**", async () => {
    db.clinic.findUnique.mockResolvedValue({ type: "DOCTOR" });
    db.careLink.findUnique.mockResolvedValue({ id: "v-1", endedAt: new Date("2026-01-01") });
    db.careLink.update.mockResolvedValue({});
    const r = await criarVinculoPorPagamento({ patientId: "p-1", professionalClinicId: "c-medico" });
    expect(r.criado).toBe(true);
    const dados = db.careLink.update.mock.calls[0][0].data;
    expect(dados.endedAt).toBeNull();
    // `acceptedAt` volta para agora: é um consentimento novo, não o de antes.
    expect(dados.acceptedAt).toBeInstanceOf(Date);
  });
});

describe("encerrar corta o futuro e preserva o passado", () => {
  it("**só o dono encerra o próprio vínculo**", async () => {
    db.careLink.updateMany.mockResolvedValue({ count: 1 });
    const ok = await encerrarVinculo({ patientId: "p-1", careLinkId: "v-1", endedById: "p-1" });
    expect(ok).toBe(true);
    // O `patientId` no `where` é o que impede encerrar o de outra pessoa.
    expect(db.careLink.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ patientId: "p-1", endedAt: null }),
      })
    );
  });

  it("encerrar o de outro não encontra nada", async () => {
    db.careLink.updateMany.mockResolvedValue({ count: 0 });
    expect(await encerrarVinculo({ patientId: "p-1", careLinkId: "v-de-outro", endedById: "p-1" }))
      .toBe(false);
  });

  it("**e não apaga: marca a data**", async () => {
    /**
     * A consulta que houve e a receita que foi escrita são registro clínico.
     * Apagar seria sumir com a prova de uma prescrição.
     */
    db.careLink.updateMany.mockResolvedValue({ count: 1 });
    await encerrarVinculo({ patientId: "p-1", careLinkId: "v-1", endedById: "p-1" });
    const chamada = db.careLink.updateMany.mock.calls[0][0];
    expect(chamada.data.endedAt).toBeInstanceOf(Date);
    expect(chamada.data).not.toHaveProperty("deleted");
  });
});

describe("a pergunta do vínculo é uma só", () => {
  it("`vinculoVivo` exige `endedAt: null`", async () => {
    db.careLink.findFirst.mockResolvedValue(null);
    await vinculoVivo("p-1", "c-medico");
    expect(db.careLink.findFirst).toHaveBeenCalledWith({
      where: { patientId: "p-1", professionalClinicId: "c-medico", endedAt: null },
      select: { id: true },
    });
  });
});

describe("atravessar a parede fica registrado", () => {
  const acesso = lerCodigo("lib", "tenant-access.ts");

  it("**toda leitura por vínculo vai para a auditoria**", () => {
    // Exceção sem registro é exceção que ninguém audita.
    expect(acesso).toMatch(/registrarAcessoPorVinculo\(actor, patient\.id, patient\.clinicId\)/);
    expect(acesso).toMatch(/action: "CARE_LINK_ACCESS"/);
  });

  it("**e o registro não atrasa nem derruba o atendimento**", () => {
    // Sem `await`, e com `catch` que engole: se o log falhar, quem perde é a
    // auditoria, não a consulta.
    expect(acesso).toMatch(/void registrarAcessoPorVinculo/);
    const bloco = acesso.slice(acesso.indexOf("async function registrarAcessoPorVinculo"));
    expect(bloco).toMatch(/catch \{/);
  });

  it("a leitura dentro do próprio inquilino **não** vira registro", () => {
    // Seria uma linha de auditoria por requisição normal — ruído que esconde
    // justamente o que esta auditoria existe para mostrar.
    const trecho = acesso.slice(
      acesso.indexOf("if (patient.clinicId === actor.clinicId)"),
      acesso.indexOf("if (await vinculoVivo")
    );
    expect(trecho).not.toMatch(/registrarAcessoPorVinculo/);
  });
});
