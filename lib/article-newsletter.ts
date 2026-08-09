// Article newsletter — opt-in email notification sent to EmailContact subscribers
// whenever staff choose to announce a new/updated article. Recipients receive the
// email in their own preferred language (EmailContact.language: "en" | "pt"),
// using the article's titleEn/excerptEn vs titlePt/excerptPt content and the
// ARTICLE_NEWSLETTER template (see lib/email-templates.ts + lib/email-i18n.ts).
import { prisma } from '@/lib/db';
import { renderTemplate } from '@/lib/email-templates';
import { sendEmail } from '@/lib/email';
import { buildReferBlock } from '@/lib/book';

const BASE_URL = process.env.NEXTAUTH_URL || 'https://bpr.rehab';

export interface NewsletterArticle {
  id: string;
  slug: string;
  title: string;
  excerpt?: string | null;
  imageUrl?: string | null;
  imageFocalX?: number | null;
  imageFocalY?: number | null;
  titleEn?: string | null;
  excerptEn?: string | null;
  titlePt?: string | null;
  excerptPt?: string | null;
}

function articleUrl(article: NewsletterArticle) {
  return `${BASE_URL}/articles/${article.slug}`;
}

/** Article images are often stored as relative paths (e.g. /api/image-serve/xxx).
 *  Email clients cannot resolve relative URLs, so this always returns an absolute one. */
function absoluteImageUrl(imageUrl: string): string {
  return imageUrl.startsWith('http') ? imageUrl : `${BASE_URL}${imageUrl.startsWith('/') ? '' : '/'}${imageUrl}`;
}

function contentForLocale(article: NewsletterArticle, locale: 'en' | 'pt') {
  if (locale === 'pt') {
    return {
      title: article.titlePt || article.title,
      excerpt: article.excerptPt || article.excerpt || '',
    };
  }
  return {
    title: article.titleEn || article.title,
    excerpt: article.excerptEn || article.excerpt || '',
  };
}

/** A large, clickable cover-image block (clicking it opens the article) — omitted entirely if no image is set. */
function buildImageBlock(article: NewsletterArticle, title: string): string {
  if (!article.imageUrl) return '';
  const src = absoluteImageUrl(article.imageUrl);
  const objectPosition = `${article.imageFocalX ?? 50}% ${article.imageFocalY ?? 50}%`;
  return `<a href="${articleUrl(article)}" style="display:block;margin:0 0 24px;border-radius:14px;overflow:hidden;text-decoration:none;box-shadow:0 4px 14px rgba(0,0,0,0.08);"><img src="${src}" alt="${title}" style="width:100%;max-height:300px;object-fit:cover;object-position:${objectPosition};display:block;" /></a>`;
}

function buildVariables(
  article: NewsletterArticle,
  locale: 'en' | 'pt',
  recipientName: string,
  unsubscribeUrl: string,
  contactId?: string
): Record<string, string> {
  const { title, excerpt } = contentForLocale(article, locale);
  return {
    locale: locale === 'pt' ? 'pt-BR' : 'en-GB',
    recipientName,
    articleTitle: title,
    articleExcerpt: excerpt,
    articleImageUrl: article.imageUrl ? absoluteImageUrl(article.imageUrl) : '',
    articleImageBlock: buildImageBlock(article, title),
    articleUrl: articleUrl(article),
    referBlock: contactId ? buildReferBlock(contactId, locale) : '',
    unsubscribeUrl,
  };
}

/** Renders the ARTICLE_NEWSLETTER template for one recipient — shared by preview, test-send,
 *  fire-and-forget notify, and DB-tracked EmailCampaign dispatch (see email-campaigns/[id]/send).
 *  contactId (when known) powers the "refer a friend" link — see lib/book.ts buildReferBlock. */
export async function renderArticleNewsletter(
  article: NewsletterArticle,
  locale: 'en' | 'pt',
  recipientName: string,
  unsubscribeUrl: string,
  contactId?: string
): Promise<{ subject: string; html: string } | null> {
  return renderTemplate('ARTICLE_NEWSLETTER', buildVariables(article, locale, recipientName, unsubscribeUrl, contactId));
}

/** Renders a preview of the newsletter email for a given locale, without sending. */
export async function previewArticleNewsletter(
  article: NewsletterArticle,
  locale: 'en' | 'pt'
): Promise<{ subject: string; html: string } | null> {
  const recipientName = locale === 'pt' ? 'Leitor' : 'Reader';
  const unsubscribeUrl = `${BASE_URL}/unsubscribe?email=preview@example.com`;
  return renderArticleNewsletter(article, locale, recipientName, unsubscribeUrl, 'preview');
}

/** Counts subscribed contacts by preferred language (for the confirmation UI). */
export async function getSubscriberCounts(): Promise<{ en: number; pt: number; total: number }> {
  const contacts = await (prisma as any).emailContact.findMany({
    where: { subscribed: true },
    select: { language: true },
  });
  const pt = contacts.filter((c: any) => c.language === 'pt').length;
  const en = contacts.length - pt;
  return { en, pt, total: contacts.length };
}

/** Sends a single test copy of the newsletter to a given address, without touching subscribers. */
export async function sendTestArticleNewsletter(
  article: NewsletterArticle,
  locale: 'en' | 'pt',
  toEmail: string
): Promise<{ success: boolean; error?: string }> {
  const recipientName = locale === 'pt' ? 'Leitor' : 'Reader';
  const unsubscribeUrl = `${BASE_URL}/unsubscribe?email=${encodeURIComponent(toEmail)}`;
  const rendered = await renderTemplate('ARTICLE_NEWSLETTER', buildVariables(article, locale, recipientName, unsubscribeUrl, 'preview'));
  if (!rendered) return { success: false, error: 'Template not available' };

  const result = await sendEmail({
    to: toEmail,
    subject: `[TEST] ${rendered.subject}`,
    html: rendered.html,
  });
  return { success: result.success === true, error: result.success ? undefined : String(result.error) };
}

/**
 * Sends the article newsletter to all subscribed contacts, split by their
 * preferred language, in throttled batches (10 per 5 minutes) to stay within
 * typical transactional-email rate limits. Fire-and-forget — call without awaiting
 * if used from a request handler that shouldn't block on the full send.
 */
export async function sendArticleNewsletter(article: NewsletterArticle): Promise<{ queued: number }> {
  const contacts = await (prisma as any).emailContact.findMany({
    where: { subscribed: true },
    select: { id: true, email: true, firstName: true, language: true },
  });

  if (contacts.length === 0) return { queued: 0 };

  const BATCH = 10;
  const DELAY_MS = 300_000; // 5 minutes between batches

  const sendBatch = async (batch: typeof contacts) => {
    for (const contact of batch) {
      try {
        const locale: 'en' | 'pt' = contact.language === 'pt' ? 'pt' : 'en';
        const unsubscribeUrl = `${BASE_URL}/unsubscribe?email=${encodeURIComponent(contact.email)}`;
        const recipientName = contact.firstName || (locale === 'pt' ? 'Leitor' : 'Reader');
        const rendered = await renderTemplate('ARTICLE_NEWSLETTER', buildVariables(article, locale, recipientName, unsubscribeUrl, contact.id));
        if (!rendered) continue;
        await sendEmail({ to: contact.email, subject: rendered.subject, html: rendered.html });
      } catch (err) {
        console.error(`[article-newsletter] failed for ${contact.email}:`, err);
      }
    }
  };

  for (let i = 0; i < contacts.length; i += BATCH) {
    const batch = contacts.slice(i, i + BATCH);
    if (i === 0) {
      await sendBatch(batch);
    } else {
      setTimeout(() => sendBatch(batch), (i / BATCH) * DELAY_MS);
    }
  }

  console.log(`[article-newsletter] queued for article "${article.title}" to ${contacts.length} contacts`);
  return { queued: contacts.length };
}
