/**
 * BPR Journey — Core constants, level system, badge definitions, archetype system
 */

// ─── Design Tokens ───
export const BPR_TOKENS = {
  primary: "#2D9B8A",
  xpBar: "#F59E0B",
  streakFire: "#EF4444",
  levelBadge: "#8B5CF6",
  credits: "#10B981",
  locked: "#9CA3AF",
  exerciseRing: "#22C55E",
  consistencyRing: "#3B82F6",
  wellbeingRing: "#EAB308",
} as const;

// ─── Level System ───
export interface LevelDef {
  level: number;
  title: string;
  titlePt: string;
  xpRequired: number;
  avatarStage: number; // 1-5 visual stages
}

export const LEVEL_TITLES: LevelDef[] = [
  { level: 1,  title: "Recovery Starter",    titlePt: "Iniciante em Recuperação",   xpRequired: 0,     avatarStage: 1 },
  { level: 2,  title: "First Steps",         titlePt: "Primeiros Passos",           xpRequired: 100,   avatarStage: 1 },
  { level: 3,  title: "Recovery Warrior",    titlePt: "Guerreiro da Recuperação",   xpRequired: 250,   avatarStage: 1 },
  { level: 4,  title: "Consistent Mover",    titlePt: "Movimento Consistente",      xpRequired: 500,   avatarStage: 1 },
  { level: 5,  title: "Health Builder",      titlePt: "Construtor de Saúde",        xpRequired: 800,   avatarStage: 1 },
  { level: 6,  title: "Rising Strong",       titlePt: "Fortalecendo",               xpRequired: 1200,  avatarStage: 2 },
  { level: 7,  title: "Dedicated Healer",    titlePt: "Curador Dedicado",           xpRequired: 1700,  avatarStage: 2 },
  { level: 8,  title: "Wellness Seeker",     titlePt: "Buscador de Bem-Estar",      xpRequired: 2300,  avatarStage: 2 },
  { level: 9,  title: "Progress Champion",   titlePt: "Campeão de Progresso",       xpRequired: 3000,  avatarStage: 2 },
  { level: 10, title: "Elite Recoverer",     titlePt: "Recuperador de Elite",       xpRequired: 3800,  avatarStage: 2 },
  { level: 15, title: "Walking Tall",        titlePt: "De Pé Firme",               xpRequired: 4700,  avatarStage: 3 },
  { level: 20, title: "Rehab Warrior",       titlePt: "Guerreiro da Reabilitação",  xpRequired: 6000,  avatarStage: 3 },
  { level: 25, title: "Health Master",       titlePt: "Mestre da Saúde",           xpRequired: 8000,  avatarStage: 3 },
  { level: 30, title: "Movement Expert",     titlePt: "Especialista em Movimento",  xpRequired: 10000, avatarStage: 4 },
  { level: 40, title: "Recovery Legend",      titlePt: "Lenda da Recuperação",       xpRequired: 15000, avatarStage: 4 },
  { level: 50, title: "Unstoppable Force",   titlePt: "Força Imparável",            xpRequired: 20000, avatarStage: 4 },
  { level: 60, title: "Peak Performer",      titlePt: "Desempenho Máximo",          xpRequired: 28000, avatarStage: 5 },
  { level: 75, title: "BPR Champion",        titlePt: "Campeão BPR",               xpRequired: 40000, avatarStage: 5 },
  { level: 100,title: "BPR Legend",           titlePt: "Lenda BPR",                 xpRequired: 60000, avatarStage: 5 },
];

export function getLevelForXP(totalXp: number): LevelDef {
  let best = LEVEL_TITLES[0];
  for (const lvl of LEVEL_TITLES) {
    if (totalXp >= lvl.xpRequired) best = lvl;
    else break;
  }
  return best;
}

export function getXPToNextLevel(totalXp: number): { current: number; needed: number; next: LevelDef | null } {
  const currentLevel = getLevelForXP(totalXp);
  const idx = LEVEL_TITLES.indexOf(currentLevel);
  const nextLevel = idx < LEVEL_TITLES.length - 1 ? LEVEL_TITLES[idx + 1] : null;
  if (!nextLevel) return { current: totalXp - currentLevel.xpRequired, needed: 0, next: null };
  return {
    current: totalXp - currentLevel.xpRequired,
    needed: nextLevel.xpRequired - currentLevel.xpRequired,
    next: nextLevel,
  };
}

export function getAvatarStage(totalXp: number): number {
  return getLevelForXP(totalXp).avatarStage;
}

// ─── XP Rewards ───
export const XP_REWARDS = {
  complete_exercise: 10,
  complete_daily_mission: 50,
  complete_bonus_mission: 100,
  pain_checkin: 15,
  read_article: 10,
  body_assessment: 25,
  appointment_attended: 30,
  quiz_completed: 50,
  streak_3_days: 25,
  streak_7_days: 75,
  streak_14_days: 150,
  streak_30_days: 300,
  badge_unlocked: 20,
  community_high_five_given: 2,
  challenge_contributed: 5,
  referral_completed: 200,
} as const;

// ─── Badge Definitions ───
export interface BadgeDef {
  key: string;
  emoji: string;
  label: string;
  labelPt: string;
  description: string;
  descriptionPt: string;
  condition: string; // Human-readable unlock condition
  conditionPt: string;
  category: "milestone" | "streak" | "clinical" | "social" | "special";
}

export const BADGE_REGISTRY: BadgeDef[] = [
  // Milestones
  { key: "first_step", emoji: "🏅", label: "First Step", labelPt: "Primeiro Passo", description: "Complete your first exercise", descriptionPt: "Complete seu primeiro exercício", condition: "Complete 1 exercise", conditionPt: "Complete 1 exercício", category: "milestone" },
  { key: "ten_exercises", emoji: "💪", label: "Strong Start", labelPt: "Início Forte", description: "Complete 10 exercises", descriptionPt: "Complete 10 exercícios", condition: "Complete 10 exercises", conditionPt: "Complete 10 exercícios", category: "milestone" },
  { key: "fifty_exercises", emoji: "🏋️", label: "Exercise Champion", labelPt: "Campeão de Exercícios", description: "Complete 50 exercises", descriptionPt: "Complete 50 exercícios", condition: "Complete 50 exercises", conditionPt: "Complete 50 exercícios", category: "milestone" },
  { key: "hundred_exercises", emoji: "🌟", label: "Century Club", labelPt: "Clube dos Cem", description: "Complete 100 exercises", descriptionPt: "Complete 100 exercícios", condition: "Complete 100 exercises", conditionPt: "Complete 100 exercícios", category: "milestone" },
  { key: "first_appointment", emoji: "📅", label: "First Visit", labelPt: "Primeira Visita", description: "Attend your first appointment", descriptionPt: "Compareça à sua primeira consulta", condition: "Attend 1 appointment", conditionPt: "Compareça a 1 consulta", category: "milestone" },
  { key: "ten_sessions", emoji: "🎓", label: "Dedicated Patient", labelPt: "Paciente Dedicado", description: "Complete 10 sessions", descriptionPt: "Complete 10 sessões", condition: "Complete 10 sessions", conditionPt: "Complete 10 sessões", category: "milestone" },
  
  // Streaks
  { key: "streak_3", emoji: "🔥", label: "3-Day Streak", labelPt: "3 Dias Seguidos", description: "Exercise 3 days in a row", descriptionPt: "Exercite-se 3 dias seguidos", condition: "3-day streak", conditionPt: "Sequência de 3 dias", category: "streak" },
  { key: "streak_7", emoji: "🔥", label: "Weekly Warrior", labelPt: "Guerreiro Semanal", description: "Exercise 7 days in a row", descriptionPt: "Exercite-se 7 dias seguidos", condition: "7-day streak", conditionPt: "Sequência de 7 dias", category: "streak" },
  { key: "streak_14", emoji: "🔥", label: "Fortnight Fighter", labelPt: "Lutador Quinzenal", description: "Exercise 14 days in a row", descriptionPt: "Exercite-se 14 dias seguidos", condition: "14-day streak", conditionPt: "Sequência de 14 dias", category: "streak" },
  { key: "streak_30", emoji: "🔥", label: "Monthly Master", labelPt: "Mestre Mensal", description: "Exercise 30 days in a row", descriptionPt: "Exercite-se 30 dias seguidos", condition: "30-day streak", conditionPt: "Sequência de 30 dias", category: "streak" },
  
  // Clinical
  { key: "screening_done", emoji: "✅", label: "Health Check", labelPt: "Check-up de Saúde", description: "Complete medical screening", descriptionPt: "Complete o screening médico", condition: "Submit screening", conditionPt: "Envie o screening", category: "clinical" },
  { key: "posture_master", emoji: "🧘", label: "Posture Master", labelPt: "Mestre Postural", description: "Achieve 80+ posture score", descriptionPt: "Alcance score postural 80+", condition: "Posture score ≥ 80", conditionPt: "Score postural ≥ 80", category: "clinical" },
  { key: "body_assessed", emoji: "📊", label: "Body Aware", labelPt: "Corpo Consciente", description: "Complete a body assessment", descriptionPt: "Complete uma avaliação corporal", condition: "1 body assessment", conditionPt: "1 avaliação corporal", category: "clinical" },
  { key: "pain_tracker", emoji: "📉", label: "Pain Tracker", labelPt: "Rastreador de Dor", description: "Log pain 10 times", descriptionPt: "Registre dor 10 vezes", condition: "10 pain check-ins", conditionPt: "10 check-ins de dor", category: "clinical" },
  
  // Social
  { key: "high_fiver", emoji: "🙌", label: "High Fiver", labelPt: "Cumprimentador", description: "Give 10 high fives", descriptionPt: "Dê 10 high fives", condition: "10 high fives given", conditionPt: "10 high fives dados", category: "social" },
  { key: "ambassador", emoji: "🌟", label: "BPR Ambassador", labelPt: "Embaixador BPR", description: "Refer 3 friends", descriptionPt: "Indique 3 amigos", condition: "3 referrals", conditionPt: "3 indicações", category: "social" },
  
  // Special
  { key: "quiz_master", emoji: "🧬", label: "Self-Aware", labelPt: "Autoconhecimento", description: "Complete the archetype quiz", descriptionPt: "Complete o quiz de arquétipo", condition: "Complete quiz", conditionPt: "Complete o quiz", category: "special" },
  { key: "level_10", emoji: "⭐", label: "Rising Star", labelPt: "Estrela em Ascensão", description: "Reach Level 10", descriptionPt: "Alcance o Nível 10", condition: "Level 10", conditionPt: "Nível 10", category: "special" },
  { key: "level_25", emoji: "🏆", label: "Elite Member", labelPt: "Membro Elite", description: "Reach Level 25", descriptionPt: "Alcance o Nível 25", condition: "Level 25", conditionPt: "Nível 25", category: "special" },
];

export function getBadgeDef(key: string): BadgeDef | undefined {
  return BADGE_REGISTRY.find((b) => b.key === key);
}

// ─── Archetypes ───
export interface ArchetypeDef {
  key: string;
  emoji: string;
  name: string;
  namePt: string;
  description: string;
  descriptionPt: string;
  recommendations: string[];
  recommendationsPt: string[];
  color: string;
}

export const ARCHETYPES: ArchetypeDef[] = [
  {
    key: "executive",
    emoji: "⚡",
    name: "The Determined Executive",
    namePt: "O Executivo Determinado",
    description: "High motivation but inconsistent due to a busy schedule. You need smart reminders during high-workload days.",
    descriptionPt: "Alta motivação, mas inconsistente por conta da agenda. Precisa de lembretes inteligentes nos dias de alta carga.",
    recommendations: [
      "Set 5-minute micro-exercise breaks between meetings",
      "Use morning routines before the day gets busy",
      "Track progress weekly, not daily, to avoid frustration",
    ],
    recommendationsPt: [
      "Defina pausas de 5 minutos para micro-exercícios entre reuniões",
      "Use rotinas matinais antes do dia ficar agitado",
      "Acompanhe progresso semanalmente, não diariamente",
    ],
    color: "#F59E0B",
  },
  {
    key: "methodical",
    emoji: "🧘",
    name: "The Methodical Patient",
    namePt: "O Paciente Metódico",
    description: "You follow everything perfectly but need variety to stay motivated. Routine can become monotonous.",
    descriptionPt: "Segue tudo perfeitamente, mas precisa de variedade para não desanimar. A rotina pode ficar monótona.",
    recommendations: [
      "Try different exercise variations each week",
      "Set mini-challenges to keep things interesting",
      "Join community challenges for social motivation",
    ],
    recommendationsPt: [
      "Tente variações diferentes de exercícios a cada semana",
      "Crie mini-desafios para manter o interesse",
      "Participe de desafios da comunidade para motivação social",
    ],
    color: "#8B5CF6",
  },
  {
    key: "athlete",
    emoji: "🏃",
    name: "The Recovering Athlete",
    namePt: "O Atleta em Recuperação",
    description: "You want to get back fast and tend to push too hard. Patience and controlled progression are key.",
    descriptionPt: "Quer voltar rápido e tende a forçar demais. Paciência e progressão controlada são essenciais.",
    recommendations: [
      "Follow the prescribed intensity — don't go beyond",
      "Use recovery days as active rest, not extra training",
      "Monitor pain levels after each session to avoid setbacks",
    ],
    recommendationsPt: [
      "Siga a intensidade prescrita — não ultrapasse",
      "Use dias de recuperação como descanso ativo, não treino extra",
      "Monitore níveis de dor após cada sessão para evitar retrocesso",
    ],
    color: "#EF4444",
  },
  {
    key: "cautious",
    emoji: "🌱",
    name: "The Cautious Beginner",
    namePt: "O Iniciante Cauteloso",
    description: "Afraid of making things worse. You need constant positive reinforcement and gentle progression.",
    descriptionPt: "Medo de piorar. Precisa de reforço positivo constante e progressão suave.",
    recommendations: [
      "Start with the easiest exercises and build confidence",
      "Celebrate every small win — they add up fast",
      "Remember: movement is medicine, not a risk",
    ],
    recommendationsPt: [
      "Comece com os exercícios mais fáceis e construa confiança",
      "Celebre cada pequena vitória — elas se acumulam rápido",
      "Lembre-se: movimento é remédio, não risco",
    ],
    color: "#22C55E",
  },
];

export function getArchetype(key: string): ArchetypeDef | undefined {
  return ARCHETYPES.find((a) => a.key === key);
}

// ─── Default Mission Templates ───
export const DEFAULT_MISSION_TASKS = [
  { key: "complete_exercises", label: "Complete 2 exercises from Treatment Plan", labelPt: "Complete 2 exercícios do Plano de Tratamento", xp: 20 },
  { key: "pain_checkin", label: "Do a pain check-in", labelPt: "Faça um check-in de dor", xp: 15 },
  { key: "read_article", label: "Read 1 educational article", labelPt: "Leia 1 artigo educativo", xp: 10 },
];

export const BONUS_MISSION_TASKS = [
  { key: "body_assessment", label: "Complete a body assessment", labelPt: "Complete uma avaliação corporal", xp: 25 },
  { key: "community_high_five", label: "Give 3 high fives in the community", labelPt: "Dê 3 high fives na comunidade", xp: 10 },
  { key: "share_victory", label: "Share a victory in the community", labelPt: "Compartilhe uma vitória na comunidade", xp: 15 },
];

// ─── Quiz Questions ───
export interface QuizQuestion {
  id: string;
  question: string;
  questionPt: string;
  icon: string;
  options: { key: string; label: string; labelPt: string; points: Record<string, number> }[];
  conditionalNext?: Record<string, string>; // key -> next question id
}

export const QUIZ_QUESTIONS: QuizQuestion[] = [
  {
    id: "q1",
    question: "How would you describe your daily schedule?",
    questionPt: "Como você descreveria sua rotina diária?",
    icon: "📅",
    options: [
      { key: "very_busy", label: "Packed — barely have time to breathe", labelPt: "Lotada — mal tenho tempo de respirar", points: { executive: 3, athlete: 1 } },
      { key: "structured", label: "Well-organized with clear routines", labelPt: "Bem organizada com rotinas claras", points: { methodical: 3 } },
      { key: "active", label: "Training-focused, built around workouts", labelPt: "Focada em treinos, construída ao redor de exercícios", points: { athlete: 3 } },
      { key: "flexible", label: "Flexible but sometimes unproductive", labelPt: "Flexível, mas às vezes improdutiva", points: { cautious: 2, methodical: 1 } },
    ],
  },
  {
    id: "q2",
    question: "When you start a new health routine, what usually happens?",
    questionPt: "Quando começa uma nova rotina de saúde, o que geralmente acontece?",
    icon: "🚀",
    options: [
      { key: "strong_start", label: "I go all in, then fade after 2 weeks", labelPt: "Começo com tudo, depois perco o ritmo em 2 semanas", points: { executive: 2, athlete: 2 } },
      { key: "slow_steady", label: "I follow the plan carefully, step by step", labelPt: "Sigo o plano cuidadosamente, passo a passo", points: { methodical: 3 } },
      { key: "push_hard", label: "I push hard from day one — faster is better", labelPt: "Forço desde o dia um — mais rápido é melhor", points: { athlete: 3 } },
      { key: "hesitant", label: "I'm cautious and sometimes avoid starting", labelPt: "Sou cauteloso e às vezes evito começar", points: { cautious: 3 } },
    ],
  },
  {
    id: "q3",
    question: "What motivates you most in rehabilitation?",
    questionPt: "O que mais te motiva na reabilitação?",
    icon: "🎯",
    options: [
      { key: "results", label: "Seeing measurable progress and results", labelPt: "Ver progresso mensurável e resultados", points: { executive: 2, athlete: 1 } },
      { key: "routine", label: "Having a clear plan to follow daily", labelPt: "Ter um plano claro para seguir diariamente", points: { methodical: 3 } },
      { key: "performance", label: "Getting back to my sport / activity level", labelPt: "Voltar ao meu nível esportivo / de atividade", points: { athlete: 3 } },
      { key: "safety", label: "Knowing I'm doing things correctly and safely", labelPt: "Saber que estou fazendo as coisas corretamente e com segurança", points: { cautious: 3 } },
    ],
  },
  {
    id: "q4",
    question: "How do you feel about pain during exercises?",
    questionPt: "Como você se sente em relação à dor durante os exercícios?",
    icon: "💪",
    options: [
      { key: "push_through", label: "No pain, no gain — I push through", labelPt: "Sem dor, sem ganho — eu persevero", points: { athlete: 3, executive: 1 } },
      { key: "monitor", label: "I monitor it and adjust intensity accordingly", labelPt: "Eu monitoro e ajusto a intensidade", points: { methodical: 3 } },
      { key: "worried", label: "It worries me — I often stop to be safe", labelPt: "Me preocupa — geralmente paro para ficar seguro", points: { cautious: 3 } },
      { key: "ignore", label: "I ignore it unless it's really bad", labelPt: "Ignoro a menos que seja muito forte", points: { executive: 2, athlete: 1 } },
    ],
  },
  {
    id: "q5",
    question: "What's your biggest challenge with consistency?",
    questionPt: "Qual é seu maior desafio com consistência?",
    icon: "⏰",
    options: [
      { key: "time", label: "Finding time in my packed schedule", labelPt: "Encontrar tempo na minha agenda lotada", points: { executive: 3 } },
      { key: "boredom", label: "Getting bored with the same routine", labelPt: "Ficar entediado com a mesma rotina", points: { methodical: 2, athlete: 1 } },
      { key: "impatience", label: "Getting impatient with slow progress", labelPt: "Ficar impaciente com progresso lento", points: { athlete: 3 } },
      { key: "fear", label: "Fear of doing something wrong or getting hurt", labelPt: "Medo de fazer algo errado ou se machucar", points: { cautious: 3 } },
    ],
  },
  {
    id: "q6",
    question: "How do you prefer to track your progress?",
    questionPt: "Como você prefere acompanhar seu progresso?",
    icon: "📊",
    options: [
      { key: "metrics", label: "Numbers, charts, and clear metrics", labelPt: "Números, gráficos e métricas claras", points: { executive: 2, methodical: 2 } },
      { key: "checklist", label: "Daily checklists and to-do lists", labelPt: "Checklists diários e listas de tarefas", points: { methodical: 3 } },
      { key: "performance", label: "Performance benchmarks and personal records", labelPt: "Benchmarks de desempenho e recordes pessoais", points: { athlete: 3 } },
      { key: "feeling", label: "How I feel overall — less numbers, more feeling", labelPt: "Como me sinto no geral — menos números, mais sentimento", points: { cautious: 2, executive: 1 } },
    ],
  },
  {
    id: "q7",
    question: "When you miss a day, what happens next?",
    questionPt: "Quando você perde um dia, o que acontece depois?",
    icon: "😤",
    options: [
      { key: "double_up", label: "I try to do double the next day", labelPt: "Tento fazer o dobro no dia seguinte", points: { athlete: 3, executive: 1 } },
      { key: "adjust", label: "I adjust my schedule and get back on track", labelPt: "Ajusto minha agenda e volto aos trilhos", points: { methodical: 3 } },
      { key: "frustrated", label: "I feel frustrated and it's hard to restart", labelPt: "Fico frustrado e é difícil recomeçar", points: { executive: 2 } },
      { key: "guilty", label: "I feel guilty and worry about setbacks", labelPt: "Me sinto culpado e preocupado com retrocesso", points: { cautious: 3 } },
    ],
  },
  {
    id: "q8",
    question: "What type of support helps you most?",
    questionPt: "Que tipo de suporte mais te ajuda?",
    icon: "🤝",
    options: [
      { key: "efficient", label: "Quick tips and efficient guidance", labelPt: "Dicas rápidas e orientação eficiente", points: { executive: 3 } },
      { key: "detailed", label: "Detailed plans with clear milestones", labelPt: "Planos detalhados com marcos claros", points: { methodical: 3 } },
      { key: "challenge", label: "Challenges and competitive elements", labelPt: "Desafios e elementos competitivos", points: { athlete: 3 } },
      { key: "encouragement", label: "Constant encouragement and reassurance", labelPt: "Encorajamento constante e reafirmação", points: { cautious: 3 } },
    ],
  },
  {
    id: "q9",
    question: "What's your relationship with technology for health?",
    questionPt: "Qual é sua relação com tecnologia para saúde?",
    icon: "📱",
    options: [
      { key: "dashboard", label: "I love dashboards with data and analytics", labelPt: "Adoro dashboards com dados e análises", points: { executive: 2, methodical: 2 } },
      { key: "reminders", label: "I need reminders or I forget", labelPt: "Preciso de lembretes ou esqueço", points: { executive: 2, cautious: 1 } },
      { key: "gamification", label: "I'm motivated by badges, streaks, and levels", labelPt: "Me motivo com badges, streaks e níveis", points: { athlete: 2, methodical: 1 } },
      { key: "simple", label: "Keep it simple — too much tech overwhelms me", labelPt: "Mantenha simples — muita tecnologia me sobrecarrega", points: { cautious: 3 } },
    ],
  },
  {
    id: "q10",
    question: "In 3 months, what would make you happiest?",
    questionPt: "Em 3 meses, o que te deixaria mais feliz?",
    icon: "🎉",
    options: [
      { key: "efficiency", label: "Maintaining my routine without it affecting my work", labelPt: "Manter minha rotina sem afetar meu trabalho", points: { executive: 3 } },
      { key: "discipline", label: "Having a perfect adherence record", labelPt: "Ter um registro perfeito de adesão", points: { methodical: 3 } },
      { key: "comeback", label: "Being back to full strength / activity", labelPt: "Estar de volta à força / atividade total", points: { athlete: 3 } },
      { key: "confidence", label: "Feeling confident that I'm on the right path", labelPt: "Sentir confiança de que estou no caminho certo", points: { cautious: 3 } },
    ],
  },
];

export function calculateArchetype(answers: { questionId: string; answer: string }[]): string {
  const scores: Record<string, number> = { executive: 0, methodical: 0, athlete: 0, cautious: 0 };
  
  for (const ans of answers) {
    const question = QUIZ_QUESTIONS.find((q) => q.id === ans.questionId);
    if (!question) continue;
    const option = question.options.find((o) => o.key === ans.answer);
    if (!option) continue;
    for (const [archetype, pts] of Object.entries(option.points)) {
      scores[archetype] = (scores[archetype] || 0) + pts;
    }
  }
  
  let best = "cautious";
  let bestScore = 0;
  for (const [key, score] of Object.entries(scores)) {
    if (score > bestScore) { best = key; bestScore = score; }
  }
  return best;
}
