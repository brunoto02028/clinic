// One-off, idempotent import of the article content recovered onto this
// machine after the VPS was reinstalled and the database wiped (source:
// recovered-content/articles/ — see that commit for the full story). Run
// automatically on every deploy via start.sh — skips slugs that already
// exist (never overwrites admin edits) and no-ops safely if no admin user
// exists yet to attribute authorship to.
//
// Imported as DRAFTS (published: false) on purpose — Bruno picks/confirms
// the right photo per article before publishing each one.
const fs = require('fs');
const path = require('path');
const matter = require('gray-matter');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const ARTICLES_DIR = path.join(__dirname, '..', 'recovered-content', 'articles');

// slug -> tags. Matches condition names used elsewhere (see
// lib/book-cta-config.ts BOOK_CTA_TAGS, app/conditions pages).
const TAG_MAP = {
  'knee-cartilage': ['Knee'],
  meniscus: ['Knee'],
  ankle: ['Ankle'],
  prevention: ['Recovery Science'],
  'back-pain': ['Back Pain'],
  sciatica: ['Sciatica'],
  hrv: ['Recovery Science'],
  photobiomodulation: ['Recovery Science'],
  sleep: ['Sleep'],
  'knee-osteoarthritis': ['Knee', 'Osteoarthritis'],
  'patellofemoral-pain': ['Knee'],
  'neck-pain-tech-neck': ['Neck'],
  'rotator-cuff-shoulder-pain': ['Shoulder'],
  'achilles-tendinopathy': ['Ankle', 'Tendinopathy'],
  'shin-splints': ['Ankle'],
  'greater-trochanteric-pain-gtps': ['Hip'],
  'tennis-elbow': ['Elbow', 'Tendinopathy'],
  'carpal-tunnel-syndrome': ['Wrist'],
  'cervicogenic-headache': ['Neck'],
  'hip-osteoarthritis': ['Hip', 'Osteoarthritis'],
  'cervical-radiculopathy': ['Neck'],
  'tendinopathy-explained': ['Tendinopathy'],
  'persistent-pain-explained': ['Chronic Pain', 'Pain'],
  'return-to-running-after-injury': ['Recovery Science'],
};

function escapeHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function inlineHtml(text) {
  let out = escapeHtml(text);
  out = out.replace(/\*\*([^*]+?)\*\*/g, '<strong>$1</strong>');
  out = out.replace(/\*([^*]+?)\*/g, '<em>$1</em>');
  out = out.replace(/\[([^\]]+?)\]\(([^)]+?)\)/g, '<a href="$2">$1</a>');
  return out;
}

function markdownToHtml(md) {
  const lines = md.split(/\r?\n/);
  const blocks = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (line.trim() === '') { i++; continue; }
    if (line.startsWith('#### ')) { blocks.push(`<h4>${inlineHtml(line.slice(5).trim())}</h4>`); i++; }
    else if (line.startsWith('### ')) { blocks.push(`<h3>${inlineHtml(line.slice(4).trim())}</h3>`); i++; }
    else if (line.startsWith('## ')) { blocks.push(`<h2>${inlineHtml(line.slice(3).trim())}</h2>`); i++; }
    else if (line.startsWith('# ')) { i++; } // skip H1 — duplicated as the article title
    else if (line.startsWith('> ')) {
      const parts = [];
      while (i < lines.length && lines[i].startsWith('> ')) { parts.push(lines[i].slice(2).trim()); i++; }
      blocks.push(`<blockquote>\n<p>${parts.map(inlineHtml).join('<br>\n')}</p>\n</blockquote>`);
    } else if (line.startsWith('- ') || line.startsWith('* ')) {
      const items = [];
      while (i < lines.length && (lines[i].startsWith('- ') || lines[i].startsWith('* '))) { items.push(`  <li>${inlineHtml(lines[i].slice(2).trim())}</li>`); i++; }
      blocks.push(`<ul>\n${items.join('\n')}\n</ul>`);
    } else if (/^\d+\.\s/.test(line)) {
      const items = [];
      while (i < lines.length && /^\d+\.\s/.test(lines[i])) { items.push(`  <li>${inlineHtml(lines[i].replace(/^\d+\.\s/, '').trim())}</li>`); i++; }
      blocks.push(`<ol>\n${items.join('\n')}\n</ol>`);
    } else {
      const para = [line.trim()];
      i++;
      while (i < lines.length && lines[i].trim() !== '' && !/^#{1,4} /.test(lines[i]) && !/^> /.test(lines[i]) && !/^[-*] /.test(lines[i]) && !/^\d+\.\s/.test(lines[i])) {
        para.push(lines[i].trim());
        i++;
      }
      blocks.push(`<p>${inlineHtml(para.join(' '))}</p>`);
    }
  }
  return blocks.join('\n\n');
}

function slugify(str) {
  return str.toLowerCase().trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

function parseArticle(filePath) {
  const raw = fs.readFileSync(filePath, 'utf8');
  const { data, content } = matter(raw);
  const filename = path.basename(filePath, '.md');

  let title = data.title;
  const body = content;

  if (!title) {
    // No frontmatter (articles 01-09) — title is the first H1 line
    const h1Match = body.match(/^#\s+(?:\d+\.\s*)?(.+)$/m);
    title = h1Match ? h1Match[1].trim() : filename;
  }

  const slug = data.slug || slugify(filename.replace(/^\d+-/, ''));
  const excerpt = (data.description || body.replace(/[#>*_`]/g, '').trim().split('\n')[0]).slice(0, 300);
  const contentHtml = markdownToHtml(body);

  // Only articles 01-09 shipped with a same-named PNG that's actually been
  // copied into public/images/articles — the rest (20-34) reference an
  // `image:` filename we don't have locally; Bruno adds the right photo
  // per article himself (see commit message / conversation).
  const imageFile = `${filename}.png`;
  const hasImage = fs.existsSync(path.join(__dirname, '..', 'public', 'images', 'articles', imageFile));

  return { title, slug, excerpt, contentHtml, tags: TAG_MAP[slug] || [], imageUrl: hasImage ? `/images/articles/${imageFile}` : null };
}

async function main() {
  const author = await prisma.user.findFirst({
    where: { role: { in: ['SUPERADMIN', 'ADMIN'] } },
    orderBy: { createdAt: 'asc' },
  });
  if (!author) {
    console.warn('[seed-recovered-articles] No admin user exists yet — skipping. Will retry on the next deploy once one exists.');
    return;
  }

  const files = fs.readdirSync(ARTICLES_DIR).filter((f) => f.endsWith('.md'));
  let created = 0;
  for (const file of files) {
    const { title, slug, excerpt, contentHtml, tags, imageUrl } = parseArticle(path.join(ARTICLES_DIR, file));
    const existing = await prisma.article.findUnique({ where: { slug } });
    if (existing) continue; // never overwrite — admin may have edited it

    await prisma.article.create({
      data: {
        title,
        slug,
        excerpt,
        content: contentHtml,
        titleEn: title,
        excerptEn: excerpt,
        contentEn: contentHtml,
        publishLanguage: 'en',
        language: 'en',
        imageUrl,
        published: false, // draft — Bruno reviews + sets the right photo before publishing
        authorId: author.id,
        tags,
      },
    });
    created++;
  }
  if (created) console.log(`[seed-recovered-articles] Created ${created} draft article(s) — review and publish from /admin/articles.`);
}

main()
  .catch((err) => console.error('[seed-recovered-articles] Error:', err.message))
  .finally(() => prisma.$disconnect());
