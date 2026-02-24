"use client";

import { Shield, Clock, AlertTriangle, CreditCard, Phone, Mail, ArrowLeft } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useLocale } from "@/hooks/use-locale";

export default function CancellationPolicyPage() {
  const { locale } = useLocale();
  const isPt = locale === "pt-BR";

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/dashboard">
          <Button variant="ghost" size="icon" className="shrink-0">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Shield className="h-6 w-6 text-primary" />
            {isPt ? "Política de Cancelamento e Reembolso" : "Cancellation & Refund Policy"}
          </h1>
          <p className="text-sm text-slate-500 mt-1">{isPt ? "Última atualização: Janeiro 2026" : "Last updated: January 2026"}</p>
        </div>
      </div>

      {/* Appointment Cancellations */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Clock className="h-5 w-5 text-amber-600" />
            {isPt ? "Cancelamento de Consultas" : "Appointment Cancellations"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-slate-700 leading-relaxed">
          <p>{isPt ? "Entendemos que planos mudam. Por favor, avise-nos com a maior antecedência possível caso precise cancelar ou reagendar uma consulta." : "We understand that plans change. Please give us as much notice as possible if you need to cancel or reschedule an appointment."}</p>
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 space-y-2">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
              <div>
                <p className="font-semibold text-amber-800">{isPt ? "Aviso de 24 Horas Necessário" : "24-Hour Notice Required"}</p>
                <p className="text-amber-700 text-xs">{isPt ? "Cancelamentos feitos com menos de 24 horas de antecedência podem incorrer em uma taxa de cancelamento de até 50% do custo da sessão." : "Cancellations made less than 24 hours before the appointment may incur a cancellation fee of up to 50% of the session cost."}</p>
              </div>
            </div>
          </div>
          <ul className="space-y-1.5 pl-4">
            <li className="flex items-start gap-2"><span className="text-primary font-bold mt-0.5">•</span> <strong>{isPt ? "48+ horas de antecedência:" : "48+ hours notice:"}</strong> {isPt ? "Reembolso total ou reagendamento gratuito" : "Full refund or free reschedule"}</li>
            <li className="flex items-start gap-2"><span className="text-primary font-bold mt-0.5">•</span> <strong>{isPt ? "24–48 horas de antecedência:" : "24–48 hours notice:"}</strong> {isPt ? "Reagendamento gratuito ou 50% de reembolso" : "Free reschedule or 50% refund"}</li>
            <li className="flex items-start gap-2"><span className="text-primary font-bold mt-0.5">•</span> <strong>{isPt ? "Menos de 24 horas:" : "Less than 24 hours:"}</strong> {isPt ? "Sem reembolso; taxa de 50% aplicada" : "No refund; 50% cancellation fee applies"}</li>
            <li className="flex items-start gap-2"><span className="text-primary font-bold mt-0.5">•</span> <strong>{isPt ? "Não comparecimento:" : "No-show:"}</strong> {isPt ? "Valor total da sessão cobrado" : "Full session fee charged"}</li>
          </ul>
          <p className="text-xs text-slate-500">{isPt ? "Exceções podem ser feitas em casos de emergência ou doença. Entre em contato para discutir." : "Exceptions may be made in cases of emergency or illness. Please contact us to discuss."}</p>
        </CardContent>
      </Card>

      {/* Treatment Package Cancellations */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <CreditCard className="h-5 w-5 text-blue-600" />
            {isPt ? "Cancelamento de Pacotes de Tratamento" : "Treatment Package Cancellations"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-slate-700 leading-relaxed">
          <p>{isPt ? "Os pacotes de tratamento são projetados para continuidade do cuidado. No entanto, entendemos que circunstâncias podem mudar." : "Treatment packages are designed for continuity of care. However, we understand circumstances may change."}</p>
          <ul className="space-y-1.5 pl-4">
            <li className="flex items-start gap-2"><span className="text-primary font-bold mt-0.5">•</span> <strong>{isPt ? "Antes da primeira sessão:" : "Before first session:"}</strong> {isPt ? "Reembolso total dentro de 14 dias da compra" : "Full refund within 14 days of purchase"}</li>
            <li className="flex items-start gap-2"><span className="text-primary font-bold mt-0.5">•</span> <strong>{isPt ? "Após início das sessões:" : "After sessions started:"}</strong> {isPt ? "Reembolso proporcional das sessões não utilizadas (menos taxa administrativa de £15)" : "Pro-rata refund for unused sessions (minus an admin fee of £15)"}</li>
            <li className="flex items-start gap-2"><span className="text-primary font-bold mt-0.5">•</span> <strong>{isPt ? "Pacotes expirados:" : "Expired packages:"}</strong> {isPt ? "Sessões não utilizadas dentro do período de validade não são reembolsáveis" : "Sessions not used within the package validity period are non-refundable"}</li>
          </ul>
          <p className="text-xs text-slate-500">{isPt ? "A validade do pacote é tipicamente de 3 meses a partir da data de compra, salvo indicação contrária." : "Package validity is typically 3 months from purchase date unless otherwise stated."}</p>
        </CardContent>
      </Card>

      {/* Membership Cancellations */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Shield className="h-5 w-5 text-violet-600" />
            {isPt ? "Assinaturas de Membros" : "Membership Subscriptions"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-slate-700 leading-relaxed">
          <p>{isPt ? "As assinaturas podem ser canceladas a qualquer momento pelo portal do paciente." : "Membership subscriptions can be cancelled at any time through your patient portal."}</p>
          <ul className="space-y-1.5 pl-4">
            <li className="flex items-start gap-2"><span className="text-primary font-bold mt-0.5">•</span> <strong>{isPt ? "Cancele a qualquer momento:" : "Cancel anytime:"}</strong> {isPt ? "Seu acesso continua até o final do período de cobrança atual" : "Your access continues until the end of the current billing period"}</li>
            <li className="flex items-start gap-2"><span className="text-primary font-bold mt-0.5">•</span> <strong>{isPt ? "Sem reembolsos parciais:" : "No partial refunds:"}</strong> {isPt ? "O período de cobrança atual não é reembolsável após iniciado" : "The current billing period is non-refundable once started"}</li>
            <li className="flex items-start gap-2"><span className="text-primary font-bold mt-0.5">•</span> <strong>{isPt ? "Reativação:" : "Reactivation:"}</strong> {isPt ? "Você pode reativar a qualquer momento pela página de Membros" : "You can resubscribe at any time from the Membership page"}</li>
            <li className="flex items-start gap-2"><span className="text-primary font-bold mt-0.5">•</span> <strong>{isPt ? "Planos gratuitos:" : "Free plans:"}</strong> {isPt ? "Podem ser desativados a qualquer momento com efeito imediato" : "Can be deactivated at any time with immediate effect"}</li>
          </ul>
          <div className="bg-violet-50 border border-violet-200 rounded-lg p-3 mt-2">
            <p className="text-xs text-violet-700">{isPt ? "Para cancelar sua assinatura, vá em " : "To cancel your membership, go to "}<Link href="/dashboard/membership" className="underline font-semibold text-violet-800 hover:no-underline">{isPt ? "Planos e Membros" : "Membership & Plans"}</Link>{isPt ? ' e clique em "Cancelar Assinatura".' : ' and click "Cancel Subscription".'}</p>
          </div>
        </CardContent>
      </Card>

      {/* How to Request a Cancellation */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Phone className="h-5 w-5 text-green-600" />
            {isPt ? "Como Solicitar um Cancelamento" : "How to Request a Cancellation"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-slate-700 leading-relaxed">
          <p>{isPt ? "Você pode solicitar um cancelamento pelos seguintes métodos:" : "You can request a cancellation through any of the following methods:"}</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="bg-slate-50 rounded-lg p-3 space-y-1">
              <p className="font-semibold text-slate-800 text-xs uppercase tracking-wide">{isPt ? "Portal do Paciente" : "Patient Portal"}</p>
              <p className="text-xs text-slate-600">{isPt ? "Faça login e gerencie suas consultas e assinaturas diretamente." : "Log in and manage your appointments and subscriptions directly."}</p>
            </div>
            <div className="bg-slate-50 rounded-lg p-3 space-y-1">
              <p className="font-semibold text-slate-800 text-xs uppercase tracking-wide">Email</p>
              <p className="text-xs text-slate-600 flex items-center gap-1"><Mail className="h-3 w-3" /> support@bpr.rehab</p>
            </div>
          </div>
          <p className="text-xs text-slate-500">{isPt ? "Todas as solicitações de cancelamento serão confirmadas em até 1 dia útil. Reembolsos são processados em 5–10 dias úteis para o método de pagamento original." : "All cancellation requests will be acknowledged within 1 working day. Refunds are processed within 5–10 working days to the original payment method."}</p>
        </CardContent>
      </Card>

      {/* Consumer Rights */}
      <Card className="border-slate-200 bg-slate-50">
        <CardContent className="p-4 text-xs text-slate-600 leading-relaxed">
          <p><strong>{isPt ? "Seus Direitos como Consumidor:" : "Your Consumer Rights:"}</strong> {isPt ? "De acordo com o UK Consumer Contracts Regulations 2013, você tem um período de 14 dias para desistência em compras online. Esta política de cancelamento opera em conjunto e não afeta seus direitos estatutários. Para dúvidas sobre seus direitos, visite " : "Under UK Consumer Contracts Regulations 2013, you have a 14-day cooling-off period for online purchases. This cancellation policy operates alongside and does not affect your statutory rights. For questions about your rights, visit "}<a href="https://www.citizensadvice.org.uk" target="_blank" rel="noopener noreferrer" className="underline text-primary hover:no-underline">Citizens Advice</a>.</p>
        </CardContent>
      </Card>
    </div>
  );
}
