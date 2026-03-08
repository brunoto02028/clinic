import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

// Default screening form configuration
const DEFAULT_CONFIG = {
  formTitle: { en: "Assessment Screening", pt: "Triagem de Avaliação" },
  formSubtitle: {
    en: "Please complete this form before your first appointment to help us provide you with the safest and most effective care.",
    pt: "Por favor, complete este formulário antes da sua primeira consulta para nos ajudar a fornecer o cuidado mais seguro e eficaz.",
  },
  sections: [
    {
      id: "red_flags",
      title: { en: "Red Flag Questions", pt: "Questões de Bandeira Vermelha" },
      description: {
        en: "Please answer honestly. These questions help ensure your safety during treatment.",
        pt: "Responda com honestidade. Estas perguntas ajudam a garantir a sua segurança durante o tratamento.",
      },
      enabled: true,
    },
    {
      id: "chief_complaint",
      title: { en: "Chief Complaint & Pain", pt: "Queixa Principal e Dor" },
      description: {
        en: "Describe your main problem and how your pain presents.",
        pt: "Descreva o seu problema principal e como a dor se manifesta.",
      },
      enabled: true,
    },
    {
      id: "functional_impact",
      title: { en: "Functional Impact", pt: "Impacto Funcional" },
      description: { en: "", pt: "" },
      enabled: true,
    },
    {
      id: "patient_background",
      title: { en: "Patient Background", pt: "Perfil do Paciente" },
      description: { en: "", pt: "" },
      enabled: true,
    },
    {
      id: "lifestyle",
      title: { en: "Lifestyle", pt: "Estilo de Vida" },
      description: { en: "", pt: "" },
      enabled: true,
    },
    {
      id: "previous_treatment",
      title: { en: "Previous Treatment", pt: "Tratamentos Anteriores" },
      description: { en: "", pt: "" },
      enabled: true,
    },
    {
      id: "goals",
      title: { en: "Treatment Goals", pt: "Objetivos do Tratamento" },
      description: { en: "", pt: "" },
      enabled: true,
    },
    {
      id: "health_history",
      title: { en: "Health History", pt: "Histórico de Saúde" },
      description: { en: "", pt: "" },
      enabled: true,
    },
    {
      id: "contact_details",
      title: { en: "Contact Details", pt: "Dados de Contato" },
      description: { en: "", pt: "" },
      enabled: true,
    },
    {
      id: "consent",
      title: { en: "Consent", pt: "Consentimento" },
      description: { en: "", pt: "" },
      enabled: true,
    },
  ],
  redFlagQuestions: [
    { key: "unexplainedWeightLoss", en: "Have you experienced unexplained weight loss recently?", pt: "Você perdeu peso sem explicação recentemente?", enabled: true },
    { key: "nightPain", en: "Do you experience severe pain at night that disrupts your sleep?", pt: "Você sente dor intensa à noite que atrapalha seu sono?", enabled: true },
    { key: "traumaHistory", en: "Have you had any recent trauma or injury (fall, accident, sports injury)?", pt: "Você sofreu algum trauma ou lesão recente (queda, acidente, lesão esportiva)?", enabled: true },
    { key: "neurologicalSymptoms", en: "Are you experiencing numbness, tingling, pins and needles, or weakness in your arms or legs?", pt: "Você está sentindo dormência, formigamento ou fraqueza nos braços ou pernas?", enabled: true },
    { key: "bladderBowelDysfunction", en: "Have you noticed any changes in bladder or bowel function (incontinence, difficulty passing urine)?", pt: "Você notou alguma alteração na função da bexiga ou intestino (incontinência, dificuldade para urinar)?", enabled: true },
    { key: "recentInfection", en: "Have you had a recent infection or been feeling generally unwell with fever?", pt: "Você teve uma infecção recente ou está se sentindo mal com febre?", enabled: true },
    { key: "cancerHistory", en: "Do you have a current or past history of cancer?", pt: "Você tem histórico atual ou passado de câncer?", enabled: true },
    { key: "steroidUse", en: "Are you currently taking or have you recently taken steroid medication?", pt: "Você está tomando ou tomou recentemente medicação com esteróides?", enabled: true },
    { key: "osteoporosisRisk", en: "Have you been diagnosed with osteoporosis or are you at risk (post-menopausal, family history)?", pt: "Você foi diagnosticada com osteoporose ou está em risco (pós-menopausa, histórico familiar)?", enabled: true },
    { key: "cardiovascularSymptoms", en: "Do you experience chest pain, shortness of breath, or irregular heartbeat?", pt: "Você sente dor no peito, falta de ar ou batimento cardíaco irregular?", enabled: true },
    { key: "severeHeadache", en: "Have you experienced severe or unusual headaches, especially sudden onset?", pt: "Você teve dores de cabeça severas ou incomuns, especialmente de início súbito?", enabled: true },
    { key: "dizzinessBalanceIssues", en: "Do you experience dizziness, vertigo, or balance problems?", pt: "Você sente tonturas, vertigens ou problemas de equilíbrio?", enabled: true },
  ],
  previousTreatmentQuestions: [
    { key: "previousPhysio", en: "Have you had physiotherapy before?", pt: "Já fez fisioterapia anteriormente?", enabled: true },
    { key: "previousInjections", en: "Have you had injections (corticosteroid, PRP, etc.)?", pt: "Já tomou injeções (corticosteróide, PRP, etc.)?", enabled: true },
    { key: "currentlyUnderCare", en: "Currently under care of another health professional?", pt: "Atualmente em acompanhamento com outro profissional de saúde?", enabled: true },
  ],
  consentText: {
    en: "I confirm that the information provided is accurate to the best of my knowledge. I consent to the storage and processing of this health information for the purpose of my rehabilitation treatment in accordance with UK GDPR regulations.",
    pt: "Confirmo que as informações fornecidas são precisas ao melhor do meu conhecimento. Consinto com o armazenamento e processamento destas informações de saúde para fins do meu tratamento de reabilitação, de acordo com o GDPR do Reino Unido.",
  },
};

export async function GET() {
  try {
    const settings = await prisma.siteSettings.findFirst({
      select: { screeningConfigJson: true } as any,
    }) as any;

    if (settings?.screeningConfigJson) {
      try {
        const config = JSON.parse(settings.screeningConfigJson);
        return NextResponse.json(config);
      } catch {
        return NextResponse.json(DEFAULT_CONFIG);
      }
    }

    return NextResponse.json(DEFAULT_CONFIG);
  } catch (error) {
    console.error("Error fetching screening config:", error);
    return NextResponse.json(DEFAULT_CONFIG);
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
    }
    const role = (session.user as any).role;
    if (role !== "SUPERADMIN" && role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const config = await request.json();
    const jsonString = JSON.stringify(config);

    const existing = await prisma.siteSettings.findFirst();
    if (existing) {
      await prisma.siteSettings.update({
        where: { id: existing.id },
        data: { screeningConfigJson: jsonString } as any,
      });
    } else {
      await prisma.siteSettings.create({
        data: { screeningConfigJson: jsonString } as any,
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error saving screening config:", error);
    return NextResponse.json({ error: "Failed to save" }, { status: 500 });
  }
}
