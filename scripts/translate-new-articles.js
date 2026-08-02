// One-off script: populate titleEn/excerptEn/contentEn (mirror of existing EN content)
// and titlePt/excerptPt/contentPt (AI-translated, European Portuguese) for the 10
// draft articles created in this session. Run with: node scripts/translate-new-articles.js
const { PrismaClient } = require('@prisma/client');

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

const SLUGS = [
  'patellar-tendinopathy-jumpers-knee',
  'plantar-fasciitis-first-steps-hurt',
  'proximal-hamstring-tendinopathy-buttock-pain',
  'frozen-shoulder-stages-treatment',
  'whiplash-active-recovery-when-to-worry',
  'snapping-hip-syndrome-coxa-saltans',
  'chronic-low-back-pain-evidence-based-recovery',
  'runners-knee-itb-syndrome',
  'greater-trochanteric-pain-syndrome-gtps',
  'carpal-tunnel-syndrome-numb-hand-at-night',
];

async function translateToPortuguese(title, excerpt, contentHtml) {
  const prompt = `You are a professional medical/clinical translator, translating for a UK physiotherapy clinic website (bpr.rehab) whose Portuguese-speaking audience expects European Portuguese (Portugal), informal "tu" register, matching an established house style (natural, warm, clinically accurate, not machine-sounding).

Translate the following article's TITLE, EXCERPT, and CONTENT (HTML) into European Portuguese. Rules:
- Preserve ALL HTML tags exactly (h2, p, strong, em, ul, li, mdash entities like &mdash; &ndash; &ldquo; &rdquo;) — only translate the text content, not the tags.
- Keep author/clinic references ("BPR", "bpr.rehab") unchanged.
- Keep academic references (author names, journal names, years) in the References section UNCHANGED (do not translate citations).
- Use natural, fluent European Portuguese as used in Portugal, not Brazilian Portuguese.
- Do not add or remove any sections.
- Return your answer using EXACTLY this plain-text format, with no markdown fences and no extra commentary before or after:

###TITLE###
<translated title here>
###EXCERPT###
<translated excerpt here>
###CONTENT###
<translated content HTML here>
###END###

TITLE:
${title}

EXCERPT:
${excerpt}

CONTENT:
${contentHtml}`;

  const response = await fetch(OPENROUTER_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
      'HTTP-Referer': 'https://bpr.rehab',
      'X-Title': 'BPR Clinic Article Translation',
    },
    body: JSON.stringify({
      model: 'anthropic/claude-sonnet-5',
      max_tokens: 24000,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`OpenRouter error: ${response.status} ${err.slice(0, 300)}`);
  }

  const data = await response.json();
  const text = data.choices?.[0]?.message?.content;
  if (!text) throw new Error('No content in OpenRouter response: ' + JSON.stringify(data).slice(0, 300));

  const titleMatch = text.match(/###TITLE###\s*([\s\S]*?)\s*###EXCERPT###/);
  const excerptMatch = text.match(/###EXCERPT###\s*([\s\S]*?)\s*###CONTENT###/);
  let contentMatch = text.match(/###CONTENT###\s*([\s\S]*?)\s*###END###/);
  if (!contentMatch) {
    // Model may have been cut off (hit max_tokens) before emitting ###END###.
    contentMatch = text.match(/###CONTENT###\s*([\s\S]*)$/);
  }

  if (!titleMatch || !excerptMatch || !contentMatch) {
    throw new Error('Could not parse delimited response: ' + text.slice(0, 300));
  }
  if (!/###END###\s*$/.test(text.trim())) {
    throw new Error('Response truncated (no ###END### marker) — retrying');
  }

  return {
    titlePt: titleMatch[1].trim(),
    excerptPt: excerptMatch[1].trim(),
    contentPt: contentMatch[1].trim(),
  };
}

async function withRetry(fn, retries = 5, delayMs = 1500) {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (err) {
      if (i === retries - 1) throw err;
      console.log(`  (retrying after error: ${err.message.split('\n')[0]})`);
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }
}

async function main() {
  const prisma = new PrismaClient();
  for (const slug of SLUGS) {
    const article = await withRetry(() => prisma.article.findUnique({ where: { slug } }));
    if (!article) {
      console.log(`SKIP (not found): ${slug}`);
      continue;
    }
    if (article.titlePt && article.contentPt) {
      console.log(`SKIP (already translated): ${slug}`);
      continue;
    }
    console.log(`\n=== ${slug} ===`);
    console.log('Translating to Portuguese...');
    try {
      const { titlePt, excerptPt, contentPt } = await withRetry(
        () => translateToPortuguese(article.title, article.excerpt, article.content),
        3,
        3000
      );
      await withRetry(() => prisma.article.update({
        where: { slug },
        data: {
          titleEn: article.title,
          excerptEn: article.excerpt,
          contentEn: article.content,
          titlePt,
          excerptPt,
          contentPt,
        },
      }));
      console.log(`OK — titlePt: ${titlePt}`);
    } catch (err) {
      console.error(`FAILED: ${slug} —`, err.message);
    }
  }
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
