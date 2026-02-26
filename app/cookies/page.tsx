"use client";

import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Badge } from "@/components/ui/badge";
import { Cookie, Shield, ArrowLeft, Settings } from "lucide-react";
import { useLocale } from "@/hooks/use-locale";
import { CookiePreferencesButton } from "@/components/cookie-consent";

export default function CookiePolicyPage() {
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
              <Cookie className="h-7 w-7 text-primary" />
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
                {isPt ? "Política de Cookies" : "Cookie Policy"}
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
                ? "Esta política explica como o site bpr.rehab usa cookies e tecnologias similares. Estamos em conformidade com os Regulamentos de Privacidade e Comunicações Eletrônicas (PECR) e o UK GDPR."
                : "This policy explains how the bpr.rehab website uses cookies and similar technologies. We comply with the Privacy and Electronic Communications Regulations (PECR) and the UK GDPR."}
            </p>
          </section>

          {/* What Are Cookies */}
          <Section title={isPt ? "1. O que são Cookies e Tecnologias Similares?" : "1. What Are Cookies and Similar Technologies?"}>
            <p>
              {isPt
                ? "Cookies são pequenos arquivos de texto armazenados no seu dispositivo quando você visita um site. \"Tecnologias similares\" incluem fingerprinting do navegador, armazenamento local (localStorage) e web beacons."
                : "Cookies are small text files stored on your device when you visit a website. \"Similar technologies\" include browser fingerprinting, local storage (localStorage), and web beacons."}
            </p>
            <p>
              {isPt
                ? "Nosso site utiliza principalmente localStorage e fingerprinting do navegador em vez de cookies tradicionais de rastreamento. Sob o PECR, essas tecnologias requerem o mesmo nível de consentimento que cookies."
                : "Our website primarily uses localStorage and browser fingerprinting rather than traditional tracking cookies. Under PECR, these technologies require the same level of consent as cookies."}
            </p>
          </Section>

          {/* Technologies We Use */}
          <section>
            <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
              <Settings className="h-5 w-5 text-primary" />
              {isPt ? "2. Tecnologias que Utilizamos" : "2. Technologies We Use"}
            </h2>

            {/* Strictly Necessary */}
            <div className="mb-4">
              <div className="flex items-center gap-2 mb-2">
                <Badge className="bg-emerald-500/20 text-emerald-400 text-[10px]">
                  {isPt ? "Estritamente Necessários" : "Strictly Necessary"}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {isPt ? "Não requerem consentimento" : "No consent required"}
                </span>
              </div>
              <div className="bg-muted/30 rounded-lg overflow-hidden">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-white/10">
                      <th className="text-left p-3 font-medium text-foreground">{isPt ? "Nome" : "Name"}</th>
                      <th className="text-left p-3 font-medium text-foreground">{isPt ? "Tipo" : "Type"}</th>
                      <th className="text-left p-3 font-medium text-foreground">{isPt ? "Finalidade" : "Purpose"}</th>
                      <th className="text-left p-3 font-medium text-foreground">{isPt ? "Duração" : "Duration"}</th>
                    </tr>
                  </thead>
                  <tbody className="text-muted-foreground">
                    <tr className="border-b border-white/5">
                      <td className="p-3 font-mono">next-auth.session-token</td>
                      <td className="p-3">Cookie</td>
                      <td className="p-3">{isPt ? "Autenticação de sessão do usuário" : "User session authentication"}</td>
                      <td className="p-3">{isPt ? "Sessão" : "Session"}</td>
                    </tr>
                    <tr className="border-b border-white/5">
                      <td className="p-3 font-mono">next-auth.csrf-token</td>
                      <td className="p-3">Cookie</td>
                      <td className="p-3">{isPt ? "Proteção contra ataques CSRF" : "CSRF attack protection"}</td>
                      <td className="p-3">{isPt ? "Sessão" : "Session"}</td>
                    </tr>
                    <tr className="border-b border-white/5">
                      <td className="p-3 font-mono">next-auth.callback-url</td>
                      <td className="p-3">Cookie</td>
                      <td className="p-3">{isPt ? "URL de redirecionamento após login" : "Redirect URL after login"}</td>
                      <td className="p-3">{isPt ? "Sessão" : "Session"}</td>
                    </tr>
                    <tr className="border-b border-white/5">
                      <td className="p-3 font-mono">bpr_cookie_consent</td>
                      <td className="p-3">localStorage</td>
                      <td className="p-3">{isPt ? "Armazena suas preferências de consentimento de cookies" : "Stores your cookie consent preferences"}</td>
                      <td className="p-3">{isPt ? "Persistente" : "Persistent"}</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-mono">locale</td>
                      <td className="p-3">localStorage</td>
                      <td className="p-3">{isPt ? "Preferência de idioma (EN/PT)" : "Language preference (EN/PT)"}</td>
                      <td className="p-3">{isPt ? "Persistente" : "Persistent"}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Analytics */}
            <div className="mb-4">
              <div className="flex items-center gap-2 mb-2">
                <Badge className="bg-blue-500/20 text-blue-400 text-[10px]">
                  {isPt ? "Analíticos" : "Analytics"}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {isPt ? "Requerem consentimento" : "Require consent"}
                </span>
              </div>
              <div className="bg-muted/30 rounded-lg overflow-hidden">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-white/10">
                      <th className="text-left p-3 font-medium text-foreground">{isPt ? "Tecnologia" : "Technology"}</th>
                      <th className="text-left p-3 font-medium text-foreground">{isPt ? "Tipo" : "Type"}</th>
                      <th className="text-left p-3 font-medium text-foreground">{isPt ? "Finalidade" : "Purpose"}</th>
                      <th className="text-left p-3 font-medium text-foreground">{isPt ? "Dados" : "Data"}</th>
                    </tr>
                  </thead>
                  <tbody className="text-muted-foreground">
                    <tr className="border-b border-white/5">
                      <td className="p-3 font-mono">{isPt ? "Fingerprint do Navegador" : "Browser Fingerprint"}</td>
                      <td className="p-3">{isPt ? "Tecnologia similar" : "Similar technology"}</td>
                      <td className="p-3">{isPt ? "Identificar visitantes únicos sem cookies" : "Identify unique visitors without cookies"}</td>
                      <td className="p-3">{isPt ? "Canvas hash, UA, tela, idioma, fuso horário" : "Canvas hash, UA, screen, language, timezone"}</td>
                    </tr>
                    <tr className="border-b border-white/5">
                      <td className="p-3 font-mono">{isPt ? "Rastreamento de Página" : "Page View Tracking"}</td>
                      <td className="p-3">sendBeacon API</td>
                      <td className="p-3">{isPt ? "Registrar páginas visitadas, tempo na página, profundidade de scroll" : "Record pages visited, time on page, scroll depth"}</td>
                      <td className="p-3">{isPt ? "URL, título, tempo, scroll %" : "URL, title, time, scroll %"}</td>
                    </tr>
                    <tr className="border-b border-white/5">
                      <td className="p-3 font-mono">{isPt ? "Rastreamento de Cliques" : "Click Tracking"}</td>
                      <td className="p-3">sendBeacon API</td>
                      <td className="p-3">{isPt ? "Gerar mapas de calor de interação do usuário" : "Generate user interaction heatmaps"}</td>
                      <td className="p-3">{isPt ? "Posição x/y, elemento clicado" : "x/y position, clicked element"}</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-mono">{isPt ? "Geolocalização de IP" : "IP Geolocation"}</td>
                      <td className="p-3">{isPt ? "Pesquisa do servidor" : "Server-side lookup"}</td>
                      <td className="p-3">{isPt ? "País e cidade aproximados do visitante" : "Approximate visitor country and city"}</td>
                      <td className="p-3">{isPt ? "IP → país, cidade (não armazenamos IP completo)" : "IP → country, city"}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Marketing */}
            <div className="mb-4">
              <div className="flex items-center gap-2 mb-2">
                <Badge className="bg-amber-500/20 text-amber-400 text-[10px]">
                  {isPt ? "Marketing" : "Marketing"}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {isPt ? "Requerem consentimento — Atualmente não usados" : "Require consent — Currently not in use"}
                </span>
              </div>
              <div className="bg-muted/30 rounded-lg p-4 text-sm text-muted-foreground">
                <p>{isPt
                  ? "Atualmente não utilizamos cookies ou tecnologias de marketing. Se introduzirmos no futuro, atualizaremos esta política e solicitaremos seu consentimento."
                  : "We currently do not use any marketing cookies or technologies. If we introduce them in the future, we will update this policy and request your consent."}</p>
              </div>
            </div>
          </section>

          {/* How to Control */}
          <Section title={isPt ? "3. Como Controlar Cookies e Rastreamento" : "3. How to Control Cookies and Tracking"}>
            <p className="font-semibold text-foreground">{isPt ? "a) Banner de consentimento:" : "a) Consent banner:"}</p>
            <p>{isPt
              ? "Quando você visita nosso site pela primeira vez, um banner de consentimento permite que você aceite ou rejeite cookies não essenciais e tecnologias de rastreamento. Você pode alterar suas preferências a qualquer momento."
              : "When you first visit our site, a consent banner allows you to accept or reject non-essential cookies and tracking technologies. You can change your preferences at any time."}</p>

            <div className="mt-3 p-3 bg-white/5 rounded-lg flex items-center gap-3">
              <CookiePreferencesButton />
              <span className="text-xs text-muted-foreground">
                {isPt ? "← Clique para alterar suas preferências de cookies" : "← Click to change your cookie preferences"}
              </span>
            </div>

            <p className="font-semibold text-foreground mt-4">{isPt ? "b) Configurações do navegador:" : "b) Browser settings:"}</p>
            <p>{isPt
              ? "Você pode configurar seu navegador para bloquear ou alertar sobre cookies. Note que bloquear cookies estritamente necessários pode afetar o funcionamento do site."
              : "You can set your browser to block or alert you about cookies. Note that blocking strictly necessary cookies may affect how the site functions."}</p>

            <p className="font-semibold text-foreground mt-4">{isPt ? "c) Opt-out do fingerprinting:" : "c) Fingerprinting opt-out:"}</p>
            <p>{isPt
              ? "O fingerprinting do navegador só é ativado após você dar consentimento na categoria \"Analíticos\". Se você rejeitar cookies analíticos, nenhum fingerprint será gerado e nenhum dado de navegação será coletado."
              : "Browser fingerprinting is only activated after you give consent in the \"Analytics\" category. If you reject analytics cookies, no fingerprint will be generated and no browsing data will be collected."}</p>
          </Section>

          {/* Third-party services */}
          <Section title={isPt ? "4. Serviços de Terceiros" : "4. Third-Party Services"}>
            <p>{isPt
              ? "Nosso sistema de análise é 100% proprietário. Não utilizamos Google Analytics, Facebook Pixel ou qualquer outro serviço de rastreamento de terceiros. Os únicos serviços externos que podem definir cookies são:"
              : "Our analytics system is 100% proprietary. We do not use Google Analytics, Facebook Pixel, or any other third-party tracking service. The only external services that may set cookies are:"}</p>
            <ul className="list-disc pl-5 space-y-1 mt-2">
              <li><strong>Stripe</strong> — {isPt ? "Para processamento de pagamentos (cookies estritamente necessários)" : "For payment processing (strictly necessary cookies)"}</li>
            </ul>
          </Section>

          {/* Legal Framework */}
          <Section title={isPt ? "5. Marco Legal" : "5. Legal Framework"}>
            <p>{isPt
              ? "Esta política está em conformidade com:"
              : "This policy complies with:"}</p>
            <ul className="list-disc pl-5 space-y-1 mt-2">
              <li><strong>PECR</strong> — Privacy and Electronic Communications Regulations 2003 ({isPt ? "alterado em 2011 e 2018" : "as amended 2011 and 2018"})</li>
              <li><strong>UK GDPR</strong> — UK General Data Protection Regulation</li>
              <li><strong>DPA 2018</strong> — Data Protection Act 2018</li>
            </ul>
            <p className="mt-3">{isPt
              ? "O ICO (Information Commissioner's Office) é a autoridade supervisora do UK para proteção de dados e privacidade eletrônica."
              : "The ICO (Information Commissioner's Office) is the UK supervisory authority for data protection and electronic privacy."}</p>
            <p className="mt-1">Website: <a href="https://ico.org.uk/for-organisations/guide-to-pecr/cookies-and-similar-technologies/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">ICO Cookie Guidance</a></p>
          </Section>

          {/* Contact */}
          <div className="flex items-start gap-3 p-4 rounded-lg bg-primary/5 border border-primary/20 text-sm">
            <Shield className="h-5 w-5 text-primary shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-foreground">{isPt ? "Perguntas?" : "Questions?"}</p>
              <p className="text-muted-foreground mt-1">
                {isPt
                  ? "Para perguntas sobre cookies ou privacidade, entre em contato: "
                  : "For questions about cookies or privacy, contact: "}
                <a href="mailto:admin@bpr.rehab" className="text-primary hover:underline">admin@bpr.rehab</a>
              </p>
            </div>
          </div>

          <div className="flex gap-4 text-sm text-muted-foreground">
            <Link href="/privacy" className="text-primary hover:underline">{isPt ? "Política de Privacidade" : "Privacy Policy"}</Link>
            <Link href="/terms" className="text-primary hover:underline">{isPt ? "Termos de Uso" : "Terms of Use"}</Link>
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-lg font-semibold text-foreground mb-3">{title}</h2>
      <div className="bg-muted/30 rounded-lg p-5 space-y-3 text-sm text-muted-foreground">
        {children}
      </div>
    </section>
  );
}
