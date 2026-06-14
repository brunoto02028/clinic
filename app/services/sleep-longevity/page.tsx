"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  ArrowLeft, ArrowRight, Timer, CheckCircle2, ChevronDown,
  Clock, Moon, Sun, Brain, Heart, Zap, Shield, Activity, Dna, Star,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useLocale } from "@/hooks/use-locale";

export default function SleepLongevityPage() {
  const [mounted, setMounted] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [heroImageUrl, setHeroImageUrl] = useState<string | null>(null);
  const { locale } = useLocale();
  const isPt = locale === "pt-BR";

  useEffect(() => {
    setMounted(true);
    fetch('/api/settings').then(r => r.json()).then(d => {
      if (d.sleepImageUrl) setHeroImageUrl(d.sleepImageUrl);
    }).catch(() => {});
  }, []);
  if (!mounted) return null;

  const L = (en: string, pt: string) => isPt ? pt : en;

  const benefits = [
    { icon: Moon, color: "bg-indigo-100 text-indigo-700", en: "Optimised deep sleep and REM architecture to maximise overnight tissue repair and memory consolidation", pt: "Sono profundo e arquitectura REM optimizados para maximizar a reparação tecidual nocturna e consolidação da memória" },
    { icon: Sun, color: "bg-amber-100 text-amber-700", en: "Circadian rhythm alignment through strategic light exposure, meal timing, and temperature protocols", pt: "Alinhamento do ritmo circadiano através de exposição estratégica à luz, timing das refeições e protocolos de temperatura" },
    { icon: Dna, color: "bg-violet-100 text-violet-700", en: "Enhanced cellular autophagy (the body's cellular repair and clean-up process) through targeted fasting windows and sleep quality improvement", pt: "Autofagia celular aumentada (o processo de reparação e limpeza celular do corpo) através de janelas de jejum dirigidas e melhoria da qualidade do sono" },
    { icon: Heart, color: "bg-rose-100 text-rose-700", en: "Reduced systemic inflammation through sleep quality — a critical factor in chronic pain and injury recovery", pt: "Redução da inflamação sistémica através da qualidade do sono — um factor crítico na dor crónica e recuperação de lesões" },
    { icon: Brain, color: "bg-teal-100 text-teal-700", en: "Hormonal optimisation: natural growth hormone peaks, cortisol normalisation, and melatonin rhythm restoration", pt: "Optimização hormonal: picos naturais de hormona de crescimento, normalização do cortisol e restauração do ritmo da melatonina" },
    { icon: Shield, color: "bg-green-100 text-green-700", en: "Strengthened immune function — 70% of immune cell production occurs during deep sleep stages", pt: "Função imunológica fortalecida — 70% da produção de células imunitárias ocorre durante as fases de sono profundo" },
    { icon: Zap, color: "bg-orange-100 text-orange-700", en: "Personalised evening wind-down routine based on your chronotype, stress profile, and lifestyle constraints", pt: "Rotina de relaxamento nocturno personalizada com base no seu cronotipo, perfil de stress e constrangimentos de estilo de vida" },
    { icon: Activity, color: "bg-cyan-100 text-cyan-700", en: "Wearable sleep tracking integration with clinical interpretation of sleep stages, HRV trends, and recovery scores", pt: "Integração de rastreamento de sono por wearables com interpretação clínica de fases do sono, tendências de HRV e pontuações de recuperação" },
  ];

  const steps = [
    { num: "01", icon: Moon, color: "bg-indigo-100 text-indigo-700", en_title: "Sleep Quality Assessment", pt_title: "Avaliação da Qualidade do Sono", en_desc: "A comprehensive sleep assessment covering your sleep diary, chronotype (whether you are naturally a morning or evening person), current sleep architecture (if you own a wearable), light exposure habits, caffeine use, evening routine, bedroom environment, and any medical history that may affect sleep. We identify the root cause of poor sleep, not just the symptoms.", pt_desc: "Uma avaliação abrangente do sono cobrindo o seu diário de sono, cronotipo (se é naturalmente uma pessoa matinal ou nocturna), arquitectura actual do sono (se possui um wearable), hábitos de exposição à luz, consumo de cafeína, rotina nocturna, ambiente do quarto e qualquer histórico médico que possa afectar o sono. Identificamos a causa raiz do sono deficiente, não apenas os sintomas." },
    { num: "02", icon: Sun, color: "bg-amber-100 text-amber-700", en_title: "Circadian Mapping", pt_title: "Mapeamento Circadiano", en_desc: "We map your current light exposure patterns, meal timing, activity schedule, and temperature exposure across the 24-hour day to identify where your circadian signals are misaligned. Modern life — artificial evening light, irregular mealtimes, sedentary behaviour, and poor morning light exposure — systematically disrupts the internal clock that governs sleep quality.", pt_desc: "Mapeamos os seus padrões actuais de exposição à luz, timing das refeições, horário de actividade e exposição à temperatura ao longo do dia de 24 horas para identificar onde os seus sinais circadianos estão desalinhados. A vida moderna — luz artificial nocturna, refeições irregulares, comportamento sedentário e má exposição à luz matinal — perturba sistematicamente o relógio interno que governa a qualidade do sono." },
    { num: "03", icon: Brain, color: "bg-violet-100 text-violet-700", en_title: "Personalised Protocol", pt_title: "Protocolo Personalizado", en_desc: "Your sleep optimisation protocol is built around your specific patterns, constraints, and goals. It typically includes light therapy timing, strategic caffeine protocols, evening wind-down routines, temperature management, supplementation guidance (where evidence supports it), and bedroom environment optimisation. Protocols are practical — we design around your real life, not a theoretical ideal.", pt_desc: "O seu protocolo de optimização do sono é construído em torno dos seus padrões específicos, constrangimentos e objectivos. Tipicamente inclui timing de terapia de luz, protocolos estratégicos de cafeína, rotinas de relaxamento nocturno, gestão de temperatura, orientação de suplementação (quando suportada por evidências) e optimização do ambiente do quarto. Os protocolos são práticos — desenhamos em torno da sua vida real, não de um ideal teórico." },
    { num: "04", icon: Dna, color: "bg-teal-100 text-teal-700", en_title: "Longevity Integration", pt_title: "Integração de Longevidade", en_desc: "For patients interested in longevity outcomes beyond sleep, we extend protocols to include cellular repair optimisation (autophagy windows, fasting protocols), anti-inflammatory nutrition strategies, movement and exercise timing for circadian alignment, and evidence-based supplementation targeting healthspan markers. Sleep is the foundation; longevity is the architecture built upon it.", pt_desc: "Para pacientes interessados em resultados de longevidade além do sono, alargamos os protocolos para incluir optimização de reparação celular (janelas de autofagia, protocolos de jejum), estratégias de nutrição anti-inflamatória, timing de movimento e exercício para alinhamento circadiano, e suplementação baseada em evidências visando marcadores de saúde. O sono é a fundação; a longevidade é a arquitectura construída sobre ela." },
  ];

  const longevityPillars = [
    { icon: Moon, color: "bg-indigo-100 text-indigo-700", en_t: "Sleep Architecture", pt_t: "Arquitectura do Sono", en_d: "Deep sleep (N3) is when growth hormone is released and tissues repair. REM sleep consolidates learning and emotional regulation. We target both through circadian alignment and sleep pressure management.", pt_d: "O sono profundo (N3) é quando a hormona de crescimento é libertada e os tecidos se reparam. O sono REM consolida a aprendizagem e a regulação emocional. Visamos ambos através do alinhamento circadiano e gestão da pressão do sono." },
    { icon: Dna, color: "bg-violet-100 text-violet-700", en_t: "Cellular Autophagy", pt_t: "Autofagia Celular", en_d: "Autophagy — the cellular clean-up process that removes damaged proteins and organelles — peaks during sleep deprivation (strategic overnight fasting) and is a key mechanism in longevity. We design protocols to maximise this cellular renewal.", pt_d: "A autofagia — o processo de limpeza celular que remove proteínas e organelos danificados — atinge o pico durante o jejum nocturno estratégico e é um mecanismo chave na longevidade. Desenhamos protocolos para maximizar esta renovação celular." },
    { icon: Sun, color: "bg-amber-100 text-amber-700", en_t: "Circadian Biology", pt_t: "Biologia Circadiana", en_d: "Every cell in your body has its own molecular clock, synchronised by light. Disrupted circadian rhythms are linked to accelerated biological ageing, metabolic dysfunction, cardiovascular disease, and impaired immunity. Alignment reverses these processes.", pt_d: "Cada célula do seu corpo tem o seu próprio relógio molecular, sincronizado pela luz. Os ritmos circadianos perturbados estão ligados ao envelhecimento biológico acelerado, disfunção metabólica, doenças cardiovasculares e imunidade comprometida. O alinhamento reverte estes processos." },
  ];

  const faqs = [
    {
      en_q: "How does poor sleep affect injury recovery and chronic pain?",
      pt_q: "Como é que o sono deficiente afecta a recuperação de lesões e a dor crónica?",
      en_a: "Sleep is the primary window during which tissue repair occurs. Growth hormone — the most anabolic, tissue-building hormone in the body — is released almost exclusively during deep sleep (N3 stage). Inadequate deep sleep directly reduces growth hormone secretion, slowing collagen synthesis, muscle repair, and bone remodelling. Additionally, sleep deprivation is strongly pro-inflammatory: chronic short sleep elevates IL-6, TNF-alpha, and CRP — the same inflammatory markers that drive chronic pain. Addressing sleep quality is therefore not an adjunct to rehabilitation — it is a fundamental component of it.",
      pt_a: "O sono é a janela primária durante a qual ocorre a reparação tecidual. A hormona de crescimento — a hormona mais anabólica e construtora de tecidos do corpo — é libertada quase exclusivamente durante o sono profundo (fase N3). O sono profundo inadequado reduz directamente a secreção de hormona de crescimento, abrandando a síntese de colagénio, a reparação muscular e a remodelação óssea. Além disso, a privação de sono é fortemente pró-inflamatória: o sono curto crónico eleva IL-6, TNF-alfa e PCR — os mesmos marcadores inflamatórios que impulsionam a dor crónica. Abordar a qualidade do sono não é, portanto, um adjunto à reabilitação — é um componente fundamental dela.",
    },
    {
      en_q: "What is a chronotype and why does it matter?",
      pt_q: "O que é um cronotipo e por que é que importa?",
      en_a: "Your chronotype is your genetically-influenced preference for morning or evening activity — colloquially, whether you are a 'morning lark' or a 'night owl'. Chronotype is largely determined by clock gene variants and affects the timing of your cortisol awakening response, melatonin onset, core body temperature rhythm, and peak cognitive and physical performance windows. Designing a sleep protocol that fights your chronotype is ineffective and unsustainable. We assess your chronotype using validated tools and build protocols that work with your biology rather than against it.",
      pt_a: "O seu cronotipo é a sua preferência geneticamente influenciada para actividade matinal ou nocturna — coloquialmente, se é uma 'cotovia matinal' ou um 'mocho nocturno'. O cronotipo é amplamente determinado por variantes dos genes do relógio e afecta o timing da sua resposta de despertar ao cortisol, início da melatonina, ritmo de temperatura corporal central e janelas de pico de desempenho cognitivo e físico. Desenhar um protocolo de sono que luta contra o seu cronotipo é ineficaz e insustentável. Avaliamos o seu cronotipo usando ferramentas validadas e construímos protocolos que funcionam com a sua biologia em vez de contra ela.",
    },
    {
      en_q: "Is longevity coaching separate from physiotherapy treatment?",
      pt_q: "O coaching de longevidade é separado do tratamento de fisioterapia?",
      en_a: "No — longevity protocols are integrated directly into your treatment plan. Physiotherapy addresses the structural and mechanical aspects of recovery. Sleep and longevity coaching addresses the biological environment in which that recovery occurs. The two are deeply synergistic: improving sleep quality accelerates the outcomes of manual therapy, exercise rehabilitation, and electrotherapy modalities. We treat the whole person, not just the injury.",
      pt_a: "Não — os protocolos de longevidade são integrados directamente no seu plano de tratamento. A fisioterapia aborda os aspectos estruturais e mecânicos da recuperação. O coaching de sono e longevidade aborda o ambiente biológico em que essa recuperação ocorre. Os dois são profundamente sinérgicos: melhorar a qualidade do sono acelera os resultados da terapia manual, reabilitação por exercício e modalidades de electroterapia. Tratamos a pessoa inteira, não apenas a lesão.",
    },
    {
      en_q: "Do I need supplements to optimise my sleep?",
      pt_q: "Preciso de suplementos para optimizar o meu sono?",
      en_a: "No supplement replaces the impact of consistent sleep hygiene, circadian alignment, and stress management. However, for patients where the evidence is strong, we may discuss specific evidence-based options such as magnesium glycinate (for relaxation and sleep quality), ashwagandha (for HPA axis regulation), and melatonin (for circadian phase shifting — not as a sedative). We are conservative and evidence-led in supplementation recommendations, and we will never recommend a supplement that does not have a clear clinical rationale for your specific situation.",
      pt_a: "Nenhum suplemento substitui o impacto da higiene do sono consistente, alinhamento circadiano e gestão do stress. No entanto, para pacientes onde a evidência é forte, podemos discutir opções baseadas em evidências específicas como glicinnato de magnésio (para relaxamento e qualidade do sono), ashwagandha (para regulação do eixo HPA) e melatonina (para mudança de fase circadiana — não como sedativo). Somos conservadores e orientados por evidências nas recomendações de suplementação, e nunca recomendaremos um suplemento que não tenha uma justificação clínica clara para a sua situação específica.",
    },
    {
      en_q: "How quickly can I improve my sleep quality?",
      pt_q: "Com que rapidez posso melhorar a qualidade do meu sono?",
      en_a: "Most patients notice measurable improvements in sleep onset latency (how long it takes to fall asleep), subjective sleep quality, and morning energy within 1–2 weeks of implementing the initial protocol. Wearable sleep score improvements typically become visible within 2–4 weeks. Deeper biological changes — such as HRV improvements reflecting better autonomic recovery, and the resolution of chronic inflammatory markers — typically manifest over 8–12 weeks of consistent protocol adherence.",
      pt_a: "A maioria dos pacientes nota melhorias mensuráveis na latência do início do sono (quanto tempo demora a adormecer), qualidade subjectiva do sono e energia matinal dentro de 1–2 semanas após a implementação do protocolo inicial. Melhorias na pontuação de sono por wearables tipicamente tornam-se visíveis dentro de 2–4 semanas. Mudanças biológicas mais profundas — como melhorias de HRV reflectindo melhor recuperação autonómica, e a resolução de marcadores inflamatórios crónicos — tipicamente manifestam-se ao longo de 8–12 semanas de adesão consistente ao protocolo.",
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
        {/* Hero Banner */}
        <div className="relative w-full h-56 sm:h-72 lg:h-96 bg-gradient-to-br from-indigo-950 via-violet-900 to-slate-900 flex items-center justify-center overflow-hidden">
          {heroImageUrl && <img src={heroImageUrl} alt="Sleep & Longevity" className="absolute inset-0 w-full h-full object-cover" />}
          <div className="absolute inset-0 opacity-20" style={{ backgroundImage: "radial-gradient(circle at 30% 50%, #6366f1 0%, transparent 50%), radial-gradient(circle at 70% 30%, #8b5cf6 0%, transparent 50%)" }} />
          <div className="relative z-10 text-center">
            <Timer className="h-16 w-16 text-violet-400 mx-auto mb-3 opacity-60" />
            <p className="text-violet-400/60 text-sm font-medium uppercase tracking-widest">{L("Hero image — upload via Admin › Settings", "Imagem hero — carregar via Admin › Definições")}</p>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
          <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-violet-500/15 text-violet-400 text-xs font-semibold uppercase tracking-wider mb-5">
            <Timer className="h-3.5 w-3.5" />
            {L("Evidence-Based Sleep Science & Longevity Medicine", "Ciência do Sono Baseada em Evidências e Medicina da Longevidade")}
          </span>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground leading-tight mb-5 max-w-4xl">
            {L("Sleep Optimisation & Longevity Protocols", "Optimização do Sono e Protocolos de Longevidade")}
            <span className="block text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-indigo-500">
              {L("Sleep Better. Heal Faster. Live Longer.", "Durma Melhor. Cure mais Rápido. Viva mais Tempo.")}
            </span>
          </h1>
          <p className="text-base sm:text-lg text-muted-foreground leading-relaxed max-w-3xl mb-8">
            {L(
              "Sleep is the most powerful recovery tool the human body possesses — and the most underutilised in rehabilitation. During deep sleep, growth hormone is released, tissues are repaired, inflammation is regulated, and the nervous system consolidates motor learning from the day's treatment. Poor sleep does not just make you tired; it actively slows recovery, amplifies pain perception, disrupts hormonal balance, and accelerates biological ageing. Our evidence-based sleep and longevity protocols address the root causes of poor sleep and build the biological foundation for lasting health.",
              "O sono é a ferramenta de recuperação mais poderosa que o corpo humano possui — e a mais subutilizada na reabilitação. Durante o sono profundo, a hormona de crescimento é libertada, os tecidos são reparados, a inflamação é regulada e o sistema nervoso consolida a aprendizagem motora do tratamento do dia. O sono deficiente não o torna apenas cansado; abranda activamente a recuperação, amplifica a percepção da dor, perturba o equilíbrio hormonal e acelera o envelhecimento biológico. Os nossos protocolos de sono e longevidade baseados em evidências abordam as causas raiz do sono deficiente e constroem a fundação biológica para uma saúde duradoura."
            )}
          </p>

          {/* Key stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { value: "70%", label: L("Immune cells made during deep sleep", "Células imunes produzidas no sono profundo") },
              { value: "90min", label: L("Growth hormone peak in N3 sleep", "Pico de GH no sono N3") },
              { value: "4–8w", label: L("Measurable improvement timeline", "Prazo de melhoria mensurável") },
              { value: "1:1", label: L("Personalised protocol", "Protocolo personalizado") },
            ].map((s, i) => (
              <div key={i} className="text-center rounded-xl bg-card border border-border p-4">
                <p className="text-xl sm:text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-indigo-500">{s.value}</p>
                <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="bg-card py-14 sm:py-18">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-3">{L("What Better Sleep Unlocks", "O Que o Sono Melhorado Desbloqueia")}</h2>
          <p className="text-muted-foreground mb-8 max-w-2xl">{L("Sleep quality improvements cascade through every biological system — from hormones to immunity to tissue repair.", "As melhorias na qualidade do sono cascateiam por todos os sistemas biológicos — desde hormonas a imunidade até reparação tecidual.")}</p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {benefits.map((b, i) => (
              <div key={i} className="flex items-start gap-3 p-5 rounded-xl bg-background border border-border hover:border-violet-500/30 transition-colors">
                <div className={`w-9 h-9 rounded-lg ${b.color} flex items-center justify-center shrink-0 mt-0.5`}>
                  <b.icon className="h-4 w-4" />
                </div>
                <p className="text-sm text-foreground leading-relaxed">{L(b.en, b.pt)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-14 sm:py-18">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-3">{L("How It Works", "Como Funciona")}</h2>
          <p className="text-muted-foreground mb-10 max-w-2xl">{L("From sleep assessment to longevity protocol — a structured, science-led process.", "Da avaliação do sono ao protocolo de longevidade — um processo estruturado e orientado pela ciência.")}</p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {steps.map((s) => (
              <div key={s.num} className="relative">
                <div className={`w-14 h-14 rounded-2xl ${s.color} flex items-center justify-center mb-4`}>
                  <s.icon className="h-6 w-6" />
                </div>
                <span className="text-3xl font-black text-violet-500/20 absolute top-0 right-0">{s.num}</span>
                <h3 className="font-bold text-foreground mb-2">{L(s.en_title, s.pt_title)}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{L(s.en_desc, s.pt_desc)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Longevity Pillars */}
      <section className="bg-card py-14 sm:py-18">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-3">{L("The Three Pillars of Biological Longevity", "Os Três Pilares da Longevidade Biológica")}</h2>
          <p className="text-muted-foreground mb-10 max-w-2xl">{L("Sleep is not isolated — it is the hub through which circadian biology and cellular renewal intersect.", "O sono não é isolado — é o centro através do qual a biologia circadiana e a renovação celular se intersectam.")}</p>
          <div className="grid sm:grid-cols-3 gap-6">
            {longevityPillars.map((item, i) => (
              <Card key={i} className="border border-border bg-background shadow-sm">
                <CardContent className="p-6">
                  <div className={`w-12 h-12 rounded-xl ${item.color} flex items-center justify-center mb-5`}>
                    <item.icon className="h-6 w-6" />
                  </div>
                  <h3 className="font-bold text-foreground mb-3 text-lg">{L(item.en_t, item.pt_t)}</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">{L(item.en_d, item.pt_d)}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-14 sm:py-18">
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
      <section className="bg-card py-14 sm:py-18">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-violet-500/10 rounded-full mb-6">
            <Clock className="h-4 w-4 text-violet-400" />
            <span className="text-sm font-medium text-violet-400">
              {L("Initial consultation: 60–90 min  |  4-week programme  |  In-clinic + Remote", "Consulta inicial: 60–90 min  |  Programa de 4 semanas  |  Presencial + Remoto")}
            </span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-4">{L("Ready to Sleep Better and Live Longer?", "Pronto para Dormir Melhor e Viver mais Tempo?")}</h2>
          <p className="text-muted-foreground max-w-xl mx-auto mb-8">
            {L(
              "Book your sleep and longevity consultation. We will assess your current sleep quality, map your circadian patterns, and design a personalised protocol that integrates seamlessly with your rehabilitation or performance goals.",
              "Marque a sua consulta de sono e longevidade. Avaliaremos a sua qualidade actual de sono, mapearemos os seus padrões circadianos e desenharemos um protocolo personalizado que se integra perfeitamente com os seus objectivos de reabilitação ou performance."
            )}
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/signup">
              <Button size="lg" className="gap-2 w-full sm:w-auto bg-gradient-to-r from-violet-500 to-indigo-600 hover:from-violet-600 hover:to-indigo-700 text-white">
                {L("Book Sleep Consultation", "Agendar Consulta de Sono")} <ArrowRight className="h-5 w-5" />
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
