import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

const DEFAULT_CONSENT_TEXTS = {
  termsTitle: "Terms & Conditions of Service",
  privacyTitle: "Data Protection & Privacy (GDPR)",
  liabilityTitle: "Limitation of Liability & General Terms",
  consentCheckboxText: "I have read and understood the Terms of Use, Consent for Treatment, and Data Protection & Privacy Policy. I explicitly consent to the processing of my personal and health data as described above, including the use of AI for clinical analysis. I understand my rights under UK GDPR and acknowledge that I can withdraw consent at any time.",
  termsSections: [
    { number: 1, title: "Introduction", body: "These terms govern your use of the Bruno Physical Rehabilitation clinical platform (\"the Platform\"). By accessing or using the Platform, you agree to be bound by these terms in accordance with the laws of England and Wales." },
    { number: 2, title: "Clinical Services", body: "The Platform provides digital health services including but not limited to: medical screening questionnaires, physiotherapy appointment booking, biomechanical foot scanning, body posture assessments, treatment protocol management, exercise prescriptions, blood pressure monitoring, and document management. These digital services are supplementary to and do not replace in-person clinical assessment by a qualified physiotherapist." },
    { number: 3, title: "Medical Disclaimer", body: "AI-generated analysis, scores, and recommendations provided through the Platform are for informational and clinical support purposes only. They do not constitute a medical diagnosis. All clinical decisions are made by your qualified physiotherapist. If you experience a medical emergency, contact 999 or attend your nearest A&E department immediately." },
    { number: 4, title: "Informed Consent for Treatment", body: "By using this Platform and booking appointments, you consent to physiotherapy assessment and treatment as recommended by your physiotherapist. You understand that: (a) treatment outcomes cannot be guaranteed; (b) you have the right to refuse any treatment at any time; (c) you will be informed of treatment risks and alternatives; (d) you should report any adverse reactions promptly." },
    { number: 5, title: "Accuracy of Information", body: "You agree to provide accurate, complete, and up-to-date medical and personal information. Inaccurate information may affect the safety and effectiveness of your treatment. You must inform us of any changes to your medical history, medications, or health conditions." },
  ],
  privacySections: [
    { number: 6, title: "Data Controller", body: "Bruno Physical Rehabilitation Ltd is the data controller for your personal data, registered in England. We process your data in accordance with the UK General Data Protection Regulation (UK GDPR) and the Data Protection Act 2018." },
    { number: 7, title: "Lawful Basis for Processing", body: "We process your personal and health data under the following lawful bases: (a) Consent — you explicitly consent to the processing of your health data; (b) Legitimate Interest — to provide and improve our clinical services; (c) Legal Obligation — to comply with healthcare regulations and record-keeping requirements; (d) Vital Interests — in emergencies where your health may be at risk." },
    { number: 8, title: "Data We Collect", body: "We collect and process: personal identification data (name, email, phone); medical screening data (health history, medications, allergies, red flags); clinical assessment data (body images, foot scans, posture scores); treatment records (diagnoses, protocols, exercise prescriptions); uploaded medical documents; blood pressure readings; appointment records; and payment information." },
    { number: 9, title: "Use of AI & Automated Processing", body: "The Platform uses artificial intelligence (including Google Gemini and MediaPipe) for: analysing body posture images, generating clinical assessments, creating treatment recommendations, and processing medical documents. You have the right not to be subject to a decision based solely on automated processing. All AI outputs are reviewed by a qualified physiotherapist before any clinical decision is made." },
    { number: 10, title: "Data Retention", body: "Clinical records are retained for a minimum of 8 years from the date of last treatment (or until age 25 for children) in accordance with the Chartered Society of Physiotherapy (CSP) guidelines and NHS records management code of practice. You may request deletion of non-clinical data at any time." },
    { number: 11, title: "Your Rights Under UK GDPR", body: "You have the right to: (a) Access your personal data (Subject Access Request); (b) Rectification of inaccurate data; (c) Erasure (\"right to be forgotten\") where applicable; (d) Restrict processing of your data; (e) Data portability — receive your data in a structured format; (f) Object to processing; (g) Withdraw consent at any time without affecting prior processing; (h) Complain to the Information Commissioner's Office (ICO) at ico.org.uk." },
    { number: 12, title: "Data Security", body: "We implement appropriate technical and organisational measures to protect your data, including: encrypted data transmission (TLS/SSL), secure server infrastructure, role-based access controls, regular security reviews, and staff data protection training. Body images and medical documents are stored on secure servers with restricted access." },
    { number: 13, title: "Third-Party Data Sharing", body: "We may share your data with: (a) your GP or other healthcare providers (with your explicit consent); (b) payment processors (Stripe) for transaction processing; (c) AI service providers (Google) for clinical analysis — anonymised where possible; (d) regulatory bodies if required by law. We do not sell your data to third parties." },
  ],
  liabilitySections: [
    { number: 14, title: "Limitation of Liability", body: "To the fullest extent permitted by law: the Platform is provided \"as is\"; we are not liable for any indirect, incidental, or consequential damages arising from the use of the Platform; our total liability shall not exceed the fees paid by you in the 12 months preceding the claim. Nothing in these terms excludes liability for death or personal injury caused by negligence, fraud, or any other liability that cannot be excluded by law." },
    { number: 15, title: "Payments & Cancellations", body: "Service packages and appointments are subject to our cancellation policy. Refunds are processed in accordance with the Consumer Rights Act 2015. You have 14 days to cancel a service package from the date of purchase if no services have been used (cooling-off period under the Consumer Contracts Regulations 2013)." },
    { number: 16, title: "Governing Law", body: "These terms are governed by the laws of England and Wales. Any disputes shall be subject to the exclusive jurisdiction of the courts of England and Wales." },
    { number: 17, title: "Changes to Terms", body: "We reserve the right to update these terms. Material changes will be notified to you via email or Platform notification. Continued use after changes constitutes acceptance of the updated terms." },
    { number: 18, title: "Contact", body: "For data protection queries or to exercise your rights, contact: Bruno Physical Rehabilitation, Email: admin@bpr.rehab. To report a data breach or complaint: Information Commissioner's Office (ICO), Tel: 0303 123 1113, Website: ico.org.uk." },
  ],
};

/**
 * GET /api/admin/consent-texts — Get consent texts (public for patient page too)
 */
export async function GET() {
  try {
    const settings = await prisma.siteSettings.findFirst({
      select: { consentTextsJson: true },
    });

    if (settings?.consentTextsJson) {
      try {
        return NextResponse.json(JSON.parse(settings.consentTextsJson));
      } catch {
        return NextResponse.json(DEFAULT_CONSENT_TEXTS);
      }
    }

    return NextResponse.json(DEFAULT_CONSENT_TEXTS);
  } catch {
    return NextResponse.json(DEFAULT_CONSENT_TEXTS);
  }
}

/**
 * PUT /api/admin/consent-texts — Save consent texts (admin only)
 */
export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !["SUPERADMIN", "ADMIN"].includes((session.user as any).role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
