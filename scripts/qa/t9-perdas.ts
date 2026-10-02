import { tracadoEmPapel } from "../../lib/ecg-tracado";
const limpo = Array.from({ length: 9000 }, (_, i) => ((i % 300) < 150 ? 1000 : 0));
const g = tracadoEmPapel(limpo, 300, { segundosPorFaixa: 10, alturaMm: 36 });
console.log("tipo:", typeof g, "| chaves:", g && Object.keys(g));
console.log("faixas:", g && g.faixas.length);
console.log("chaves da faixa 0:", g && Object.keys(g.faixas[0] as any));
console.log("pontos?", g && (g.faixas[0] as any).pontos && (g.faixas[0] as any).pontos.length);
