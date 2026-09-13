// Seeds the "ACL Reconstruction — Post-Operative Rehabilitation" protocol
// template (Bruno's request, 13/09/2026): a full 9-month, week-by-week,
// bilingual (EN/PT) hybrid clinic+home programme, built on the equipment
// he confirmed having — MLS Laser, NMES (Russian/Aussie current), stationary
// bike, treadmill, leg press/resistance machines, elastic bands, step,
// balance pad/BOSU — plus bodyweight + elastic band for the home-only days.
//
// Every home exercise is its own Exercise library entry (no videoUrl yet —
// Bruno is filming his own footage and will attach it per-exercise via the
// admin Exercises tab) linked to its protocol item via exerciseId, so once
// he does, each one shows up with a video player in the patient's own
// "My Exercises" tab — the same mechanism every other prescribed exercise
// already uses. Clinic-only items (assessments, in-clinic sessions, home
// care) don't need this: they're either supervised or informational.
//
// Idempotent — skips once the template exists, so re-running (every boot)
// never duplicates it and never overwrites a clinician's later edits. The
// first version of this script (13/09/2026, bundled multi-exercise items,
// no exerciseId links) shipped once before this per-exercise rewrite —
// SEED_VERSION lets that specific, already-live version get replaced
// exactly once; from here on, any template found is left untouched.
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const TEMPLATE_NAME = 'ACL Reconstruction — Post-Operative Rehabilitation';
const SEED_VERSION = 2;
const VERSION_MARKER_KEY = 'acl-protocol-seed-version';

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

// ─── Exercise library entries (one per distinct movement, reused across weeks with different sets/reps on the protocol item itself) ───
// bodyRegion: KNEE for most; CORE_ABDOMEN for plank/clamshell-adjacent; FULL_BODY for bike/running.
const EXERCISES = [
  { key: 'quad_sets', name: 'Quad Sets (Isometric)', namePt: 'Contração Isométrica de Quadríceps', bodyRegion: 'KNEE', difficulty: 'BEGINNER',
    description: 'Isometric quadriceps contraction — the earliest quad re-activation exercise after ACL reconstruction.', descriptionPt: 'Contração isométrica do quadríceps — o exercício mais precoce de reativação do quadríceps após reconstrução do LCA.',
    instructions: 'Lie or sit with the leg straight. Squeeze the thigh muscle, pushing the back of the knee down into the surface, without bending the knee. Hold, then relax.', instructionsPt: 'Deite-se ou sente-se com a perna esticada. Contraia o músculo da coxa, empurrando a parte de trás do joelho contra a superfície, sem dobrar o joelho. Segure e relaxe.',
    defaultSets: 4, defaultReps: 10, defaultHoldSec: 5, tags: ['post-surgery', 'ACL', 'early-phase'] },
  { key: 'ankle_pumps', name: 'Ankle Pumps', namePt: 'Bomba de Tornozelo', bodyRegion: 'ANKLE_FOOT', difficulty: 'BEGINNER',
    description: 'Rhythmic ankle flexion/extension — supports circulation and DVT prevention in the early post-op period.', descriptionPt: 'Flexão/extensão rítmica do tornozelo — apoia a circulação e a prevenção de TVP no período pós-operatório inicial.',
    instructions: 'Point the toes up toward you, then down away from you, in a slow, controlled rhythm.', instructionsPt: 'Aponte os dedos dos pés para cima, em sua direção, depois para baixo, para longe. Ritmo lento e controlado.',
    defaultSets: 3, defaultReps: 20, tags: ['post-surgery', 'early-phase', 'circulation'] },
  { key: 'heel_slides', name: 'Heel Slides', namePt: 'Deslizamento de Calcanhar', bodyRegion: 'KNEE', difficulty: 'BEGINNER',
    description: 'Active-assisted knee flexion, sliding the heel toward the buttock within a pain-free range.', descriptionPt: 'Flexão ativo-assistida do joelho, deslizando o calcanhar em direção ao glúteo dentro de uma amplitude sem dor.',
    instructions: 'Lying down, slide the heel of the operated leg toward your buttock, bending the knee as far as comfortable, then slide back down.', instructionsPt: 'Deitado(a), deslize o calcanhar da perna operada em direção ao glúteo, dobrando o joelho até onde for confortável, depois deslize de volta.',
    defaultSets: 3, defaultReps: 10, tags: ['post-surgery', 'ACL', 'ROM'] },
  { key: 'passive_extension', name: 'Passive Knee Extension (Heel Prop)', namePt: 'Extensão Passiva do Joelho (Calcanhar Apoiado)', bodyRegion: 'KNEE', difficulty: 'BEGINNER',
    description: 'Passive stretch into full knee extension using gravity — critical to avoid a flexion contracture after ACL surgery.', descriptionPt: 'Alongamento passivo até a extensão completa do joelho usando a gravidade — fundamental para evitar uma contratura em flexão após a cirurgia do LCA.',
    instructions: 'Prop the heel on a rolled towel or low support so the knee hangs freely, letting gravity gently straighten it. Relax into the stretch.', instructionsPt: 'Apoie o calcanhar numa toalha enrolada ou apoio baixo, deixando o joelho pendurado livremente, permitindo que a gravidade o estenda suavemente. Relaxe no alongamento.',
    tags: ['post-surgery', 'ACL', 'ROM', 'critical'] },
  { key: 'slr', name: 'Straight-Leg Raise', namePt: 'Elevação da Perna Reta', bodyRegion: 'KNEE', difficulty: 'BEGINNER',
    description: 'Hip flexor/quad strengthening with the knee held straight — only introduced once the quad set shows no extension lag.', descriptionPt: 'Fortalecimento de flexores de quadril/quadríceps com o joelho mantido esticado — só introduzido quando a contração do quadríceps não mostrar lag de extensão.',
    instructions: 'Lying down, tighten the thigh muscle fully, then lift the straight leg to the height of the opposite knee. Lower slowly and controlled.', instructionsPt: 'Deitado(a), contraia totalmente o músculo da coxa, depois eleve a perna esticada até a altura do joelho oposto. Desça devagar e de forma controlada.',
    defaultSets: 3, defaultReps: 10, tags: ['post-surgery', 'ACL', 'strengthening'] },
  { key: 'stationary_bike', name: 'Stationary Bike', namePt: 'Bike Ergométrica', bodyRegion: 'FULL_BODY', difficulty: 'BEGINNER',
    description: 'Low-impact cyclical motion to build knee flexion and cardiovascular tolerance.', descriptionPt: 'Movimento cíclico de baixo impacto para ganhar flexão do joelho e tolerância cardiovascular.',
    instructions: 'Seat raised so the knee doesn\'t need to bend past what\'s comfortable. Start with no/minimal resistance and progress as guided by the clinic.', instructionsPt: 'Selim elevado para que o joelho não precise dobrar além do confortável. Comece sem/com pouca resistência e progrida conforme orientado pela clínica.',
    tags: ['ACL', 'conditioning', 'ROM'] },
  { key: 'mini_squat', name: 'Mini-Squat', namePt: 'Mini-Agachamento', bodyRegion: 'KNEE', difficulty: 'BEGINNER',
    description: 'Partial-range double-leg squat, holding a support, to begin closed-chain quad/glute activation.', descriptionPt: 'Agachamento bipodal de amplitude parcial, com apoio, para iniciar a ativação em cadeia fechada de quadríceps/glúteos.',
    instructions: 'Holding a stable support, bend the knees to a comfortable partial range (guided by the clinic), keeping the knees tracking over the toes. Return to standing.', instructionsPt: 'Segurando um apoio estável, dobre os joelhos até uma amplitude parcial confortável (conforme orientado pela clínica), mantendo os joelhos alinhados com os dedos dos pés. Volte a ficar em pé.',
    defaultSets: 3, defaultReps: 12, tags: ['ACL', 'strengthening', 'closed-chain'] },
  { key: 'standing_hamstring_curl', name: 'Standing Hamstring Curl (Band)', namePt: 'Flexão de Joelho em Pé (Faixa Elástica)', bodyRegion: 'KNEE', difficulty: 'BEGINNER',
    description: 'Standing hamstring strengthening against light elastic-band resistance.', descriptionPt: 'Fortalecimento dos isquiotibiais em pé contra resistência leve de faixa elástica.',
    instructions: 'Band anchored in front, looped around the ankle. Bend the knee, bringing the heel toward the buttock against the band\'s resistance, then return slowly.', instructionsPt: 'Faixa presa à frente, em volta do tornozelo. Dobre o joelho, levando o calcanhar em direção ao glúteo contra a resistência da faixa, depois retorne devagar.',
    defaultSets: 3, defaultReps: 12, tags: ['ACL', 'strengthening', 'hamstring'] },
  { key: 'calf_raise_double', name: 'Calf Raise (Double-Leg)', namePt: 'Elevação de Panturrilha (Bipodal)', bodyRegion: 'ANKLE_FOOT', difficulty: 'BEGINNER',
    description: 'Bilateral calf strengthening, rising onto the toes.', descriptionPt: 'Fortalecimento bilateral da panturrilha, elevando-se sobre os dedos dos pés.',
    instructions: 'Standing with support if needed, rise up onto the toes of both feet, then lower slowly.', instructionsPt: 'Em pé, com apoio se necessário, eleve-se sobre os dedos de ambos os pés, depois desça devagar.',
    defaultSets: 3, defaultReps: 15, tags: ['ACL', 'strengthening', 'calf'] },
  { key: 'balance_double_leg', name: 'Double-Leg Balance (Progressive Surface)', namePt: 'Equilíbrio Bipodal (Superfície Progressiva)', bodyRegion: 'KNEE', difficulty: 'BEGINNER',
    description: 'Static double-leg balance, progressing from a firm to a soft/unstable surface.', descriptionPt: 'Equilíbrio bipodal estático, progredindo de superfície firme para macia/instável.',
    instructions: 'Stand with feet together on a firm surface, then progress to a folded towel or balance pad, holding position steadily.', instructionsPt: 'Fique de pé com os pés juntos numa superfície firme, depois progrida para uma toalha dobrada ou almofada de equilíbrio, mantendo a posição estável.',
    defaultHoldSec: 30, defaultSets: 3, tags: ['ACL', 'balance', 'proprioception'] },
  { key: 'band_squat', name: 'Squat (Band-Resisted)', namePt: 'Agachamento com Faixa Elástica', bodyRegion: 'KNEE', difficulty: 'INTERMEDIATE',
    description: 'Double-leg squat with a band around the thighs for added glute activation, progressing depth over time.', descriptionPt: 'Agachamento bipodal com faixa em volta das coxas para ativação glútea adicional, progredindo a profundidade ao longo do tempo.',
    instructions: 'Band around the thighs, just above the knees. Squat to the depth guided by the clinic, pressing the knees out against the band, keeping weight through the heels.', instructionsPt: 'Faixa em volta das coxas, logo acima dos joelhos. Agache até a profundidade orientada pela clínica, pressionando os joelhos para fora contra a faixa, mantendo o peso nos calcanhares.',
    defaultSets: 3, defaultReps: 12, tags: ['ACL', 'strengthening', 'glute'] },
  { key: 'step_down', name: 'Step-Down', namePt: 'Step-Down (Descida do Degrau)', bodyRegion: 'KNEE', difficulty: 'INTERMEDIATE',
    description: 'Controlled single-leg eccentric descent from a step — a key knee-control and quad-strength exercise.', descriptionPt: 'Descida excêntrica unipodal controlada de um degrau — exercício-chave de controlo do joelho e força de quadríceps.',
    instructions: 'Stand on a step on the operated leg. Slowly lower the other foot to lightly touch the floor, controlling the knee (no collapsing inward), then return to standing.', instructionsPt: 'Fique em pé num degrau, sobre a perna operada. Desça devagar o outro pé até tocar levemente o chão, controlando o joelho (sem colapsar para dentro), depois volte a ficar em pé.',
    defaultSets: 3, defaultReps: 10, tags: ['ACL', 'strengthening', 'eccentric'] },
  { key: 'balance_single_leg', name: 'Single-Leg Balance', namePt: 'Equilíbrio Unipodal', bodyRegion: 'KNEE', difficulty: 'INTERMEDIATE',
    description: 'Static single-leg balance, progressing eyes-open → eyes-closed → unstable surface.', descriptionPt: 'Equilíbrio unipodal estático, progredindo olhos abertos → olhos fechados → superfície instável.',
    instructions: 'Stand on the operated leg only. Hold position steadily; progress by closing the eyes or standing on a soft/unstable surface once the easier version is solid.', instructionsPt: 'Fique de pé apenas sobre a perna operada. Mantenha a posição estável; progrida fechando os olhos ou ficando numa superfície macia/instável assim que a versão mais fácil estiver sólida.',
    defaultHoldSec: 30, defaultSets: 3, tags: ['ACL', 'balance', 'proprioception'] },
  { key: 'hip_abd_ext_band', name: 'Standing Hip Abduction/Extension (Band)', namePt: 'Abdução/Extensão de Quadril em Pé (Faixa)', bodyRegion: 'HIP', difficulty: 'INTERMEDIATE',
    description: 'Standing hip strengthening in two directions against band resistance — supports pelvic/knee control.', descriptionPt: 'Fortalecimento de quadril em pé em duas direções contra resistência de faixa — apoia o controlo pélvico/do joelho.',
    instructions: 'Band around the ankles. Holding support for balance, move the operated leg out to the side (abduction) and then straight back (extension) against the band, controlled.', instructionsPt: 'Faixa em volta dos tornozelos. Segurando um apoio para o equilíbrio, mova a perna operada para o lado (abdução) e depois para trás (extensão) contra a faixa, de forma controlada.',
    defaultSets: 3, defaultReps: 15, tags: ['ACL', 'strengthening', 'hip'] },
  { key: 'single_leg_squat_box', name: 'Single-Leg Squat to Box', namePt: 'Agachamento Unipodal até o Banco', bodyRegion: 'KNEE', difficulty: 'INTERMEDIATE',
    description: 'Controlled single-leg sit-to-stand from a box or chair, progressing toward full single-leg squat strength.', descriptionPt: 'Sentar-levantar unipodal controlado, de um banco ou cadeira, progredindo rumo à força completa de agachamento unipodal.',
    instructions: 'Stand on the operated leg in front of a box/chair. Lower with control until lightly touching the seat, then stand back up without using the other leg for support.', instructionsPt: 'Fique de pé sobre a perna operada, à frente de um banco/cadeira. Desça com controlo até tocar levemente o assento, depois levante-se sem usar a outra perna de apoio.',
    defaultSets: 3, defaultReps: 10, tags: ['ACL', 'strengthening', 'single-leg'] },
  { key: 'lateral_band_walk', name: 'Lateral Band Walk', namePt: 'Caminhada Lateral com Faixa', bodyRegion: 'HIP', difficulty: 'INTERMEDIATE',
    description: 'Sideways stepping against band resistance for hip/glute control, directly supporting knee alignment.', descriptionPt: 'Passos laterais contra a resistência da faixa para controlo de quadril/glúteo, apoiando diretamente o alinhamento do joelho.',
    instructions: 'Band around the ankles or just above the knees, knees slightly bent. Step sideways against the band\'s resistance, keeping tension throughout; repeat in both directions.', instructionsPt: 'Faixa em volta dos tornozelos ou logo acima dos joelhos, joelhos levemente dobrados. Dê passos laterais contra a resistência da faixa, mantendo tensão o tempo todo; repita nas duas direções.',
    defaultSets: 3, defaultReps: 10, tags: ['ACL', 'strengthening', 'hip'] },
  { key: 'calf_raise_single', name: 'Calf Raise (Single-Leg)', namePt: 'Elevação de Panturrilha (Unipodal)', bodyRegion: 'ANKLE_FOOT', difficulty: 'INTERMEDIATE',
    description: 'Single-leg calf strengthening, progressing to full range off a step edge.', descriptionPt: 'Fortalecimento unipodal da panturrilha, progredindo para amplitude completa na borda de um degrau.',
    instructions: 'Standing on the operated leg (support nearby for balance), rise onto the toes, then lower slowly. Progress to doing this off the edge of a step for a fuller range.', instructionsPt: 'Em pé sobre a perna operada (apoio por perto para o equilíbrio), eleve-se sobre os dedos, depois desça devagar. Progrida fazendo isso na borda de um degrau para uma amplitude maior.',
    defaultSets: 3, defaultReps: 12, tags: ['ACL', 'strengthening', 'calf'] },
  { key: 'plank', name: 'Plank / Side-Plank', namePt: 'Prancha / Prancha Lateral', bodyRegion: 'CORE_ABDOMEN', difficulty: 'INTERMEDIATE',
    description: 'Core stability hold — a supporting exercise for overall trunk/hip control during rehab.', descriptionPt: 'Sustentação de estabilidade do core — exercício de apoio para o controlo geral de tronco/quadril durante a reabilitação.',
    instructions: 'Hold a front plank on forearms and toes, body in a straight line. Alternate with a side-plank on each side.', instructionsPt: 'Mantenha uma prancha frontal sobre os antebraços e os pés, corpo em linha reta. Alterne com prancha lateral de cada lado.',
    defaultHoldSec: 25, defaultSets: 3, tags: ['core', 'stability'] },
  { key: 'clamshell', name: 'Clamshell (Band)', namePt: 'Ostra (Faixa Elástica)', bodyRegion: 'HIP', difficulty: 'BEGINNER',
    description: 'Side-lying hip external rotation against band resistance — targets the glutes for knee-alignment control.', descriptionPt: 'Rotação externa de quadril deitado de lado, contra resistência de faixa — trabalha os glúteos para o controlo do alinhamento do joelho.',
    instructions: 'Lying on your side, knees bent, band above the knees. Keeping feet together, open the top knee upward against the band, then lower slowly.', instructionsPt: 'Deitado(a) de lado, joelhos dobrados, faixa acima dos joelhos. Mantendo os pés juntos, abra o joelho de cima para cima contra a faixa, depois desça devagar.',
    defaultSets: 3, defaultReps: 15, tags: ['ACL', 'strengthening', 'hip'] },
  { key: 'single_leg_deadlift', name: 'Single-Leg Deadlift (Bodyweight)', namePt: 'Levantamento Terra Unipodal (Peso Corporal)', bodyRegion: 'KNEE', difficulty: 'INTERMEDIATE',
    description: 'Single-leg hip-hinge for posterior-chain strength and balance, hand support as needed.', descriptionPt: 'Dobradiça de quadril unipodal para força da cadeia posterior e equilíbrio, com apoio de mão se necessário.',
    instructions: 'Standing on the operated leg, hinge forward at the hip, extending the other leg back for balance, until roughly parallel to the floor, then return to standing.', instructionsPt: 'Em pé sobre a perna operada, incline o tronco à frente a partir do quadril, estendendo a outra perna para trás para o equilíbrio, até ficar aproximadamente paralelo ao chão, depois volte a ficar em pé.',
    defaultSets: 3, defaultReps: 10, tags: ['ACL', 'strengthening', 'posterior-chain'] },
  { key: 'lateral_lunge', name: 'Lateral Lunge', namePt: 'Afundo Lateral', bodyRegion: 'KNEE', difficulty: 'INTERMEDIATE',
    description: 'Frontal-plane lunge, stepping sideways and sitting the hips back over the bent knee.', descriptionPt: 'Afundo no plano frontal, dando um passo lateral e sentando o quadril sobre o joelho dobrado.',
    instructions: 'Step sideways, bending the knee of the stepping leg and sitting the hips back, keeping the other leg straight. Push back to standing.', instructionsPt: 'Dê um passo lateral, dobrando o joelho da perna que deu o passo e sentando o quadril para trás, mantendo a outra perna esticada. Empurre de volta até ficar em pé.',
    defaultSets: 3, defaultReps: 10, tags: ['ACL', 'strengthening', 'frontal-plane'] },
  { key: 'monster_walk', name: 'Monster Walk (Band)', namePt: 'Monster Walk (Faixa Elástica)', bodyRegion: 'HIP', difficulty: 'INTERMEDIATE',
    description: 'Diagonal stepping against band resistance, combining hip abduction and forward drive.', descriptionPt: 'Passos diagonais contra resistência de faixa, combinando abdução de quadril e deslocamento à frente.',
    instructions: 'Band around the ankles, knees slightly bent, leaning slightly forward. Step diagonally forward, alternating legs, keeping tension on the band throughout.', instructionsPt: 'Faixa em volta dos tornozelos, joelhos levemente dobrados, tronco levemente inclinado à frente. Dê passos diagonais à frente, alternando as pernas, mantendo tensão na faixa o tempo todo.',
    defaultSets: 3, defaultReps: 10, tags: ['ACL', 'strengthening', 'hip'] },
  { key: 'running_progression', name: 'Guided Running Progression', namePt: 'Progressão de Corrida Guiada', bodyRegion: 'FULL_BODY', difficulty: 'INTERMEDIATE',
    description: 'Structured jog/run progression, volume and intensity set by the clinic week to week — not a fixed exercise.', descriptionPt: 'Progressão estruturada de trote/corrida, com volume e intensidade definidos pela clínica semana a semana — não é um exercício de carga fixa.',
    instructions: 'Follow exactly the distance/duration/pace agreed in the most recent clinic session. Do not increase volume or intensity faster than instructed, even if it feels comfortable.', instructionsPt: 'Siga exatamente a distância/duração/ritmo combinados na sessão mais recente na clínica. Não aumente o volume ou a intensidade mais rápido do que orientado, mesmo que pareça confortável.',
    tags: ['ACL', 'running', 'conditioning'] },
  { key: 'double_leg_hops', name: 'Double-Leg Small Hops', namePt: 'Pequenos Saltos Bipodais', bodyRegion: 'KNEE', difficulty: 'INTERMEDIATE',
    description: 'Low-amplitude double-leg hopping with soft landings — the entry point into plyometric loading.', descriptionPt: 'Pequenos saltos bipodais de baixa amplitude com aterragem suave — o ponto de entrada na carga pliométrica.',
    instructions: 'Small hops in place, landing softly with bent knees each time, absorbing the impact quietly. Progress to adding a quarter-turn once solid.', instructionsPt: 'Pequenos saltos no lugar, aterrando suavemente com os joelhos dobrados a cada vez, absorvendo o impacto silenciosamente. Progrida adicionando um quarto de giro assim que estiver sólido.',
    defaultSets: 3, defaultReps: 10, tags: ['ACL', 'plyometric'] },
  { key: 'lateral_bounds', name: 'Lateral Bounds', namePt: 'Saltos Laterais', bodyRegion: 'KNEE', difficulty: 'ADVANCED',
    description: 'Side-to-side bounding with a controlled landing — progresses from double-leg to single-leg as control improves.', descriptionPt: 'Saltos de lado a lado com aterragem controlada — progride de bipodal para unipodal conforme o controlo melhora.',
    instructions: 'Push off sideways, landing on the far leg with a soft, controlled bend, holding briefly before bounding back. Start double-leg, progress to single-leg landings.', instructionsPt: 'Impulsione-se para o lado, aterrando na perna oposta com uma flexão suave e controlada, segurando brevemente antes de saltar de volta. Comece bipodal, progrida para aterragens unipodais.',
    defaultSets: 3, defaultReps: 8, tags: ['ACL', 'plyometric', 'agility'] },
  { key: 'single_leg_balance_perturbation', name: 'Single-Leg Balance with Perturbation', namePt: 'Equilíbrio Unipodal com Perturbação', bodyRegion: 'KNEE', difficulty: 'ADVANCED',
    description: 'Single-leg balance challenged by an external perturbation (ball toss, partner push) — late-stage neuromuscular control.', descriptionPt: 'Equilíbrio unipodal desafiado por uma perturbação externa (lançamento de bola, empurrão de um parceiro) — controlo neuromuscular de fase tardia.',
    instructions: 'Standing on the operated leg, have a partner toss a ball to catch/return, or gently push-perturb from different directions, while maintaining balance.', instructionsPt: 'Em pé sobre a perna operada, peça a um parceiro para lançar uma bola para apanhar/devolver, ou empurrar/perturbar suavemente em diferentes direções, mantendo o equilíbrio.',
    defaultSets: 3, defaultReps: 10, tags: ['ACL', 'balance', 'advanced'] },
  { key: 'glute_bridge', name: 'Glute Bridge', namePt: 'Ponte Glútea', bodyRegion: 'HIP', difficulty: 'BEGINNER',
    description: 'Posterior-chain/glute activation exercise, part of the core-hip stability circuit.', descriptionPt: 'Exercício de ativação da cadeia posterior/glúteo, parte do circuito de estabilidade de core-quadril.',
    instructions: 'Lying on your back, knees bent, feet flat. Squeeze the glutes and lift the hips until the body forms a straight line from shoulders to knees, then lower slowly.', instructionsPt: 'Deitado(a) de costas, joelhos dobrados, pés apoiados. Contraia os glúteos e eleve o quadril até o corpo formar uma linha reta dos ombros aos joelhos, depois desça devagar.',
    defaultSets: 3, defaultReps: 15, tags: ['core', 'hip', 'stability'] },
  { key: 'single_leg_hop_distance', name: 'Single-Leg Hop for Distance', namePt: 'Salto Unipodal em Distância', bodyRegion: 'KNEE', difficulty: 'ADVANCED',
    description: 'Maximal single-leg hop, landing controlled and held — a return-to-sport testing and training staple.', descriptionPt: 'Salto unipodal máximo, com aterragem controlada e sustentada — um exercício clássico de teste e treino de retorno ao esporte.',
    instructions: 'Standing on the operated leg, hop forward as far as controlled, landing on the same leg and holding the landing steady for 2-3 seconds.', instructionsPt: 'Em pé sobre a perna operada, salte à frente o máximo controlado, aterrando na mesma perna e mantendo a aterragem estável por 2-3 segundos.',
    defaultSets: 3, defaultReps: 5, tags: ['ACL', 'plyometric', 'testing'] },
];

// itemType: ASSESSMENT | IN_CLINIC | HOME_EXERCISE | HOME_CARE
// phase (schema's own bands): SHORT_TERM = weeks 1-4, MEDIUM_TERM = weeks 4-12, LONG_TERM = 12+
// HOME_EXERCISE items below reference an exercise key resolved to a real exerciseId at creation time.
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
    instructions: '1) Patellar mobilisations (superior/inferior/medial/lateral glides) — 5 min.\n 2) Gentle passive extension overpressure (prone hang or heel-prop) — 5 min.\n 3) NMES (Russian/Aussie current) on quadriceps during active quad sets, 10-15 contractions, 10s on/50s off — 15 min.\n 4) MLS Laser over incision/effusion sites for pain and swelling — 6 min.\n 5) Gait re-training with crutches (surgeon\'s weight-bearing status), cryotherapy after session.',
    instructionsPt: '1) Mobilizações patelares (deslizamento superior/inferior/medial/lateral) — 5 min.\n 2) Sobrepressão suave em extensão passiva (prono ou apoio no calcanhar) — 5 min.\n 3) Corrente russa/aussie no quadríceps durante contrações ativas, 10-15 contrações, 10s liga/50s desliga — 15 min.\n 4) Laser MLS sobre a incisão e áreas de edema para dor e inchaço — 6 min.\n 5) Treino de marcha com muletas (conforme carga liberada pelo cirurgião), crioterapia ao final da sessão.',
  },
  { exerciseKey: 'quad_sets', phase: 'SHORT_TERM', itemType: 'HOME_EXERCISE', startWeek: 1, endWeek: 2, sets: 4, reps: 10, holdSeconds: 5, frequency: '4-5x/day' },
  { exerciseKey: 'ankle_pumps', phase: 'SHORT_TERM', itemType: 'HOME_EXERCISE', startWeek: 1, endWeek: 2, sets: 3, reps: 20, frequency: '4-5x/day' },
  { exerciseKey: 'heel_slides', phase: 'SHORT_TERM', itemType: 'HOME_EXERCISE', startWeek: 1, endWeek: 2, sets: 3, reps: 10, frequency: '3x/day' },
  { exerciseKey: 'passive_extension', phase: 'SHORT_TERM', itemType: 'HOME_EXERCISE', startWeek: 1, endWeek: 2, frequency: '3x/day, 10 min' },
  { exerciseKey: 'slr', phase: 'SHORT_TERM', itemType: 'HOME_EXERCISE', startWeek: 1, endWeek: 2, sets: 3, reps: 10, frequency: 'Daily (only once no extension lag)' },
  {
    phase: 'SHORT_TERM', itemType: 'HOME_CARE', startWeek: 1, endWeek: 2,
    title: 'Precautions & Swelling Control', titlePt: 'Precauções e Controlo do Edema',
    description: 'Brace/crutch use per surgeon, wound care, red flags to report immediately.',
    descriptionPt: 'Uso de órtese/muletas conforme cirurgião, cuidados com a ferida, sinais de alerta para reportar imediatamente.',
    instructions: 'Wear the post-op brace as prescribed (locked in extension for ambulation if instructed). Keep the wound clean and dry; watch for redness, warmth, increasing pain, fever or calf swelling/tenderness (possible DVT/infection) — contact the clinic immediately if any of these appear. Sleep with the leg elevated on pillows. No driving until off crutches and cleared by the surgeon. Ice 15-20 min, 4-5x/day; elevate above heart level. Weight-bear only as instructed by the surgeon.',
    instructionsPt: 'Usar a órtese pós-operatória conforme prescrito (travada em extensão para deambulação, se orientado). Manter a ferida limpa e seca; observar vermelhidão, calor, dor crescente, febre ou inchaço/dor na panturrilha (possível TVP/infeção) — contactar a clínica imediatamente se algum destes surgir. Dormir com a perna elevada em almofadas. Não conduzir até deixar as muletas e ter autorização do cirurgião. Gelo 15-20 min, 4-5x/dia; elevar acima do nível do coração. Carga só conforme orientado pelo cirurgião.',
  },

  // ── PHASE 2 — EARLY ROM & STRENGTH (Weeks 2-6) ───────────────────────
  {
    phase: 'SHORT_TERM', itemType: 'IN_CLINIC', startWeek: 3, endWeek: 4,
    title: 'Clinic Session — Weeks 3-4', titlePt: 'Sessão na Clínica — Semanas 3-4',
    treatmentTypeName: 'Manual therapy + NMES + Gait training', sessionDuration: 50, sessionsPerWeek: 2,
    description: 'Progress ROM toward 0-120°, wean off crutches per criteria, closed-chain activation begins.',
    descriptionPt: 'Progredir ADM até 0-120°, iniciar desmame das muletas por critérios, início da ativação em cadeia fechada.',
    instructions: '1) Scar mobilisation + patellar mobs — 5 min.\n 2) Manual/active-assisted flexion progression to 110-120° — 10 min.\n 3) NMES quad strengthening during mini-squats/wall sits — 15 min.\n 4) Closed-chain activation: mini-squats 0-30°, weight shifts — 10 min.\n 5) Gait analysis — wean crutches once: full active extension, no quad lag, minimal effusion, pain-free single-leg stance.\n 6) MLS Laser as needed for residual swelling/pain.',
    instructionsPt: '1) Mobilização de cicatriz + mobilização patelar — 5 min.\n 2) Progressão de flexão ativo-assistida até 110-120° — 10 min.\n 3) Fortalecimento do quadríceps com corrente russa durante mini-agachamentos/wall sits — 15 min.\n 4) Ativação em cadeia fechada: mini-agachamentos 0-30°, transferência de peso — 10 min.\n 5) Análise de marcha — desmame das muletas quando: extensão ativa completa, sem lag do quadríceps, edema mínimo, apoio unipodal sem dor.\n 6) Laser MLS conforme necessário para edema/dor residual.',
  },
  { exerciseKey: 'stationary_bike', phase: 'SHORT_TERM', itemType: 'HOME_EXERCISE', startWeek: 3, endWeek: 4, frequency: 'Daily, 10-15 min (once flexion ≥100°)' },
  { exerciseKey: 'mini_squat', phase: 'SHORT_TERM', itemType: 'HOME_EXERCISE', startWeek: 3, endWeek: 4, sets: 3, reps: 12, frequency: 'Daily' },
  { exerciseKey: 'standing_hamstring_curl', phase: 'SHORT_TERM', itemType: 'HOME_EXERCISE', startWeek: 3, endWeek: 4, sets: 3, reps: 12, frequency: 'Daily' },
  { exerciseKey: 'calf_raise_double', phase: 'SHORT_TERM', itemType: 'HOME_EXERCISE', startWeek: 3, endWeek: 4, sets: 3, reps: 15, frequency: 'Daily' },
  { exerciseKey: 'balance_double_leg', phase: 'SHORT_TERM', itemType: 'HOME_EXERCISE', startWeek: 3, endWeek: 4, sets: 3, holdSeconds: 30, frequency: 'Daily' },
  {
    phase: 'MEDIUM_TERM', itemType: 'IN_CLINIC', startWeek: 5, endWeek: 6,
    title: 'Clinic Session — Weeks 5-6', titlePt: 'Sessão na Clínica — Semanas 5-6',
    treatmentTypeName: 'Strength progression + Balance training', sessionDuration: 50, sessionsPerWeek: 2,
    description: 'Full ROM target, leg press introduction, single-leg balance, gait normalisation without brace (per surgeon).',
    descriptionPt: 'Meta de ADM completa, introdução do leg press, equilíbrio unipodal, normalização da marcha sem órtese (conforme cirurgião).',
    instructions: '1) ROM should be 0-135°+ by week 6 — manual overpressure if lagging.\n 2) Leg press introduction, bilateral, light load, high reps (2×15), full pain-free range.\n 3) Single-leg balance progressions — eyes open → eyes closed → unstable surface (BOSU), 3×30s.\n 4) Step-ups (4-6 inch step), 3×10 each leg.\n 5) NMES for any residual quad deficit.\n 6) Reassess gait — should be symmetric, no Trendelenburg or quad-avoidance pattern.',
    instructionsPt: '1) ADM deve estar em 0-135°+ até a semana 6 — sobrepressão manual se estiver atrasada.\n 2) Introdução do leg press, bilateral, carga leve, muitas repetições (2×15), amplitude completa sem dor.\n 3) Progressões de equilíbrio unipodal — olhos abertos → olhos fechados → superfície instável (BOSU), 3×30s.\n 4) Subida em step (10-15 cm), 3×10 cada perna.\n 5) Corrente russa para déficit residual de quadríceps, se houver.\n 6) Reavaliar a marcha — deve estar simétrica, sem Trendelenburg ou padrão de fuga do quadríceps.',
  },
  { exerciseKey: 'band_squat', phase: 'MEDIUM_TERM', itemType: 'HOME_EXERCISE', startWeek: 5, endWeek: 6, sets: 3, reps: 12, frequency: 'Daily' },
  { exerciseKey: 'step_down', phase: 'MEDIUM_TERM', itemType: 'HOME_EXERCISE', startWeek: 5, endWeek: 6, sets: 3, reps: 10, frequency: 'Daily' },
  { exerciseKey: 'balance_single_leg', phase: 'MEDIUM_TERM', itemType: 'HOME_EXERCISE', startWeek: 5, endWeek: 6, sets: 3, holdSeconds: 30, frequency: 'Daily' },
  { exerciseKey: 'stationary_bike', phase: 'MEDIUM_TERM', itemType: 'HOME_EXERCISE', startWeek: 5, endWeek: 6, frequency: 'Daily, 15-20 min, light resistance' },
  { exerciseKey: 'hip_abd_ext_band', phase: 'MEDIUM_TERM', itemType: 'HOME_EXERCISE', startWeek: 5, endWeek: 6, sets: 3, reps: 15, frequency: 'Daily' },

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
    instructions: '1) Leg press — bilateral progressing to single-leg, moderate load, 3×10-12.\n 2) Split squats / Bulgarian split squats (bodyweight → light load), 3×10 each leg.\n 3) Treadmill walking 15-20 min, flat, moderate pace, working toward normal cadence.\n 4) Balance/proprioception on BOSU — single-leg reach drills, 3×8 each direction.\n 5) MLS Laser/manual therapy for any residual stiffness.',
    instructionsPt: '1) Leg press — bilateral progredindo para unipodal, carga moderada, 3×10-12.\n 2) Agachamento afundo / búlgaro (peso corporal → carga leve), 3×10 cada perna.\n 3) Caminhada na esteira 15-20 min, plano, ritmo moderado, buscando cadência normal.\n 4) Equilíbrio/propriocepção no BOSU — alcance unipodal, 3×8 cada direção.\n 5) Laser MLS/terapia manual para rigidez residual, se houver.',
  },
  { exerciseKey: 'single_leg_squat_box', phase: 'MEDIUM_TERM', itemType: 'HOME_EXERCISE', startWeek: 7, endWeek: 9, sets: 3, reps: 10, frequency: 'Daily' },
  { exerciseKey: 'lateral_band_walk', phase: 'MEDIUM_TERM', itemType: 'HOME_EXERCISE', startWeek: 7, endWeek: 9, sets: 3, reps: 10, frequency: 'Daily' },
  { exerciseKey: 'calf_raise_single', phase: 'MEDIUM_TERM', itemType: 'HOME_EXERCISE', startWeek: 7, endWeek: 9, sets: 3, reps: 12, frequency: 'Daily' },
  { exerciseKey: 'plank', phase: 'MEDIUM_TERM', itemType: 'HOME_EXERCISE', startWeek: 7, endWeek: 9, sets: 3, holdSeconds: 25, frequency: 'Daily' },
  { exerciseKey: 'clamshell', phase: 'MEDIUM_TERM', itemType: 'HOME_EXERCISE', startWeek: 7, endWeek: 9, sets: 3, reps: 15, frequency: 'Daily' },
  {
    phase: 'MEDIUM_TERM', itemType: 'IN_CLINIC', startWeek: 10, endWeek: 12,
    title: 'Clinic Session — Weeks 10-12', titlePt: 'Sessão na Clínica — Semanas 10-12',
    treatmentTypeName: 'Strength symmetry + Jogging readiness screen', sessionDuration: 50, sessionsPerWeek: 2,
    description: 'Heavier resistance training, jogging-readiness testing, introduction of light jogging on treadmill if cleared.',
    descriptionPt: 'Treino de resistência mais pesado, teste de prontidão para trote, introdução de trote leve na esteira se liberado.',
    instructions: '1) Leg press, split squats, hamstring curls — progress load, 3×8-10.\n 2) Jogging-readiness screen: full pain-free ROM, no effusion, quad strength ≥70% of contralateral (manual/dynamometer estimate), single-leg squat with good control, single-leg hop without pain (submaximal).\n 3) If criteria met: introduce treadmill jogging intervals (e.g. 1 min jog/1 min walk × 8-10, flat, straight-line only) — start on treadmill, not outdoors, to control surface/speed.\n 4) Continue balance/proprioception progression.',
    instructionsPt: '1) Leg press, agachamento afundo, flexão de isquiotibiais — progredir a carga, 3×8-10.\n 2) Teste de prontidão para trote: ADM completa sem dor, sem edema, força de quadríceps ≥70% do lado contralateral (estimativa manual/dinamômetro), agachamento unipodal com bom controlo, salto unipodal submáximo sem dor.\n 3) Se os critérios forem cumpridos: introduzir intervalos de trote na esteira (ex. 1 min trote/1 min caminhada × 8-10, plano, só linha reta) — começar na esteira, não ao ar livre, para controlar superfície/velocidade.\n 4) Continuar progressão de equilíbrio/propriocepção.',
  },
  { exerciseKey: 'single_leg_deadlift', phase: 'MEDIUM_TERM', itemType: 'HOME_EXERCISE', startWeek: 10, endWeek: 12, sets: 3, reps: 10, frequency: '5-6x/week' },
  { exerciseKey: 'lateral_lunge', phase: 'MEDIUM_TERM', itemType: 'HOME_EXERCISE', startWeek: 10, endWeek: 12, sets: 3, reps: 10, frequency: '5-6x/week' },
  { exerciseKey: 'monster_walk', phase: 'MEDIUM_TERM', itemType: 'HOME_EXERCISE', startWeek: 10, endWeek: 12, sets: 3, reps: 10, frequency: '5-6x/week' },
  { exerciseKey: 'calf_raise_single', phase: 'MEDIUM_TERM', itemType: 'HOME_EXERCISE', startWeek: 10, endWeek: 12, sets: 3, reps: 15, frequency: '5-6x/week (full ROM off a step)' },
  { exerciseKey: 'stationary_bike', phase: 'MEDIUM_TERM', itemType: 'HOME_EXERCISE', startWeek: 10, endWeek: 12, frequency: '5-6x/week, 20 min intervals, moderate resistance' },

  // ── PHASE 4 — RUNNING PROGRESSION & ADVANCED STRENGTH (Months 3-5 / Weeks 12-20) ──
  {
    phase: 'LONG_TERM', itemType: 'IN_CLINIC', startWeek: 13, endWeek: 16,
    title: 'Clinic Session — Weeks 13-16', titlePt: 'Sessão na Clínica — Semanas 13-16',
    treatmentTypeName: 'Running progression + Plyometric foundation', sessionDuration: 50, sessionsPerWeek: 2,
    description: 'Outdoor running progression, double-leg landing mechanics, continued strength symmetry work.',
    descriptionPt: 'Progressão de corrida ao ar livre, mecânica de aterragem bipodal, continuação do trabalho de simetria de força.',
    instructions: '1) Progress treadmill jogging to continuous 15-20 min if pain/swelling-free, then transition outdoors on flat, even ground.\n 2) Double-leg jump-landing drills — box step-off to soft landing, focus on knee alignment (no valgus collapse), 3×8.\n 3) Leg press/split squats — continue progressive overload, 3×8.\n 4) Single-leg hop-and-stick (submaximal, controlled), 3×6 each leg.\n 5) Video/visual feedback on landing mechanics if available.',
    instructionsPt: '1) Progredir o trote na esteira para 15-20 min contínuos, se sem dor/edema, depois transicionar para ao ar livre em terreno plano e regular.\n 2) Exercícios de aterragem bipodal — descida de um degrau para aterragem suave, foco no alinhamento do joelho (sem colapso em valgo), 3×8.\n 3) Leg press/agachamento afundo — continuar sobrecarga progressiva, 3×8.\n 4) Salto unipodal com estabilização (submáximo, controlado), 3×6 cada perna.\n 5) Feedback visual/vídeo da mecânica de aterragem, se disponível.',
  },
  { exerciseKey: 'running_progression', phase: 'LONG_TERM', itemType: 'HOME_EXERCISE', startWeek: 13, endWeek: 16, frequency: 'Per clinic plan' },
  { exerciseKey: 'single_leg_squat_box', phase: 'LONG_TERM', itemType: 'HOME_EXERCISE', startWeek: 13, endWeek: 16, sets: 3, reps: 10, frequency: '5-6x/week (full depth tolerated)' },
  { exerciseKey: 'step_down', phase: 'LONG_TERM', itemType: 'HOME_EXERCISE', startWeek: 13, endWeek: 16, sets: 3, reps: 10, frequency: '5-6x/week (higher step)' },
  { exerciseKey: 'double_leg_hops', phase: 'LONG_TERM', itemType: 'HOME_EXERCISE', startWeek: 13, endWeek: 16, sets: 3, reps: 10, frequency: '5-6x/week' },
  { exerciseKey: 'lateral_band_walk', phase: 'LONG_TERM', itemType: 'HOME_EXERCISE', startWeek: 13, endWeek: 16, sets: 3, reps: 12, frequency: '5-6x/week' },
  {
    phase: 'LONG_TERM', itemType: 'IN_CLINIC', startWeek: 17, endWeek: 20,
    title: 'Clinic Session — Weeks 17-20', titlePt: 'Sessão na Clínica — Semanas 17-20',
    treatmentTypeName: 'Agility introduction + Single-leg plyometrics', sessionDuration: 50, sessionsPerWeek: 1,
    description: 'Introduce change-of-direction drills, single-leg plyometrics, heavier strength work.',
    descriptionPt: 'Introdução de exercícios de mudança de direção, pliometria unipodal, treino de força mais pesado.',
    instructions: '1) Agility ladder / cone drills — forward, lateral shuffle, controlled pace, 3-4 sets.\n 2) Single-leg hop for distance (submaximal, record distance for future symmetry testing), 3×5 each leg.\n 3) Lateral bounds (double-leg), controlled landing, 3×8.\n 4) Leg press heavy sets, 4×6-8.\n 5) Begin light sport-simulation drills specific to the patient\'s sport/activity if applicable.',
    instructionsPt: '1) Escada de agilidade / cones — para frente, deslocamento lateral, ritmo controlado, 3-4 séries.\n 2) Salto unipodal em distância (submáximo, registar a distância para teste de simetria futuro), 3×5 cada perna.\n 3) Saltos laterais (bipodal), aterragem controlada, 3×8.\n 4) Leg press séries pesadas, 4×6-8.\n 5) Iniciar exercícios leves de simulação esportiva específicos à modalidade do paciente, se aplicável.',
  },
  { exerciseKey: 'running_progression', phase: 'LONG_TERM', itemType: 'HOME_EXERCISE', startWeek: 17, endWeek: 20, frequency: 'Per clinic plan' },
  { exerciseKey: 'single_leg_squat_box', phase: 'LONG_TERM', itemType: 'HOME_EXERCISE', startWeek: 17, endWeek: 20, sets: 3, reps: 10, frequency: '4-5x/week (added band resistance)',
    note: 'This week: add a light elastic band around the thighs, just above the knees, for extra resistance on the way up.', notePt: 'Esta semana: adicione uma faixa elástica leve em volta das coxas, logo acima dos joelhos, para resistência extra na subida.' },
  { exerciseKey: 'double_leg_hops', phase: 'LONG_TERM', itemType: 'HOME_EXERCISE', startWeek: 17, endWeek: 20, sets: 3, reps: 8, frequency: '4-5x/week (with quarter-turn)' },
  { exerciseKey: 'single_leg_balance_perturbation', phase: 'LONG_TERM', itemType: 'HOME_EXERCISE', startWeek: 17, endWeek: 20, sets: 3, reps: 10, frequency: '4-5x/week' },
  { exerciseKey: 'glute_bridge', phase: 'LONG_TERM', itemType: 'HOME_EXERCISE', startWeek: 17, endWeek: 20, sets: 2, reps: 15, frequency: '4-5x/week (core/hip circuit with plank + clamshell)' },

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
    instructions: '1) Single-leg hops for distance/height, progressive, 3×6 each leg.\n 2) 45° and 90° cutting drills at controlled then increasing speed, 3-4 sets.\n 3) Deceleration drills (run-stop-hold), 3×6.\n 4) Sport-specific movement patterns (based on the patient\'s sport), building intensity.\n 5) Continue heavy strength training 1-2x/week (leg press, single-leg work).',
    instructionsPt: '1) Saltos unipodais em distância/altura, progressivos, 3×6 cada perna.\n 2) Exercícios de corte a 45° e 90° em velocidade controlada e depois crescente, 3-4 séries.\n 3) Exercícios de desaceleração (correr-parar-segurar), 3×6.\n 4) Padrões de movimento específicos do esporte (conforme a modalidade do paciente), aumentando a intensidade.\n 5) Continuar treino de força pesado 1-2x/semana (leg press, trabalho unipodal).',
  },
  { exerciseKey: 'single_leg_squat_box', phase: 'LONG_TERM', itemType: 'HOME_EXERCISE', startWeek: 21, endWeek: 24, sets: 3, reps: 10, frequency: '4-5x/week (band resistance)',
    note: 'Continue with the band around the thighs from the previous weeks, and try to reduce how much you lean on the box before standing.', notePt: 'Continue com a faixa em volta das coxas das semanas anteriores, e tente reduzir o quanto se apoia no banco antes de levantar.' },
  { exerciseKey: 'lateral_bounds', phase: 'LONG_TERM', itemType: 'HOME_EXERCISE', startWeek: 21, endWeek: 24, sets: 3, reps: 8, frequency: '4-5x/week' },
  { exerciseKey: 'single_leg_hop_distance', phase: 'LONG_TERM', itemType: 'HOME_EXERCISE', startWeek: 21, endWeek: 24, sets: 3, reps: 5, frequency: '3-4x/week, submaximal effort',
    note: 'Keep this well within a comfortable range — this is a practice drill for control, not a maximal-effort test.', notePt: 'Mantenha isso bem dentro de um range confortável — é um exercício de prática de controlo, não um teste de esforço máximo.' },
  { exerciseKey: 'running_progression', phase: 'LONG_TERM', itemType: 'HOME_EXERCISE', startWeek: 21, endWeek: 24, frequency: 'Per clinic plan (tempo/change-of-pace)' },
  { exerciseKey: 'glute_bridge', phase: 'LONG_TERM', itemType: 'HOME_EXERCISE', startWeek: 21, endWeek: 24, sets: 2, reps: 15, frequency: '4-5x/week (core/hip circuit)' },
  { exerciseKey: 'calf_raise_single', phase: 'LONG_TERM', itemType: 'HOME_EXERCISE', startWeek: 21, endWeek: 24, sets: 3, reps: 15, frequency: '4-5x/week (full ROM)' },
  {
    phase: 'LONG_TERM', itemType: 'IN_CLINIC', startWeek: 25, endWeek: 28,
    title: 'Clinic Session — Weeks 25-28', titlePt: 'Sessão na Clínica — Semanas 25-28',
    treatmentTypeName: 'Sport-specific training + Reactive agility', sessionDuration: 50, sessionsPerWeek: 1,
    description: 'Full-speed cutting/pivoting, reactive agility drills, non-contact sport-specific training.',
    descriptionPt: 'Corte/pivô em velocidade máxima, exercícios de agilidade reativa, treino específico do esporte sem contacto.',
    instructions: '1) Full-speed linear running, cutting and pivoting drills.\n 2) Reactive agility (unanticipated direction changes — verbal/visual cue), 3-4 sets.\n 3) Sport-specific non-contact drills — ball work, position-specific movement patterns as relevant.\n 4) Maintain strength training 1-2x/week.\n 5) Begin discussing return-to-sport timeline and criteria with the patient.',
    instructionsPt: '1) Corrida linear, corte e pivô em velocidade máxima.\n 2) Agilidade reativa (mudanças de direção não antecipadas — estímulo verbal/visual), 3-4 séries.\n 3) Exercícios específicos do esporte sem contacto — trabalho com bola, padrões de movimento específicos da posição, quando relevante.\n 4) Manter treino de força 1-2x/semana.\n 5) Começar a discutir com o paciente o cronograma e os critérios de retorno ao esporte.',
  },

  // ── PHASE 6 — RETURN-TO-SPORT PREPARATION & TESTING (Months 7-9 / Weeks 28-39) ──
  {
    phase: 'LONG_TERM', itemType: 'IN_CLINIC', startWeek: 29, endWeek: 32,
    title: 'Clinic Session — Weeks 29-32', titlePt: 'Sessão na Clínica — Semanas 29-32',
    treatmentTypeName: 'Full training integration', sessionDuration: 50, sessionsPerWeek: 1,
    description: 'Integrate into modified team/group training, continue strength and plyometric maintenance.',
    descriptionPt: 'Integração em treino de equipa/grupo modificado, manutenção de força e pliometria.',
    instructions: '1) Progress toward full-intensity, unrestricted training drills (still non-contact until formally cleared).\n 2) Continue plyometric and agility progression at full speed.\n 3) Strength training — maintenance/performance focus, 1-2x/week.\n 4) Monitor for any swelling, pain or apprehension after higher-load sessions — address promptly.',
    instructionsPt: '1) Progredir para exercícios de treino em intensidade total, sem restrições (ainda sem contacto até liberação formal).\n 2) Continuar a progressão de pliometria e agilidade em velocidade máxima.\n 3) Treino de força — foco em manutenção/performance, 1-2x/semana.\n 4) Monitorizar qualquer edema, dor ou apreensão após sessões de carga mais alta — resolver prontamente.',
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
    instructions: '1) If LSI targets not yet met on any test, focused loading/plyometric work on the deficit area, retest before contact clearance.\n 2) If cleared: graduated reintroduction to contact drills, then full team training, then competition, spaced across 2-3 weeks rather than all at once.\n 3) Maintain strength programme 1x/week through the season as injury-prevention maintenance.',
    instructionsPt: '1) Se as metas de LSI ainda não tiverem sido atingidas em algum teste, trabalho focado de carga/pliometria na área com défice, reteste antes da liberação para contacto.\n 2) Se liberado: reintrodução gradual a exercícios de contacto, depois treino completo de equipa, depois competição, espaçados ao longo de 2-3 semanas em vez de tudo de uma vez.\n 3) Manter o programa de força 1x/semana ao longo da temporada como manutenção de prevenção de lesão.',
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
  const versionMarker = await prisma.systemConfig.findUnique({ where: { key: VERSION_MARKER_KEY } });
  const currentVersion = versionMarker ? parseInt(versionMarker.value, 10) : 0;

  const existing = await prisma.protocolTemplate.findFirst({ where: { name: TEMPLATE_NAME }, select: { id: true } });

  if (existing && currentVersion >= SEED_VERSION) {
    console.log(`[seed-acl-protocol] "${TEMPLATE_NAME}" already at version ${currentVersion} — skipping.`);
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

  // Exercises live on a specific clinic (required field) — the same default
  // tenant resolution used elsewhere in this project.
  const clinic = await prisma.clinic.findFirst({
    where: { slug: 'bruno-physical-rehab' },
    select: { id: true },
  }) || await prisma.clinic.findFirst({ where: { isActive: true }, orderBy: { createdAt: 'asc' }, select: { id: true } });

  if (!clinic) {
    console.log('[seed-acl-protocol] No clinic exists yet — skipping until one does.');
    return;
  }

  // Everything from here runs in one transaction — a mid-way failure (as
  // happened once while writing this: Exercise.create needs `clinic:
  // {connect}}`, not a bare `clinicId` scalar, unlike most other models in
  // this codebase) must not leave the old template deleted with nothing to
  // replace it, or exercises created with no template linking them.
  const result = await prisma.$transaction(async (tx) => {
    if (existing && currentVersion < SEED_VERSION) {
      // One-time replacement of the older (bundled-item, no video-capable)
      // version already live — cascades to delete its items too.
      await tx.protocolTemplate.delete({ where: { id: existing.id } });
    }

    const exerciseIdByKey = {};
    for (const ex of EXERCISES) {
      const created = await tx.exercise.create({
        data: {
          clinic: { connect: { id: clinic.id } },
          createdBy: { connect: { id: author.id } },
          name: ex.name,
          namePt: ex.namePt,
          description: ex.description,
          descriptionPt: ex.descriptionPt,
          instructions: ex.instructions,
          instructionsPt: ex.instructionsPt,
          bodyRegion: ex.bodyRegion,
          difficulty: ex.difficulty,
          tags: ex.tags || [],
          defaultSets: ex.defaultSets ?? null,
          defaultReps: ex.defaultReps ?? null,
          defaultHoldSec: ex.defaultHoldSec ?? null,
          defaultRestSec: ex.defaultRestSec ?? null,
          // `duration` (schema: "Video duration in seconds") is deliberately
          // left null here, even for exercises like passive_extension/
          // stationary_bike that do have a real recommended hold/ride time —
          // that guidance already lives in the protocol item's own
          // `frequency` text ("3x/day, 10 min"); populating the video-length
          // field with it would show a misleading clip-length badge in the
          // admin Exercises grid before any video is actually attached.
          // No videoUrl yet — Bruno is filming his own footage per exercise
          // and will attach it via the admin Exercises tab once ready.
        },
        select: { id: true },
      });
      exerciseIdByKey[ex.key] = created.id;
    }

    const items = ITEMS.map((it, idx) => {
      if (it.exerciseKey) {
        const ex = EXERCISES.find((e) => e.key === it.exerciseKey);
        return {
          phase: it.phase,
          itemType: it.itemType,
          sortOrder: idx,
          title: ex.name,
          titlePt: ex.namePt,
          description: ex.description,
          descriptionPt: ex.descriptionPt,
          // A week-specific nuance (e.g. "add a band this week") that the
          // shared exercise's own base instructions can't carry, since the
          // same catalog entry is reused with different sets/reps across
          // several weeks. Appended, not replacing, the base instructions.
          instructions: it.note ? `${ex.instructions} ${it.note}` : ex.instructions,
          instructionsPt: it.notePt ? `${ex.instructionsPt} ${it.notePt}` : ex.instructionsPt,
          exerciseId: exerciseIdByKey[it.exerciseKey],
          sets: it.sets ?? null,
          reps: it.reps ?? null,
          holdSeconds: it.holdSeconds ?? null,
          restSeconds: it.restSeconds ?? null,
          frequency: it.frequency ?? null,
          startWeek: it.startWeek,
          endWeek: it.endWeek ?? null,
        };
      }
      return { ...it, sortOrder: idx };
    });

    const template = await tx.protocolTemplate.create({
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
        items: { create: items },
      },
    });

    await tx.systemConfig.upsert({
      where: { key: VERSION_MARKER_KEY },
      update: { value: String(SEED_VERSION) },
      create: {
        key: VERSION_MARKER_KEY,
        value: String(SEED_VERSION),
        label: 'ACL protocol seed version',
        description: 'Tracks which version of the ACL protocol template is live — bumped when the seed script replaces it with a newer structure (e.g. per-exercise items with video support).',
        category: 'migration',
        isSecret: false,
      },
    });

    return { templateId: template.id, itemCount: items.length };
  }, { timeout: 30000 });

  console.log(`[seed-acl-protocol] Created "${TEMPLATE_NAME}" (${result.templateId}) with ${result.itemCount} items and ${EXERCISES.length} exercises (v${SEED_VERSION}).`);
}

main()
  .catch((err) => console.error('[seed-acl-protocol] Error:', err.message))
  .finally(() => prisma.$disconnect());
