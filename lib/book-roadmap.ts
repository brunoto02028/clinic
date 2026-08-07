// lib/book-roadmap.ts
// Static "table of contents" for the full Beyond Pain book — 12 chapters
// across 4 parts, bilingual (EN/PT). Only Chapter One is actually written
// and published (see lib/book.ts getPublishedChapters / BookChapter); the
// rest is shown here purely as a roadmap to build curiosity for readers who
// receive the Chapter One PDF. Update titles/teasers here as new chapters
// are drafted — this file does not touch the database.
export interface RoadmapChapter {
  number: number;
  slug?: string; // set once a chapter is actually published in BookChapter
  titleEn: string;
  titlePt: string;
  teaserEn: string;
  teaserPt: string;
}

export interface RoadmapPart {
  partEn: string;
  partPt: string;
  chapters: RoadmapChapter[];
}

export const BOOK_ROADMAP: RoadmapPart[] = [
  {
    partEn: "Part One — The Body",
    partPt: "Parte Um — O Corpo",
    chapters: [
      {
        number: 1,
        slug: "chapter-one",
        titleEn: "Pain From the Inside",
        titlePt: "A Dor por Dentro",
        teaserEn: "Why the same nail can leave one man in agony and another unharmed, and what that reveals about every pain you've felt.",
        teaserPt: "Por que o mesmo prego pode deixar um homem em agonia e outro ileso, e o que isso revela sobre cada dor que você já sentiu.",
      },
      {
        number: 2,
        titleEn: "When the Alarm Won't Switch Off",
        titlePt: "Quando o Alarme Não Desliga",
        teaserEn: "How pain that has outlived its injury takes on a life of its own, and how a brain that learned to hurt can be taught to stop.",
        teaserPt: "Como uma dor que sobreviveu à lesão ganha vida própria, e como um cérebro que aprendeu a doer pode reaprender a parar.",
      },
      {
        number: 3,
        titleEn: "The Body as a Temple",
        titlePt: "O Corpo Como Templo",
        teaserEn: "Why rest was the wrong prescription all along, and the discovery that you are far more than a body.",
        teaserPt: "Por que o repouso era a receita errada o tempo todo, e a descoberta de que você é muito mais do que um corpo.",
      },
    ],
  },
  {
    partEn: "Part Two — The Soul",
    partPt: "Parte Dois — A Alma",
    chapters: [
      {
        number: 4,
        titleEn: "The Body Keeps What the Soul Carries",
        titlePt: "O Corpo Guarda o Que a Alma Carrega",
        teaserEn: "A heartbreak that can physically change the shape of your heart, and the four hidden ways the soul settles into the flesh.",
        teaserPt: "Uma dor emocional capaz de mudar fisicamente o formato do seu coração, e as quatro vias ocultas por onde a alma se instala na carne.",
      },
      {
        number: 5,
        titleEn: "The Accelerated World",
        titlePt: "O Mundo Acelerado",
        teaserEn: "Worn-out waiting-room chairs, a 1929 advertising trick, and why the phone in your pocket keeps your nervous system on permanent alert.",
        teaserPt: "Cadeiras gastas numa sala de espera, um truque de propaganda de 1929, e por que o celular no seu bolso mantém o sistema nervoso em alerta.",
      },
      {
        number: 6,
        titleEn: "Renewing the Mind",
        titlePt: "Renovar a Mente",
        teaserEn: "London taxi drivers grew part of their brains by memorising streets, and what that means for a mind trapped in pain.",
        teaserPt: "Taxistas de Londres fizeram parte do cérebro crescer só de memorizar ruas, e o que isso significa para uma mente presa na dor.",
      },
      {
        number: 7,
        titleEn: "Forgiveness, Gratitude and Belonging",
        titlePt: "Perdão, Gratidão e Vínculo",
        teaserEn: "Why resentment raises your blood pressure, gratitude eases your body, and loneliness can be as deadly as smoking.",
        teaserPt: "Por que o rancor eleva a sua pressão, a gratidão alivia o corpo, e a solidão pode ser tão mortal quanto o cigarro.",
      },
    ],
  },
  {
    partEn: "Part Three — The Spirit",
    partPt: "Parte Três — O Espírito",
    chapters: [
      {
        number: 8,
        titleEn: "The Spirit That Was Dead",
        titlePt: "O Espírito Que Estava Morto",
        teaserEn: "The emptiness no achievement can fill, and why it may be the most hopeful thing this book has to say.",
        teaserPt: "O vazio que nenhuma conquista preenche, e por que ele pode ser a coisa mais esperançosa deste livro.",
      },
      {
        number: 9,
        titleEn: "The New Birth",
        titlePt: "O Novo Nascimento",
        teaserEn: "The turning point of the whole story: how the deepest part of a person can come back to life, for good.",
        teaserPt: "A virada de toda a história: como a parte mais profunda de uma pessoa pode voltar a viver, definitivamente.",
      },
      {
        number: 10,
        titleEn: "Faith, Meaning and Hope",
        titlePt: "Fé, Sentido e Esperança",
        teaserEn: "\"Your faith has healed you\", told honestly, without the two errors that wound the people who suffer most.",
        teaserPt: "\"A tua fé te curou\", dito com honestidade, sem os dois erros que ferem justamente quem mais sofre.",
      },
    ],
  },
  {
    partEn: "Part Four — Integration",
    partPt: "Parte Quatro — A Integração",
    chapters: [
      {
        number: 11,
        titleEn: "Routines for a Whole Life",
        titlePt: "Rotinas de uma Vida Inteira",
        teaserEn: "The single number where body, soul and spirit meet, and simple daily rhythms that move it in the right direction.",
        teaserPt: "O único número onde corpo, alma e espírito se encontram, e ritmos diários simples que o movem na direção certa.",
      },
      {
        number: 12,
        titleEn: "Beyond Pain, a Purpose",
        titlePt: "Além da Dor, o Propósito",
        teaserEn: "What lies on the other side of pain, and how the very thing that hurt you most can become your gift to the world.",
        teaserPt: "O que existe do outro lado da dor, e como aquilo que mais te feriu pode se tornar o seu presente para o mundo.",
      },
    ],
  },
];

export const BOOK_ROADMAP_FLAT: RoadmapChapter[] = BOOK_ROADMAP.flatMap((p) => p.chapters);
