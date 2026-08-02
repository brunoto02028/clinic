// One-off script: import study-centre .md articles from BPR_Content_v2/Articles_markdown
// into Prisma as draft articles, with Brazilian Portuguese (pt-BR) translations.
// Run with: node scripts/import-study-centre-articles.js
require('dotenv').config();
const fs = require('fs').promises;
const path = require('path');
const matter = require('gray-matter');
const { PrismaClient } = require('@prisma/client');

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const ARTICLES_DIR = path.join(__dirname, '..', 'BPR_Content_v2', 'Articles_markdown');

const TAG_MAP = {
  'knee-osteoarthritis': ['Knee', 'Osteoarthritis'],
  'patellofemoral-pain': ['Knee'],
  'neck-pain-tech-neck': ['Neck'],
  'rotator-cuff-shoulder-pain': ['Shoulder'],
  'achilles-tendinopathy': ['Ankle'],
};

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function inlineHtml(text) {
  let out = escapeHtml(text);
  out = out.replace(/\*\*([^*]+?)\*\*/g, '<strong>$1</strong>');
  out = out.replace(/\*([^*]+?)\*/g, '<em>$1</em>');
  out = out.replace(/_([^_]+?)_/g, '<em>$1</em>');
  out = out.replace(/\[([^\]]+?)\]\(([^)]+?)\)/g, '<a href="$2">$1</a>');
  return out;
}

function markdownToHtml(md) {
  const lines = md.split(/\r?\n/);
  const blocks = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (line === '') { i++; continue; }
    if (line.startsWith('# ')) {
      // Skip the H1 title; it is duplicated from the frontmatter title.
      i++;
      continue;
    }
    if (line.startsWith('## ')) {
      blocks.push(`<h2>${inlineHtml(line.slice(3).trim())}</h2>`);
      i++;
    } else if (line.startsWith('> ')) {
      const parts = [];
      while (i < lines.length && lines[i].startsWith('> ')) {
        parts.push(lines[i].slice(2).trim());
        i++;
      }
      blocks.push(`<blockquote>\n<p>${inlineHtml(parts.join(' '))}</p>\n</blockquote>`);
    } else if (line.startsWith('- ')) {
      const items = [];
      while (i < lines.length && lines[i].startsWith('- ')) {
        items.push(`  <li>${inlineHtml(lines[i].slice(2).trim())}</li>`);
        i++;
      }
      blocks.push(`<ul>\n${items.join('\n')}\n</ul>`);
    } else {
      const para = [line.trim()];
      i++;
      while (i < lines.length && lines[i] !== '' && !/^#{1,2} /.test(lines[i]) && !/^> /.test(lines[i]) && !/^- /.test(lines[i])) {
        para.push(lines[i].trim());
        i++;
      }
      blocks.push(`<p>${inlineHtml(para.join(' '))}</p>`);
    }
  }
  return blocks.join('\n\n');
}

async function translateToPtBr(title, excerpt, contentHtml) {
  const prompt = `You are a professional medical/clinical translator, translating for a UK physiotherapy clinic website (bpr.rehab) whose Portuguese-speaking audience expects **Brazilian Portuguese (not European Portuguese)**. Use a natural, warm, clinically accurate "você" register (e.g. "o seu joelho", "você pode"). Do NOT use European Portuguese ("tu" or Portugal-only terms like "anca").

Translate the following article's TITLE, EXCERPT, and CONTENT (HTML) into Brazilian Portuguese. Rules:
- Preserve ALL HTML tags exactly (h2, p, strong, em, ul, li, a, blockquote) — only translate the text content, not the tags.
- Keep author/clinic references ("BPR", "bpr.rehab") unchanged.
- Keep academic references (author names, journal names, years) in the References section UNCHANGED (do not translate citations).
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

async function withRetry(fn, retries = 5, delayMs = 2000) {
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

async function findAuthor(prisma) {
  const user = await prisma.user.findFirst({
    where: { role: { in: ['SUPERADMIN', 'ADMIN'] } },
    orderBy: { createdAt: 'asc' },
  });
  if (!user) throw new Error('No SUPERADMIN or ADMIN user found in database');
  return user;
}

async function main() {
  if (!OPENROUTER_API_KEY) throw new Error('OPENROUTER_API_KEY not set');
  const prisma = new PrismaClient();

  const author = await findAuthor(prisma);
  console.log(`Using author: ${author.firstName} ${author.lastName} (${author.id})`);

  const files = (await fs.readdir(ARTICLES_DIR)).filter(f => f.endsWith('.md'));
  files.sort();

  for (const file of files) {
    const filePath = path.join(ARTICLES_DIR, file);
    const raw = await fs.readFile(filePath, 'utf-8');
    const { data, content: markdown } = matter(raw);

    const slug = data.slug || file.replace(/\.md$/, '');
    const title = data.title;
    const excerpt = data.description;
    const contentHtml = markdownToHtml(markdown.trim());
    const tags = TAG_MAP[slug] || ['Injury Prevention'];

    const existing = await prisma.article.findUnique({ where: { slug } });
    if (existing) {
      console.log(`SKIP (already exists): ${slug}`);
      continue;
    }

    console.log(`\n=== ${slug} ===`);
    console.log('Translating to Brazilian Portuguese...');
    const { titlePt, excerptPt, contentPt } = await withRetry(
      () => translateToPtBr(title, excerpt, contentHtml),
      3,
      3000
    );

    await withRetry(() => prisma.article.create({
      data: {
        title,
        excerpt,
        content: contentHtml,
        titleEn: title,
        excerptEn: excerpt,
        contentEn: contentHtml,
        titlePt,
        excerptPt,
        contentPt,
        slug,
        authorId: author.id,
        authorName: 'BPR Clinical Team',
        metaDescription: excerpt,
        tags,
        imageUrl: null,
        published: false,
        publishLanguage: 'en',
        language: 'en',
        generatedBy: 'IMPORT',
      },
    }));
    console.log(`OK — created: ${slug}`);
  }

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
