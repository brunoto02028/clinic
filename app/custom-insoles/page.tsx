"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Footprints,
  CheckCircle2,
  Activity,
  Zap,
  ScanLine,
  Shield,
  Package,
  Home,
  Repeat,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { useLocale } from "@/hooks/use-locale";

export default function CustomInsolesPage() {
  const [mounted, setMounted] = useState(false);
  const [settings, setSettings] = useState<any>(null);
  const { locale, t: T } = useLocale();

  useEffect(() => {
    setMounted(true);
    fetch("/api/settings").then(r => r.json()).then(d => setSettings(d)).catch(() => {});
  }, []);

  const L = (en: string, pt: string) => locale === "pt-BR" ? pt : en;

  const processSteps = [
    { num: "01", icon: ScanLine, color: "bg-blue-100 text-blue-700",
      title: L("Digital Foot Scan", "Escaneamento Digital do Pé"),
      desc: L(
        "Visit our clinic or use our home scanning kit. We capture a detailed pressure map and 3D profile of both feet using advanced sensor technology. The scan takes just 5 minutes and is completely painless.",
        "Visite nossa clínica ou use nosso kit de escaneamento em casa. Capturamos um mapa de pressão detalhado e perfil 3D de ambos os pés usando tecnologia avançada de sensores. O escaneamento leva apenas 5 minutos e é totalmente indolor."
      ) },
    { num: "02", icon: Activity, color: "bg-indigo-100 text-indigo-700",
      title: L("Gait & Pressure Analysis", "Análise de Marcha e Pressão"),
      desc: L(
        "Our system analyses your weight distribution, arch type, pronation level, and walking pattern. We identify the root cause of your foot problems and determine the exact support profile you need.",
        "Nosso sistema analisa sua distribuição de peso, tipo de arco, nível de pronação e padrão de caminhada. Identificamos a causa raiz dos seus problemas nos pés e determinamos o perfil exato de suporte que você precisa."
      ) },
    { num: "03", icon: Zap, color: "bg-violet-100 text-violet-700",
      title: L("Custom Design & Manufacturing", "Design e Fabricação Personalizados"),
      desc: L(
        "Your insoles are precision-designed using CAD technology based on your unique scan data. They are then manufactured with medical-grade EVA, carbon fibre, or 3D-printed materials for lasting comfort and support.",
        "Suas palmilhas são projetadas com precisão usando tecnologia CAD baseada nos dados únicos do seu escaneamento. São fabricadas com EVA de grau médico, fibra de carbono ou materiais impressos em 3D para conforto e suporte duradouros."
      ) },
    { num: "04", icon: CheckCircle2, color: "bg-green-100 text-green-700",
      title: L("Fitting & Follow-Up", "Ajuste e Acompanhamento"),
      desc: L(
        "We ensure a perfect fit and provide follow-up assessments to track your progress. Your scan data is stored digitally, so future pairs can be ordered easily without a new scan.",
        "Garantimos um ajuste perfeito e fornecemos avaliações de acompanhamento para monitorar seu progresso. Seus dados de escaneamento ficam armazenados digitalmente, permitindo pedidos futuros sem novo escaneamento."
      ) },
  ];

  const conditions = [
    { icon: Footprints, title: L("Plantar Fasciitis", "Fascite Plantar"), desc: L("Custom arch support to relieve heel and arch pain.", "Suporte de arco personalizado para aliviar dor no calcanhar e arco.") },
    { icon: Activity, title: L("Flat Feet / Fallen Arches", "Pé Plano / Arco Caído"), desc: L("Corrective insoles to restore proper arch profile.", "Palmilhas corretivas para restaurar o perfil adequado do arco.") },
    { icon: Repeat, title: L("Overpronation", "Pronação Excessiva"), desc: L("Medial posting to prevent excessive inward rolling.", "Suporte medial para prevenir rotação excessiva para dentro.") },
    { icon: Zap, title: L("Sports Performance", "Desempenho Esportivo"), desc: L("Sport-specific insoles for running, football, and more.", "Palmilhas específicas para corrida, futebol e mais.") },
    { icon: Shield, title: L("Heel Spurs", "Esporão de Calcâneo"), desc: L("Cushioned heel cups with targeted pressure relief.", "Copas acolchoadas para calcanhar com alívio de pressão direcionado.") },
    { icon: Home, title: L("Everyday Comfort", "Conforto Diário"), desc: L("For standing, walking, and working on your feet all day.", "Para ficar em pé, caminhar e trabalhar o dia todo.") },
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
            <span className="inline-block px-4 py-1.5 rounded-full bg-blue-100 text-blue-700 text-xs font-semibold uppercase tracking-wider mb-4">
              {L("Custom Insoles & Foot Analysis", "Palmilhas Personalizadas e Análise do Pé")}
            </span>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground leading-tight mb-4">
              {settings?.insolesTitle || L("Custom-Made Insoles", "Palmilhas Sob Medida")}{" "}
              <span className="text-primary">{settings?.insolesSubtitle || L("For Your Unique Feet", "Para os Seus Pés Únicos")}</span>
            </h1>
            <p className="text-base sm:text-lg text-muted-foreground leading-relaxed mb-6">
              {settings?.insolesDesc || L(
                "Every foot is different. Our custom insoles are designed from a detailed digital scan of your feet, ensuring perfect support for your unique arch, pressure points, and gait pattern. Whether you suffer from plantar fasciitis, flat feet, overpronation, or simply want better comfort — we create insoles tailored specifically to you.",
                "Cada pé é diferente. Nossas palmilhas são projetadas a partir de um escaneamento digital detalhado dos seus pés, garantindo suporte perfeito para seu arco único, pontos de pressão e padrão de marcha. Seja para fascite plantar, pé plano, pronação excessiva ou simplesmente mais conforto — criamos palmilhas personalizadas especificamente para você."
              )}
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <Link href="/signup"><Button size="lg" className="gap-2">{L("Book Your Foot Scan", "Agende Seu Escaneamento")} <ArrowRight className="h-4 w-4" /></Button></Link>
              <Link href="/#insoles"><Button size="lg" variant="outline">{L("View on Homepage", "Ver na Página Inicial")}</Button></Link>
            </div>
          </div>
          <div>
            <div className="relative rounded-2xl overflow-hidden shadow-2xl aspect-[4/3]">
              <img src={settings?.insolesImageUrl || "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&q=80"} alt="Custom insoles foot scan" className="absolute inset-0 w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
            </div>
            <div className="absolute -top-4 -right-4 sm:-top-6 sm:-right-6 bg-card rounded-xl p-3 sm:p-4 shadow-lg border border-border">
              <p className="text-2xl font-bold text-primary">100%</p>
              <p className="text-xs text-muted-foreground">Custom</p>
            </div>
          </div>
        </div>
      </section>

      {/* Process Steps */}
      <section className="py-16 bg-card">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground">{L("How The Process Works", "Como Funciona o Processo")}</h2>
            <p className="mt-3 text-muted-foreground max-w-xl mx-auto">{L("From scan to sole — a simple 4-step process.", "Do escaneamento à palmilha — um processo simples em 4 etapas.")}</p>
          </div>
          <div className="grid md:grid-cols-2 gap-8">
            {processSteps.map((step, i) => {
              const Icon = step.icon;
              return (
                <div>
                  <Card className="h-full border border-border hover:shadow-md transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex items-start gap-4">
                        <div className="relative">
                          <div className={`w-12 h-12 rounded-xl ${step.color} flex items-center justify-center`}>
                            <Icon className="h-6 w-6" />
                          </div>
                          <span className="absolute -top-2 -left-2 w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center">{step.num}</span>
                        </div>
                        <div className="flex-1">
                          <h3 className="text-lg font-bold text-foreground mb-2">{step.title}</h3>
                          <p className="text-sm text-muted-foreground leading-relaxed">{step.desc}</p>
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

      {/* Conditions We Treat */}
      <section className="py-16 bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground">{L("Conditions We Treat", "Condições que Tratamos")}</h2>
            <p className="mt-3 text-muted-foreground max-w-xl mx-auto">{L("Our custom insoles address a wide range of foot and lower limb conditions.", "Nossas palmilhas personalizadas tratam uma ampla gama de condições do pé e membros inferiores.")}</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {conditions.map((c, i) => {
              const Icon = c.icon;
              return (
                <div>
                  <Card className="h-full hover:shadow-md transition-shadow">
                    <CardContent className="p-5">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                          <Icon className="h-5 w-5" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-foreground mb-1">{c.title}</h3>
                          <p className="text-sm text-muted-foreground">{c.desc}</p>
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

      {/* Home Scan Kit */}
      <section className="py-16 bg-card">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-8 lg:gap-14 items-center">
            <div>
              <span className="inline-block px-3 py-1 rounded-full bg-green-100 text-green-700 text-xs font-semibold uppercase tracking-wider mb-3">{L("Scan From Home", "Escaneie em Casa")}</span>
              <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-4">{L("Can't Visit Us?", "Não Pode Nos Visitar?")}</h2>
              <p className="text-muted-foreground leading-relaxed mb-6">
                {L(
                  "We offer a home scanning solution. Our digital foot scanning system allows you to capture your foot profile from the comfort of your home using your smartphone. Simply follow the guided instructions in our app, submit your scan, and we'll design your custom insoles remotely.",
                  "Oferecemos uma solução de escaneamento em casa. Nosso sistema digital de escaneamento de pés permite que você capture o perfil do seu pé no conforto de casa usando seu smartphone. Basta seguir as instruções guiadas no nosso app, enviar seu escaneamento, e projetaremos suas palmilhas remotamente."
                )}
              </p>
              <div className="space-y-3 mb-6">
                {[
                  L("Use your smartphone camera", "Use a câmera do seu smartphone"),
                  L("Guided step-by-step instructions", "Instruções passo a passo guiadas"),
                  L("Results reviewed by our specialist", "Resultados revisados por nosso especialista"),
                  L("Insoles delivered to your door", "Palmilhas entregues na sua porta"),
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
                <img src="https://images.unsplash.com/photo-1512290923902-8a9f81dc236c?w=800&q=80" alt="Home foot scanning" className="w-full h-full object-cover" />
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
              {L("Ready for Custom Comfort?", "Pronto para Conforto Personalizado?")}
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto mb-8">
              {L("Book your foot scan today and take the first step towards pain-free movement.", "Agende seu escaneamento hoje e dê o primeiro passo para se mover sem dor.")}
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
