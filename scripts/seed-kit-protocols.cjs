// Activity 18 — Kit de Rotina Clínica. Seeds 3 ORIGINAL, evidence-based pilot
// protocol templates using the clean bilingual columns (name/namePt, etc.) and
// referencesJson. Content is authored from general clinical knowledge + cited
// public literature — NOT copied from any paid product.
//
// v2 — incorporates the specialist-QA panel (activity 18): explicit red-flags &
// referral criteria per condition, Achilles rupture screening, a stop/regress
// safety-net on loading items, modality precautions, and tidied citations.
// Idempotent + atomic: upserts by name, PRESERVING the template id (so any
// patient TreatmentProtocol.templateId keeps pointing at it). LOCAL by default.
//
// Usage: node scripts/seed-kit-protocols.cjs
const fs = require("fs");
const path = require("path");
if (!process.env.DATABASE_URL) {
  const envPath = path.join(__dirname, "..", ".env");
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*DATABASE_URL\s*=\s*"?([^"]+?)"?\s*$/);
    if (m) { process.env.DATABASE_URL = m[1]; break; }
  }
}
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const LASER = "MLS Laser";
const US = "Ultrassom Terapêutico 1 MHz";

// Reusable safety-net line appended to loading items (EN/PT).
const SAFETY_EN = " Safety-net: if pain exceeds the acceptable level (>4/10) or does not settle within 24 h, reduce load/reps and reassess before progressing.";
const SAFETY_PT = " Rede de segurança: se a dor ultrapassar o nível aceitável (>4/10) ou não acalmar em 24 h, reduzir carga/repetições e reavaliar antes de progredir.";

const PROTOCOLS = [
  {
    name: "Knee Osteoarthritis — Exercise-Led Programme",
    namePt: "Osteoartrite de Joelho — Programa Guiado por Exercício",
    description:
      "Exercise-led management of knee osteoarthritis. The core of care is progressive strengthening and neuromuscular exercise, with education and load management; clinic modalities are adjuncts for symptom control, not the main treatment.",
    descriptionPt:
      "Manejo da osteoartrite de joelho guiado por exercício. O núcleo é o fortalecimento progressivo e o exercício neuromuscular, com educação e gestão de carga; as modalidades na clínica são adjuvantes para controle de sintomas, não o tratamento principal.",
    condition: "Knee Osteoarthritis",
    bodyRegion: "KNEE",
    equipment: [LASER],
    category: "MSK Rehabilitation",
    estimatedWeeks: 12,
    sessionsPerWeek: 2,
    references: [
      { citation: "Exercise for osteoarthritis of the knee (Cochrane review)", authors: "Fransen M, et al.", year: 2015, journal: "Cochrane Database Syst Rev", doi: "10.1002/14651858.CD004376.pub3" },
      { citation: "Good Life with osteoArthritis in Denmark (GLA:D)", authors: "Skou ST, Roos EM", year: 2017, journal: "BMC Musculoskelet Disord", doi: "10.1186/s12891-017-1439-y" },
      { citation: "OARSI guidelines for the non-surgical management of knee, hip, and polyarticular osteoarthritis", authors: "Bannuru RR, et al.", year: 2019, journal: "Osteoarthritis Cartilage", doi: "10.1016/j.joca.2019.06.011" },
    ],
    items: [
      { phase: "SHORT_TERM", itemType: "ASSESSMENT", sortOrder: 0, startWeek: 1, endWeek: 1,
        title: "Baseline assessment & red-flag screen", titlePt: "Avaliação inicial e rastreio de sinais de alerta",
        instructions: "Pain (NRS), 30-second sit-to-stand, 40 m fast-paced walk, knee ROM, and a patient-reported score (e.g. KOOS). RED FLAGS — refer, do not start the programme: hot/swollen joint (?septic arthritis), night or rest pain, history of cancer, unexplained weight loss, significant trauma, or true locking/giving-way. Re-referral trigger: no meaningful improvement after ~6–12 weeks of appropriate exercise → reassess/refer.",
        instructionsPt: "Dor (NRS), teste de sentar-levantar em 30 s, caminhada rápida de 40 m, ADM do joelho e um score do paciente (ex.: KOOS). SINAIS DE ALERTA — encaminhar, não iniciar o programa: articulação quente/edemaciada (?artrite séptica), dor noturna ou de repouso, história de câncer, perda de peso inexplicada, trauma significativo, ou travamento/falseio verdadeiro. Gatilho de reencaminhamento: sem melhora relevante após ~6–12 semanas de exercício adequado → reavaliar/encaminhar." },
      { phase: "SHORT_TERM", itemType: "HOME_CARE", sortOrder: 1, startWeek: 1, endWeek: 12,
        title: "Education & load management", titlePt: "Educação e gestão de carga",
        instructions: "Explain that pain does not equal harm and that movement is protective. Encourage staying active within an acceptable pain level (≤4/10 that settles within 24 h). Weight management advice where relevant.",
        instructionsPt: "Explicar que dor não é sinônimo de dano e que o movimento é protetor. Incentivar manter-se ativo dentro de um nível de dor aceitável (≤4/10 que acalma em 24 h). Orientação de controle de peso quando pertinente." },
      { phase: "MEDIUM_TERM", itemType: "HOME_EXERCISE", sortOrder: 2, startWeek: 1, endWeek: 12,
        title: "Progressive lower-limb strengthening", titlePt: "Fortalecimento progressivo de membro inferior",
        instructions: "Quadriceps and hip strengthening 2–3×/week: sit-to-stand, step-ups, and hip abduction. Start ~2 sets of 10 at a manageable effort; progress load/reps as tolerated toward 3 sets of 8–12." + SAFETY_EN,
        instructionsPt: "Fortalecimento de quadríceps e quadril 2–3×/semana: sentar-levantar, step-ups e abdução de quadril. Começar com ~2 séries de 10 num esforço tolerável; progredir carga/repetições conforme tolerância até 3 séries de 8–12." + SAFETY_PT,
        sets: 3, reps: 10, frequency: "2-3x/week" },
      { phase: "MEDIUM_TERM", itemType: "HOME_EXERCISE", sortOrder: 3, startWeek: 1, endWeek: 12,
        title: "Neuromuscular control & balance", titlePt: "Controle neuromuscular e equilíbrio",
        instructions: "Balance and knee-alignment control 2–3×/week: progressive single-leg stance, controlled step-downs, and mini-squats with attention to knee-over-foot alignment. This complements the strengthening work (core to the GLA:D model)." + SAFETY_EN,
        instructionsPt: "Controle de equilíbrio e alinhamento do joelho 2–3×/semana: apoio unipodal progressivo, step-downs controlados e mini-agachamentos com atenção ao alinhamento joelho-sobre-pé. Complementa o trabalho de força (núcleo do modelo GLA:D)." + SAFETY_PT,
        frequency: "2-3x/week" },
      { phase: "MEDIUM_TERM", itemType: "IN_CLINIC", sortOrder: 4, startWeek: 1, endWeek: 6,
        title: "Adjunct symptom control (as needed)", titlePt: "Controle de sintomas adjuvante (se necessário)",
        treatmentTypeName: "Photobiomodulation / manual therapy",
        sessionDuration: 30, sessionsPerWeek: 2,
        instructions: "Optional short course of clinic modalities (e.g. photobiomodulation) plus manual therapy for a painful flare, always alongside — never replacing — the exercise programme. Modality precautions: eye protection during laser/photobiomodulation; avoid over a known malignancy, the thyroid/neck, or in patients on photosensitising medication.",
        instructionsPt: "Curso curto opcional de modalidades na clínica (ex.: fotobiomodulação) mais terapia manual para crises dolorosas, sempre junto — nunca substituindo — o programa de exercícios. Precauções da modalidade: proteção ocular no laser/fotobiomodulação; evitar sobre malignidade conhecida, a tireoide/pescoço, ou em uso de medicação fotossensibilizante." },
    ],
  },
  {
    name: "Plantar Heel Pain (Plantar Fasciopathy)",
    namePt: "Dor Plantar no Calcanhar (Fasciopatia Plantar)",
    description:
      "Load-based management of plantar heel pain. Combines patient education, calf/foot loading and high-load plantar-fascia strengthening, with stretching and footwear advice for symptom relief.",
    descriptionPt:
      "Manejo baseado em carga da dor plantar no calcanhar. Combina educação, carga de panturrilha/pé e fortalecimento de alta carga da fáscia plantar, com alongamento e orientação de calçado para alívio dos sintomas.",
    condition: "Plantar Fasciopathy",
    bodyRegion: "FOOT",
    equipment: [US],
    category: "MSK Rehabilitation",
    estimatedWeeks: 12,
    sessionsPerWeek: 1,
    references: [
      { citation: "High-load strength training improves outcome in patients with plantar fasciitis (RCT)", authors: "Rathleff MS, et al.", year: 2015, journal: "Scand J Med Sci Sports", doi: "10.1111/sms.12313" },
      { citation: "Heel Pain — Plantar Fasciitis: Clinical Practice Guidelines (revision)", authors: "Koc TA Jr, et al.", year: 2023, journal: "J Orthop Sports Phys Ther", doi: "10.2519/jospt.2023.0303" },
    ],
    items: [
      { phase: "SHORT_TERM", itemType: "ASSESSMENT", sortOrder: 0, startWeek: 1, endWeek: 1,
        title: "Baseline assessment & red-flag screen", titlePt: "Avaliação inicial e rastreio de sinais de alerta",
        instructions: "First-step pain (NRS), palpation of the medial calcaneal tubercle, windlass test, ankle dorsiflexion ROM, and a foot score (e.g. FFI/FHSQ). RED FLAGS — refer/investigate: bilateral heel pain (?inflammatory arthropathy/spondyloarthritis), night or rest pain, suspected calcaneal stress fracture (runners, focal bony tenderness), or neural signs (tarsal tunnel / Baxter's nerve — burning, paraesthesia). Re-referral trigger: no improvement after ~6–12 weeks of appropriate loading → reassess/refer.",
        instructionsPt: "Dor no primeiro passo (NRS), palpação do tubérculo medial do calcâneo, teste de windlass, ADM de dorsiflexão do tornozelo e um score do pé (ex.: FFI/FHSQ). SINAIS DE ALERTA — encaminhar/investigar: dor bilateral no calcanhar (?artropatia inflamatória/espondiloartrite), dor noturna ou de repouso, suspeita de fratura por estresse do calcâneo (corredores, dor óssea focal), ou sinais neurais (túnel do tarso / nervo de Baxter — queimação, parestesia). Gatilho de reencaminhamento: sem melhora após ~6–12 semanas de carga adequada → reavaliar/encaminhar." },
      { phase: "SHORT_TERM", itemType: "HOME_CARE", sortOrder: 1, startWeek: 1, endWeek: 12,
        title: "Education, footwear & stretching", titlePt: "Educação, calçado e alongamento",
        instructions: "Supportive, cushioned footwear; reduce barefoot time on hard floors. Plantar-fascia-specific stretch (toes extended) and calf stretch, held 20–30 s, a few times daily for short-term relief.",
        instructionsPt: "Calçado com suporte e amortecimento; reduzir tempo descalço em piso duro. Alongamento específico da fáscia plantar (dedos em extensão) e da panturrilha, mantidos 20–30 s, algumas vezes ao dia, para alívio de curto prazo." },
      { phase: "MEDIUM_TERM", itemType: "HOME_EXERCISE", sortOrder: 2, startWeek: 1, endWeek: 12,
        title: "High-load plantar-fascia strengthening", titlePt: "Fortalecimento de alta carga da fáscia plantar",
        instructions: "Standing heel raise on a step with a towel under the toes (to engage the windlass), performed slowly (3 s up / 2 s hold / 3 s down), every other day. Progress from bodyweight to a loaded backpack as tolerated, moving toward heavier loads and fewer reps." + SAFETY_EN,
        instructionsPt: "Elevação de calcanhar em pé sobre um degrau, com uma toalha sob os dedos (para ativar o windlass), executada devagar (3 s subir / 2 s segurar / 3 s descer), em dias alternados. Progredir de peso corporal para mochila carregada conforme tolerância, caminhando para cargas maiores e menos repetições." + SAFETY_PT,
        sets: 3, reps: 12, holdSeconds: 2, frequency: "every other day" },
      { phase: "SHORT_TERM", itemType: "IN_CLINIC", sortOrder: 3, startWeek: 1, endWeek: 4,
        title: "Adjunct symptom control (as needed)", titlePt: "Controle de sintomas adjuvante (se necessário)",
        treatmentTypeName: "Therapeutic ultrasound / soft-tissue work",
        sessionDuration: 30, sessionsPerWeek: 1,
        instructions: "Optional soft-tissue work and clinic modalities for a painful period, as an adjunct to the loading programme, not a replacement. Ultrasound precautions: avoid application over a malignancy, DVT, acute infection, or a pregnant abdomen/pelvis.",
        instructionsPt: "Trabalho de tecidos moles e modalidades na clínica opcionais para um período doloroso, como adjuvante ao programa de carga, não como substituto. Precauções do ultrassom: evitar aplicar sobre malignidade, TVP, infecção aguda ou abdome/pelve gestante." },
    ],
  },
  {
    name: "Achilles Tendinopathy (Mid-Portion)",
    namePt: "Tendinopatia do Aquiles (Porção Média)",
    description:
      "Progressive-loading programme for mid-portion Achilles tendinopathy, following a graded model (isometric → heavy slow resistance → energy-storage) guided by an acceptable, settling pain response. Rupture must be excluded before loading.",
    descriptionPt:
      "Programa de carga progressiva para tendinopatia da porção média do Aquiles, seguindo um modelo graduado (isométrico → resistência lenta e pesada → armazenamento de energia) guiado por uma resposta de dor aceitável e que acalma. A ruptura deve ser excluída antes de carregar.",
    condition: "Achilles Tendinopathy",
    bodyRegion: "ANKLE",
    equipment: [LASER],
    category: "MSK Rehabilitation",
    estimatedWeeks: 12,
    sessionsPerWeek: 1,
    references: [
      { citation: "Heavy-load eccentric calf muscle training for chronic Achilles tendinosis", authors: "Alfredson H, et al.", year: 1998, journal: "Am J Sports Med", doi: "10.1177/03635465980260030301" },
      { citation: "Heavy Slow Resistance Versus Eccentric Training as Treatment for Achilles Tendinopathy (RCT)", authors: "Beyer R, et al.", year: 2015, journal: "Am J Sports Med", doi: "10.1177/0363546515584760" },
      { citation: "Is compressive load a factor in the development of tendinopathy?", authors: "Cook JL, Purdam CR", year: 2012, journal: "Br J Sports Med", doi: "10.1136/bjsports-2011-090414" },
    ],
    items: [
      { phase: "SHORT_TERM", itemType: "ASSESSMENT", sortOrder: 0, startWeek: 1, endWeek: 1,
        title: "Baseline assessment, rupture screen & red flags", titlePt: "Avaliação inicial, rastreio de ruptura e sinais de alerta",
        instructions: "RUPTURE SCREEN FIRST (do this before any loading): Thompson/Simmonds calf-squeeze test, palpation for a tendon gap, and history of a sudden 'pop' with acute loss of push-off. IF RUPTURE IS SUSPECTED → do NOT load; immobilise and refer urgently. If rupture excluded: VISA-A questionnaire, pain on single-leg heel raise and hop, mid-portion palpation (2–7 cm above insertion), and ankle ROM. Differentiate from insertional tendinopathy (tolerates less dorsiflexion/compression). Other red flags — refer: night/rest pain, systemic features, or no improvement after ~6–12 weeks of appropriate loading.",
        instructionsPt: "RASTREIO DE RUPTURA PRIMEIRO (antes de qualquer carga): teste de compressão da panturrilha de Thompson/Simmonds, palpação de gap no tendão e história de um 'estalo' súbito com perda aguda de impulso. SE HOUVER SUSPEITA DE RUPTURA → NÃO carregar; imobilizar e encaminhar com urgência. Se ruptura excluída: questionário VISA-A, dor na elevação de calcanhar unipodal e no salto, palpação da porção média (2–7 cm acima da inserção) e ADM do tornozelo. Diferenciar da tendinopatia insercional (tolera menos dorsiflexão/compressão). Outros sinais de alerta — encaminhar: dor noturna/de repouso, sintomas sistêmicos, ou sem melhora após ~6–12 semanas de carga adequada." },
      { phase: "SHORT_TERM", itemType: "HOME_EXERCISE", sortOrder: 1, startWeek: 1, endWeek: 2,
        title: "Phase 1 — Isometric loading", titlePt: "Fase 1 — Carga isométrica",
        instructions: "For the pain-dominant early stage: mid-range isometric calf holds at a comfortable submaximal effort (~70% of max / moderate RPE), ~5 reps of 30–45 s, 1–2×/day (may rise to 2–3×/day if very irritable). May help modulate symptoms and maintain load tolerance (note: evidence for isometric analgesia in tendinopathy is mixed). Keep pain acceptable (≤4/10) and settling within 24 h." + SAFETY_EN,
        instructionsPt: "Para a fase inicial dominada por dor: contrações isométricas de panturrilha em amplitude média, em esforço submáximo confortável (~70% do máximo / RPE moderado), ~5 repetições de 30–45 s, 1–2×/dia (pode subir para 2–3×/dia se muito irritável). Pode ajudar a modular sintomas e manter tolerância à carga (obs.: a evidência de analgesia isométrica na tendinopatia é mista). Manter a dor aceitável (≤4/10) e que acalma em 24 h." + SAFETY_PT,
        sets: 5, holdSeconds: 40, frequency: "1-2x/day" },
      { phase: "MEDIUM_TERM", itemType: "HOME_EXERCISE", sortOrder: 2, startWeek: 3, endWeek: 12,
        title: "Phase 2 — Heavy slow resistance", titlePt: "Fase 2 — Resistência lenta e pesada",
        instructions: "Progress to this phase when single-leg heel-raise pain is acceptable and settles within 24 h (the weeks are a typical guide, not a fixed rule). Heel raises (bilateral → single-leg, straight and bent knee) performed slowly (3 s up / 3 s down), 3 sets, 3×/week, progressing load over weeks (e.g. 15RM → 6RM). Pain during exercise should be acceptable and settle by the next day." + SAFETY_EN,
        instructionsPt: "Avançar para esta fase quando a dor na elevação de calcanhar unipodal for aceitável e acalmar em 24 h (as semanas são referência típica, não regra fixa). Elevações de calcanhar (bilateral → unipodal, joelho estendido e flexionado) executadas devagar (3 s subir / 3 s descer), 3 séries, 3×/semana, progredindo a carga ao longo das semanas (ex.: 15RM → 6RM). A dor durante o exercício deve ser aceitável e acalmar no dia seguinte." + SAFETY_PT,
        sets: 3, reps: 8, frequency: "3x/week" },
      { phase: "MEDIUM_TERM", itemType: "IN_CLINIC", sortOrder: 3, startWeek: 1, endWeek: 6,
        title: "Adjunct symptom control (as needed)", titlePt: "Controle de sintomas adjuvante (se necessário)",
        treatmentTypeName: "Photobiomodulation / soft-tissue work",
        sessionDuration: 30, sessionsPerWeek: 1,
        instructions: "Optional photobiomodulation and soft-tissue work for a painful period, as an adjunct to the loading programme, never replacing it. Precautions: eye protection during laser/photobiomodulation; avoid over a known malignancy, the thyroid/neck, or in patients on photosensitising medication.",
        instructionsPt: "Fotobiomodulação e trabalho de tecidos moles opcionais para um período doloroso, como adjuvante ao programa de carga, nunca o substituindo. Precauções: proteção ocular no laser/fotobiomodulação; evitar sobre malignidade conhecida, a tireoide/pescoço, ou em uso de medicação fotossensibilizante." },
      { phase: "LONG_TERM", itemType: "HOME_EXERCISE", sortOrder: 4, startWeek: 8, endWeek: 12,
        title: "Phase 3 — Return to loading/sport", titlePt: "Fase 3 — Retorno à carga/esporte",
        instructions: "Gradually reintroduce energy-storage load (hopping, running) once single-leg heel-raise capacity and pain allow, following a graded return-to-running plan. Avoid sudden spikes in training volume." + SAFETY_EN,
        instructionsPt: "Reintroduzir gradualmente a carga de armazenamento de energia (saltos, corrida) quando a capacidade de elevação unipodal e a dor permitirem, seguindo um plano gradual de retorno à corrida. Evitar picos súbitos de volume de treino." + SAFETY_PT },
    ],
  },
];

function itemData(templateId, it) {
  return {
    templateId,
    phase: it.phase,
    itemType: it.itemType,
    sortOrder: it.sortOrder,
    title: it.title,
    titlePt: it.titlePt,
    instructions: it.instructions,
    instructionsPt: it.instructionsPt,
    treatmentTypeName: it.treatmentTypeName ?? null,
    sessionDuration: it.sessionDuration ?? null,
    sessionsPerWeek: it.sessionsPerWeek ?? null,
    sets: it.sets ?? null,
    reps: it.reps ?? null,
    holdSeconds: it.holdSeconds ?? null,
    frequency: it.frequency ?? null,
    startWeek: it.startWeek ?? 1,
    endWeek: it.endWeek ?? null,
  };
}

(async () => {
  try {
    const admin = await prisma.user.findFirst({
      where: { role: { in: ["SUPERADMIN", "ADMIN"] } },
      select: { id: true },
    });
    if (!admin) throw new Error("No admin user found to own the templates");

    for (const p of PROTOCOLS) {
      const templateFields = {
        name: p.name,
        namePt: p.namePt,
        description: p.description,
        descriptionPt: p.descriptionPt,
        referencesJson: JSON.stringify(p.references),
        condition: p.condition,
        bodyRegion: p.bodyRegion,
        equipment: p.equipment,
        category: p.category,
        estimatedWeeks: p.estimatedWeeks,
        sessionsPerWeek: p.sessionsPerWeek,
        isActive: true,
        createdById: admin.id,
      };

      // Atomic upsert-by-name that PRESERVES the template id across re-seeds
      // (so patient TreatmentProtocol.templateId never dangles).
      const count = await prisma.$transaction(async (tx) => {
        const existing = await tx.protocolTemplate.findFirst({ where: { name: p.name }, select: { id: true } });
        let templateId;
        if (existing) {
          templateId = existing.id;
          await tx.protocolTemplateItem.deleteMany({ where: { templateId } });
          await tx.protocolTemplate.update({ where: { id: templateId }, data: templateFields });
        } else {
          const created = await tx.protocolTemplate.create({ data: templateFields, select: { id: true } });
          templateId = created.id;
        }
        await tx.protocolTemplateItem.createMany({ data: p.items.map((it) => itemData(templateId, it)) });
        return p.items.length;
      });
      console.log(`OK: ${p.name} (${count} items)`);
    }
    console.log(`Seeded ${PROTOCOLS.length} pilot protocols.`);
  } catch (err) {
    console.error("SEED FAILED:", err.message);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
})();
