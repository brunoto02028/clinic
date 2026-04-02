const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

/**
 * Script para atualizar Termos de Uso e Política de Privacidade
 */

const termsHTML = `
<div class="terms-content">
  <h1>Terms of Use & Privacy Policy</h1>
  <p class="last-updated">Last Updated: April 2, 2026</p>

  <section>
    <h2>1. Terms of Use</h2>
    
    <h3>1.1 Acceptance of Terms</h3>
    <p>By accessing and using the BPR Physical Rehabilitation website and services, you accept and agree to be bound by the terms and provision of this agreement. If you do not agree to these terms, please do not use our services.</p>

    <h3>1.2 Services Description</h3>
    <p>BPR Physical Rehabilitation provides physical therapy, sports rehabilitation, and wellness services in Richmond, UK. Our services include but are not limited to:</p>
    <ul>
      <li>Physical therapy and rehabilitation</li>
      <li>Sports injury treatment</li>
      <li>MLS Laser therapy</li>
      <li>Thermography assessments</li>
      <li>Biomechanical analysis</li>
      <li>Insole fitting and customization</li>
    </ul>

    <h3>1.3 Appointment Booking</h3>
    <p>All appointments must be booked through our online system or by contacting our clinic directly. We require at least 24 hours notice for cancellations. Late cancellations or no-shows may be subject to a cancellation fee.</p>

    <h3>1.4 Medical Information</h3>
    <p>You agree to provide accurate and complete medical information. Failure to disclose relevant medical history may affect the quality and safety of treatment provided.</p>

    <h3>1.5 Payment Terms</h3>
    <p>Payment is due at the time of service unless other arrangements have been made in advance. We accept various payment methods including credit cards, debit cards, and bank transfers.</p>

    <h3>1.6 Intellectual Property</h3>
    <p>All content on this website, including text, graphics, logos, images, and software, is the property of BPR Physical Rehabilitation and protected by UK and international copyright laws.</p>

    <h3>1.7 Limitation of Liability</h3>
    <p>BPR Physical Rehabilitation shall not be liable for any indirect, incidental, special, consequential, or punitive damages resulting from your use of our services or website.</p>
  </section>

  <section>
    <h2>2. Privacy Policy</h2>

    <h3>2.1 Information We Collect</h3>
    <p>We collect information that you provide directly to us, including:</p>
    <ul>
      <li>Personal identification information (name, email, phone number, address)</li>
      <li>Medical history and health information</li>
      <li>Appointment and treatment records</li>
      <li>Payment and billing information</li>
      <li>Communication preferences</li>
    </ul>

    <h3>2.2 How We Use Your Information</h3>
    <p>We use the information we collect to:</p>
    <ul>
      <li>Provide, maintain, and improve our services</li>
      <li>Process appointments and payments</li>
      <li>Send appointment reminders and follow-up communications</li>
      <li>Respond to your inquiries and provide customer support</li>
      <li>Comply with legal obligations and professional standards</li>
      <li>Maintain accurate medical records</li>
    </ul>

    <h3>2.3 Data Protection and Security</h3>
    <p>We implement appropriate technical and organizational measures to protect your personal data against unauthorized access, alteration, disclosure, or destruction. We comply with UK GDPR and Data Protection Act 2018.</p>

    <h3>2.4 Data Sharing and Disclosure</h3>
    <p>We do not sell, trade, or rent your personal information to third parties. We may share your information with:</p>
    <ul>
      <li>Healthcare professionals involved in your care (with your consent)</li>
      <li>Insurance companies for billing purposes (with your authorization)</li>
      <li>Legal authorities when required by law</li>
      <li>Service providers who assist in our operations (under strict confidentiality agreements)</li>
    </ul>

    <h3>2.5 Your Rights</h3>
    <p>Under UK GDPR, you have the right to:</p>
    <ul>
      <li>Access your personal data</li>
      <li>Correct inaccurate or incomplete data</li>
      <li>Request deletion of your data (subject to legal retention requirements)</li>
      <li>Object to processing of your data</li>
      <li>Request restriction of processing</li>
      <li>Data portability</li>
      <li>Withdraw consent at any time</li>
    </ul>

    <h3>2.6 Data Retention</h3>
    <p>We retain your medical records for a minimum of 8 years from the date of last treatment, in accordance with professional guidelines and legal requirements. Other personal data is retained only as long as necessary for the purposes outlined in this policy.</p>

    <h3>2.7 Cookies and Tracking</h3>
    <p>Our website uses cookies to enhance your browsing experience. You can control cookie settings through your browser preferences. Essential cookies are necessary for the website to function properly.</p>

    <h3>2.8 Third-Party Links</h3>
    <p>Our website may contain links to third-party websites. We are not responsible for the privacy practices or content of these external sites.</p>

    <h3>2.9 Children's Privacy</h3>
    <p>Our services are not directed to individuals under 18. We do not knowingly collect personal information from children without parental consent.</p>

    <h3>2.10 Changes to This Policy</h3>
    <p>We may update this Privacy Policy from time to time. We will notify you of any significant changes by posting the new policy on our website and updating the "Last Updated" date.</p>
  </section>

  <section>
    <h2>3. Contact Information</h2>
    <p>If you have any questions about these Terms of Use or Privacy Policy, please contact us:</p>
    <ul>
      <li><strong>Email:</strong> info@bpr.rehab</li>
      <li><strong>Phone:</strong> +44 (0) 20 XXXX XXXX</li>
      <li><strong>Address:</strong> Richmond, TW10 6AQ, UK</li>
    </ul>
  </section>

  <section>
    <h2>4. Consent</h2>
    <p>By using our website and services, you hereby consent to our Terms of Use and Privacy Policy and agree to its terms.</p>
  </section>
</div>

<style>
.terms-content {
  max-width: 900px;
  margin: 0 auto;
  padding: 2rem;
  line-height: 1.8;
}

.terms-content h1 {
  font-size: 2rem;
  margin-bottom: 0.5rem;
  color: #ffffff;
  font-weight: 600;
}

.terms-content .last-updated {
  color: #a0aec0;
  font-style: italic;
  margin-bottom: 2rem;
  font-size: 0.95rem;
}

.terms-content section {
  margin-bottom: 2.5rem;
}

.terms-content h2 {
  font-size: 1.5rem;
  margin-top: 2rem;
  margin-bottom: 1rem;
  color: #7dd3c0;
  border-bottom: 2px solid #7dd3c0;
  padding-bottom: 0.5rem;
  font-weight: 600;
}

.terms-content h3 {
  font-size: 1.2rem;
  margin-top: 1.5rem;
  margin-bottom: 0.75rem;
  color: #e2e8f0;
  font-weight: 500;
}

.terms-content p {
  margin-bottom: 1rem;
  color: #cbd5e0;
  font-size: 1rem;
}

.terms-content ul {
  margin-left: 2rem;
  margin-bottom: 1rem;
}

.terms-content li {
  margin-bottom: 0.5rem;
  color: #cbd5e0;
  font-size: 1rem;
}

.terms-content strong {
  color: #ffffff;
  font-weight: 600;
}
</style>
`;

async function updateTermsAndPrivacy() {
  console.log("📝 ATUALIZANDO TERMOS DE USO E POLÍTICA DE PRIVACIDADE\n");

  try {
    const settings = await prisma.siteSettings.findFirst();
    
    if (!settings) {
      console.log("❌ Configurações não encontradas!");
      return;
    }

    await prisma.siteSettings.update({
      where: { id: settings.id },
      data: {
        termsContentHtml: termsHTML,
      },
    });

    console.log("✅ Termos de Uso e Política de Privacidade atualizados!\n");
    console.log("📄 Conteúdo incluído:");
    console.log("   ✓ Termos de Uso completos");
    console.log("   ✓ Política de Privacidade (UK GDPR compliant)");
    console.log("   ✓ Direitos do usuário");
    console.log("   ✓ Proteção de dados");
    console.log("   ✓ Informações de contato");
    console.log("   ✓ Estilização profissional\n");
    console.log("🌐 Acesse: https://bpr.rehab/terms\n");

  } catch (error) {
    console.error("❌ Erro:", error);
  } finally {
    await prisma.$disconnect();
  }
}

updateTermsAndPrivacy();
