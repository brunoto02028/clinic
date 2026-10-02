import { writeFileSync } from "fs";
import { construirPdfDoEcg } from "../../lib/ecg-pdf";
import { tracadoEmPapel } from "../../lib/ecg-tracado";
const OUT = process.argv[2];
const base = { nome: "Teste QA", recordedAt: new Date("2026-10-01T22:54:15Z"), heartRate: 63,
  conclusao: "normal", samplingHz: 300, wearPosition: 1, clinica: "BPR Clinic", idioma: "en" as const };
// Pico de 2500 µV (2,5 mV) = 25 mm acima da linha de base. A faixa tem 36 mm,
// linha de base a 18 mm -> só há 18 mm para cima. Tem de haver CORTE.
const alto = Array.from({ length: 9000 }, (_, i) => ((i % 300) < 20 ? 2500 : 0));
const g = tracadoEmPapel(alto, 300, { segundosPorFaixa: 10, alturaMm: 36 })!;
console.log("cortado =", g.cortado, "| picoMv =", g.picoMv, "(2,5 mV pedia 25 mm; a faixa dá 18 mm acima da base)");
const topo = Math.min(...g.faixas[0].colunas.map((c) => c.yMin as number));
console.log("y mínimo desenhado (mm do topo da faixa) =", topo, "-> preso ao topo, a onda fica de topo plano");
const buf = construirPdfDoEcg({ ...base, signal: alto });
writeFileSync(`${OUT}/t9-corte-2500uv.pdf`, Buffer.from(buf));
console.log("pdf:", buf.byteLength, "bytes");
