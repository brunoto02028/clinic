// lib/article-schema.ts
// Structured data helpers for article pages (P4 of
// BPR_Devin_Spec_Website_Improvements.md): Article schema on every article,
// and FAQPage schema extracted from the article's own FAQ section when
// present. Extraction is best-effort and silently returns null/empty if the
// content doesn't match the expected shape — never throws, never blocks
// rendering.
import * as cheerio from "cheerio";

export interface FaqPair {
  question: string;
  answer: string;
}

const FAQ_HEADING_RE = /^(faq|frequently asked questions|perguntas frequentes)$/i;

/** Looks for an <h2>/<h3> FAQ heading (EN or PT, plain or wrapped in
 *  <strong>) and reads the "<p><strong>Question?</strong> Answer</p>" pairs
 *  that follow it, stopping at the next heading. Returns [] if no FAQ
 *  section is found. */
export function extractFaqPairs(html: string | null | undefined): FaqPair[] {
  if (!html) return [];
  try {
    const $ = cheerio.load(html);
    const headings = $("h1, h2, h3, h4").toArray();
    const faqHeading = headings.find((el) => FAQ_HEADING_RE.test($(el).text().trim()));
    if (!faqHeading) return [];

    const pairs: FaqPair[] = [];
    let node = $(faqHeading).next();
    while (node.length && !/^h[1-4]$/i.test((node.get(0) as any)?.tagName || "")) {
      if (node.is("p")) {
        const strong = node.find("strong").first();
        const question = strong.text().trim().replace(/\s+/g, " ");
        if (question) {
          // Answer = paragraph text minus the question (strong) part
          const fullText = node.text().trim().replace(/\s+/g, " ");
          const answer = fullText.startsWith(question) ? fullText.slice(question.length).trim() : fullText;
          if (question.length > 3 && answer.length > 3) {
            pairs.push({ question: question.replace(/[?？]\s*$/, "?"), answer });
          }
        }
      }
      node = node.next();
    }
    return pairs;
  } catch {
    return [];
  }
}

export function buildFaqPageSchema(pairs: FaqPair[]) {
  if (pairs.length === 0) return null;
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: pairs.map((p) => ({
      "@type": "Question",
      name: p.question,
      acceptedAnswer: { "@type": "Answer", text: p.answer },
    })),
  };
}

export function buildArticleSchema(params: {
  url: string;
  title: string;
  description?: string | null;
  imageUrl?: string | null;
  authorName: string;
  datePublished: Date;
  dateModified: Date;
  publisherName?: string;
  publisherLogoUrl?: string | null;
}) {
  const {
    url, title, description, imageUrl, authorName, datePublished, dateModified,
    publisherName = "Bruno Physical Rehabilitation", publisherLogoUrl,
  } = params;

  return {
    "@context": "https://schema.org",
    "@type": "MedicalWebPage",
    "@id": url,
    url,
    headline: title,
    ...(description ? { description } : {}),
    ...(imageUrl ? { image: [imageUrl] } : {}),
    author: { "@type": "Person", name: authorName },
    datePublished: datePublished.toISOString(),
    dateModified: dateModified.toISOString(),
    publisher: {
      "@type": "Organization",
      name: publisherName,
      ...(publisherLogoUrl ? { logo: { "@type": "ImageObject", url: publisherLogoUrl } } : {}),
    },
    mainEntityOfPage: { "@type": "WebPage", "@id": url },
  };
}
