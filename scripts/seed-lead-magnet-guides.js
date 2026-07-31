// One-off, idempotent seed: generates the 5 initial lead-magnet PDF guides
// (BPR_Devin_Spec_Website_Improvements.md, Priority 3) and upserts them into
// LeadMagnetGuide. Run automatically on every deploy via start.sh — skips
// guides that already exist (matched by slug), so it's safe to re-run.
//
// PDFs are generated with jsPDF (already a project dependency, used
// elsewhere for admin report exports) and stored as base64 in the DB —
// same pattern as ImageLibrary/image-serve, no S3/Supabase dependency.
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const BRAND_PRIMARY = [79, 115, 97];      // #4F7361
const BRAND_PRIMARY_DARK = [59, 90, 73];  // #3B5A49
const BRAND_INK = [32, 36, 45];           // #20242D
const BRAND_MUTED = [100, 116, 139];

const GUIDES = [
  {
    slug: 'return-to-running',
    cluster: 'running',
    titleEn: 'Return to Running — A Graded Plan',
    titlePt: 'Retorno à Corrida — Um Plano Progressivo',
    en: {
      subtitle: 'A safe, evidence-based path back to running after injury or a long break',
      intro: 'Coming back to running too fast is the single biggest cause of repeat injuries. This guide gives you a simple, graded framework to rebuild your running safely — whether you\'re returning after an injury, a long break, or starting for the first time.',
      sections: [
        {
          heading: 'The 10% Rule (and why it\'s a starting point, not a law)',
          body: [
            'Increase your weekly running volume by no more than 10% from one week to the next. This isn\'t a strict scientific law, but it\'s a sensible ceiling that prevents the sudden spikes in load that cause most overuse injuries.',
            'If a week feels hard, repeat it before progressing — don\'t just follow the calendar.',
          ],
        },
        {
          heading: 'Run-Walk Before Run-Run',
          body: [
            'If you\'re returning after 4+ weeks off, start with run-walk intervals (e.g. 1 minute running, 2 minutes walking, repeated for 20-30 minutes) for the first 1-2 weeks before moving to continuous running.',
            'This lets your tendons and bones adapt gradually — they take longer to strengthen than your cardiovascular fitness returns.',
          ],
        },
        {
          heading: 'The Traffic Light Rule for Pain',
          body: [
            'Green (0-3/10 pain that doesn\'t worsen during the run): keep going.',
            'Amber (4-5/10 that settles within 24h): reduce volume slightly next session.',
            'Red (pain over 5/10, or that lingers more than 24h, or changes how you move): stop and get assessed before continuing to load it.',
          ],
        },
        {
          heading: 'Strength Work Isn\'t Optional',
          body: [
            'Two sessions a week of calf raises, single-leg squats and hip strengthening (glute bridges, side-lying leg raises) meaningfully reduces injury risk — the evidence for this is strong across running injury research.',
            'Runners who only run, and never strengthen, are the group we see re-injuring most often.',
          ],
        },
      ],
      cta: 'Struggling with a specific pain that\'s stopping you running? Book a biomechanical assessment with BPR — we\'ll find the actual cause, not just treat the symptom.',
    },
    pt: {
      subtitle: 'Um caminho seguro e baseado em evidências para voltar a correr após uma lesão ou pausa longa',
      intro: 'Voltar a correr rápido demais é a maior causa de lesões recorrentes. Este guia oferece uma estrutura simples e progressiva para reconstruir sua corrida com segurança — seja depois de uma lesão, uma pausa longa, ou começando pela primeira vez.',
      sections: [
        {
          heading: 'A Regra dos 10% (um ponto de partida, não uma lei)',
          body: [
            'Aumente o volume semanal de corrida em no máximo 10% de uma semana para a outra. Isso não é uma lei científica rígida, mas é um teto sensato que evita os picos súbitos de carga que causam a maioria das lesões por sobrecarga.',
            'Se uma semana parecer difícil, repita-a antes de progredir — não siga apenas o calendário.',
          ],
        },
        {
          heading: 'Caminhar-Correr Antes de Correr Contínuo',
          body: [
            'Se está voltando depois de 4+ semanas parado, comece com intervalos de corrida-caminhada (ex: 1 minuto correndo, 2 minutos caminhando, repetido por 20-30 minutos) nas primeiras 1-2 semanas antes de passar para corrida contínua.',
            'Isso permite que seus tendões e ossos se adaptem gradualmente — eles levam mais tempo para fortalecer do que sua condição cardiovascular leva para voltar.',
          ],
        },
        {
          heading: 'A Regra do Semáforo para a Dor',
          body: [
            'Verde (0-3/10, sem piorar durante a corrida): continue.',
            'Amarelo (4-5/10 que melhora em 24h): reduza um pouco o volume na próxima sessão.',
            'Vermelho (dor acima de 5/10, que persiste mais de 24h, ou que muda a forma como você se move): pare e procure uma avaliação antes de continuar a carregar.',
          ],
        },
        {
          heading: 'Trabalho de Força Não é Opcional',
          body: [
            'Duas sessões por semana de elevação de panturrilha, agachamento unilateral e fortalecimento de quadril (ponte de glúteo, elevação lateral de perna) reduz significativamente o risco de lesão — a evidência disso é forte em toda a pesquisa sobre lesões de corrida.',
            'Corredores que só correm, e nunca fortalecem, são o grupo que mais vemos se lesionar novamente.',
          ],
        },
      ],
      cta: 'Com uma dor específica que está te impedindo de correr? Agende uma avaliação biomecânica com a BPR — vamos encontrar a causa real, não só tratar o sintoma.',
    },
  },
  {
    slug: 'desk-setup-neck-pain',
    cluster: 'neck',
    titleEn: 'Desk Setup & Neck Pain — A Quick-Start Guide',
    titlePt: 'Ergonomia da Mesa e Dor no Pescoço — Guia Rápido',
    en: {
      subtitle: 'Practical fixes for the desk habits driving your "tech neck"',
      intro: 'Neck pain from desk and screen use is rarely about one bad posture moment — it\'s about staying in any single position for too long. This guide covers the highest-impact, lowest-effort changes you can make today.',
      sections: [
        {
          heading: 'Screen Height: Eyes, Not Chin',
          body: [
            'The top third of your screen should be at eye level. If you\'re looking down at a laptop, raise it on a stand and use an external keyboard — this single change removes a huge amount of sustained neck flexion.',
          ],
        },
        {
          heading: 'The 30-30 Rule',
          body: [
            'Every 30 minutes, move for at least 30 seconds — stand, walk to get water, do a few shoulder rolls. Static posture (even a "good" one) held for hours is the real driver of pain, not any single position.',
          ],
        },
        {
          heading: 'Chin Tucks — Your 30-Second Daily Habit',
          body: [
            'Gently draw your chin straight back (like making a double chin) and hold 3-5 seconds, 10 reps, a few times a day. This re-trains the deep neck flexors that switch off during long forward-head postures.',
          ],
        },
        {
          heading: 'Phone Habits Matter Too',
          body: [
            'Bring your phone up to eye level rather than tilting your head down repeatedly through the day — "text neck" from phone use adds up just as much as desk time.',
          ],
        },
      ],
      cta: 'If your neck pain isn\'t settling with these changes, it may need hands-on treatment and a tailored exercise plan — book an assessment with BPR.',
    },
    pt: {
      subtitle: 'Ajustes práticos para os hábitos de mesa que causam a "tech neck"',
      intro: 'A dor no pescoço causada por telas raramente vem de um único momento de má postura — vem de ficar na mesma posição por tempo demais. Este guia traz as mudanças de maior impacto e menor esforço que você pode fazer hoje.',
      sections: [
        {
          heading: 'Altura da Tela: Olhos, Não Queixo',
          body: [
            'O terço superior da sua tela deve estar na altura dos olhos. Se está olhando para baixo num notebook, eleve-o num suporte e use um teclado externo — essa mudança sozinha remove uma grande carga de flexão sustentada do pescoço.',
          ],
        },
        {
          heading: 'A Regra dos 30-30',
          body: [
            'A cada 30 minutos, mova-se por pelo menos 30 segundos — levante, ande até a água, faça alguns movimentos de ombro. Postura estática (mesmo uma "boa") mantida por horas é a real causa da dor, não uma posição específica.',
          ],
        },
        {
          heading: 'Retração de Queixo — Seu Hábito Diário de 30 Segundos',
          body: [
            'Puxe suavemente o queixo para trás (como fazendo papada) e segure 3-5 segundos, 10 repetições, algumas vezes ao dia. Isso retreina os flexores profundos do pescoço que se desligam durante posturas prolongadas de cabeça projetada para frente.',
          ],
        },
        {
          heading: 'Hábitos com o Celular Também Importam',
          body: [
            'Traga o celular até a altura dos olhos em vez de inclinar a cabeça repetidamente ao longo do dia — a "text neck" do celular soma tanto quanto o tempo de mesa.',
          ],
        },
      ],
      cta: 'Se a dor no pescoço não melhorar com essas mudanças, pode precisar de tratamento prático e um plano de exercícios personalizado — agende uma avaliação com a BPR.',
    },
  },
  {
    slug: 'knee-pain-what-actually-helps',
    cluster: 'knee',
    titleEn: 'Knee Pain: What Actually Helps',
    titlePt: 'Dor no Joelho: O Que Realmente Ajuda',
    en: {
      subtitle: 'Cutting through the myths — what the evidence says works for common knee pain',
      intro: 'Knee pain is one of the most common — and most over-treated — complaints we see. This guide separates what the evidence actually supports from the myths that keep people resting when they should be moving.',
      sections: [
        {
          heading: 'Myth: "Rest Until It Stops Hurting"',
          body: [
            'For most non-traumatic knee pain (patellofemoral pain, mild osteoarthritis, tendinopathy), complete rest often makes things worse — muscles weaken, and the knee becomes less tolerant of load, not more.',
            'Modified activity — reducing the aggravating load, not eliminating all movement — is usually the better path.',
          ],
        },
        {
          heading: 'Quad and Hip Strength Is the Foundation',
          body: [
            'Weak quadriceps and hip abductors are consistently linked to patellofemoral (kneecap) pain. A structured strengthening programme — not just stretching — is the first-line, evidence-based treatment for most non-arthritic knee pain.',
          ],
        },
        {
          heading: '"Wear and Tear" Isn\'t the Whole Story',
          body: [
            'Imaging findings like mild cartilage wear are extremely common in pain-free knees too. A scan showing "arthritis" doesn\'t mean surgery is the only path — many people with the same imaging findings have no pain at all once they load and strengthen appropriately.',
          ],
        },
        {
          heading: 'When to Get It Checked',
          body: [
            'Sudden swelling, a knee that gives way or locks, or pain following a specific twisting injury are red flags worth a proper assessment — these patterns don\'t usually respond to generic exercise advice alone.',
          ],
        },
      ],
      cta: 'Not sure which category your knee pain falls into? A proper biomechanical assessment removes the guesswork — book one with BPR.',
    },
    pt: {
      subtitle: 'Desfazendo os mitos — o que a evidência diz que realmente funciona para a dor comum no joelho',
      intro: 'A dor no joelho é uma das queixas mais comuns — e mais tratadas em excesso — que vemos. Este guia separa o que a evidência realmente sustenta dos mitos que fazem as pessoas descansarem quando deveriam estar se movendo.',
      sections: [
        {
          heading: 'Mito: "Descanse Até Parar de Doer"',
          body: [
            'Para a maioria das dores não traumáticas no joelho (dor patelofemoral, artrose leve, tendinopatia), o repouso completo geralmente piora as coisas — os músculos enfraquecem, e o joelho fica menos tolerante à carga, não mais.',
            'Atividade modificada — reduzir a carga que agrava, não eliminar todo movimento — geralmente é o melhor caminho.',
          ],
        },
        {
          heading: 'Força do Quadríceps e Quadril é a Base',
          body: [
            'Quadríceps e abdutores de quadril fracos estão consistentemente ligados à dor patelofemoral (na patela). Um programa estruturado de fortalecimento — não só alongamento — é o tratamento de primeira linha baseado em evidência para a maioria das dores de joelho não artríticas.',
          ],
        },
        {
          heading: '"Desgaste" Não é Toda a História',
          body: [
            'Achados de imagem como desgaste leve de cartilagem são extremamente comuns também em joelhos sem dor. Um exame mostrando "artrose" não significa que a cirurgia é o único caminho — muitas pessoas com os mesmos achados de imagem não têm dor nenhuma quando carregam e fortalecem adequadamente.',
          ],
        },
        {
          heading: 'Quando Procurar Avaliação',
          body: [
            'Inchaço súbito, um joelho que falseia ou trava, ou dor após uma lesão específica de torção são sinais de alerta que merecem uma avaliação adequada — esses padrões geralmente não respondem só a orientações genéricas de exercício.',
          ],
        },
      ],
      cta: 'Não tem certeza em qual categoria sua dor no joelho se encaixa? Uma avaliação biomecânica adequada elimina o achismo — agende uma com a BPR.',
    },
  },
  {
    slug: 'understanding-persistent-pain',
    cluster: 'pain',
    titleEn: 'Understanding Persistent Pain',
    titlePt: 'Entendendo a Dor Persistente',
    en: {
      subtitle: 'Why pain can outlast an injury — and what genuinely helps',
      intro: 'Persistent pain (lasting more than 3 months) doesn\'t always mean ongoing tissue damage. Understanding how pain actually works is often the first real step toward getting better.',
      sections: [
        {
          heading: 'Pain Is a Protection Signal, Not a Damage Meter',
          body: [
            'Pain is produced by the brain as a protective output based on perceived threat — it isn\'t a direct, one-to-one readout of tissue damage. This is why pain intensity often doesn\'t match what a scan shows, in both directions.',
          ],
        },
        {
          heading: 'The Nervous System Can Become Over-Protective',
          body: [
            'With persistent pain, the nervous system can become more sensitive over time (central sensitisation) — amplifying pain signals even as the original tissue has healed. This is a real, physiological process, not "in your head".',
          ],
        },
        {
          heading: 'Movement Is Usually Part of the Solution',
          body: [
            'Graded, paced return to movement and activity — done progressively and consistently — is one of the most evidence-supported ways to reduce persistent pain and rebuild confidence in your body.',
          ],
        },
        {
          heading: 'Sleep, Stress and Pain Are Connected',
          body: [
            'Poor sleep and high stress measurably increase pain sensitivity. Addressing these isn\'t "extra" — it\'s a core, evidence-based part of managing persistent pain.',
          ],
        },
      ],
      cta: 'Persistent pain benefits from a plan built around you, not a generic protocol. Book an assessment with BPR to start building yours.',
    },
    pt: {
      subtitle: 'Por que a dor pode durar mais que a lesão — e o que realmente ajuda',
      intro: 'A dor persistente (com mais de 3 meses) nem sempre significa dano contínuo aos tecidos. Entender como a dor realmente funciona costuma ser o primeiro passo real para melhorar.',
      sections: [
        {
          heading: 'Dor é um Sinal de Proteção, Não um Medidor de Dano',
          body: [
            'A dor é produzida pelo cérebro como uma resposta protetora baseada em ameaça percebida — não é uma leitura direta e proporcional do dano tecidual. É por isso que a intensidade da dor muitas vezes não bate com o que um exame de imagem mostra, nos dois sentidos.',
          ],
        },
        {
          heading: 'O Sistema Nervoso Pode Ficar Superprotetor',
          body: [
            'Com a dor persistente, o sistema nervoso pode se tornar mais sensível ao longo do tempo (sensibilização central) — amplificando os sinais de dor mesmo depois que o tecido original já cicatrizou. Isso é um processo real e fisiológico, não "coisa da sua cabeça".',
          ],
        },
        {
          heading: 'Movimento Geralmente Faz Parte da Solução',
          body: [
            'O retorno gradual e ritmado ao movimento e à atividade — feito de forma progressiva e consistente — é uma das formas mais respaldadas por evidência de reduzir a dor persistente e reconstruir a confiança no seu corpo.',
          ],
        },
        {
          heading: 'Sono, Estresse e Dor Estão Conectados',
          body: [
            'Sono ruim e estresse alto aumentam mensuravelmente a sensibilidade à dor. Cuidar disso não é "extra" — é parte central e baseada em evidência do manejo da dor persistente.',
          ],
        },
      ],
      cta: 'A dor persistente se beneficia de um plano construído em torno de você, não um protocolo genérico. Agende uma avaliação com a BPR para começar a construir o seu.',
    },
  },
  {
    slug: 'tendinopathy-why-loading-works',
    cluster: 'tendon',
    titleEn: 'Tendinopathy: Why Loading Works',
    titlePt: 'Tendinopatia: Por Que Carregar Funciona',
    en: {
      subtitle: 'Why resting a painful tendon usually makes it worse, not better',
      intro: 'Tendinopathy (Achilles, patellar, rotator cuff and more) is one of the most misunderstood injuries — the instinct to rest is usually the wrong one. Here\'s the evidence-based approach that actually works.',
      sections: [
        {
          heading: 'It\'s Not "Tendinitis" — There\'s Usually No Inflammation',
          body: [
            'Most persistent tendon pain isn\'t primarily an inflammatory problem — it\'s a failed adaptation response in the tendon structure. This is why anti-inflammatories and rest often don\'t fix it long-term.',
          ],
        },
        {
          heading: 'Tendons Need Load to Heal — the Right Load',
          body: [
            'Progressive tendon loading (starting isometric, then progressing to heavier slow resistance exercise) stimulates the tendon to remodel and strengthen. This is the most evidence-supported treatment for tendinopathy across the research.',
          ],
        },
        {
          heading: 'The Dosage Matters — the "Acceptable Pain" Rule',
          body: [
            'Some discomfort during loading exercises (up to about 3-4/10, settling within 24 hours) is generally acceptable and doesn\'t mean you\'re causing damage. Pain that escalates or lingers is the signal to adjust the dose, not to stop entirely.',
          ],
        },
        {
          heading: 'Recovery Takes Longer Than You\'d Expect',
          body: [
            'Tendon tissue remodels slowly — meaningful improvement typically takes 8-12+ weeks of consistent loading, not days or a couple of weeks. Patience and consistency outperform intensity here.',
          ],
        },
      ],
      cta: 'A tendinopathy loading programme needs to be dosed correctly for your specific tendon and stage — book an assessment with BPR to get yours right.',
    },
    pt: {
      subtitle: 'Por que descansar um tendão dolorido geralmente piora, e não melhora',
      intro: 'A tendinopatia (Aquiles, patelar, manguito rotador e outras) é uma das lesões mais mal compreendidas — o instinto de descansar geralmente é o errado. Aqui está a abordagem baseada em evidência que realmente funciona.',
      sections: [
        {
          heading: 'Não é "Tendinite" — Geralmente Não Há Inflamação',
          body: [
            'A maioria das dores persistentes de tendão não é primariamente um problema inflamatório — é uma resposta de adaptação falhada na estrutura do tendão. É por isso que anti-inflamatórios e descanso muitas vezes não resolvem a longo prazo.',
          ],
        },
        {
          heading: 'Tendões Precisam de Carga para Cicatrizar — a Carga Certa',
          body: [
            'A carga progressiva do tendão (começando isométrica, depois progredindo para exercício resistido lento e mais pesado) estimula o tendão a remodelar e fortalecer. Este é o tratamento mais respaldado por evidência para tendinopatia em toda a pesquisa.',
          ],
        },
        {
          heading: 'A Dosagem Importa — a Regra da "Dor Aceitável"',
          body: [
            'Algum desconforto durante os exercícios de carga (até cerca de 3-4/10, melhorando em 24 horas) geralmente é aceitável e não significa que você está causando dano. Dor que aumenta ou persiste é o sinal para ajustar a dose, não para parar completamente.',
          ],
        },
        {
          heading: 'A Recuperação Demora Mais do Que Você Esperaria',
          body: [
            'O tecido do tendão remodela lentamente — melhora significativa geralmente leva 8-12+ semanas de carga consistente, não dias ou algumas semanas. Paciência e consistência superam intensidade aqui.',
          ],
        },
      ],
      cta: 'Um programa de carga para tendinopatia precisa ser dosado corretamente para seu tendão e estágio específicos — agende uma avaliação com a BPR para acertar o seu.',
    },
  },
];

async function renderGuidePdf(guide, locale) {
  const { jsPDF } = require('jspdf');
  const c = locale === 'pt' ? guide.pt : guide.en;
  const title = locale === 'pt' ? guide.titlePt : guide.titleEn;

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  const usableWidth = pageWidth - margin * 2;
  let y = 0;

  const addFooter = () => {
    const totalPages = doc.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(...BRAND_MUTED);
      doc.text('Bruno Physical Rehabilitation — bpr.rehab', margin, pageHeight - 10);
      doc.text(String(i), pageWidth - margin, pageHeight - 10, { align: 'right' });
    }
  };

  // Cover header band
  doc.setFillColor(...BRAND_PRIMARY);
  doc.rect(0, 0, pageWidth, 55, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('BPR PHYSICAL REHABILITATION', margin, 18);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(locale === 'pt' ? 'Guia gratuito' : 'Free Guide', margin, 25);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  const titleLines = doc.splitTextToSize(title, usableWidth);
  doc.text(titleLines, margin, 38);

  y = 65;
  doc.setTextColor(...BRAND_MUTED);
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(11);
  const subtitleLines = doc.splitTextToSize(c.subtitle, usableWidth);
  doc.text(subtitleLines, margin, y);
  y += subtitleLines.length * 5 + 6;

  doc.setTextColor(...BRAND_INK);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10.5);
  const introLines = doc.splitTextToSize(c.intro, usableWidth);
  for (const line of introLines) {
    doc.text(line, margin, y);
    y += 5.2;
  }
  y += 6;

  for (const section of c.sections) {
    if (y > pageHeight - 45) {
      doc.addPage();
      y = 25;
    }
    doc.setDrawColor(...BRAND_PRIMARY);
    doc.setLineWidth(0.8);
    doc.line(margin, y, margin + 12, y);
    y += 6;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(...BRAND_PRIMARY_DARK);
    const headingLines = doc.splitTextToSize(section.heading, usableWidth);
    doc.text(headingLines, margin, y);
    y += headingLines.length * 6 + 2;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10.5);
    doc.setTextColor(...BRAND_INK);
    for (const para of section.body) {
      const lines = doc.splitTextToSize(para, usableWidth);
      for (const line of lines) {
        if (y > pageHeight - 30) {
          doc.addPage();
          y = 25;
        }
        doc.text(line, margin, y);
        y += 5.2;
      }
      y += 3;
    }
    y += 4;
  }

  // CTA box
  if (y > pageHeight - 55) {
    doc.addPage();
    y = 25;
  }
  y += 4;
  doc.setFillColor(237, 243, 239); // brand health-soft
  doc.roundedRect(margin, y, usableWidth, 28, 3, 3, 'F');
  doc.setTextColor(...BRAND_PRIMARY_DARK);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  const ctaLines = doc.splitTextToSize(c.cta, usableWidth - 10);
  doc.text(ctaLines, margin + 5, y + 8);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(...BRAND_PRIMARY);
  doc.text('bpr.rehab', margin + 5, y + 8 + ctaLines.length * 5 + 4);

  addFooter();

  return Buffer.from(doc.output('arraybuffer'));
}

async function main() {
  for (const guide of GUIDES) {
    const existing = await prisma.leadMagnetGuide.findUnique({ where: { slug: guide.slug } });
    if (existing) {
      console.log(`[seed-guides] skip "${guide.slug}" — already exists`);
      continue;
    }
    const [pdfEn, pdfPt] = await Promise.all([
      renderGuidePdf(guide, 'en'),
      renderGuidePdf(guide, 'pt'),
    ]);
    await prisma.leadMagnetGuide.create({
      data: {
        slug: guide.slug,
        cluster: guide.cluster,
        titleEn: guide.titleEn,
        titlePt: guide.titlePt,
        pdfDataEn: pdfEn.toString('base64'),
        pdfDataPt: pdfPt.toString('base64'),
      },
    });
    console.log(`[seed-guides] created "${guide.slug}" (EN ${(pdfEn.length / 1024).toFixed(0)} KB, PT ${(pdfPt.length / 1024).toFixed(0)} KB)`);
  }
  console.log('[seed-guides] done');
}

module.exports = { GUIDES, renderGuidePdf };

if (require.main === module) {
  main()
    .catch((e) => {
      console.error('[seed-guides] error', e);
      process.exitCode = 1;
    })
    .finally(() => prisma.$disconnect());
}
