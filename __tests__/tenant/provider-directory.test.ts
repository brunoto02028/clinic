/**
 * @jest-environment node
 *
 * Quem aparece para quem (083).
 *
 * O app passou a ser a porta de vários profissionais — um médico, um
 * psicólogo. Duas regras decidem quem a pessoa vê, e as duas existem para não
 * oferecer o que não se pode cumprir: o profissional aceitou receber gente
 * nova, e ele atende na língua dela. Um médico que só fala português na tela
 * de quem lê o app em inglês é uma consulta que não aconteceria.
 */

jest.mock("@/lib/db", () => ({
  prisma: { user: { findUnique: jest.fn() }, clinic: { findMany: jest.fn() } },
}));

import { prisma } from "@/lib/db";
import { providersFor, servesLanguage } from "../../lib/provider-directory";

const eu = (prisma as any).user.findUnique as jest.Mock;
const clinicas = (prisma as any).clinic.findMany as jest.Mock;

const tenant = (over: Record<string, unknown> = {}) => ({
  id: "t1", name: "Dr. Silva", slug: "dr-silva", type: "DOCTOR",
  languages: ["pt-BR"], logoUrl: null, ...over,
});

beforeEach(() => {
  jest.clearAllMocks();
  eu.mockResolvedValue({ clinicId: "bpr", preferredLocale: "en-GB" });
  clinicas.mockResolvedValue([]);
});

describe("servesLanguage", () => {
  it("lista vazia é sem restrição — o caso de toda clínica que já existia", () => {
    expect(servesLanguage([], "en-GB")).toBe(true);
    expect(servesLanguage([], "pt-BR")).toBe(true);
  });
  it("pt-BR e pt são a mesma língua", () => {
    expect(servesLanguage(["pt-BR"], "pt")).toBe(true);
    expect(servesLanguage(["pt"], "pt-BR")).toBe(true);
  });
  it("português não atende quem lê em inglês", () => {
    expect(servesLanguage(["pt-BR"], "en-GB")).toBe(false);
  });
  it("quem fala as duas atende as duas", () => {
    expect(servesLanguage(["en-GB", "pt-BR"], "en-GB")).toBe(true);
    expect(servesLanguage(["en-GB", "pt-BR"], "pt-BR")).toBe(true);
  });
});

describe("providersFor", () => {
  it("o médico que só fala português não aparece para quem lê em inglês", async () => {
    clinicas.mockResolvedValue([tenant()]);
    expect(await providersFor("p1")).toEqual([]);
  });

  it("e aparece para quem lê em português", async () => {
    eu.mockResolvedValue({ clinicId: "bpr", preferredLocale: "pt-BR" });
    clinicas.mockResolvedValue([tenant()]);
    expect((await providersFor("p1")).map((c) => c.slug)).toEqual(["dr-silva"]);
  });

  it("só quem aceita gente nova é consultado — nascer não basta", async () => {
    await providersFor("p1");
    expect(clinicas.mock.calls[0][0].where.acceptingPatients).toBe(true);
  });

  it("o tenant onde a pessoa já está não é uma opção a escolher", async () => {
    await providersFor("p1");
    expect(clinicas.mock.calls[0][0].where.id).toEqual({ not: "bpr" });
  });

  it("quem não tem tenant vê todos os abertos da sua língua", async () => {
    eu.mockResolvedValue({ clinicId: null, preferredLocale: "pt-BR" });
    clinicas.mockResolvedValue([tenant(), tenant({ id: "t2", slug: "psi", type: "PSYCHOLOGIST", languages: [] })]);
    const r = await providersFor("p1");
    expect(r.map((c) => c.slug).sort()).toEqual(["dr-silva", "psi"]);
    expect(clinicas.mock.calls[0][0].where.id).toBeUndefined();
  });

  it("usuário inexistente não lista nada, e nem consulta", async () => {
    eu.mockResolvedValue(null);
    expect(await providersFor("nao-existe")).toEqual([]);
    expect(clinicas).not.toHaveBeenCalled();
  });
});
