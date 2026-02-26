"use client";

import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Badge } from "@/components/ui/badge";
import { Shield, Database, Eye, Globe, Lock, UserCheck, Clock, Mail, ArrowLeft } from "lucide-react";
import { useLocale } from "@/hooks/use-locale";

export default function PrivacyPolicyPage() {
  const { locale } = useLocale();
  const isPt = locale === "pt-BR";

  const lastUpdated = "26 February 2026";

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <SiteHeader currentPage="other" />
      <main className="flex-1 py-12 sm:py-16">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors">
            <ArrowLeft className="h-4 w-4" />
            {isPt ? "Voltar ao Início" : "Back to Home"}
          </Link>

          <div>
            <div className="flex items-center gap-3 mb-2">
              <Shield className="h-7 w-7 text-primary" />
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
                {isPt ? "Política de Privacidade" : "Privacy Policy"}
              </h1>
            </div>
            <p className="text-sm text-muted-foreground">
              {isPt ? `Última atualização: ${lastUpdated}` : `Last updated: ${lastUpdated}`}
            </p>
          </div>

          {/* Introduction */}
          <section className="bg-muted/30 rounded-lg p-5 space-y-3 text-sm text-muted-foreground">
            <p>
              {isPt
                ? "Bruno Physical Rehabilitation Ltd (\"nós\", \"nosso\") está comprometido em proteger sua privacidade. Esta política explica como coletamos, usamos e protegemos seus dados pessoais quando você visita nosso site (bpr.rehab) ou usa nossos serviços clínicos."
                : "Bruno Physical Rehabilitation Ltd (\"we\", \"our\", \"us\") is committed to protecting your privacy. This policy explains how we collect, use, and safeguard your personal data when you visit our website (bpr.rehab) or use our clinical services."}
            </p>
            <p>
              {isPt
                ? "Processamos dados pessoais em conformidade com o Regulamento Geral de Proteção de Dados do UK (UK GDPR), a Lei de Proteção de Dados de 2018 e os Regulamentos de Privacidade e Comunicações Eletrônicas (PECR)."
                : "We process personal data in compliance with the UK General Data Protection Regulation (UK GDPR), the Data Protection Act 2018, and the Privacy and Electronic Communications Regulations (PECR)."}
            </p>
          </section>

          {/* 1. Data Controller */}
          <Section icon={UserCheck} title={isPt ? "1. Controlador de Dados" : "1. Data Controller"}>
            <p>{isPt
              ? "O controlador de dados é: Bruno Physical Rehabilitation Ltd, com sede em Richmond, Londres, Reino Unido."
              : "The data controller is: Bruno Physical Rehabilitation Ltd, based in Richmond, London, United Kingdom."}</p>
            <p>{isPt
              ? "Para perguntas sobre proteção de dados, entre em contato: admin@bpr.rehab"
              : "For data protection enquiries, contact: admin@bpr.rehab"}</p>
          </Section>

          {/* 2. What Data We Collect */}
          <Section icon={Database} title={isPt ? "2. Dados que Coletamos" : "2. Data We Collect"}>
            <p className="font-semibold text-foreground">{isPt ? "a) Dados que você nos fornece:" : "a) Data you provide to us:"}</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>{isPt ? "Dados de identificação: nome, e-mail, telefone, data de nascimento, endereço" : "Identity data: name, email, phone, date of birth, address"}</li>
              <li>{isPt ? "Dados de triagem médica: histórico de saúde, medicações, alergias, condições" : "Medical screening data: health history, medications, allergies, conditions"}</li>
              <li>{isPt ? "Dados clínicos: avaliações, imagens corporais, escaneamentos dos pés, pressão arterial" : "Clinical data: assessments, body images, foot scans, blood pressure readings"}</li>
              <li>{isPt ? "Dados de pagamento: processados através do Stripe (não armazenamos dados de cartão)" : "Payment data: processed via Stripe (we do not store card details)"}</li>
              <li>{isPt ? "Comunicações: e-mails, mensagens, formulários de contato" : "Communications: emails, messages, contact form submissions"}</li>
            </ul>

            <p className="font-semibold text-foreground mt-4">{isPt ? "b) Dados coletados automaticamente (com consentimento):" : "b) Data collected automatically (with consent):"}</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>{isPt ? "Endereço IP e geolocalização aproximada (país, cidade)" : "IP address and approximate geolocation (country, city)"}</li>
              <li>{isPt ? "Fingerprint do navegador (impressão digital técnica, sem cookies)" : "Browser fingerprint (technical identifier, no cookies used)"}</li>
              <li>{isPt ? "Páginas visitadas, tempo na página e profundidade de rolagem" : "Pages visited, time on page, and scroll depth"}</li>
              <li>{isPt ? "Posições de cliques (para geração de mapa de calor)" : "Click positions (for heatmap generation)"}</li>
              <li>{isPt ? "Tipo de dispositivo, navegador, sistema operacional" : "Device type, browser, operating system"}</li>
              <li>{isPt ? "Dados de referência e parâmetros UTM" : "Referrer data and UTM parameters"}</li>
            </ul>
            <p className="mt-2 text-xs italic">
              {isPt
                ? "Nota: A coleta de dados analíticos só ocorre após você dar consentimento explícito através do nosso banner de cookies."
                : "Note: Analytics data collection only occurs after you give explicit consent via our cookie banner."}
            </p>
          </Section>

          {/* 3. Lawful Basis */}
          <Section icon={Lock} title={isPt ? "3. Base Legal para Processamento" : "3. Lawful Basis for Processing"}>
            <div className="space-y-3">
              {[
                { basis: isPt ? "Consentimento" : "Consent", desc: isPt ? "Para dados analíticos do site, cookies não essenciais e comunicações de marketing." : "For website analytics data, non-essential cookies, and marketing communications." },
                { basis: isPt ? "Execução de Contrato" : "Performance of Contract", desc: isPt ? "Para fornecer serviços clínicos que você solicitou, gerenciar consultas e tratamentos." : "To provide clinical services you have requested, manage appointments and treatments." },
                { basis: isPt ? "Interesse Legítimo" : "Legitimate Interest", desc: isPt ? "Para melhorar nossos serviços e site, garantir segurança e prevenir fraude." : "To improve our services and website, ensure security, and prevent fraud." },
                { basis: isPt ? "Obrigação Legal" : "Legal Obligation", desc: isPt ? "Para cumprir requisitos regulatórios de saúde e manutenção de registros." : "To comply with healthcare regulatory and record-keeping requirements." },
                { basis: isPt ? "Interesses Vitais" : "Vital Interests", desc: isPt ? "Em situações de emergência onde sua saúde pode estar em risco." : "In emergency situations where your health may be at risk." },
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-2">
                  <Badge variant="outline" className="mt-0.5 shrink-0 text-[10px]">{item.basis}</Badge>
                  <p>{item.desc}</p>
                </div>
              ))}
            </div>
          </Section>

          {/* 4. How We Use Data */}
          <Section icon={Eye} title={isPt ? "4. Como Usamos Seus Dados" : "4. How We Use Your Data"}>
            <ul className="list-disc pl-5 space-y-1">
              <li>{isPt ? "Fornecer e gerenciar serviços de fisioterapia" : "Provide and manage physiotherapy services"}</li>
              <li>{isPt ? "Processar agendamentos e pagamentos" : "Process appointments and payments"}</li>
              <li>{isPt ? "Enviar lembretes de consultas e comunicações clínicas" : "Send appointment reminders and clinical communications"}</li>
              <li>{isPt ? "Gerar análises clínicas assistidas por IA (revisadas pelo fisioterapeuta)" : "Generate AI-assisted clinical analyses (reviewed by physiotherapist)"}</li>
              <li>{isPt ? "Analisar o uso do site para melhorar a experiência do usuário (apenas com consentimento)" : "Analyse website usage to improve user experience (with consent only)"}</li>
              <li>{isPt ? "Gerar mapas de calor de cliques para otimização do site (apenas com consentimento)" : "Generate click heatmaps for site optimisation (with consent only)"}</li>
              <li>{isPt ? "Detectar e prevenir atividades fraudulentas" : "Detect and prevent fraudulent activity"}</li>
              <li>{isPt ? "Cumprir obrigações legais e regulatórias" : "Comply with legal and regulatory obligations"}</li>
            </ul>
          </Section>

          {/* 5. Analytics & Tracking */}
          <Section icon={Eye} title={isPt ? "5. Análise do Site e Rastreamento" : "5. Website Analytics & Tracking"}>
            <p>{isPt
              ? "Utilizamos um sistema de análise proprietário (não Google Analytics ou serviços de terceiros) para entender como os visitantes interagem com nosso site. Isso nos ajuda a melhorar nossos serviços e experiência do usuário."
              : "We use a proprietary analytics system (not Google Analytics or third-party services) to understand how visitors interact with our website. This helps us improve our services and user experience."}</p>
            <p className="font-semibold text-foreground mt-3">{isPt ? "O que rastreamos (após consentimento):" : "What we track (after consent):"}</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>{isPt ? "Páginas visitadas e tempo gasto em cada página" : "Pages visited and time spent on each page"}</li>
              <li>{isPt ? "Profundidade de rolagem (quanto da página você viu)" : "Scroll depth (how much of the page you viewed)"}</li>
              <li>{isPt ? "Posições de cliques (para mapas de calor)" : "Click positions (for heatmaps)"}</li>
              <li>{isPt ? "Tipo de dispositivo, navegador e sistema operacional" : "Device type, browser, and operating system"}</li>
              <li>{isPt ? "País e cidade aproximados (via IP)" : "Approximate country and city (via IP)"}</li>
              <li>{isPt ? "Fonte de referência (como você chegou ao nosso site)" : "Referral source (how you arrived at our site)"}</li>
            </ul>
            <p className="mt-3 font-semibold text-foreground">{isPt ? "O que NÃO fazemos:" : "What we do NOT do:"}</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>{isPt ? "Não usamos cookies de rastreamento de terceiros" : "We do not use third-party tracking cookies"}</li>
              <li>{isPt ? "Não vendemos seus dados a ninguém" : "We do not sell your data to anyone"}</li>
              <li>{isPt ? "Não compartilhamos dados analíticos com redes de publicidade" : "We do not share analytics data with advertising networks"}</li>
              <li>{isPt ? "Não rastreamos você em outros sites" : "We do not track you across other websites"}</li>
              <li>{isPt ? "Não coletamos dados analíticos sem seu consentimento explícito" : "We do not collect analytics data without your explicit consent"}</li>
            </ul>
            <p className="mt-3 text-xs italic">
              {isPt
                ? "Usamos fingerprinting do navegador (uma técnica que cria um identificador a partir de características técnicas do seu navegador) em vez de cookies. Isso é tratado como uma \"tecnologia similar\" sob o PECR e requer seu consentimento, que pedimos através do nosso banner de cookies."
                : "We use browser fingerprinting (a technique that creates an identifier from technical characteristics of your browser) instead of cookies. This is treated as a \"similar technology\" under PECR and requires your consent, which we request via our cookie banner."}
            </p>
          </Section>

          {/* 6. Data Sharing */}
          <Section icon={Globe} title={isPt ? "6. Compartilhamento de Dados" : "6. Data Sharing"}>
            <p>{isPt ? "Podemos compartilhar seus dados com:" : "We may share your data with:"}</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>{isPt ? "Processadores de pagamento (Stripe) para transações seguras" : "Payment processors (Stripe) for secure transactions"}</li>
              <li>{isPt ? "Provedores de IA (Google Gemini) para análise clínica — dados anonimizados quando possível" : "AI providers (Google Gemini) for clinical analysis — anonymised where possible"}</li>
              <li>{isPt ? "Serviço de geolocalização de IP (ip-api.com) — apenas endereço IP, sem dados pessoais" : "IP geolocation service (ip-api.com) — only IP address, no personal data"}</li>
              <li>{isPt ? "Seu médico ou outros profissionais de saúde (com seu consentimento explícito)" : "Your GP or other healthcare providers (with your explicit consent)"}</li>
              <li>{isPt ? "Órgãos reguladores quando exigido por lei" : "Regulatory bodies when required by law"}</li>
            </ul>
            <p className="mt-2 font-semibold text-foreground">{isPt ? "Nunca vendemos seus dados pessoais." : "We never sell your personal data."}</p>
          </Section>

          {/* 7. Data Retention */}
          <Section icon={Clock} title={isPt ? "7. Retenção de Dados" : "7. Data Retention"}>
            <div className="space-y-2">
              {[
                { type: isPt ? "Registros clínicos" : "Clinical records", period: isPt ? "8 anos após o último tratamento (diretrizes CSP/NHS)" : "8 years from last treatment (CSP/NHS guidelines)" },
                { type: isPt ? "Dados analíticos do site" : "Website analytics data", period: isPt ? "24 meses, depois anonimizados ou excluídos" : "24 months, then anonymised or deleted" },
                { type: isPt ? "Dados de conta" : "Account data", period: isPt ? "Enquanto sua conta estiver ativa + 12 meses" : "While your account is active + 12 months" },
                { type: isPt ? "Registros de consentimento" : "Consent records", period: isPt ? "6 anos (conformidade legal)" : "6 years (legal compliance)" },
                { type: isPt ? "Dados de pagamento" : "Payment data", period: isPt ? "7 anos (requisito fiscal HMRC)" : "7 years (HMRC tax requirement)" },
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-2 text-xs">
                  <Badge variant="secondary" className="text-[10px] shrink-0">{item.type}</Badge>
                  <span>{item.period}</span>
                </div>
              ))}
            </div>
          </Section>

          {/* 8. Your Rights */}
          <Section icon={UserCheck} title={isPt ? "8. Seus Direitos" : "8. Your Rights"}>
            <p>{isPt ? "Sob o UK GDPR, você tem os seguintes direitos:" : "Under the UK GDPR, you have the following rights:"}</p>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>{isPt ? "Direito de acesso" : "Right of access"}</strong> — {isPt ? "Solicitar uma cópia dos seus dados pessoais" : "Request a copy of your personal data"}</li>
              <li><strong>{isPt ? "Direito de retificação" : "Right to rectification"}</strong> — {isPt ? "Corrigir dados imprecisos" : "Correct inaccurate data"}</li>
              <li><strong>{isPt ? "Direito de exclusão" : "Right to erasure"}</strong> — {isPt ? "Solicitar exclusão dos seus dados (sujeito a obrigações legais)" : "Request deletion of your data (subject to legal obligations)"}</li>
              <li><strong>{isPt ? "Direito de restringir processamento" : "Right to restrict processing"}</strong> — {isPt ? "Limitar como usamos seus dados" : "Limit how we use your data"}</li>
              <li><strong>{isPt ? "Direito à portabilidade" : "Right to data portability"}</strong> — {isPt ? "Receber seus dados em formato legível por máquina" : "Receive your data in a machine-readable format"}</li>
              <li><strong>{isPt ? "Direito de objeção" : "Right to object"}</strong> — {isPt ? "Opor-se ao processamento para marketing ou interesse legítimo" : "Object to processing for marketing or legitimate interest"}</li>
              <li><strong>{isPt ? "Direito de retirar consentimento" : "Right to withdraw consent"}</strong> — {isPt ? "A qualquer momento, sem afetar a legalidade do processamento anterior" : "At any time, without affecting the lawfulness of prior processing"}</li>
            </ul>
            <p className="mt-3">{isPt
              ? "Para exercer qualquer um desses direitos, entre em contato: admin@bpr.rehab. Responderemos dentro de 30 dias."
              : "To exercise any of these rights, contact: admin@bpr.rehab. We will respond within 30 days."}</p>
          </Section>

          {/* 9. Data Security */}
          <Section icon={Lock} title={isPt ? "9. Segurança dos Dados" : "9. Data Security"}>
            <p>{isPt ? "Implementamos medidas técnicas e organizacionais apropriadas:" : "We implement appropriate technical and organisational measures:"}</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>{isPt ? "Transmissão criptografada (TLS/SSL) em todas as páginas" : "Encrypted transmission (TLS/SSL) on all pages"}</li>
              <li>{isPt ? "Controles de acesso baseados em função" : "Role-based access controls"}</li>
              <li>{isPt ? "Senhas armazenadas com hash (bcrypt)" : "Passwords stored with hash (bcrypt)"}</li>
              <li>{isPt ? "Infraestrutura de servidor segura com atualizações regulares" : "Secure server infrastructure with regular updates"}</li>
              <li>{isPt ? "Desfoque automático de rosto em imagens de avaliação corporal" : "Automatic face blurring on body assessment images"}</li>
              <li>{isPt ? "Revisões regulares de segurança" : "Regular security reviews"}</li>
            </ul>
          </Section>

          {/* 10. Children */}
          <Section icon={Shield} title={isPt ? "10. Crianças" : "10. Children"}>
            <p>{isPt
              ? "Nossos serviços não são direcionados a menores de 16 anos. Não coletamos intencionalmente dados pessoais de crianças sem consentimento dos pais. Se você acredita que coletamos dados de uma criança, entre em contato imediatamente."
              : "Our services are not directed to children under 16. We do not knowingly collect personal data from children without parental consent. If you believe we have collected data from a child, please contact us immediately."}</p>
          </Section>

          {/* 11. International Transfers */}
          <Section icon={Globe} title={isPt ? "11. Transferências Internacionais" : "11. International Data Transfers"}>
            <p>{isPt
              ? "Seus dados podem ser processados por provedores de serviço localizados fora do Reino Unido (ex: Google para análise de IA, Stripe para pagamentos). Quando isso ocorrer, garantimos que salvaguardas apropriadas estejam em vigor, incluindo Cláusulas Contratuais Padrão (SCCs) ou adequação reconhecida pelo UK."
              : "Your data may be processed by service providers located outside the United Kingdom (e.g., Google for AI analysis, Stripe for payments). Where this occurs, we ensure appropriate safeguards are in place, including Standard Contractual Clauses (SCCs) or UK adequacy recognition."}</p>
          </Section>

          {/* 12. Changes */}
          <Section icon={Clock} title={isPt ? "12. Alterações nesta Política" : "12. Changes to This Policy"}>
            <p>{isPt
              ? "Podemos atualizar esta política periodicamente. Alterações significativas serão notificadas no site. A data \"Última atualização\" no topo indica quando foi revisada pela última vez."
              : "We may update this policy periodically. Significant changes will be notified on the website. The \"Last updated\" date at the top indicates when it was last revised."}</p>
          </Section>

          {/* 13. Complaints */}
          <Section icon={Mail} title={isPt ? "13. Reclamações" : "13. Complaints"}>
            <p>{isPt
              ? "Se você tem preocupações sobre como tratamos seus dados pessoais, entre em contato conosco primeiro em admin@bpr.rehab. Se não estiver satisfeito com nossa resposta, você pode reclamar ao:"
              : "If you have concerns about how we handle your personal data, please contact us first at admin@bpr.rehab. If you are not satisfied with our response, you may complain to the:"}</p>
            <div className="mt-2 p-3 bg-white/5 rounded-lg">
              <p className="font-semibold text-foreground">Information Commissioner&apos;s Office (ICO)</p>
              <p>{isPt ? "Telefone" : "Phone"}: 0303 123 1113</p>
              <p>Website: <a href="https://ico.org.uk" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">ico.org.uk</a></p>
            </div>
          </Section>

          {/* Contact */}
          <div className="flex items-start gap-3 p-4 rounded-lg bg-primary/5 border border-primary/20 text-sm">
            <Mail className="h-5 w-5 text-primary shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-foreground">{isPt ? "Contato" : "Contact"}</p>
              <p className="text-muted-foreground mt-1">
                Bruno Physical Rehabilitation Ltd<br />
                Email: <a href="mailto:admin@bpr.rehab" className="text-primary hover:underline">admin@bpr.rehab</a><br />
                {isPt ? "Endereço" : "Address"}: Richmond, London, TW10, United Kingdom
              </p>
            </div>
          </div>

          <div className="flex gap-4 text-sm text-muted-foreground">
            <Link href="/cookies" className="text-primary hover:underline">{isPt ? "Política de Cookies" : "Cookie Policy"}</Link>
            <Link href="/terms" className="text-primary hover:underline">{isPt ? "Termos de Uso" : "Terms of Use"}</Link>
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}

function Section({ icon: Icon, title, children }: { icon: any; title: string; children: React.ReactNode }) {
  return (
    <section>
      <div className="flex items-center gap-2 mb-3">
        <Icon className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-semibold text-foreground">{title}</h2>
      </div>
      <div className="bg-muted/30 rounded-lg p-5 space-y-3 text-sm text-muted-foreground">
        {children}
      </div>
    </section>
  );
}
