// The consolidated patient report as a real PDF, for the clinical record or to
// hand to the patient. Same generator family as the invoice (lib/invoice-pdf.ts,
// activity 70) so nothing new was added to the dependency list, and the same
// palette so a clinic's documents look like one set.
//
// It prints what lib/patient-report.ts read — the same call the screen makes,
// so "identical to the screen" is structural, not a promise to keep by hand.
// It states; it does not conclude: no trend is named and no diagnosis is
// implied, which is decision D3 of activity 074 and, since the commercial plan,
// a regulatory line (a product that diagnoses can be classified as a medical
// device by the MHRA).
import { jsPDF } from "jspdf";
import type { PatientReport } from "@/lib/patient-timeline";

const BRAND: [number, number, number] = [79, 115, 97]; // #4F7361
const INK: [number, number, number] = [38, 51, 43];
const GRAY: [number, number, number] = [85, 85, 85];
const FOOTER_GRAY: [number, number, number] = [136, 136, 136];
const LINE: [number, number, number] = [228, 225, 216];
const PANEL: [number, number, number] = [245, 244, 241];
const ALERT: [number, number, number] = [220, 38, 38];
const WHITE: [number, number, number] = [255, 255, 255];

const MARGIN = 15;
const PAGE_W = 210;
const PAGE_H = 297;
const BOTTOM = PAGE_H - 18;
const CONTENT_W = PAGE_W - MARGIN * 2;

export interface ReportPdfOptions {
  lang?: "en-GB" | "pt-BR";
  /** data: URI of the clinic logo. A URL cannot be drawn by jsPDF in Node. */
  logoDataUri?: string | null;
}

const T = {
  "en-GB": {
    doc: "PATIENT REPORT", generated: "Generated", period: "Period",
    dob: "Date of birth",
    summary: "In this period",
    exerciseDays: "Days with exercise logged in the app", checkIns: "Check-ins",
    bpReadings: "Blood pressure readings", appointments: "Appointments",
    notes: "Clinical notes", wearableDays: "Days with wearable data",
    ofDays: (n: number) => `of ${n} days`,
    above: (s: number, d: number) => `at or above ${s}/${d}`,
    bp: "Blood pressure", bpNone: "No reading in this period.",
    alertLine: "Alert threshold",
    date: "Date", reading: "Reading", pulse: "Pulse", method: "Method",
    exercise: "Exercise", exerciseNone: "No exercise logged in this period.",
    weekOf: "Week of", itemsDone: "Items completed",
    prescribed: "Prescribed exercises",
    checkInsTitle: "Daily check-ins", checkInsNone: "No check-in in this period.",
    pain: "Pain", mood: "Mood", energy: "Energy", sleep: "Sleep",
    outcomes: "Outcome measures", outcomesNone: "No outcome measure in this period.",
    vas: "VAS", faamAdl: "FAAM ADL", faamSport: "FAAM Sport", fn: "Function",
    appsTitle: "Appointments", appsNone: "No appointment in this period.",
    type: "Type", status: "Status", therapist: "Therapist",
    notesTitle: "Clinical notes", notesNone: "No clinical note in this period.",
    protocols: "Treatment protocols", protocolsNone: "No protocol sent to this patient.",
    items: "items", completed: "completed", weeks: "weeks",
    screening: "Medical screening", screeningNone: "Screening not filled in.",
    complaint: "Chief complaint", painScore: "Pain score", redFlags: "Red flags",
    noRedFlags: "None flagged.",
    wearable: "Wearable data", wearableNone: "No wearable data in this period.",
    steps: "Steps", avgSleep: "Average sleep", restingHr: "Average resting HR",
    hrv: "Average HRV", spo2: "Average SpO2", sources: "Sources",
    metric: "Measure", value: "Value",
    footer: "This report states what was recorded. It draws no conclusion and makes no diagnosis.",
    page: "Page",
    nothing: "Nothing was recorded for this patient in this period.",
  },
  "pt-BR": {
    doc: "RELATÓRIO DO PACIENTE", generated: "Gerado em", period: "Período",
    dob: "Data de nascimento",
    summary: "No período",
    exerciseDays: "Dias com exercício registrado no app", checkIns: "Check-ins",
    bpReadings: "Leituras de pressão", appointments: "Consultas",
    notes: "Notas clínicas", wearableDays: "Dias com dado de wearable",
    ofDays: (n: number) => `de ${n} dias`,
    above: (s: number, d: number) => `em ou acima de ${s}/${d}`,
    bp: "Pressão arterial", bpNone: "Nenhuma leitura neste período.",
    alertLine: "Limiar de alerta",
    date: "Data", reading: "Leitura", pulse: "Pulso", method: "Método",
    exercise: "Exercícios", exerciseNone: "Nenhum exercício registrado neste período.",
    weekOf: "Semana de", itemsDone: "Itens concluídos",
    prescribed: "Exercícios prescritos",
    checkInsTitle: "Check-ins diários", checkInsNone: "Nenhum check-in neste período.",
    pain: "Dor", mood: "Humor", energy: "Energia", sleep: "Sono",
    outcomes: "Medidas de evolução", outcomesNone: "Nenhuma medida neste período.",
    vas: "EVA", faamAdl: "FAAM AVD", faamSport: "FAAM Esporte", fn: "Função",
    appsTitle: "Consultas", appsNone: "Nenhuma consulta neste período.",
    type: "Tipo", status: "Status", therapist: "Terapeuta",
    notesTitle: "Notas clínicas", notesNone: "Nenhuma nota clínica neste período.",
    protocols: "Protocolos de tratamento", protocolsNone: "Nenhum protocolo enviado.",
    items: "itens", completed: "concluídos", weeks: "semanas",
    screening: "Triagem", screeningNone: "Triagem não preenchida.",
    complaint: "Queixa principal", painScore: "Nota da dor", redFlags: "Sinais de alerta",
    noRedFlags: "Nenhum marcado.",
    wearable: "Dados de wearable", wearableNone: "Nenhum dado de wearable neste período.",
    steps: "Passos", avgSleep: "Sono médio", restingHr: "FC de repouso média",
    hrv: "VFC média", spo2: "SpO2 média", sources: "Fontes",
    metric: "Medida", value: "Valor",
    footer: "Este relatório relata o que foi registrado. Não tira conclusão nem faz diagnóstico.",
    page: "Página",
    nothing: "Nada foi registrado para este paciente neste período.",
  },
} as const;

// helvetica (jsPDF's default, no embedded font) only covers Latin-1. A
// character outside it does not merely miss a glyph — it throws the string into
// a different encoding path with broken spacing.
//
// Replacing the rest with "?" was worse than the problem: QA pasted a
// therapist's note and read back "Load ? 20 kg" where the record said
// "≥ 20 kg". In a document that goes into the clinical record, a question mark
// in place of a comparison changes what was written. So the characters staff
// actually type — the ones a word processor inserts on its own — are
// transliterated, and "?" is left only for what has no sensible equivalent.
const TRANSLITERATE: Record<string, string> = {
  "—": "-", "–": "-", "‒": "-", "−": "-",
  "‘": "'", "’": "'", "‚": "'", "‛": "'",
  "“": '"', "”": '"', "„": '"', "″": '"',
  "…": "...", "•": "-",
  "→": "->", "←": "<-", "↑": "up", "↓": "down",
  "≥": ">=", "≤": "<=", "≠": "!=",
  "≈": "~", "⁄": "/",
  "‹": "<", "›": ">",
  "✓": "OK", "✗": "x", "€": "EUR",
};

function safeText(s: unknown): string {
  if (s === null || s === undefined) return "";
  return String(s).replace(/[^\u0000-\u00ff]/g, (ch) => TRANSLITERATE[ch] ?? "?");
}

const RED_FLAGS: Record<string, { en: string; pt: string }> = {
  unexplainedWeightLoss: { en: "Unexplained weight loss", pt: "Perda de peso inexplicada" },
  nightPain: { en: "Night pain", pt: "Dor noturna" },
  traumaHistory: { en: "Trauma history", pt: "Histórico de trauma" },
  neurologicalSymptoms: { en: "Neurological symptoms", pt: "Sintomas neurológicos" },
  bladderBowelDysfunction: { en: "Bladder/bowel dysfunction", pt: "Disfunção vesical/intestinal" },
  recentInfection: { en: "Recent infection", pt: "Infecção recente" },
  cancerHistory: { en: "Cancer history", pt: "Histórico de câncer" },
  steroidUse: { en: "Steroid use", pt: "Uso de corticoide" },
  osteoporosisRisk: { en: "Osteoporosis risk", pt: "Risco de osteoporose" },
  cardiovascularSymptoms: { en: "Cardiovascular symptoms", pt: "Sintomas cardiovasculares" },
  severeHeadache: { en: "Severe headache", pt: "Dor de cabeça intensa" },
  dizzinessBalanceIssues: { en: "Dizziness / balance", pt: "Tontura / equilíbrio" },
};

function average(values: any[]): number | null {
  const usable = values.filter((v) => typeof v === "number" && Number.isFinite(v));
  if (!usable.length) return null;
  return usable.reduce((a, b) => a + b, 0) / usable.length;
}

function weekKey(value: string | Date): string {
  const d = new Date(value);
  const day = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - day);
  return d.toISOString().split("T")[0];
}

export function buildPatientReportPdf(report: PatientReport, opts: ReportPdfOptions = {}): Buffer {
  const lang = opts.lang === "pt-BR" ? "pt-BR" : "en-GB";
  const t = T[lang];
  const loc = lang === "pt-BR" ? "pt-BR" : "en-GB";
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const rightX = PAGE_W - MARGIN;
  let y = MARGIN;

  const fmtDate = (d: any) => (d ? new Date(d).toLocaleDateString(loc, { day: "2-digit", month: "short", year: "numeric" }) : "-");
  const fmtDateTime = (d: any) => (d ? new Date(d).toLocaleString(loc, { dateStyle: "short", timeStyle: "short" }) : "-");

  function footer() {
    const pages = doc.getNumberOfPages();
    for (let i = 1; i <= pages; i++) {
      doc.setPage(i);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(...FOOTER_GRAY);
      doc.text(safeText(t.footer), MARGIN, PAGE_H - 10);
      doc.text(`${t.page} ${i}/${pages}`, rightX, PAGE_H - 10, { align: "right" });
    }
  }

  function ensureSpace(needed: number) {
    if (y + needed > BOTTOM) {
      doc.addPage();
      y = MARGIN;
    }
  }

  function sectionTitle(title: string) {
    ensureSpace(14);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(...BRAND);
    doc.text(safeText(title), MARGIN, y);
    y += 2;
    doc.setDrawColor(...BRAND);
    doc.setLineWidth(0.4);
    doc.line(MARGIN, y, rightX, y);
    y += 5;
  }

  function note(text: string) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...GRAY);
    doc.text(safeText(text), MARGIN, y);
    y += 7;
  }

  /** A table with a header band, page breaks and a repeated header. */
  function table(headers: string[], widths: number[], rows: string[][]) {
    const drawHeader = () => {
      doc.setFillColor(...BRAND);
      doc.rect(MARGIN, y, CONTENT_W, 6.5, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(...WHITE);
      let x = MARGIN + 2;
      headers.forEach((h, i) => {
        doc.text(safeText(h), x, y + 4.5);
        x += widths[i];
      });
      y += 6.5;
    };
    ensureSpace(14);
    drawHeader();
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    for (const row of rows) {
      ensureSpace(6);
      if (y === MARGIN) drawHeader();
      doc.setTextColor(...INK);
      let x = MARGIN + 2;
      row.forEach((cell, i) => {
        const lines = doc.splitTextToSize(safeText(cell), widths[i] - 3) as string[];
        doc.text(lines.slice(0, 1), x, y + 4);
        x += widths[i];
      });
      y += 5.5;
      doc.setDrawColor(...LINE);
      doc.setLineWidth(0.15);
      doc.line(MARGIN, y, rightX, y);
    }
    y += 5;
  }

  /**
   * The blood-pressure series, drawn with plain lines.
   *
   * recharts cannot run here, and a report about blood pressure without the
   * shape of it is a table someone has to read twice. The clinic's own alert
   * threshold is drawn and labelled — an unlabelled line is read as "normal",
   * which would be a conclusion this document must not make.
   */
  function bpChart(readings: any[]) {
    const h = 45;
    ensureSpace(h + 10);
    const values = readings.flatMap((r) => [r.systolic, r.diastolic, r.heartRate]).filter((v) => v != null) as number[];
    const max = Math.max(...values, report.thresholds.alertSystolic) + 10;
    const min = Math.min(...values) - 10;
    const span = Math.max(1, max - min);
    const x0 = MARGIN + 10;
    const w = CONTENT_W - 12;
    const yTop = y;
    const yBottom = y + h;
    const px = (i: number) => x0 + (readings.length === 1 ? w / 2 : (i * w) / (readings.length - 1));
    const py = (v: number) => yBottom - ((v - min) / span) * h;

    doc.setDrawColor(...LINE);
    doc.setLineWidth(0.2);
    for (let g = 0; g <= 4; g++) {
      const gy = yTop + (h * g) / 4;
      doc.line(x0, gy, x0 + w, gy);
      doc.setFontSize(6.5);
      doc.setTextColor(...FOOTER_GRAY);
      doc.text(String(Math.round(max - (span * g) / 4)), MARGIN + 8, gy + 1.5, { align: "right" });
    }

    doc.setDrawColor(...ALERT);
    doc.setLineWidth(0.3);
    const ty = py(report.thresholds.alertSystolic);
    for (let dx = 0; dx < w; dx += 4) doc.line(x0 + dx, ty, x0 + Math.min(dx + 2, w), ty);
    doc.setFontSize(6.5);
    doc.setTextColor(...ALERT);
    doc.text(`${safeText(t.alertLine)} ${report.thresholds.alertSystolic}`, x0 + w, ty - 1.5, { align: "right" });

    // Pulse as well, so the chart says what the screen's chart says. It is the
    // one series that can be missing on a given reading, so a gap is a gap
    // rather than a line drawn through nothing.
    const series: [string, [number, number, number], number][] = [
      ["systolic", ALERT, 0.5],
      ["diastolic", [37, 99, 235], 0.5],
      ["heartRate", [22, 163, 74], 0.3],
    ];
    for (const [key, colour, width] of series) {
      doc.setDrawColor(...colour);
      doc.setLineWidth(width);
      for (let i = 1; i < readings.length; i++) {
        const a = readings[i - 1][key];
        const b = readings[i][key];
        if (a == null || b == null) continue;
        doc.line(px(i - 1), py(a), px(i), py(b));
      }
      doc.setFillColor(...colour);
      readings.forEach((r, i) => {
        if (r[key] == null) return;
        doc.circle(px(i), py(r[key]), 0.6, "F");
      });
    }

    y = yBottom + 4;
    doc.setFontSize(6.5);
    doc.setTextColor(...FOOTER_GRAY);
    doc.text(`${fmtDate(readings[0].measuredAt)}  ->  ${fmtDate(readings[readings.length - 1].measuredAt)}`, x0, y);
    y += 6;
  }

  // ── Header ──
  if (opts.logoDataUri) {
    try {
      doc.addImage(opts.logoDataUri, MARGIN, y, 26, 13, undefined, "FAST");
    } catch {
      // A logo that will not decode must not cost the clinic its report.
    }
  }
  const clinicName = report.patient?.clinic?.name;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(...BRAND);
  doc.text(safeText(clinicName || ""), MARGIN + (opts.logoDataUri ? 30 : 0), y + 8);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(...INK);
  doc.text(safeText(t.doc), rightX, y + 4, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(...GRAY);
  doc.text(`${t.generated}: ${fmtDate(new Date())}`, rightX, y + 9, { align: "right" });

  y += 17;
  doc.setDrawColor(...BRAND);
  doc.setLineWidth(0.8);
  doc.line(MARGIN, y, rightX, y);
  y += 7;

  // ── Patient ──
  const name = `${report.patient?.firstName ?? ""} ${report.patient?.lastName ?? ""}`.trim();
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(...INK);
  doc.text(safeText(name), MARGIN, y);
  y += 5;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...GRAY);
  const meta = [
    report.patient?.email,
    report.patient?.dateOfBirth ? `${t.dob}: ${fmtDate(report.patient.dateOfBirth)}` : null,
  ].filter(Boolean);
  doc.text(safeText(meta.join("  ·  ")), MARGIN, y);
  y += 5;
  doc.setTextColor(...INK);
  doc.text(
    `${t.period}: ${fmtDate(report.period.from)} - ${fmtDate(report.period.to)} (${report.period.days} ${lang === "pt-BR" ? "dias" : "days"})`,
    MARGIN,
    y
  );
  y += 8;

  const s = report.summary;
  const empty =
    !report.screening && !report.protocols.length && !report.completions.length &&
    !report.checkIns.length && !report.bloodPressure.length && !report.outcomes.length &&
    !report.appointments.length && !report.notes.length && !report.wearable.length;

  if (empty) {
    note(t.nothing);
    footer();
    return Buffer.from(doc.output("arraybuffer") as ArrayBuffer);
  }

  // ── Summary panel ──
  const cells: [string, string, string?][] = [
    [String(s.exerciseDaysLogged), t.exerciseDays, t.ofDays(s.totalDays)],
    [String(s.checkIns), t.checkIns],
    [
      String(s.bloodPressureReadings),
      t.bpReadings,
      s.bloodPressureReadings
        ? `${s.bloodPressureAboveThreshold} ${t.above(report.thresholds.alertSystolic, report.thresholds.alertDiastolic)}`
        : undefined,
    ],
    [String(s.appointments), t.appointments],
    [String(s.clinicalNotes), t.notes],
    [String(s.wearableDays), t.wearableDays],
  ];
  ensureSpace(30);
  doc.setFillColor(...PANEL);
  doc.roundedRect(MARGIN, y, CONTENT_W, 26, 2, 2, "F");
  const colW = CONTENT_W / 3;
  cells.forEach((cell, i) => {
    const cx = MARGIN + 4 + (i % 3) * colW;
    const cy = y + 8 + Math.floor(i / 3) * 12;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(...INK);
    doc.text(cell[0], cx, cy);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(...GRAY);
    doc.text(safeText(cell[1] + (cell[2] ? ` (${cell[2]})` : "")), cx + 9, cy);
  });
  y += 32;

  // ── Blood pressure ──
  sectionTitle(t.bp);
  if (!report.bloodPressure.length) {
    note(t.bpNone);
  } else {
    if (report.bloodPressure.length > 1) bpChart(report.bloodPressure);
    table(
      [t.date, t.reading, t.pulse, t.method],
      [55, 45, 35, CONTENT_W - 139],
      report.bloodPressure.map((r: any) => [
        fmtDateTime(r.measuredAt),
        `${r.systolic}/${r.diastolic} mmHg`,
        r.heartRate ? `${r.heartRate} bpm` : "-",
        r.method ?? "-",
      ])
    );
  }

  // ── Exercise ──
  sectionTitle(t.exercise);
  if (!report.completions.length) {
    note(t.exerciseNone);
  } else {
    const buckets = new Map<string, number>();
    for (const c of report.completions) {
      const k = weekKey(c.completedDate);
      buckets.set(k, (buckets.get(k) ?? 0) + 1);
    }
    table(
      [t.weekOf, t.itemsDone],
      [80, CONTENT_W - 82],
      [...buckets.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([k, n]) => [fmtDate(k), String(n)])
    );
  }
  if (report.prescriptions.length) {
    table(
      [t.prescribed, t.completed],
      [120, CONTENT_W - 122],
      report.prescriptions.map((p: any) => [
        `${p.exercise?.name ?? "-"} (${p.sets}x${p.reps})`,
        String(p.completedCount ?? 0),
      ])
    );
  }

  // ── Check-ins ──
  sectionTitle(t.checkInsTitle);
  if (!report.checkIns.length) {
    note(t.checkInsNone);
  } else {
    table(
      [t.date, t.pain, t.mood, t.energy, t.sleep],
      [50, 30, 30, 30, CONTENT_W - 142],
      report.checkIns.map((c: any) => [
        fmtDate(c.checkinDate),
        `${c.painLevel}/10`,
        `${c.moodLevel}/5`,
        c.energyLevel != null ? `${c.energyLevel}/10` : "-",
        c.sleepQuality != null ? `${c.sleepQuality}/10` : "-",
      ])
    );
  }

  // ── Outcome measures ──
  sectionTitle(t.outcomes);
  if (!report.outcomes.length) {
    note(t.outcomesNone);
  } else {
    table(
      [t.date, t.vas, t.faamAdl, t.faamSport, t.fn],
      [50, 30, 35, 35, CONTENT_W - 152],
      report.outcomes.map((o: any) => [
        fmtDate(o.recordedAt),
        o.vasScore ?? "-",
        o.faamAdlPercent != null ? `${Math.round(o.faamAdlPercent)}%` : o.faamAdl ?? "-",
        o.faamSportPercent != null ? `${Math.round(o.faamSportPercent)}%` : o.faamSport ?? "-",
        o.overallFunction ?? "-",
      ].map(String))
    );
  }

  // ── Appointments ──
  sectionTitle(t.appsTitle);
  if (!report.appointments.length) {
    note(t.appsNone);
  } else {
    table(
      [t.date, t.type, t.status, t.therapist],
      [45, 55, 30, CONTENT_W - 132],
      report.appointments.map((a: any) => [
        fmtDateTime(a.dateTime),
        a.treatmentType ?? "-",
        a.status ?? "-",
        a.therapist ? `${a.therapist.firstName} ${a.therapist.lastName}` : "-",
      ])
    );
  }

  // ── Clinical notes ──
  sectionTitle(t.notesTitle);
  if (!report.notes.length) {
    note(t.notesNone);
  } else {
    for (const n of report.notes) {
      ensureSpace(20);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(...INK);
      doc.text(
        `${fmtDate(n.createdAt)}${n.therapist ? `  -  ${safeText(n.therapist.firstName)} ${safeText(n.therapist.lastName)}` : ""}`,
        MARGIN,
        y
      );
      y += 4.5;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(...GRAY);
      for (const [k, v] of [["S", n.subjective], ["O", n.objective], ["A", n.assessment], ["P", n.plan]] as const) {
        if (!v) continue;
        const lines = doc.splitTextToSize(`${k}: ${safeText(v)}`, CONTENT_W - 4) as string[];
        for (const line of lines) {
          ensureSpace(5);
          doc.text(line, MARGIN + 2, y);
          y += 4;
        }
      }
      y += 3;
    }
  }

  // ── Protocols ──
  sectionTitle(t.protocols);
  if (!report.protocols.length) {
    note(t.protocolsNone);
  } else {
    table(
      [t.protocols, t.items, t.completed],
      [110, 30, CONTENT_W - 142],
      report.protocols.map((p: any) => [
        p.title ?? "-",
        String((p.items ?? []).length),
        String((p.items ?? []).filter((i: any) => i.isCompleted).length),
      ])
    );
  }

  // ── Screening ──
  sectionTitle(t.screening);
  if (!report.screening) {
    note(t.screeningNone);
  } else {
    const sc = report.screening;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...INK);
    if (sc.chiefComplaint) {
      const lines = doc.splitTextToSize(`${t.complaint}: ${safeText(sc.chiefComplaint)}`, CONTENT_W) as string[];
      for (const line of lines) {
        ensureSpace(5);
        doc.text(line, MARGIN, y);
        y += 4.5;
      }
    }
    if (sc.painScore != null) {
      ensureSpace(5);
      doc.text(`${t.painScore}: ${sc.painScore}/10`, MARGIN, y);
      y += 4.5;
    }
    const flags = Object.keys(RED_FLAGS).filter((k) => sc[k] === true);
    ensureSpace(6);
    doc.setTextColor(...(flags.length ? ALERT : GRAY));
    const flagText = flags.length
      ? flags.map((k) => (lang === "pt-BR" ? RED_FLAGS[k].pt : RED_FLAGS[k].en)).join(", ")
      : t.noRedFlags;
    const flagLines = doc.splitTextToSize(`${t.redFlags}: ${safeText(flagText)}`, CONTENT_W) as string[];
    for (const line of flagLines) {
      ensureSpace(5);
      doc.text(line, MARGIN, y);
      y += 4.5;
    }
    y += 4;
  }

  // ── Wearable ──
  sectionTitle(t.wearable);
  if (!report.wearable.length) {
    note(t.wearableNone);
  } else {
    const rows = report.wearable;
    const sleep = average(rows.map((w: any) => w.sleepDuration));
    const hr = average(rows.map((w: any) => w.restingHr));
    const hrv = average(rows.map((w: any) => w.hrv));
    const spo2 = average(rows.map((w: any) => w.spo2));
    const steps = rows.reduce((sum: number, w: any) => sum + (w.steps ?? 0), 0);
    const sources = [...new Set(rows.map((w: any) => w.provider).filter(Boolean))].join(", ");
    table(
      [t.metric, t.value],
      [90, CONTENT_W - 92],
      [
        [t.steps, steps ? steps.toLocaleString(loc) : "-"],
        [t.avgSleep, sleep != null ? `${(sleep / 60).toFixed(1)} h` : "-"],
        [t.restingHr, hr != null ? `${Math.round(hr)} bpm` : "-"],
        [t.hrv, hrv != null ? `${Math.round(hrv)} ms` : "-"],
        [t.spo2, spo2 != null ? `${Math.round(spo2)}%` : "-"],
        [t.sources, sources || "-"],
      ]
    );
  }

  footer();
  return Buffer.from(doc.output("arraybuffer") as ArrayBuffer);
}
