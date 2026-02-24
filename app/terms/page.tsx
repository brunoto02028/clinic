"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Scale, Database, Lock, Shield, ArrowLeft } from "lucide-react";
import { useLocale } from "@/hooks/use-locale";

export default function TermsPage() {
  const { locale } = useLocale();
  const isPt = locale === "pt-BR";
  const [customHtml, setCustomHtml] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.ok ? r.json() : null)
      .then((d) => {
        if (d?.termsContentHtml) setCustomHtml(d.termsContentHtml);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <SiteHeader currentPage="other" />
      <main className="flex-1 py-12 sm:py-16">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          {/* Back to Signup */}
          <Link href="/signup" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors">
            <ArrowLeft className="h-4 w-4" />
            {isPt ? "Voltar ao Cadastro" : "Back to Sign Up"}
          </Link>

          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
              {isPt ? "Termos de Uso e Política de Privacidade" : "Terms of Use & Privacy Policy"}
            </h1>
            <p className="text-muted-foreground mt-2 text-sm">
              {isPt
                ? "Por favor, leia estes termos com atenção antes de criar sua conta."
                : "Please read these terms carefully before creating your account."}
            </p>
          </div>

          {/* If admin set custom HTML content, render that */}
          {!loading && customHtml ? (
            <div
              className="prose prose-sm max-w-none text-muted-foreground [&_h2]:text-foreground [&_h3]:text-foreground [&_strong]:text-foreground [&_h2]:text-lg [&_h2]:font-semibold [&_h3]:font-semibold"
              dangerouslySetInnerHTML={{ __html: customHtml }}
            />
          ) : !loading ? (
            <>
              {/* Default Terms & Conditions */}
              <section>
                <div className="flex items-center gap-2 mb-4">
                  <Scale className="h-5 w-5 text-primary" />
                  <h2 className="text-lg font-semibold">{isPt ? "Termos e Condições de Serviço" : "Terms & Conditions of Service"}</h2>
                </div>
                <div className="bg-muted/30 rounded-lg p-5 space-y-4 text-sm text-muted-foreground">
                  <div className="flex items-start gap-3">
                    <Badge variant="outline" className="mt-0.5 flex-shrink-0">1</Badge>
                    <div>
                      <p className="font-semibold text-foreground">{isPt ? "Introdução" : "Introduction"}</p>
                      <p className="mt-1">{isPt
                        ? 'Estes termos regem o uso da plataforma clínica Bruno Physical Rehabilitation ("a Plataforma"). Ao acessar ou usar a Plataforma, você concorda com estes termos de acordo com as leis da Inglaterra e País de Gales.'
                        : 'These terms govern your use of the Bruno Physical Rehabilitation clinical platform ("the Platform"). By accessing or using the Platform, you agree to be bound by these terms in accordance with the laws of England and Wales.'}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Badge variant="outline" className="mt-0.5 flex-shrink-0">2</Badge>
                    <div>
                      <p className="font-semibold text-foreground">{isPt ? "Serviços Clínicos" : "Clinical Services"}</p>
                      <p className="mt-1">{isPt
                        ? "A Plataforma fornece serviços digitais de saúde incluindo: questionários de triagem médica, agendamento de fisioterapia, escaneamento biomecânico dos pés, avaliações posturais, gerenciamento de protocolos de tratamento, prescrições de exercícios, monitoramento de pressão arterial e gerenciamento de documentos. Estes serviços digitais são complementares e não substituem a avaliação clínica presencial por um fisioterapeuta qualificado."
                        : "The Platform provides digital health services including but not limited to: medical screening questionnaires, physiotherapy appointment booking, biomechanical foot scanning, body posture assessments, treatment protocol management, exercise prescriptions, blood pressure monitoring, and document management. These digital services are supplementary to and do not replace in-person clinical assessment by a qualified physiotherapist."}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Badge variant="outline" className="mt-0.5 flex-shrink-0">3</Badge>
                    <div>
                      <p className="font-semibold text-foreground">{isPt ? "Aviso Médico" : "Medical Disclaimer"}</p>
                      <p className="mt-1">{isPt
                        ? "Análises, pontuações e recomendações geradas por IA fornecidas através da Plataforma são apenas para fins informativos e de suporte clínico. Não constituem diagnóstico médico. Todas as decisões clínicas são tomadas pelo seu fisioterapeuta qualificado. Em caso de emergência médica, ligue 999 ou vá ao pronto-socorro mais próximo."
                        : "AI-generated analysis, scores, and recommendations provided through the Platform are for informational and clinical support purposes only. They do not constitute a medical diagnosis. All clinical decisions are made by your qualified physiotherapist. If you experience a medical emergency, contact 999 or attend your nearest A&E department immediately."}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Badge variant="outline" className="mt-0.5 flex-shrink-0">4</Badge>
                    <div>
                      <p className="font-semibold text-foreground">{isPt ? "Consentimento Informado para Tratamento" : "Informed Consent for Treatment"}</p>
                      <p className="mt-1">{isPt
                        ? "Ao usar esta Plataforma e agendar consultas, você consente com a avaliação e tratamento fisioterapêutico conforme recomendado pelo seu fisioterapeuta. Você entende que: (a) os resultados do tratamento não podem ser garantidos; (b) você tem o direito de recusar qualquer tratamento a qualquer momento; (c) você será informado sobre riscos e alternativas do tratamento; (d) deve relatar quaisquer reações adversas prontamente."
                        : "By using this Platform and booking appointments, you consent to physiotherapy assessment and treatment as recommended by your physiotherapist. You understand that: (a) treatment outcomes cannot be guaranteed; (b) you have the right to refuse any treatment at any time; (c) you will be informed of treatment risks and alternatives; (d) you should report any adverse reactions promptly."}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Badge variant="outline" className="mt-0.5 flex-shrink-0">5</Badge>
                    <div>
                      <p className="font-semibold text-foreground">{isPt ? "Precisão das Informações" : "Accuracy of Information"}</p>
                      <p className="mt-1">{isPt
                        ? "Você concorda em fornecer informações médicas e pessoais precisas, completas e atualizadas. Informações imprecisas podem afetar a segurança e eficácia do seu tratamento. Você deve nos informar sobre quaisquer mudanças no seu histórico médico, medicações ou condições de saúde."
                        : "You agree to provide accurate, complete, and up-to-date medical and personal information. Inaccurate information may affect the safety and effectiveness of your treatment. You must inform us of any changes to your medical history, medications, or health conditions."}</p>
                    </div>
                  </div>
                </div>
              </section>

              {/* Data Protection */}
              <section>
                <div className="flex items-center gap-2 mb-4">
                  <Database className="h-5 w-5 text-primary" />
                  <h2 className="text-lg font-semibold">{isPt ? "Proteção de Dados e Privacidade (UK GDPR)" : "Data Protection & Privacy (UK GDPR)"}</h2>
                </div>
                <div className="bg-muted/30 rounded-lg p-5 space-y-4 text-sm text-muted-foreground">
                  <div className="flex items-start gap-3">
                    <Badge variant="outline" className="mt-0.5 flex-shrink-0">6</Badge>
                    <div>
                      <p className="font-semibold text-foreground">{isPt ? "Controlador de Dados" : "Data Controller"}</p>
                      <p className="mt-1">{isPt
                        ? "Bruno Physical Rehabilitation Ltd é o controlador de dados dos seus dados pessoais, registrado na Inglaterra. Processamos seus dados de acordo com o Regulamento Geral de Proteção de Dados do UK (UK GDPR) e a Lei de Proteção de Dados de 2018."
                        : "Bruno Physical Rehabilitation Ltd is the data controller for your personal data, registered in England. We process your data in accordance with the UK General Data Protection Regulation (UK GDPR) and the Data Protection Act 2018."}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Badge variant="outline" className="mt-0.5 flex-shrink-0">7</Badge>
                    <div>
                      <p className="font-semibold text-foreground">{isPt ? "Base Legal para Processamento" : "Lawful Basis for Processing"}</p>
                      <p className="mt-1">{isPt
                        ? "Processamos seus dados pessoais e de saúde sob as seguintes bases legais: (a) Consentimento — você consente explicitamente com o processamento dos seus dados de saúde; (b) Interesse Legítimo — para fornecer e melhorar nossos serviços clínicos; (c) Obrigação Legal — para cumprir regulamentações de saúde e requisitos de manutenção de registros; (d) Interesses Vitais — em emergências onde sua saúde possa estar em risco."
                        : "We process your personal and health data under the following lawful bases: (a) Consent — you explicitly consent to the processing of your health data; (b) Legitimate Interest — to provide and improve our clinical services; (c) Legal Obligation — to comply with healthcare regulations and record-keeping requirements; (d) Vital Interests — in emergencies where your health may be at risk."}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Badge variant="outline" className="mt-0.5 flex-shrink-0">8</Badge>
                    <div>
                      <p className="font-semibold text-foreground">{isPt ? "Dados que Coletamos" : "Data We Collect"}</p>
                      <p className="mt-1">{isPt
                        ? "Coletamos e processamos: dados de identificação pessoal (nome, e-mail, telefone); dados de triagem médica (histórico de saúde, medicações, alergias); dados de avaliação clínica (imagens corporais, escaneamentos dos pés, pontuações posturais); registros de tratamento (diagnósticos, protocolos, prescrições de exercícios); documentos médicos enviados; leituras de pressão arterial; registros de consultas; e informações de pagamento."
                        : "We collect and process: personal identification data (name, email, phone); medical screening data (health history, medications, allergies, red flags); clinical assessment data (body images, foot scans, posture scores); treatment records (diagnoses, protocols, exercise prescriptions); uploaded medical documents; blood pressure readings; appointment records; and payment information."}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Badge variant="outline" className="mt-0.5 flex-shrink-0">9</Badge>
                    <div>
                      <p className="font-semibold text-foreground">{isPt ? "Uso de IA e Processamento Automatizado" : "Use of AI & Automated Processing"}</p>
                      <p className="mt-1">{isPt
                        ? "A Plataforma utiliza inteligência artificial (incluindo Google Gemini e MediaPipe) para: análise de imagens posturais, geração de avaliações clínicas, criação de recomendações de tratamento e processamento de documentos médicos. Você tem o direito de não estar sujeito a uma decisão baseada exclusivamente em processamento automatizado. Todos os resultados de IA são revisados por um fisioterapeuta qualificado antes de qualquer decisão clínica."
                        : "The Platform uses artificial intelligence (including Google Gemini and MediaPipe) for: analysing body posture images, generating clinical assessments, creating treatment recommendations, and processing medical documents. You have the right not to be subject to a decision based solely on automated processing. All AI outputs are reviewed by a qualified physiotherapist before any clinical decision is made."}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Badge variant="outline" className="mt-0.5 flex-shrink-0">10</Badge>
                    <div>
                      <p className="font-semibold text-foreground">{isPt ? "Imagens Corporais e Privacidade" : "Body Images & Privacy"}</p>
                      <p className="mt-1">{isPt
                        ? "Fotos de avaliação corporal são armazenadas com segurança e acesso restrito. Rostos são automaticamente desfocados nas imagens capturadas para proteger sua identidade. As imagens são usadas exclusivamente para análise postural clínica e acessíveis apenas ao seu fisioterapeuta responsável. Você pode solicitar a exclusão das suas imagens a qualquer momento."
                        : "Body assessment photos are stored securely with restricted access. Faces are automatically blurred in captured images to protect your identity. Images are used solely for clinical posture analysis and are accessible only to your treating physiotherapist. You may request deletion of your images at any time."}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Badge variant="outline" className="mt-0.5 flex-shrink-0">11</Badge>
                    <div>
                      <p className="font-semibold text-foreground">{isPt ? "Retenção de Dados" : "Data Retention"}</p>
                      <p className="mt-1">{isPt
                        ? "Registros clínicos são mantidos por um mínimo de 8 anos a partir da data do último tratamento (ou até os 25 anos para crianças) de acordo com as diretrizes da Chartered Society of Physiotherapy (CSP) e o código de prática de gestão de registros do NHS. Você pode solicitar a exclusão de dados não clínicos a qualquer momento."
                        : "Clinical records are retained for a minimum of 8 years from the date of last treatment (or until age 25 for children) in accordance with the Chartered Society of Physiotherapy (CSP) guidelines and NHS records management code of practice. You may request deletion of non-clinical data at any time."}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Badge variant="outline" className="mt-0.5 flex-shrink-0">12</Badge>
                    <div>
                      <p className="font-semibold text-foreground">{isPt ? "Seus Direitos sob o UK GDPR" : "Your Rights Under UK GDPR"}</p>
                      <p className="mt-1">{isPt
                        ? "Você tem o direito de: (a) Acessar seus dados pessoais; (b) Retificação de dados imprecisos; (c) Exclusão (\"direito de ser esquecido\") quando aplicável; (d) Restringir o processamento; (e) Portabilidade de dados; (f) Opor-se ao processamento; (g) Retirar consentimento a qualquer momento; (h) Reclamar ao Information Commissioner's Office (ICO) em ico.org.uk."
                        : "You have the right to: (a) Access your personal data; (b) Rectification of inaccurate data; (c) Erasure (\"right to be forgotten\") where applicable; (d) Restrict processing; (e) Data portability; (f) Object to processing; (g) Withdraw consent at any time; (h) Complain to the Information Commissioner's Office (ICO) at ico.org.uk."}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Badge variant="outline" className="mt-0.5 flex-shrink-0">13</Badge>
                    <div>
                      <p className="font-semibold text-foreground">{isPt ? "Segurança dos Dados" : "Data Security"}</p>
                      <p className="mt-1">{isPt
                        ? "Implementamos medidas técnicas e organizacionais apropriadas para proteger seus dados, incluindo: transmissão de dados criptografada (TLS/SSL), infraestrutura de servidor segura, controles de acesso baseados em função, revisões regulares de segurança e treinamento em proteção de dados para a equipe."
                        : "We implement appropriate technical and organisational measures to protect your data, including: encrypted data transmission (TLS/SSL), secure server infrastructure, role-based access controls, regular security reviews, and staff data protection training."}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Badge variant="outline" className="mt-0.5 flex-shrink-0">14</Badge>
                    <div>
                      <p className="font-semibold text-foreground">{isPt ? "Compartilhamento de Dados com Terceiros" : "Third-Party Data Sharing"}</p>
                      <p className="mt-1">{isPt
                        ? "Podemos compartilhar seus dados com: (a) seu médico ou outros profissionais de saúde (com seu consentimento explícito); (b) processadores de pagamento (Stripe) para processamento de transações; (c) provedores de serviço de IA (Google) para análise clínica — anonimizados quando possível; (d) órgãos reguladores se exigido por lei. Não vendemos seus dados a terceiros."
                        : "We may share your data with: (a) your GP or other healthcare providers (with your explicit consent); (b) payment processors (Stripe) for transaction processing; (c) AI service providers (Google) for clinical analysis — anonymised where possible; (d) regulatory bodies if required by law. We do not sell your data to third parties."}</p>
                    </div>
                  </div>
                </div>
              </section>

              {/* Limitation of Liability */}
              <section>
                <div className="flex items-center gap-2 mb-4">
                  <Lock className="h-5 w-5 text-primary" />
                  <h2 className="text-lg font-semibold">{isPt ? "Limitação de Responsabilidade e Termos Gerais" : "Limitation of Liability & General Terms"}</h2>
                </div>
                <div className="bg-muted/30 rounded-lg p-5 space-y-4 text-sm text-muted-foreground">
                  <div className="flex items-start gap-3">
                    <Badge variant="outline" className="mt-0.5 flex-shrink-0">15</Badge>
                    <div>
                      <p className="font-semibold text-foreground">{isPt ? "Limitação de Responsabilidade" : "Limitation of Liability"}</p>
                      <p className="mt-1">{isPt
                        ? 'Na máxima extensão permitida por lei: a Plataforma é fornecida "como está"; não somos responsáveis por quaisquer danos indiretos, incidentais ou consequenciais decorrentes do uso da Plataforma; nossa responsabilidade total não excederá as taxas pagas por você nos 12 meses anteriores à reclamação. Nada nestes termos exclui responsabilidade por morte ou lesão pessoal causada por negligência, fraude ou qualquer outra responsabilidade que não possa ser excluída por lei.'
                        : 'To the fullest extent permitted by law: the Platform is provided "as is"; we are not liable for any indirect, incidental, or consequential damages arising from the use of the Platform; our total liability shall not exceed the fees paid by you in the 12 months preceding the claim. Nothing in these terms excludes liability for death or personal injury caused by negligence, fraud, or any other liability that cannot be excluded by law.'}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Badge variant="outline" className="mt-0.5 flex-shrink-0">16</Badge>
                    <div>
                      <p className="font-semibold text-foreground">{isPt ? "Pagamentos e Cancelamentos" : "Payments & Cancellations"}</p>
                      <p className="mt-1">{isPt
                        ? "Pacotes de serviços e consultas estão sujeitos à nossa política de cancelamento. Reembolsos são processados de acordo com o Consumer Rights Act 2015. Você tem 14 dias para cancelar um pacote de serviços a partir da data de compra se nenhum serviço tiver sido utilizado (período de reflexão sob o Consumer Contracts Regulations 2013)."
                        : "Service packages and appointments are subject to our cancellation policy. Refunds are processed in accordance with the Consumer Rights Act 2015. You have 14 days to cancel a service package from the date of purchase if no services have been used (cooling-off period under the Consumer Contracts Regulations 2013)."}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Badge variant="outline" className="mt-0.5 flex-shrink-0">17</Badge>
                    <div>
                      <p className="font-semibold text-foreground">{isPt ? "Legislação Aplicável" : "Governing Law"}</p>
                      <p className="mt-1">{isPt
                        ? "Estes termos são regidos pelas leis da Inglaterra e País de Gales. Quaisquer disputas estarão sujeitas à jurisdição exclusiva dos tribunais da Inglaterra e País de Gales."
                        : "These terms are governed by the laws of England and Wales. Any disputes shall be subject to the exclusive jurisdiction of the courts of England and Wales."}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Badge variant="outline" className="mt-0.5 flex-shrink-0">18</Badge>
                    <div>
                      <p className="font-semibold text-foreground">{isPt ? "Contato" : "Contact"}</p>
                      <p className="mt-1">{isPt
                        ? "Para consultas sobre proteção de dados ou para exercer seus direitos, entre em contato: Bruno Physical Rehabilitation, E-mail: admin@bpr.rehab. Para relatar uma violação de dados ou reclamação: Information Commissioner's Office (ICO), Tel: 0303 123 1113, Website: ico.org.uk."
                        : "For data protection queries or to exercise your rights, contact: Bruno Physical Rehabilitation, Email: admin@bpr.rehab. To report a data breach or complaint: Information Commissioner's Office (ICO), Tel: 0303 123 1113, Website: ico.org.uk."}</p>
                    </div>
                  </div>
                </div>
              </section>

              {/* Privacy Summary */}
              <div className="flex items-start gap-3 p-4 rounded-lg bg-primary/5 border border-primary/20 text-sm">
                <Shield className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-foreground">{isPt ? "Sua Privacidade é Importante" : "Your Privacy Matters"}</p>
                  <p className="text-muted-foreground mt-1">{isPt
                    ? "Seus dados são protegidos de acordo com o UK GDPR. Nunca vendemos seus dados. Imagens de avaliação corporal são automaticamente desfocadas no rosto para privacidade. Você pode retirar consentimento ou solicitar exclusão de dados a qualquer momento entrando em contato conosco."
                    : "Your data is protected in accordance with UK GDPR. We never sell your data. Body assessment images are automatically face-blurred for privacy. You can withdraw consent or request data deletion at any time by contacting us."}</p>
                </div>
              </div>
            </>
          ) : null}

          {/* Back to Signup */}
          <div className="text-center pb-4 space-y-3">
            <Link href="/signup">
              <Button variant="outline" className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                {isPt ? "Voltar ao Cadastro" : "Back to Sign Up"}
              </Button>
            </Link>
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
