/**
 * @jest-environment node
 *
 * O enum que o código pede tem que existir no modelo (081, T-1).
 *
 * Na 080, `status: { in: ["PAID", "ACTIVE"] }` derrubou toda marcação de
 * consulta com 500 e 32 testes passaram, porque mockavam o Prisma — e um mock
 * aceita qualquer objeto. O Prisma valida enum **na consulta**, então um valor
 * que não existe lança com qualquer dado. Este teste lê o schema como texto e
 * compara com o que o código mapeia.
 */

import fs from "fs";
import path from "path";
import { LML_STATUS, registrationStatusFromLml, orderMayAdvance, registrationIsTerminal } from "../../lib/lab-registration-status";

function enumFromSchema(name: string): string[] {
  const schema = fs.readFileSync(path.join(__dirname, "..", "..", "prisma", "schema.prisma"), "utf8");
  const m = schema.match(new RegExp(`enum ${name} \\{([^}]*)\\}`));
  if (!m) throw new Error(`enum ${name} não está no schema`);
  return m[1].split("\n").map((l) => l.trim()).filter((l) => l && !l.startsWith("//"));
}

describe("LabRegistrationStatus: o mapa e o schema não podem divergir", () => {
  const doSchema = enumFromSchema("LabRegistrationStatus");
  const doMapa = Object.values(LML_STATUS);

  it("todo valor do mapa existe no schema", () => {
    for (const v of doMapa) expect(doSchema).toContain(v);
  });

  it("todo valor do schema tem um nome da LML no mapa", () => {
    expect([...doMapa].sort()).toEqual([...doSchema].sort());
  });

  it("o nome deles é o nosso em minúsculo — um para um", () => {
    for (const [deles, nosso] of Object.entries(LML_STATUS)) {
      expect(nosso).toBe(deles.toUpperCase());
    }
  });
});

describe("registrationStatusFromLml", () => {
  it("aceita o nome deles com espaço e maiúscula", () => {
    expect(registrationStatusFromLml(" Awaiting_Patient ")).toBe("AWAITING_PATIENT");
  });
  it("nome desconhecido vira null, não lança", () => {
    expect(registrationStatusFromLml("kit_lost")).toBeNull();
    expect(registrationStatusFromLml(undefined)).toBeNull();
  });
});

describe("orderMayAdvance: o pedido não anda para trás", () => {
  it("avança na ordem do ciclo", () => {
    expect(orderMayAdvance("CONFIRMED", "KIT_DISPATCHED")).toBe(true);
    expect(orderMayAdvance("KIT_DISPATCHED", "RESULTS_READY")).toBe(true);
  });
  it("um evento antigo depois de um novo não retrocede", () => {
    expect(orderMayAdvance("RESULTS_READY", "KIT_DISPATCHED")).toBe(false);
    expect(orderMayAdvance("SAMPLE_RECEIVED", "SAMPLE_RECEIVED")).toBe(false);
  });
  it("cancelar vale até o resultado sair", () => {
    expect(orderMayAdvance("KIT_DISPATCHED", "CANCELLED_LAB")).toBe(true);
    expect(orderMayAdvance("RESULTS_READY", "CANCELLED_LAB")).toBe(false);
  });
  it("os estados do ciclo existem no schema", () => {
    const doSchema = enumFromSchema("LabOrderStatus");
    for (const s of ["BASKET", "CONFIRMED", "KIT_DISPATCHED", "SAMPLE_RECEIVED", "PROCESSING_LAB", "RESULTS_READY", "CANCELLED_LAB"]) {
      expect(doSchema).toContain(s);
    }
  });
});

describe("registrationIsTerminal", () => {
  it("resultado, parcial e erro são terminais; esperar não é", () => {
    expect(registrationIsTerminal("SUCCESS")).toBe(true);
    expect(registrationIsTerminal("PROCESSING_ERROR")).toBe(true);
    expect(registrationIsTerminal("PENDING")).toBe(false);
    expect(registrationIsTerminal("AWAITING_PATIENT")).toBe(false);
  });
});
