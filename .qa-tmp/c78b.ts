import { PrismaClient } from "@prisma/client";
import { zonedTimeToUtc as webTz } from "../lib/clinic-timezone";
import { zonedTimeToUtc as appTz } from "../mobile/src/lib/clinic-timezone";
const p = new PrismaClient();
const PB = "cmucgsgj10004xz4wg45fwg5e";
const diary = (d: Date) => new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/London", dateStyle: "short", timeStyle: "short" }).format(d);

(async () => {
  await p.appointment.deleteMany({ where: { patientId: PB, notes: { contains: "QA069" } } });
  const patient = await p.user.findUnique({ where: { id: PB }, select: { clinicId: true } });

  for (const [dateStr, label, expected] of [
    ["2026-09-23", "C7 BST", "2026-09-23T08:00:00.000Z"],
    ["2026-12-15", "C8 GMT", "2026-12-15T09:00:00.000Z"],
  ] as [string, string, string][]) {
    const time = "09:00";
    const appIso = appTz(dateStr, time).toISOString();
    const webIso = webTz(dateStr, time).toISOString();
    console.log(`\n===== ${label}: paciente escolhe ${dateStr} as ${time} =====`);
    console.log(`  string que o APP envia: ${appIso}`);
    console.log(`  string que a WEB envia: ${webIso}`);
    console.log(`  identicas? ${appIso === webIso ? "SIM" : "NAO"}`);

    // A rota grava `dateTime: new Date(dateTime)` verbatim (route.ts:201).
    // Gravando os dois valores mostra o que cada caminho deixa no banco.
    for (const [src, iso] of [["APP", appIso], ["WEB", webIso]] as [string, string][]) {
      await p.appointment.create({ data: {
        patientId: PB, clinicId: patient!.clinicId!, dateTime: new Date(iso),
        treatmentType: "Follow-up", notes: `QA069 ${label} ${src}`, duration: 60, status: "SCHEDULED",
      } as any });
    }
    const rows = await p.appointment.findMany({ where: { patientId: PB, notes: { contains: label } }, orderBy: { notes: "asc" } });
    console.log("  --- BANCO ---");
    rows.forEach(r => console.log(`    ${r.notes!.slice(-3)}: ${r.dateTime.toISOString()} | agenda (Europe/London) mostra: ${diary(r.dateTime)}`));
    const isos = rows.map(r => r.dateTime.toISOString());
    console.log(`  >>> gravado == ${expected}?`, rows.length === 2 && isos.every(i => i === expected) ? "SIM" : "NAO");
    console.log(`  >>> app e web gravam o mesmo instante?`, rows.length === 2 && isos[0] === isos[1] ? "SIM" : "NAO");
    console.log(`  >>> agenda mostra 09:00 (o que a paciente escolheu)?`, rows.length === 2 && rows.every(r => diary(r.dateTime).endsWith("09:00")) ? "SIM" : "NAO");
  }
  await p.$disconnect();
})().catch(e => { console.error("ERR", e); process.exit(1); });
