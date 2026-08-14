"use client";

import Link from "next/link";
import Image from "next/image";
import { ArrowRight, LogIn, Check, Clock, ShieldCheck, Trophy, Target, HeartHandshake, Sparkles, Activity, Heart, Shield, Dumbbell, Zap, Quote, BookOpen, Instagram, UserPlus } from "lucide-react";
import { Logo } from "@/components/ui/logo";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/hooks/use-locale";
import type { StartPageSettings } from "@/lib/get-site-settings";

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M12.04 2c-5.46 0-9.9 4.44-9.9 9.9 0 1.75.46 3.45 1.32 4.95L2 22l5.3-1.38a9.87 9.87 0 0 0 4.73 1.2h.01c5.46 0 9.9-4.44 9.9-9.9 0-2.64-1.03-5.13-2.9-7A9.82 9.82 0 0 0 12.04 2zm0 1.8c2.16 0 4.19.84 5.72 2.37a8.03 8.03 0 0 1 2.37 5.72c0 4.46-3.63 8.09-8.1 8.09a8.1 8.1 0 0 1-4.12-1.13l-.3-.17-3.06.8.82-2.99-.2-.31a8.02 8.02 0 0 1-1.24-4.3c.01-4.46 3.64-8.08 8.11-8.08zm4.68 11.5c-.25-.13-1.47-.72-1.7-.8-.23-.09-.4-.13-.56.13-.17.25-.64.8-.79.97-.14.17-.29.19-.54.06-.25-.13-1.06-.39-2.01-1.24-.74-.66-1.24-1.48-1.39-1.73-.14-.25-.01-.39.11-.51.11-.11.25-.29.37-.43.13-.15.17-.25.25-.42.08-.17.04-.31-.02-.44-.06-.13-.56-1.35-.77-1.85-.2-.48-.4-.42-.56-.43l-.48-.01c-.17 0-.44.06-.67.31-.23.25-.88.86-.88 2.1 0 1.24.9 2.43 1.02 2.6.13.17 1.77 2.7 4.3 3.79.6.26 1.07.41 1.43.53.6.19 1.15.16 1.58.1.48-.07 1.47-.6 1.68-1.18.21-.58.21-1.07.14-1.18-.06-.11-.23-.17-.48-.29z" />
    </svg>
  );
}

const GHOST_DARK = "w-full bg-transparent border-white/25 text-background hover:bg-white/10 hover:text-background";

// next/image's optimizer needs an absolute URL here — relative/local paths
// fail ("not a valid image") behind Render's reverse proxy in production.
function absoluteImageUrl(url?: string | null): string | undefined {
  if (!url) return undefined;
  return url.startsWith("http") ? url : `https://bpr.clinic${url}`;
}

type BookSummary = { title: string; subtitle: string; coverImage: string | null };

export function StartLanding({ settings, isGift = false, book }: { settings: StartPageSettings; isGift?: boolean; book?: BookSummary }) {
  const { locale, setLocale } = useLocale();
  const isPt = locale === "pt-BR";
  const aboutImage = absoluteImageUrl(settings?.aboutImageUrl);
  const bookCover = absoluteImageUrl(book?.coverImage);
  const viaSuffix = isGift ? "?via=card" : "";
  // Editable from Admin → Settings → Contact Section — see lib/get-site-settings.ts.
  // Both sections stay hidden (as before) until filled in.
  const introVideoUrl = settings?.startIntroVideoUrl || "";
  const testimonials = settings?.startTestimonials || [];

  const waHref =
    settings?.whatsappEnabled && settings?.whatsappNumber
      ? `https://wa.me/${settings.whatsappNumber.replace(/\D/g, "")}${settings.whatsappMessage ? `?text=${encodeURIComponent(settings.whatsappMessage)}` : ""}`
      : null;

  const trustChips = [
    { icon: Clock, en: "15+ Years Clinical Experience", pt: "15+ Anos de Experiência Clínica" },
    { icon: Trophy, en: "Ex-Professional Footballer", pt: "Ex-Atleta de Futebol Profissional" },
    { icon: ShieldCheck, en: "Fully Insured", pt: "Totalmente Segurado" },
  ];

  const offerBullets = [
    { titleEn: "A full clinical assessment.", titlePt: "Uma avaliação clínica completa.", descEn: "We look at why the pain exists, not only where it hurts.", descPt: "Investigamos por que a dor existe, não só onde ela dói." },
    { titleEn: "A clear treatment plan.", titlePt: "Um plano de tratamento claro.", descEn: "You leave knowing exactly what's going on and what happens next.", descPt: "Você sai sabendo exatamente o que está acontecendo e quais são os próximos passos." },
    { titleEn: "No pressure, no session-counting.", titlePt: "Sem pressão, sem contar sessões.", descEn: "We deliver results, not appointments.", descPt: "Entregamos resultados, não consultas." },
  ];

  const steps = [
    isGift
      ? { titleEn: "Create your account to redeem", titlePt: "Crie a sua conta para resgatar", descEn: "Sign up in under 2 minutes. Your free assessment is linked to your account.", descPt: "Cadastre-se em menos de 2 minutos. A sua avaliação gratuita fica vinculada à sua conta." }
      : { titleEn: "Create your free account", titlePt: "Crie sua conta gratuita", descEn: "Sign up in under 2 minutes to access your private patient area.", descPt: "Cadastre-se em menos de 2 minutos para acessar sua área de paciente." },
    { titleEn: "Complete your screening", titlePt: "Preencha sua triagem", descEn: "Answer a short guided questionnaire so we understand your case before you arrive.", descPt: "Responda a um questionário guiado para entendermos o seu caso antes da sua chegada." },
    { titleEn: "Reviewed personally by Bruno", titlePt: "Revista pessoalmente pelo Bruno", descEn: "Your screening is reviewed by hand before your visit.", descPt: "A sua triagem é revista à mão antes da sua visita." },
    { titleEn: "Book your free assessment", titlePt: "Marque sua avaliação gratuita", descEn: "Choose a time that works and start your recovery.", descPt: "Escolha um horário e comece sua recuperação." },
  ];

  const conditions = [
    { icon: Activity, titleEn: "Sports Injuries", titlePt: "Lesões Esportivas", descEn: "Sprains, strains, ligament and tendon injuries — from weekend athletes to competitive sport.", descPt: "Entorses, distensões e lesões de ligamentos e tendões — de atletas de fim de semana a esporte competitivo." },
    { icon: Heart, titleEn: "Chronic Pain", titlePt: "Dor Crônica", descEn: "Back, neck and joint pain lasting months or years — when nothing else has worked.", descPt: "Dor nas costas, pescoço e articulações há meses ou anos — quando mais nada resultou." },
    { icon: Shield, titleEn: "Pre & Post-Surgery", titlePt: "Pré e Pós-Cirurgia", descEn: "Structured rehabilitation before and after orthopaedic surgery, for a faster, safer recovery.", descPt: "Reabilitação estruturada antes e depois de cirurgia ortopédica, para uma recuperação mais rápida e segura." },
    { icon: Dumbbell, titleEn: "Everyday Mobility", titlePt: "Mobilidade do Dia a Dia", descEn: "Stiffness, poor movement patterns and general aches that limit your daily life.", descPt: "Rigidez, padrões de movimento pobres e dores gerais que limitam o seu dia a dia." },
  ];

  const treatmentPills = [
    { en: "Aussie Current", pt: "Corrente Aussie" },
    { en: "Russian Current", pt: "Corrente Russa" },
    { en: "Microcurrent (MENS)", pt: "Microcorrente (MENS)" },
    { en: "Therapeutic Ultrasound", pt: "Ultrassom Terapêutico" },
    { en: "Exercise Therapy", pt: "Terapia por Exercícios" },
    { en: "Thermography & HRV", pt: "Termografia & HRV" },
  ];

  const diffs = [
    { icon: Target, titleEn: "No session limits", titlePt: "Sem limite de sessões", descEn: "You don't pay for hours — you invest in a complete result. Every appointment lasts as long as it needs.", descPt: "Você não paga por horas — investe num resultado completo. Cada consulta dura o tempo necessário." },
    { icon: Sparkles, titleEn: "Root cause, not symptoms", titlePt: "Causa-raiz, não sintomas", descEn: "Thermography and HRV to understand the source — then we treat it.", descPt: "Termografia e HRV para entender a origem — e depois tratá-la." },
    { icon: HeartHandshake, titleEn: "Whole-person approach", titlePt: "Cuidado do corpo inteiro", descEn: "When your recovery needs it, we integrate other specialists. Your body is a system — we treat it as one.", descPt: "Quando a sua recuperação exige, integramos outros especialistas. O seu corpo é um sistema — e nós o tratamos como tal." },
  ];

  return (
    <div className="public-site min-h-screen bg-background text-foreground pb-28">
      {/* Topbar */}
      <div className="max-w-2xl mx-auto flex items-center justify-between px-4 sm:px-6 pt-5 pb-2">
        <Logo logoUrl={settings?.logoUrl} darkLogoUrl={settings?.darkLogoUrl} size="xl" linkTo="/" priority />
        <div className="flex gap-1 bg-card border border-border rounded-full p-1">
          <button
            onClick={() => setLocale("en-GB")}
            className={`px-3 py-1.5 rounded-full text-xs font-bold transition-colors ${!isPt ? "bg-foreground text-background" : "text-muted-foreground"}`}
          >
            EN
          </button>
          <button
            onClick={() => setLocale("pt-BR")}
            className={`px-3 py-1.5 rounded-full text-xs font-bold transition-colors ${isPt ? "bg-foreground text-background" : "text-muted-foreground"}`}
          >
            PT
          </button>
        </div>
      </div>

      <main className="max-w-2xl mx-auto px-4 sm:px-6">
        {/* HERO */}
        <header id="assessment" className="relative overflow-hidden bg-foreground text-background rounded-[26px] px-6 sm:px-10 py-10 sm:py-14 mt-3 text-center shadow-xl scroll-mt-6">
          {/* Decorative glow illustration */}
          <div className="pointer-events-none absolute -top-20 -left-16 w-64 h-64 rounded-full bg-primary/25 blur-[80px]" />
          <div className="pointer-events-none absolute -bottom-24 -right-16 w-72 h-72 rounded-full bg-secondary/20 blur-[90px]" />

          <div className="relative z-10">
            {aboutImage && (
              <div className="relative w-24 h-24 sm:w-28 sm:h-28 mx-auto mb-5">
                <div className="absolute inset-0 rounded-full bg-primary/40 blur-xl scale-110" />
                <Image
                  src={aboutImage}
                  alt="Bruno"
                  fill
                  sizes="112px"
                  priority
                  className="relative rounded-full object-cover border-[3px] border-white/20 shadow-2xl"
                />
              </div>
            )}

            <span className="inline-flex items-center gap-2.5 bg-primary/15 border border-primary/30 rounded-full px-4 py-2 text-sm sm:text-base font-extrabold text-primary mb-5">
              <HeartHandshake className="h-4 w-4" />
              {isPt ? "Curar com Coração" : "Healing With Heart"}
            </span>

            <h1 className="font-sora text-3xl sm:text-4xl font-extrabold leading-tight mb-4">
              {isGift ? (
                isPt ? (
                  <>Este cartão vale uma avaliação completa com o Bruno — <span className="text-primary">grátis</span>.</>
                ) : (
                  <>This card is worth one full assessment with Bruno — <span className="text-primary">free</span>.</>
                )
              ) : isPt ? (
                <>Dor que não passa? <span className="text-primary">Descubra a causa real</span> — não só onde dói.</>
              ) : (
                <>Pain that won&apos;t go away? <span className="text-primary">Find the real cause</span> — not just where it hurts.</>
              )}
            </h1>
            <p className="text-background/75 text-base max-w-md mx-auto mb-6 leading-relaxed">
              {isGift
                ? (isPt
                    ? "Alguém achou que você deveria estar aqui. Uma avaliação clínica completa para encontrar a causa real da sua dor — sem custo e sem compromisso. Esta página resgata o seu cartão."
                    : "Someone thought you should be here. A full clinical assessment to find the real cause of your pain — with no cost and no obligation. This page redeems it.")
                : (isPt
                    ? "O meu propósito é simples: tratar cada pessoa da forma como gostaria de ter sido tratado durante a minha própria recuperação — com atenção verdadeira, não só protocolo. Como novo paciente, a sua primeira avaliação completa é totalmente gratuita."
                    : "My purpose is simple: treat every person the way I wish I'd been treated during my own recovery — with real attention, not just protocol. As a new patient, your first full assessment is completely free.")}
            </p>
            <div className="flex flex-wrap justify-center gap-2 mb-4">
              {trustChips.map((chip, i) => (
                <span key={i} className="inline-flex items-center gap-1.5 bg-white/[0.06] border border-white/[0.14] rounded-full px-3 py-1.5 text-[11px] font-semibold text-background/90">
                  <chip.icon className="h-3 w-3 text-primary" />
                  {isPt ? chip.pt : chip.en}
                </span>
              ))}
            </div>
            <p className="inline-flex items-center gap-1.5 text-[11px] font-bold text-primary mb-8">
              <Clock className="h-3.5 w-3.5" />
              {isPt ? "Vagas gratuitas limitadas a cada semana" : "Free assessment slots are limited each week"}
            </p>
            <div className="flex flex-col gap-2.5 max-w-sm mx-auto">
              <Button size="lg" variant="ba1Primary" className="w-full" asChild>
                <Link href={`/signup${viaSuffix}`}>
                  {isGift
                    ? (isPt ? "Resgatar Minha Avaliação" : "Redeem My Assessment")
                    : (isPt ? "Quero a Minha Avaliação Gratuita" : "Claim My Free Assessment")}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" className={GHOST_DARK} asChild>
                <Link href="/login">
                  <LogIn className="h-4 w-4" />
                  {isPt ? "Já é paciente? Entre" : "Already a patient? Log in"}
                </Link>
              </Button>
              <p className="text-[11px] text-background/50 mt-0.5">
                {isGift
                  ? (isPt ? "Um resgate por cartão · Novos pacientes · Leva 2 minutos" : "One redemption per card · New patients · Takes 2 minutes")
                  : (isPt ? "Grátis para novos pacientes · Leva 2 minutos para começar" : "Free for new patients · Takes 2 minutes to start")}
              </p>
              {/* The two lowest-friction actions someone who just met Bruno
                  wants: message him, or keep him in their phone. */}
              <div className="flex items-center justify-center gap-4 mt-1">
                {waHref && (
                  <a
                    href={waHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-background/70 hover:text-background transition-colors"
                  >
                    <WhatsAppIcon className="h-3.5 w-3.5 text-[#25D366]" />
                    {isPt ? "Falar no WhatsApp" : "Message on WhatsApp"}
                  </a>
                )}
                <a
                  href="/api/vcard"
                  className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-background/70 hover:text-background transition-colors"
                >
                  <UserPlus className="h-3.5 w-3.5 text-primary" />
                  {isPt ? "Salvar contato" : "Save my contact"}
                </a>
              </div>
            </div>
          </div>
        </header>

        {/* INTRO VIDEO */}
        {introVideoUrl && (
          <section className="mt-8">
            <div className="rounded-2xl overflow-hidden border border-border shadow-sm">
              <video
                controls
                playsInline
                poster={aboutImage}
                className="w-full aspect-video bg-black"
                src={introVideoUrl}
              />
            </div>
            <p className="text-center text-xs text-muted-foreground mt-2">
              {isPt ? "Uma mensagem rápida do Bruno" : "A quick message from Bruno"}
            </p>
          </section>
        )}

        {/* OFFER */}
        <section className="mt-12 text-center">
          <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-primary mb-2">
            {isGift
              ? (isPt ? "O que este cartão te dá" : "What this card gives you")
              : (isPt ? "O que recebes" : "What you get")}
          </p>
          <h2 className="font-sora text-2xl sm:text-3xl font-extrabold mb-6">{isPt ? "A sua primeira avaliação gratuita" : "Your free first assessment"}</h2>
          <div className="bg-accent border border-primary/15 rounded-3xl p-6 sm:p-8 text-left">
            <div className="text-center mb-5">
              <span className="font-sora text-3xl font-extrabold text-primary">{isPt ? "Grátis" : "Free"}</span>
              <p className="text-xs text-muted-foreground mt-1">{isPt ? "para novos pacientes, agendado através desta página" : "for new patients, booked through this page"}</p>
            </div>
            <ul className="space-y-3.5">
              {offerBullets.map((b, i) => (
                <li key={i} className="flex gap-3">
                  <Check className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-foreground/90">
                    <b className="text-foreground">{isPt ? b.titlePt : b.titleEn}</b> {isPt ? b.descPt : b.descEn}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* THE BOOK — a second, lighter path */}
        <section className="mt-14">
          <Link
            href="/beyond-pain"
            className="group flex gap-5 items-center rounded-3xl border-2 border-border bg-card ba1-card p-6 hover:border-primary/50 hover:shadow-lg transition-all"
          >
            {bookCover ? (
              <div className="relative w-16 h-24 rounded-lg overflow-hidden border border-border shrink-0 shadow-md">
                <Image src={bookCover} alt={book?.title || "Beyond Pain"} fill sizes="64px" className="object-cover" />
              </div>
            ) : (
              <span className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
                <BookOpen className="h-7 w-7 text-primary" />
              </span>
            )}
            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-primary mb-1">
                {isPt ? "Ainda não está pronto para marcar?" : "Not ready to book yet?"}
              </p>
              <h2 className="font-sora font-extrabold text-lg text-foreground mb-1">
                {isPt ? "Leia o meu livro grátis" : "Read my book free"}
              </h2>
              <p className="text-[13px] text-muted-foreground leading-snug">
                {isPt
                  ? `${book?.title || "Beyond Pain"} — leia o primeiro capítulo grátis.`
                  : `${book?.title || "Beyond Pain"} — read Chapter One free.`}
              </p>
              <span className="text-sm font-bold text-primary inline-flex items-center gap-1.5 mt-2">
                {isPt ? "Começar a ler" : "Start reading"} <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
              </span>
            </div>
          </Link>
        </section>

        {/* HOW IT WORKS */}
        <section className="mt-14">
          <div className="text-center mb-6">
            <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-primary mb-2">{isPt ? "Como funciona" : "How it works"}</p>
            <h2 className="font-sora text-2xl sm:text-3xl font-extrabold">{isPt ? "Quatro passos simples" : "Four simple steps"}</h2>
          </div>
          <div className="space-y-2.5">
            {steps.map((step, i) => (
              <div key={i} className="flex gap-4 items-start bg-card border border-border rounded-2xl p-4">
                <span className="flex-shrink-0 w-9 h-9 rounded-xl bg-accent border border-primary/20 text-primary font-sora font-extrabold flex items-center justify-center text-sm">
                  {i + 1}
                </span>
                <div>
                  <h3 className="font-bold text-sm mb-0.5">{isPt ? step.titlePt : step.titleEn}</h3>
                  <p className="text-muted-foreground text-[13px]">{isPt ? step.descPt : step.descEn}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* WHAT WE TREAT */}
        <section className="mt-14">
          <div className="text-center mb-6">
            <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-primary mb-2">{isPt ? "O que tratamos" : "What we treat"}</p>
            <h2 className="font-sora text-2xl sm:text-3xl font-extrabold">{isPt ? "Problemas reais, soluções reais" : "Real problems, real solutions"}</h2>
          </div>
          <div className="grid grid-cols-2 gap-2.5 mb-4">
            {conditions.map((c, i) => (
              <div key={i} className="bg-card border border-border rounded-2xl p-4">
                <c.icon className="h-5 w-5 text-primary mb-2" />
                <h3 className="font-bold text-sm mb-1">{isPt ? c.titlePt : c.titleEn}</h3>
                <p className="text-muted-foreground text-[12px] leading-snug">{isPt ? c.descPt : c.descEn}</p>
              </div>
            ))}
          </div>

          <p className="text-sm text-foreground/80 leading-relaxed mb-4">
            {isPt
              ? "Cada plano segue um protocolo de avaliação, tratamento e treino — focado em fazer você voltar às suas atividades normais, com acompanhamento constante ao longo de toda a recuperação."
              : "Every plan follows a protocol of assessment, treatment and training — focused on getting you back to your normal activities, with constant follow-up throughout your recovery."}
          </p>

          <div className="bg-accent border border-primary/20 rounded-2xl p-4 mb-3 flex gap-3">
            <span className="flex-shrink-0 w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center">
              <Zap className="h-5 w-5 text-primary" />
            </span>
            <div>
              <h3 className="font-bold text-sm mb-0.5">{isPt ? "Laserterapia MLS®" : "MLS® Laser Therapy"}</h3>
              <p className="text-muted-foreground text-[12px] leading-snug">
                {isPt
                  ? "Alívio rápido da dor e redução da inflamação, com reparação tecidual acelerada — tratamento não invasivo e sem desconforto."
                  : "Rapid pain relief and reduced inflammation, with accelerated tissue repair — non-invasive and pain-free treatment."}
              </p>
            </div>
          </div>

          <div className="bg-card border border-border rounded-2xl p-4">
            <p className="text-[11px] font-bold uppercase tracking-wider text-primary mb-2.5">{isPt ? "Também Utilizamos" : "We Also Use"}</p>
            <div className="flex flex-wrap gap-1.5">
              {treatmentPills.map((p, i) => (
                <span key={i} className="bg-background border border-border rounded-full px-2.5 py-1 text-[11px] font-semibold text-foreground/80">
                  {isPt ? p.pt : p.en}
                </span>
              ))}
            </div>
          </div>
        </section>

        {/* DIFFERENTIATORS */}
        <section className="mt-14">
          <div className="text-center mb-6">
            <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-primary mb-2">{isPt ? "Porque a BPR é diferente" : "Why BPR is different"}</p>
            <h2 className="font-sora text-2xl sm:text-3xl font-extrabold">{isPt ? "Um cuidado que poucas clínicas oferecem" : "Care few clinics offer"}</h2>
          </div>
          <div className="space-y-2.5">
            {diffs.map((d, i) => (
              <div key={i} className="bg-card border border-border rounded-2xl p-4">
                <h3 className="font-bold text-sm mb-1 flex items-center gap-2">
                  <d.icon className="h-4 w-4 text-primary" />
                  {isPt ? d.titlePt : d.titleEn}
                </h3>
                <p className="text-muted-foreground text-[13px]">{isPt ? d.descPt : d.descEn}</p>
              </div>
            ))}
          </div>
        </section>

        {/* FOUNDER */}
        <section className="mt-14">
          <div className="bg-card border border-border rounded-3xl p-6 sm:p-8">
            <p className="text-[15px] leading-relaxed text-foreground/90">
              {isPt ? (
                <>&ldquo;Antes de me tornar especialista em reabilitação, fui atleta de futebol profissional durante mais de uma década — no Brasil, na Alemanha e na Suécia. Depois de <b className="text-foreground">três cirurgias importantes ao joelho</b>, conheço na pele o lado físico e emocional da recuperação. É por isso que cuido de cada paciente como gostaria de ter sido cuidado.&rdquo;</>
              ) : (
                <>&ldquo;Before becoming a rehabilitation specialist, I was a professional footballer for over a decade — in Brazil, Germany and Sweden. After <b className="text-foreground">three major knee surgeries</b>, I know the physical and emotional side of recovery firsthand. That&apos;s why I care for every patient the way I wished I&apos;d been cared for.&rdquo;</>
              )}
            </p>
            <p className="text-primary text-xs font-bold mt-4">
              {isPt ? "É isto que significa Curar com Coração, para nós." : "This is what Healing With Heart means to us."}
            </p>
            <div className="flex items-center gap-3 mt-5 pt-5 border-t border-border">
              {aboutImage ? (
                <div className="relative w-11 h-11 rounded-full flex-shrink-0 overflow-hidden">
                  <Image src={aboutImage} alt="Bruno" fill sizes="44px" className="object-cover" />
                </div>
              ) : (
                <span className="w-11 h-11 rounded-full bg-primary text-white font-sora font-extrabold flex items-center justify-center flex-shrink-0">B</span>
              )}
              <div>
                <p className="font-bold text-sm">Bruno</p>
                <p className="text-muted-foreground text-xs">{isPt ? "Especialista" : "Specialist"}</p>
              </div>
            </div>
          </div>
        </section>

        {/* TESTIMONIALS */}
        {testimonials.length > 0 && (
          <section className="mt-14">
            <div className="text-center mb-6">
              <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-primary mb-2">{isPt ? "O que dizem os pacientes" : "What patients say"}</p>
              <h2 className="font-sora text-2xl sm:text-3xl font-extrabold">{isPt ? "Resultados reais, pessoas reais" : "Real results, real people"}</h2>
            </div>
            <div className="space-y-2.5">
              {testimonials.map((t, i) => (
                <div key={i} className="bg-card border border-border rounded-2xl p-5">
                  <Quote className="h-5 w-5 text-primary/40 mb-2" />
                  <p className="text-sm text-foreground/90 italic leading-relaxed mb-3">
                    &ldquo;{isPt ? t.quotePt : t.quoteEn}&rdquo;
                  </p>
                  <p className="text-xs font-bold text-foreground">{isPt ? t.namePt : t.nameEn}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* FINAL CTA */}
        <section className="mt-14">
          <div className="bg-foreground text-background rounded-[26px] px-6 sm:px-8 py-9 text-center">
            <span className="inline-flex items-center gap-2 text-[11px] font-bold text-primary bg-primary/15 border border-primary/25 rounded-full px-3 py-1.5 mb-4">
              {isPt ? "Apenas para novos pacientes" : "For new patients only"}
            </span>
            <h2 className="font-sora text-2xl sm:text-3xl font-extrabold mb-3">
              {isGift
                ? (isPt ? "Não deixe este cartão se perder" : "Don't let this card go to waste")
                : (isPt ? "Pronto para começar?" : "Ready to start?")}
            </h2>
            <p className="text-background/70 text-sm max-w-sm mx-auto mb-7">
              {isPt
                ? "Crie sua conta, preencha sua triagem e marque sua avaliação gratuita hoje."
                : "Create your account, complete your screening, and book your free assessment today."}
            </p>
            <div className="flex flex-col gap-2.5 max-w-sm mx-auto">
              <Button size="lg" variant="ba1Primary" className="w-full" asChild>
                <Link href={`/signup${viaSuffix}`}>
                  {isGift
                    ? (isPt ? "Resgatar Minha Avaliação" : "Redeem My Assessment")
                    : (isPt ? "Quero a Minha Avaliação Gratuita" : "Claim My Free Assessment")}
                </Link>
              </Button>
              <Button size="lg" variant="outline" className={GHOST_DARK} asChild>
                <Link href="/login">{isPt ? "Entrar na minha conta" : "Log in to your account"}</Link>
              </Button>
              {waHref && (
                <a
                  href={waHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full flex items-center justify-center gap-2 bg-background text-foreground rounded-lg py-3 text-sm font-bold hover:opacity-90 transition-opacity"
                >
                  <WhatsAppIcon className="h-4 w-4 text-[#25D366]" />
                  {isPt ? "Prefere falar? Mande-nos uma mensagem no WhatsApp" : "Prefer to chat? Message us on WhatsApp"}
                </a>
              )}
            </div>
          </div>
        </section>

        {/* FOOTER */}
        <footer className="mt-10 pb-4 text-center border-t border-border pt-8">
          <div className="flex justify-center mb-4">
            <Logo logoUrl={settings?.logoUrl} darkLogoUrl={settings?.darkLogoUrl} size="xl" linkTo="/" />
          </div>
          <p className="text-muted-foreground text-xs">BPR Physical Rehabilitation · Ipswich, Suffolk, {isPt ? "Reino Unido" : "UK"}</p>
          <p className="text-primary text-[11px] font-bold mt-1">{isPt ? "Curar com Coração" : "Healing With Heart"}</p>
          <div className="flex items-center justify-center gap-3 mt-4">
            <a
              href="https://www.instagram.com/bprehabilitation/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 bg-card border border-border rounded-full px-3.5 py-2 text-xs font-semibold text-foreground/80 hover:border-primary/50 transition-colors"
            >
              <Instagram className="h-3.5 w-3.5 text-primary" />
              {isPt ? "Seguir no Instagram" : "Follow on Instagram"}
            </a>
            {waHref && (
              <a
                href={waHref}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 bg-card border border-border rounded-full px-3.5 py-2 text-xs font-semibold text-foreground/80 hover:border-primary/50 transition-colors"
              >
                <WhatsAppIcon className="h-3.5 w-3.5 text-[#25D366]" />
                WhatsApp
              </a>
            )}
            <a
              href="/api/vcard"
              className="inline-flex items-center gap-1.5 bg-card border border-border rounded-full px-3.5 py-2 text-xs font-semibold text-foreground/80 hover:border-primary/50 transition-colors"
            >
              <UserPlus className="h-3.5 w-3.5 text-primary" />
              {isPt ? "Salvar contato" : "Save contact"}
            </a>
          </div>
          <Link href="/" className="text-muted-foreground text-xs underline mt-4 inline-block">bpr.clinic</Link>
        </footer>
      </main>

      {/* STICKY MOBILE CTA */}
      <div className="fixed left-0 right-0 bottom-0 z-50 px-4 pb-4 pt-3 bg-gradient-to-t from-background via-background/95 to-transparent">
        <div className="max-w-2xl mx-auto flex gap-2">
          {/* min-w-0 + shorter labels: the long PT label refused to shrink and
              pushed the WhatsApp square off the 390px screen. */}
          <Button size="lg" variant="ba1Primary" className="flex-1 min-w-0 shadow-xl" asChild>
            <Link href={`/signup${viaSuffix}`} className="truncate">
              {isGift
                ? (isPt ? "Resgatar a minha avaliação" : "Redeem my assessment")
                : (isPt ? "Quero a minha avaliação gratuita" : "Claim my free assessment")}
            </Link>
          </Button>
          {waHref && (
            <a
              href={waHref}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="WhatsApp"
              className="shrink-0 w-12 h-12 self-center rounded-xl bg-[#25D366] text-white shadow-xl flex items-center justify-center hover:opacity-90 transition-opacity"
            >
              <WhatsAppIcon className="h-6 w-6" />
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
