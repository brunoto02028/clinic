"use client";

import { useLocale } from "@/hooks/use-locale";
import { t as i18nT } from "@/lib/i18n";
import Link from "next/link";
import {
  CheckCircle2,
  ClipboardList,
  Calendar,
  User,
  Shield,
  CreditCard,
  ArrowRight,
  BookOpen,
  Heart,
  Clock,
  AlertTriangle,
  Sparkles,
  FileText,
  Dumbbell,
  MessageCircle,
  Star,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function PatientGuidePage() {
  const { locale } = useLocale();
  const isPt = locale === "pt-BR";

  const steps = [
    {
      num: 1,
      icon: User,
      color: "from-blue-500 to-cyan-500",
      bg: "bg-blue-500/10",
      border: "border-blue-500/20",
      title: isPt ? "Complete o Seu Perfil" : "Complete Your Profile",
      desc: isPt
        ? "Adicione a sua data de nascimento, endere\u00e7o e n\u00famero de telefone. Isto ajuda o terapeuta a preparar o melhor plano de tratamento."
        : "Add your date of birth, address and phone number. This helps your therapist prepare the best treatment plan for you.",
      action: isPt ? "Ir para Perfil" : "Go to Profile",
      href: "/dashboard/profile",
      details: isPt
        ? ["Nome completo", "Data de nascimento", "Endere\u00e7o (Postcode)", "Telefone de contato"]
        : ["Full name", "Date of birth", "Address (Postcode)", "Contact phone number"],
    },
    {
      num: 2,
      icon: Shield,
      color: "from-red-500 to-orange-500",
      bg: "bg-red-500/10",
      border: "border-red-500/20",
      title: isPt ? "Preencha a Triagem M\u00e9dica" : "Complete Medical Screening",
      desc: isPt
        ? "Este formul\u00e1rio \u00e9 essencial para a sua seguran\u00e7a. Inclui quest\u00f5es sobre a sua sa\u00fade, dor, hist\u00f3rico m\u00e9dico e consentimento. Demora apenas 5\u201310 minutos."
        : "This form is essential for your safety. It includes questions about your health, pain, medical history and consent. It only takes 5\u201310 minutes.",
      action: isPt ? "Preencher Triagem" : "Fill in Screening",
      href: "/dashboard/screening",
      details: isPt
        ? [
            "Quest\u00f5es de bandeira vermelha (seguran\u00e7a)",
            "Queixa principal e dor",
            "Impacto funcional no dia-a-dia",
            "Hist\u00f3rico de sa\u00fade e medica\u00e7\u00f5es",
            "Estilo de vida e tratamentos anteriores",
            "Objetivos do tratamento",
            "Consentimento (GDPR UK)",
          ]
        : [
            "Red flag safety questions",
            "Chief complaint & pain description",
            "Functional impact on daily life",
            "Health history & medications",
            "Lifestyle & previous treatments",
            "Treatment goals",
            "Consent (UK GDPR)",
          ],
    },
    {
      num: 3,
      icon: Calendar,
      color: "from-emerald-500 to-teal-500",
      bg: "bg-emerald-500/10",
      border: "border-emerald-500/20",
      title: isPt ? "Agende a Sua Consulta" : "Book Your Appointment",
      desc: isPt
        ? "Escolha um hor\u00e1rio que lhe convier. A triagem m\u00e9dica deve ser preenchida antes da consulta para que o terapeuta possa preparar o seu plano."
        : "Choose a time that suits you. Medical screening should be completed before your appointment so your therapist can prepare your plan.",
      action: isPt ? "Ver Consultas" : "View Appointments",
      href: "/dashboard/appointments",
      details: isPt
        ? ["Selecione data e hora", "Escolha o tipo de tratamento", "Pagamento online ou presencial", "Confirma\u00e7\u00e3o por email"]
        : ["Select date & time", "Choose treatment type", "Pay online or in person", "Confirmation by email"],
    },
    {
      num: 4,
      icon: Heart,
      color: "from-purple-500 to-pink-500",
      bg: "bg-purple-500/10",
      border: "border-purple-500/20",
      title: isPt ? "Chegue \u00e0 Consulta Preparado" : "Arrive Prepared",
      desc: isPt
        ? "Chegue 5 minutos antes da hora marcada. Traga roupa confort\u00e1vel e quaisquer exames ou relat\u00f3rios m\u00e9dicos relevantes."
        : "Arrive 5 minutes before your appointment time. Bring comfortable clothing and any relevant scans or medical reports.",
      action: "",
      href: "",
      details: isPt
        ? ["Roupa confort\u00e1vel", "Chegar 5 min mais cedo", "Documentos m\u00e9dicos relevantes", "Lista de medica\u00e7\u00f5es atuais"]
        : ["Comfortable clothing", "Arrive 5 min early", "Relevant medical documents", "List of current medications"],
    },
  ];

  const features = [
    {
      icon: Dumbbell,
      title: isPt ? "Exerc\u00edcios Personalizados" : "Personalised Exercises",
      desc: isPt ? "Receba planos de exerc\u00edcios em v\u00eddeo adaptados ao seu tratamento." : "Receive video exercise plans tailored to your treatment.",
    },
    {
      icon: FileText,
      title: isPt ? "Notas Cl\u00ednicas" : "Clinical Notes",
      desc: isPt ? "Acesse as notas do terapeuta ap\u00f3s cada sess\u00e3o." : "Access your therapist's notes after each session.",
    },
    {
      icon: Star,
      title: isPt ? "Jornada de Recupera\u00e7\u00e3o" : "Recovery Journey",
      desc: isPt ? "Acompanhe o seu progresso e conquiste badges." : "Track your progress and earn achievement badges.",
    },
    {
      icon: MessageCircle,
      title: isPt ? "Comunica\u00e7\u00e3o Direta" : "Direct Communication",
      desc: isPt ? "Receba lembretes e atualiza\u00e7\u00f5es por email." : "Receive reminders and updates by email.",
    },
  ];

  const faqs = [
    {
      q: isPt ? "Porque preciso preencher a triagem m\u00e9dica?" : "Why do I need to fill in the medical screening?",
      a: isPt
        ? "A triagem m\u00e9dica \u00e9 obrigat\u00f3ria por lei (UK GDPR) e essencial para a sua seguran\u00e7a. Permite ao terapeuta identificar condi\u00e7\u00f5es que possam afetar o tratamento e preparar um plano personalizado."
        : "Medical screening is required by law (UK GDPR) and essential for your safety. It allows your therapist to identify conditions that may affect treatment and prepare a personalised plan.",
    },
    {
      q: isPt ? "Posso alterar as minhas respostas depois?" : "Can I change my answers later?",
      a: isPt
        ? "Sim, pode atualizar a triagem a qualquer momento atrav\u00e9s do seu dashboard. Recomendamos manter as informa\u00e7\u00f5es atualizadas."
        : "Yes, you can update your screening at any time through your dashboard. We recommend keeping your information up to date.",
    },
    {
      q: isPt ? "Quanto tempo demora a triagem?" : "How long does the screening take?",
      a: isPt ? "Cerca de 5 a 10 minutos. Pode guardar o progresso e continuar mais tarde." : "About 5 to 10 minutes. You can save your progress and continue later.",
    },
    {
      q: isPt ? "O que acontece se n\u00e3o preencher a triagem?" : "What happens if I don't complete the screening?",
      a: isPt
        ? "O seu terapeuta n\u00e3o ter\u00e1 as informa\u00e7\u00f5es necess\u00e1rias para preparar o tratamento, o que pode resultar em reagendamento da consulta."
        : "Your therapist won't have the information needed to prepare your treatment, which may result in your appointment being rescheduled.",
    },
    {
      q: isPt ? "Pol\u00edtica de cancelamento?" : "Cancellation policy?",
      a: isPt
        ? "Cancelamento com mais de 24h: reembolso total. Cancelamento com menos de 24h: 50% cobrado. N\u00e3o comparecimento: cobran\u00e7a total."
        : "Cancel more than 24h before: full refund. Cancel less than 24h before: 50% charge. No-show: full charge.",
    },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12">
      {/* Hero */}
      <div className="text-center space-y-3">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-teal-400 flex items-center justify-center mx-auto shadow-lg">
          <BookOpen className="h-8 w-8 text-white" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
          {isPt ? "Bem-vindo ao BPR" : "Welcome to BPR"}
        </h1>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          {isPt
            ? "Este guia explica como funciona o sistema, o que precisa de preencher antes da sua consulta e como tirar o m\u00e1ximo proveito do seu portal de paciente."
            : "This guide explains how the system works, what you need to complete before your appointment, and how to get the most out of your patient portal."}
        </p>
      </div>

      {/* Important Notice */}
      <Card className="border-amber-500/30 bg-amber-500/5">
        <CardContent className="p-4 sm:p-5">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-amber-500/15 flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
            </div>
            <div>
              <h3 className="font-semibold text-amber-400 text-sm">
                {isPt ? "Importante: Antes da Sua Consulta" : "Important: Before Your Appointment"}
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                {isPt
                  ? "Para que o seu terapeuta possa preparar o melhor tratamento, complete os passos 1 e 2 (Perfil + Triagem M\u00e9dica) pelo menos 24 horas antes da consulta. Sem estas informa\u00e7\u00f5es, a consulta pode ter de ser reagendada."
                  : "So your therapist can prepare the best treatment, complete steps 1 and 2 (Profile + Medical Screening) at least 24 hours before your appointment. Without this information, your appointment may need to be rescheduled."}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Steps */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
          <ClipboardList className="h-5 w-5 text-primary" />
          {isPt ? "Passos para a Sua Consulta" : "Steps to Your Appointment"}
        </h2>

        <div className="space-y-4">
          {steps.map((step) => (
            <Card key={step.num} className={`${step.border} overflow-hidden`}>
              <CardContent className="p-0">
                <div className="flex flex-col sm:flex-row">
                  {/* Step number */}
                  <div className={`bg-gradient-to-br ${step.color} w-full sm:w-16 flex items-center justify-center py-3 sm:py-0`}>
                    <span className="text-2xl font-black text-white">{step.num}</span>
                  </div>
                  {/* Content */}
                  <div className="flex-1 p-4 sm:p-5">
                    <div className="flex items-start gap-3">
                      <div className={`w-10 h-10 rounded-xl ${step.bg} flex items-center justify-center flex-shrink-0 hidden sm:flex`}>
                        <step.icon className="h-5 w-5 text-foreground" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-bold text-foreground">{step.title}</h3>
                        <p className="text-sm text-muted-foreground mt-1">{step.desc}</p>
                        {/* Checklist */}
                        <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                          {step.details.map((d, i) => (
                            <div key={i} className="flex items-center gap-2 text-xs text-muted-foreground">
                              <CheckCircle2 className="h-3.5 w-3.5 text-primary flex-shrink-0" />
                              <span>{d}</span>
                            </div>
                          ))}
                        </div>
                        {step.action && step.href && (
                          <Button asChild size="sm" className="mt-4 gap-1">
                            <Link href={step.href}>
                              {step.action} <ArrowRight className="h-3.5 w-3.5" />
                            </Link>
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Timeline */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="p-5">
          <h3 className="font-bold text-foreground flex items-center gap-2 mb-4">
            <Clock className="h-5 w-5 text-primary" />
            {isPt ? "Cronograma Recomendado" : "Recommended Timeline"}
          </h3>
          <div className="space-y-3">
            {[
              { time: isPt ? "Assim que criar conta" : "As soon as you sign up", task: isPt ? "Complete o perfil e a triagem m\u00e9dica" : "Complete profile and medical screening", color: "bg-blue-500" },
              { time: isPt ? "48h antes da consulta" : "48h before appointment", task: isPt ? "Verifique que tudo est\u00e1 preenchido" : "Check everything is filled in", color: "bg-amber-500" },
              { time: isPt ? "24h antes" : "24h before", task: isPt ? "Prazo final para triagem (evitar reagendamento)" : "Screening deadline (avoid rescheduling)", color: "bg-red-500" },
              { time: isPt ? "Dia da consulta" : "Appointment day", task: isPt ? "Chegue 5 min mais cedo, roupa confort\u00e1vel" : "Arrive 5 min early, comfortable clothing", color: "bg-emerald-500" },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full ${item.color} flex-shrink-0`} />
                <div className="flex-1 flex flex-col sm:flex-row sm:items-center gap-0.5 sm:gap-3">
                  <span className="text-xs font-bold text-foreground whitespace-nowrap min-w-[160px]">{item.time}</span>
                  <span className="text-xs text-muted-foreground">{item.task}</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Features */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          {isPt ? "O Que Pode Fazer no Portal" : "What You Can Do in the Portal"}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {features.map((f, i) => (
            <Card key={i}>
              <CardContent className="p-4 flex items-start gap-3">
                <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <f.icon className="h-4.5 w-4.5 text-primary" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-foreground">{f.title}</h4>
                  <p className="text-xs text-muted-foreground mt-0.5">{f.desc}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* FAQ */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
          <MessageCircle className="h-5 w-5 text-primary" />
          {isPt ? "Perguntas Frequentes" : "Frequently Asked Questions"}
        </h2>
        <div className="space-y-3">
          {faqs.map((faq, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <h4 className="text-sm font-semibold text-foreground">{faq.q}</h4>
                <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">{faq.a}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* CTA */}
      <Card className="border-primary/30 bg-gradient-to-r from-primary/10 to-teal-500/10">
        <CardContent className="p-6 text-center space-y-3">
          <h3 className="font-bold text-foreground text-lg">
            {isPt ? "Pronto para Come\u00e7ar?" : "Ready to Get Started?"}
          </h3>
          <p className="text-sm text-muted-foreground">
            {isPt
              ? "Complete o seu perfil e triagem para que possamos oferecer o melhor cuidado poss\u00edvel."
              : "Complete your profile and screening so we can offer you the best possible care."}
          </p>
          <div className="flex items-center justify-center gap-3 flex-wrap">
            <Button asChild>
              <Link href="/dashboard/profile">{isPt ? "Completar Perfil" : "Complete Profile"} <ArrowRight className="h-4 w-4 ml-1" /></Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/dashboard/screening">{isPt ? "Preencher Triagem" : "Fill Screening"} <ArrowRight className="h-4 w-4 ml-1" /></Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
