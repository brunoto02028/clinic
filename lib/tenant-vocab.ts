// Vocabulary per tenant type. A clinic keeps the clinical words; a
// personal-trainer studio sees student/workout/trainer instead. The UI already
// picks EN vs PT (label / labelPt); this rewrites the clinical terms in the
// chosen string when the tenant is a personal trainer. Whole-word, order
// matters (plurals before singulars).
//
// A personal trainer's customer is a "Student" (EN) / "Aluno" (PT).

type Pair = [RegExp, string];

// Case-insensitive whole word; the replacement keeps the matched text's case
// (Title, lower, or UPPER) so both "Patients" and "patients" are rewritten.
const wholeWord = (from: string): RegExp => new RegExp(`\\b${from}\\b`, "gi");

function matchCase(matched: string, replacement: string): string {
  if (matched === matched.toLowerCase()) return replacement.toLowerCase();
  if (matched === matched.toUpperCase()) return replacement.toUpperCase();
  return replacement; // canonical Title case
}

const PERSONAL_EN: Pair[] = (
  [
    // BPR's own brand on shared features — a studio's students never see it.
    ["BPR Journey", "Journey"],
    ["BPR Arena", "Arena"],
    ["BPR Ambassador", "Ambassador"],
    ["Patients", "Students"],
    ["Patient", "Student"],
    ["Treatments", "Workouts"],
    ["Treatment", "Workout"],
    ["Clinical", "Training"],
    ["Rehabilitation", "Training"],
    ["Rehab", "Training"],
    ["Physiotherapy", "Training"],
    ["Clinicians", "Trainers"],
    ["Clinician", "Trainer"],
    ["Clinics", "Studios"],
    ["Clinic", "Studio"],
    ["Therapists", "Trainers"],
    ["Therapist", "Trainer"],
    ["Appointments", "Sessions"],
    ["Appointment", "Session"],
    ["Screening", "Readiness"],
    ["Protocols", "Programs"],
    ["Protocol", "Program"],
  ] as [string, string][]
).map(([from, to]) => [wholeWord(from), to]);

const PERSONAL_PT: Pair[] = (
  [
    ["Jornada BPR", "Jornada"],
    ["BPR Arena", "Arena"],
    ["Embaixador BPR", "Embaixador"],
    ["Pacientes", "Alunos"],
    ["Paciente", "Aluno"],
    ["Tratamentos", "Treinos"],
    ["Tratamento", "Treino"],
    ["Clínicos", "Personais"],
    ["Clínico", "Treino"],
    ["Reabilitação", "Treino"],
    ["Fisioterapia", "Treino"],
    ["Clínicas", "Estúdios"],
    ["Clínica", "Estúdio"],
    ["Fisioterapeutas", "Personais"],
    ["Fisioterapeuta", "Personal"],
    ["Terapeutas", "Personais"],
    ["Terapeuta", "Personal"],
    ["Consultas", "Sessões"],
    ["Consulta", "Sessão"],
    ["Agendamentos", "Sessões"],
    ["Agendamento", "Sessão"],
    ["Triagem", "Prontidão"],
    ["Protocolos", "Programas"],
    ["Protocolo", "Programa"],
  ] as [string, string][]
).map(([from, to]) => [wholeWord(from), to]);

const PT_MASCULINE: Record<string, string> = {
  da: "do", das: "dos", na: "no", nas: "nos", pela: "pelo", pelas: "pelos",
  "à": "ao", "às": "aos", a: "o", as: "os", uma: "um",
  sua: "seu", suas: "seus", nossa: "nosso", nossas: "nossos", esta: "este", essa: "esse",
};

/**
 * Rewrites clinical terms in an already-localized label for a personal-trainer
 * tenant. A clinic tenant gets the text unchanged.
 */
export function personalizeLabel(
  text: string,
  opts: { isPersonal: boolean; isPt: boolean }
): string {
  if (!opts.isPersonal) return text;
  // The EN rules run in PT too: many screens (and badges) exist only in
  // English, and a PT locale must not leave their "Patient" untouched.
  const pairs = opts.isPt ? [...PERSONAL_PT, ...PERSONAL_EN] : PERSONAL_EN;
  let out = pairs.reduce((acc, [re, to]) => acc.replace(re, (m) => matchCase(m, to)), text);
  // Every EN replacement target starts with a consonant sound, so a phrase
  // like "an appointment" becomes the ungrammatical "an session". Downgrade
  // the indefinite article to "a" before any of our replacement words.
  out = out.replace(
    /\b(an)(\s+)(?=(students?|workouts?|training|trainers?|studios?|sessions?|readiness|programs?)\b)/gi,
    (_m, art: string, sp: string) => (art[0] === "A" ? "A" : "a") + sp
  );
  if (opts.isPt) {
    // "clínica" is feminine and "estúdio" masculine: "da clínica" must become
    // "do estúdio", not "da estúdio" — including chains like "pela sua".
    out = out.replace(
      /(^|[\s(])((?:(?:das|da|nas|na|pelas|pela|às|à|as|a|uma|suas|sua|nossas|nossa|esta|essa)\s+)+)(?=estúdios?\b)/gi,
      (_m, pre: string, dets: string) =>
        pre +
        dets.replace(/\S+/g, (w) => {
          const to = PT_MASCULINE[w.toLowerCase()] ?? w;
          return w[0] === w[0].toUpperCase() ? to[0].toUpperCase() + to.slice(1) : to;
        })
    );
  }
  return out;
}
