// Seeds the "ACL Reconstruction — Post-Operative Rehabilitation" protocol
// template (Bruno's request, 13/09/2026): a full 9-month, week-by-week,
// bilingual (EN/PT) hybrid clinic+home programme, built on the equipment
// he confirmed having — MLS Laser, NMES (Russian/Aussie current), stationary
// bike, treadmill, leg press/resistance machines, elastic bands, step,
// balance pad/BOSU — plus bodyweight + elastic band for the home-only days.
//
// Idempotent — true-once, like scripts/seed-book-content.js: skips if a
// template with this name already exists, so re-running (every boot) never
// duplicates it and never overwrites a clinician's later edits to it.
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const TEMPLATE_NAME = 'ACL Reconstruction — Post-Operative Rehabilitation';

const EQUIPMENT = [
  'MLS Laser',
  'Eletroterapia — Corrente Russa/Aussie (NMES)',
  'Bike Ergométrica',
  'Esteira',
  'Leg Press / Máquinas de Musculação',
  'Faixa Elástica',
  'Step',
  'Plataforma de Equilíbrio / BOSU',
];

const REFERENCES = [
  { citation: 'van Melick N, et al. Evidence-based clinical practice update: practice guidelines for anterior cruciate ligament rehabilitation based on a systematic review and multidisciplinary consensus. Br J Sports Med. 2016;50(24):1506-1515.', authors: 'van Melick et al.', year: 2016, journal: 'Br J Sports Med' },
  { citation: 'Grindem H, et al. Simple decision rules can reduce reinjury risk by 84% after ACL reconstruction: the Delaware-Oslo ACL cohort study. Br J Sports Med. 2016;50(13):804-808.', authors: 'Grindem et al.', year: 2016, journal: 'Br J Sports Med' },
  { citation: 'Kruse LM, Gray B, Wright RW. Rehabilitation after anterior cruciate ligament reconstruction: a systematic review. J Bone Joint Surg Am. 2012;94(19):1737-1748.', authors: 'Kruse, Gray, Wright', year: 2012, journal: 'J Bone Joint Surg Am' },
  { citation: 'Diermeier T, et al. Treatment after anterior cruciate ligament injury: Panther Symposium ACL Treatment Consensus Group. Br J Sports Med. 2021;55(1):14-22.', authors: 'Diermeier et al.', year: 2021, journal: 'Br J Sports Med' },
];

// itemType: ASSESSMENT | IN_CLINIC | HOME_EXERCISE | HOME_CARE
// phase (schema's own bands): SHORT_TERM = weeks 1-4, MEDIUM_TERM = weeks 4-12, LONG_TERM = 12+
const ITEMS = [
  // ── PHASE 1 — PROTECTION & EARLY MOTION (Weeks 0-2) ──────────────────
  {
    phase: 'SHORT_TERM', itemType: 'ASSESSMENT', startWeek: 1, endWeek: 1,
    title: 'Post-Op Baseline Assessment', titlePt: 'Avaliação Inicial Pós-Operatória',
    description: 'Surgical history, graft type, meniscal/chondral work, weight-bearing status, effusion, ROM, quad activation, precautions.',
    descriptionPt: 'Histórico cirúrgico, tipo de enxerto, procedimentos meniscais/condrais associados, status de carga, edema, ADM, ativação do quadríceps, precauções.',
    instructions: 'Confirm graft (hamstring/patellar/quad tendon), associated procedures (meniscus repair = slower flexion/weight-bearing progression), surgeon\'s weight-bearing and brace protocol. Measure effusion (sweep test), passive knee extension (goal 0°/hyperextension symmetric to other side), flexion, quad set quality (visible VMO contraction, no lag on SLR). Screen for DVT signs, wound status.',
    instructionsPt: 'Confirmar o enxerto (isquiotibiais/patelar/quadricipital), procedimentos associados (sutura de menisco = progressão mais lenta de flexão e carga), protocolo de carga e uso de órtese do cirurgião. Medir edema (sweep test), extensão passiva do joelho (meta: 0°/hiperextensão simétrica ao lado contralateral), flexão, qualidade da contração do quadríceps (VMO visível, sem lag na elevação da perna reta). Rastrear sinais de TVP e estado da ferida operatória.',
  },
  {
    phase: 'SHORT_TERM', itemType: 'IN_CLINIC', startWeek: 1, endWeek: 2,
    title: 'Clinic Session — Weeks 1-2', titlePt: 'Sessão na Clínica — Semanas 1-2',
    treatmentTypeName: 'Manual therapy + NMES + Laser', sessionDuration: 45, sessionsPerWeek: 2,
    description: 'Effusion/pain control, restore passive extension, patellar mobility, quad re-education via NMES.',
    descriptionPt: 'Controlo de edema/dor, restaurar extensão passiva, mobilidade patelar, reeducação do quadríceps via corrente russa.',
    instructions: '1) Patellar mobilisations (superior/inferior/medial/lateral glides) — 5 min. 2) Gentle passive extension overpressure (prone hang or heel-prop) — 5 min. 3) NMES (Russian/Aussie current) on quadriceps during active quad sets, 10-15 contractions, 10s on/50s off — 15 min. 4) MLS Laser over incision/effusion sites for pain and swelling — 6 min. 5) Gait re-training with crutches (surgeon\'s weight-bearing status), cryotherapy after session.',
    instructionsPt: '1) Mobilizações patelares (deslizamento superior/inferior/medial/lateral) — 5 min. 2) Sobrepressão suave em extensão passiva (prono ou apoio no calcanhar) — 5 min. 3) Corrente russa/aussie no quadríceps durante contrações ativas, 10-15 contrações, 10s liga/50s desliga — 15 min. 4) Laser MLS sobre a incisão e áreas de edema para dor e inchaço — 6 min. 5) Treino de marcha com muletas (conforme carga liberada pelo cirurgião), crioterapia ao final da sessão.',
  },
  {
    phase: 'SHORT_TERM', itemType: 'HOME_EXERCISE', startWeek: 1, endWeek: 2,
    title: 'Home Programme — Weeks 1-2', titlePt: 'Programa em Casa — Semanas 1-2',
    sets: 4, reps: 10, holdSeconds: 5, frequency: '4-5x/day',
    description: 'Quad sets, ankle pumps, heel slides, passive extension, straight-leg raise once no lag.',
    descriptionPt: 'Contrações isométricas de quadríceps, bomba de tornozelo, deslizamento de calcanhar, extensão passiva, elevação da perna reta assim que não houver lag.',
    instructions: '1) Quad sets (squeeze thigh, 5s hold) 4×10. 2) Ankle pumps 3×20 (DVT prevention). 3) Heel slides — slide heel toward buttock within pain-free range, 3×10. 4) Passive extension — heel propped on a rolled towel, 10 min, 3x/day. 5) Straight-leg raise (only once quad set shows no extension lag) 3×10. Ice 15-20 min, 4-5x/day; elevate above heart level. Weight-bear only as instructed by the surgeon.',
    instructionsPt: '1) Contração isométrica de quadríceps (contrair a coxa, segurar 5s) 4×10. 2) Bomba de tornozelo 3×20 (prevenção de TVP). 3) Deslizamento de calcanhar — deslizar o calcanhar em direção ao glúteo dentro do range sem dor, 3×10. 4) Extensão passiva — calcanhar apoiado numa toalha enrolada, 10 min, 3x/dia. 5) Elevação da perna reta (só quando a contração do quadríceps não mostrar lag de extensão) 3×10. Gelo 15-20 min, 4-5x/dia; elevar acima do nível do coração. Carga só conforme orientado pelo cirurgião.',
  },
  {
    phase: 'SHORT_TERM', itemType: 'HOME_CARE', startWeek: 1, endWeek: 2,
    title: 'Precautions & Swelling Control', titlePt: 'Precauções e Controlo do Edema',
    description: 'Brace/crutch use per surgeon, wound care, red flags to report immediately.',
    descriptionPt: 'Uso de órtese/muletas conforme cirurgião, cuidados com a ferida, sinais de alerta para reportar imediatamente.',
    instructions: 'Wear the post-op brace as prescribed (locked in extension for ambulation if instructed). Keep the wound clean and dry; watch for redness, warmth, increasing pain, fever or calf swelling/tenderness (possible DVT/infection) — contact the clinic immediately if any of these appear. Sleep with the leg elevated on pillows. No driving until off crutches and cleared by the surgeon.',
    instructionsPt: 'Usar a órtese pós-operatória conforme prescrito (travada em extensão para deambulação, se orientado). Manter a ferida limpa e seca; observar vermelhidão, calor, dor crescente, febre ou inchaço/dor na panturrilha (possível TVP/infeção) — contactar a clínica imediatamente se algum destes surgir. Dormir com a perna elevada em almofadas. Não conduzir até deixar as muletas e ter autorização do cirurgião.',
  },

  // ── PHASE 2 — EARLY ROM & STRENGTH (Weeks 2-6) ───────────────────────
  {
    phase: 'SHORT_TERM', itemType: 'IN_CLINIC', startWeek: 3, endWeek: 4,
    title: 'Clinic Session — Weeks 3-4', titlePt: 'Sessão na Clínica — Semanas 3-4',
    treatmentTypeName: 'Manual therapy + NMES + Gait training', sessionDuration: 50, sessionsPerWeek: 2,
    description: 'Progress ROM toward 0-120°, wean off crutches per criteria, closed-chain activation begins.',
    descriptionPt: 'Progredir ADM até 0-120°, iniciar desmame das muletas por critérios, início da ativação em cadeia fechada.',
    instructions: '1) Scar mobilisation + patellar mobs — 5 min. 2) Manual/active-assisted flexion progression to 110-120° — 10 min. 3) NMES quad strengthening during mini-squats/wall sits — 15 min. 4) Closed-chain activation: mini-squats 0-30°, weight shifts — 10 min. 5) Gait analysis — wean crutches once: full active extension, no quad lag, minimal effusion, pain-free single-leg stance. 6) MLS Laser as needed for residual swelling/pain.',
    instructionsPt: '1) Mobilização de cicatriz + mobilização patelar — 5 min. 2) Progressão de flexão ativo-assistida até 110-120° — 10 min. 3) Fortalecimento do quadríceps com corrente russa durante mini-agachamentos/wall sits — 15 min. 4) Ativação em cadeia fechada: mini-agachamentos 0-30°, transferência de peso — 10 min. 5) Análise de marcha — desmame das muletas quando: extensão ativa completa, sem lag do quadríceps, edema mínimo, apoio unipodal sem dor. 6) Laser MLS conforme necessário para edema/dor residual.',
  },
  {
    phase: 'SHORT_TERM', itemType: 'HOME_EXERCISE', startWeek: 3, endWeek: 4,
    title: 'Home Programme — Weeks 3-4', titlePt: 'Programa em Casa — Semanas 3-4',
    sets: 3, reps: 12, frequency: 'Daily',
    description: 'Stationary bike (no resistance), mini-squats, standing hamstring curls with band, calf raises, balance.',
    descriptionPt: 'Bike sem resistência, mini-agachamentos, flexão de joelho em pé com faixa elástica, elevação de panturrilha, equilíbrio.',
    instructions: '1) Stationary bike, seat raised, no/minimal resistance, 10-15 min daily once flexion ≥100°. 2) Mini-squats (0-45°) holding a support, 3×12. 3) Standing hamstring curls with light elastic band, 3×12 each side. 4) Double-leg calf raises, 3×15. 5) Double-leg balance on a firm then soft surface (folded towel), 3×30s. Continue quad sets/SLR from weeks 1-2 daily.',
    instructionsPt: '1) Bike ergométrica, selim elevado, sem/pouca resistência, 10-15 min diários assim que a flexão for ≥100°. 2) Mini-agachamentos (0-45°) com apoio, 3×12. 3) Flexão de joelho em pé com faixa elástica leve, 3×12 cada lado. 4) Elevação de panturrilha bipodal, 3×15. 5) Equilíbrio bipodal em superfície firme e depois macia (toalha dobrada), 3×30s. Continuar contrações de quadríceps/elevação de perna reta das semanas 1-2 diariamente.',
  },
  {
    phase: 'MEDIUM_TERM', itemType: 'IN_CLINIC', startWeek: 5, endWeek: 6,
    title: 'Clinic Session — Weeks 5-6', titlePt: 'Sessão na Clínica — Semanas 5-6',
    treatmentTypeName: 'Strength progression + Balance training', sessionDuration: 50, sessionsPerWeek: 2,
    description: 'Full ROM target, leg press introduction, single-leg balance, gait normalisation without brace (per surgeon).',
    descriptionPt: 'Meta de ADM completa, introdução do leg press, equilíbrio unipodal, normalização da marcha sem órtese (conforme cirurgião).',
    instructions: '1) ROM should be 0-135°+ by week 6 — manual overpressure if lagging. 2) Leg press introduction, bilateral, light load, high reps (2×15), full pain-free range. 3) Single-leg balance progressions — eyes open → eyes closed → unstable surface (BOSU), 3×30s. 4) Step-ups (4-6 inch step), 3×10 each leg. 5) NMES for any residual quad deficit. 6) Reassess gait — should be symmetric, no Trendelenburg or quad-avoidance pattern.',
    instructionsPt: '1) ADM deve estar em 0-135°+ até a semana 6 — sobrepressão manual se estiver atrasada. 2) Introdução do leg press, bilateral, carga leve, muitas repetições (2×15), amplitude completa sem dor. 3) Progressões de equilíbrio unipodal — olhos abertos → olhos fechados → superfície instável (BOSU), 3×30s. 4) Subida em step (10-15 cm), 3×10 cada perna. 5) Corrente russa para déficit residual de quadríceps, se houver. 6) Reavaliar a marcha — deve estar simétrica, sem Trendelenburg ou padrão de fuga do quadríceps.',
  },
  {
    phase: 'MEDIUM_TERM', itemType: 'HOME_EXERCISE', startWeek: 5, endWeek: 6,
    title: 'Home Programme — Weeks 5-6', titlePt: 'Programa em Casa — Semanas 5-6',
    sets: 3, reps: 12, frequency: 'Daily',
    description: 'Band-resisted squats, step-downs, single-leg balance, bike with light resistance.',
    descriptionPt: 'Agachamentos com faixa elástica, step-downs, equilíbrio unipodal, bike com resistência leve.',
    instructions: '1) Squats to 60-70° with band around thighs for glute activation, 3×12. 2) Step-downs from a low step, controlled, 3×10 each leg. 3) Single-leg balance, progressing surface/eyes-closed, 3×30s each leg. 4) Stationary bike 15-20 min, light resistance. 5) Standing hip abduction/extension with band, 3×15 each direction.',
    instructionsPt: '1) Agachamentos até 60-70° com faixa em volta das coxas para ativação glútea, 3×12. 2) Step-downs de um step baixo, controlado, 3×10 cada perna. 3) Equilíbrio unipodal, progredindo superfície/olhos fechados, 3×30s cada perna. 4) Bike ergométrica 15-20 min, resistência leve. 5) Abdução/extensão de quadril em pé com faixa, 3×15 cada direção.',
  },

  // ── PHASE 3 — PROGRESSIVE STRENGTHENING (Weeks 6-12) ─────────────────
  {
    phase: 'MEDIUM_TERM', itemType: 'ASSESSMENT', startWeek: 8, endWeek: 8,
    title: 'Mid-Point Reassessment (Week 8)', titlePt: 'Reavaliação Intermédia (Semana 8)',
    description: 'ROM, effusion, quad strength (manual or dynamometer if available), single-leg stance quality, gait.',
    descriptionPt: 'ADM, edema, força do quadríceps (manual ou dinamômetro se disponível), qualidade do apoio unipodal, marcha.',
    instructions: 'Confirm full symmetric ROM, no effusion, good single-leg stance control (30s, level pelvis), gait fully normalised without any device. Manual muscle test or dynamometry for quad/hamstring; document any side-to-side deficit to guide loading in the next phase. Clear to progress to leg-press/machine loading and closer-to-running preparation if criteria met.',
    instructionsPt: 'Confirmar ADM completa e simétrica, sem edema, boa qualidade de apoio unipodal (30s, pelve nivelada), marcha totalmente normalizada sem qualquer dispositivo de apoio. Teste manual de força ou dinamometria de quadríceps/isquiotibiais; documentar qualquer déficit entre os lados para guiar a carga na próxima fase. Liberar para progressão de carga em leg press/máquinas e preparação para corrida se os critérios forem cumpridos.',
  },
  {
    phase: 'MEDIUM_TERM', itemType: 'IN_CLINIC', startWeek: 7, endWeek: 9,
    title: 'Clinic Session — Weeks 7-9', titlePt: 'Sessão na Clínica — Semanas 7-9',
    treatmentTypeName: 'Progressive resistance training', sessionDuration: 50, sessionsPerWeek: 2,
    description: 'Leg press progression, single-leg strength work, treadmill walking, proprioception on unstable surfaces.',
    descriptionPt: 'Progressão de leg press, trabalho de força unipodal, caminhada na esteira, propriocepção em superfícies instáveis.',
    instructions: '1) Leg press — bilateral progressing to single-leg, moderate load, 3×10-12. 2) Split squats / Bulgarian split squats (bodyweight → light load), 3×10 each leg. 3) Treadmill walking 15-20 min, flat, moderate pace, working toward normal cadence. 4) Balance/proprioception on BOSU — single-leg reach drills, 3×8 each direction. 5) MLS Laser/manual therapy for any residual stiffness.',
    instructionsPt: '1) Leg press — bilateral progredindo para unipodal, carga moderada, 3×10-12. 2) Agachamento afundo / búlgaro (peso corporal → carga leve), 3×10 cada perna. 3) Caminhada na esteira 15-20 min, plano, ritmo moderado, buscando cadência normal. 4) Equilíbrio/propriocepção no BOSU — alcance unipodal, 3×8 cada direção. 5) Laser MLS/terapia manual para rigidez residual, se houver.',
  },
  {
    phase: 'MEDIUM_TERM', itemType: 'HOME_EXERCISE', startWeek: 7, endWeek: 9,
    title: 'Home Programme — Weeks 7-9', titlePt: 'Programa em Casa — Semanas 7-9',
    sets: 3, reps: 12, frequency: 'Daily',
    description: 'Single-leg squats to a box, lateral band walks, calf raise progression, core/hip stability.',
    descriptionPt: 'Agachamento unipodal até um banco, caminhada lateral com faixa, progressão de panturrilha, estabilidade de core/quadril.',
    instructions: '1) Single-leg squat to a box/chair (controlled sit-touch-stand), 3×10 each leg. 2) Lateral band walks (band around ankles or knees), 3×10 steps each direction. 3) Single-leg calf raises, 3×12. 4) Plank and side-plank for core stability, 3×20-30s. 5) Clamshells with band, 3×15 each side.',
    instructionsPt: '1) Agachamento unipodal até um banco/cadeira (sentar-tocar-levantar controlado), 3×10 cada perna. 2) Caminhada lateral com faixa (nos tornozelos ou joelhos), 3×10 passos cada direção. 3) Elevação de panturrilha unipodal, 3×12. 4) Prancha e prancha lateral para estabilidade de core, 3×20-30s. 5) Ostra (clamshell) com faixa, 3×15 cada lado.',
  },
  {
    phase: 'MEDIUM_TERM', itemType: 'IN_CLINIC', startWeek: 10, endWeek: 12,
    title: 'Clinic Session — Weeks 10-12', titlePt: 'Sessão na Clínica — Semanas 10-12',
    treatmentTypeName: 'Strength symmetry + Jogging readiness screen', sessionDuration: 50, sessionsPerWeek: 2,
    description: 'Heavier resistance training, jogging-readiness testing, introduction of light jogging on treadmill if cleared.',
    descriptionPt: 'Treino de resistência mais pesado, teste de prontidão para trote, introdução de trote leve na esteira se liberado.',
    instructions: '1) Leg press, split squats, hamstring curls — progress load, 3×8-10. 2) Jogging-readiness screen: full pain-free ROM, no effusion, quad strength ≥70% of contralateral (manual/dynamometer estimate), single-leg squat with good control, single-leg hop without pain (submaximal). 3) If criteria met: introduce treadmill jogging intervals (e.g. 1 min jog/1 min walk × 8-10, flat, straight-line only) — start on treadmill, not outdoors, to control surface/speed. 4) Continue balance/proprioception progression.',
    instructionsPt: '1) Leg press, agachamento afundo, flexão de isquiotibiais — progredir a carga, 3×8-10. 2) Teste de prontidão para trote: ADM completa sem dor, sem edema, força de quadríceps ≥70% do lado contralateral (estimativa manual/dinamômetro), agachamento unipodal com bom controlo, salto unipodal submáximo sem dor. 3) Se os critérios forem cumpridos: introduzir intervalos de trote na esteira (ex. 1 min trote/1 min caminhada × 8-10, plano, só linha reta) — começar na esteira, não ao ar livre, para controlar superfície/velocidade. 4) Continuar progressão de equilíbrio/propriocepção.',
  },
  {
    phase: 'MEDIUM_TERM', itemType: 'HOME_EXERCISE', startWeek: 10, endWeek: 12,
    title: 'Home Programme — Weeks 10-12', titlePt: 'Programa em Casa — Semanas 10-12',
    sets: 3, reps: 10, frequency: '5-6x/week',
    description: 'Single-leg strength progression, band-resisted lateral movement, stationary bike intervals.',
    descriptionPt: 'Progressão de força unipodal, movimento lateral com faixa, intervalos de bike ergométrica.',
    instructions: '1) Single-leg deadlift (bodyweight, hand support as needed), 3×10 each leg. 2) Lateral lunges, 3×10 each side. 3) Band-resisted monster walks, 3×10 steps each direction. 4) Single-leg calf raise off a step (full ROM), 3×15. 5) Bike intervals — moderate resistance, 20 min.',
    instructionsPt: '1) Levantamento terra unipodal (peso corporal, apoio de mão se necessário), 3×10 cada perna. 2) Afundo lateral, 3×10 cada lado. 3) Monster walk com faixa, 3×10 passos cada direção. 4) Elevação de panturrilha unipodal numa borda de step (amplitude completa), 3×15. 5) Intervalos de bike — resistência moderada, 20 min.',
  },

  // ── PHASE 4 — RUNNING PROGRESSION & ADVANCED STRENGTH (Months 3-5 / Weeks 12-20) ──
  {
    phase: 'LONG_TERM', itemType: 'IN_CLINIC', startWeek: 13, endWeek: 16,
    title: 'Clinic Session — Weeks 13-16', titlePt: 'Sessão na Clínica — Semanas 13-16',
    treatmentTypeName: 'Running progression + Plyometric foundation', sessionDuration: 50, sessionsPerWeek: 2,
    description: 'Outdoor running progression, double-leg landing mechanics, continued strength symmetry work.',
    descriptionPt: 'Progressão de corrida ao ar livre, mecânica de aterragem bipodal, continuação do trabalho de simetria de força.',
    instructions: '1) Progress treadmill jogging to continuous 15-20 min if pain/swelling-free, then transition outdoors on flat, even ground. 2) Double-leg jump-landing drills — box step-off to soft landing, focus on knee alignment (no valgus collapse), 3×8. 3) Leg press/split squats — continue progressive overload, 3×8. 4) Single-leg hop-and-stick (submaximal, controlled), 3×6 each leg. 5) Video/visual feedback on landing mechanics if available.',
    instructionsPt: '1) Progredir o trote na esteira para 15-20 min contínuos, se sem dor/edema, depois transicionar para ao ar livre em terreno plano e regular. 2) Exercícios de aterragem bipodal — descida de um degrau para aterragem suave, foco no alinhamento do joelho (sem colapso em valgo), 3×8. 3) Leg press/agachamento afundo — continuar sobrecarga progressiva, 3×8. 4) Salto unipodal com estabilização (submáximo, controlado), 3×6 cada perna. 5) Feedback visual/vídeo da mecânica de aterragem, se disponível.',
  },
  {
    phase: 'LONG_TERM', itemType: 'HOME_EXERCISE', startWeek: 13, endWeek: 16,
    title: 'Home Programme — Weeks 13-16', titlePt: 'Programa em Casa — Semanas 13-16',
    sets: 3, reps: 10, frequency: '5-6x/week',
    description: 'Interval running (per clinic progression), single-leg strength, landing-control drills.',
    descriptionPt: 'Corrida intervalada (conforme progressão da clínica), força unipodal, exercícios de controlo de aterragem.',
    instructions: '1) Continue the running progression agreed in clinic (do not increase volume/intensity faster than instructed). 2) Single-leg squats to full depth tolerated with good control, 3×10. 3) Step-downs from a higher step, controlled, 3×10 each leg. 4) Double-leg small hops in place, soft landings, 3×10. 5) Band-resisted lateral walks, 3×12 steps each direction.',
    instructionsPt: '1) Continuar a progressão de corrida combinada na clínica (não aumentar volume/intensidade mais rápido do que orientado). 2) Agachamento unipodal na profundidade tolerada com bom controlo, 3×10. 3) Step-downs de um step mais alto, controlado, 3×10 cada perna. 4) Pequenos saltos bipodais no lugar, aterragem suave, 3×10. 5) Caminhada lateral com faixa, 3×12 passos cada direção.',
  },
  {
    phase: 'LONG_TERM', itemType: 'IN_CLINIC', startWeek: 17, endWeek: 20,
    title: 'Clinic Session — Weeks 17-20', titlePt: 'Sessão na Clínica — Semanas 17-20',
    treatmentTypeName: 'Agility introduction + Single-leg plyometrics', sessionDuration: 50, sessionsPerWeek: 1,
    description: 'Introduce change-of-direction drills, single-leg plyometrics, heavier strength work.',
    descriptionPt: 'Introdução de exercícios de mudança de direção, pliometria unipodal, treino de força mais pesado.',
    instructions: '1) Agility ladder / cone drills — forward, lateral shuffle, controlled pace, 3-4 sets. 2) Single-leg hop for distance (submaximal, record distance for future symmetry testing), 3×5 each leg. 3) Lateral bounds (double-leg), controlled landing, 3×8. 4) Leg press heavy sets, 4×6-8. 5) Begin light sport-simulation drills specific to the patient\'s sport/activity if applicable.',
    instructionsPt: '1) Escada de agilidade / cones — para frente, deslocamento lateral, ritmo controlado, 3-4 séries. 2) Salto unipodal em distância (submáximo, registar a distância para teste de simetria futuro), 3×5 cada perna. 3) Saltos laterais (bipodal), aterragem controlada, 3×8. 4) Leg press séries pesadas, 4×6-8. 5) Iniciar exercícios leves de simulação esportiva específicos à modalidade do paciente, se aplicável.',
  },
  {
    phase: 'LONG_TERM', itemType: 'HOME_EXERCISE', startWeek: 17, endWeek: 20,
    title: 'Home Programme — Weeks 17-20', titlePt: 'Programa em Casa — Semanas 17-20',
    sets: 3, reps: 10, frequency: '4-5x/week',
    description: 'Continued running progression, single-leg plyometric groundwork, strength maintenance.',
    descriptionPt: 'Continuação da progressão de corrida, base pliométrica unipodal, manutenção da força.',
    instructions: '1) Running progression per clinic plan (distance/pace as agreed). 2) Single-leg squats with added band resistance, 3×10. 3) Double-leg small hops with a quarter-turn, soft landing, 3×8. 4) Single-leg balance with a ball toss or perturbation (partner or wall), 3×10 each leg. 5) Core/hip strength circuit (plank, side-plank, clamshells, bridges), 2 rounds.',
    instructionsPt: '1) Progressão de corrida conforme plano da clínica (distância/ritmo combinados). 2) Agachamento unipodal com resistência adicional de faixa, 3×10. 3) Pequenos saltos bipodais com um quarto de giro, aterragem suave, 3×8. 4) Equilíbrio unipodal com lançamento de bola ou perturbação (parceiro ou parede), 3×10 cada perna. 5) Circuito de força de core/quadril (prancha, prancha lateral, ostra, ponte), 2 voltas.',
  },

  // ── PHASE 5 — PLYOMETRICS, AGILITY & SPORT-SPECIFIC PREP (Months 5-7 / Weeks 20-28) ──
  {
    phase: 'LONG_TERM', itemType: 'ASSESSMENT', startWeek: 20, endWeek: 20,
    title: 'Hop Test Battery (Week 20)', titlePt: 'Bateria de Testes de Salto (Semana 20)',
    description: 'Single-leg hop for distance, triple hop, crossover hop, timed 6m hop — limb symmetry index.',
    descriptionPt: 'Salto unipodal em distância, salto triplo, salto cruzado, salto cronometrado de 6m — índice de simetria entre os membros.',
    instructions: 'Perform the standard 4-hop battery bilaterally: single hop for distance, triple hop for distance, crossover hop for distance, 6-metre timed hop. Calculate Limb Symmetry Index (LSI = involved/uninvolved × 100) for each. LSI <90% on any test flags that quality/power area for extra focus before progressing plyometric intensity. Document alongside quad/hamstring strength testing.',
    instructionsPt: 'Realizar a bateria padrão de 4 saltos bilateralmente: salto único em distância, salto triplo em distância, salto cruzado em distância, salto cronometrado de 6 metros. Calcular o Índice de Simetria entre Membros (LSI = envolvido/não envolvido × 100) para cada um. LSI <90% em qualquer teste sinaliza essa área de qualidade/potência para foco extra antes de progredir a intensidade pliométrica. Documentar junto com o teste de força de quadríceps/isquiotibiais.',
  },
  {
    phase: 'LONG_TERM', itemType: 'IN_CLINIC', startWeek: 21, endWeek: 24,
    title: 'Clinic Session — Weeks 21-24', titlePt: 'Sessão na Clínica — Semanas 21-24',
    treatmentTypeName: 'Plyometrics + Cutting/pivoting introduction', sessionDuration: 50, sessionsPerWeek: 1,
    description: 'Progress single-leg plyometrics, introduce cutting/pivoting drills, sport-specific conditioning.',
    descriptionPt: 'Progredir pliometria unipodal, introduzir exercícios de corte/pivô, condicionamento específico do esporte.',
    instructions: '1) Single-leg hops for distance/height, progressive, 3×6 each leg. 2) 45° and 90° cutting drills at controlled then increasing speed, 3-4 sets. 3) Deceleration drills (run-stop-hold), 3×6. 4) Sport-specific movement patterns (based on the patient\'s sport), building intensity. 5) Continue heavy strength training 1-2x/week (leg press, single-leg work).',
    instructionsPt: '1) Saltos unipodais em distância/altura, progressivos, 3×6 cada perna. 2) Exercícios de corte a 45° e 90° em velocidade controlada e depois crescente, 3-4 séries. 3) Exercícios de desaceleração (correr-parar-segurar), 3×6. 4) Padrões de movimento específicos do esporte (conforme a modalidade do paciente), aumentando a intensidade. 5) Continuar treino de força pesado 1-2x/semana (leg press, trabalho unipodal).',
  },
  {
    phase: 'LONG_TERM', itemType: 'HOME_EXERCISE', startWeek: 21, endWeek: 24,
    title: 'Home Programme — Weeks 21-24', titlePt: 'Programa em Casa — Semanas 21-24',
    sets: 3, reps: 8, frequency: '4-5x/week',
    description: 'Strength maintenance, plyometric groundwork, running progression toward interval/tempo work.',
    descriptionPt: 'Manutenção de força, base pliométrica, progressão de corrida rumo a treino intervalado/tempo.',
    instructions: '1) Single-leg squats/step-downs with band resistance, 3×10. 2) Double-leg then single-leg lateral bounds, controlled, 3×8. 3) Running — build toward tempo runs and change-of-pace as agreed with the clinic. 4) Core/hip circuit (plank variations, banded walks, bridges), 2-3 rounds. 5) Calf raise progression — single-leg, full ROM, 3×15.',
    instructionsPt: '1) Agachamento unipodal/step-downs com faixa de resistência, 3×10. 2) Saltos laterais bipodais e depois unipodais, controlados, 3×8. 3) Corrida — evoluir para tiros de ritmo (tempo run) e variação de ritmo conforme combinado com a clínica. 4) Circuito de core/quadril (variações de prancha, caminhada com faixa, ponte), 2-3 voltas. 5) Progressão de elevação de panturrilha — unipodal, amplitude completa, 3×15.',
  },
  {
    phase: 'LONG_TERM', itemType: 'IN_CLINIC', startWeek: 25, endWeek: 28,
    title: 'Clinic Session — Weeks 25-28', titlePt: 'Sessão na Clínica — Semanas 25-28',
    treatmentTypeName: 'Sport-specific training + Reactive agility', sessionDuration: 50, sessionsPerWeek: 1,
    description: 'Full-speed cutting/pivoting, reactive agility drills, non-contact sport-specific training.',
    descriptionPt: 'Corte/pivô em velocidade máxima, exercícios de agilidade reativa, treino específico do esporte sem contacto.',
    instructions: '1) Full-speed linear running, cutting and pivoting drills. 2) Reactive agility (unanticipated direction changes — verbal/visual cue), 3-4 sets. 3) Sport-specific non-contact drills — ball work, position-specific movement patterns as relevant. 4) Maintain strength training 1-2x/week. 5) Begin discussing return-to-sport timeline and criteria with the patient.',
    instructionsPt: '1) Corrida linear, corte e pivô em velocidade máxima. 2) Agilidade reativa (mudanças de direção não antecipadas — estímulo verbal/visual), 3-4 séries. 3) Exercícios específicos do esporte sem contacto — trabalho com bola, padrões de movimento específicos da posição, quando relevante. 4) Manter treino de força 1-2x/semana. 5) Começar a discutir com o paciente o cronograma e os critérios de retorno ao esporte.',
  },

  // ── PHASE 6 — RETURN-TO-SPORT PREPARATION & TESTING (Months 7-9 / Weeks 28-39) ──
  {
    phase: 'LONG_TERM', itemType: 'IN_CLINIC', startWeek: 29, endWeek: 32,
    title: 'Clinic Session — Weeks 29-32', titlePt: 'Sessão na Clínica — Semanas 29-32',
    treatmentTypeName: 'Full training integration', sessionDuration: 50, sessionsPerWeek: 1,
    description: 'Integrate into modified team/group training, continue strength and plyometric maintenance.',
    descriptionPt: 'Integração em treino de equipa/grupo modificado, manutenção de força e pliometria.',
    instructions: '1) Progress toward full-intensity, unrestricted training drills (still non-contact until formally cleared). 2) Continue plyometric and agility progression at full speed. 3) Strength training — maintenance/performance focus, 1-2x/week. 4) Monitor for any swelling, pain or apprehension after higher-load sessions — address promptly.',
    instructionsPt: '1) Progredir para exercícios de treino em intensidade total, sem restrições (ainda sem contacto até liberação formal). 2) Continuar a progressão de pliometria e agilidade em velocidade máxima. 3) Treino de força — foco em manutenção/performance, 1-2x/semana. 4) Monitorizar qualquer edema, dor ou apreensão após sessões de carga mais alta — resolver prontamente.',
  },
  {
    phase: 'LONG_TERM', itemType: 'ASSESSMENT', startWeek: 33, endWeek: 33,
    title: 'Return-to-Sport Test Battery (Week 33)', titlePt: 'Bateria de Testes de Retorno ao Esporte (Semana 33)',
    description: 'Repeat hop test battery, strength symmetry testing, psychological readiness (ACL-RSI), sport-specific movement screen.',
    descriptionPt: 'Repetir bateria de testes de salto, teste de simetria de força, prontidão psicológica (ACL-RSI), avaliação de movimento específica do esporte.',
    instructions: 'Repeat the 4-hop test battery and quad/hamstring strength testing — target LSI ≥90% on all measures before clearing higher-risk contact/pivoting sport. Administer the ACL-Return to Sport after Injury (ACL-RSI) questionnaire to screen psychological readiness/fear of reinjury. Movement-quality screen (single-leg squat, drop-jump) for any residual valgus or asymmetry. Document all results against pre-injury/contralateral baseline before any final clearance discussion with the surgeon.',
    instructionsPt: 'Repetir a bateria de 4 testes de salto e o teste de força de quadríceps/isquiotibiais — meta de LSI ≥90% em todas as medidas antes de liberar para esporte de contacto/pivô de maior risco. Aplicar o questionário ACL-RSI (Return to Sport after Injury) para rastrear a prontidão psicológica/medo de nova lesão. Avaliação de qualidade de movimento (agachamento unipodal, drop-jump) para qualquer valgo ou assimetria residual. Documentar todos os resultados face à referência pré-lesão/lado contralateral antes de qualquer discussão final de liberação com o cirurgião.',
  },
  {
    phase: 'LONG_TERM', itemType: 'IN_CLINIC', startWeek: 34, endWeek: 36,
    title: 'Clinic Session — Weeks 34-36', titlePt: 'Sessão na Clínica — Semanas 34-36',
    treatmentTypeName: 'Graduated return to contact/competition', sessionDuration: 50, sessionsPerWeek: 1,
    description: 'Address any gaps flagged by testing, graduated reintroduction to contact/competitive training.',
    descriptionPt: 'Corrigir eventuais défices apontados nos testes, reintrodução gradual ao contacto/treino competitivo.',
    instructions: '1) If LSI targets not yet met on any test, focused loading/plyometric work on the deficit area, retest before contact clearance. 2) If cleared: graduated reintroduction to contact drills, then full team training, then competition, spaced across 2-3 weeks rather than all at once. 3) Maintain strength programme 1x/week through the season as injury-prevention maintenance.',
    instructionsPt: '1) Se as metas de LSI ainda não tiverem sido atingidas em algum teste, trabalho focado de carga/pliometria na área com défice, reteste antes da liberação para contacto. 2) Se liberado: reintrodução gradual a exercícios de contacto, depois treino completo de equipa, depois competição, espaçados ao longo de 2-3 semanas em vez de tudo de uma vez. 3) Manter o programa de força 1x/semana ao longo da temporada como manutenção de prevenção de lesão.',
  },
  {
    phase: 'LONG_TERM', itemType: 'HOME_CARE', startWeek: 28, endWeek: 39,
    title: 'Long-Term Injury-Prevention Maintenance', titlePt: 'Manutenção de Prevenção de Lesão a Longo Prazo',
    description: 'Ongoing strength/neuromuscular maintenance and load-management principles beyond discharge.',
    descriptionPt: 'Manutenção contínua de força/controlo neuromuscular e princípios de gestão de carga após a alta.',
    instructions: 'Continue a strength and neuromuscular-control programme (2x/week minimum) indefinitely — ACL re-injury risk stays elevated for at least the first 1-2 years, especially in pivoting sports and under fatigue. Progress training load gradually after any break (illness, holiday); avoid sudden spikes in volume/intensity. Report any recurring swelling, giving-way sensation or apprehension to the clinic promptly rather than pushing through it.',
    instructionsPt: 'Continuar um programa de força e controlo neuromuscular (mínimo 2x/semana) indefinidamente — o risco de nova lesão do LCA permanece elevado durante pelo menos os primeiros 1-2 anos, especialmente em esportes de pivô e sob fadiga. Progredir a carga de treino gradualmente após qualquer pausa (doença, férias); evitar picos súbitos de volume/intensidade. Reportar qualquer edema recorrente, sensação de falseio ou apreensão à clínica prontamente, em vez de insistir apesar disso.',
  },
];

async function main() {
  const existing = await prisma.protocolTemplate.findFirst({ where: { name: TEMPLATE_NAME }, select: { id: true } });
  if (existing) {
    console.log(`[seed-acl-protocol] "${TEMPLATE_NAME}" already exists (${existing.id}) — skipping.`);
    return;
  }

  const author = await prisma.user.findFirst({
    where: { email: 'admin@bpr.clinic', role: { in: ['ADMIN', 'SUPERADMIN'] } },
    select: { id: true },
  }) || await prisma.user.findFirst({
    where: { role: { in: ['ADMIN', 'SUPERADMIN'] }, email: { not: { contains: 'example.test' } } },
    orderBy: { createdAt: 'asc' },
    select: { id: true },
  });

  if (!author) {
    console.log('[seed-acl-protocol] No ADMIN/SUPERADMIN account exists yet — skipping until one does.');
    return;
  }

  const template = await prisma.protocolTemplate.create({
    data: {
      name: TEMPLATE_NAME,
      namePt: 'Reabilitação Pós-Operatória de Reconstrução do LCA',
      description: 'Full 9-month, hybrid clinic + home rehabilitation programme following ACL reconstruction, with weekly progression across 6 evidence-based phases: protection, early ROM/strength, progressive strengthening, running progression, plyometrics/agility, and return-to-sport testing. Assumes graft protection and weight-bearing status are confirmed with the operating surgeon before starting.',
      descriptionPt: 'Programa completo de reabilitação híbrida (clínica + casa) de 9 meses após reconstrução do LCA, com progressão semanal em 6 fases baseadas em evidência: proteção, ADM/força inicial, fortalecimento progressivo, progressão de corrida, pliometria/agilidade e testes de retorno ao esporte. Pressupõe que a proteção do enxerto e o status de carga foram confirmados com o cirurgião antes de iniciar.',
      condition: 'ACL Reconstruction (Post-Operative)',
      bodyRegion: 'KNEE',
      equipment: EQUIPMENT,
      category: 'MSK Rehabilitation',
      estimatedWeeks: 39,
      sessionsPerWeek: 2,
      referencesJson: JSON.stringify(REFERENCES),
      createdById: author.id,
      items: {
        create: ITEMS.map((it, idx) => ({ ...it, sortOrder: idx })),
      },
    },
  });

  console.log(`[seed-acl-protocol] Created "${TEMPLATE_NAME}" (${template.id}) with ${ITEMS.length} items.`);
}

main()
  .catch((err) => console.error('[seed-acl-protocol] Error:', err.message))
  .finally(() => prisma.$disconnect());
