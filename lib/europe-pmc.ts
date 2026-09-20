// Europe PMC literature search + deterministic evidence grading, as a server
// module. Ported from Skills/clinical-evidence-report/scripts/search_literature.js
// (validated live against the real API in activity 14).
//
// No dependency, no API key — Europe PMC is public. Only clinical terms go in
// the query; NEVER patient PII.

const ENDPOINT = "https://www.ebi.ac.uk/europepmc/webservices/rest/search";

export type EvidenceLevelLabel =
  | "Systematic review / meta-analysis"
  | "Randomised controlled trial"
  | "Clinical guideline"
  | "Narrative review"
  | "Other / primary study";

export interface LiteratureResult {
  id: string | null;
  source: string | null;
  pmid: string | null;
  doi: string | null;
  url: string | null;
  title: string | null;
  authors: string | null;
  journal: string | null;
  year: string | null;
  language: string | null;
  pubTypes: string[];
  isOpenAccess: boolean;
  evidenceLevel: EvidenceLevelLabel;
  evidenceRank: number;
}

const LEVELS: Record<string, { rank: number; label: EvidenceLevelLabel }> = {
  SR: { rank: 5, label: "Systematic review / meta-analysis" },
  RCT: { rank: 4, label: "Randomised controlled trial" },
  GUIDELINE: { rank: 3, label: "Clinical guideline" },
  REVIEW: { rank: 2, label: "Narrative review" },
  OTHER: { rank: 1, label: "Other / primary study" },
};

function asArray(v: unknown): string[] {
  return Array.isArray(v) ? (v as string[]) : v ? [v as string] : [];
}

function classify(pubTypes: string[], title: string | null) {
  const hay = (pubTypes.join(" ") + " " + (title || "")).toLowerCase();
  if (hay.includes("meta-analysis") || hay.includes("meta analysis") || hay.includes("systematic review")) return LEVELS.SR;
  if (
    hay.includes("randomized controlled trial") ||
    hay.includes("randomised controlled trial") ||
    hay.includes("controlled clinical trial") ||
    /\brct\b/.test(hay)
  ) return LEVELS.RCT;
  if (hay.includes("guideline")) return LEVELS.GUIDELINE;
  if (hay.includes("review")) return LEVELS.REVIEW;
  return LEVELS.OTHER;
}

function toUrl(r: any): string | null {
  if (r.doi) return `https://doi.org/${r.doi}`;
  if (r.source && r.id) return `https://europepmc.org/article/${r.source}/${r.id}`;
  return null;
}

/** Search Europe PMC and return results graded by evidence level, strongest first. */
export async function searchLiterature(query: string, maxResults = 25): Promise<LiteratureResult[]> {
  const size = Math.min(Math.max(maxResults, 1), 100);
  const url = `${ENDPOINT}?query=${encodeURIComponent(query)}&format=json&resultType=core&pageSize=${size}`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);
  let res: Response;
  try {
    res = await fetch(url, { headers: { Accept: "application/json" }, signal: controller.signal });
  } catch (e: any) {
    throw new Error(
      e?.name === "AbortError" ? "Europe PMC timeout (20s)" : `Europe PMC network error: ${e?.message}`,
    );
  } finally {
    clearTimeout(timeout);
  }
  if (!res.ok) throw new Error(`Europe PMC HTTP ${res.status}`);

  const data: any = await res.json();
  const rows: any[] = data?.resultList?.result || [];

  const results: LiteratureResult[] = rows.map((r) => {
    const pubTypes = asArray(r.pubTypeList?.pubType);
    const level = classify(pubTypes, r.title);
    return {
      id: r.id || null,
      source: r.source || null,
      pmid: r.pmid || null,
      doi: r.doi || null,
      url: toUrl(r),
      title: r.title || null,
      authors: r.authorString || null,
      journal: r.journalTitle || r.journalInfo?.journal?.title || r.bookOrReportDetails?.publisher || null,
      year: r.pubYear || null,
      language: r.language || null,
      pubTypes,
      isOpenAccess: r.isOpenAccess === "Y",
      evidenceLevel: level.label,
      evidenceRank: level.rank,
    };
  });

  results.sort((a, b) => b.evidenceRank - a.evidenceRank || (Number(b.year) || 0) - (Number(a.year) || 0));
  return results;
}

/** Merge result lists, dropping duplicates by Europe PMC id. */
export function dedupeById(lists: LiteratureResult[][]): LiteratureResult[] {
  const seen = new Set<string>();
  const out: LiteratureResult[] = [];
  for (const list of lists) {
    for (const r of list) {
      const key = r.id || `${r.source}:${r.pmid}:${r.title}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(r);
    }
  }
  out.sort((a, b) => b.evidenceRank - a.evidenceRank || (Number(b.year) || 0) - (Number(a.year) || 0));
  return out;
}

/**
 * Build English search queries covering different angles of a case. Only
 * clinical terms — never PII. `condition` is the clinical problem (from the
 * triage chief complaint / body region), `region` an optional anatomical
 * hint, `documentFindings` optional short clinical findings pulled from the
 * patient's exams/imaging (activity 066 T-1) — each becomes its own search
 * angle, so a real finding (e.g. "subchondral insufficiency fracture") ends
 * up backing a real literature search instead of sitting in the report as
 * unsupported text.
 */
export function buildQueries(input: { condition: string; region?: string | null; documentFindings?: string[] }): string[] {
  const c = input.condition.trim().replace(/\s+/g, " ");
  if (!c) return [];
  const queries = [
    `${c} exercise therapy`,
    `${c} physiotherapy rehabilitation`,
    `${c} systematic review`,
  ];
  if (input.region && !c.toLowerCase().includes(input.region.toLowerCase())) {
    queries.push(`${input.region} ${c} treatment`);
  }
  for (const finding of (input.documentFindings || []).slice(0, 2)) {
    // A document finding is a 1-2 sentence AI summary, not a short search
    // phrase — a flat character cut landed mid-word (QA finding, activity
    // 066 T-1: "...associated bone m treatment"), hurting the Europe PMC
    // match. Use just the first sentence, then fall back to a word-boundary
    // cut if that alone is still long.
    const firstSentence = finding.trim().replace(/\s+/g, " ").split(/(?<=[.!?])\s/)[0];
    let f = firstSentence.replace(/[.!?]+$/, "");
    if (f.length > 100) {
      const cut = f.slice(0, 100);
      const lastSpace = cut.lastIndexOf(" ");
      f = lastSpace > 40 ? cut.slice(0, lastSpace) : cut;
    }
    if (f) queries.push(`${f} treatment`);
  }
  // de-dup identical strings, cap at 6 (up from 4 — document findings add
  // real search angles, not noise, but this still bounds the Europe PMC
  // calls per report)
  return [...new Set(queries)].slice(0, 6);
}
