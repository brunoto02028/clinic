/* QA T-9 (temporário) — gera PDFs de ECG com sinais conhecidos, para medir. */
import { writeFileSync } from "fs";
import { construirPdfDoEcg, DadosDoEcgParaPapel } from "../../lib/ecg-pdf";
import { tracadoEmPapel } from "../../lib/ecg-tracado";

const OUT = process.argv[2];
if (!OUT) throw new Error("uso: tsx t9-gerar-pdfs.ts <dir>");

/**
 * Onda quadrada conhecida: 1000 µV na primeira meia de cada segundo, 0 na
 * segunda. 300 Hz, 9000 amostras = 30 s.
 *  - borda de subida a cada 1 s  -> tem de ficar a 25 mm de distância
 *  - 1000 µV                     -> tem de subir 10 mm
 */
const quadrada = Array.from({ length: 9000 }, (_, i) => ((i % 300) < 150 ? 1000 : 0));

const base: DadosDoEcgParaPapel = {
  nome: "Teste QA",
  dataDeNascimento: new Date("1980-01-15T00:00:00Z"),
  recordedAt: new Date("2026-10-01T22:54:15.000Z"),
  fuso: "Europe/London",
  heartRate: 63,
  conclusao: "normal",
  signal: quadrada,
  samplingHz: 300,
  wearPosition: 1,
  clinica: "BPR Clinic",
};

const casos: Array<[string, Partial<DadosDoEcgParaPapel>]> = [
  ["quadrada-en", {}],
  ["quadrada-pt", { idioma: "pt" }],
  ["sem-tracado-en", { signal: null }],
  ["sem-tracado-pt", { signal: null, idioma: "pt" }],
  ["sem-hz-en", { samplingHz: null }],
  ["fibrilacao-en", { conclusao: "fibrilacao" }],
  ["fibrilacao-pt", { conclusao: "fibrilacao", idioma: "pt" }],
  ["inconclusivo-en", { conclusao: "inconclusivo" }],
  ["inconclusivo-pt", { conclusao: "inconclusivo", idioma: "pt" }],
  // senoide realista, para ver se parece um ECG e não um rabisco
  [
    "senoide-en",
    {
      signal: Array.from({ length: 9000 }, (_, i) =>
        Math.round(1500 * Math.exp(-(((i % 300) - 60) ** 2) / 18) - 200 * Math.exp(-(((i % 300) - 48) ** 2) / 40))
      ),
    },
  ],
  // sinal curto: 7 s só -> uma faixa
  ["curto-7s-en", { signal: quadrada.slice(0, 2100) }],
];

for (const [nome, d] of casos) {
  const buf = construirPdfDoEcg({ ...base, ...d });
  writeFileSync(`${OUT}/t9-${nome}.pdf`, Buffer.from(buf));
  console.log(`${nome}: ${Buffer.from(buf).byteLength} bytes`);
}

/* E o que a geometria diz, antes de olhar o papel. */
const g = tracadoEmPapel(quadrada, 300, { segundosPorFaixa: 10, alturaMm: 36 });
console.log(
  JSON.stringify(
    {
      faixas: g!.faixas.length,
      larguraMm: g!.larguraMm,
      alturaMm: g!.alturaMm,
      duracaoSegundos: g!.duracaoSegundos,
      amostrasPorPonto: g!.amostrasPorPonto,
      pontosNaFaixa0: g!.faixas[0].pontos.length,
      primeiros6: g!.faixas[0].pontos.slice(0, 6),
      inicios: g!.faixas.map((f) => f.inicioSegundos),
      ySet: [...new Set(g!.faixas[0].pontos.map((p) => p.y))].sort((a, b) => a - b),
    },
    null,
    2
  )
);
