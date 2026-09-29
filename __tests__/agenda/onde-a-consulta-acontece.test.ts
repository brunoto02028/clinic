/**
 * @jest-environment node
 *
 * A frase que diz ao paciente para onde ir.
 *
 * Três rotas escreviam essa frase, cada uma à sua maneira, e a do `PUT`
 * **farejava a palavra "domicílio" no texto livre das anotações** — de quando
 * não havia onde registar o formato. O campo `mode` existe desde a atividade
 * 089, então uma visita domiciliar marcada corretamente, com as notas vazias,
 * recebia no e-mail o endereço **da clínica**: a pessoa saía de casa enquanto o
 * terapeuta ia à casa dela.
 */

jest.mock("@/lib/db", () => ({
  prisma: {
    user: { findUnique: jest.fn() },
    clinic: { findUnique: jest.fn() },
  },
}));

import { prisma } from "@/lib/db";
import { localDaConsulta } from "@/lib/appointment-location";

const db = prisma as any;

beforeEach(() => {
  jest.clearAllMocks();
  db.clinic.findUnique.mockResolvedValue({
    name: "BPR Clinic",
    address: "1 Clinic Street",
    city: "London",
  });
  db.user.findUnique.mockResolvedValue({
    address: "7 Second Avenue",
    city: "Bromley",
    postcode: "BR1 3CD",
  });
});

describe("domicílio é o endereço de quem recebe", () => {
  it("**diz o endereço do paciente, e não o da clínica**", async () => {
    const frase = await localDaConsulta("clinicaA", "HOME_VISIT", "p1");
    expect(frase).toContain("7 Second Avenue");
    expect(frase).toContain("BR1 3CD");
    expect(frase).not.toContain("Clinic Street");
  });

  it("**com as notas vazias também** — era aqui que mandava para a clínica", async () => {
    // O defeito não dependia do endereço nem do inquilino: dependia de a palavra
    // "domicílio" não estar escrita nas anotações. O `mode` não tem essa dúvida.
    const frase = await localDaConsulta("clinicaA", "HOME_VISIT", "p1");
    expect(frase.startsWith("At your address")).toBe(true);
    expect(db.clinic.findUnique).not.toHaveBeenCalled();
  });

  it("paciente sem endereço cadastrado: ainda é a casa dele, sem endereço", async () => {
    // Cair no endereço da clínica por falta de dado é o pior desfecho: manda
    // alguém para o lugar errado com uma frase que parece certa.
    db.user.findUnique.mockResolvedValue({ address: null, city: null, postcode: null });
    expect(await localDaConsulta("clinicaA", "HOME_VISIT", "p1")).toBe("At your address");
  });
});

describe("os outros dois formatos", () => {
  it("vídeo não manda ninguém a lugar nenhum, e aponta para o app", async () => {
    const frase = await localDaConsulta("clinicaA", "VIDEO", "p1");
    expect(frase).toMatch(/app/i);
    expect(db.clinic.findUnique).not.toHaveBeenCalled();
    expect(db.user.findUnique).not.toHaveBeenCalled();
  });

  it("presencial diz a casa e o endereço dela", async () => {
    const frase = await localDaConsulta("clinicaA", "IN_PERSON", "p1");
    expect(frase).toBe("BPR Clinic — 1 Clinic Street, London");
  });

  it("formato ausente cai no presencial, que é o padrão do banco", async () => {
    const frase = await localDaConsulta("clinicaA", null, "p1");
    expect(frase).toContain("BPR Clinic");
  });

  it("clínica sem endereço: o nome sozinho, sem ' — ' pendurado", async () => {
    db.clinic.findUnique.mockResolvedValue({ name: "BPR Clinic", address: null, city: null });
    expect(await localDaConsulta("clinicaA", "IN_PERSON", "p1")).toBe("BPR Clinic");
  });
});

describe("sem inquilino resolvido", () => {
  it("**não inventa endereço** — nem vai ao banco procurar", async () => {
    const frase = await localDaConsulta(null, "IN_PERSON", "p1");
    expect(frase).toBe("BPR Physical Rehabilitation");
    expect(db.clinic.findUnique).not.toHaveBeenCalled();
  });

  it("mas domicílio sem inquilino continua sendo a casa do paciente", async () => {
    const frase = await localDaConsulta(null, "HOME_VISIT", "p1");
    expect(frase).toContain("Bromley");
  });

  it("clínica que não existe mais: o nome da casa, e não uma frase vazia", async () => {
    db.clinic.findUnique.mockResolvedValue(null);
    expect(await localDaConsulta("apagada", "IN_PERSON", "p1")).toBe("BPR Physical Rehabilitation");
  });
});
