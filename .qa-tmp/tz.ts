import { zonedTimeToUtc as webTz } from "../lib/clinic-timezone";
import { zonedTimeToUtc as appTz } from "../mobile/src/lib/clinic-timezone";

const old = (d: string, t: string) => new Date(`${d}T${t}:00.000Z`); // formula antiga do app

const cases: [string, string, string][] = [
  ["2026-09-23", "09:00", "DENTRO do BST"],
  ["2026-09-23", "17:30", "DENTRO do BST"],
  ["2026-12-15", "09:00", "FORA do BST (GMT)"],
  ["2026-12-15", "17:30", "FORA do BST (GMT)"],
  ["2026-03-29", "09:00", "virada GMT->BST"],
  ["2026-10-25", "09:00", "virada BST->GMT"],
];

console.log("data         hora  | WEB                      | APP (novo)               | APP (antigo)             | igual | cenario");
console.log("-".repeat(128));
let allMatch = true;
for (const [d, t, label] of cases) {
  const w = webTz(d, t).toISOString();
  const a = appTz(d, t).toISOString();
  const o = old(d, t).toISOString();
  const match = w === a;
  if (!match) allMatch = false;
  const drift = (new Date(o).getTime() - new Date(w).getTime()) / 3600000;
  console.log(`${d}  ${t} | ${w} | ${a} | ${o} |  ${match ? "SIM" : "NAO"}  | ${label}${drift ? `  [antigo desviava +${drift}h]` : "  [antigo coincidia]"}`);
}
console.log("\n>>> app == web em todos os casos:", allMatch ? "SIM" : "NAO");
console.log(">>> C7  23/09/2026 09:00 (BST) ->", appTz("2026-09-23", "09:00").toISOString(), "| esperado 2026-09-23T08:00:00.000Z");
console.log(">>> C8  15/12/2026 09:00 (GMT) ->", appTz("2026-12-15", "09:00").toISOString(), "| esperado 2026-12-15T09:00:00.000Z");
