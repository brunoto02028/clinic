// Vocabulary per tenant type. A clinic keeps the clinical words; a
// personal-trainer studio sees student/workout/trainer instead. The UI already
// picks EN vs PT (label / labelPt); this rewrites the clinical terms in the
// chosen string when the tenant is a personal trainer. Whole-word, order
// matters (plurals before singulars).
//
// EN uses "Client" for a personal trainer's customer — swap to "Student" here
// if the studio prefers it.

type Pair = [RegExp, string];

const wholeWord = (from: string): RegExp => new RegExp(`\\b${from}\\b`, "g");

const PERSONAL_EN: Pair[] = (
  [
    ["Patients", "Clients"],
    ["Patient", "Client"],
    ["Treatments", "Workouts"],
    ["Treatment", "Workout"],
    ["Clinical", "Training"],
    ["Therapists", "Trainers"],
    ["Therapist", "Trainer"],
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
    ["Clínico", "Treino"],
    ["Fisioterapeutas", "Personais"],
    ["Fisioterapeuta", "Personal"],
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
  return pairs.reduce((acc, [re, to]) => acc.replace(re, to), text);
}
