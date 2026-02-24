"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  ScanLine,
  Brain,
  Activity,
  CheckCircle2,
  Target,
  BarChart3,
  Smartphone,
  Eye,
  Ruler,
  Layers,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { useLocale } from "@/hooks/use-locale";

export default function BiomechanicalAssessmentPage() {
  const [mounted, setMounted] = useState(false);
  const [settings, setSettings] = useState<any>(null);
  const { locale, t: T } = useLocale();

  useEffect(() => {
    setMounted(true);
    fetch("/api/settings").then(r => r.json()).then(d => setSettings(d)).catch(() => {});
  }, []);

  const L = (en: string, pt: string) => locale === "pt-BR" ? pt : en;

  const processSteps = [
    { num: "01", icon: ScanLine, color: "bg-purple-100 text-purple-700",
      title: L("Multi-Angle Capture", "Captura Multi-Angular"),
      desc: L(
        "We photograph your posture from four angles — front, back, left, and right — using our guided capture system. This can be done in-clinic with our professional setup, or remotely via your smartphone using our patient portal.",
        "Fotografamos sua postura de quatro ângulos — frente, costas, esquerda e direita — usando nosso sistema de captura guiada. Pode ser feito na clínica com nosso setup profissional, ou remotamente via smartphone usando nosso portal do paciente."
      ) },
    { num: "02", icon: Brain, color: "bg-indigo-100 text-indigo-700",
      title: L("Technology-Assisted Analysis", "Análise Assistida por Tecnologia"),
      desc: L(
        "Our advanced system powered by MediaPipe BlazePose detects 33 body landmarks in each image, calculates precise joint angles, identifies left-right asymmetries, and generates posture and mobility scores (0-100) — providing your therapist with accurate, data-driven insights.",
        "Nosso sistema avançado alimentado pelo MediaPipe BlazePose detecta 33 pontos corporais em cada imagem, calcula ângulos articulares precisos, identifica assimetrias esquerda-direita e gera pontuações de postura e mobilidade (0-100) — fornecendo ao seu terapeuta dados precisos e orientados."
      ) },
    { num: "03", icon: Activity, color: "bg-blue-100 text-blue-700",
      title: L("Clinical Assessment", "Avaliação Clínica"),
      desc: L(
        "Your therapist combines the AI data with hands-on clinical testing — manual muscle strength tests, joint range of motion measurements, special orthopaedic tests, and functional movement screens. All results feed into a comprehensive biomechanical profile.",
        "Seu terapeuta combina os dados da IA com testes clínicos práticos — testes manuais de força muscular, medições de amplitude de movimento articular, testes ortopédicos especiais e triagens de movimento funcional. Todos os resultados alimentam um perfil biomecânico completo."
      ) },
    { num: "04", icon: CheckCircle2, color: "bg-green-100 text-green-700",
      title: L("Treatment Protocol", "Protocolo de Tratamento"),
      desc: L(
        "Based on the complete assessment data, your therapist designs a personalised treatment plan with targeted exercises, electrotherapy protocols, and progress milestones — all tracked digitally through your patient portal with video-guided exercises.",
        "Com base nos dados completos da avaliação, seu terapeuta elabora um plano de tratamento personalizado com exercícios direcionados, protocolos de eletroterapia e marcos de progresso — tudo rastreado digitalmente através do portal do paciente com exercícios guiados por vídeo."
      ) },
  ];

  const features = [
    { icon: Target, title: L("33 Body Landmarks", "33 Pontos Corporais"), desc: L("Precise detection using MediaPipe BlazePose technology.", "Detecção precisa usando tecnologia MediaPipe BlazePose.") },
    { icon: Ruler, title: L("Joint Angle Measurements", "Medições de Ângulos Articulares"), desc: L("Automatic calculation with normal range comparisons.", "Cálculo automático com comparações de faixas normais.") },
    { icon: BarChart3, title: L("Posture Score (0-100)", "Pontuação de Postura (0-100)"), desc: L("Quantified posture assessment with detailed breakdown.", "Avaliação quantificada da postura com detalhamento.") },
    { icon: Layers, title: L("Symmetry Analysis", "Análise de Simetria"), desc: L("Left-right comparison to identify muscle imbalances.", "Comparação esquerda-direita para identificar desequilíbrios musculares.") },
    { icon: Eye, title: L("Plumb Line Analysis", "Análise da Linha de Prumo"), desc: L("Vertical alignment assessment from anterior and lateral views.", "Avaliação do alinhamento vertical das vistas anterior e lateral.") },
    { icon: Smartphone, title: L("Remote Capture", "Captura Remota"), desc: L("Use your smartphone from home via our guided capture system.", "Use seu smartphone em casa pelo nosso sistema de captura guiada.") },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <SiteHeader currentPage="other" />

      {/* Breadcrumb */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors">
          <ArrowLeft className="h-4 w-4" />
          {L("Back to Home", "Voltar para Início")}
        </Link>
      </div>

      {/* Hero */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
        <div className="grid lg:grid-cols-2 gap-8 lg:gap-14 items-center">
          <div>
            <span className="inline-block px-4 py-1.5 rounded-full bg-purple-100 text-purple-700 text-xs font-semibold uppercase tracking-wider mb-4">
              {L("Advanced Technology for Physical Assessment", "Tecnologia Avançada para Avaliação Física")}
            </span>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground leading-tight mb-4">
              {settings?.bioTitle || L("Biomechanical Assessment", "Avaliação Biomecânica")} —{" "}
              <span className="text-primary">{settings?.bioSubtitle || L("Find The Root Cause", "Encontre a Causa Raiz")}</span>
            </h1>
            <p className="text-base sm:text-lg text-muted-foreground leading-relaxed mb-6">
              {settings?.bioDesc || L(
                "Our comprehensive biomechanical assessment combines cutting-edge pose detection technology with expert clinical evaluation. We capture multi-angle images and calculate joint angles, symmetry scores, and plumb line deviations with precision — equipping your therapist with accurate, data-driven insights to design your personalised treatment plan.",
                "Nossa avaliação biomecânica abrangente combina tecnologia de ponta em detecção de pose com avaliação clínica especializada. Capturamos imagens multi-angulares e calculamos ângulos articulares, pontuações de simetria e desvios da linha de prumo com precisão — equipando seu terapeuta com dados precisos para elaborar seu plano de tratamento personalizado."
              )}
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <Link href="/signup"><Button size="lg" className="gap-2">{L("Book Your Assessment", "Agende Sua Avaliação")} <ArrowRight className="h-4 w-4" /></Button></Link>
              <Link href="/#biomechanics"><Button size="lg" variant="outline">{L("View on Homepage", "Ver na Página Inicial")}</Button></Link>
            </div>
          </div>
          <div>
            <div className="relative rounded-2xl overflow-hidden shadow-2xl aspect-[4/3]">
              <img src={settings?.bioImageUrl || "https://images.unsplash.com/photo-1559757175-5700dde675bc?w=800&q=80"} alt="Biomechanical assessment" className="absolute inset-0 w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
            </div>
            <div className="absolute -top-4 -left-4 sm:-top-6 sm:-left-6 bg-card rounded-xl p-3 sm:p-4 shadow-lg border border-border">
              <p className="text-2xl font-bold text-purple-600">33</p>
              <p className="text-xs text-muted-foreground">Landmarks</p>
            </div>
            <div className="absolute -bottom-3 -right-3 sm:-bottom-5 sm:-right-5 bg-card rounded-xl p-3 sm:p-4 shadow-lg border border-border">
              <p className="text-2xl font-bold text-primary">100%</p>
              <p className="text-xs text-muted-foreground">{L("Precision", "Precisão")}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-16 bg-card">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground">{L("What We Analyse", "O Que Analisamos")}</h2>
            <p className="mt-3 text-muted-foreground max-w-xl mx-auto">{L("Advanced technology combined with clinical expertise for a complete picture.", "Tecnologia avançada combinada com expertise clínica para um quadro completo.")}</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map((f, i) => {
              const Icon = f.icon;
              return (
                <div>
                  <Card className="h-full hover:shadow-md transition-shadow">
                    <CardContent className="p-5">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center shrink-0">
                          <Icon className="h-5 w-5" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-foreground mb-1">{f.title}</h3>
                          <p className="text-sm text-muted-foreground">{f.desc}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Process Steps */}
      <section className="py-16 bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground">{L("How The Process Works", "Como Funciona o Processo")}</h2>
            <p className="mt-3 text-muted-foreground max-w-xl mx-auto">{L("From capture to treatment plan — a data-driven approach.", "Da captura ao plano de tratamento — uma abordagem baseada em dados.")}</p>
          </div>
          <div className="space-y-6">
            {processSteps.map((step, i) => {
              const Icon = step.icon;
              return (
                <div>
                  <Card className="border border-border hover:shadow-md transition-shadow overflow-hidden">
                    <CardContent className="p-0">
                      <div className="grid md:grid-cols-[auto_1fr] gap-0">
                        <div className={`p-6 sm:p-8 flex items-center justify-center ${step.color.split(' ')[0]}/30 min-w-[120px]`}>
                          <div className="relative">
                            <div className={`w-16 h-16 rounded-2xl ${step.color} flex items-center justify-center`}>
                              <Icon className="h-8 w-8" />
                            </div>
                            <span className="absolute -top-2 -left-2 w-7 h-7 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center">{step.num}</span>
                          </div>
                        </div>
                        <div className="p-6 sm:p-8">
                          <h3 className="text-xl font-bold text-foreground mb-2">{step.title}</h3>
                          <p className="text-muted-foreground leading-relaxed">{step.desc}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Remote Capture */}
      <section className="py-16 bg-card">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-8 lg:gap-14 items-center">
            <div>
              <span className="inline-block px-3 py-1 rounded-full bg-green-100 text-green-700 text-xs font-semibold uppercase tracking-wider mb-3">{L("Remote Assessment", "Avaliação Remota")}</span>
              <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-4">{L("Assess From Anywhere", "Avalie de Qualquer Lugar")}</h2>
              <p className="text-muted-foreground leading-relaxed mb-6">
                {L(
                  "Our guided capture system works on any smartphone. We send you a secure link, you follow the on-screen prompts to photograph your posture from four angles, and our AI processes the images immediately. Your therapist reviews the analysis and creates your treatment plan — all without leaving home.",
                  "Nosso sistema de captura guiada funciona em qualquer smartphone. Enviamos um link seguro, você segue as instruções na tela para fotografar sua postura de quatro ângulos, e nossa IA processa as imagens imediatamente. Seu terapeuta revisa a análise e cria seu plano de tratamento — tudo sem sair de casa."
                )}
              </p>
              <div className="space-y-3 mb-6">
                {[
                  L("Works on any smartphone", "Funciona em qualquer smartphone"),
                  L("Secure token-based capture link", "Link de captura seguro com token"),
                  L("Real-time guided prompts", "Instruções guiadas em tempo real"),
                  L("Analysis results in minutes", "Resultados da análise em minutos"),
                ].map((b, i) => (
                  <div key={i} className="flex items-center gap-2.5">
                    <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0" />
                    <span className="text-sm text-foreground">{b}</span>
                  </div>
                ))}
              </div>
              <Link href="/signup"><Button size="lg" className="gap-2">{L("Get Started", "Começar Agora")} <ArrowRight className="h-4 w-4" /></Button></Link>
            </div>
            <div>
              <div className="relative rounded-2xl overflow-hidden shadow-xl aspect-[4/3] bg-muted">
                <img src="https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=800&q=80" alt="Remote body assessment" className="w-full h-full object-cover" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-4">
              {L("Ready to Find the Root Cause?", "Pronto para Encontrar a Causa Raiz?")}
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto mb-8">
              {L("Book your biomechanical assessment today and get a data-driven treatment plan.", "Agende sua avaliação biomecânica hoje e receba um plano de tratamento baseado em dados.")}
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link href="/signup"><Button size="lg" className="gap-2">{T("home.bookAppointment")} <ArrowRight className="h-5 w-5" /></Button></Link>
              <Link href="/"><Button size="lg" variant="outline">{L("Back to Home", "Voltar para Início")}</Button></Link>
            </div>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
