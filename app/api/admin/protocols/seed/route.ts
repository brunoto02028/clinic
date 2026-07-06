import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

// ─── Equipment constants ────────────────────────────────────────
const LASER = "MLS Laser";
const ELECTRO = "IbraMed Neurodyn (TENS/EMS/NMES)";
const US = "Ultrassom Terapêutico 1 MHz";

// ─── Protocol seed data ─────────────────────────────────────────
const PROTOCOLS = [
  // ── 1. PATELLAR TENDINOPATHY ──────────────────────────────────
  {
    name: "Patellar Tendinopathy / Tendinopatia Patelar",
    description:
      "EN: Overload tendinopathy at the inferior pole of the patellar tendon (Jumper's Knee). Managed by symptom modulation then progressive tendon loading.\n" +
      "PT: Tendinopatia de sobrecarga no polo inferior do tendão patelar (Joelho do Saltador). Modulação dos sintomas e carga progressiva do tendão.",
    condition: "Patellar Tendinopathy / Tendinopatia Patelar",
    bodyRegion: "KNEE",
    equipment: [LASER, ELECTRO, US],
    category: "MSK Rehabilitation",
    estimatedWeeks: 10,
    sessionsPerWeek: 2,
    items: [
      {
        phase: "SHORT_TERM", itemType: "ASSESSMENT", sortOrder: 0, startWeek: 1, endWeek: 1,
        title: "Baseline Assessment / Avaliação Inicial",
        instructions: "EN: VISA-P score, single-leg decline squat (25°), inferior pole palpation, knee ROM, NPRS.\nPT: Score VISA-P, agachamento monopodal em declive 25°, palpação polo inferior da rótula, ADM joelho, NPRS.",
      },
      {
        phase: "SHORT_TERM", itemType: "IN_CLINIC", sortOrder: 1, startWeek: 1, endWeek: 4,
        title: "In-Clinic Session (Weeks 1–4) / Sessão Clínica (Semanas 1–4)",
        treatmentTypeName: "Manual therapy + Electrotherapy + Isometric loading",
        sessionDuration: 50, sessionsPerWeek: 2,
        instructions:
          "EN: 1) STM quads/ITB/gastroc (10 min). 2) Patellar mobilisations Maitland (5 min). 3) MLS Laser on tendon (6 min). 4) US 1 MHz — pulsed 1:4, 0.5–1 W/cm² on inferior pole (8 min). 5) IbraMed NMES quads activation (8 min). 6) Isometric loading — Spanish squat / knee-ext holds (5 min). 7) Infrapatellar taping.\n" +
          "PT: 1) STM quads/ITB/gastrocnémio (10 min). 2) Mobilizações patelares Maitland (5 min). 3) Laser MLS no tendão (6 min). 4) US 1 MHz — pulsado 1:4, 0,5–1 W/cm² no polo inferior (8 min). 5) IbraMed NMES ativação do quadríceps (8 min). 6) Carga isométrica — agachamento espanhol / extensão joelho (5 min). 7) Taping infrapatelar.",
      },
      {
        phase: "SHORT_TERM", itemType: "HOME_CARE", sortOrder: 2, startWeek: 1, endWeek: 4,
        title: "Home Care & Load Management / Autocuidado e Gestão de Carga",
        instructions:
          "EN: Reduce jumping/impact load. Pain scale ≤3/10 as guide. Ice 10 min after activity. Isometric holds 5×45s daily. Education: tendon is sensitive to load not damage.\n" +
          "PT: Reduzir carga de saltos/impacto. Escala de dor ≤3/10 como guia. Gelo 10 min pós-atividade. Contrações isométricas 5×45s diários. Educação: o tendão é sensível à carga, não a dano.",
      },
      {
        phase: "MEDIUM_TERM", itemType: "IN_CLINIC", sortOrder: 3, startWeek: 5, endWeek: 8,
        title: "In-Clinic Session (Weeks 5–8) / Sessão Clínica (Semanas 5–8)",
        treatmentTypeName: "Heavy slow resistance + Electrotherapy",
        sessionDuration: 50, sessionsPerWeek: 2,
        instructions:
          "EN: 1) STM (8 min). 2) MLS Laser (6 min). 3) Heavy-slow resistance: leg press / hack squat 3×15 slow tempo. 4) IbraMed EMS quads (8 min). 5) Eccentric loading intro.\n" +
          "PT: 1) STM (8 min). 2) Laser MLS (6 min). 3) Resistência lenta e pesada: leg press / hack squat 3×15 cadência lenta. 4) IbraMed EMS quadríceps (8 min). 5) Introdução carga excêntrica.",
      },
      {
        phase: "MEDIUM_TERM", itemType: "HOME_EXERCISE", sortOrder: 4, startWeek: 5, endWeek: 8,
        title: "Progressive Loading Program / Programa de Carga Progressiva",
        sets: 3, reps: 15, frequency: "Daily",
        instructions:
          "EN: Eccentric decline squat (25°), heavy-slow leg press 3×15, step-down. Monitor VISA-P weekly.\n" +
          "PT: Agachamento excêntrico em declive 25°, leg press lento e pesado 3×15, step-down. Monitorizar VISA-P semanalmente.",
      },
      {
        phase: "LONG_TERM", itemType: "HOME_EXERCISE", sortOrder: 5, startWeek: 9, endWeek: 12,
        title: "Plyometric & Return to Sport / Pliometria e Retorno Desportivo",
        sets: 3, reps: 10, frequency: "3x/week",
        instructions:
          "EN: Double-leg landing control → single-leg land → lateral hops → sport-specific jumps. Manage training load. VISA-P ≥80 before return.\n" +
          "PT: Aterragem bi-podal → monopodal → saltos laterais → saltos específicos do desporto. Gerir carga de treino. VISA-P ≥80 antes do retorno.",
      },
    ],
  },

  // ── 2. PLANTAR FASCIITIS ───────────────────────────────────────
  {
    name: "Plantar Fasciitis / Fasciopatia Plantar",
    description:
      "EN: Degenerative overload of the plantar aponeurosis at the calcaneal origin. Offload, restore dorsiflexion, progressively load.\n" +
      "PT: Sobrecarga degenerativa da aponevrose plantar na origem calcaneana. Reduzir carga, restaurar dorsiflexão, carga progressiva.",
    condition: "Plantar Fasciitis / Fasciopatia Plantar",
    bodyRegion: "ANKLE_FOOT",
    equipment: [LASER, US, ELECTRO],
    category: "MSK Rehabilitation",
    estimatedWeeks: 8,
    sessionsPerWeek: 2,
    items: [
      {
        phase: "SHORT_TERM", itemType: "ASSESSMENT", sortOrder: 0, startWeek: 1, endWeek: 1,
        title: "Baseline Assessment / Avaliação Inicial",
        instructions:
          "EN: Windlass test, medial calcaneal tubercle palpation, ankle dorsiflexion ROM (lunge test), single-leg heel raise, NPRS (first-step pain).\n" +
          "PT: Teste de Windlass, palpação tubérculo calcâneo medial, ADM dorsiflexão (teste do avanço), elevação do calcanhar monopodal, NPRS (dor ao primeiro passo).",
      },
      {
        phase: "SHORT_TERM", itemType: "IN_CLINIC", sortOrder: 1, startWeek: 1, endWeek: 4,
        title: "In-Clinic Session (Weeks 1–4) / Sessão Clínica (Semanas 1–4)",
        treatmentTypeName: "STM + Joint mob + Electrotherapy + Taping",
        sessionDuration: 50, sessionsPerWeek: 2,
        instructions:
          "EN: 1) STM plantar fascia/gastroc/soleus/intrinsics (12 min). 2) Talocrural/subtalar mobilisations (5 min). 3) MLS Laser calcaneal region (6 min). 4) US 1 MHz — 1 W/cm² pulsed on plantar fascia (8 min). 5) IbraMed TENS pain relief (8 min). 6) Low-dye taping demo.\n" +
          "PT: 1) STM fáscia plantar/gastrocnémio/sóleo/intrínsecos (12 min). 2) Mobilizações talocrural/subtalar (5 min). 3) Laser MLS região calcaneana (6 min). 4) US 1 MHz — 1 W/cm² pulsado na fáscia (8 min). 5) IbraMed TENS alívio da dor (8 min). 6) Taping low-dye.",
      },
      {
        phase: "SHORT_TERM", itemType: "HOME_CARE", sortOrder: 2, startWeek: 1, endWeek: 4,
        title: "Home Care / Autocuidado",
        instructions:
          "EN: Calf stretch (gastroc + soleus) 3×30s twice daily. Plantar fascia stretch (seated toe extension). Night splint option. Footwear with arch support.\n" +
          "PT: Alongamento da panturrilha (gastrocnémio + sóleo) 3×30s 2x/dia. Alongamento da fáscia (extensão dos dedos sentado). Opção de tala noturna. Calçado com suporte de arco.",
      },
      {
        phase: "MEDIUM_TERM", itemType: "IN_CLINIC", sortOrder: 3, startWeek: 5, endWeek: 8,
        title: "In-Clinic Session (Weeks 5–8) / Sessão Clínica (Semanas 5–8)",
        treatmentTypeName: "Loading + Laser + Manual therapy",
        sessionDuration: 50, sessionsPerWeek: 1,
        instructions:
          "EN: 1) STM calf/fascia (8 min). 2) MLS Laser (6 min). 3) High-load heel raise with toe extended on step/towel 3×12. 4) US (8 min). 5) Running load guidance.\n" +
          "PT: 1) STM panturrilha/fáscia (8 min). 2) Laser MLS (6 min). 3) Elevação calcanhar carga elevada com dedo estendido em degrau 3×12. 4) US (8 min). 5) Orientação sobre carga de corrida.",
      },
      {
        phase: "MEDIUM_TERM", itemType: "HOME_EXERCISE", sortOrder: 4, startWeek: 5, endWeek: 8,
        title: "Progressive Heel Raise Loading / Carga Progressiva Elevação do Calcanhar",
        sets: 3, reps: 12, holdSeconds: 3, frequency: "Daily",
        instructions:
          "EN: High-load single-leg heel raise with toes extended on a step. Slow eccentric lower. Progress resistance.\n" +
          "PT: Elevação do calcanhar monopodal com dedos estendidos em degrau. Descida excêntrica lenta. Progredir resistência.",
      },
    ],
  },

  // ── 3. HAMSTRING TENDINOSIS ────────────────────────────────────
  {
    name: "Hamstring Tendinopathy / Tendinopatia dos Isquiotibiais",
    description:
      "EN: Proximal hamstring tendinopathy (insertional, ischial). Compression-sensitive — avoid end-range stretch early. Isometric-first loading.\n" +
      "PT: Tendinopatia proximal dos isquiotibiais (inserção isquiática). Sensível à compressão — evitar alongamento ao limite inicial. Carga isométrica primeiro.",
    condition: "Proximal Hamstring Tendinopathy / Tendinopatia Proximal dos Isquiotibiais",
    bodyRegion: "HIP",
    equipment: [LASER, US, ELECTRO],
    category: "MSK Rehabilitation",
    estimatedWeeks: 12,
    sessionsPerWeek: 1,
    items: [
      {
        phase: "SHORT_TERM", itemType: "ASSESSMENT", sortOrder: 0, startWeek: 1, endWeek: 1,
        title: "Baseline Assessment / Avaliação Inicial",
        instructions:
          "EN: Ischial tuberosity palpation, resisted knee flexion (prone 90° and 30°), modified bent-knee stretch, Puranen–Orava test, NPRS.\n" +
          "PT: Palpação tuberosidade isquiática, flexão do joelho resistida (prone 90° e 30°), teste de alongamento joelho flexionado, teste de Puranen–Orava, NPRS.",
      },
      {
        phase: "SHORT_TERM", itemType: "IN_CLINIC", sortOrder: 1, startWeek: 1, endWeek: 4,
        title: "In-Clinic Session (Weeks 1–4) / Sessão Clínica (Semanas 1–4)",
        treatmentTypeName: "STM + Electrotherapy + Isometric loading",
        sessionDuration: 50, sessionsPerWeek: 1,
        instructions:
          "EN: 1) STM hamstrings/glutes — avoid direct ischial pressure (12 min). 2) Hip/lumbar mobilisations (5 min). 3) MLS Laser proximal hamstring (6 min). 4) US 1 MHz pulsed on proximal tendon (8 min). 5) IbraMed TENS pain relief (8 min). 6) Isometric hamstring holds — long lever (5 min). AVOID end-range stretch.\n" +
          "PT: 1) STM isquiotibiais/glúteos — evitar pressão direta no ísquio (12 min). 2) Mobilizações anca/lombar (5 min). 3) Laser MLS tendão proximal (6 min). 4) US 1 MHz pulsado no tendão proximal (8 min). 5) IbraMed TENS (8 min). 6) Contrações isométricas alavanca longa (5 min). EVITAR alongamento ao limite.",
      },
      {
        phase: "MEDIUM_TERM", itemType: "HOME_EXERCISE", sortOrder: 2, startWeek: 5, endWeek: 8,
        title: "Heavy Slow Resistance / Resistência Lenta e Pesada",
        sets: 3, reps: 15, frequency: "3x/week",
        instructions:
          "EN: Nordic hamstring curl (progress slowly), Romanian deadlift with neutral pelvis, hip extension on bench. Avoid hip flexion >60° in early weeks.\n" +
          "PT: Nordic curl (progressão lenta), peso morto romeno pélvis neutra, extensão da anca no banco. Evitar flexão da anca >60° nas primeiras semanas.",
      },
      {
        phase: "LONG_TERM", itemType: "HOME_EXERCISE", sortOrder: 3, startWeek: 9, endWeek: 12,
        title: "Energy Storage & Running Return / Retorno à Corrida",
        sets: 3, reps: 8, frequency: "3x/week",
        instructions:
          "EN: Running-specific hamstring loading: sprinting mechanics drills, single-leg deadlift, resisted running. Gradual return to sprint training.\n" +
          "PT: Carga isquiotibiais específica para corrida: mecânica de sprint, peso morto monopodal, corrida resistida. Retorno gradual ao sprint.",
      },
    ],
  },

  // ── 4. FROZEN SHOULDER ────────────────────────────────────────
  {
    name: "Frozen Shoulder / Capsulite Adesiva",
    description:
      "EN: Adhesive capsulitis — fibrosis and contracture of the GH capsule. Stage-dependent management: pain first, then mobility, then strength.\n" +
      "PT: Capsulite adesiva — fibrose e contração da cápsula glenoumeral. Gestão por fase: dor primeiro, mobilidade, depois força.",
    condition: "Adhesive Capsulitis / Capsulite Adesiva (Ombro Congelado)",
    bodyRegion: "SHOULDER",
    equipment: [LASER, US, ELECTRO],
    category: "MSK Rehabilitation",
    estimatedWeeks: 20,
    sessionsPerWeek: 2,
    items: [
      {
        phase: "SHORT_TERM", itemType: "ASSESSMENT", sortOrder: 0, startWeek: 1, endWeek: 1,
        title: "Baseline Assessment / Avaliação Inicial",
        instructions:
          "EN: Passive ROM (capsular pattern: ER > ABD > IR), active vs passive comparison, end-feel, stage classification (freezing/frozen/thawing), NPRS, Shoulder Pain and Disability Index.\n" +
          "PT: ADM passiva (padrão capsular: RE > ABD > RI), comparação ativa vs passiva, end-feel, classificação de fase (congelando/congelado/descongelando), NPRS, SPADI.",
      },
      {
        phase: "SHORT_TERM", itemType: "IN_CLINIC", sortOrder: 1, startWeek: 1, endWeek: 6,
        title: "Freezing Stage — Pain Relief / Fase de Congelamento — Alívio da Dor",
        treatmentTypeName: "Gentle mobilisation + Electrotherapy + Laser",
        sessionDuration: 50, sessionsPerWeek: 2,
        instructions:
          "EN: 1) STM periscapular/cuff/pec minor (12 min). 2) GH mobilisations grade I–II only (5 min). 3) MLS Laser GH joint (8 min). 4) US 1 MHz on anterior capsule — 0.5 W/cm² pulsed (8 min). 5) IbraMed Interferential/TENS pain relief (8 min). 6) Pendular exercises demo.\n" +
          "PT: 1) STM periscapular/manguito/peitoral menor (12 min). 2) Mobilizações GH grau I–II (5 min). 3) Laser MLS articulação glenoumeral (8 min). 4) US 1 MHz cápsula anterior — 0,5 W/cm² pulsado (8 min). 5) IbraMed Interferencial/TENS (8 min). 6) Exercícios pendulares.",
      },
      {
        phase: "MEDIUM_TERM", itemType: "IN_CLINIC", sortOrder: 2, startWeek: 7, endWeek: 14,
        title: "Frozen/Thawing Stage — Restore ROM / Fase Congelada/Descongelando — Restaurar ADM",
        treatmentTypeName: "Grade III–IV mobilisation + Electrotherapy",
        sessionDuration: 50, sessionsPerWeek: 2,
        instructions:
          "EN: 1) STM periscapular/cuff (10 min). 2) GH mobilisations grade III–IV, anterior/inferior glides (10 min). 3) MLS Laser (6 min). 4) US 1 MHz on capsule — 1.5 W/cm² pulsed before stretch (8 min). 5) IbraMed TENS (6 min). 6) Passive/active-assisted ROM exercises.\n" +
          "PT: 1) STM periscapular/manguito (10 min). 2) Mobilizações GH grau III–IV, deslizes anteriores/inferiores (10 min). 3) Laser MLS (6 min). 4) US 1 MHz cápsula — 1,5 W/cm² pulsado antes do alongamento (8 min). 5) IbraMed TENS (6 min). 6) Exercícios ADM passivos/assistidos.",
      },
      {
        phase: "MEDIUM_TERM", itemType: "HOME_EXERCISE", sortOrder: 3, startWeek: 7, endWeek: 14,
        title: "Daily ROM & Pendular Exercises / ADM Diária e Exercícios Pendulares",
        sets: 3, reps: 10, frequency: "Daily",
        instructions:
          "EN: Pendular (Codman) 5 min morning. Wall walks (flexion/abduction). Pulleys for passive stretch. External rotation stretch with stick.\n" +
          "PT: Pêndulo (Codman) 5 min de manhã. Escalada na parede (flexão/abdução). Polias para alongamento passivo. Alongamento rotação externa com bastão.",
      },
      {
        phase: "LONG_TERM", itemType: "HOME_EXERCISE", sortOrder: 4, startWeek: 15, endWeek: 20,
        title: "Rotator Cuff Strengthening / Fortalecimento do Manguito Rotador",
        sets: 3, reps: 12, frequency: "3x/week",
        instructions:
          "EN: ER with resistance band (0° and 45° abduction), IR, scaption, rows. Progress to overhead work as ROM allows.\n" +
          "PT: RE com elástico (0° e 45° abdução), RI, scaption, remadas. Progredir para trabalho acima da cabeça conforme ADM permite.",
      },
    ],
  },

  // ── 5. WHIPLASH ──────────────────────────────────────────────
  {
    name: "Whiplash / Traumatismo Cervical (WAD)",
    description:
      "EN: Whiplash-Associated Disorder. Screen thoroughly first (fracture, VBI, instability). Active management: early movement, education, reassurance.\n" +
      "PT: Distúrbio Associado ao Chicotada. Triagem rigorosa primeiro (fratura, VBI, instabilidade). Gestão ativa: movimento precoce, educação, tranquilização.",
    condition: "Whiplash-Associated Disorder / Traumatismo Cervical (WAD)",
    bodyRegion: "NECK_CERVICAL",
    equipment: [ELECTRO, LASER],
    category: "MSK Rehabilitation",
    estimatedWeeks: 8,
    sessionsPerWeek: 2,
    items: [
      {
        phase: "SHORT_TERM", itemType: "ASSESSMENT", sortOrder: 0, startWeek: 1, endWeek: 1,
        title: "Screening & Baseline / Triagem e Avaliação Inicial",
        instructions:
          "EN: Canadian C-spine rule (fracture clearance), VBI screen, upper-cervical ligament tests (Sharp-Purser, alar), cervical AROM, neuro screen (myotomes/dermatomes), WAD grade (Quebec 0–IV), NPRS.\n" +
          "PT: Regra Canadiana da Coluna Cervical, triagem VBI, testes ligamentares cervicais superiores, ADM cervical, triagem neurológica (miótomas/dermátomos), grau WAD Quebec 0–IV, NPRS.",
      },
      {
        phase: "SHORT_TERM", itemType: "IN_CLINIC", sortOrder: 1, startWeek: 1, endWeek: 4,
        title: "In-Clinic Session (Weeks 1–4) / Sessão Clínica (Semanas 1–4)",
        treatmentTypeName: "STM + Gentle mobilisation + Electrotherapy + Education",
        sessionDuration: 50, sessionsPerWeek: 2,
        instructions:
          "EN: ⚠️ Clear VBI and instability BEFORE mobilisation. 1) STM upper trap/levator/SCM/suboccipitals (12 min). 2) Cervical mobilisations grade I–II only (5 min). 3) IbraMed TENS cervical/upper trap pain relief (10 min). 4) MLS Laser upper cervical (6 min). 5) Active ROM education — avoid collar and rest. 6) Reassurance and education.\n" +
          "PT: ⚠️ Confirmar VBI e estabilidade ANTES de mobilizar. 1) STM trapézio superior/elevador/ECM/suboccipitais (12 min). 2) Mobilizações cervicais grau I–II (5 min). 3) IbraMed TENS dor cervical (10 min). 4) Laser MLS cervical superior (6 min). 5) Educação ADM ativa — evitar colar e repouso. 6) Tranquilização e educação.",
      },
      {
        phase: "SHORT_TERM", itemType: "HOME_CARE", sortOrder: 2, startWeek: 1, endWeek: 4,
        title: "Active Movement Education / Educação de Movimento Ativo",
        instructions:
          "EN: Gentle active cervical ROM exercises hourly. Heat for muscle guarding. Avoid collar and prolonged rest. Reassurance: movement is safe and helpful.\n" +
          "PT: Exercícios suaves de ADM cervical ativa de hora a hora. Calor para espasmo muscular. Evitar colar e repouso prolongado. Tranquilização: o movimento é seguro e útil.",
      },
      {
        phase: "MEDIUM_TERM", itemType: "HOME_EXERCISE", sortOrder: 3, startWeek: 5, endWeek: 8,
        title: "Deep Neck Flexor & Postural Strengthening / Fortalecimento Flexores Profundos",
        sets: 3, reps: 10, holdSeconds: 10, frequency: "Daily",
        instructions:
          "EN: Craniocervical flexion (chin tuck), deep neck flexor endurance (holds × 10s), postural correction exercise, upper-thoracic extension on roll.\n" +
          "PT: Flexão craniocervical (chin tuck), resistência dos flexores cervicais profundos (mantidas 10s), exercício de correção postural, extensão torácica superior em rolo.",
      },
    ],
  },

  // ── 6. SNAPPING HIP ──────────────────────────────────────────
  {
    name: "Snapping Hip / Coxa Saltans",
    description:
      "EN: Mechanical snapping of ITB/TFL over greater trochanter (external) or iliopsoas over iliopectineal eminence (internal). Classify first, then treat.\n" +
      "PT: Estalo mecânico da banda IT/TFL sobre o trocanter maior (externo) ou do iliopsoas sobre a eminência iliopectínea (interno). Classificar primeiro, depois tratar.",
    condition: "Snapping Hip / Coxa Saltans (Hip Clunk)",
    bodyRegion: "HIP",
    equipment: [LASER, US],
    category: "MSK Rehabilitation",
    estimatedWeeks: 8,
    sessionsPerWeek: 2,
    items: [
      {
        phase: "SHORT_TERM", itemType: "ASSESSMENT", sortOrder: 0, startWeek: 1, endWeek: 1,
        title: "Classify & Baseline / Classificação e Avaliação",
        instructions:
          "EN: Reproduce snap (Ober's/circumduction for external; hip flex-to-ext for internal). FADIR (screen labral). ITB & hip-flexor length. Glute-med strength. NPRS.\n" +
          "PT: Reproduzir estalo (Ober/circundução para externo; flexão-extensão anca para interno). FADIR (triagem labral). Comprimento banda IT e flexores. Força glúteo médio. NPRS.",
      },
      {
        phase: "SHORT_TERM", itemType: "IN_CLINIC", sortOrder: 1, startWeek: 1, endWeek: 4,
        title: "In-Clinic Session (Weeks 1–4) / Sessão Clínica (Semanas 1–4)",
        treatmentTypeName: "STM + Hip mobilisation + Laser",
        sessionDuration: 50, sessionsPerWeek: 2,
        instructions:
          "EN: 1) STM TFL/ITB/glutes (external) or iliopsoas/quads (internal) (12 min). 2) Hip mobilisations (5 min). 3) MLS Laser greater trochanter or iliopectineal region (6 min). 4) US 1 MHz on involved tendon (8 min). 5) ITB/hip-flexor stretch demo. 6) Glute-med loading intro.\n" +
          "PT: 1) STM TFL/banda IT/glúteos (externo) ou iliopsoas/quads (interno) (12 min). 2) Mobilizações da anca (5 min). 3) Laser MLS trocanter maior ou região iliopectínea (6 min). 4) US 1 MHz no tendão envolvido (8 min). 5) Alongamento TFL/flexores anca. 6) Introdução carga glúteo médio.",
      },
      {
        phase: "MEDIUM_TERM", itemType: "HOME_EXERCISE", sortOrder: 2, startWeek: 5, endWeek: 8,
        title: "Glute & Core Strengthening / Fortalecimento Glúteos e Core",
        sets: 3, reps: 15, frequency: "Daily",
        instructions:
          "EN: Glute-medius side-lying abduction, hip hitch, clamshell, single-leg stance progressions, hip external rotation strengthening.\n" +
          "PT: Abdução glúteo médio em decúbito lateral, hip hitch, clamshell, progressões monopodais, fortalecimento rotação externa da anca.",
      },
    ],
  },

  // ── 7. CHRONIC LOWER BACK PAIN ───────────────────────────────
  {
    name: "Chronic Low Back Pain / Dor Lombar Crónica",
    description:
      "EN: Non-specific CLBP (>12 weeks). Active biopsychosocial management: exercise, education, graded return to activity. Manual therapy as adjunct.\n" +
      "PT: Dor lombar crónica inespecífica (>12 semanas). Gestão ativa biopsicossocial: exercício, educação, retorno gradual à atividade. Terapia manual como adjuvante.",
    condition: "Chronic Low Back Pain / Dor Lombar Crónica Inespecífica (DLCI)",
    bodyRegion: "SPINE_LUMBAR",
    equipment: [ELECTRO, LASER],
    category: "MSK Rehabilitation",
    estimatedWeeks: 12,
    sessionsPerWeek: 2,
    items: [
      {
        phase: "SHORT_TERM", itemType: "ASSESSMENT", sortOrder: 0, startWeek: 1, endWeek: 1,
        title: "Red/Yellow Flag Screen & Baseline / Triagem Sinais de Alerta e Avaliação",
        instructions:
          "EN: RED FLAGS (cauda equina, fracture, malignancy, infection). YELLOW FLAGS (fear-avoidance, low mood). Lumbar AROM, SLR, neuro screen, NPRS, Oswestry.\n" +
          "PT: SINAIS VERMELHOS (síndrome cauda equina, fratura, malignidade, infeção). SINAIS AMARELOS (medo-evitamento, humor baixo). ADM lombar, SLR, triagem neurológica, NPRS, Oswestry.",
      },
      {
        phase: "SHORT_TERM", itemType: "IN_CLINIC", sortOrder: 1, startWeek: 1, endWeek: 4,
        title: "In-Clinic Session (Weeks 1–4) / Sessão Clínica (Semanas 1–4)",
        treatmentTypeName: "STM + Lumbar mobilisation + Electrotherapy + Education",
        sessionDuration: 50, sessionsPerWeek: 2,
        instructions:
          "EN: 1) STM paraspinals/QL/glutes (12 min). 2) Lumbar PA mobilisations (Maitland) (6 min). 3) IbraMed Interferential or TENS lumbar pain relief (10 min). 4) MLS Laser lumbar paraspinals (6 min). 5) Graded movement exercise (6 min). 6) Pain education + activity reassurance.\n" +
          "PT: 1) STM paravertebrais/QL/glúteos (12 min). 2) Mobilizações PA lombar (Maitland) (6 min). 3) IbraMed Interferencial ou TENS lombar (10 min). 4) Laser MLS musculatura paravertebral (6 min). 5) Exercício de movimento graduado (6 min). 6) Educação sobre dor + tranquilização.",
      },
      {
        phase: "SHORT_TERM", itemType: "HOME_CARE", sortOrder: 2, startWeek: 1, endWeek: 4,
        title: "Pain Education & Graded Activity / Educação sobre Dor e Atividade Graduada",
        instructions:
          "EN: Pain neuroscience education. Daily walking target (start 10 min, build weekly). Avoid prolonged sitting. Heat for comfort. Reassurance: movement is safe.\n" +
          "PT: Educação em neurociência da dor. Meta de caminhada diária (começar 10 min, aumentar semanalmente). Evitar sentar prolongado. Calor para conforto. Tranquilização: o movimento é seguro.",
      },
      {
        phase: "MEDIUM_TERM", itemType: "HOME_EXERCISE", sortOrder: 3, startWeek: 5, endWeek: 8,
        title: "Core & Movement Control / Controlo Motor e Core",
        sets: 3, reps: 10, holdSeconds: 10, frequency: "Daily",
        instructions:
          "EN: Transverse abdominis activation, bird-dog, dead bug, glute bridges, hip hinge education. Progress load and movement complexity.\n" +
          "PT: Ativação do transverso abdominal, bird-dog, dead bug, pontes de glúteos, educação da dobradiça da anca. Progredir carga e complexidade de movimento.",
      },
      {
        phase: "LONG_TERM", itemType: "HOME_EXERCISE", sortOrder: 4, startWeek: 9, endWeek: 12,
        title: "Progressive Strength & Return to Activity / Força Progressiva e Retorno às Atividades",
        sets: 3, reps: 12, frequency: "3x/week",
        instructions:
          "EN: Deadlift progression, loaded carries, squats. Aerobic exercise (walking/swimming/cycling). Address occupation/sport goals. Deload fear-avoidance beliefs.\n" +
          "PT: Progressão peso morto, transporte de carga, agachamentos. Exercício aeróbico (caminhada/natação/ciclismo). Objetivos ocupacionais/desportivos. Reduzir crenças de medo-evitamento.",
      },
    ],
  },

  // ── 8. RUNNER'S KNEE (ITB SYNDROME) ──────────────────────────
  {
    name: "Runner's Knee — ITB Syndrome / Síndrome da Banda IT",
    description:
      "EN: Overuse compression/friction of the ITB at the lateral femoral condyle. Driven by training-load spike and glute-medius weakness. Offload + glute strengthening.\n" +
      "PT: Compressão/fricção da banda IT no côndilo femoral lateral por sobreutilização. Associado a pico de carga e fraqueza do glúteo médio. Reduzir carga + fortalecimento.",
    condition: "Iliotibial Band Syndrome / Síndrome da Banda Iliotibial (Joelho do Corredor)",
    bodyRegion: "KNEE",
    equipment: [LASER, US, ELECTRO],
    category: "MSK Rehabilitation",
    estimatedWeeks: 8,
    sessionsPerWeek: 2,
    items: [
      {
        phase: "SHORT_TERM", itemType: "ASSESSMENT", sortOrder: 0, startWeek: 1, endWeek: 1,
        title: "Baseline Assessment / Avaliação Inicial",
        instructions:
          "EN: LFC palpation (2–3 cm above joint line), Noble compression test, Ober's test, glute-med strength, single-leg squat (dynamic valgus), NPRS.\n" +
          "PT: Palpação côndilo femoral lateral (2–3 cm acima da linha articular), teste de Noble, teste de Ober, força glúteo médio, agachamento monopodal (valgo dinâmico), NPRS.",
      },
      {
        phase: "SHORT_TERM", itemType: "IN_CLINIC", sortOrder: 1, startWeek: 1, endWeek: 4,
        title: "In-Clinic Session (Weeks 1–4) / Sessão Clínica (Semanas 1–4)",
        treatmentTypeName: "STM + Hip mobilisation + Electrotherapy",
        sessionDuration: 50, sessionsPerWeek: 2,
        instructions:
          "EN: 1) STM TFL/ITB/glutes/VL (12 min). 2) Hip mobilisations (5 min). 3) MLS Laser lateral femoral condyle (6 min). 4) US 1 MHz — 0.5 W/cm² pulsed on lateral condyle (8 min). 5) IbraMed TENS pain relief (8 min). 6) Glute-medius loading intro. 7) Running load management education.\n" +
          "PT: 1) STM TFL/banda IT/glúteos/vasto lateral (12 min). 2) Mobilizações anca (5 min). 3) Laser MLS côndilo femoral lateral (6 min). 4) US 1 MHz — 0,5 W/cm² pulsado no côndilo (8 min). 5) IbraMed TENS (8 min). 6) Introdução fortalecimento glúteo médio. 7) Gestão da carga de corrida.",
      },
      {
        phase: "MEDIUM_TERM", itemType: "HOME_EXERCISE", sortOrder: 2, startWeek: 5, endWeek: 8,
        title: "Glute-Medius Progressive Loading / Fortalecimento Progressivo Glúteo Médio",
        sets: 3, reps: 15, frequency: "Daily",
        instructions:
          "EN: Side-lying abduction, hip hitch (Trendelenburg control), lateral band walks, single-leg squat with knee tracking control. Cadence increase for running (170–180 steps/min).\n" +
          "PT: Abdução em decúbito lateral, hip hitch (controlo de Trendelenburg), banda lateral, agachamento monopodal com controlo do joelho. Aumento cadência corrida (170–180 passos/min).",
      },
    ],
  },

  // ── 9. TROCHANTERIC BURSITIS (GTPS) ──────────────────────────
  {
    name: "Trochanteric Bursitis / Síndrome Trocantérica (GTPS)",
    description:
      "EN: Greater Trochanteric Pain Syndrome — mostly gluteal (medius/minimus) tendinopathy. Compression-sensitive: reduce compressive load, progressive abductor loading.\n" +
      "PT: Síndrome de Dor Trocantérica — maioritariamente tendinopatia glútea (médio/mínimo). Sensível à compressão: reduzir carga compressiva, carga progressiva dos abdutores.",
    condition: "Greater Trochanteric Pain Syndrome / Síndrome de Dor Trocantérica (GTPS)",
    bodyRegion: "HIP",
    equipment: [LASER, US, ELECTRO],
    category: "MSK Rehabilitation",
    estimatedWeeks: 10,
    sessionsPerWeek: 2,
    items: [
      {
        phase: "SHORT_TERM", itemType: "ASSESSMENT", sortOrder: 0, startWeek: 1, endWeek: 1,
        title: "Baseline Assessment / Avaliação Inicial",
        instructions:
          "EN: Greater trochanter palpation, single-leg stance (30s), resisted hip abduction, Trendelenburg, FABER/Ober's, NPRS.\n" +
          "PT: Palpação trocanter maior, stance monopodal (30s), abdução anca resistida, Trendelenburg, FABER/Ober, NPRS.",
      },
      {
        phase: "SHORT_TERM", itemType: "IN_CLINIC", sortOrder: 1, startWeek: 1, endWeek: 4,
        title: "In-Clinic Session (Weeks 1–4) / Sessão Clínica (Semanas 1–4)",
        treatmentTypeName: "STM + Electrotherapy + Isometric loading",
        sessionDuration: 50, sessionsPerWeek: 2,
        instructions:
          "EN: AVOID ITB/adduction stretch (compresses tendon). 1) STM glutes/TFL (12 min). 2) Hip mobilisations (5 min). 3) MLS Laser greater trochanter (6 min). 4) US 1 MHz — pulsed 0.5 W/cm² lateral hip (8 min). 5) IbraMed TENS (8 min). 6) Isometric glute abduction holds 5×45s.\n" +
          "PT: EVITAR alongamento adução/banda IT (comprime o tendão). 1) STM glúteos/TFL (12 min). 2) Mobilizações anca (5 min). 3) Laser MLS trocanter maior (6 min). 4) US 1 MHz — pulsado 0,5 W/cm² anca lateral (8 min). 5) IbraMed TENS (8 min). 6) Isométrico abdução glútea 5×45s.",
      },
      {
        phase: "SHORT_TERM", itemType: "HOME_CARE", sortOrder: 2, startWeek: 1, endWeek: 4,
        title: "Compression Management / Gestão de Compressão",
        instructions:
          "EN: Avoid: crossing legs, side-lying on affected side, standing 'hanging' on one hip. Sleep with pillow between knees. Limit adduction in daily activities.\n" +
          "PT: Evitar: cruzar pernas, deitar sobre o lado afetado, estar em pé 'pendurado' numa anca. Dormir com almofada entre joelhos. Limitar adução nas atividades diárias.",
      },
      {
        phase: "MEDIUM_TERM", itemType: "HOME_EXERCISE", sortOrder: 3, startWeek: 5, endWeek: 10,
        title: "Progressive Hip Abductor Loading / Carga Progressiva dos Abdutores",
        sets: 3, reps: 15, frequency: "Daily",
        instructions:
          "EN: Isometric wall push → side-lying abduction → hip hitch → single-leg squat (no adduction) → lateral step-ups. Avoid adduction throughout.\n" +
          "PT: Isométrico empurra parede → abdução decúbito lateral → hip hitch → agachamento monopodal (sem adução) → step lateral. Evitar adução em todo o programa.",
      },
    ],
  },

  // ── 10. CARPAL TUNNEL SYNDROME ───────────────────────────────
  {
    name: "Carpal Tunnel Syndrome / Síndrome do Túnel Cárpico",
    description:
      "EN: Median nerve compression within the carpal tunnel. Conservative management: reduce pressure, restore nerve excursion, offload wrist. Refer if thenar wasting or severe deficit.\n" +
      "PT: Compressão do nervo mediano no túnel cárpico. Gestão conservadora: reduzir pressão, restaurar deslize do nervo, reduzir carga no pulso. Encaminhar se atrofia tenar ou défice grave.",
    condition: "Carpal Tunnel Syndrome / Síndrome do Túnel Cárpico (STC)",
    bodyRegion: "WRIST_HAND",
    equipment: [US, ELECTRO, LASER],
    category: "MSK Rehabilitation",
    estimatedWeeks: 8,
    sessionsPerWeek: 1,
    items: [
      {
        phase: "SHORT_TERM", itemType: "ASSESSMENT", sortOrder: 0, startWeek: 1, endWeek: 1,
        title: "Baseline Assessment / Avaliação Inicial",
        instructions:
          "EN: Phalen's test, reverse Phalen's, Tinel's sign, median ULNT, thenar wasting/strength (APB), grip/pinch strength, sensation (two-point discrimination), NPRS, Boston CTS Questionnaire.\n" +
          "PT: Teste de Phalen, Phalen invertido, sinal de Tinel, ULNT mediano, força/atrofia tenar (APB), força de preensão/pinça, sensação (discriminação dois pontos), NPRS, Questionário Boston STC.",
      },
      {
        phase: "SHORT_TERM", itemType: "IN_CLINIC", sortOrder: 1, startWeek: 1, endWeek: 4,
        title: "In-Clinic Session (Weeks 1–4) / Sessão Clínica (Semanas 1–4)",
        treatmentTypeName: "STM + Neural mobilisation + Electrotherapy",
        sessionDuration: 50, sessionsPerWeek: 1,
        instructions:
          "EN: ⚠️ Do NOT apply US directly over carpal tunnel or median nerve. 1) STM forearm flexors/pronators (12 min). 2) Wrist/carpal mobilisations (5 min). 3) Median nerve gliding (gentle — not tensioning) (6 min). 4) US 1 MHz — forearm only, 1 W/cm² (8 min). 5) IbraMed TENS wrist (8 min). 6) MLS Laser forearm. 7) Night splint fitting + ergonomic advice.\n" +
          "PT: ⚠️ NÃO aplicar US diretamente sobre o túnel cárpico ou nervo mediano. 1) STM flexores/pronadores antebraço (12 min). 2) Mobilizações carpianas/pulso (5 min). 3) Deslize do nervo mediano (suave — não tensão) (6 min). 4) US 1 MHz — antebraço apenas, 1 W/cm² (8 min). 5) IbraMed TENS pulso (8 min). 6) Laser MLS antebraço. 7) Ajuste de tala noturna + ergonomia.",
      },
      {
        phase: "SHORT_TERM", itemType: "HOME_CARE", sortOrder: 2, startWeek: 1, endWeek: 4,
        title: "Splinting & Ergonomics / Tala e Ergonomia",
        instructions:
          "EN: Neutral-wrist night splint (4–6 weeks minimum). Workstation ergonomics review. Avoid sustained wrist flexion/extension. Activity modification for repetitive grip.\n" +
          "PT: Tala noturna pulso neutro (mínimo 4–6 semanas). Revisão ergonómica do posto de trabalho. Evitar flexão/extensão sustentada do pulso. Modificar atividades com preensão repetitiva.",
      },
      {
        phase: "MEDIUM_TERM", itemType: "HOME_EXERCISE", sortOrder: 3, startWeek: 5, endWeek: 8,
        title: "Nerve Gliding & Grip Strengthening / Deslize Neural e Fortalecimento",
        sets: 3, reps: 10, frequency: "Twice daily",
        instructions:
          "EN: Median nerve gliding exercises (tendon glides: hook → full → straight → table-top → straight → OK). Gentle grip strengthening with therapy putty. Intrinsic hand exercises.\n" +
          "PT: Exercícios de deslize do nervo mediano (deslizes tendinosos: gancho → completo → reto → mesa → reto → OK). Fortalecimento suave preensão com massa terapêutica. Exercícios intrínsecos da mão.",
      },
    ],
  },
];

// ─── POST /api/admin/protocols/seed ────────────────────────────
export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = (session.user as any).role;
  if (!["ADMIN", "SUPERADMIN"].includes(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const userId = (session.user as any).id;
  const clinicId = (session.user as any).clinicId ?? null;

  const created: string[] = [];
  const errors: string[] = [];

  for (const p of PROTOCOLS) {
    try {
      const template = await (prisma as any).protocolTemplate.create({
        data: {
          name: p.name,
          description: p.description,
          condition: p.condition,
          bodyRegion: p.bodyRegion,
          equipment: p.equipment,
          category: p.category,
          estimatedWeeks: p.estimatedWeeks,
          sessionsPerWeek: p.sessionsPerWeek,
          clinicId,
          createdById: userId,
          items: {
            create: p.items.map((it, idx) => ({
              phase: it.phase,
              itemType: it.itemType,
              sortOrder: it.sortOrder ?? idx,
              title: it.title,
              description: null,
              instructions: it.instructions ?? null,
              treatmentTypeName: (it as any).treatmentTypeName ?? null,
              sessionDuration: (it as any).sessionDuration ?? null,
              sessionsPerWeek: (it as any).sessionsPerWeek ?? null,
              sets: (it as any).sets ?? null,
              reps: (it as any).reps ?? null,
              holdSeconds: (it as any).holdSeconds ?? null,
              frequency: (it as any).frequency ?? null,
              startWeek: it.startWeek ?? 1,
              endWeek: it.endWeek ?? null,
            })),
          },
        },
      });
      created.push(template.name);
    } catch (e: any) {
      errors.push(`${p.name}: ${e.message}`);
    }
  }

  return NextResponse.json({
    created: created.length,
    protocols: created,
    errors,
  }, { status: 201 });
}
