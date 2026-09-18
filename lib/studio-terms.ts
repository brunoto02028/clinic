// Default terms a personal-trainer studio's students accept (activity 55, T-3)
// — fitness training, not the clinic's "consent for treatment". DRAFT: written
// as a sensible starting point, not reviewed by a lawyer; Bruno reviews the
// legal wording before relying on it. "{studio}" is replaced with the studio's
// name. Same shape as the clinic's consent texts (app/api/admin/consent-texts).

type Section = { number: number; title: string; body: string };
export interface ConsentTexts {
  termsTitle: string;
  privacyTitle: string;
  liabilityTitle: string;
  consentCheckboxText: string;
  termsSections: Section[];
  privacySections: Section[];
  liabilitySections: Section[];
}

const EN: ConsentTexts = {
  termsTitle: "Training Terms of Service",
  privacyTitle: "Your Data & Privacy",
  liabilityTitle: "Health, Risk & Responsibility",
  consentCheckboxText:
    "I have read and agree to {studio}'s Training Terms, the Health, Risk & Responsibility section and the Data & Privacy notice, and I consent to {studio} processing my personal data (including health and body-measurement data I choose to share) to deliver my training.",
  termsSections: [
    { number: 1, title: "About these terms", body: "These terms apply to the coaching you receive from {studio} through this app (\"the Platform\"). The Platform is a software service used by {studio}; your coaching relationship is with {studio}." },
    { number: 2, title: "The service", body: "{studio} provides personal training and fitness coaching: workout programmes, exercise demonstrations, progress tracking, body assessments, nutrition guidance and, where offered, sessions and challenges. This is fitness coaching, not medical, physiotherapy or dietetic treatment, and it does not replace advice from a doctor or other health professional." },
    { number: 3, title: "Your information", body: "You agree to give accurate and up-to-date information, including anything about your health that could affect your safety when exercising, and to tell {studio} promptly if it changes." },
    { number: 4, title: "Sessions, payments and cancellations", body: "Session times, prices, payment methods and cancellation rules are set by {studio} and shown to you before you book or pay. Where a plan is paid online, payment is processed by Stripe on behalf of {studio}." },
    { number: 5, title: "Using the Platform", body: "Keep your login private and use the Platform only for your own training. {studio} may pause or end access if these terms are breached." },
  ],
  privacySections: [
    { number: 6, title: "Who is responsible for your data", body: "{studio} is the controller of the personal data you share for your training. The Platform provider processes it on {studio}'s behalf, only to run the service, and stores it securely." },
    { number: 7, title: "What is collected and why", body: "Your contact details, training logs, assessments (such as measurements, body composition and photos you choose to upload), nutrition logs and messages — used only to plan, deliver and track your training." },
    { number: 8, title: "Health data", body: "Some of this information (for example injuries, conditions or body measurements) is health data. It is processed only with your explicit consent, which you give by accepting these terms, and you can withdraw it at any time by contacting {studio}." },
    { number: 9, title: "Your rights", body: "You can ask {studio} for a copy of your data, to correct it, or to delete it, and you can complain to your data protection authority (in the UK, the ICO; in Brazil, the ANPD)." },
  ],
  liabilitySections: [
    { number: 10, title: "Fitness to exercise", body: "Before starting, and whenever your health changes, you confirm you are fit to exercise or have been cleared by a doctor. If you are pregnant, have a heart, lung or joint condition, or take medication that affects exercise, speak to a doctor first and tell {studio}." },
    { number: 11, title: "Risk of exercise", body: "Physical exercise carries a risk of injury. Follow the instructions, work within your limits and stop immediately if you feel pain, dizziness, chest discomfort or shortness of breath, and seek medical help if needed." },
    { number: 12, title: "Responsibility", body: "{studio} delivers the coaching with reasonable care and skill. Nothing in these terms limits liability that cannot be limited by law." },
  ],
};

const PT: ConsentTexts = {
  termsTitle: "Termos de Serviço de Treino",
  privacyTitle: "Seus Dados e Privacidade",
  liabilityTitle: "Saúde, Riscos e Responsabilidade",
  consentCheckboxText:
    "Li e aceito os Termos de Treino de {studio}, a seção de Saúde, Riscos e Responsabilidade e o aviso de Dados e Privacidade, e autorizo {studio} a tratar meus dados pessoais (inclusive dados de saúde e medidas corporais que eu escolher compartilhar) para conduzir meu treino.",
  termsSections: [
    { number: 1, title: "Sobre estes termos", body: "Estes termos valem para o acompanhamento que você recebe de {studio} por este aplicativo (\"a Plataforma\"). A Plataforma é um serviço de software usado por {studio}; sua relação de treino é com {studio}." },
    { number: 2, title: "O serviço", body: "{studio} oferece treino personalizado e acompanhamento físico: programas de treino, demonstrações de exercícios, acompanhamento de evolução, avaliações físicas, orientação nutricional e, quando oferecidos, sessões e desafios. É acompanhamento de atividade física, não tratamento médico, fisioterapêutico ou nutricional clínico, e não substitui a orientação de um médico ou outro profissional de saúde." },
    { number: 3, title: "Suas informações", body: "Você se compromete a informar dados corretos e atualizados, inclusive qualquer condição de saúde que possa afetar sua segurança ao se exercitar, e a avisar {studio} se algo mudar." },
    { number: 4, title: "Sessões, pagamentos e cancelamentos", body: "Horários, preços, formas de pagamento e regras de cancelamento são definidos por {studio} e mostrados a você antes de agendar ou pagar. Planos pagos online são processados pela Stripe em nome de {studio}." },
    { number: 5, title: "Uso da Plataforma", body: "Mantenha seu acesso pessoal e use a Plataforma apenas para o seu treino. {studio} pode suspender ou encerrar o acesso se estes termos forem descumpridos." },
  ],
  privacySections: [
    { number: 6, title: "Quem é responsável pelos seus dados", body: "{studio} é o controlador dos dados pessoais que você compartilha para o seu treino. O fornecedor da Plataforma os trata em nome de {studio}, apenas para operar o serviço, e os armazena com segurança." },
    { number: 7, title: "O que é coletado e para quê", body: "Seus dados de contato, registros de treino, avaliações (como medidas, composição corporal e fotos que você decidir enviar), registros de alimentação e mensagens — usados apenas para planejar, conduzir e acompanhar o seu treino." },
    { number: 8, title: "Dados de saúde", body: "Parte dessas informações (por exemplo lesões, condições ou medidas corporais) são dados de saúde. Eles são tratados apenas com o seu consentimento explícito, dado ao aceitar estes termos, e você pode retirá-lo a qualquer momento falando com {studio}." },
    { number: 9, title: "Seus direitos", body: "Você pode pedir a {studio} uma cópia dos seus dados, a correção ou a exclusão deles, e pode reclamar à autoridade de proteção de dados (no Brasil, a ANPD; no Reino Unido, o ICO)." },
  ],
  liabilitySections: [
    { number: 10, title: "Aptidão para o exercício", body: "Antes de começar, e sempre que sua saúde mudar, você confirma estar apto para se exercitar ou ter liberação médica. Se estiver grávida, tiver problema cardíaco, pulmonar ou articular, ou usar medicação que afete o exercício, fale antes com um médico e avise {studio}." },
    { number: 11, title: "Riscos do exercício", body: "Exercício físico tem risco de lesão. Siga as orientações, respeite seus limites e pare imediatamente se sentir dor, tontura, desconforto no peito ou falta de ar, procurando ajuda médica se necessário." },
    { number: 12, title: "Responsabilidade", body: "{studio} conduz o acompanhamento com o cuidado e a competência razoáveis. Nada nestes termos limita responsabilidades que a lei não permite limitar." },
  ],
};

/** The studio's default training terms, with its name filled in. */
export function studioConsentTexts(studioName: string, isPt: boolean): ConsentTexts {
  const base = isPt ? PT : EN;
  return JSON.parse(JSON.stringify(base).split("{studio}").join(studioName.replace(/["\\]/g, "")));
}
