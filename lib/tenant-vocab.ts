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
    ["Consultas", "Sessões"],
    ["Consulta", "Sessão"],
    ["Agendamentos", "Sessões"],
    ["Agendamento", "Sessão"],
    ["Triagem", "Prontidão"],
    ["Protocolos", "Programas"],
    ["Protocolo", "Programa"],
  ] as [string, string][]
).map(([from, to]) => [wholeWord(from), to]);

/**
 * Rewrites clinical terms in an already-localized label for a personal-trainer
 * tenant. A clinic tenant gets the text unchanged.
 */
export function personalizeLabel(
  text: string,
  opts: { isPersonal: boolean; isPt: boolean }
): string {
  if (!opts.isPersonal) return text;
  const pairs = opts.isPt ? PERSONAL_PT : PERSONAL_EN;
  return pairs.reduce((acc, [re, to]) => acc.replace(re, (m) => matchCase(m, to)), text);
}
