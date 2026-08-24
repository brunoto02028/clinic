"use client";

// Home "Investment & FAQ" section (activity 17, C4 + T1). Pricing figures are
// INDICATIVE estimates based on 2025 UK regional physio averages, positioned for
// a premium tech-enabled clinic — Bruno should confirm/adjust the numbers. The
// FAQ answers are drafted from the site's own positioning; the insurance line is
// deliberately non-committal until confirmed.

import { HelpCircle, Home, ClipboardCheck, HeartPulse } from "lucide-react";

export function HomePricingFaq({ isPt = false }: { isPt?: boolean }) {
  const invest = [
    {
      icon: ClipboardCheck,
      title: isPt ? "Avaliação & Plano Inicial" : "Initial Assessment & Plan",
      price: isPt ? "a partir de £95" : "from £95",
      body: isPt
        ? "Avaliação completa de 60–90 min com termografia e VFC, mais o seu plano de recuperação personalizado."
        : "A full 60–90 min evaluation with thermography and HRV, plus your personalised recovery plan.",
    },
    {
      icon: HeartPulse,
      title: isPt ? "O Seu Programa" : "Your Treatment Programme",
      price: isPt ? "sob orçamento" : "tailored — quoted",
      body: isPt
        ? "Não vendemos sessões. Você recebe um plano claro e um orçamento transparente para a sua recuperação completa."
        : "We don't sell sessions. You get a clear plan and a transparent quote for your complete recovery.",
    },
    {
      icon: Home,
      title: isPt ? "Atendimento ao Domicílio" : "Home Visits",
      price: isPt ? "sob pedido" : "on request",
      body: isPt
        ? "Prefere ser tratado em casa? Vamos até si em Ipswich e Suffolk."
        : "Prefer to be treated at home? We come to you across Ipswich & Suffolk.",
    },
  ];

  const faqs = [
    {
      q: isPt ? "Preciso de encaminhamento médico?" : "Do I need a GP referral?",
      a: isPt
        ? "Não. Como clínica privada, você pode marcar diretamente — o auto-encaminhamento é bem-vindo."
        : "No. As a private clinic, you can book directly — self-referral is welcome.",
    },
    {
      q: isPt ? "Quantas sessões vou precisar?" : "How many sessions will I need?",
      a: isPt
        ? "Não contamos sessões. O seu programa é adaptado à sua condição e aos seus objetivos — você recebe um plano claro na avaliação."
        : "We don't count sessions. Your programme is tailored to your condition and goals — you'll get a clear plan at your assessment.",
    },
    {
      q: isPt ? "Fazem atendimento ao domicílio?" : "Do you offer home visits?",
      a: isPt
        ? "Sim — atendimento na clínica em Ipswich ou visita ao domicílio em Suffolk."
        : "Yes — in-clinic in Ipswich, or a home visit across Suffolk.",
    },
    {
      q: isPt ? "Que condições tratam?" : "What do you treat?",
      a: isPt
        ? "Lesões desportivas, reabilitação pós-cirúrgica, dor lombar/cervical/no joelho, dor crónica e recuperação de performance."
        : "Sports injuries, post-surgery rehabilitation, back/neck/knee pain, chronic pain, and performance recovery.",
    },
    {
      q: isPt ? "Aceitam seguro de saúde?" : "Do you accept insurance?",
      a: isPt
        ? "Fale connosco para vermos as opções de pagamento particular e de seguro."
        : "Contact us to discuss self-pay and insurance options.",
    },
  ];

  return (
    <section className="py-16 sm:py-20 lg:py-24 bg-[#F5F4F1]">
      <div className="max-w-5xl mx-auto px-4">
        {/* Investment */}
        <div className="text-center mb-10">
          <p className="text-xs font-bold uppercase tracking-widest text-[#4F7361] mb-2">
            {isPt ? "Investimento" : "Investment"}
          </p>
          <h2 className="font-sora text-2xl sm:text-3xl font-bold text-foreground tracking-tight">
            {isPt ? "Transparente, sem contar sessões" : "Transparent, with no session counting"}
          </h2>
          <p className="text-muted-foreground mt-3 max-w-2xl mx-auto">
            {isPt
              ? "Você investe num resultado completo — não em horas avulsas."
              : "You invest in a complete result — not in individual hours."}
          </p>
        </div>

        <div className="grid sm:grid-cols-3 gap-5 mb-4">
          {invest.map((c) => (
            <div key={c.title} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 flex flex-col">
              <div className="w-11 h-11 rounded-xl bg-[#4F7361]/10 flex items-center justify-center mb-4">
                <c.icon className="h-5 w-5 text-[#4F7361]" />
              </div>
              <h3 className="font-sora font-bold text-foreground">{c.title}</h3>
              <p className="text-[#4F7361] font-semibold mt-1">{c.price}</p>
              <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{c.body}</p>
            </div>
          ))}
        </div>
        <p className="text-center text-xs text-muted-foreground">
          {isPt
            ? "Valores indicativos, confirmados na sua avaliação."
            : "Prices are indicative and confirmed at your assessment."}
        </p>

        {/* FAQ */}
        <div className="mt-16">
          <div className="text-center mb-8">
            <p className="text-xs font-bold uppercase tracking-widest text-[#4F7361] mb-2 flex items-center justify-center gap-1.5">
              <HelpCircle className="h-4 w-4" /> {isPt ? "Perguntas Frequentes" : "Frequently Asked"}
            </p>
            <h2 className="font-sora text-2xl sm:text-3xl font-bold text-foreground tracking-tight">
              {isPt ? "Antes de começar" : "Before you begin"}
            </h2>
          </div>
          <div className="max-w-3xl mx-auto divide-y divide-slate-200 bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            {faqs.map((f) => (
              <details key={f.q} className="group">
                <summary className="flex items-center justify-between gap-4 cursor-pointer list-none px-6 py-4 hover:bg-slate-50 transition-colors">
                  <span className="font-medium text-foreground">{f.q}</span>
                  <span className="text-[#4F7361] text-xl leading-none transition-transform group-open:rotate-45">+</span>
                </summary>
                <p className="px-6 pb-5 -mt-1 text-sm text-muted-foreground leading-relaxed">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
