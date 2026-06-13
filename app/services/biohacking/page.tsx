"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  ArrowLeft, ArrowRight, Brain, CheckCircle2, ChevronDown,
  Clock, Activity, Dna, Moon, Flame, Zap, Shield, Heart,
  Target, Users, Microscope, Star,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useLocale } from "@/hooks/use-locale";

export default function BiohackingCoachingPage() {
  const [mounted, setMounted] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const { locale } = useLocale();
  const isPt = locale === "pt-BR";

  useEffect(() => { setMounted(true); }, []);
  if (!mounted) return null;

  const L = (en: string, pt: string) => isPt ? pt : en;

  const benefits = [
    { icon: Activity, color: "bg-emerald-100 text-emerald-700", en: "Personalised protocols built from your HRV baseline, lifestyle data, and clinical history", pt: "Protocolos personalizados criados a partir do seu HRV basal, dados de estilo de vida e histórico clínico" },
    { icon: Zap, color: "bg-orange-100 text-orange-700", en: "Faster tissue repair through circadian rhythm optimisation and targeted light exposure", pt: "Reparação tecidual mais rápida através da optimização do ritmo circadiano e exposição à luz dirigida" },
    { icon: Flame, color: "bg-red-100 text-red-700", en: "Gut-joint axis inflammation reduction via evidence-based dietary and microbiome protocols", pt: "Redução da inflamação eixo intestino-articulação através de protocolos dietéticos e de microbioma baseados em evidências" },
    { icon: Brain, color: "bg-violet-100 text-violet-700", en: "Stress and cortisol regulation using breathwork, cold exposure, and nervous system retraining", pt: "Regulação do stress e cortisol usando respiração guiada, exposição ao frio e retreino do sistema nervoso" },
    { icon: Dna, color: "bg-teal-100 text-teal-700", en: "Photobiomodulation (MLS Laser) integrated into your biological recovery plan", pt: "Fotobiomodulação (Laser MLS) integrada no seu plano de recuperação biológica" },
    { icon: Shield, color: "bg-blue-100 text-blue-700", en: "Evidence-based supplementation and nutrition guidance tailored to your specific markers", pt: "Suplementação baseada em evidências e orientação nutricional adaptada aos seus marcadores específicos" },
    { icon: Moon, color: "bg-indigo-100 text-indigo-700", en: "Sleep architecture optimisation to maximise deep sleep, REM cycles, and overnight tissue repair", pt: "Optimização da arquitectura do sono para maximizar sono profundo, ciclos REM e reparação tecidual nocturna" },
    { icon: Target, color: "bg-cyan-100 text-cyan-700", en: "Wearable data integration (Apple Watch, Oura Ring, Garmin, CGM) with clinical interpretation", pt: "Integração de dados de wearables (Apple Watch, Oura Ring, Garmin, MCG) com interpretação clínica" },
  ];

  const steps = [
    { num: "01", icon: Microscope, color: "bg-emerald-100 text-emerald-700", en_title: "Biometric Assessment", pt_title: "Avaliação Biométrica", en_desc: "A comprehensive baseline session covering HRV measurement, sleep quality review, stress markers, gut health indicators, energy levels, and existing medical history. We map every biological system to identify where optimisation will have the greatest impact.", pt_desc: "Uma sessão de linha de base abrangente cobrindo medição de HRV, revisão da qualidade do sono, marcadores de stress, indicadores de saúde intestinal, níveis de energia e histórico médico existente. Mapeamos cada sistema biológico para identificar onde a optimização terá maior impacto." },
    { num: "02", icon: Brain, color: "bg-violet-100 text-violet-700", en_title: "Protocol Design", pt_title: "Design do Protocolo", en_desc: "Your personalised biohacking plan is built around your clinical data. We select the specific interventions — from photobiomodulation and breathwork to dietary adjustments and light therapy — that are most likely to shift your biology in the desired direction.", pt_desc: "O seu plano de biohacking personalizado é construído em torno dos seus dados clínicos. Seleccionamos as intervenções específicas — desde fotobiomodulação e respiração guiada até ajustes dietéticos e terapia de luz — que têm maior probabilidade de mover a sua biologia na direcção desejada." },
    { num: "03", icon: Activity, color: "bg-blue-100 text-blue-700", en_title: "Guided Implementation", pt_title: "Implementação Guiada", en_desc: "We integrate your biohacking protocols into your existing daily routine and treatment plan. Clinic sessions combine in-person treatment (MLS Laser, electrotherapy, manual therapy) with lifestyle coaching to ensure each visit advances both recovery and performance goals.", pt_desc: "Integramos os seus protocolos de biohacking na sua rotina diária existente e plano de tratamento. As sessões de clínica combinam tratamento presencial (Laser MLS, electroterapia, terapia manual) com coaching de estilo de vida para garantir que cada visita avança tanto os objectivos de recuperação como de performance." },
    { num: "04", icon: Target, color: "bg-teal-100 text-teal-700", en_title: "Monitor & Optimise", pt_title: "Monitorizar e Optimizar", en_desc: "Ongoing HRV tracking and monthly data reviews allow us to refine your protocol based on real biological responses. We adjust interventions as your body adapts, ensuring you continue progressing rather than plateauing.", pt_desc: "O acompanhamento contínuo de HRV e revisões mensais de dados permitem-nos refinar o seu protocolo com base em respostas biológicas reais. Ajustamos as intervenções à medida que o seu corpo se adapta, garantindo que continua a progredir em vez de estagnar." },
  ];

  const whoFor = [
    L("Athletes & Sportspeople", "Atletas e Desportistas"),
    L("Executives & High Performers", "Executivos e Alto Rendimento"),
    L("Chronic Fatigue Patients", "Pacientes com Fadiga Crónica"),
    L("Post-Surgery Recovery", "Recuperação Pós-Cirurgia"),
    L("Longevity Seekers", "Buscadores de Longevidade"),
    L("Wearable Data Users", "Utilizadores de Wearables"),
    L("Chronic Pain Conditions", "Dor Crónica"),
    L("Stress & Burnout Recovery", "Recuperação de Burnout"),
  ];

  const faqs = [
    {
      en_q: "What exactly is biohacking?",
      pt_q: "O que é exactamente o biohacking?",
      en_a: "Biohacking is the systematic use of science, data, and lifestyle design to make your body function at its absolute best. It combines insights from chronobiology, neuroscience, nutrition science, and exercise physiology to build evidence-based personalised protocols. In our clinical context, it means going beyond treating your injury — we optimise the biological environment in which healing takes place.",
      pt_a: "O biohacking é o uso sistemático de ciência, dados e design de estilo de vida para fazer o seu corpo funcionar no seu melhor absoluto. Combina conhecimentos de cronobiologia, neurociência, ciência da nutrição e fisiologia do exercício para criar protocolos personalizados baseados em evidências. No nosso contexto clínico, significa ir além do tratamento da sua lesão — optimizamos o ambiente biológico em que a cura ocorre.",
    },
    {
      en_q: "Is biohacking evidence-based or is it pseudoscience?",
      pt_q: "O biohacking é baseado em evidências ou é pseudociência?",
      en_a: "The interventions we use are grounded in peer-reviewed research. HRV monitoring has decades of clinical literature behind it. Photobiomodulation (MLS Laser) is CE-marked and EU MDR-approved. Circadian biology is a Nobel Prize-winning field. We do not use unproven technologies or supplements. Every protocol we recommend has a clinical rationale and measurable outcomes.",
      pt_a: "As intervenções que usamos são fundamentadas em investigação revisada por pares. A monitorização de HRV tem décadas de literatura clínica por trás. A fotobiomodulação (Laser MLS) tem marcação CE e aprovação EU MDR. A biologia circadiana é um campo premiado com o Nobel. Não usamos tecnologias ou suplementos não comprovados. Cada protocolo que recomendamos tem uma justificação clínica e resultados mensuráveis.",
    },
    {
      en_q: "Do I need special equipment or wearables?",
      pt_q: "Preciso de equipamento especial ou wearables?",
      en_a: "No — we can build a highly effective protocol using only clinic-based tools and simple at-home practices. However, if you already own an Apple Watch, Oura Ring, Garmin, or continuous glucose monitor (CGM), we can integrate that data into your clinical picture for an even more personalised approach. We will advise on wearables only if they add genuine value for your specific goals.",
      pt_a: "Não — podemos construir um protocolo altamente eficaz usando apenas ferramentas clínicas e práticas simples em casa. No entanto, se já possui um Apple Watch, Oura Ring, Garmin ou monitor contínuo de glucose (MCG), podemos integrar esses dados no seu quadro clínico para uma abordagem ainda mais personalizada. Aconselhamos sobre wearables apenas se acrescentarem valor genuíno para os seus objectivos específicos.",
    },
    {
      en_q: "How is this different from regular physiotherapy?",
      pt_q: "Como é que isto é diferente da fisioterapia regular?",
      en_a: "Traditional physiotherapy focuses on the structural and mechanical aspects of injury and recovery. Biohacking Coaching adds a biological systems layer — addressing the hormonal, inflammatory, neurological, and metabolic environment that determines how quickly and completely you recover. The two approaches are deeply complementary: we integrate biohacking protocols into your rehabilitation plan rather than replacing it.",
      pt_a: "A fisioterapia tradicional foca-se nos aspectos estruturais e mecânicos da lesão e recuperação. O Coaching de Biohacking adiciona uma camada de sistemas biológicos — abordando o ambiente hormonal, inflamatório, neurológico e metabólico que determina com que rapidez e completamente você recupera. As duas abordagens são profundamente complementares: integramos protocolos de biohacking no seu plano de reabilitação em vez de o substituir.",
    },
    {
      en_q: "How long until I notice results?",
      pt_q: "Quanto tempo até notar resultados?",
      en_a: "Many patients notice improvements in energy levels, sleep quality, and pain perception within 2–4 weeks of implementing their initial protocol. Significant biological changes — such as reduced inflammatory markers, improved HRV trends, and faster tissue repair — typically become measurable over 6–12 weeks. Biohacking is a long-term investment in your biology, not a quick fix, and we are transparent about realistic timelines from the outset.",
      pt_a: "Muitos pacientes notam melhorias nos níveis de energia, qualidade do sono e percepção da dor dentro de 2–4 semanas após a implementação do protocolo inicial. Mudanças biológicas significativas — como redução de marcadores inflamatórios, melhoria das tendências de HRV e reparação tecidual mais rápida — tipicamente tornam-se mensuráveis ao longo de 6–12 semanas. O biohacking é um investimento a longo prazo na sua biologia, não uma solução rápida, e somos transparentes sobre os prazos realistas desde o início.",
    },
  ];

  return (
    <div>
      {/* Breadcrumb */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <Link href="/#services" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors">
          <ArrowLeft className="h-4 w-4" />
          {L("All Services", "Todos os Serviços")}
        </Link>
      </div>

      {/* Hero */}
      <section className="relative overflow-hidden">
        {/* Image placeholder — replace with real image via admin */}
        <div className="relative w-full h-56 sm:h-72 lg:h-96 bg-gradient-to-br from-emerald-950 via-teal-900 to-slate-900 flex items-center justify-center overflow-hidden">
          <div className="absolute inset-0 opacity-20" style={{ backgroundImage: "radial-gradient(circle at 30% 50%, #10b981 0%, transparent 50%), radial-gradient(circle at 70% 30%, #0d9488 0%, transparent 50%)" }} />
          <div className="relative z-10 text-center">
            <Brain className="h-16 w-16 text-emerald-400 mx-auto mb-3 opacity-60" />
            <p className="text-emerald-400/60 text-sm font-medium uppercase tracking-widest">{L("Hero image — upload via Admin › Settings", "Imagem hero — carregar via Admin › Definições")}</p>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
          <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/15 text-emerald-400 text-xs font-semibold uppercase tracking-wider mb-5">
            <Brain className="h-3.5 w-3.5" />
            {L("IPHM Certified Biohacking Coach · 20+ Years Clinical Experience", "Coach de Biohacking Certificado IPHM · 20+ Anos de Experiência Clínica")}
          </span>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground leading-tight mb-5 max-w-4xl">
            {L("Biohacking Coaching", "Coaching de Biohacking")}
            <span className="block text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-500">
              {L("Optimise Your Biology. Accelerate Your Recovery.", "Optimize a Sua Biologia. Acelere a Sua Recuperação.")}
            </span>
          </h1>
          <p className="text-base sm:text-lg text-muted-foreground leading-relaxed max-w-3xl mb-8">
            {L(
              "Biohacking is not a trend — it is the systematic application of science to your own biology. As an IPHM Certified Biohacking Coach with over 20 years of clinical practice in physical rehabilitation and sports therapy, Bruno integrates HRV monitoring, sleep science, gut health protocols, photobiomodulation, and circadian biology into every treatment plan. The result: patients recover faster, perform better, and stay healthier for longer.",
              "O biohacking não é uma tendência — é a aplicação sistemática de ciência à sua própria biologia. Como Coach de Biohacking Certificado pela IPHM com mais de 20 anos de prática clínica em reabilitação física e terapia desportiva, Bruno integra monitorização de HRV, ciência do sono, protocolos de saúde intestinal, fotobiomodulação e biologia circadiana em cada plano de tratamento. O resultado: os pacientes recuperam mais rapidamente, têm melhor desempenho e mantêm-se mais saudáveis por mais tempo."
            )}
          </p>

          {/* Key stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { value: "20+", label: L("Years Clinical Experience", "Anos de Exp. Clínica") },
              { value: "IPHM", label: L("Certified Coach", "Coach Certificado") },
              { value: "HRV", label: L("Data-Guided Protocols", "Protocolos por Dados") },
              { value: "1:1", label: L("Personalised Sessions", "Sessões Personalizadas") },
            ].map((s, i) => (
              <div key={i} className="text-center rounded-xl bg-card border border-border p-4">
                <p className="text-xl sm:text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-500">{s.value}</p>
                <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="bg-card py-14 sm:py-18">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-3">{L("What Your Body Gains", "O Que o Seu Corpo Ganha")}</h2>
          <p className="text-muted-foreground mb-8 max-w-2xl">{L("Every protocol is built from your clinical data — not a generic template.", "Cada protocolo é construído a partir dos seus dados clínicos — não de um modelo genérico.")}</p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {benefits.map((b, i) => (
              <div key={i} className="flex items-start gap-3 p-5 rounded-xl bg-background border border-border hover:border-emerald-500/30 transition-colors">
                <div className={`w-9 h-9 rounded-lg ${b.color} flex items-center justify-center shrink-0 mt-0.5`}>
                  <b.icon className="h-4 w-4" />
                </div>
                <p className="text-sm text-foreground leading-relaxed">{L(b.en, b.pt)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Who Is It For */}
      <section className="py-14 sm:py-18">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-start">
            <div>
              <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-4">{L("Who Benefits Most?", "Quem Beneficia Mais?")}</h2>
              <p className="text-muted-foreground leading-relaxed mb-6">
                {L(
                  "Biohacking Coaching is designed for anyone who wants to go beyond conventional treatment — whether you are recovering from injury, managing a chronic condition, or simply determined to perform and feel better than you ever have before. Bruno works with a wide range of patients, from elite athletes and executives to everyday people who want to take control of their health.",
                  "O Coaching de Biohacking é concebido para qualquer pessoa que queira ir além do tratamento convencional — seja a recuperar de uma lesão, a gerir uma condição crónica, ou simplesmente determinado a ter um desempenho e sentir-se melhor do que alguma vez sentiu. Bruno trabalha com uma vasta gama de pacientes, desde atletas de elite e executivos a pessoas comuns que querem assumir o controlo da sua saúde."
                )}
              </p>
              <div className="flex flex-wrap gap-2">
                {whoFor.map((tag, i) => (
                  <span key={i} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-sm text-emerald-400 font-medium">
                    <CheckCircle2 className="h-3.5 w-3.5" /> {tag}
                  </span>
                ))}
              </div>
            </div>
            <div>
              <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-4">{L("The Clinical Difference", "A Diferença Clínica")}</h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                {L(
                  "Traditional physiotherapy addresses the structural and mechanical aspects of injury. Biohacking Coaching adds a biological systems layer that most clinicians never consider: the inflammatory environment, hormonal balance, mitochondrial function, gut microbiome, and autonomic nervous system regulation.",
                  "A fisioterapia tradicional aborda os aspectos estruturais e mecânicos da lesão. O Coaching de Biohacking adiciona uma camada de sistemas biológicos que a maioria dos clínicos nunca considera: o ambiente inflamatório, o equilíbrio hormonal, a função mitocondrial, o microbioma intestinal e a regulação do sistema nervoso autónomo."
                )}
              </p>
              <p className="text-muted-foreground leading-relaxed">
                {L(
                  "When we optimise these systems alongside hands-on treatment, the outcomes are consistently superior. Patients heal faster, plateau less often, and maintain their results long after discharge — because their biology has fundamentally improved.",
                  "Quando optimizamos estes sistemas em paralelo com o tratamento manual, os resultados são consistentemente superiores. Os pacientes curam mais rapidamente, estacionam com menos frequência e mantêm os seus resultados muito depois da alta — porque a sua biologia melhorou fundamentalmente."
                )}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="bg-card py-14 sm:py-18">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-3">{L("How It Works", "Como Funciona")}</h2>
          <p className="text-muted-foreground mb-10 max-w-2xl">{L("A structured, data-driven process that adapts to your biology at every stage.", "Um processo estruturado e orientado por dados que se adapta à sua biologia em cada etapa.")}</p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {steps.map((s) => (
              <div key={s.num} className="relative">
                <div className={`w-14 h-14 rounded-2xl ${s.color} flex items-center justify-center mb-4`}>
                  <s.icon className="h-6 w-6" />
                </div>
                <span className="text-3xl font-black text-emerald-500/20 absolute top-0 right-0">{s.num}</span>
                <h3 className="font-bold text-foreground mb-2">{L(s.en_title, s.pt_title)}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{L(s.en_desc, s.pt_desc)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Science & Evidence */}
      <section className="py-14 sm:py-18">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-10">{L("Science & Evidence", "Ciência e Evidência")}</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[
              { icon: Activity, color: "bg-emerald-100 text-emerald-700", en_t: "HRV as a Clinical Biomarker", pt_t: "HRV como Biomarcador Clínico", en_d: "Heart Rate Variability is a validated, peer-reviewed measure of autonomic nervous system health, stress resilience, and recovery capacity. It guides training load decisions and predicts overtraining risk with high sensitivity.", pt_d: "A Variabilidade da Frequência Cardíaca é uma medida validada e revisada por pares da saúde do sistema nervoso autónomo, resiliência ao stress e capacidade de recuperação. Orienta decisões de carga de treino e prevê o risco de sobretreino com alta sensibilidade." },
              { icon: Zap, color: "bg-orange-100 text-orange-700", en_t: "Photobiomodulation", pt_t: "Fotobiomodulação", en_d: "MLS Laser Therapy uses specific wavelengths to stimulate mitochondrial activity, increase ATP production, reduce oxidative stress, and accelerate tissue repair. It is CE-marked, EU MDR-approved, and supported by extensive clinical evidence.", pt_d: "A Terapia Laser MLS usa comprimentos de onda específicos para estimular a actividade mitocondrial, aumentar a produção de ATP, reduzir o stress oxidativo e acelerar a reparação tecidual. Tem marcação CE, aprovação EU MDR e é suportada por ampla evidência clínica." },
              { icon: Moon, color: "bg-indigo-100 text-indigo-700", en_t: "Circadian Biology", pt_t: "Biologia Circadiana", en_d: "The 2017 Nobel Prize in Physiology or Medicine was awarded for research on circadian rhythm mechanisms. Aligning recovery interventions with the body's internal clock measurably improves healing rates, immune function, and hormonal regulation.", pt_d: "O Nobel de Fisiologia ou Medicina de 2017 foi atribuído por investigação sobre mecanismos do ritmo circadiano. Alinhar intervenções de recuperação com o relógio interno do corpo melhora mensuravelmente as taxas de cura, a função imunológica e a regulação hormonal." },
            ].map((item, i) => (
              <Card key={i} className="border border-border bg-card shadow-sm">
                <CardContent className="p-6">
                  <div className={`w-10 h-10 rounded-xl ${item.color} flex items-center justify-center mb-4`}>
                    <item.icon className="h-5 w-5" />
                  </div>
                  <h3 className="font-bold text-foreground mb-2">{L(item.en_t, item.pt_t)}</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">{L(item.en_d, item.pt_d)}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="bg-card py-14 sm:py-18">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-8">{L("Frequently Asked Questions", "Perguntas Frequentes")}</h2>
          <div className="space-y-3">
            {faqs.map((faq, i) => (
              <div key={i} className="border border-border rounded-xl overflow-hidden">
                <button
                  className="w-full flex items-center justify-between p-4 sm:p-5 text-left hover:bg-muted/30 transition-colors"
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                >
                  <span className="font-medium text-foreground text-sm sm:text-base pr-4">{L(faq.en_q, faq.pt_q)}</span>
                  <ChevronDown className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${openFaq === i ? "rotate-180" : ""}`} />
                </button>
                {openFaq === i && (
                  <div className="px-4 sm:px-5 pb-4 sm:pb-5 text-sm text-muted-foreground leading-relaxed border-t border-border pt-4">
                    {L(faq.en_a, faq.pt_a)}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Session Info + CTA */}
      <section className="py-14 sm:py-18">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500/10 rounded-full mb-6">
            <Clock className="h-4 w-4 text-emerald-400" />
            <span className="text-sm font-medium text-emerald-400">
              {L("Initial session: 60–90 min  |  Follow-up: 45–60 min  |  In-clinic + Remote options", "Sessão inicial: 60–90 min  |  Seguimento: 45–60 min  |  Presencial + opções remotas")}
            </span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-4">{L("Ready to Optimise Your Biology?", "Pronto para Optimizar a Sua Biologia?")}</h2>
          <p className="text-muted-foreground max-w-xl mx-auto mb-8">
            {L(
              "Book your initial biohacking consultation. We will review your health history, collect your baseline biometric data, and design your personalised protocol in a single comprehensive session.",
              "Marque a sua consulta de biohacking inicial. Iremos rever o seu histórico de saúde, recolher os seus dados biométricos de linha de base e conceber o seu protocolo personalizado numa única sessão abrangente."
            )}
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/signup">
              <Button size="lg" className="gap-2 w-full sm:w-auto bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white">
                {L("Book a Biohacking Consultation", "Agendar Consulta de Biohacking")} <ArrowRight className="h-5 w-5" />
              </Button>
            </Link>
            <Link href="/#services">
              <Button size="lg" variant="outline" className="w-full sm:w-auto">
                {L("View All Services", "Ver Todos os Serviços")}
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
