const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

/**
 * Script para atualizar Termos de Uso em formato texto simples
 */

const termsPlainText = `TERMS OF USE & PRIVACY POLICY

Last Updated: April 2, 2026

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. TERMS OF USE

1.1 Acceptance of Terms
By accessing and using the BPR Physical Rehabilitation website and services, you accept and agree to be bound by the terms and provision of this agreement. If you do not agree to these terms, please do not use our services.

1.2 Services Description
BPR Physical Rehabilitation provides physical therapy, sports rehabilitation, and wellness services in Richmond, UK. Our services include but are not limited to:

• Physical therapy and rehabilitation
• Sports injury treatment
• MLS Laser therapy
• Thermography assessments
• Biomechanical analysis
• Insole fitting and customization

1.3 Appointment Booking
All appointments must be booked through our online system or by contacting our clinic directly. We require at least 24 hours notice for cancellations. Late cancellations or no-shows may be subject to a cancellation fee.

1.4 Medical Information
You agree to provide accurate and complete medical information. Failure to disclose relevant medical history may affect the quality and safety of treatment provided.

1.5 Payment Terms
Payment is due at the time of service unless other arrangements have been made in advance. We accept various payment methods including credit cards, debit cards, and bank transfers.

1.6 Intellectual Property
All content on this website, including text, graphics, logos, images, and software, is the property of BPR Physical Rehabilitation and protected by UK and international copyright laws.

1.7 Limitation of Liability
BPR Physical Rehabilitation shall not be liable for any indirect, incidental, special, consequential, or punitive damages resulting from your use of our services or website.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

2. PRIVACY POLICY

2.1 Information We Collect
We collect information that you provide directly to us, including:

• Personal identification information (name, email, phone number, address)
• Medical history and health information
• Appointment and treatment records
• Payment and billing information
• Communication preferences

2.2 How We Use Your Information
We use the information we collect to:

• Provide, maintain, and improve our services
• Process appointments and payments
• Send appointment reminders and follow-up communications
• Respond to your inquiries and provide customer support
• Comply with legal obligations and professional standards
• Maintain accurate medical records

2.3 Data Protection and Security
We implement appropriate technical and organizational measures to protect your personal data against unauthorized access, alteration, disclosure, or destruction. We comply with UK GDPR and Data Protection Act 2018.

2.4 Data Sharing and Disclosure
We do not sell, trade, or rent your personal information to third parties. We may share your information with:

• Healthcare professionals involved in your care (with your consent)
• Insurance companies for billing purposes (with your authorization)
• Legal authorities when required by law
• Service providers who assist in our operations (under strict confidentiality agreements)

2.5 Your Rights
Under UK GDPR, you have the right to:

• Access your personal data
• Correct inaccurate or incomplete data
• Request deletion of your data (subject to legal retention requirements)
• Object to processing of your data
• Request restriction of processing
• Data portability
• Withdraw consent at any time

2.6 Data Retention
We retain your medical records for a minimum of 8 years from the date of last treatment, in accordance with professional guidelines and legal requirements. Other personal data is retained only as long as necessary for the purposes outlined in this policy.

2.7 Cookies and Tracking
Our website uses cookies to enhance your browsing experience. You can control cookie settings through your browser preferences. Essential cookies are necessary for the website to function properly.

2.8 Third-Party Links
Our website may contain links to third-party websites. We are not responsible for the privacy practices or content of these external sites.

2.9 Children's Privacy
Our services are not directed to individuals under 18. We do not knowingly collect personal information from children without parental consent.

2.10 Changes to This Policy
We may update this Privacy Policy from time to time. We will notify you of any significant changes by posting the new policy on our website and updating the "Last Updated" date.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

3. CONTACT INFORMATION

If you have any questions about these Terms of Use or Privacy Policy, please contact us:

Email: info@bpr.rehab
Phone: +44 (0) 20 XXXX XXXX
Address: Richmond, TW10 6AQ, UK

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

4. CONSENT

By using our website and services, you hereby consent to our Terms of Use and Privacy Policy and agree to its terms.`;

async function updateTermsPlainText() {
  console.log("📝 ATUALIZANDO TERMOS EM FORMATO TEXTO\n");

  try {
    const settings = await prisma.siteSettings.findFirst();
    
    if (!settings) {
      console.log("❌ Configurações não encontradas!");
      return;
    }

    await prisma.siteSettings.update({
      where: { id: settings.id },
      data: {
        termsContentHtml: termsPlainText,
      },
    });

    console.log("✅ Termos atualizados em formato texto!\n");
    console.log("📄 Formato: Texto simples com formatação clara");
    console.log("🌐 Acesse: https://bpr.rehab/terms\n");

  } catch (error) {
    console.error("❌ Erro:", error);
  } finally {
    await prisma.$disconnect();
  }
}

updateTermsPlainText();
