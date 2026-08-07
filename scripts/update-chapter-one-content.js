// One-off refresh: overwrites the existing "chapter-one" BookChapter row
// with the updated, lighter-edited full text (dedication + Opening +
// Chapter One + references + "In This Book" roadmap) from
// book/Beyond_Pain_Chapter_1_EN.md and book/Beyond_Pain_Chapter_1_PT.md.
//
// Unlike scripts/seed-book-content.js (which only creates chapters that
// don't exist yet, to avoid clobbering admin edits), this script always
// overwrites — it's meant to be run manually whenever the source markdown
// is intentionally revised. Usage: node scripts/update-chapter-one-content.js
const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const { markdownToHtml } = require('./seed-book-content');
const prisma = new PrismaClient();

const BOOK_DIR = path.join(__dirname, '..', 'book');
const SLUG = 'chapter-one';

// Everything after the first "\n---\n" (the title/subtitle block) is the
// content body — dedication, Opening, Chapter One, references and the
// "In This Book" roadmap all included, per the full markdown source.
function bodyOf(markdown) {
  const idx = markdown.indexOf('\n---\n');
  return idx === -1 ? markdown : markdown.slice(idx + 5);
}

async function main() {
  try {
    const enPath = path.join(BOOK_DIR, 'Beyond_Pain_Chapter_1_EN.md');
    const ptPath = path.join(BOOK_DIR, 'Beyond_Pain_Chapter_1_PT.md');
    const enMd = fs.readFileSync(enPath, 'utf8');
    const ptMd = fs.readFileSync(ptPath, 'utf8');

    const contentEn = markdownToHtml(bodyOf(enMd));
    const contentPt = markdownToHtml(bodyOf(ptMd));

    const existing = await prisma.bookChapter.findUnique({ where: { slug: SLUG } });
    if (!existing) {
      console.error(`[update-chapter-one-content] No BookChapter with slug "${SLUG}" found — run scripts/seed-book-content.js first.`);
      process.exitCode = 1;
      return;
    }

    await prisma.bookChapter.update({
      where: { slug: SLUG },
      data: {
        titleEn: 'Pain From the Inside',
        titlePt: 'A dor por dentro',
        contentEn,
        contentPt,
      },
    });
    console.log(`[update-chapter-one-content] Updated "${SLUG}" — EN ${contentEn.length} chars, PT ${contentPt.length} chars.`);
  } catch (err) {
    console.error('[update-chapter-one-content] Error:', err.message);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

main();
