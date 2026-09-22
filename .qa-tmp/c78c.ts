import { PrismaClient } from "@prisma/client";
import { readFileSync } from "fs";
import { zonedTimeToUtc as webTz } from "../lib/clinic-timezone";
import { zonedTimeToUtc as appTz } from "../mobile/src/lib/clinic-timezone";

const p = new PrismaClient();
const PB = "cmucgsgj10004xz4wg45fwg5e";
const diary = (d: Date) =>
  new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/London", dateStyle: "short", timeStyle: "short" }).format(d);

const COOKIE = readFileSync(".qa-tmp/cookies.txt", "utf8")
  .split(/?
/)
  .map(l => l.replace(/^#HttpOnly_/, ""))
  .filter(l => l && !l.startsWith("#"))
  .map(l => l.split("	"))
  .filter(c => c.length >= 7)
  .map(c => c[5] + "=" + c[6])
  .join("; ");
if (!COOKIE.includes("session-token")) { console.error("!! sem cookie de sessao — teste invalido"); process.exit(1); }

async function post(iso: string, note: string) {
  const res = await fetch("http://localhost:4000/api/appointments", {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: COOKIE },
    body: JSON.stringify({ dateTime: iso, treatmentType: "Follow-up", notes: note }),
  });
  const txt = await res.text();
  return "-> HTTP " + res.status + (res.ok ? "" : " " + txt.slice(0, 140));
}

(async () => {
  await p.appointment.deleteMany({ where: { patientId: PB, notes: { contains: "QA069" } } });
  const cases: [string, string, string][] = [
    ["2026-09-23", "C7BST", "2026-09-23T08:00:00.000Z"],
    ["2026-12-15", "C8GMT", "2026-12-15T09:00:00.000Z"],
  ];
  for (const [dateStr, label, expected] of cases) {
    const time = "09:00";
    const appIso = appTz(dateStr, time).toISOString();
    const webIso = webTz(dateStr, time).toISOString();
    console.log("\n===== " + label + ": paciente escolhe " + dateStr + " as " + time + " (horario da clinica) =====");
    console.log("  APP calcula e envia: " + appIso);
    console.log("  WEB calcula e envia: " + webIso + "   -> identicas? " + (appIso === webIso ? "SIM" : "NAO"));
    console.log("  POST (valor do APP) " + (await post(appIso, "QA069 " + label + " APP")));
    console.log("  POST (valor da WEB) " + (await post(webIso, "QA069 " + label + " WEB")));
    const rows = await p.appointment.findMany({ where: { patientId: PB, notes: { contains: label } }, orderBy: { notes: "asc" } });
    console.log("  --- BANCO (gravado pela rota /api/appointments) ---");
    rows.forEach(r => console.log("    " + r.notes!.slice(-3) + ": dateTime=" + r.dateTime.toISOString() + "  | agenda mostra: " + diary(r.dateTime)));
    const isos = rows.map(r => r.dateTime.toISOString());
    const ok2 = rows.length === 2;
    console.log("  >>> gravado == esperado (" + expected + ")? " + (ok2 && isos.every(i => i === expected) ? "SIM" : "NAO (" + rows.length + " linhas)"));
    console.log("  >>> app e web gravam o MESMO instante? " + (ok2 && isos[0] === isos[1] ? "SIM" : "NAO"));
    console.log("  >>> agenda mostra 09:00, o que a paciente escolheu? " + (ok2 && rows.every(r => diary(r.dateTime).endsWith("09:00")) ? "SIM" : "NAO"));
  }
  await p.$disconnect();
})().catch(e => { console.error("ERR", e); process.exit(1); });
