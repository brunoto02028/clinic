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

// Default cover / author photo — set once, only while unset. Never
// overwrites values changed via the admin panel (/admin/marketing/book).
const DEFAULT_COVER_IMAGE = '/images/book/beyond-pain-cover.webp';
// Same headshot used on the homepage "About Bruno" section (ImageLibrary row).
const DEFAULT_AUTHOR_PHOTO = '/api/image-serve/cmqc5v4d40005ok01uxfk2u4w';
// Short bio — landing-page card (see BPR "Beyond Pain — Landing Page Copy", §4 SHORT).
const DEFAULT_AUTHOR_BIO = [
  `Bruno writes about pain from the inside — and not only the kind you can point to on a scan. A former professional footballer, he has lived with physical pain since the age of seventeen, through multiple knee operations and the arthritis they left behind. But he also knows the other pains: losing everything and starting again, being broken and being deceived, and the slow work of being restored and healed on the inside. He came through all of it — and it is the reason this book exists.`,
  `That long road led him into rehabilitation, and into decades of study across the fields that touch pain, always asking the question he once needed answered himself: how do you truly help a person heal — not just manage a symptom? For more than seventeen years, alongside his clinical work, he has walked with people through the quieter kinds of suffering too — counselling individuals and couples, through marriages and through crises, across several countries, with people of faith and of none.`,
  `"I don't write as someone observing pain from a distance. I write as someone who has been through it — in the body and in the soul — and came out the other side. My purpose is simple: to treat every person the way I wish I'd been treated during my own recovery — with real attention, not just protocol."`,
].join('\n\n');

async function seedBookConfig() {
  const existing = await prisma.bookConfig.findFirst();
  if (!existing) {
    await prisma.bookConfig.create({ data: { coverImage: DEFAULT_COVER_IMAGE, authorPhoto: DEFAULT_AUTHOR_PHOTO, authorBio: DEFAULT_AUTHOR_BIO } });
    console.log('[seed-book-content] Created default BookConfig row with cover + author photo + bio.');
    return;
  }
  const data = {};
  if (!existing.coverImage) data.coverImage = DEFAULT_COVER_IMAGE;
  if (!existing.authorPhoto) data.authorPhoto = DEFAULT_AUTHOR_PHOTO;
  if (!existing.authorBio) data.authorBio = DEFAULT_AUTHOR_BIO;
  if (Object.keys(data).length > 0) {
    await prisma.bookConfig.update({ where: { id: existing.id }, data });
    console.log('[seed-book-content] Set default field(s) on existing BookConfig row:', Object.keys(data).join(', '));
  }
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
