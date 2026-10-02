// lib/patient-report.ts
// Complete patient clinical report — data gathering + print-ready HTML rendering.
// Used by /api/admin/patients/[id]/report (view/download as PDF via browser print, or email to patient).

import { prisma } from "@/lib/db";
import { getMonitoringData, type DadosDeMonitoramento, type ResumoDaMetrica } from "@/lib/patient-monitoring";
import { TEXTO_DA_CONCLUSAO } from "@/lib/ecg-record";

export async function getPatientReportData(patientId: string, opts: { days?: number } = {}) {
  const [patient, screening, bodyAssessment, diagnosis, protocols, soapNotes, atlasChat, monitoring] = await Promise.all([
    prisma.user.findUnique({
      where: { id: patientId },
      select: { id: true, firstName: true, lastName: true, email: true, phone: true, dateOfBirth: true, createdAt: true,
        // A língua em que o papel sai — ver `IdiomaDoRelatorio`. Sem este
        // campo no `select`, quem chama lê `undefined` e cai sempre em inglês,
        // que é a tradução a existir e nunca ser alcançada.
        reportLanguage: true } as any,
    }).catch(() => null),
    (prisma as any).medicalScreening.findUnique({ where: { userId: patientId } }).catch(() => null),
    (prisma as any).bodyAssessment.findFirst({
      where: { patientId }, orderBy: { createdAt: "desc" },
    }).catch(() => null),
    (prisma as any).aIDiagnosis.findFirst({
      where: { patientId }, orderBy: { createdAt: "desc" },
    }).catch(() => null),
    (prisma as any).treatmentProtocol.findMany({
      where: { patientId },
      orderBy: { createdAt: "desc" },
      include: {
        therapist: { select: { firstName: true, lastName: true } },
        items: { orderBy: [{ phase: "asc" }, { sortOrder: "asc" }] },
      },
    }).catch(() => [] as any[]),
    (prisma as any).sOAPNote.findMany({
      where: { patientId }, orderBy: { createdAt: "desc" }, take: 10,
      include: { therapist: { select: { firstName: true, lastName: true } } },
    }).catch(() => [] as any[]),
    (prisma as any).atlasChatMessage.count({ where: { patientId } }).catch(() => 0),
    /**
     * O acompanhamento do período (099 T-4).
     *
     * O relatório falava do **plano** e não do **mês**: nada de relógio,
     * pressão, dor por data ou exercício feito entrava nele. Isto é o que o
     * paciente viveu, com datas.
     */
    getMonitoringData(patientId, { days: opts.days ?? 30 }).catch(() => null),
  ]);

  return { patient, screening, bodyAssessment, diagnosis, protocols, soapNotes, atlasChatCount: atlasChat, monitoring };
}

const esc = (s: any) =>
  String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const fmtDate = (d: any) => (d ? new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "—");

const row = (label: string, value: any) =>
  value ? `<tr><td class="lbl">${esc(label)}</td><td>${esc(value)}</td></tr>` : "";

const PHASE_LABELS: Record<string, string> = {
  SHORT_TERM: "Short-Term (Acute) — Weeks 1-4",
  MEDIUM_TERM: "Medium-Term (Rehab) — Weeks 4-12",
  LONG_TERM: "Long-Term (Maintenance) — Weeks 12+",
};
const ITEM_TYPES: Record<string, string> = {
  IN_CLINIC: "In-Clinic",
  HOME_EXERCISE: "Home Exercise",
  HOME_CARE: "Home Care",
  ASSESSMENT: "Assessment",
};

function parseJson(v: any): any[] {
  if (!v) return [];
  if (Array.isArray(v)) return v;
  try { const p = typeof v === "string" ? JSON.parse(v) : v; return Array.isArray(p) ? p : []; } catch { return []; }
}

/**
 * Uma linha de sinal: o valor, a variação e **quantos dias têm dado** (099 T-4).
 *
 * Os dias entram porque uma média de trinta noites e uma média de duas não
 * são a mesma frase, e quem lê precisa saber qual das duas está vendo.
 *
 * A variação é dita sem juízo: "4 menor" e não "melhorou". Quem diz se
 * melhorou é um terapeuta, e aí assina embaixo.
 */
function linhaDeSinal(
  rotulo: string,
  m: ResumoDaMetrica,
  unidade: string,
  idioma: IdiomaDoRelatorio = "en"
): string {
  const t = P[idioma];
  if (!m || m.dias === 0) return "";
  const valor = m.atual !== null ? `${m.atual}${unidade}` : "—";
  const mudanca =
    m.variacao === null || m.variacao === 0
      ? ""
      : `${Math.abs(m.variacao)}${unidade} ${m.variacao < 0 ? t.maisBaixo : t.maisAlto} ${t.queAPrimeiraMetade}`;
  return `<tr><td class="lbl">${esc(rotulo)}</td><td>${esc(valor)}${mudanca ? ` — ${esc(mudanca)}` : ""}<span class="meta"> · ${t.diasComDados(m.dias)}</span></td></tr>`;
}


/**
 * As palavras do papel, nas duas línguas (118 T-5, achado do QA).
 *
 * `User.reportLanguage` existe desde sempre e **este documento ignorava-o**: com
 * `"pt"` o HTML saía byte a byte igual ao inglês. O PDF do ECG e o da avaliação
 * corporal já o respeitam; este não, e é o que o paciente leva a um médico.
 *
 * **O que se traduz é o nosso texto.** O que a terapeuta escreveu — o resumo, os
 * comentários, as notas SOAP, o nome de uma condição — fica como ela escreveu.
 * Traduzir o registo clínico de alguém seria reescrevê-lo.
 */
export type IdiomaDoRelatorio = "en" | "pt";

const P = {
  en: {
    titulo: "Clinical Report",
    gerado: "Generated",
    paciente: "Patient Information",
    triagem: "Medical Screening — Patient Reported",
    postural: "Biomechanical / Postural Assessment",
    pontuacao: "Overall score",
    recomendacoes: "Recommendations",
    avaliacao: "Clinical assessment recorded by your therapist (AI-assisted, clinician reviewed)",
    estado: "Status",
    condicoes: "Conditions",
    achados: "Key Findings",
    comentariosClinico: "Clinician comments",
    sinais: (dias: number) => `Signs — last ${dias} days`,
    sono: "Sleep",
    fcRepouso: "Resting heart rate",
    hrv: "HRV",
    spo2: "SpO2",
    passos: "Steps",
    pressao: "Blood pressure",
    sistolica: "Systolic",
    diastolica: "Diastolic",
    maisRecente: "Most recent",
    leiturasNoPeriodo: "Readings in period",
    em: "on",
    ecg: "ECG",
    ecgRessalva:
      "These are the watch's own conclusions. The trace is not stored and is not interpreted here.",
    exercicio: "Exercise",
    diasComExercicio: "Days with exercise done",
    exerciciosFeitos: "Exercises logged",
    comoSeSentiu: "How you felt",
    dor: "Pain",
    humor: "Mood",
    checkins: "Check-ins in period",
    consultas: "Appointments in the period",
    porVideo: "by video",
    emCasa: "at home",
    protocolo: "Treatment Protocol",
    criadoPor: "Created",
    por: "by",
    semanas: "weeks",
    sessoes: "sessions",
    comentariosTerapeuta: "Therapist comments",
    metas: "Treatment Goals",
    precaucoes: "Precautions",
    notas: "Session Notes (SOAP)",
    dorNivel: "Pain",
    maisBaixo: "lower",
    maisAlto: "higher",
    queAPrimeiraMetade: "than the first half of the period",
    diasComDados: (n: number) => `${n} day${n === 1 ? "" : "s"} with data`,
    naoEhDiagnostico:
      "<strong>This is not a diagnosis.</strong> It shows what was measured and what was recorded, and it has not been read by a doctor. Talk to your therapist, or to the doctor you bring it to, about what it means.",
    rodape:
      "This report was generated by Bruno Physical Rehabilitation (bpr.clinic). It reflects the clinical information recorded up to the generation date and is intended for the patient and their healthcare providers. For questions, contact the clinic.",
  },
  pt: {
    titulo: "Relatório clínico",
    gerado: "Gerado em",
    paciente: "Dados do paciente",
    triagem: "Triagem de saúde — relatada pelo paciente",
    postural: "Avaliação biomecânica / postural",
    pontuacao: "Pontuação geral",
    recomendacoes: "Recomendações",
    avaliacao:
      "Avaliação clínica registada pelo seu terapeuta (com apoio de IA, revista por um clínico)",
    estado: "Estado",
    condicoes: "Condições",
    achados: "Principais achados",
    comentariosClinico: "Comentários do clínico",
    sinais: (dias: number) => `Sinais — últimos ${dias} dias`,
    sono: "Sono",
    fcRepouso: "Frequência cardíaca em repouso",
    hrv: "VFC",
    spo2: "SpO2",
    passos: "Passos",
    pressao: "Pressão arterial",
    sistolica: "Sistólica",
    diastolica: "Diastólica",
    maisRecente: "Mais recente",
    leiturasNoPeriodo: "Leituras no período",
    em: "em",
    ecg: "ECG",
    ecgRessalva:
      "Estas são as conclusões do próprio relógio. O traçado não é guardado aqui e não é interpretado por nós.",
    exercicio: "Exercício",
    diasComExercicio: "Dias com exercício feito",
    exerciciosFeitos: "Exercícios registados",
    comoSeSentiu: "Como se sentiu",
    dor: "Dor",
    humor: "Humor",
    checkins: "Registos no período",
    consultas: "Consultas no período",
    porVideo: "por vídeo",
    emCasa: "em casa",
    protocolo: "Protocolo de tratamento",
    criadoPor: "Criado em",
    por: "por",
    semanas: "semanas",
    sessoes: "sessões",
    comentariosTerapeuta: "Comentários do terapeuta",
    metas: "Metas do tratamento",
    precaucoes: "Precauções",
    notas: "Notas de sessão (SOAP)",
    dorNivel: "Dor",
    maisBaixo: "abaixo",
    maisAlto: "acima",
    queAPrimeiraMetade: "da primeira metade do período",
    diasComDados: (n: number) => `${n} dia${n === 1 ? "" : "s"} com dados`,
    naoEhDiagnostico:
      "<strong>Isto não é um diagnóstico.</strong> Mostra o que foi medido e o que foi registado, e não foi lido por um médico. Fale com o seu terapeuta, ou com o médico a quem o entregar, sobre o que significa.",
    rodape:
      "Este relatório foi gerado pela Bruno Physical Rehabilitation (bpr.clinic). Reflete a informação clínica registada até à data de geração e destina-se ao paciente e aos profissionais de saúde que o acompanham. Para dúvidas, contacte a clínica.",
  },
} as const;

function renderMonitoringHTML(mon: DadosDeMonitoramento | null, idioma: IdiomaDoRelatorio = "en"): string {
  if (!mon) return "";
  const t = P[idioma];
  const partes: string[] = [];

  if (mon.temSinais) {
    const linhas = [
      linhaDeSinal(t.sono, mon.sinais.sono, " min", idioma),
      linhaDeSinal(t.fcRepouso, mon.sinais.fcRepouso, " bpm", idioma),
      linhaDeSinal(t.hrv, mon.sinais.hrv, " ms", idioma),
      linhaDeSinal(t.spo2, mon.sinais.spo2, "%", idioma),
      linhaDeSinal(t.passos, mon.sinais.passos, "", idioma),
    ].join("");
    partes.push(`<div class="section"><h2>${t.sinais(mon.periodo.dias)}</h2><table>${linhas}</table></div>`);
  }

  if (mon.pressao.leituras > 0) {
    partes.push(`<div class="section"><h2>${t.pressao}</h2><table>
      ${linhaDeSinal(t.sistolica, mon.pressao.sistolica, " mmHg", idioma)}
      ${linhaDeSinal(t.diastolica, mon.pressao.diastolica, " mmHg", idioma)}
      ${mon.pressao.ultima ? row(t.maisRecente, `${mon.pressao.ultima.systolic}/${mon.pressao.ultima.diastolic} mmHg ${t.em} ${fmtDate(mon.pressao.ultima.measuredAt)}`) : ""}
      ${row(t.leiturasNoPeriodo, String(mon.pressao.leituras))}
    </table></div>`);
  }

  if (mon.ecg.length > 0) {
    /**
     * O ECG entra como **fato**, com a conclusão do aparelho — nunca o
     * traçado, e nunca uma leitura nossa dele.
     */
    const itens = mon.ecg
      .map(
        (e) =>
          `<li>${esc(String(e.recordedAt ?? "").slice(0, 10))} — ${esc(TEXTO_DA_CONCLUSAO[e.conclusao][idioma])}${e.heartRate != null ? ` (${Math.round(e.heartRate)} bpm)` : ""}</li>`
      )
      .join("");
    partes.push(`<div class="section"><h2>${t.ecg}</h2><ul>${itens}</ul>
      <p class="meta">${t.ecgRessalva}</p></div>`);
  }

  if (mon.exercicio.registros > 0) {
    partes.push(`<div class="section"><h2>${t.exercicio}</h2><table>
      ${row(t.diasComExercicio, String(mon.exercicio.diasComExercicio))}
      ${row(t.exerciciosFeitos, String(mon.exercicio.registros))}
    </table></div>`);
  }

  if (mon.comoSeSentiu.registros > 0) {
    const ultimos = mon.comoSeSentiu.ultimos
      .map((c) => `<li>${esc(c.dia)} — ${t.dor.toLowerCase()} ${c.dor}/10, ${t.humor.toLowerCase()} ${c.humor}/5</li>`)
      .join("");
    partes.push(`<div class="section"><h2>${t.comoSeSentiu}</h2><table>
      ${linhaDeSinal(t.dor, mon.comoSeSentiu.dor, "/10", idioma)}
      ${linhaDeSinal(t.humor, mon.comoSeSentiu.humor, "/5", idioma)}
      ${row(t.checkins, String(mon.comoSeSentiu.registros))}
    </table><h3>${t.maisRecente}</h3><ul>${ultimos}</ul></div>`);
  }

  if (mon.consultas.length > 0) {
    const itens = mon.consultas
      .map(
        (a) =>
          `<li>${esc(fmtDate(a.dateTime))} — ${esc(a.treatmentType)} (${esc(a.status.toLowerCase())}${a.mode && a.mode !== "IN_PERSON" ? `, ${esc(a.mode === "VIDEO" ? t.porVideo : t.emCasa)}` : ""})</li>`
      )
      .join("");
    partes.push(`<div class="section"><h2>${t.consultas}</h2><ul>${itens}</ul></div>`);
  }

  return partes.join("");
}

/**
 * O relatório em HTML, pronto para imprimir.
 *
 * ## A palavra "diagnóstico" saiu do papel (118 T-5, achado do QA de 02/10/2026)
 *
 * O cabeçalho da secção dizia **"Clinical Diagnosis (AI-assisted, clinician
 * reviewed)"**, com condição e gravidade por baixo, e o documento inteiro não
 * tinha **uma** vez a frase que o nega — medido no HTML gerado: `diagnos` ×1,
 * `not a diagnosis` ×0.
 *
 * Este ficheiro nasceu como documento **interno da clínica**, onde a palavra
 * fazia sentido. A T-5 mudou o destinatário: agora é o **paciente** que o pede,
 * de propósito para o levar a um médico.
 *
 * O conteúdo fica — é o que a terapeuta registou, e escondê-lo do paciente seria
 * pior. O que muda é a palavra, e o rodapé passa a dizer o que o papel é, com a
 * mesma frase que a tela do app já dizia e que o papel não levava.
 *
 * Não é preferência de redação: é o que mantém o produto fora de "dispositivo
 * médico". Quem diagnostica é médico.
 *
 * **E o comentário não vai no HTML.** A primeira versão desta explicação estava
 * dentro da template string, como `<!-- -->` — ou seja, o documento entregue ao
 * paciente continuaria a conter a frase antiga, por extenso, no código-fonte.
 */
export function renderPatientReportHTML(
  data: Awaited<ReturnType<typeof getPatientReportData>>,
  opts?: { forEmail?: boolean; idioma?: IdiomaDoRelatorio }
): string {
  const idioma: IdiomaDoRelatorio = opts?.idioma === "pt" ? "pt" : "en";
  const t = P[idioma];
  const { patient, screening: ms, bodyAssessment: ba, diagnosis: dx, protocols, soapNotes, monitoring } = data as any;
  if (!patient) return "<html><body>Patient not found</body></html>";

  const age = patient.dateOfBirth ? new Date().getFullYear() - new Date(patient.dateOfBirth).getFullYear() : null;

  // ── Red flags ──
  const redFlags: string[] = [];
  if (ms) {
    const flags: [string, string][] = [
      ["unexplainedWeightLoss", "Unexplained weight loss"], ["nightPain", "Night pain"],
      ["traumaHistory", "Trauma history"], ["neurologicalSymptoms", "Neurological symptoms"],
      ["bladderBowelDysfunction", "Bladder/bowel dysfunction"], ["recentInfection", "Recent infection"],
      ["cancerHistory", "Cancer history"], ["steroidUse", "Steroid use"],
      ["osteoporosisRisk", "Osteoporosis risk"], ["cardiovascularSymptoms", "Cardiovascular symptoms"],
      ["severeHeadache", "Severe headache"], ["dizzinessBalanceIssues", "Dizziness / balance issues"],
    ];
    flags.forEach(([key, label]) => {
      if (ms[key]) redFlags.push(`${label}${ms[`${key}Details`] ? ` — ${ms[`${key}Details`]}` : ""}`);
    });
  }

  // ── Protocols ──
  const protocolsHtml = (protocols || []).map((p: any) => {
    const goals = parseJson(p.goals);
    const precautions = parseJson(p.precautions);
    const phases: Record<string, any[]> = {};
    (p.items || []).forEach((it: any) => { (phases[it.phase] = phases[it.phase] || []).push(it); });

    return `
    <div class="section">
      <h2>Treatment Protocol: ${esc(p.title)}</h2>
      <p class="meta">Status: ${esc(p.status)} · Created ${fmtDate(p.createdAt)} by ${esc(p.therapist?.firstName || "")} ${esc(p.therapist?.lastName || "")}${p.estimatedWeeks ? ` · ${p.estimatedWeeks} weeks` : ""}${(p as any).totalSessions ? ` · ${(p as any).totalSessions} sessions` : ""}</p>
      <p>${esc(p.summary)}</p>
      ${p.therapistComments ? `<p class="comment"><strong>Therapist comments:</strong> ${esc(p.therapistComments)}</p>` : ""}

      ${goals.length ? `<h3>Treatment Goals</h3><ul>${goals.map((g: any) => `<li><strong>${esc(g.timeline || g.phase || "")}</strong>: ${esc(g.goal || g.description || "")}${g.metrics ? ` <em>(${esc(g.metrics)})</em>` : ""}</li>`).join("")}</ul>` : ""}

      ${precautions.length ? `<div class="precautions"><h3>⚠ Precautions</h3><ul>${precautions.map((pr: any) => `<li>${esc(pr.precaution || pr.description || pr)}</li>`).join("")}</ul></div>` : ""}

      ${Object.entries(phases).map(([phase, items]) => `
        <h3>${esc(PHASE_LABELS[phase] || phase)}</h3>
        <table class="items">
          <thead><tr><th>Type</th><th>Item</th><th>Details</th><th>Dosage</th><th>Weeks</th></tr></thead>
          <tbody>
          ${(items as any[]).map((it) => `
            <tr>
              <td>${esc(ITEM_TYPES[it.itemType] || it.itemType)}</td>
              <td><strong>${esc(it.title)}</strong>${it.hiddenFromPatient ? " <em>(internal)</em>" : ""}</td>
              <td>${esc(it.description || "")}${it.instructions ? `<br/><em>${esc(it.instructions)}</em>` : ""}</td>
              <td>${[it.frequency, it.sets ? `${it.sets} sets` : "", it.reps ? `${it.reps} reps` : "", it.holdSeconds ? `hold ${it.holdSeconds}s` : "", it.restSeconds ? `rest ${it.restSeconds}s` : "", it.sessionDuration ? `${it.sessionDuration}min` : ""].filter(Boolean).map(esc).join(" · ") || "—"}</td>
              <td>${it.startWeek || 1}${it.endWeek ? `–${it.endWeek}` : "+"}</td>
            </tr>`).join("")}
          </tbody>
        </table>`).join("")}
    </div>`;
  }).join("");

  // ── SOAP notes ──
  const soapHtml = (soapNotes || []).length ? `
    <div class="section">
      <h2>Session Notes (SOAP)</h2>
      ${soapNotes.map((s: any) => `
        <div class="soap">
          <p class="meta">${fmtDate(s.createdAt)} — ${esc(s.therapist?.firstName || "")} ${esc(s.therapist?.lastName || "")}${s.painLevel != null ? ` · Pain ${s.painLevel}/10` : ""}</p>
          <table>
            ${row("Subjective", s.subjective)}
            ${row("Objective", s.objective)}
            ${row("Assessment", s.assessment)}
            ${row("Plan", s.plan)}
          </table>
        </div>`).join("")}
    </div>` : "";

  const printBar = opts?.forEmail ? "" : `
    <div class="no-print toolbar">
      <button onclick="window.print()">🖨 Print / Save as PDF</button>
      <span>Use your browser's print dialog and choose "Save as PDF" to download.</span>
    </div>`;

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<title>${t.titulo} — ${esc(patient.firstName)} ${esc(patient.lastName)}</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; color: #1a202c; margin: 0; padding: 24px; max-width: 900px; margin-inline: auto; font-size: 13px; line-height: 1.5; }
  h1 { font-size: 22px; margin: 0 0 2px; color: #0f766e; }
  h2 { font-size: 16px; color: #0f766e; border-bottom: 2px solid #0f766e; padding-bottom: 4px; margin: 28px 0 10px; }
  h3 { font-size: 13.5px; margin: 16px 0 6px; color: #334155; }
  .meta { color: #64748b; font-size: 11.5px; margin: 2px 0 8px; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #0f766e; padding-bottom: 12px; }
  .brand { text-align: right; color: #0f766e; font-weight: 700; }
  .brand small { display: block; color: #64748b; font-weight: 400; }
  table { border-collapse: collapse; width: 100%; margin: 6px 0; }
  td, th { padding: 5px 8px; vertical-align: top; text-align: left; border: 1px solid #e2e8f0; }
  td.lbl { width: 180px; font-weight: 600; background: #f8fafc; }
  table.items th { background: #f0fdfa; font-size: 11px; text-transform: uppercase; letter-spacing: .03em; color: #334155; }
  .precautions { background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 4px 14px 8px; margin: 10px 0; }
  .precautions h3 { color: #b91c1c; }
  .comment { background: #f0fdfa; border-left: 3px solid #0f766e; padding: 6px 10px; }
  .soap { margin-bottom: 14px; }
  .redflags li { color: #b91c1c; }
  .toolbar { background: #0f766e; color: #fff; padding: 10px 16px; border-radius: 8px; margin-bottom: 20px; display: flex; align-items: center; gap: 12px; }
  .toolbar button { background: #fff; color: #0f766e; border: 0; border-radius: 6px; padding: 8px 14px; font-weight: 700; cursor: pointer; font-size: 13px; }
  .toolbar span { font-size: 11.5px; opacity: .9; }
  .footer { margin-top: 32px; padding-top: 10px; border-top: 1px solid #e2e8f0; color: #94a3b8; font-size: 10.5px; }
  ul { margin: 4px 0; padding-left: 20px; }
  @media print { .no-print { display: none !important; } body { padding: 0; font-size: 11.5px; } .section { page-break-inside: avoid; } }
</style>
</head>
<body>
${printBar}
<div class="header">
  <div>
    <h1>${t.titulo}</h1>
    <p class="meta">${t.gerado} ${new Date().toLocaleDateString(idioma === "pt" ? "pt-BR" : "en-GB", { day: "2-digit", month: "long", year: "numeric" })}</p>
  </div>
  <div class="brand">Bruno Physical Rehabilitation<small>Ipswich, Suffolk · bpr.clinic</small></div>
</div>

<div class="section">
  <h2>${t.paciente}</h2>
  <table>
    ${row("Name", `${patient.firstName} ${patient.lastName}`)}
    ${row("Age", age ? `${age} years (DOB ${fmtDate(patient.dateOfBirth)})` : null)}
    ${row("Email", patient.email)}
    ${row("Phone", patient.phone)}
    ${row("Patient since", fmtDate(patient.createdAt))}
  </table>
</div>

${ms ? `
<div class="section">
  <h2>${t.triagem}</h2>
  <table>
    ${row("Chief complaint", ms.chiefComplaint)}
    ${row("Pain location", ms.painLocation)}
    ${row("Pain score", ms.painScore != null ? `${ms.painScore}/10` : null)}
    ${row("Pain duration", ms.painDuration)}
    ${row("Pain type", ms.painType)}
    ${row("Aggravating factors", ms.painAggravating)}
    ${row("Relieving factors", ms.painRelieving)}
    ${row("Functional limitations", ms.functionalLimitations)}
    ${row("Occupation", ms.occupation)}
    ${row("Activity level", ms.activityLevel)}
    ${row("Hobbies / sports", ms.hobbiesSports)}
    ${row("Surgical history", ms.surgicalHistory)}
    ${row("Other conditions", ms.otherConditions)}
    ${row("Current medications", ms.currentMedications)}
    ${row("Allergies", ms.allergies)}
    ${row("Previous rehabilitation", ms.previousPhysioDetails)}
    ${row("Treatment goals", ms.treatmentGoals)}
    ${row("Height / Weight", [ms.height, ms.weight].filter(Boolean).join(" / ") || null)}
    ${row("Smoker", ms.smoker ? "Yes" : null)}
    ${row("GP details", ms.gpDetails)}
  </table>
  ${redFlags.length ? `<h3 style="color:#b91c1c">Red Flags Reported</h3><ul class="redflags">${redFlags.map((f) => `<li>${esc(f)}</li>`).join("")}</ul>` : ""}
</div>` : ""}

${ba ? `
<div class="section">
  <h2>${t.postural}</h2>
  <p class="meta">${fmtDate(ba.createdAt)}${ba.overallScore != null ? ` · ${t.pontuacao}: ${ba.overallScore}` : ""}</p>
  ${ba.aiSummary ? `<p>${esc(ba.aiSummary)}</p>` : ""}
  ${ba.aiRecommendations ? `<p><strong>${t.recomendacoes}:</strong> ${esc(ba.aiRecommendations)}</p>` : ""}
</div>` : ""}

${dx ? `
<div class="section">
  <h2>${t.avaliacao}</h2>
  <p class="meta">${fmtDate(dx.createdAt)} · ${t.estado}: ${esc(dx.status)}</p>
  <p>${esc(dx.summary)}</p>
  ${parseJson(dx.conditions).length ? `<h3>${t.condicoes}</h3><ul>${parseJson(dx.conditions).map((c: any) => `<li><strong>${esc(c.name)}</strong>${c.severity ? ` (${esc(c.severity)})` : ""}: ${esc(c.description || "")}</li>`).join("")}</ul>` : ""}
  ${parseJson(dx.findings).length ? `<h3>${t.achados}</h3><ul>${parseJson(dx.findings).map((f: any) => `<li><strong>${esc(f.area || "")}</strong>: ${esc(f.finding || f.description || "")}</li>`).join("")}</ul>` : ""}
  ${dx.therapistComments ? `<p class="comment"><strong>${t.comentariosClinico}:</strong> ${esc(dx.therapistComments)}</p>` : ""}
</div>` : ""}

${renderMonitoringHTML(monitoring, idioma)}

${protocolsHtml}

${soapHtml}

<div class="footer">
  ${t.naoEhDiagnostico}
  <br><br>
  ${t.rodape}
</div>
</body>
</html>`;
}
