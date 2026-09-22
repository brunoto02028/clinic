import { PrismaClient } from "@prisma/client";
import { zonedTimeToUtc as webTz } from "../lib/clinic-timezone";
import { zonedTimeToUtc as appTz } from "../mobile/src/lib/clinic-timezone";
const { api } = require("./lib");
const p = new PrismaClient();
const PB = "cmucgsgj10004xz4wg45fwg5e";

const diary = (d: Date) =>
  new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/London", dateStyle: "short", timeStyle: "short" }).format(d);

async function book(who: string, dateStr: string, time: string, iso: string, label: string) {
  const r = await api(who, "/api/appointments", {
    method: "POST",
    body: JSON.stringify({ dateTime: iso, treatmentType: "Follow-up", notes: `QA069 ${label}` }),
  });
  return r;
}

(async () => {
  await p.appointment.deleteMany({ where: { patientId: PB, notes: { contains: "QA069" } } });

  for (const [dateStr, label, expected] of [
    ["2026-09-23", "C7 dentro do BST", "2026-09-23T08:00:00.000Z"],
    ["2026-12-15", "C8 fora do BST", "2026-12-15T09:00:00.000Z"],
  ] as [string, string, string][]) {
    const time = "09:00";
    console.log(`\n===== ${label}: paciente escolhe ${dateStr} as ${time} =====`);

    const appIso = appTz(dateStr, time).toISOString();
    const webIso = webTz(dateStr, time).toISOString();
    console.log(`  app calcula: ${appIso}`);
    console.log(`  web calcula: ${webIso}`);

    const rApp = await book("pb", dateStr, time, appIso, `${label} APP`);
    console.log(`  POST /api/appointments (app) -> HTTP ${rApp.status}`);
    const rWeb = await book("pb", dateStr, time, webIso, `${label} WEB`);
    console.log(`  POST /api/appointments (web) -> HTTP ${rWeb.status}`);

    const rows = await p.appointment.findMany({
      where: { patientId: PB, notes: { contains: label } },
      select: { dateTime: true, notes: true }, orderBy: { notes: "asc" },
    });
    console.log("  --- BANCO ---"); if (rows.length !== 2) { console.log(`    !! esperava 2 linhas, veio ${rows.length} — teste invalido`); }
    for (const row of rows) {
      const src = row.notes!.includes("APP") ? "APP" : "WEB";
      console.log(`    ${src}: dateTime = ${row.dateTime.toISOString()}  | agenda mostra: ${diary(row.dateTime)}`);
    }
    const isos = rows.map(r => r.dateTime.toISOString());
    console.log(`  >>> gravado == esperado (${expected})?`, (rows.length===2 && isos.every(i => i === expected)) ? "SIM" : `NAO -> ${isos.join(" / ")}`);
    console.log(`  >>> app e web gravaram o MESMO instante?`, isos.length === 2 && isos[0] === isos[1] ? "SIM" : "NAO");
    console.log(`  >>> agenda mostra 09:00 (o que a paciente escolheu)?`, (rows.length===2 && rows.every(r => diary(r.dateTime).endsWith("09:00"))) ? "SIM" : "NAO");
  }
  await p.$disconnect();
})().catch(e => { console.error("ERR", e); process.exit(1); });
