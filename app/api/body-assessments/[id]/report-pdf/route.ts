import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/db";
import { getEffectiveUser } from "@/lib/get-effective-user";
import { jsPDF } from "jspdf";

// ═══════════════════════════════════════════
// Color palette — Professional healthcare
// ═══════════════════════════════════════════
const BRAND   = [44, 82, 130];     // Deep navy blue
const ACCENT  = [93, 201, 192];    // Teal / turquoise
const DARK    = [30, 41, 59];      // Slate-900
const MID     = [71, 85, 105];     // Slate-600
const GRAY    = [100, 116, 139];   // Slate-500
const LGRAY   = [148, 163, 184];   // Slate-400
const XLIGHT  = [241, 245, 249];   // Slate-100
const RED     = [220, 38, 38];
const ORANGE  = [234, 138, 30];
const GREEN   = [22, 163, 74];
const BLUE    = [37, 99, 235];
const PURPLE  = [124, 58, 237];
const WHITE   = [255, 255, 255];

const scoreColor = (v: number) => v >= 80 ? GREEN : v >= 60 ? ORANGE : RED;
const scoreLabel = (v: number, pt: boolean) =>
  v >= 80 ? (pt ? "Bom" : "Good") : v >= 60 ? (pt ? "Moderado" : "Moderate") : (pt ? "Precisa Atenção" : "Needs Attention");
const sevColor = (s: string) => s === "severe" ? RED : s === "moderate" ? ORANGE : GREEN;

// GET - Generate PDF report for a body assessment
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const effective = await getEffectiveUser();
    if (!effective) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = await prisma.user.findUnique({
      where: { id: effective.userId },
      select: { role: true, preferredLocale: true },
    });

    const assessment = await (prisma as any).bodyAssessment.findUnique({
      where: { id: params.id },
      include: {
        patient: { select: { id: true, firstName: true, lastName: true, email: true, preferredLocale: true, dateOfBirth: true } },
        therapist: { select: { firstName: true, lastName: true } },
        clinic: { select: { name: true, logoUrl: true } },
      },
    });
    if (!assessment) return NextResponse.json({ error: "Assessment not found" }, { status: 404 });
    if (user?.role === "PATIENT" && assessment.patient.id !== effective.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const pa = assessment.postureAnalysis || {};
    const pt = (assessment.reportLanguage || assessment.patient.preferredLocale || user?.preferredLocale) === "pt-BR";
    const L = (en: string, ptStr: string) => (pt ? ptStr : en);
    const clinicName = assessment.clinic?.name || "Bruno Physical Rehabilitation";

    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const M = 14; // margin
    const W = pageW - M * 2; // content width
    let y = 0;

    // ─── Utility functions ───
    const newPage = () => { doc.addPage(); y = M + 6; };
    const need = (h: number) => { if (y + h > pageH - 18) newPage(); };

    const setC = (c: number[]) => doc.setTextColor(c[0], c[1], c[2]);
    const setF = (c: number[]) => doc.setFillColor(c[0], c[1], c[2]);
    const setD = (c: number[]) => doc.setDrawColor(c[0], c[1], c[2]);

    // Section heading with left accent bar
    const heading = (title: string, color: number[] = BRAND) => {
      need(16);
      y += 4;
      setF(color);
      doc.rect(M, y - 4, 2.5, 10, "F");
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      setC(DARK);
      doc.text(title, M + 6, y + 2.5);
      y += 12;
    };

    // Sub-heading
    const subHeading = (title: string, color: number[] = GRAY) => {
      need(10);
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      setC(color);
      doc.text(title, M + 2, y);
      y += 5;
    };

    // Paragraph text
    const para = (text: string, indent = 0, fontSize = 8.5) => {
      doc.setFontSize(fontSize);
      doc.setFont("helvetica", "normal");
      setC(MID);
      const lines = doc.splitTextToSize(text, W - indent);
      for (const line of lines) { need(4.5); doc.text(line, M + indent, y); y += 4; }
    };

    // Educational callout box (light teal bg with icon-like prefix)
    const educationBox = (title: string, text: string) => {
      const lines = doc.splitTextToSize(text, W - 14);
      const boxH = lines.length * 3.8 + 10;
      need(boxH + 4);
      setF([240, 253, 250]); // teal-50
      setD([167, 243, 208]); // green-200
      doc.setLineWidth(0.3);
      doc.roundedRect(M, y, W, boxH, 2, 2, "FD");
      // Accent left bar
      setF(ACCENT);
      doc.rect(M, y, 2, boxH, "F");
      // Title
      doc.setFontSize(7.5);
      doc.setFont("helvetica", "bold");
      setC([15, 118, 110]); // teal-700
      doc.text(`💡 ${title}`, M + 5, y + 4.5);
      // Body
      doc.setFontSize(7.5);
      doc.setFont("helvetica", "normal");
      setC([71, 85, 105]);
      let ty = y + 9;
      for (const line of lines) { doc.text(line, M + 5, ty); ty += 3.8; }
      y += boxH + 3;
    };

    // Score bar with percentage + label
    const scoreBar = (x: number, barW: number, label: string, value: number, showTag = true) => {
      const c = scoreColor(value);
      // Label
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      setC(MID);
      doc.text(label, x, y - 1.5);
      // Track
      setF(XLIGHT);
      doc.roundedRect(x, y, barW, 4.5, 1.2, 1.2, "F");
      // Fill
      const fw = Math.max((value / 100) * barW, 2);
      setF(c);
      doc.roundedRect(x, y, fw, 4.5, 1.2, 1.2, "F");
      // Value
      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      setC(c);
      doc.text(`${Math.round(value)}/100`, x + barW + 2, y + 3.5);
      // Tag
      if (showTag) {
        const tag = scoreLabel(value, pt);
        doc.setFontSize(6);
        doc.setFont("helvetica", "normal");
        doc.text(tag, x + barW + 14, y + 3.5);
      }
    };

    // Rounded card (filled rect with padding)
    const cardStart = (h: number, bgColor: number[] = XLIGHT) => {
      need(h + 4);
      setF(bgColor);
      doc.roundedRect(M, y, W, h, 2.5, 2.5, "F");
    };

    // ═══════════════════════════════════════════
    // PAGE 1 — COVER & SCORE DASHBOARD
    // ═══════════════════════════════════════════

    // Top brand bar
    setF(BRAND);
    doc.rect(0, 0, pageW, 3, "F");
    setF(ACCENT);
    doc.rect(0, 3, pageW, 1, "F");

    y = 14;

    // Clinic name
    doc.setFontSize(20);
    doc.setFont("helvetica", "bold");
    setC(BRAND);
    doc.text(clinicName, pageW / 2, y, { align: "center" });
    y += 8;

    // Subtitle
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    setC(LGRAY);
    doc.text(L("Evidence-Based Physiotherapy & Rehabilitation", "Fisioterapia e Reabilitação Baseada em Evidências"), pageW / 2, y, { align: "center" });
    y += 10;

    // Report title
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    setC(DARK);
    doc.text(L("Biomechanical Assessment Report", "Relatório de Avaliação Biomecânica"), pageW / 2, y, { align: "center" });
    y += 5;

    // Decorative accent line
    setD(ACCENT);
    doc.setLineWidth(1);
    doc.line(pageW / 2 - 30, y, pageW / 2 + 30, y);
    y += 8;

    // Patient info card
    const dateStr = new Date(assessment.createdAt).toLocaleDateString(pt ? "pt-BR" : "en-GB", { day: "numeric", month: "long", year: "numeric" });
    const patientAge = assessment.patient.dateOfBirth
      ? Math.floor((Date.now() - new Date(assessment.patient.dateOfBirth).getTime()) / 31557600000)
      : null;

    cardStart(22, [248, 250, 252]);
    const infoY = y + 5;
    doc.setFontSize(8.5);
    doc.setFont("helvetica", "bold");
    setC(DARK);
    doc.text(`${L("Patient", "Paciente")}:`, M + 5, infoY);
    doc.setFont("helvetica", "normal");
    setC(MID);
    doc.text(`${assessment.patient.firstName} ${assessment.patient.lastName}${patientAge ? ` (${patientAge} ${L("years", "anos")})` : ""}`, M + 28, infoY);

    doc.setFont("helvetica", "bold");
    setC(DARK);
    doc.text(`${L("Assessment", "Avaliação")}:`, pageW / 2 + 5, infoY);
    doc.setFont("helvetica", "normal");
    setC(MID);
    doc.text(`#${assessment.assessmentNumber}`, pageW / 2 + 30, infoY);

    doc.setFont("helvetica", "bold");
    setC(DARK);
    doc.text(`${L("Date", "Data")}:`, M + 5, infoY + 6);
    doc.setFont("helvetica", "normal");
    setC(MID);
    doc.text(dateStr, M + 19, infoY + 6);

    if (assessment.therapist) {
      doc.setFont("helvetica", "bold");
      setC(DARK);
      doc.text(`${L("Therapist", "Terapeuta")}:`, pageW / 2 + 5, infoY + 6);
      doc.setFont("helvetica", "normal");
      setC(MID);
      doc.text(`${assessment.therapist.firstName} ${assessment.therapist.lastName}`, pageW / 2 + 30, infoY + 6);
    }

    y += 26;

    // ─── OVERALL SCORE HIGHLIGHT ───
    if (assessment.overallScore != null) {
      need(42);
      y += 2;
      const ov = Math.round(assessment.overallScore);
      const ovC = scoreColor(ov);

      // Big score circle
      const cx = M + 20;
      const cy = y + 17;
      setF([248, 250, 252]);
      doc.circle(cx, cy, 16, "F");
      setD(ovC);
      doc.setLineWidth(2.5);
      doc.circle(cx, cy, 16, "S");
      doc.setFontSize(24);
      doc.setFont("helvetica", "bold");
      setC(ovC);
      doc.text(`${ov}`, cx, cy + 3, { align: "center" });
      doc.setFontSize(6.5);
      doc.setFont("helvetica", "normal");
      setC(LGRAY);
      doc.text("/100", cx, cy + 8, { align: "center" });
      doc.setFontSize(7);
      doc.setFont("helvetica", "bold");
      setC(ovC);
      doc.text(scoreLabel(ov, pt).toUpperCase(), cx, cy + 13, { align: "center" });

      // Score bars to the right
      const bx = M + 44;
      const bw = W - 72;
      const scores = [
        { label: L("Posture", "Postura"), value: assessment.postureScore },
        { label: L("Symmetry", "Simetria"), value: assessment.symmetryScore },
        { label: L("Mobility", "Mobilidade"), value: assessment.mobilityScore },
      ].filter((s: any) => s.value != null);

      let by = y + 2;
      for (const s of scores) {
        const tempY = y; y = by;
        scoreBar(bx, bw, s.label, Math.round(s.value!), true);
        y = tempY;
        by += 11;
      }

      y += 38;
    }

    // ─── PROPRIETARY SCORES ───
    const props = pa.proprietaryScores;
    if (props) {
      need(28);
      const boxW = (W - 6) / 3;
      const propScores = [
        { label: L("Global Postural Index", "Índice Postural Global"), value: props.globalPosturalIndex || 0, color: BLUE },
        { label: L("Biomechanical Risk", "Risco Biomecânico"), value: props.biomechanicalRiskScore || 0, color: RED },
        { label: L("Asymmetry Index", "Índice de Assimetria"), value: props.bodyAsymmetryIndex || 0, color: ORANGE },
      ];
      for (let i = 0; i < propScores.length; i++) {
        const bx = M + i * (boxW + 3);
        const c = propScores[i].color;
        // Card bg
        setF([248, 250, 252]);
        doc.roundedRect(bx, y, boxW, 22, 2, 2, "F");
        // Top color bar
        setF(c);
        doc.roundedRect(bx, y, boxW, 3, 2, 0, "F");
        doc.rect(bx, y + 1.5, boxW, 1.5, "F"); // fill corner gap
        // Value
        doc.setFontSize(18);
        doc.setFont("helvetica", "bold");
        setC(c);
        doc.text(`${Math.round(propScores[i].value)}`, bx + boxW / 2, y + 13, { align: "center" });
        // Label
        doc.setFontSize(6);
        doc.setFont("helvetica", "normal");
        setC(GRAY);
        doc.text(propScores[i].label, bx + boxW / 2, y + 19, { align: "center" });
      }
      y += 28;
    }

    // ─── Score Interpretation Guide ───
    need(16);
    y += 2;
    setF([248, 250, 252]);
    doc.roundedRect(M, y, W, 12, 2, 2, "F");
    doc.setFontSize(7);
    doc.setFont("helvetica", "bold");
    setC(DARK);
    doc.text(L("Score Interpretation Guide:", "Guia de Interpretação:"), M + 4, y + 4.5);

    const legends = [
      { label: "80-100", desc: L("Good", "Bom"), color: GREEN },
      { label: "60-79", desc: L("Moderate", "Moderado"), color: ORANGE },
      { label: "0-59", desc: L("Needs Attention", "Precisa Atenção"), color: RED },
    ];
    let lx = M + 58;
    for (const lg of legends) {
      setF(lg.color);
      doc.circle(lx, y + 3.8, 2, "F");
      doc.setFontSize(6.5);
      doc.setFont("helvetica", "bold");
      setC(lg.color);
      doc.text(lg.label, lx + 4, y + 4.5);
      doc.setFont("helvetica", "normal");
      setC(MID);
      doc.text(lg.desc, lx + 4, y + 8.5);
      lx += 38;
    }
    y += 16;

    // ─── SEGMENT SCORES ───
    if (assessment.segmentScores) {
      heading(L("Body Segment Analysis", "Análise por Segmento Corporal"), ACCENT);

      const segs = ["head", "shoulders", "spine", "hips", "knees", "ankles"];
      const segLabels: Record<string, string> = pt
        ? { head: "Cabeça", shoulders: "Ombros", spine: "Coluna", hips: "Quadril", knees: "Joelhos", ankles: "Tornozelos" }
        : { head: "Head", shoulders: "Shoulders", spine: "Spine", hips: "Hips", knees: "Knees", ankles: "Ankles" };

      const bw = W - 44;
      for (const seg of segs) {
        const data = (assessment.segmentScores as any)[seg];
        if (!data) continue;
        need(12);
        scoreBar(M, bw, `${segLabels[seg]}${data.keyIssue ? `  ·  ${data.keyIssue}` : ""}`, data.score || 0, true);
        y += 10;
      }

      // Educational box
      educationBox(
        L("What are Segment Scores?", "O que são Scores por Segmento?"),
        L(
          "Each body segment is evaluated independently. Low scores indicate areas that may benefit from targeted exercises and manual therapy. Your therapist will prioritise the segments that need the most attention.",
          "Cada segmento corporal é avaliado independentemente. Scores baixos indicam áreas que podem beneficiar de exercícios direcionados e terapia manual. O seu terapeuta irá priorizar os segmentos que precisam de mais atenção."
        )
      );
    }

    // ─── BODY COMPOSITION & HEALTH ───
    if (assessment.bmi || assessment.bodyFatPercent || assessment.waistCm) {
      heading(L("Body Composition & Health Profile", "Composição Corporal & Perfil de Saúde"), [220, 38, 127]); // rose

      // BMI row
      if (assessment.bmi) {
        need(20);
        const bmiVal = Math.round(assessment.bmi * 10) / 10;
        const bmiClass = assessment.bmiClassification || "unknown";
        const bmiLabels: Record<string, { en: string; pt: string }> = {
          underweight: { en: "Underweight", pt: "Abaixo do peso" },
          normal: { en: "Normal", pt: "Normal" },
          overweight: { en: "Overweight", pt: "Sobrepeso" },
          obese_i: { en: "Obesity I", pt: "Obesidade I" },
          obese_ii: { en: "Obesity II", pt: "Obesidade II" },
          obese_iii: { en: "Obesity III", pt: "Obesidade III" },
        };
        const bmiTag = pt ? (bmiLabels[bmiClass]?.pt || bmiClass) : (bmiLabels[bmiClass]?.en || bmiClass);
        const bmiC = bmiClass === "normal" ? GREEN : bmiClass === "overweight" ? ORANGE : bmiClass === "underweight" ? BLUE : RED;

        // BMI card
        setF([255, 241, 242]); // rose-50
        doc.roundedRect(M, y, W / 3 - 2, 18, 2, 2, "F");
        doc.setFontSize(7);
        doc.setFont("helvetica", "bold");
        setC(GRAY);
        doc.text(L("BMI / IMC", "IMC"), M + 3, y + 5);
        doc.setFontSize(16);
        doc.setFont("helvetica", "bold");
        setC(bmiC);
        doc.text(`${bmiVal}`, M + 3, y + 13);
        doc.setFontSize(7);
        doc.setFont("helvetica", "normal");
        setC(bmiC);
        doc.text(`kg/m² — ${bmiTag}`, M + 20, y + 13);

        // Height/Weight card
        if (assessment.heightCm || assessment.weightKg) {
          const cx = M + W / 3 + 1;
          setF(XLIGHT);
          doc.roundedRect(cx, y, W / 3 - 2, 18, 2, 2, "F");
          doc.setFontSize(7);
          doc.setFont("helvetica", "bold");
          setC(GRAY);
          doc.text(L("Height / Weight", "Altura / Peso"), cx + 3, y + 5);
          doc.setFontSize(11);
          doc.setFont("helvetica", "bold");
          setC(DARK);
          const hw = [];
          if (assessment.heightCm) hw.push(`${assessment.heightCm} cm`);
          if (assessment.weightKg) hw.push(`${assessment.weightKg} kg`);
          doc.text(hw.join("  ·  "), cx + 3, y + 13);
        }

        // Body fat card
        if (assessment.bodyFatPercent) {
          const cx = M + (W / 3) * 2 + 2;
          setF([245, 243, 255]); // violet-50
          doc.roundedRect(cx, y, W / 3 - 2, 18, 2, 2, "F");
          doc.setFontSize(7);
          doc.setFont("helvetica", "bold");
          setC(GRAY);
          doc.text(L("Body Fat", "Gordura Corporal"), cx + 3, y + 5);
          doc.setFontSize(16);
          doc.setFont("helvetica", "bold");
          const bfC = assessment.bodyFatPercent > 30 ? RED : assessment.bodyFatPercent > 25 ? ORANGE : GREEN;
          setC(bfC);
          doc.text(`${assessment.bodyFatPercent}%`, cx + 3, y + 13);
          if (assessment.bodyFatMethod) {
            doc.setFontSize(6);
            doc.setFont("helvetica", "normal");
            setC(LGRAY);
            doc.text(assessment.bodyFatMethod, cx + 22, y + 13);
          }
        }
        y += 22;
      }

      // Anthropometric measurements row
      const anthroItems: { label: string; value: string }[] = [];
      if (assessment.waistCm) anthroItems.push({ label: L("Waist", "Cintura"), value: `${assessment.waistCm} cm` });
      if (assessment.hipCm) anthroItems.push({ label: L("Hip", "Quadril"), value: `${assessment.hipCm} cm` });
      if (assessment.waistHipRatio) anthroItems.push({ label: L("W/H Ratio", "Relação C/Q"), value: `${assessment.waistHipRatio}` });
      if (assessment.neckCm) anthroItems.push({ label: L("Neck", "Pescoço"), value: `${assessment.neckCm} cm` });
      if (assessment.leanMassKg) anthroItems.push({ label: L("Lean Mass", "M. Magra"), value: `${assessment.leanMassKg} kg` });
      if (assessment.fatMassKg) anthroItems.push({ label: L("Fat Mass", "M. Gorda"), value: `${assessment.fatMassKg} kg` });
      if (assessment.basalMetabolicRate) anthroItems.push({ label: "BMR/TMB", value: `${assessment.basalMetabolicRate} kcal` });

      if (anthroItems.length > 0) {
        need(14);
        const itemW = W / Math.min(anthroItems.length, 5);
        for (let i = 0; i < anthroItems.length && i < 5; i++) {
          const ax = M + i * itemW;
          doc.setFontSize(9);
          doc.setFont("helvetica", "bold");
          setC(DARK);
          doc.text(anthroItems[i].value, ax + 2, y + 4);
          doc.setFontSize(6.5);
          doc.setFont("helvetica", "normal");
          setC(LGRAY);
          doc.text(anthroItems[i].label, ax + 2, y + 9);
        }
        y += 14;
      }

      // Health risk row
      if (assessment.healthScore || assessment.cardiovascularRisk) {
        need(16);
        setF([240, 253, 250]); // teal-50
        doc.roundedRect(M, y, W, 12, 2, 2, "F");
        let rx = M + 3;
        if (assessment.healthScore) {
          const hs = Math.round(assessment.healthScore);
          doc.setFontSize(7);
          doc.setFont("helvetica", "bold");
          setC(GRAY);
          doc.text(L("Health Score:", "Score de Saúde:"), rx, y + 5);
          rx += 24;
          const hsC = hs >= 70 ? GREEN : hs >= 50 ? ORANGE : RED;
          doc.setFontSize(11);
          setC(hsC);
          doc.text(`${hs}/100`, rx, y + 5.5);
          rx += 20;
        }
        if (assessment.cardiovascularRisk) {
          doc.setFontSize(7);
          doc.setFont("helvetica", "bold");
          setC(GRAY);
          doc.text(L("CV Risk:", "Risco CV:"), rx, y + 5);
          rx += 16;
          const riskC = assessment.cardiovascularRisk === "low" ? GREEN : assessment.cardiovascularRisk === "moderate" ? ORANGE : RED;
          doc.setFontSize(8);
          setC(riskC);
          doc.text(assessment.cardiovascularRisk.toUpperCase(), rx, y + 5);
          rx += 22;
        }
        if (assessment.metabolicRisk) {
          doc.setFontSize(7);
          doc.setFont("helvetica", "bold");
          setC(GRAY);
          doc.text(L("Metabolic:", "Metabólico:"), rx, y + 5);
          rx += 18;
          const riskC = assessment.metabolicRisk === "low" ? GREEN : assessment.metabolicRisk === "moderate" ? ORANGE : RED;
          doc.setFontSize(8);
          setC(riskC);
          doc.text(assessment.metabolicRisk.toUpperCase(), rx, y + 5);
        }
        y += 16;
      }

      // Educational box
      educationBox(
        L("About Body Composition", "Sobre Composição Corporal"),
        L(
          "BMI is a screening tool, not a diagnosis. Waist circumference and waist-to-hip ratio are stronger indicators of cardiovascular risk. Body fat percentage provides a more accurate picture of body composition than weight alone. Your therapist considers all these metrics alongside your biomechanical assessment.",
          "O IMC é uma ferramenta de triagem, não um diagnóstico. A circunferência da cintura e a relação cintura/quadril são indicadores mais fortes de risco cardiovascular. A percentagem de gordura corporal fornece uma imagem mais precisa da composição corporal do que o peso isolado. O seu terapeuta considera todas estas métricas em conjunto com a sua avaliação biomecânica."
        )
      );
    }

    // ─── SEDENTARY PROFILE IN PDF ───
    if (assessment.sittingHoursPerDay || assessment.walkingMinutesDay || assessment.ergonomicAssessment) {
      heading(L("Activity & Ergonomic Profile", "Perfil de Atividade & Ergonomia"), ORANGE);
      const sedItems: string[] = [];
      if (assessment.sittingHoursPerDay) sedItems.push(`${L("Sitting", "Sentado")}: ${assessment.sittingHoursPerDay}h/${L("day", "dia")}`);
      if (assessment.walkingMinutesDay) sedItems.push(`${L("Walking", "Caminhada")}: ${assessment.walkingMinutesDay} min/${L("day", "dia")}`);
      if (assessment.stepsPerDay) sedItems.push(`${L("Steps", "Passos")}: ${assessment.stepsPerDay}/${L("day", "dia")}`);
      if (assessment.activityLevel) sedItems.push(`${L("Level", "Nível")}: ${assessment.activityLevel}`);
      if (sedItems.length > 0) {
        para(sedItems.join("  ·  "));
      }
      if (assessment.ergonomicAssessment) {
        const ea = assessment.ergonomicAssessment;
        const eItems: string[] = [];
        if (ea.deskHeight) eItems.push(`${L("Desk", "Mesa")}: ${ea.deskHeight}`);
        if (ea.monitorHeight) eItems.push(`${L("Monitor", "Monitor")}: ${ea.monitorHeight}`);
        if (ea.chairType) eItems.push(`${L("Chair", "Cadeira")}: ${ea.chairType}`);
        if (ea.breakFrequency) eItems.push(`${L("Breaks", "Pausas")}: ${ea.breakFrequency}`);
        if (eItems.length > 0) {
          subHeading(L("Ergonomic Assessment", "Avaliação Ergonômica"));
          para(eItems.join("  ·  "));
        }
        if (ea.notes) para(ea.notes, 2);
      }
      y += 3;
    }

    // ═══════════════════════════════════════════
    // PAGE 2+ — DETAILED ANALYSIS
    // ═══════════════════════════════════════════

    // ─── EXECUTIVE SUMMARY ───
    if (pa.executiveSummary || assessment.aiSummary) {
      heading(L("Executive Summary", "Resumo Executivo"), BRAND);
      para(pa.executiveSummary || assessment.aiSummary);
      y += 3;

      educationBox(
        L("How to Read This Report", "Como Ler Este Relatório"),
        L(
          "This report summarises your biomechanical assessment. Each section explains a different aspect of your body\'s movement and alignment. Green scores are good, orange means moderate, and red areas need attention. The recommendations at the end are tailored specifically to your needs.",
          "Este relatório resume a sua avaliação biomecânica. Cada secção explica um aspecto diferente do movimento e alinhamento do seu corpo. Scores verdes são bons, laranja significa moderado, e áreas vermelhas precisam de atenção. As recomendações no final são personalizadas para as suas necessidades."
        )
      );
    }

    // ─── BIOMECHANICAL INTEGRATION ───
    if (pa.biomechanicalIntegration) {
      heading(L("Biomechanical Integration", "Integração Biomecânica"), [75, 85, 170]);
      para(pa.biomechanicalIntegration);
      y += 3;

      educationBox(
        L("Why Does This Matter?", "Por Que Isto é Importante?"),
        L(
          "Your body works as an interconnected chain. A problem in one area (e.g. tight hip flexors) can cause compensations elsewhere (e.g. lower back pain). Understanding these connections helps us treat the root cause, not just the symptoms.",
          "O seu corpo funciona como uma cadeia interligada. Um problema numa área (ex: flexores da anca tensos) pode causar compensações noutras (ex: dor lombar). Compreender estas ligações ajuda-nos a tratar a causa raiz, não apenas os sintomas."
        )
      );
    }

    // ─── FUNCTIONAL IMPACT ───
    if (pa.functionalImpact) {
      heading(L("Probable Functional Impact", "Impacto Funcional Provável"), ORANGE);
      para(pa.functionalImpact);
      y += 3;
    }

    // ─── MUSCLE HYPOTHESES ───
    if (pa.muscleHypotheses) {
      heading(L("Muscular Analysis", "Análise Muscular"), RED);

      if (pa.muscleHypotheses.hypertonic?.length > 0) {
        need(10);
        // Card for hypertonic muscles
        const items = pa.muscleHypotheses.hypertonic;
        const cardH = items.length * 4.5 + 10;
        need(cardH + 2);
        setF([254, 242, 242]); // red-50
        doc.roundedRect(M, y, W, cardH, 2, 2, "F");
        setF(RED);
        doc.rect(M, y, 2, cardH, "F");

        doc.setFontSize(8);
        doc.setFont("helvetica", "bold");
        setC(RED);
        doc.text(L("Probable Hypertonia (Overactive/Tight)", "Hipertonia Provável (Hiperativo/Tenso)"), M + 5, y + 5);
        let hy = y + 9;
        for (const m of items) {
          doc.setFontSize(7.5);
          doc.setFont("helvetica", "normal");
          setC(MID);
          doc.text(`▸  ${m.muscle} (${m.side || "bilateral"}) — ${m.severity || ""}${m.notes ? `: ${m.notes}` : ""}`, M + 5, hy);
          hy += 4.5;
        }
        y += cardH + 3;
      }

      if (pa.muscleHypotheses.hypotonic?.length > 0) {
        const items = pa.muscleHypotheses.hypotonic;
        const cardH = items.length * 4.5 + 10;
        need(cardH + 2);
        setF([239, 246, 255]); // blue-50
        doc.roundedRect(M, y, W, cardH, 2, 2, "F");
        setF(BLUE);
        doc.rect(M, y, 2, cardH, "F");

        doc.setFontSize(8);
        doc.setFont("helvetica", "bold");
        setC(BLUE);
        doc.text(L("Probable Hypotonia (Underactive/Weak)", "Hipotonia Provável (Hipoativo/Fraco)"), M + 5, y + 5);
        let hy = y + 9;
        for (const m of items) {
          doc.setFontSize(7.5);
          doc.setFont("helvetica", "normal");
          setC(MID);
          doc.text(`▸  ${m.muscle} (${m.side || "bilateral"}) — ${m.severity || ""}${m.notes ? `: ${m.notes}` : ""}`, M + 5, hy);
          hy += 4.5;
        }
        y += cardH + 3;
      }

      if (pa.muscleHypotheses.analysis || pa.muscleHypotheses.summary) {
        para(pa.muscleHypotheses.analysis || pa.muscleHypotheses.summary);
        y += 2;
      }

      educationBox(
        L("Understanding Muscle Imbalances", "Entendendo Desequilíbrios Musculares"),
        L(
          "Hypertonic muscles are overactive and tight — they pull your body out of alignment. Hypotonic muscles are underactive and weak — they fail to provide proper support. Treatment focuses on releasing tight muscles and strengthening weak ones to restore balance.",
          "Músculos hipertónicos são hiperativos e tensos — puxam o corpo para fora do alinhamento. Músculos hipotónicos são hipoativos e fracos — falham em fornecer suporte adequado. O tratamento foca em liberar músculos tensos e fortalecer os fracos para restaurar o equilíbrio."
        )
      );
    }

    // ─── PATIENT COMPLAINT CORRELATION ───
    if (pa.patientComplaintCorrelation) {
      heading(L("How This Relates to Your Symptoms", "Como Isto Se Relaciona com os Seus Sintomas"), [180, 130, 30]);
      para(pa.patientComplaintCorrelation);
      y += 3;
    }

    // ─── FINDINGS ───
    if (assessment.aiFindings && assessment.aiFindings.length > 0) {
      heading(L("Clinical Findings", "Achados Clínicos"), BRAND);

      for (const finding of assessment.aiFindings) {
        const severity = finding.severity || "mild";
        const sc = sevColor(severity);
        const sevLabel = severity === "severe" ? L("Severe", "Grave") : severity === "moderate" ? L("Moderate", "Moderado") : L("Mild", "Leve");

        // Calculate card height
        const fTextLines = doc.splitTextToSize(finding.finding || "", W - 14);
        const recLines = finding.recommendation ? doc.splitTextToSize(`→ ${finding.recommendation}`, W - 14) : [];
        const cardH = 10 + fTextLines.length * 3.8 + (recLines.length > 0 ? recLines.length * 3.8 + 4 : 0);
        need(cardH + 4);

        // Card
        setF(XLIGHT);
        doc.roundedRect(M, y, W, cardH, 2, 2, "F");
        // Severity left bar
        setF(sc);
        doc.rect(M, y, 2, cardH, "F");

        // Area name + severity badge
        doc.setFontSize(9);
        doc.setFont("helvetica", "bold");
        setC(DARK);
        doc.text(finding.area || "", M + 5, y + 5.5);

        // Severity badge
        setF(sc);
        const badgeX = M + 5 + doc.getTextWidth(finding.area || "") + 3;
        doc.roundedRect(badgeX, y + 1.5, doc.getTextWidth(sevLabel) + 5, 5, 1, 1, "F");
        doc.setFontSize(6);
        doc.setFont("helvetica", "bold");
        setC(WHITE);
        doc.text(sevLabel, badgeX + 2.5, y + 5);

        // Finding text
        doc.setFontSize(7.5);
        doc.setFont("helvetica", "normal");
        setC(MID);
        let fy = y + 10;
        for (const line of fTextLines) { doc.text(line, M + 5, fy); fy += 3.8; }

        // Recommendation
        if (recLines.length > 0) {
          fy += 1;
          doc.setFont("helvetica", "italic");
          setC(ACCENT);
          for (const line of recLines) { doc.text(line, M + 5, fy); fy += 3.8; }
        }

        y += cardH + 3;
      }
    }

    // ─── INTERVENTION PLAN ───
    if (pa.interventionPlan) {
      heading(L("Your Treatment Plan", "Seu Plano de Tratamento"), GREEN);

      const phases = [
        { key: "immediate", label: L("Phase 1 — Immediate (1-2 weeks)", "Fase 1 — Imediato (1-2 semanas)"), color: RED, bg: [254, 242, 242] },
        { key: "shortTerm", label: L("Phase 2 — Short Term (3-6 weeks)", "Fase 2 — Curto Prazo (3-6 semanas)"), color: ORANGE, bg: [255, 251, 235] },
        { key: "mediumTerm", label: L("Phase 3 — Medium Term (7-12 weeks)", "Fase 3 — Médio Prazo (7-12 semanas)"), color: [180, 160, 30], bg: [254, 252, 232] },
        { key: "longTerm", label: L("Phase 4 — Maintenance", "Fase 4 — Manutenção"), color: GREEN, bg: [240, 253, 244] },
      ];

      for (const phase of phases) {
        const items = (pa.interventionPlan as any)[phase.key];
        if (!items || !Array.isArray(items) || items.length === 0) continue;

        const lineCount = items.reduce((acc: number, item: string) => acc + doc.splitTextToSize(`• ${item}`, W - 12).length, 0);
        const cardH = lineCount * 4 + 9;
        need(cardH + 3);

        setF(phase.bg);
        doc.roundedRect(M, y, W, cardH, 2, 2, "F");
        setF(phase.color);
        doc.rect(M, y, 2, cardH, "F");

        doc.setFontSize(8);
        doc.setFont("helvetica", "bold");
        setC(phase.color);
        doc.text(phase.label, M + 5, y + 5.5);

        let py = y + 10;
        for (const item of items) {
          doc.setFontSize(7.5);
          doc.setFont("helvetica", "normal");
          setC(MID);
          const iLines = doc.splitTextToSize(`•  ${item}`, W - 12);
          for (const line of iLines) { doc.text(line, M + 5, py); py += 4; }
        }
        y += cardH + 3;
      }

      educationBox(
        L("What to Expect", "O Que Esperar"),
        L(
          "Recovery follows phases. Early treatment focuses on pain relief and restoring basic movement. As you progress, exercises become more challenging to build long-term resilience. Consistency is key — even 10-15 minutes daily makes a significant difference.",
          "A recuperação segue fases. O tratamento inicial foca no alívio da dor e restauração do movimento básico. À medida que progride, os exercícios tornam-se mais desafiadores para construir resiliência a longo prazo. Consistência é fundamental — mesmo 10-15 minutos diários fazem uma diferença significativa."
        )
      );
    }

    // ─── COMPLEMENTARY TESTS ───
    if (pa.complementaryTests && Array.isArray(pa.complementaryTests) && pa.complementaryTests.length > 0) {
      heading(L("Suggested Complementary Tests", "Testes Complementares Sugeridos"), [0, 150, 136]);

      for (const t of pa.complementaryTests) {
        need(12);
        const priorityColor = (t.priority || "").toLowerCase() === "high" ? RED : (t.priority || "").toLowerCase() === "medium" ? ORANGE : GREEN;
        doc.setFontSize(8);
        doc.setFont("helvetica", "bold");
        setC(DARK);
        doc.text(t.test || "", M + 2, y);

        // Priority badge
        if (t.priority) {
          setF(priorityColor);
          const px = M + 2 + doc.getTextWidth(t.test || "") + 3;
          const pLabel = (t.priority || "").toUpperCase();
          doc.roundedRect(px, y - 3, doc.getTextWidth(pLabel) + 4, 4.5, 1, 1, "F");
          doc.setFontSize(5.5);
          doc.setFont("helvetica", "bold");
          setC(WHITE);
          doc.text(pLabel, px + 2, y - 0.5);
        }
        y += 4;

        if (t.purpose) {
          doc.setFontSize(7.5);
          doc.setFont("helvetica", "normal");
          setC(MID);
          const pLines = doc.splitTextToSize(t.purpose, W - 6);
          for (const line of pLines) { need(4); doc.text(line, M + 4, y); y += 3.8; }
        }
        y += 3;
      }
    }

    // ─── CORRECTIVE EXERCISES ───
    if (assessment.correctiveExercises && assessment.correctiveExercises.length > 0) {
      heading(L("Your Home Exercise Programme", "Seu Programa de Exercícios Domiciliar"), ACCENT);

      educationBox(
        L("Important Instructions", "Instruções Importantes"),
        L(
          "Perform these exercises daily unless otherwise instructed. Stop if you experience sharp pain. Mild discomfort is normal during stretching. Consistency is more important than intensity — build up gradually.",
          "Realize estes exercícios diariamente, salvo indicação contrária. Pare se sentir dor aguda. Desconforto leve é normal durante alongamentos. Consistência é mais importante que intensidade — progrida gradualmente."
        )
      );

      for (let i = 0; i < assessment.correctiveExercises.length; i++) {
        const ex = assessment.correctiveExercises[i];
        // Calculate card height
        const instLines = ex.instructions ? doc.splitTextToSize(ex.instructions, W - 14) : [];
        const benLines = ex.benefits ? doc.splitTextToSize(`${L("Benefits", "Benefícios")}: ${ex.benefits}`, W - 14) : [];
        const cardH = 14 + instLines.length * 3.8 + benLines.length * 3.8 + (ex.targetArea ? 4 : 0);
        need(cardH + 5);

        // Exercise card
        setF(XLIGHT);
        doc.roundedRect(M, y, W, cardH, 2, 2, "F");

        // Number circle
        setF(ACCENT);
        doc.circle(M + 7, y + 6, 4, "F");
        doc.setFontSize(9);
        doc.setFont("helvetica", "bold");
        setC(WHITE);
        doc.text(`${i + 1}`, M + 7, y + 7.5, { align: "center" });

        // Exercise name
        doc.setFontSize(9);
        doc.setFont("helvetica", "bold");
        setC(DARK);
        doc.text(ex.name || `Exercise ${i + 1}`, M + 14, y + 6.5);

        // Prescription badges
        const rx = [
          ex.sets ? `${ex.sets} ${L("sets", "séries")}` : null,
          ex.reps ? `${ex.reps} reps` : null,
          ex.holdSeconds ? `${ex.holdSeconds}s hold` : null,
          ex.difficulty ? ex.difficulty : null,
        ].filter(Boolean);

        let bx = M + 14;
        const badgeY = y + 10;
        for (const badge of rx) {
          const bw = doc.getTextWidth(badge!) + 4;
          setF([226, 232, 240]); // slate-200
          doc.roundedRect(bx, badgeY - 2.5, bw, 4.5, 1, 1, "F");
          doc.setFontSize(6.5);
          doc.setFont("helvetica", "normal");
          setC(MID);
          doc.text(badge!, bx + 2, badgeY + 0.5);
          bx += bw + 2;
        }

        let ey = badgeY + 4;

        // Target area
        if (ex.targetArea) {
          doc.setFontSize(7);
          doc.setFont("helvetica", "italic");
          setC(LGRAY);
          doc.text(`${L("Target", "Alvo")}: ${ex.targetArea}${ex.finding ? ` — ${ex.finding}` : ""}`, M + 5, ey);
          ey += 4;
        }

        // Instructions
        if (instLines.length > 0) {
          doc.setFontSize(7.5);
          doc.setFont("helvetica", "normal");
          setC(MID);
          for (const line of instLines) { doc.text(line, M + 5, ey); ey += 3.8; }
        }

        // Benefits
        if (benLines.length > 0) {
          doc.setFontSize(7);
          doc.setFont("helvetica", "italic");
          setC(GREEN);
          for (const line of benLines) { doc.text(line, M + 5, ey); ey += 3.8; }
        }

        y += cardH + 3;
      }
    }

    // ─── FUTURE RISK ───
    if (pa.futureRisk) {
      heading(L("Future Mechanical Risk", "Risco Mecânico Futuro"), RED);
      // Warning box
      const frLines = doc.splitTextToSize(pa.futureRisk, W - 12);
      const frH = frLines.length * 3.8 + 8;
      need(frH + 3);
      setF([254, 242, 242]);
      doc.roundedRect(M, y, W, frH, 2, 2, "F");
      setF(RED);
      doc.rect(M, y, 2, frH, "F");
      doc.setFontSize(7.5);
      doc.setFont("helvetica", "normal");
      setC(MID);
      let fry = y + 5;
      for (const line of frLines) { doc.text(line, M + 5, fry); fry += 3.8; }
      y += frH + 4;
    }

    // ─── RE-EVALUATION ───
    if (pa.reEvaluationTimeline) {
      heading(L("Re-evaluation Timeline", "Cronograma de Reavaliação"), BLUE);
      para(pa.reEvaluationTimeline);
      y += 3;
    }

    // ─── RECOMMENDATIONS ───
    if (assessment.aiRecommendations) {
      heading(L("Recommendations", "Recomendações"), BRAND);
      para(assessment.aiRecommendations);
      y += 3;
    }

    // ─── THERAPIST NOTES ───
    if (assessment.therapistNotes) {
      heading(L("Therapist Clinical Notes", "Notas Clínicas do Terapeuta"), DARK);
      // Filter out [ALERT]/[AVISO] lines from PDF view
      const noteLines = (assessment.therapistNotes as string)
        .split("\n")
        .filter((l: string) => !l.startsWith("[ALERT]") && !l.startsWith("[AVISO]"))
        .join("\n")
        .trim();
      if (noteLines) para(noteLines);
      y += 3;
    }

    // ─── REFERENCES ───
    if (pa.references && Array.isArray(pa.references) && pa.references.length > 0) {
      heading(L("Scientific References", "Referências Bibliográficas"), [100, 100, 120]);

      for (const ref of pa.references) {
        need(8);
        doc.setFontSize(7);
        doc.setFont("helvetica", "normal");
        setC(GRAY);
        const refText = `[${ref.id}] ${ref.authors} (${ref.year}). ${ref.title}. ${ref.journal}.`;
        const refLines = doc.splitTextToSize(refText, W - 4);
        for (const line of refLines) { need(4); doc.text(line, M + 2, y); y += 3.5; }
        if (ref.relevance) {
          doc.setFont("helvetica", "italic");
          setC(LGRAY);
          doc.setFontSize(6.5);
          doc.text(`↳ ${ref.relevance}`, M + 4, y);
          y += 3.5;
        }
        y += 1;
      }
    }

    // ─── TECHNICAL NOTES / DISCLAIMER ───
    need(25);
    y += 4;
    const disclaimerText = L(
      "DISCLAIMER: This report is generated using AI-assisted biomechanical analysis and should be interpreted by a qualified healthcare professional. It does not constitute a medical diagnosis. The assessment is based on visual analysis of posture photographs and may have limitations. Always consult your therapist for personalised advice.",
      "AVISO: Este relatório é gerado com análise biomecânica assistida por IA e deve ser interpretado por um profissional de saúde qualificado. Não constitui diagnóstico médico. A avaliação baseia-se na análise visual de fotografias posturais e pode ter limitações. Consulte sempre o seu terapeuta para aconselhamento personalizado."
    );
    const dLines = doc.splitTextToSize(disclaimerText, W - 10);
    const dH = dLines.length * 3.5 + 8;
    need(dH + 2);
    setF([248, 250, 252]);
    setD([226, 232, 240]);
    doc.setLineWidth(0.3);
    doc.roundedRect(M, y, W, dH, 2, 2, "FD");
    doc.setFontSize(6.5);
    doc.setFont("helvetica", "italic");
    setC(LGRAY);
    let dy = y + 5;
    for (const line of dLines) { doc.text(line, M + 5, dy); dy += 3.5; }
    y += dH + 4;

    if (pa.technicalNotes) {
      const tnLines = doc.splitTextToSize(pa.technicalNotes, W - 10);
      const tnH = tnLines.length * 3.5 + 8;
      need(tnH + 2);
      setF([248, 250, 252]);
      doc.roundedRect(M, y, W, tnH, 2, 2, "F");
      doc.setFontSize(7);
      doc.setFont("helvetica", "italic");
      setC(LGRAY);
      doc.text(L("Technical Note — Limitations", "Nota Técnica — Limitações"), M + 5, y + 4.5);
      let tny = y + 8;
      doc.setFont("helvetica", "normal");
      for (const line of tnLines) { doc.text(line, M + 5, tny); tny += 3.5; }
      y += tnH + 4;
    }

    // ═══════════════════════════════════════════
    // FOOTER ON ALL PAGES
    // ═══════════════════════════════════════════
    const pageCount = doc.getNumberOfPages();
    for (let p = 1; p <= pageCount; p++) {
      doc.setPage(p);

      // Top brand bars (except page 1 which already has them)
      if (p > 1) {
        setF(BRAND);
        doc.rect(0, 0, pageW, 2, "F");
        setF(ACCENT);
        doc.rect(0, 2, pageW, 0.5, "F");
      }

      // Bottom
      setD([226, 232, 240]);
      doc.setLineWidth(0.3);
      doc.line(M, pageH - 14, pageW - M, pageH - 14);

      // Footer text
      doc.setFontSize(6);
      doc.setFont("helvetica", "normal");
      setC(LGRAY);
      doc.text(clinicName, M, pageH - 10);
      doc.text(
        `${L("Confidential Patient Report", "Relatório Confidencial do Paciente")}  ·  ${L("Page", "Página")} ${p}/${pageCount}`,
        pageW - M,
        pageH - 10,
        { align: "right" }
      );

      // Bottom brand bars
      setF(ACCENT);
      doc.rect(0, pageH - 4, pageW, 1, "F");
      setF(BRAND);
      doc.rect(0, pageH - 3, pageW, 3, "F");
    }

    // Generate buffer
    const pdfBuffer = doc.output("arraybuffer");
    const fileName = `body-assessment-${assessment.assessmentNumber}.pdf`;

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${fileName}"`,
        "Cache-Control": "no-cache",
      },
    });
  } catch (error) {
    console.error("Error generating PDF report:", error);
    return NextResponse.json({ error: "Failed to generate PDF report" }, { status: 500 });
  }
}
