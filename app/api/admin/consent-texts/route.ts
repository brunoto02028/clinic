import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSuperadminActor } from "@/lib/tenant-access";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { studioConsentTexts } from "@/lib/studio-terms";

export const dynamic = "force-dynamic";

const DEFAULT_CONSENT_TEXTS = {
  termsTitle: "Terms & Conditions of Service",
  privacyTitle: "Data Protection & Privacy (GDPR)",
  liabilityTitle: "Limitation of Liability & General Terms",
  consentCheckboxText: "I have read and understood the Terms of Use, Consent for Treatment, and Data Protection & Privacy Policy. I explicitly consent to the processing of my personal and health data as described above, including the use of AI for clinical analysis. I understand my rights under UK GDPR and acknowledge that I can withdraw consent at any time.",
  termsSections: [
    { number: 1, title: "Introduction", body: "These terms govern your use of the Bruno Physical Rehabilitation clinical platform (\"the Platform\"). By accessing or using the Platform, you agree to be bound by these terms in accordance with the laws of England and Wales." },
    { number: 2, title: "Clinical Services", body: "The Platform provides digital health services including but not limited to: medical screening questionnaires, appointment booking, biomechanical foot scanning, body posture assessments, treatment protocol management, exercise prescriptions, blood pressure monitoring, and document management. These digital services are supplementary to and do not replace in-person clinical assessment by a qualified physical rehabilitation specialist." },
    { number: 3, title: "Medical Disclaimer", body: "AI-generated analysis, scores, and recommendations provided through the Platform are for informational and clinical support purposes only. They do not constitute a medical diagnosis. All clinical decisions are made by your qualified physical rehabilitation specialist. If you experience a medical emergency, contact 999 or attend your nearest A&E department immediately." },
    { number: 4, title: "Informed Consent for Treatment", body: "By using this Platform and booking appointments, you consent to physical rehabilitation assessment and treatment as recommended by your physical rehabilitation specialist. You understand that: (a) treatment outcomes cannot be guaranteed; (b) you have the right to refuse any treatment at any time; (c) you will be informed of treatment risks and alternatives; (d) you should report any adverse reactions promptly." },
    { number: 5, title: "Accuracy of Information", body: "You agree to provide accurate, complete, and up-to-date medical and personal information. Inaccurate information may affect the safety and effectiveness of your treatment. You must inform us of any changes to your medical history, medications, or health conditions." },
  ],
  privacySections: [
    { number: 6, title: "Data Controller", body: "Bruno Physical Rehabilitation Ltd is the data controller for your personal data, registered in England. We process your data in accordance with the UK General Data Protection Regulation (UK GDPR) and the Data Protection Act 2018." },
    { number: 7, title: "Lawful Basis for Processing", body: "We process your personal and health data under the following lawful bases: (a) Consent — you explicitly consent to the processing of your health data; (b) Legitimate Interest — to provide and improve our clinical services; (c) Legal Obligation — to comply with healthcare regulations and record-keeping requirements; (d) Vital Interests — in emergencies where your health may be at risk." },
    { number: 8, title: "Data We Collect", body: "We collect and process: personal identification data (name, email, phone); medical screening data (health history, medications, allergies, red flags); clinical assessment data (body images, foot scans, posture scores); treatment records (diagnoses, protocols, exercise prescriptions); uploaded medical documents; blood pressure readings; appointment records; and payment information." },
    { number: 9, title: "Use of AI & Automated Processing", body: "The Platform uses artificial intelligence (including Google Gemini and MediaPipe) for: analysing body posture images, generating clinical assessments, creating treatment recommendations, and processing medical documents. You have the right not to be subject to a decision based solely on automated processing. All AI outputs are reviewed by a qualified physical rehabilitation specialist before any clinical decision is made." },
    { number: 10, title: "Data Retention", body: "Clinical records are retained for a minimum of 8 years from the date of last treatment (or until age 25 for children) in accordance with UK healthcare record-keeping guidance and the NHS records management code of practice. You may request deletion of non-clinical data at any time." },
    { number: 11, title: "Your Rights Under UK GDPR", body: "You have the right to: (a) Access your personal data (Subject Access Request); (b) Rectification of inaccurate data; (c) Erasure (\"right to be forgotten\") where applicable; (d) Restrict processing of your data; (e) Data portability — receive your data in a structured format; (f) Object to processing; (g) Withdraw consent at any time without affecting prior processing; (h) Complain to the Information Commissioner's Office (ICO) at ico.org.uk." },
    { number: 12, title: "Data Security", body: "We implement appropriate technical and organisational measures to protect your data, including: encrypted data transmission (TLS/SSL), secure server infrastructure, role-based access controls, regular security reviews, and staff data protection training. Body images and medical documents are stored on secure servers with restricted access." },
    { number: 13, title: "Third-Party Data Sharing", body: "We may share your data with: (a) your GP or other healthcare providers (with your explicit consent); (b) payment processors (Stripe) for transaction processing; (c) AI service providers (Google) for clinical analysis — anonymised where possible; (d) regulatory bodies if required by law. We do not sell your data to third parties." },
  ],
  liabilitySections: [
    { number: 14, title: "Limitation of Liability", body: "To the fullest extent permitted by law: the Platform is provided \"as is\"; we are not liable for any indirect, incidental, or consequential damages arising from the use of the Platform; our total liability shall not exceed the fees paid by you in the 12 months preceding the claim. Nothing in these terms excludes liability for death or personal injury caused by negligence, fraud, or any other liability that cannot be excluded by law." },
    { number: 15, title: "Payments & Cancellations", body: "Service packages and appointments are subject to our cancellation policy. Refunds are processed in accordance with the Consumer Rights Act 2015. You have 14 days to cancel a service package from the date of purchase if no services have been used (cooling-off period under the Consumer Contracts Regulations 2013)." },
    { number: 16, title: "Governing Law", body: "These terms are governed by the laws of England and Wales. Any disputes shall be subject to the exclusive jurisdiction of the courts of England and Wales." },
    { number: 17, title: "Changes to Terms", body: "We reserve the right to update these terms. Material changes will be notified to you via email or Platform notification. Continued use after changes constitutes acceptance of the updated terms." },
    { number: 18, title: "Contact", body: "For data protection queries or to exercise your rights, contact: Bruno Physical Rehabilitation, Email: admin@bpr.clinic. To report a data breach or complaint: Information Commissioner's Office (ICO), Tel: 0303 123 1113, Website: ico.org.uk." },
  ],
};

// Draft translation, not a legal review — see specs/051-correcoes-auditoria-paciente-e-ux-idosos/t-6-termos-bilingue.md.
// A patient reading this in Portuguese should still confirm anything
// contentious with the clinic directly; this exists so the document isn't
// pure English for someone who reads neither confidently.
const DEFAULT_CONSENT_TEXTS_PT = {
  termsTitle: "Termos e Condições de Serviço",
  privacyTitle: "Proteção de Dados e Privacidade (RGPD)",
  liabilityTitle: "Limitação de Responsabilidade e Termos Gerais",
  consentCheckboxText: "Li e compreendi os Termos de Uso, o Consentimento para Tratamento e a Política de Proteção de Dados e Privacidade. Consinto expressamente o processamento dos meus dados pessoais e de saúde conforme descrito acima, incluindo o uso de IA para análise clínica. Compreendo os meus direitos ao abrigo do RGPD do Reino Unido e reconheço que posso retirar o meu consentimento a qualquer momento.",
  termsSections: [
    { number: 1, title: "Introdução", body: "Estes termos regem a utilização da plataforma clínica da Bruno Physical Rehabilitation (\"a Plataforma\"). Ao aceder ou utilizar a Plataforma, concorda em ficar vinculado a estes termos, de acordo com as leis de Inglaterra e País de Gales." },
    { number: 2, title: "Serviços Clínicos", body: "A Plataforma fornece serviços de saúde digital, incluindo mas não limitado a: questionários de triagem médica, marcação de consultas, escaneamento biomecânico do pé, avaliações posturais corporais, gestão de protocolos de tratamento, prescrições de exercícios, monitorização da pressão arterial e gestão de documentos. Estes serviços digitais são complementares e não substituem a avaliação clínica presencial por um especialista qualificado em reabilitação física." },
    { number: 3, title: "Aviso Médico", body: "As análises, pontuações e recomendações geradas por IA através da Plataforma destinam-se apenas a fins informativos e de apoio clínico. Não constituem um diagnóstico médico. Todas as decisões clínicas são tomadas pelo seu especialista qualificado em reabilitação física. Se tiver uma emergência médica, contacte o 999 ou dirija-se imediatamente ao serviço de urgências mais próximo." },
    { number: 4, title: "Consentimento Informado para Tratamento", body: "Ao utilizar esta Plataforma e marcar consultas, consente a avaliação e o tratamento de reabilitação física conforme recomendado pelo seu especialista. Compreende que: (a) os resultados do tratamento não podem ser garantidos; (b) tem o direito de recusar qualquer tratamento a qualquer momento; (c) será informado(a) sobre os riscos e alternativas de tratamento; (d) deve comunicar prontamente qualquer reação adversa." },
    { number: 5, title: "Exatidão da Informação", body: "Concorda em fornecer informação médica e pessoal exata, completa e atualizada. Informação incorreta pode afetar a segurança e a eficácia do seu tratamento. Deve informar-nos de quaisquer alterações ao seu historial médico, medicação ou condições de saúde." },
  ],
  privacySections: [
    { number: 6, title: "Responsável pelo Tratamento de Dados", body: "A Bruno Physical Rehabilitation Ltd é a responsável pelo tratamento dos seus dados pessoais, registada em Inglaterra. Processamos os seus dados de acordo com o Regulamento Geral de Proteção de Dados do Reino Unido (UK GDPR) e o Data Protection Act 2018." },
    { number: 7, title: "Base Legal para o Processamento", body: "Processamos os seus dados pessoais e de saúde com base em: (a) Consentimento — consente expressamente o processamento dos seus dados de saúde; (b) Interesse Legítimo — para prestar e melhorar os nossos serviços clínicos; (c) Obrigação Legal — para cumprir a regulamentação de saúde e requisitos de manutenção de registos; (d) Interesses Vitais — em emergências em que a sua saúde possa estar em risco." },
    { number: 8, title: "Dados que Recolhemos", body: "Recolhemos e processamos: dados de identificação pessoal (nome, e-mail, telefone); dados de triagem médica (histórico de saúde, medicação, alergias, sinais de alerta); dados de avaliação clínica (imagens corporais, escaneamentos do pé, pontuações posturais); registos de tratamento (diagnósticos, protocolos, prescrições de exercícios); documentos médicos carregados; leituras de pressão arterial; registos de consultas; e informação de pagamento." },
    { number: 9, title: "Uso de IA e Processamento Automatizado", body: "A Plataforma utiliza inteligência artificial (incluindo Google Gemini e MediaPipe) para: analisar imagens de postura corporal, gerar avaliações clínicas, criar recomendações de tratamento e processar documentos médicos. Tem o direito de não ficar sujeito a uma decisão baseada exclusivamente em processamento automatizado. Todos os resultados de IA são revistos por um especialista qualificado em reabilitação física antes de qualquer decisão clínica." },
    { number: 10, title: "Retenção de Dados", body: "Os registos clínicos são conservados por um mínimo de 8 anos a partir da data do último tratamento (ou até aos 25 anos, no caso de crianças), de acordo com as diretrizes de manutenção de registos de saúde do Reino Unido e o código de prática de gestão de registos do NHS. Pode solicitar a eliminação de dados não clínicos a qualquer momento." },
    { number: 11, title: "Os Seus Direitos ao Abrigo do RGPD do Reino Unido", body: "Tem o direito de: (a) Aceder aos seus dados pessoais (Pedido de Acesso do Titular); (b) Retificação de dados incorretos; (c) Apagamento (\"direito ao esquecimento\") quando aplicável; (d) Restringir o processamento dos seus dados; (e) Portabilidade dos dados — receber os seus dados num formato estruturado; (f) Opor-se ao processamento; (g) Retirar o consentimento a qualquer momento, sem afetar o processamento anterior; (h) Apresentar reclamação junto do Information Commissioner's Office (ICO), em ico.org.uk." },
    { number: 12, title: "Segurança dos Dados", body: "Implementamos medidas técnicas e organizacionais adequadas para proteger os seus dados, incluindo: transmissão de dados encriptada (TLS/SSL), infraestrutura de servidores segura, controlos de acesso baseados em função, revisões de segurança regulares e formação da equipa em proteção de dados. Imagens corporais e documentos médicos são armazenados em servidores seguros com acesso restrito." },
    { number: 13, title: "Partilha de Dados com Terceiros", body: "Podemos partilhar os seus dados com: (a) o seu médico de família ou outros prestadores de cuidados de saúde (com o seu consentimento explícito); (b) processadores de pagamento (Stripe) para processamento de transações; (c) fornecedores de serviços de IA (Google) para análise clínica — anonimizados sempre que possível; (d) entidades reguladoras, se exigido por lei. Não vendemos os seus dados a terceiros." },
  ],
  liabilitySections: [
    { number: 14, title: "Limitação de Responsabilidade", body: "Na máxima medida permitida por lei: a Plataforma é fornecida \"tal como está\"; não somos responsáveis por quaisquer danos indiretos, incidentais ou consequenciais decorrentes da utilização da Plataforma; a nossa responsabilidade total não excederá os valores pagos por si nos 12 meses anteriores à reclamação. Nada nestes termos exclui a responsabilidade por morte ou lesão pessoal causada por negligência, fraude, ou qualquer outra responsabilidade que não possa ser excluída por lei." },
    { number: 15, title: "Pagamentos e Cancelamentos", body: "Os pacotes de serviços e as consultas estão sujeitos à nossa política de cancelamento. Os reembolsos são processados de acordo com o Consumer Rights Act 2015. Tem 14 dias para cancelar um pacote de serviços a partir da data de compra, caso nenhum serviço tenha sido utilizado (período de reflexão ao abrigo do Consumer Contracts Regulations 2013)." },
    { number: 16, title: "Lei Aplicável", body: "Estes termos são regidos pelas leis de Inglaterra e País de Gales. Quaisquer litígios estarão sujeitos à jurisdição exclusiva dos tribunais de Inglaterra e País de Gales." },
    { number: 17, title: "Alterações aos Termos", body: "Reservamo-nos o direito de atualizar estes termos. Alterações materiais serão notificadas por e-mail ou notificação na Plataforma. A utilização continuada após as alterações constitui aceitação dos termos atualizados." },
    { number: 18, title: "Contacto", body: "Para questões de proteção de dados ou para exercer os seus direitos, contacte: Bruno Physical Rehabilitation, E-mail: admin@bpr.clinic. Para comunicar uma violação de dados ou reclamação: Information Commissioner's Office (ICO), Tel: 0303 123 1113, Website: ico.org.uk." },
  ],
};

/**
 * GET /api/admin/consent-texts — Get consent texts (public for patient page too)
 * ?locale=pt-BR returns the Portuguese text (configured or the built-in
 * draft translation); anything else keeps the original English-only
 * behaviour unchanged.
 */
// The studio whose training terms apply: the one named by ?studio=<slug>
// (its public sign-up page), or the signed-in user's own studio. A clinic —
// or no studio at all — keeps the clinic's consent texts below.
async function studioForTerms(req: NextRequest): Promise<{ name: string } | null> {
  const slug = req.nextUrl.searchParams.get("studio");
  const where = slug
    ? { slug }
    : await getServerSession(authOptions).then((s) => {
        const clinicId = (s?.user as any)?.clinicId as string | undefined;
        return clinicId ? { id: clinicId } : null;
      });
  if (!where) return null;
  const clinic = await prisma.clinic.findUnique({ where, select: { name: true, type: true } });
  return clinic?.type === "PERSONAL_TRAINER" ? { name: clinic.name } : null;
}

export async function GET(req: NextRequest) {
  const isPt = req.nextUrl.searchParams.get("locale") === "pt-BR";
  const fallback = isPt ? DEFAULT_CONSENT_TEXTS_PT : DEFAULT_CONSENT_TEXTS;

  try {
    // A studio's students accept training terms, not the clinic's consent for
    // treatment (activity 55, T-3).
    const studio = await studioForTerms(req);
    if (studio) return NextResponse.json(studioConsentTexts(studio.name, isPt));

    const settings = await prisma.siteSettings.findFirst({
      select: { consentTextsJson: true, consentTextsJsonPt: true },
    });

    const raw = isPt ? settings?.consentTextsJsonPt : settings?.consentTextsJson;
    if (raw) {
      try {
        return NextResponse.json(JSON.parse(raw));
      } catch {
        return NextResponse.json(fallback);
      }
    }

    return NextResponse.json(fallback);
  } catch {
    return NextResponse.json(fallback);
  }
}

/**
 * PUT /api/admin/consent-texts — Save consent texts (admin only)
 */
export async function PUT(req: NextRequest) {
  try {
    // Platform-wide terms every patient accepts — SUPERADMIN only (activity 52, T-2).
    if (!(await getSuperadminActor(req))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const texts = await req.json();
    const jsonString = JSON.stringify(texts);

    const existing = await prisma.siteSettings.findFirst();
    if (existing) {
      await prisma.siteSettings.update({
        where: { id: existing.id },
        data: { consentTextsJson: jsonString } as any,
      });
    } else {
      await prisma.siteSettings.create({
        data: { consentTextsJson: jsonString } as any,
      });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
