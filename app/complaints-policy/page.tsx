"use client";

import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Badge } from "@/components/ui/badge";
import { MessageSquareWarning, ArrowLeft, Mail, Phone, Clock } from "lucide-react";
import { useLocale } from "@/hooks/use-locale";

export default function ComplaintsPolicyPage() {
  const { locale } = useLocale();
  const isPt = locale === "pt-BR";

  const lastUpdated = "30 July 2026";

  return (
    <div className="public-site min-h-screen bg-background flex flex-col">
      <SiteHeader currentPage="other" />
      <main className="flex-1 py-12 sm:py-16">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors">
            <ArrowLeft className="h-4 w-4" />
            {isPt ? "Voltar ao Início" : "Back to Home"}
          </Link>

          <div>
            <div className="flex items-center gap-3 mb-2">
              <MessageSquareWarning className="h-7 w-7 text-primary" />
              <h1 className="font-sora text-2xl sm:text-3xl font-bold text-foreground tracking-tight">
                {isPt ? "Política de Reclamações" : "Complaints Policy"}
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
                ? "Na Bruno Physical Rehabilitation, levamos a sério qualquer preocupação sobre a qualidade dos nossos cuidados ou serviços. Se algo não correu como esperava, queremos saber — isso ajuda-nos a melhorar e a garantir que você recebe o padrão de cuidado que merece."
                : "At Bruno Physical Rehabilitation, we take any concern about the quality of our care or services seriously. If something hasn't gone as you expected, we want to know about it — it helps us improve and ensures you receive the standard of care you deserve."}
            </p>
          </section>

          {/* 1. How to complain */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <MessageSquareWarning className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold">{isPt ? "Como Fazer uma Reclamação" : "How to Make a Complaint"}</h2>
            </div>
            <div className="bg-muted/30 rounded-lg p-5 space-y-4 text-sm text-muted-foreground">
              <div className="flex items-start gap-3">
                <Badge variant="outline" className="mt-0.5 flex-shrink-0">1</Badge>
                <div>
                  <p className="font-semibold text-foreground">{isPt ? "Informalmente, primeiro" : "Informally, first"}</p>
                  <p className="mt-1">
                    {isPt
                      ? "Na maioria dos casos, o mais rápido é falar diretamente com o seu fisioterapeuta ou com a nossa equipa de receção — muitas preocupações podem ser resolvidas na hora."
                      : "In most cases, the quickest route is to speak directly with your physiotherapist or our reception team — many concerns can be resolved on the spot."}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Badge variant="outline" className="mt-0.5 flex-shrink-0">2</Badge>
                <div>
                  <p className="font-semibold text-foreground">{isPt ? "Formalmente, por escrito" : "Formally, in writing"}</p>
                  <p className="mt-1">
                    {isPt
                      ? "Se preferir apresentar uma reclamação formal, ou se a conversa informal não resolveu a questão, fale connosco pelo WhatsApp"
                      : "If you'd rather raise a formal complaint, or the informal conversation hasn't resolved things, please contact us via WhatsApp"}
                    {isPt
                      ? ", através do seu portal do paciente (secção Mensagens), ou por telefone."
                      : ", through your patient portal (Messages section), or by phone."}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Badge variant="outline" className="mt-0.5 flex-shrink-0">3</Badge>
                <div>
                  <p className="font-semibold text-foreground">{isPt ? "O que incluir" : "What to include"}</p>
                  <p className="mt-1">
                    {isPt
                      ? "Por favor inclua o seu nome, dados de contacto, a data do tratamento ou interação em causa, e uma descrição do que aconteceu. Isto ajuda-nos a investigar rapidamente."
                      : "Please include your name, contact details, the date of the treatment or interaction in question, and a description of what happened. This helps us investigate quickly."}
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* 2. What happens next */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <Clock className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold">{isPt ? "O Que Acontece a Seguir" : "What Happens Next"}</h2>
            </div>
            <div className="bg-muted/30 rounded-lg p-5 space-y-4 text-sm text-muted-foreground">
              <div className="flex items-start gap-3">
                <Badge variant="outline" className="mt-0.5 flex-shrink-0">1</Badge>
                <div>
                  <p className="font-semibold text-foreground">{isPt ? "Confirmação — dentro de 3 dias úteis" : "Acknowledgement — within 3 working days"}</p>
                  <p className="mt-1">
                    {isPt
                      ? "Confirmaremos a receção da sua reclamação por e-mail ou telefone, e explicaremos os próximos passos."
                      : "We'll confirm receipt of your complaint by email or phone, and explain the next steps."}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Badge variant="outline" className="mt-0.5 flex-shrink-0">2</Badge>
                <div>
                  <p className="font-semibold text-foreground">{isPt ? "Investigação — dentro de 20 dias úteis" : "Investigation — within 20 working days"}</p>
                  <p className="mt-1">
                    {isPt
                      ? "Iremos investigar a sua reclamação minuciosamente e fornecer uma resposta completa por escrito, normalmente dentro de 20 dias úteis. Se precisarmos de mais tempo devido à complexidade do caso, iremos informá-lo e dar um novo prazo."
                      : "We'll investigate your complaint thoroughly and provide a full written response, normally within 20 working days. If we need more time due to the complexity of the case, we'll let you know and give you a revised timeframe."}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Badge variant="outline" className="mt-0.5 flex-shrink-0">3</Badge>
                <div>
                  <p className="font-semibold text-foreground">{isPt ? "Confidencialidade" : "Confidentiality"}</p>
                  <p className="mt-1">
                    {isPt
                      ? "A sua reclamação será tratada com confidencialidade e não afetará de forma alguma a qualidade dos cuidados que continuará a receber."
                      : "Your complaint will be handled confidentially and will not affect the quality of care you continue to receive in any way."}
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* 3. Not satisfied / escalation */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <MessageSquareWarning className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold">{isPt ? "Se Não Ficar Satisfeito com a Resposta" : "If You're Not Satisfied with Our Response"}</h2>
            </div>
            <div className="bg-muted/30 rounded-lg p-5 space-y-4 text-sm text-muted-foreground">
              <div className="flex items-start gap-3">
                <Badge variant="outline" className="mt-0.5 flex-shrink-0">1</Badge>
                <div>
                  <p className="font-semibold text-foreground">{isPt ? "Revisão interna" : "Internal review"}</p>
                  <p className="mt-1">
                    {isPt
                      ? "Pode solicitar que a nossa resposta seja revista por um membro sénior da equipa clínica, que não esteve diretamente envolvido no caso original."
                      : "You can ask for our response to be reviewed by a senior member of the clinical team who was not directly involved in the original case."}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Badge variant="outline" className="mt-0.5 flex-shrink-0">2</Badge>
                <div>
                  <p className="font-semibold text-foreground">{isPt ? "Reguladores profissionais" : "Professional regulators"}</p>
                  <p className="mt-1">
                    {isPt
                      ? "Se a sua reclamação disser respeito à conduta profissional de um fisioterapeuta registado, pode também contactar o Health and Care Professions Council (HCPC) — hcpc-uk.org — ou o Chartered Society of Physiotherapy (CSP)."
                      : "If your complaint relates to the professional conduct of a registered physiotherapist, you may also contact the Health and Care Professions Council (HCPC) — hcpc-uk.org — or the Chartered Society of Physiotherapy (CSP)."}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Badge variant="outline" className="mt-0.5 flex-shrink-0">3</Badge>
                <div>
                  <p className="font-semibold text-foreground">{isPt ? "Proteção de dados" : "Data protection"}</p>
                  <p className="mt-1">
                    {isPt
                      ? "Se a sua reclamação for sobre como tratamos os seus dados pessoais, pode contactar o Information Commissioner's Office (ICO) — Tel: 0303 123 1113, Website: ico.org.uk. Consulte também a nossa "
                      : "If your complaint is about how we handle your personal data, you can contact the Information Commissioner's Office (ICO) — Tel: 0303 123 1113, Website: ico.org.uk. See also our "}
                    <Link href="/privacy" className="text-primary hover:underline">{isPt ? "Política de Privacidade" : "Privacy Policy"}</Link>.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Contact box */}
          <section className="bg-primary/5 border border-primary/20 rounded-lg p-5 space-y-3 text-sm">
            <p className="font-semibold text-foreground">{isPt ? "Contacte-nos sobre uma reclamação" : "Contact us about a complaint"}</p>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Mail className="h-4 w-4 flex-shrink-0" />
              <span>{isPt ? "WhatsApp (ícone flutuante no site)" : "WhatsApp (floating icon on the site)"}</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Phone className="h-4 w-4 flex-shrink-0" />
              <span>{isPt ? "Ou através do seu portal do paciente, secção Mensagens" : "Or via your patient portal, Messages section"}</span>
            </div>
          </section>

          {/* Related policies */}
          <div className="flex flex-wrap gap-4 text-sm pt-2">
            <Link href="/privacy" className="text-primary hover:underline">{isPt ? "Política de Privacidade" : "Privacy Policy"}</Link>
            <Link href="/terms" className="text-primary hover:underline">{isPt ? "Termos de Uso" : "Terms of Use"}</Link>
            <Link href="/cancellation-policy" className="text-primary hover:underline">{isPt ? "Política de Cancelamento" : "Cancellation Policy"}</Link>
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
