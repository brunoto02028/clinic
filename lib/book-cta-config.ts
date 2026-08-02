// Config for the Beyond Pain book CTA on articles (§3 of
// BPR_Devin_Spec_Beyond_Pain_Book.md) — "the article that maps most
// closely to the book". Matched case-insensitively against Article.tags,
// so it's a one-line edit to add/remove a topic, no per-article flag needed.
export const BOOK_CTA_TAGS = [
  "back pain",
  "sciatica",
  "recovery science",
  "knee",
  "ankle",
  "sleep",
  "pain",
  "chronic pain",
  "tendinopathy",
];

export function articleQualifiesForBookCta(tags: string[] | null | undefined): boolean {
  if (!tags || tags.length === 0) return false;
  const lower = tags.map((t) => t.toLowerCase());
  return BOOK_CTA_TAGS.some((t) => lower.includes(t));
}
