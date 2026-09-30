/**
 * @jest-environment node
 */
// QA 114 — sonda temporária contra o banco local. Apagada ao fim do QA.
import { donoDoAparelho } from "@/lib/dono-do-aparelho";
import { attributeClinicReading } from "@/lib/clinic-device";
import { prisma } from "@/lib/db";

const A = "cmuobxq7r0000xz7sqo2aoyps";
const D1 = "cmuobxqr0000nxz7suj73ns0o";
const D2 = "cmuobxqra000rxz7s07yexb7g";
const D3 = "cmuobxqrj000vxz7s1z8obo3t";
const DONO = "cmuobxqfo0009xz7svk3se103";
const OUTRA = "cmuobxqqt000lxz7son63ku4k";

jest.setTimeout(120000);

afterAll(async () => { await prisma.$disconnect(); });

it("QA114 sonda", async () => {
  const linhas: string[] = [];
  linhas.push("=== donoDoAparelho ===");
  for (const [nome, id] of [["D1 dono-legitimo", D1], ["D2 dono-de-OUTRA-clinica", D2], ["D3 duas-pessoais", D3]] as const) {
    const r = await donoDoAparelho(id, A);
    linhas.push(`${nome}: ${JSON.stringify(r)}${r ? (r.patientId === DONO ? " [= DONO ok]" : r.patientId === OUTRA ? " [!!! VAZAMENTO: paciente de outra clinica !!!]" : " [?]") : ""}`);
  }
  linhas.push("");
  linhas.push("=== attributeClinicReading, sem sessao ===");
  const casos = [
    { nome: "D1 (esperado: owner -> dono)", conn: D1, sys: 141, dia: 91 },
    { nome: "D2 (esperado: unassigned/caixa)", conn: D2, sys: 132, dia: 84 },
    { nome: "D3 (esperado: unassigned/caixa)", conn: D3, sys: 128, dia: 79 },
  ];
  for (const c of casos) {
    const mid = `QA114-${c.conn.slice(-5)}-${Date.now()}`;
    const out: any = await attributeClinicReading(
      { id: c.conn, clinicId: A, isClinicDevice: true },
      { systolic: c.sys, diastolic: c.dia, heartRate: 70, measuredAt: new Date(), measureId: mid } as any,
      { qa: 114 }
    );
    linhas.push(`${c.nome} -> ${JSON.stringify(out)}`);
    if (out.readingId) {
      const r = await (prisma as any).bloodPressureReading.findUnique({
        where: { id: out.readingId },
        select: { id: true, patientId: true, clinicId: true, autoAttributed: true, context: true, source: true, method: true, notes: true, withingsMeasureId: true, systolic: true, diastolic: true },
      });
      linhas.push(`   gravado: ${JSON.stringify(r)}`);
    }
  }
  // eslint-disable-next-line no-console
  console.log("\n" + linhas.join("\n") + "\n");
  expect(true).toBe(true);
});
