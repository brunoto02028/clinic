"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Cpu,
  HeartPulse,
  Moon,
  Zap,
  Brain,
  Activity,
  Shield,
  Target,
  CheckCircle2,
  BarChart3,
  Clock,
  Sparkles,
  Flame,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { useLocale } from "@/hooks/use-locale";

const L = (en: string, pt: string, isPt: boolean) => isPt ? pt : en;

export default function BiohackingPage() {
  const [mounted, setMounted] = useState(false);
  const [settings, setSettings] = useState<any>(null);
  const { locale } = useLocale();
  const isPt = locale === "pt-BR";

  useEffect(() => {
    setMounted(true);
    fetch("/api/settings").then(r => r.ok ? r.json() : null).then(d => d && setSettings(d)).catch(() => {});
  }, []);

  if (!mounted) return null;

  const pillars = [
    {
      icon: Cpu,
      title: L("Biohacking & Performance", "Biohacking e Performance", isPt),
      desc: L(
        "IPHM-certified protocols using data, technology, and lifestyle optimisation to unlock your body's full potential.",
        "Protocolos certificados IPHM usando dados, tecnologia e otimização de estilo de vida para desbloquear o potencial total do seu corpo.",
        isPt
      ),
      color: "bg-violet-50 text-violet-600",
      link: "/services/biohacking-performance",
    },
    {
      icon: HeartPulse,
      title: L("HRV & Recovery Monitoring", "Monitoramento de HRV e Recuperação", isPt),
      desc: L(
        "Heart Rate Variability tracking to measure nervous system recovery and optimise rehabilitation progression.",
        "Rastreamento de Variabilidade da Frequência Cardíaca para medir a recuperação do sistema nervoso e otimizar a progressão da reabilitação.",
        isPt
      ),
      color: "bg-pink-50 text-pink-600",
      link: "/services/hrv-recovery-monitoring",
    },
    {
      icon: Moon,
      title: L("Sleep & Longevity Optimisation", "Optimização do Sono e Longevidade", isPt),
      desc: L(
        "Evidence-based sleep protocols and circadian rhythm optimisation to maximise recovery and healthy ageing.",
        "Protocolos de sono baseados em evidências e optimização do ritmo circadiano para maximizar a recuperação e o envelhecimento saudável.",
        isPt
      ),
      color: "bg-sky-50 text-sky-600",
      link: "/services/sleep-longevity-optimisation",
    },
  ];

  const benefits = [
    { icon: Brain, text: L("15+ years of clinical experience", "15+ anos de experiência clínica", isPt) },
    { icon: Shield, text: L("IPHM Certified", "Certificado IPHM", isPt) },
    { icon: BarChart3, text: L("HRV-guided protocols", "Protocolos guiados por HRV", isPt) },
    { icon: Target, text: L("Wearable data integration", "Integração de dados wearable", isPt) },
    { icon: Activity, text: L("Evidence-based approach", "Abordagem baseada em evidências", isPt) },
    { icon: Flame, text: L("Longevity & performance focus", "Foco em longevidade e performance", isPt) },
  ];

  const bodyGoals = [
    L("Chronic fatigue & low energy solutions", "Soluções para fadiga crónica e baixa energia", isPt),
    L("Get leaner and feel more energised", "Ficar mais magro e sentir-se mais energizado", isPt),
    L("Inflammatory conditions management", "Gestão de condições inflamatórias", isPt),
    L("Stress & burnout recovery", "Recuperação de stress e burnout", isPt),
    L("Wearables for better performance", "Wearables para melhor performance", isPt),
    L("Sleep architecture optimisation", "Optimização da arquitectura do sono", isPt),
    L("Holistic health appointments", "Consultas de saúde holística", isPt),
    L("Longevity analysis", "Análise de longevidade", isPt),
    L("Wearable data analysis & guidance", "Análise e orientação de dados wearable", isPt),
  ];

  const stats = [
    { value: "15+", label: L("Years of Clinical Experience", "Anos de Experiência Clínica", isPt) },
    { value: "IPHM", label: L("Certified", "Certificado", isPt) },
    { value: "HRV", label: L("Data-Guided", "Orientado por Dados", isPt) },
    { value: "1:1", label: L("Personalised Plans", "Planos Personalizados", isPt) },
  ];

  const protocols = [
    {
      icon: Cpu,
      title: L("Biohacking & Performance", "Biohacking e Performance", isPt),
      items: [
        L("Gut health & inflammation protocols", "Protocolos de saúde intestinal e inflamação", isPt),
        L("Personalised supplement stacks", "Stacks de suplementos personalizados", isPt),
        L("Metabolic health optimisation", "Otimização da saúde metabólica", isPt),
      ],
    },
    {
      icon: HeartPulse,
      title: L("Personalised Protocols", "Protocolos Personalizados", isPt),
      items: [
        L("Blood biomarker-guided plans", "Planos guiados por biomarcadores sanguíneos", isPt),
        L("Cold/heat therapy integration", "Integração de terapia frio/calor", isPt),
        L("Breathwork & nervous system regulation", "Respiração e regulação do sistema nervoso", isPt),
      ],
    },
    {
      icon: Activity,
      title: L("Wearables Integration", "Integração de Wearables", isPt),
      items: [
        L("Garmin, WHOOP, Apple Watch analysis", "Análise Garmin, WHOOP, Apple Watch", isPt),
        L("HRV-guided training loads", "Cargas de treino guiadas por HRV", isPt),
        L("Daily readiness scoring", "Pontuação diária de prontidão", isPt),
      ],
    },
    {
      icon: Moon,
      title: L("Sleep Architecture", "Arquitectura do Sono", isPt),
      items: [
        L("Chronotype-based sleep scheduling", "Programação de sono baseada no cronotipo", isPt),
        L("Light & temperature optimisation", "Optimização de luz e temperatura", isPt),
        L("Cortisol rhythm management", "Gestão do ritmo de cortisol", isPt),
      ],
    },
  ];

  return (
    <div className="public-site min-h-screen bg-background flex flex-col">
      <SiteHeader currentPage="other" />

      {/* Breadcrumb */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors">
          <ArrowLeft className="h-4 w-4" />
          {L("Back to Home", "Voltar para Início", isPt)}
        </Link>
      </div>

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-violet-950 via-slate-900 to-slate-900 text-white py-20 sm:py-28">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-violet-800/20 via-transparent to-transparent" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left: Copy */}
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-500/20 border border-violet-500/30 text-violet-300 text-xs font-medium mb-6">
                <Sparkles className="h-3 w-3" />
                {L("IPHM Certified Biohacking Practitioner", "Praticante de Biohacking Certificado IPHM", isPt)}
              </div>
              <h1 className="font-sora text-4xl sm:text-5xl font-extrabold leading-tight mb-6 tracking-tight">
                {L("Beyond Recovery.", "Além da Recuperação.", isPt)}{" "}
                <span className="text-violet-400">{L("Feel Better.", "Sinta-se Melhor.", isPt)}</span>{" "}
                {L("Move Better.", "Mova-se Melhor.", isPt)}{" "}
                <span className="text-teal-400">{L("Live Longer.", "Viva Mais Tempo.", isPt)}</span>
              </h1>
              <p className="text-lg text-slate-300 mb-8 leading-relaxed">
                {L(
                  "Biohacking is the science of optimising your biology, data and lifestyle design to take your body performance to an elevated state. I use tissue-healing, sleep science, gut health protocols and recovery technology to create a personalised optimisation plan that upgrades every system in your body.",
                  "O biohacking é a ciência de otimizar a sua biologia, dados e design de estilo de vida para elevar o desempenho do seu corpo. Utilizo cura de tecidos, ciência do sono, protocolos de saúde intestinal e tecnologia de recuperação para criar um plano de otimização personalizado que melhora cada sistema do seu corpo.",
                  isPt
                )}
              </p>

              {/* Protocol bullets */}
              <div className="grid sm:grid-cols-2 gap-3 mb-8">
                {protocols.map((p) => (
                  <div key={p.title} className="flex items-start gap-2 text-sm text-slate-300">
                    <p.icon className="h-4 w-4 text-violet-400 mt-0.5 shrink-0" />
                    <span className="font-medium">{p.title}</span>
                  </div>
                ))}
              </div>

              <div className="flex items-center gap-3 text-xs text-slate-400 mb-8">
                <Shield className="h-4 w-4 text-violet-400" />
                {L("15+ Years of Clinical Experience · IPHM Certified · Evidence-Based Protocol", "15+ Anos de Experiência Clínica · Certificado IPHM · Protocolo Baseado em Evidências", isPt)}
              </div>

              <div className="flex flex-wrap gap-3">
                <Button asChild size="lg" className="bg-violet-600 hover:bg-violet-700 text-white">
                  <Link href="/signup">
                    {L("Book a Biohacking Consultation", "Marcar Consulta de Biohacking", isPt)}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                <Button asChild variant="outline" size="lg" className="border-white/20 text-white hover:bg-white/10">
                  <Link href="/#services">{L("Learn More", "Saber Mais", isPt)}</Link>
                </Button>
              </div>
            </div>

            {/* Right: What Your Body Gets */}
            <div className="bg-white/5 rounded-2xl border border-white/10 p-6 backdrop-blur-sm">
              <h3 className="text-lg font-bold text-white mb-4">{L("What Your Body Gets", "O Que o Seu Corpo Recebe", isPt)}</h3>
              <div className="grid sm:grid-cols-2 gap-2">
                {bodyGoals.map((goal, i) => (
                  <div key={i} className="flex items-start gap-2 text-sm text-slate-300">
                    <CheckCircle2 className="h-4 w-4 text-teal-400 mt-0.5 shrink-0" />
                    <span>{goal}</span>
                  </div>
                ))}
              </div>
              <p className="mt-4 text-xs text-slate-400 pt-4 border-t border-white/10">
                {L(
                  "Whether you are an athlete, busy professional, or simply want to age well — our biohacking approach bridges the gap between rehabilitation and peak human performance.",
                  "Seja atleta, profissional ocupado ou simplesmente queira envelhecer bem — a nossa abordagem de biohacking preenche a lacuna entre reabilitação e desempenho humano máximo.",
                  isPt
                )}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Bar */}
      <section className="bg-slate-800 py-6 border-y border-slate-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {stats.map((s) => (
              <div key={s.label} className="text-center">
                <div className="text-2xl font-extrabold text-violet-400">{s.value}</div>
                <div className="text-xs text-slate-400 mt-0.5">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 3 Service Pillars */}
      <section className="py-16 sm:py-20 bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="font-sora text-3xl font-extrabold text-foreground mb-3 tracking-tight">
              {L("Our Biohacking Services", "Os Nossos Serviços de Biohacking", isPt)}
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              {L(
                "Three integrated disciplines working together to optimise your biology, recovery, and longevity.",
                "Três disciplinas integradas a trabalhar em conjunto para otimizar a sua biologia, recuperação e longevidade.",
                isPt
              )}
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {pillars.map((p) => (
              <Card key={p.title} className="group border border-slate-100 hover:border-primary/30 hover:shadow-lg transition-all duration-300 border-t-[3px] border-t-violet-500">
                <CardContent className="p-6">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${p.color}`}>
                    <p.icon className="h-6 w-6" />
                  </div>
                  <h3 className="text-lg font-bold text-foreground mb-2">{p.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed mb-4">{p.desc}</p>
                  <Link
                    href={p.link}
                    className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:gap-2 transition-all"
                  >
                    {L("Learn more", "Saber mais", isPt)} <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Protocol Details */}
      <section className="py-16 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="font-sora text-3xl font-extrabold text-foreground mb-3 tracking-tight">
              {L("How It Works", "Como Funciona", isPt)}
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              {L(
                "Each pillar is a complete system, designed to work independently or as part of your full biohacking programme.",
                "Cada pilar é um sistema completo, desenhado para funcionar independentemente ou como parte do seu programa completo de biohacking.",
                isPt
              )}
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {protocols.map((p, i) => (
              <div key={p.title} className="bg-white rounded-xl p-6 border border-slate-100 shadow-sm">
                <div className="w-10 h-10 rounded-lg bg-violet-50 text-violet-600 flex items-center justify-center mb-4">
                  <p.icon className="h-5 w-5" />
                </div>
                <h3 className="font-semibold text-foreground mb-3">{p.title}</h3>
                <ul className="space-y-2">
                  {p.items.map((item, j) => (
                    <li key={j} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <CheckCircle2 className="h-3.5 w-3.5 text-teal-500 mt-0.5 shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why Choose BPR for Biohacking */}
      <section className="py-16 bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="font-sora text-3xl font-extrabold text-foreground mb-4 tracking-tight">
                {L("Why BPR for Biohacking?", "Porquê a BPR para Biohacking?", isPt)}
              </h2>
              <p className="text-muted-foreground mb-6 leading-relaxed">
                {L(
                  "We combine 15+ years of clinical experience with cutting-edge biohacking science. Our approach is grounded in physiology, not trends — every protocol is personalised, evidence-based, and monitored.",
                  "Combinamos 15+ anos de experiência clínica com a ciência de biohacking mais avançada. A nossa abordagem está fundamentada na fisiologia, não em tendências — cada protocolo é personalizado, baseado em evidências e monitorado.",
                  isPt
                )}
              </p>
              <div className="grid sm:grid-cols-2 gap-3">
                {benefits.map((b) => (
                  <div key={b.text} className="flex items-center gap-2 text-sm">
                    <div className="w-8 h-8 rounded-lg bg-violet-50 text-violet-600 flex items-center justify-center shrink-0">
                      <b.icon className="h-4 w-4" />
                    </div>
                    <span className="text-foreground font-medium">{b.text}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-gradient-to-br from-violet-50 to-sky-50 rounded-2xl p-8 border border-violet-100">
              <div className="flex items-center gap-3 mb-4">
                <Clock className="h-5 w-5 text-violet-600" />
                <h3 className="font-semibold text-foreground">{L("What to Expect", "O Que Esperar", isPt)}</h3>
              </div>
              <div className="space-y-4">
                {[
                  { step: "01", text: L("90-min initial consultation — health history, goals, wearable data review", "Consulta inicial de 90 min — histórico de saúde, objetivos, revisão de dados wearable", isPt) },
                  { step: "02", text: L("Personalised biohacking protocol designed for your biology", "Protocolo de biohacking personalizado para a sua biologia", isPt) },
                  { step: "03", text: L("Weekly or bi-weekly check-ins to monitor progress and adjust", "Check-ins semanais ou quinzenais para monitorar progresso e ajustar", isPt) },
                  { step: "04", text: L("Monthly biomarker reviews and protocol evolution", "Revisões mensais de biomarcadores e evolução do protocolo", isPt) },
                ].map((item) => (
                  <div key={item.step} className="flex items-start gap-3">
                    <span className="text-xs font-bold text-violet-600 bg-violet-100 rounded-full w-6 h-6 flex items-center justify-center shrink-0 mt-0.5">{item.step}</span>
                    <p className="text-sm text-muted-foreground">{item.text}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 bg-gradient-to-br from-violet-950 to-slate-900 text-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <Sparkles className="h-8 w-8 text-violet-400 mx-auto mb-4" />
          <h2 className="font-sora text-3xl font-extrabold mb-4 tracking-tight">
            {L("Ready to Optimise Your Biology?", "Pronto para Optimizar a Sua Biologia?", isPt)}
          </h2>
          <p className="text-slate-300 mb-8">
            {L(
              "Book your biohacking consultation today and start your journey to peak performance, better recovery, and a longer, healthier life.",
              "Marque a sua consulta de biohacking hoje e comece a sua jornada para a máxima performance, melhor recuperação e uma vida mais longa e saudável.",
              isPt
            )}
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            <Button asChild size="lg" className="bg-violet-600 hover:bg-violet-700 text-white">
              <Link href="/signup">
                {L("Book a Consultation", "Marcar Consulta", isPt)}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="border-white/20 text-white hover:bg-white/10">
              <Link href="/#contact">{L("Get in Touch", "Entrar em Contacto", isPt)}</Link>
            </Button>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
