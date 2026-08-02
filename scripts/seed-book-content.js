// One-off, idempotent seed: creates the default BookConfig row and imports
// the "Beyond Pain" book chapters from book/*.md into BookChapter (see
// book/BPR_Devin_Spec_Beyond_Pain_Book.md). Run automatically on every
// deploy via start.sh — skips chapters that already exist (matched by
// slug) and never overwrites admin edits, so it's safe to re-run.
const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const BOOK_DIR = path.join(__dirname, '..', 'book');

const CHAPTERS = [
  { file: 'Beyond_Pain_Chapter_1_EN.md', slug: 'chapter-one', order: 1, isFree: true },
];

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
    else if (line.startsWith('> ')) {
      const parts = [];
      while (i < lines.length && lines[i].startsWith('> ')) { parts.push(lines[i].slice(2).trim()); i++; }
      blocks.push(`<blockquote>\n<p>${inlineHtml(parts.join(' '))}</p>\n</blockquote>`);
    } else if (line.startsWith('- ')) {
      const items = [];
      while (i < lines.length && lines[i].startsWith('- ')) { items.push(`  <li>${inlineHtml(lines[i].slice(2).trim())}</li>`); i++; }
      blocks.push(`<ul>\n${items.join('\n')}\n</ul>`);
    } else {
      const para = [line.trim()];
      i++;
      while (i < lines.length && lines[i].trim() !== '' && !/^#{2,4} /.test(lines[i]) && !/^> /.test(lines[i]) && !/^- /.test(lines[i])) {
        para.push(lines[i].trim());
        i++;
      }
      blocks.push(`<p>${inlineHtml(para.join(' '))}</p>`);
    }
  }
  return blocks.join('\n\n');
}

// Splits the source markdown into [titleBlock, chapterBody, footerBlock] on
// the `\n---\n` horizontal rules the book chapters are formatted with, and
// extracts the chapter title from its leading "## Chapter N — Title" line.
function parseChapter(markdown) {
  const sections = markdown.split(/\n---\n/).map((s) => s.trim());
  const body = sections[1] || sections[0];
  const bodyLines = body.split(/\r?\n/);
  let titleEn = 'Untitled chapter';
  let startIdx = 0;
  const headingMatch = bodyLines[0]?.match(/^##\s+(?:Chapter\s+\w+\s+—\s+)?(.+)$/i);
  if (headingMatch) {
    titleEn = bodyLines[0].replace(/^##\s+/, '').replace(/^Chapter\s+\w+\s+—\s+/i, '').trim() || headingMatch[1].trim();
    startIdx = 1;
  }
  const contentEn = markdownToHtml(bodyLines.slice(startIdx).join('\n'));
  return { titleEn, contentEn };
}

async function seedBookConfig() {
  const existing = await prisma.bookConfig.findFirst();
  if (existing) return;
  await prisma.bookConfig.create({ data: {} });
  console.log('[seed-book-content] Created default BookConfig row.');
}

async function seedChapters() {
  let created = 0;
  for (const c of CHAPTERS) {
    const filePath = path.join(BOOK_DIR, c.file);
    if (!fs.existsSync(filePath)) {
      console.warn(`[seed-book-content] Missing ${c.file} — skipping.`);
      continue;
    }
    const existing = await prisma.bookChapter.findUnique({ where: { slug: c.slug } });
    if (existing) continue; // never overwrite — admin may have edited it

    const markdown = fs.readFileSync(filePath, 'utf8');
    const { titleEn, contentEn } = parseChapter(markdown);
    await prisma.bookChapter.create({
      data: { slug: c.slug, order: c.order, isFree: c.isFree, titleEn, contentEn },
    });
    created++;
  }
  if (created) console.log(`[seed-book-content] Created ${created} book chapter(s).`);
}

async function main() {
  try {
    await seedBookConfig();
    await seedChapters();
  } catch (err) {
    console.error('[seed-book-content] Error:', err.message);
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) main();

module.exports = { parseChapter, markdownToHtml };
