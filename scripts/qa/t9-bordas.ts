/* QA T-9 (temporário) — as bordas do sinal: lixo, zeros, NaN. */
import { writeFileSync } from "fs";
import { construirPdfDoEcg } from "../../lib/ecg-pdf";
import { tracadoEmPapel } from "../../lib/ecg-tracado";
const OUT = process.argv[2];
const base = { nome: "Teste QA", recordedAt: new Date("2026-10-01T22:54:15Z"), heartRate: 63,
  conclusao: "normal", samplingHz: 300, wearPosition: 1, clinica: "BPR Clinic", idioma: "en" as const };
const casos: Array<[string, any[]]> = [
  ["tudo-zeros",  Array.from({length:9000},()=>0)],
  ["tudo-null",   Array.from({length:9000},()=>null)],
  ["tudo-string", Array.from({length:9000},()=>"x")],
  ["tudo-NaN",    Array.from({length:9000},()=>NaN)],
  ["lista-vazia", []],
];
for (const [nome, sinal] of casos) {
  const g = tracadoEmPapel(sinal as any, 300, { segundosPorFaixa: 10, alturaMm: 36 });
  const buf = construirPdfDoEcg({ ...base, signal: sinal as any });
  writeFileSync(`${OUT}/t9-borda-${nome}.pdf`, Buffer.from(buf));
  const ys = g ? [...new Set(g.faixas.flatMap((f) => f.colunas.flatMap((c) => [c.yMin, c.yMax])))] : [];
  console.log(
    nome.padEnd(13),
    `tracado=${g === null ? "null" : "objeto"}`,
    `faixas=${g ? g.faixas.length : "-"}`,
    `colunas(f0)=${g && g.faixas[0] ? g.faixas[0].colunas.length : 0}`,
    `y=${ys.length <= 4 ? JSON.stringify(ys) : ys.length + " valores"}`,
    `pdf=${buf.byteLength}B`
  );
}
