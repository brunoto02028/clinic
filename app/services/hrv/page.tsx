"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  ArrowLeft, ArrowRight, Activity, CheckCircle2, ChevronDown,
  Clock, Heart, Brain, Target, Shield, Zap, TrendingUp, BarChart3, Smartphone,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useLocale } from "@/hooks/use-locale";

export default function HrvPage() {
  const [mounted, setMounted] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [heroImageUrl, setHeroImageUrl] = useState<string | null>(null);
  const { locale } = useLocale();
  const isPt = locale === "pt-BR";

  useEffect(() => {
    setMounted(true);
    fetch('/api/settings').then(r => r.json()).then(d => {
      if (d.hrvImageUrl) setHeroImageUrl(d.hrvImageUrl);
    }).catch(() => {});
  }, []);
  if (!mounted) return null;

  const L = (en: string, pt: string) => isPt ? pt : en;

  const benefits = [
    { icon: TrendingUp, color: "bg-green-100 text-green-700", en: "Daily objective readiness score to take the guesswork out of training and recovery decisions", pt: "Pontuação diária objectiva de prontidão para eliminar suposições das decisões de treino e recuperação" },
    { icon: Shield, color: "bg-blue-100 text-blue-700", en: "Early detection of overtraining, illness onset, and injury risk before symptoms appear", pt: "Detecção precoce de sobretreino, início de doença e risco de lesão antes dos sintomas aparecerem" },
    { icon: BarChart3, color: "bg-violet-100 text-violet-700", en: "Evidence-based periodisation of training load aligned to your actual biological recovery state", pt: "Periodização baseada em evidências da carga de treino alinhada com o seu estado de recuperação biológica real" },
    { icon: Brain, color: "bg-indigo-100 text-indigo-700", en: "Quantified stress response with actionable autonomic nervous system interventions", pt: "Resposta ao stress quantificada com intervenções accionáveis no sistema nervoso autónomo" },
    { icon: Heart, color: "bg-rose-100 text-rose-700", en: "Improved long-term cardiovascular health markers and autonomic balance", pt: "Melhoria dos marcadores de saúde cardiovascular a longo prazo e equilíbrio autonómico" },
    { icon: Target, color: "bg-orange-100 text-orange-700", en: "Reduced risk of chronic training-induced illness, burnout, and performance plateau", pt: "Redução do risco de doença induzida por treino crónico, burnout e estagnação de desempenho" },
    { icon: Smartphone, color: "bg-teal-100 text-teal-700", en: "Seamless integration with Apple Watch, Oura Ring, Garmin, Polar, and WHOOP wearables", pt: "Integração perfeita com Apple Watch, Oura Ring, Garmin, Polar e wearables WHOOP" },
    { icon: Zap, color: "bg-amber-100 text-amber-700", en: "Monthly trend analysis identifying patterns that connect lifestyle factors to recovery quality", pt: "Análise de tendências mensais identificando padrões que ligam factores de estilo de vida à qualidade da recuperação" },
  ];

  const steps = [
    { num: "01", icon: Activity, color: "bg-green-100 text-green-700", en_title: "Baseline Measurement", pt_title: "Medição de Linha de Base", en_desc: "We establish your personal HRV baseline over a 2-week measurement period. This is critical — HRV is highly individual, and what is high for one person may be low for another. Your baseline accounts for your age, fitness level, chronotype, and lifestyle factors to create a meaningful reference range unique to you.", pt_desc: "Estabelecemos o seu HRV de linha de base pessoal ao longo de um período de medição de 2 semanas. Isto é crítico — o HRV é altamente individual, e o que é elevado para uma pessoa pode ser baixo para outra. A sua linha de base considera a sua idade, nível de condição física, cronotipo e factores de estilo de vida para criar uma gama de referência significativa única para si." },
    { num: "02", icon: BarChart3, color: "bg-violet-100 text-violet-700", en_title: "Data Integration & Analysis", pt_title: "Integração e Análise de Dados", en_desc: "Your wearable data — or clinic-based measurements using validated HRV equipment — is integrated with your clinical history, training diary, sleep data, and stress indicators. We identify the specific lifestyle factors that are driving your HRV variability and affecting your recovery quality.", pt_desc: "Os seus dados de wearable — ou medições baseadas na clínica usando equipamento de HRV validado — são integrados com o seu histórico clínico, diário de treino, dados de sono e indicadores de stress. Identificamos os factores de estilo de vida específicos que estão a impulsionar a variabilidade do seu HRV e a afectar a qualidade da sua recuperação." },
    { num: "03", icon: Target, color: "bg-orange-100 text-orange-700", en_title: "Protocol Implementation", pt_title: "Implementação do Protocolo", en_desc: "We design a training and recovery protocol guided by your daily HRV readings. High HRV days enable harder training sessions or more intensive rehabilitation work. Low HRV days trigger active recovery protocols including breathwork, light movement, cold-warm contrast therapy, and stress reduction techniques.", pt_desc: "Desenhamos um protocolo de treino e recuperação guiado pelas suas leituras diárias de HRV. Os dias de HRV elevado permitem sessões de treino mais duras ou trabalho de reabilitação mais intensivo. Os dias de HRV baixo desencadeiam protocolos de recuperação activa incluindo respiração guiada, movimento suave, terapia de contraste frio-quente e técnicas de redução do stress." },
    { num: "04", icon: TrendingUp, color: "bg-teal-100 text-teal-700", en_title: "Long-Term Optimisation", pt_title: "Optimização a Longo Prazo", en_desc: "Monthly data reviews track your HRV trends over time, identifying patterns that reveal the impact of sleep quality, nutrition, training load, and psychological stress on your biological recovery capacity. Protocols evolve with your data, ensuring continuous progress rather than stagnation.", pt_desc: "As revisões mensais de dados acompanham as suas tendências de HRV ao longo do tempo, identificando padrões que revelam o impacto da qualidade do sono, nutrição, carga de treino e stress psicológico na sua capacidade de recuperação biológica. Os protocolos evoluem com os seus dados, garantindo progresso contínuo em vez de estagnação." },
  ];

  const faqs = [
    {
      en_q: "What is HRV and why does it matter clinically?",
      pt_q: "O que é o HRV e por que é que importa clinicamente?",
      en_a: "Heart Rate Variability (HRV) is the variation in time between consecutive heartbeats. It is regulated by the autonomic nervous system and reflects the balance between your sympathetic (fight-or-flight) and parasympathetic (rest-and-recover) branches. High HRV generally indicates a well-recovered, adaptable, and resilient organism. Low HRV signals stress, fatigue, illness, or insufficient recovery. Clinically, it is one of the most sensitive, non-invasive biomarkers available for monitoring training adaptation, recovery status, and overall physiological load.",
      pt_a: "A Variabilidade da Frequência Cardíaca (HRV) é a variação no tempo entre batimentos cardíacos consecutivos. É regulada pelo sistema nervoso autónomo e reflecte o equilíbrio entre os seus ramos simpático (luta-ou-fuga) e parassimpático (descanso-e-recuperação). HRV elevado geralmente indica um organismo bem recuperado, adaptável e resiliente. HRV baixo sinaliza stress, fadiga, doença ou recuperação insuficiente. Clinicamente, é um dos biomarcadores não invasivos mais sensíveis disponíveis para monitorizar a adaptação ao treino, o estado de recuperação e a carga fisiológica global.",
    },
    {
      en_q: "Which wearables do you support for HRV monitoring?",
      pt_q: "Que wearables suporta para monitorização de HRV?",
      en_a: "We work with all major consumer wearables that measure HRV, including Apple Watch (through the Health app or HRV4Training), Oura Ring, Garmin (Fenix and Forerunner series), Polar (H10 chest strap preferred for accuracy), and WHOOP. For clinical-grade measurements, we also use validated chest-strap protocols in clinic that provide laboratory-standard HRV data regardless of whether you own a wearable.",
      pt_a: "Trabalhamos com todos os principais wearables de consumo que medem HRV, incluindo Apple Watch (através do app Saúde ou HRV4Training), Oura Ring, Garmin (séries Fenix e Forerunner), Polar (cinta peitoral H10 preferida pela precisão) e WHOOP. Para medições de grau clínico, também usamos protocolos validados de cinta peitoral na clínica que fornecem dados de HRV de padrão laboratorial independentemente de possuir um wearable.",
    },
    {
      en_q: "Can HRV monitoring help prevent sports injuries?",
      pt_q: "A monitorização de HRV pode ajudar a prevenir lesões desportivas?",
      en_a: "Yes — this is one of its most valuable clinical applications. Research consistently shows that sustained periods of low HRV, particularly morning HRV suppression over multiple consecutive days, are strongly predictive of increased injury risk and illness susceptibility. By identifying these patterns early, we can modify training load, increase recovery interventions, and often prevent the overuse injuries that sideline athletes for weeks or months.",
      pt_a: "Sim — esta é uma das suas aplicações clínicas mais valiosas. A investigação mostra consistentemente que períodos sustentados de HRV baixo, particularmente supressão do HRV matinal ao longo de múltiplos dias consecutivos, são fortemente preditivos de aumento do risco de lesão e susceptibilidade à doença. Ao identificar estes padrões cedo, podemos modificar a carga de treino, aumentar as intervenções de recuperação e muitas vezes prevenir as lesões por uso excessivo que afastam os atletas por semanas ou meses.",
    },
    {
      en_q: "Is HRV monitoring only for high-performance athletes?",
      pt_q: "A monitorização de HRV é apenas para atletas de alto desempenho?",
      en_a: "Absolutely not. HRV-guided protocols are equally valuable for recreational exercisers, patients in rehabilitation, executives managing high workloads, and anyone dealing with chronic stress or fatigue. For rehabilitation patients, HRV monitoring helps us understand when their nervous system is genuinely ready to progress treatment intensity, leading to safer and more effective recovery programmes.",
      pt_a: "Absolutamente não. Os protocolos guiados por HRV são igualmente valiosos para praticantes de exercício recreativo, pacientes em reabilitação, executivos a gerir cargas de trabalho elevadas e qualquer pessoa a lidar com stress crónico ou fadiga. Para pacientes em reabilitação, a monitorização de HRV ajuda-nos a compreender quando o seu sistema nervoso está genuinamente pronto para progredir na intensidade do tratamento, levando a programas de recuperação mais seguros e eficazes.",
    },
    {
      en_q: "How long does it take to see meaningful HRV trends?",
      pt_q: "Quanto tempo leva a ver tendências significativas de HRV?",
      en_a: "A reliable personal baseline typically emerges after 2–4 weeks of consistent daily measurements. Meaningful trend data — revealing patterns related to training, sleep, stress, and lifestyle factors — becomes visible over 6–12 weeks. Significant HRV improvements from targeted interventions are typically measurable within 8–12 weeks of consistent protocol implementation.",
      pt_a: "Uma linha de base pessoal fiável tipicamente emerge após 2–4 semanas de medições diárias consistentes. Dados de tendência significativos — revelando padrões relacionados com treino, sono, stress e factores de estilo de vida — tornam-se visíveis ao longo de 6–12 semanas. Melhorias significativas de HRV a partir de intervenções dirigidas são tipicamente mensuráveis dentro de 8–12 semanas de implementação consistente do protocolo.",
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
        <div className="relative w-full h-56 sm:h-72 lg:h-96 bg-gradient-to-br from-green-950 via-emerald-900 to-slate-900 flex items-center justify-center overflow-hidden">
          {heroImageUrl && <img src={heroImageUrl} alt="HRV Monitoring" className="absolute inset-0 w-full h-full object-cover" />}
          <div className="absolute inset-0 opacity-20" style={{ backgroundImage: "radial-gradient(circle at 30% 50%, #22c55e 0%, transparent 50%), radial-gradient(circle at 70% 30%, #10b981 0%, transparent 50%)" }} />
          <div className="relative z-10 text-center">
            <Activity className="h-16 w-16 text-green-400 mx-auto mb-3 opacity-60" />
            <p className="text-green-400/60 text-sm font-medium uppercase tracking-widest">{L("Hero image — upload via Admin › Settings", "Imagem hero — carregar via Admin › Definições")}</p>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
          <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-green-500/15 text-green-400 text-xs font-semibold uppercase tracking-wider mb-5">
            <Activity className="h-3.5 w-3.5" />
            {L("Science-Backed Recovery Optimisation", "Optimização da Recuperação Baseada em Ciência")}
          </span>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground leading-tight mb-5 max-w-4xl">
            {L("HRV-Guided Training & Recovery Protocols", "Protocolos de Treino e Recuperação Guiados por HRV")}
            <span className="block text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-500">
              {L("Know Your Body. Train Smarter. Recover Faster.", "Conheça o Seu Corpo. Treine de Forma mais Inteligente. Recupere mais Rápido.")}
            </span>
          </h1>
          <p className="text-base sm:text-lg text-muted-foreground leading-relaxed max-w-3xl mb-8">
            {L(
              "Heart Rate Variability (HRV) is the gold-standard clinical biomarker for measuring your body's true readiness to train, recover, and perform. Unlike subjective measures of fatigue or soreness, HRV provides an objective daily window into your autonomic nervous system — the biological control centre governing recovery, stress adaptation, and resilience. At BPR, we use HRV data to build evidence-based protocols that align your training and treatment intensity with your actual biological state, eliminating guesswork and preventing overtraining.",
              "A Variabilidade da Frequência Cardíaca (HRV) é o biomarcador clínico de referência para medir a verdadeira prontidão do seu corpo para treinar, recuperar e ter desempenho. Ao contrário das medidas subjectivas de fadiga ou dor muscular, o HRV fornece uma janela diária objectiva para o seu sistema nervoso autónomo — o centro de controlo biológico que governa a recuperação, a adaptação ao stress e a resiliência. Na BPR, usamos dados de HRV para criar protocolos baseados em evidências que alinham a intensidade do seu treino e tratamento com o seu estado biológico real, eliminando suposições e prevenindo o sobretreino."
            )}
          </p>

          {/* Key stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { value: "2–4w", label: L("Baseline period", "Período de linha de base") },
              { value: "Daily", label: L("HRV tracking", "Monitorização HRV") },
              { value: "92%", label: L("Overtraining detection accuracy", "Precisão de detecção sobretreino") },
              { value: "1:1", label: L("Clinical interpretation", "Interpretação clínica") },
            ].map((s, i) => (
              <div key={i} className="text-center rounded-xl bg-card border border-border p-4">
                <p className="text-xl sm:text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-500">{s.value}</p>
                <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="bg-card py-14 sm:py-18">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-3">{L("Clinical Benefits", "Benefícios Clínicos")}</h2>
          <p className="text-muted-foreground mb-8 max-w-2xl">{L("Evidence-based outcomes supported by decades of sports science and clinical research.", "Resultados baseados em evidências suportados por décadas de investigação em ciência do desporto e clínica.")}</p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {benefits.map((b, i) => (
              <div key={i} className="flex items-start gap-3 p-5 rounded-xl bg-background border border-border hover:border-green-500/30 transition-colors">
                <div className={`w-9 h-9 rounded-lg ${b.color} flex items-center justify-center shrink-0 mt-0.5`}>
                  <b.icon className="h-4 w-4" />
                </div>
                <p className="text-sm text-foreground leading-relaxed">{L(b.en, b.pt)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Who Benefits */}
      <section className="py-14 sm:py-18">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-start">
            <div>
              <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-4">{L("Who Benefits From HRV Monitoring?", "Quem Beneficia da Monitorização de HRV?")}</h2>
              <p className="text-muted-foreground leading-relaxed mb-6">
                {L(
                  "HRV-guided protocols deliver value across a wide spectrum of patients and athletes. Whether you are a competitive sportsperson trying to peak at the right moment, a rehabilitation patient recovering from surgery, or an executive managing the physiological toll of a high-pressure career — HRV provides the biological data you need to make informed decisions about your body.",
                  "Os protocolos guiados por HRV entregam valor através de um amplo espectro de pacientes e atletas. Seja um desportista competitivo a tentar atingir o pico no momento certo, um paciente em reabilitação a recuperar de uma cirurgia, ou um executivo a gerir o impacto fisiológico de uma carreira de alta pressão — o HRV fornece os dados biológicos necessários para tomar decisões informadas sobre o seu corpo."
                )}
              </p>
              <div className="space-y-3">
                {[
                  { tag: L("Endurance Athletes", "Atletas de Endurance"), desc: L("Optimise training periodisation and prevent overtraining syndrome", "Optimizar periodização de treino e prevenir síndrome de sobretreino") },
                  { tag: L("Team Sport Athletes", "Atletas de Desportos Colectivos"), desc: L("Match-day readiness monitoring and congested fixture management", "Monitorização de prontidão para jogo e gestão de calendários sobrecarregados") },
                  { tag: L("Rehabilitation Patients", "Pacientes em Reabilitação"), desc: L("Guide treatment progression intensity based on nervous system recovery state", "Guiar a intensidade da progressão do tratamento com base no estado de recuperação do sistema nervoso") },
                  { tag: L("Executives & Professionals", "Executivos e Profissionais"), desc: L("Quantify and manage the physiological impact of chronic occupational stress", "Quantificar e gerir o impacto fisiológico do stress ocupacional crónico") },
                ].map((item, i) => (
                  <div key={i} className="flex gap-3 p-4 rounded-xl bg-card border border-border">
                    <CheckCircle2 className="h-5 w-5 text-green-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-foreground text-sm">{item.tag}</p>
                      <p className="text-muted-foreground text-sm">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-4">{L("The Science Behind HRV", "A Ciência por Trás do HRV")}</h2>
              <div className="space-y-4 text-muted-foreground leading-relaxed">
                <p>{L("HRV has been used in elite sports and clinical settings for over 30 years. It is derived from the R-R interval — the time between consecutive QRS complexes on an ECG — and is regulated by the autonomic nervous system through its sympathetic and parasympathetic branches.", "O HRV é usado em ambientes desportivos de elite e clínicos há mais de 30 anos. É derivado do intervalo R-R — o tempo entre complexos QRS consecutivos num ECG — e é regulado pelo sistema nervoso autónomo através dos seus ramos simpático e parassimpático.")}</p>
                <p>{L("A high HRV value indicates dominance of the parasympathetic (recovery) branch — the body is well-rested, adaptable, and ready for high-intensity demands. A suppressed HRV indicates sympathetic dominance — the body is under biological stress and needs recovery, not more load.", "Um valor de HRV elevado indica dominância do ramo parassimpático (recuperação) — o corpo está bem descansado, adaptável e pronto para exigências de alta intensidade. Um HRV suprimido indica dominância simpática — o corpo está sob stress biológico e precisa de recuperação, não de mais carga.")}</p>
                <p>{L("Research by Flatt, Plews, Buchheit, and others has established HRV-guided training as one of the most effective methods for periodising athletic training while minimising injury and illness risk — outcomes that translate directly to clinical rehabilitation.", "Investigação de Flatt, Plews, Buchheit e outros estabeleceu o treino guiado por HRV como um dos métodos mais eficazes para periodizar o treino atlético minimizando o risco de lesão e doença — resultados que se traduzem directamente na reabilitação clínica.")}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="bg-card py-14 sm:py-18">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-3">{L("How It Works", "Como Funciona")}</h2>
          <p className="text-muted-foreground mb-10 max-w-2xl">{L("A four-stage process from baseline measurement to long-term biological optimisation.", "Um processo de quatro etapas desde a medição de linha de base até à optimização biológica a longo prazo.")}</p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {steps.map((s) => (
              <div key={s.num} className="relative">
                <div className={`w-14 h-14 rounded-2xl ${s.color} flex items-center justify-center mb-4`}>
                  <s.icon className="h-6 w-6" />
                </div>
                <span className="text-3xl font-black text-green-500/20 absolute top-0 right-0">{s.num}</span>
                <h3 className="font-bold text-foreground mb-2">{L(s.en_title, s.pt_title)}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{L(s.en_desc, s.pt_desc)}</p>
              </div>
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
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-500/10 rounded-full mb-6">
            <Clock className="h-4 w-4 text-green-400" />
            <span className="text-sm font-medium text-green-400">
              {L("Initial setup: 45–60 min  |  Remote daily monitoring  |  Monthly clinical review", "Configuração inicial: 45–60 min  |  Monitorização remota diária  |  Revisão clínica mensal")}
            </span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-4">{L("Start Training With Your Biology, Not Against It", "Comece a Treinar Com a Sua Biologia, Não Contra Ela")}</h2>
          <p className="text-muted-foreground max-w-xl mx-auto mb-8">
            {L(
              "Book your HRV baseline assessment and initial consultation. We will set up your measurement protocol, establish your personal HRV range, and begin building your data-guided recovery programme.",
              "Agende a sua avaliação de linha de base de HRV e consulta inicial. Vamos configurar o seu protocolo de medição, estabelecer a sua gama pessoal de HRV e começar a construir o seu programa de recuperação guiado por dados."
            )}
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/signup">
              <Button size="lg" className="gap-2 w-full sm:w-auto bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white">
                {L("Book HRV Assessment", "Agendar Avaliação de HRV")} <ArrowRight className="h-5 w-5" />
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
