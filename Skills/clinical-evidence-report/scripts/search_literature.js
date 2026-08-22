#!/usr/bin/env node
/*
 * search_literature.js — busca na Europe PMC e classifica por nível de evidência.
 *
 * Uso:
 *   node search_literature.js "<query em inglês>" [maxResults]
 *
 * - Node 18+ (usa fetch global). Sem dependências. Sem chave de API.
 * - Europe PMC é público e gratuito. Só termos clínicos vão na query — nunca PII.
 * - Saída: JSON no stdout, ordenado do nível de evidência mais forte para o mais fraco.
 *   Falha de rede/HTTP → mensagem no stderr e exit != 0 (não trava em silêncio).
 *
 * A classificação é determinística: deriva de pubType + título por regras fixas, então o
 * mesmo input sempre produz a mesma ordem — de propósito, para o relatório ser reprodutível.
 */

const ENDPOINT = "https://www.ebi.ac.uk/europepmc/webservices/rest/search";

// Nível de evidência → rank (maior = mais forte). Usado para ordenar.
const LEVELS = {
  SYSTEMATIC_REVIEW: { rank: 5, label: "Systematic review / meta-analysis" },
  RCT: { rank: 4, label: "Randomised controlled trial" },
  GUIDELINE: { rank: 3, label: "Clinical guideline" },
  REVIEW: { rank: 2, label: "Narrative review" },
  OTHER: { rank: 1, label: "Other / primary study" },
};

// Europe PMC quase sempre devolve pubType como array, mas pode vir escalar —
// normaliza para não quebrar o .join.
function asArray(v) {
  return Array.isArray(v) ? v : v ? [v] : [];
}

function classify(pubTypes, title) {
  const hay = (pubTypes.join(" ") + " " + (title || "")).toLowerCase();
  if (hay.includes("meta-analysis") || hay.includes("meta analysis") || hay.includes("systematic review")) {
    return LEVELS.SYSTEMATIC_REVIEW;
  }
  if (
    hay.includes("randomized controlled trial") ||
    hay.includes("randomised controlled trial") ||
    hay.includes("controlled clinical trial") ||
    /\brct\b/.test(hay)
  ) {
    return LEVELS.RCT;
  }
  if (hay.includes("guideline")) return LEVELS.GUIDELINE;
  if (hay.includes("review")) return LEVELS.REVIEW;
  return LEVELS.OTHER;
}

function toUrl(r) {
  if (r.doi) return `https://doi.org/${r.doi}`;
  if (r.source && r.id) return `https://europepmc.org/article/${r.source}/${r.id}`;
  return null;
}

async function main() {
  const query = process.argv[2];
  const maxResults = Math.min(Math.max(parseInt(process.argv[3] || "25", 10) || 25, 1), 100);

  if (!query || !query.trim()) {
    console.error('Erro: forneça uma query. Uso: node search_literature.js "<query em inglês>" [maxResults]');
    process.exit(2);
  }

  const url =
    `${ENDPOINT}?query=${encodeURIComponent(query)}` +
    `&format=json&resultType=core&pageSize=${maxResults}`;

  let res;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);
  try {
    res = await fetch(url, { headers: { Accept: "application/json" }, signal: controller.signal });
  } catch (e) {
    console.error(
      e.name === "AbortError"
        ? "Timeout (20s) ao chamar a Europe PMC — sem resposta."
        : `Erro de rede ao chamar a Europe PMC: ${e.message}`,
    );
    process.exit(1);
  } finally {
    clearTimeout(timeout);
  }

  if (!res.ok) {
    console.error(`Europe PMC respondeu HTTP ${res.status} ${res.statusText}`);
    process.exit(1);
  }

  let data;
  try {
    data = await res.json();
  } catch (e) {
    console.error(`Resposta da Europe PMC não é JSON válido: ${e.message}`);
    process.exit(1);
  }

  const rows = (data.resultList && data.resultList.result) || [];

  const results = rows.map((r) => {
    const pubTypes = asArray(r.pubTypeList && r.pubTypeList.pubType);
    const level = classify(pubTypes, r.title);
    return {
      id: r.id || null,
      source: r.source || null,
      pmid: r.pmid || null,
      doi: r.doi || null,
      url: toUrl(r),
      title: r.title || null,
      authors: r.authorString || null,
      journal:
        r.journalTitle ||
        (r.journalInfo && r.journalInfo.journal && r.journalInfo.journal.title) ||
        (r.bookOrReportDetails && r.bookOrReportDetails.publisher) ||
        null,
      year: r.pubYear || null,
      language: r.language || null,
      pubTypes,
      isOpenAccess: r.isOpenAccess === "Y",
      evidenceLevel: level.label,
      evidenceRank: level.rank,
    };
  });

  // Ordena por força de evidência, depois por ano (mais recente primeiro).
  results.sort((a, b) => b.evidenceRank - a.evidenceRank || (Number(b.year) || 0) - (Number(a.year) || 0));

  process.stdout.write(JSON.stringify({ query, count: results.length, results }, null, 2) + "\n");
}

main();
