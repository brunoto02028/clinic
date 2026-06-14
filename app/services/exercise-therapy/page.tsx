"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft, ArrowRight, Dumbbell, CheckCircle2, ChevronDown,
  Clock, Activity, Shield, Heart, Target, Users,
  Brain, Zap, Star, Play, BarChart3, RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useLocale } from "@/hooks/use-locale";

export default function ExerciseTherapyPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const { locale } = useLocale();
  const isPt = locale === "pt-BR";
  const L = (en: string, pt: string) => isPt ? pt : en;

  const tracks = [
    {
      icon: RefreshCw,
      color: "bg-emerald-100 text-emerald-700",
      badge: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
      en_label: "Rehabilitation Track",
      pt_label: "Via Reabilitação",
      en_title: "Recovering from Injury or Surgery",
      pt_title: "A Recuperar de Lesão ou Cirurgia",
      en_desc: "A structured, progressive exercise programme designed around your specific diagnosis, surgical protocol, and stage of tissue healing. Each session advances you systematically from pain control and range of motion → strength rebuilding → neuromuscular re-education → return to full function. Your programme is updated at every stage, and exercises are available as video demonstrations in your patient portal for safe home practice.",
      pt_desc: "Um programa de exercícios estruturado e progressivo concebido em torno do seu diagnóstico específico, protocolo cirúrgico e fase de cicatrização tecidual. Cada sessão avança-o sistematicamente do controlo da dor e amplitude de movimento → reconstrução de força → reeducação neuromuscular → retorno à função plena. O seu programa é atualizado em cada fase, e os exercícios estão disponíveis como demonstrações em vídeo no portal do paciente para prática domiciliar segura.",
      items: [
        L("Post-surgical rehabilitation (ACL, knee replacement, shoulder, spine)", "Reabilitação pós-cirúrgica (LCA, prótese de joelho, ombro, coluna)"),
        L("Sports injury recovery and return-to-sport clearance", "Recuperação de lesão desportiva e liberação para retorno ao desporto"),
        L("Fracture rehabilitation (post-cast and post-surgery)", "Reabilitação de fraturas (pós-gesso e pós-cirurgia)"),
        L("Chronic pain conditions — graded activity and pain neuroscience", "Condições de dor crónica — atividade graduada e neurociência da dor"),
        L("Muscle atrophy and weakness from immobilisation", "Atrofia muscular e fraqueza por imobilização"),
      ],
    },
    {
      icon: Shield,
      color: "bg-blue-100 text-blue-700",
      badge: "bg-blue-500/15 text-blue-400 border-blue-500/20",
      en_label: "Prevention & Supervision Track",
      pt_label: "Via Prevenção & Supervisão",
      en_title: "Healthy? You Still Belong Here.",
      pt_title: "Saudável? Também É Para Si.",
      en_desc: "You do not need an injury to benefit from professional exercise supervision. Many of the musculoskeletal problems we treat daily — rotator cuff tears, knee tendinopathy, lumbar disc problems — develop from years of poorly executed movement patterns in training or daily life. Working with a therapist from the outset ensures you build strength, mobility, and conditioning on a foundation of correct mechanics. We train movement quality first, load second.",
      pt_desc: "Não precisa de uma lesão para beneficiar de supervisão profissional de exercício. Muitos dos problemas musculoesqueléticos que tratamos diariamente — roturas do manguito rotador, tendinopatia do joelho, problemas de disco lombar — desenvolvem-se de anos de padrões de movimento mal executados no treino ou na vida diária. Trabalhar com um terapeuta desde o início garante que constrói força, mobilidade e condicionamento numa base de mecânica correcta. Treinamos a qualidade do movimento primeiro, a carga depois.",
      items: [
        L("Supervised gym training with clinical oversight", "Treino supervisionado em ginásio com supervisão clínica"),
        L("Injury prevention programmes for regular exercisers", "Programas de prevenção de lesões para praticantes regulares"),
        L("Correct exercise technique from day one", "Técnica de exercício correcta desde o primeiro dia"),
        L("Return to exercise after a long period of inactivity", "Retorno ao exercício após longo período de inatividade"),
        L("Pre-season conditioning and load management for athletes", "Condicionamento pré-época e gestão de carga para atletas"),
      ],
    },
    {
      icon: Brain,
      color: "bg-violet-100 text-violet-700",
      badge: "bg-violet-500/15 text-violet-400 border-violet-500/20",
      en_label: "Movement Therapy Track",
      pt_label: "Via Terapia do Movimento",
      en_title: "Correcting How Your Body Moves",
      pt_title: "Corrigir Como o Seu Corpo Se Move",
      en_desc: "Kinesiotherapy — the therapeutic application of movement science — addresses dysfunctional motor patterns, postural imbalances, and neuromuscular coordination deficits. Using movement analysis, we identify which muscles are underactive, which are compensating, and where movement efficiency is being lost. Corrective exercise then retrains the nervous system to recruit muscles in the right sequence, at the right time, with the right load — eliminating the root cause of recurring pain and injury.",
      pt_desc: "A cinesioterapia — a aplicação terapêutica da ciência do movimento — aborda padrões motores disfuncionais, desequilíbrios posturais e défices de coordenação neuromuscular. Usando análise do movimento, identificamos quais músculos estão sub-ativos, quais estão a compensar e onde a eficiência do movimento está a ser perdida. O exercício corretivo então reeduca o sistema nervoso para recrutar os músculos na sequência correcta, no momento certo, com a carga certa — eliminando a causa raiz de dor e lesões recorrentes.",
      items: [
        L("Postural correction — desk workers, drivers, manual labour", "Correção postural — trabalhadores de secretária, condutores, trabalho manual"),
        L("Dysfunctional movement patterns causing recurrent injury", "Padrões de movimento disfuncionais causando lesões recorrentes"),
        L("Neuromuscular re-education post-injury or post-surgery", "Reeducação neuromuscular pós-lesão ou pós-cirurgia"),
        L("Balance, proprioception, and coordination training", "Treino de equilíbrio, propriocepção e coordenação"),
        L("Asymmetry correction — left/right imbalances affecting performance", "Correção de assimetria — desequilíbrios esquerdo/direito afectando a performance"),
      ],
    },
    {
      icon: Star,
      color: "bg-amber-100 text-amber-700",
      badge: "bg-amber-500/15 text-amber-400 border-amber-500/20",
      en_label: "Performance Track",
      pt_label: "Via Performance",
      en_title: "Optimise. Don't Just Maintain.",
      pt_title: "Optimizar. Não Apenas Manter.",
      en_desc: "For athletes, active individuals, and performance-focused patients who want to go beyond rehabilitation and standard fitness. We apply principles from sports science, biomechanics, and exercise physiology to build strength, power, and movement efficiency that translates directly into your sport or activity. Combined with HRV monitoring, load management, and recovery optimisation, this is where clinical expertise meets athletic performance.",
      pt_desc: "Para atletas, indivíduos activos e pacientes focados em performance que querem ir além da reabilitação e da aptidão padrão. Aplicamos princípios da ciência do desporto, biomecânica e fisiologia do exercício para desenvolver força, potência e eficiência de movimento que se traduz diretamente no seu desporto ou atividade. Combinado com monitorização de HRV, gestão de carga e optimização da recuperação, este é o ponto onde a experiência clínica encontra a performance atlética.",
      items: [
        L("Sport-specific strength and conditioning", "Força e condicionamento específicos para o desporto"),
        L("Movement efficiency analysis for runners, cyclists, swimmers", "Análise de eficiência de movimento para corredores, ciclistas, nadadores"),
        L("Load monitoring and periodisation to prevent overuse injuries", "Monitorização de carga e periodização para prevenir lesões por uso excessivo"),
        L("Return to peak performance after injury", "Retorno à performance máxima após lesão"),
        L("Integrated with HRV and biohacking protocols", "Integrado com protocolos de HRV e biohacking"),
      ],
    },
  ];

  const benefits = [
    { icon: Shield, color: "bg-emerald-100 text-emerald-700", en: "Injury prevention through correct movement patterns taught from session one", pt: "Prevenção de lesões através de padrões de movimento correctos ensinados desde a primeira sessão" },
    { icon: Play, color: "bg-blue-100 text-blue-700", en: "Video exercise library in your patient portal — follow correctly at home", pt: "Biblioteca de exercícios em vídeo no portal do paciente — seguir correctamente em casa" },
    { icon: BarChart3, color: "bg-violet-100 text-violet-700", en: "Progress tracked digitally — objective data at every reassessment", pt: "Progresso monitorizado digitalmente — dados objectivos em cada reavaliação" },
    { icon: Brain, color: "bg-amber-100 text-amber-700", en: "Movement analysis identifies root cause — not just symptom management", pt: "Análise do movimento identifica a causa raiz — não apenas gestão dos sintomas" },
    { icon: Dumbbell, color: "bg-orange-100 text-orange-700", en: "No injury required — professional supervision benefits everyone", pt: "Não é necessária lesão — supervisão profissional beneficia toda a gente" },
    { icon: Activity, color: "bg-rose-100 text-rose-700", en: "Combined with electrotherapy and MLS laser in the same session for faster outcomes", pt: "Combinado com eletroterapia e laser MLS na mesma sessão para resultados mais rápidos" },
    { icon: Users, color: "bg-teal-100 text-teal-700", en: "Suitable for all ages and fitness levels — from post-surgical to elite athlete", pt: "Adequado para todas as idades e níveis de aptidão — de pós-cirúrgico a atleta de elite" },
    { icon: Target, color: "bg-indigo-100 text-indigo-700", en: "Programmes evolve with you — updated at every milestone", pt: "Programas evoluem consigo — actualizados em cada marco de progressão" },
  ];

  const steps = [
    {
      num: "01", icon: Target, color: "bg-emerald-100 text-emerald-700",
      en_title: "Movement & Functional Assessment", pt_title: "Avaliação de Movimento e Função",
      en_desc: "We assess your posture, joint mobility, muscle strength, movement patterns, and any existing pain or limitations. Whether you're injured, recovering, or completely healthy, this baseline tells us exactly where your body is starting from and what it needs.",
      pt_desc: "Avaliamos a sua postura, mobilidade articular, força muscular, padrões de movimento e qualquer dor ou limitação existente. Quer esteja lesionado, em recuperação ou completamente saudável, esta linha de base diz-nos exactamente onde o seu corpo está a partir e o que precisa.",
    },
    {
      num: "02", icon: Dumbbell, color: "bg-blue-100 text-blue-700",
      en_title: "Personalised Programme Design", pt_title: "Design de Programa Personalizado",
      en_desc: "Your therapist builds a programme specifically for your body, goals, and stage of training. Exercises are selected for their therapeutic or corrective value — not because they're generic. The programme includes clinic exercises, home exercises, and clear progressions.",
      pt_desc: "O seu terapeuta constrói um programa especificamente para o seu corpo, objetivos e fase de treino. Os exercícios são seleccionados pelo seu valor terapêutico ou correctivo — não porque são genéricos. O programa inclui exercícios de clínica, exercícios domiciliares e progressões claras.",
    },
    {
      num: "03", icon: Play, color: "bg-violet-100 text-violet-700",
      en_title: "Video Portal & Home Practice", pt_title: "Portal de Vídeo & Prática Domiciliar",
      en_desc: "Every exercise in your programme is demonstrated on video and uploaded to your patient portal. You have access 24/7 to follow the correct technique at home, at the gym, or anywhere. No guessing — every rep, every set, every cue is there.",
      pt_desc: "Cada exercício do seu programa é demonstrado em vídeo e carregado no portal do paciente. Tem acesso 24/7 para seguir a técnica correcta em casa, no ginásio ou em qualquer lugar. Sem adivinhar — cada repetição, cada série, cada instrução está lá.",
    },
    {
      num: "04", icon: BarChart3, color: "bg-amber-100 text-amber-700",
      en_title: "Progress Monitoring & Programme Updates", pt_title: "Monitorização do Progresso & Actualizações",
      en_desc: "At every clinic visit we reassess your strength, movement quality, and pain levels. When you hit a milestone — a strength target, a movement benchmark, or a return-to-activity goal — your programme is updated and the next stage begins. You always know where you are and where you're heading.",
      pt_desc: "Em cada visita à clínica reavaliamos a sua força, qualidade de movimento e níveis de dor. Quando atinge um marco — um alvo de força, um referencial de movimento ou um objetivo de retorno à actividade — o seu programa é actualizado e a próxima fase começa. Sabe sempre onde está e para onde vai.",
    },
  ];

  const whoFor = [
    L("Post-surgical patients", "Pacientes pós-cirúrgicos"),
    L("Sports injury recovery", "Recuperação de lesão desportiva"),
    L("Healthy gym-goers wanting supervision", "Praticantes saudáveis que querem supervisão"),
    L("Desk workers with postural pain", "Trabalhadores de secretária com dor postural"),
    L("Elderly & mobility concerns", "Idosos e problemas de mobilidade"),
    L("Athletes & performance focus", "Atletas & foco em performance"),
    L("Chronic pain management", "Gestão de dor crónica"),
    L("Post-fracture rehabilitation", "Reabilitação pós-fratura"),
    L("Recurrent injury patterns", "Padrões de lesão recorrente"),
    L("Return to sport after time off", "Retorno ao desporto após pausa"),
  ];

  const faqs = [
    {
      en_q: "Do I need to have an injury to use this service?",
      pt_q: "Preciso ter uma lesão para usar este serviço?",
      en_a: "Absolutely not. In fact, some of our most valuable work is with patients who have no injury at all. Many people develop musculoskeletal problems over months or years because of poor exercise technique, movement imbalances, or inadequate programming. Working with a therapist from the start builds a foundation of correct mechanics that prevents these injuries from ever occurring. If you currently exercise at a gym, run, cycle, swim, or do any sport — professional supervision adds real value regardless of your injury history.",
      pt_a: "Absolutamente não. Na verdade, alguns dos nossos trabalhos mais valiosos são com pacientes que não têm nenhuma lesão. Muitas pessoas desenvolvem problemas musculoesqueléticos ao longo de meses ou anos devido a técnica de exercício deficiente, desequilíbrios de movimento ou programação inadequada. Trabalhar com um terapeuta desde o início constrói uma base de mecânica correcta que previne estas lesões de alguma vez ocorrerem. Se actualmente faz exercício num ginásio, corre, anda de bicicleta, nada ou pratica qualquer desporto — supervisão profissional acrescenta valor real independentemente do seu historial de lesões.",
    },
    {
      en_q: "What is the difference between exercise therapy and kinesiotherapy?",
      pt_q: "Qual é a diferença entre terapia por exercício e cinesioterapia?",
      en_a: "Kinesiotherapy is the clinical science of movement — the study of how the body moves, why it moves incorrectly, and how to retrain it. Exercise therapy is the practical delivery of that science through specific exercises. In our clinic, we combine both seamlessly: we use kinesiological movement analysis to identify dysfunction, then design and deliver therapeutic exercise to correct it. Separating the two into different appointments was never necessary — they are two sides of the same clinical approach.",
      pt_a: "A cinesioterapia é a ciência clínica do movimento — o estudo de como o corpo se move, por que se move incorrectamente e como o reeducar. A terapia por exercício é a aplicação prática dessa ciência através de exercícios específicos. Na nossa clínica, combinamos ambas de forma integrada: usamos análise cinemática do movimento para identificar disfunção, depois concebemos e aplicamos exercício terapêutico para a corrigir. Separar as duas em consultas diferentes nunca foi necessário — são duas faces da mesma abordagem clínica.",
    },
    {
      en_q: "Can I do my exercises at a regular gym between clinic sessions?",
      pt_q: "Posso fazer os meus exercícios num ginásio normal entre as sessões de clínica?",
      en_a: "Yes — and this is encouraged. Your home/gym exercise programme is designed to be performed between clinic visits to maintain frequency and stimulus. All exercises are demonstrated on video in your patient portal with specific sets, reps, tempo, and technique cues so you can follow them independently with confidence. Your clinic sessions then focus on progression, technique refinement, and adding new exercises. The combination of supervised clinic work plus independent home/gym practice consistently produces better outcomes than either alone.",
      pt_a: "Sim — e isto é encorajado. O seu programa de exercícios domiciliar/ginásio é concebido para ser realizado entre as visitas à clínica para manter a frequência e o estímulo. Todos os exercícios são demonstrados em vídeo no portal do paciente com séries, repetições, tempo e instruções de técnica específicos para que possa seguir independentemente com confiança. As suas sessões de clínica focam-se depois na progressão, refinamento da técnica e adição de novos exercícios. A combinação de trabalho supervisionado na clínica mais prática independente em casa/ginásio produz consistentemente melhores resultados do que qualquer um isolado.",
    },
    {
      en_q: "How is this different from a personal trainer?",
      pt_q: "Como é que isto é diferente de um personal trainer?",
      en_a: "A personal trainer's expertise is in exercise programming for fitness goals. A physiotherapist's expertise is in the human body — anatomy, pathology, biomechanics, neuromuscular function, and how injury, pain, and surgery affect movement. When you exercise under clinical supervision, your movement is analysed through a diagnostic lens: we identify compensations, asymmetries, and loading errors that a personal trainer is not trained to recognise or correct. We also integrate your exercise programme with any treatment you're receiving (laser, electrotherapy, manual therapy) for a truly coordinated rehabilitation plan.",
      pt_a: "A experiência de um personal trainer está na programação de exercícios para objetivos de aptidão. A experiência de um fisioterapeuta está no corpo humano — anatomia, patologia, biomecânica, função neuromuscular e como lesão, dor e cirurgia afectam o movimento. Quando faz exercício sob supervisão clínica, o seu movimento é analisado através de uma lente diagnóstica: identificamos compensações, assimetrias e erros de carga que um personal trainer não está treinado para reconhecer ou corrigir. Também integramos o seu programa de exercícios com qualquer tratamento que esteja a receber (laser, eletroterapia, terapia manual) para um plano de reabilitação verdadeiramente coordenado.",
    },
    {
      en_q: "How many sessions per week do I need?",
      pt_q: "Quantas sessões por semana preciso?",
      en_a: "This depends on your goals and starting point. For active rehabilitation, 2–3 clinic sessions per week is typical, supplemented by daily home exercises. For supervised exercise and injury prevention, 1–2 sessions per week at the clinic alongside your own training is usually sufficient. For movement therapy and pattern correction, 1–2 sessions per week with consistent home practice. Your therapist will design a schedule that fits your lifestyle and optimises progress without overloading recovery.",
      pt_a: "Isto depende dos seus objetivos e ponto de partida. Para reabilitação activa, 2–3 sessões de clínica por semana é típico, complementado com exercícios domiciliares diários. Para exercício supervisionado e prevenção de lesões, 1–2 sessões por semana na clínica junto com o seu próprio treino é geralmente suficiente. Para terapia do movimento e correção de padrões, 1–2 sessões por semana com prática domiciliar consistente. O seu terapeuta concebe um horário que se adapta ao seu estilo de vida e optimiza o progresso sem sobrecarregar a recuperação.",
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Breadcrumb */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <Link href="/#services" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors">
          <ArrowLeft className="h-4 w-4" />
          {L("All Services", "Todos os Serviços")}
        </Link>
      </div>

      {/* Hero */}
      <section className="relative py-12 sm:py-16 lg:py-20 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-emerald-500/[0.06] to-transparent" />
          <div className="absolute bottom-0 left-0 w-1/3 h-2/3 bg-gradient-to-tr from-blue-500/[0.04] to-transparent" />
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-start gap-5 mb-6">
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/15 text-emerald-500 flex items-center justify-center shrink-0 shadow-lg shadow-emerald-500/10">
              <Dumbbell className="h-8 w-8" />
            </div>
            <div>
              <span className="inline-block px-3 py-1 rounded-full bg-emerald-500/15 text-emerald-400 text-xs font-semibold uppercase tracking-wider mb-3">
                {L("Exercise & Movement Therapy", "Terapia por Exercício e Movimento")}
              </span>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground leading-tight">
                {L("Move Better.", "Mova-se Melhor.")}
                <span className="block text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-blue-500">
                  {L("Recover Faster. Stay Injury-Free.", "Recupere Mais Rápido. Sem Lesões.")}
                </span>
              </h1>
            </div>
          </div>
          <p className="text-base sm:text-lg text-muted-foreground leading-relaxed max-w-3xl mb-6">
            {L(
              "Whether you're recovering from surgery, managing a chronic condition, training to prevent injury, or simply want to exercise with proper professional supervision — our Exercise & Movement Therapy service is designed for you. No injury required.",
              "Quer esteja a recuperar de uma cirurgia, a gerir uma condição crónica, a treinar para prevenir lesões ou simplesmente a querer fazer exercício com supervisão profissional adequada — o nosso serviço de Terapia por Exercício e Movimento foi concebido para si. Não é necessária lesão."
            )}
          </p>
          <div className="flex flex-wrap gap-3 mb-8">
            {[
              { en: "Rehabilitation", pt: "Reabilitação" },
              { en: "Injury Prevention", pt: "Prevenção de Lesões" },
              { en: "Movement Correction", pt: "Correção de Movimento" },
              { en: "Performance", pt: "Performance" },
              { en: "Video Portal", pt: "Portal de Vídeos" },
            ].map((tag, i) => (
              <span key={i} className="px-3 py-1.5 rounded-full bg-muted/60 border border-border text-xs font-medium text-foreground">
                {isPt ? tag.pt : tag.en}
              </span>
            ))}
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <Link href="/signup">
              <Button size="lg" className="gap-2 bg-gradient-to-r from-emerald-500 to-blue-500 hover:from-emerald-600 hover:to-blue-600 text-white shadow-lg shadow-emerald-500/20">
                {L("Book Assessment", "Marcar Avaliação")} <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="/#services">
              <Button size="lg" variant="outline">{L("View All Services", "Ver Todos os Serviços")}</Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Four Tracks */}
      <section className="py-14 sm:py-20 bg-card/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-10 sm:mb-14">
            <span className="inline-block px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold uppercase tracking-wider mb-3">
              {L("Four Clinical Pathways", "Quatro Vias Clínicas")}
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground">
              {L("One Service. Four Reasons to Use It.", "Um Serviço. Quatro Razões Para Usá-lo.")}
            </h2>
            <p className="mt-2 text-muted-foreground max-w-2xl">
              {L(
                "Every patient is different. Your starting point, your goals, and your body's needs determine which clinical pathway we follow — and we can combine multiple pathways in a single programme.",
                "Cada paciente é diferente. O seu ponto de partida, os seus objetivos e as necessidades do seu corpo determinam que via clínica seguimos — e podemos combinar múltiplas vias num único programa."
              )}
            </p>
          </div>
          <div className="grid sm:grid-cols-2 gap-6">
            {tracks.map((t, i) => {
              const TIcon = t.icon;
              return (
                <Card key={i} className="border border-border bg-card overflow-hidden">
                  <CardContent className="p-6 sm:p-8">
                    <div className="flex items-center gap-3 mb-4">
                      <div className={`w-11 h-11 rounded-xl ${t.color} flex items-center justify-center shrink-0`}>
                        <TIcon className="h-5 w-5" />
                      </div>
                      <span className={`px-2.5 py-1 rounded-full border text-xs font-semibold ${t.badge}`}>
                        {isPt ? t.pt_label : t.en_label}
                      </span>
                    </div>
                    <h3 className="text-lg sm:text-xl font-bold text-foreground mb-3">
                      {isPt ? t.pt_title : t.en_title}
                    </h3>
                    <p className="text-sm text-muted-foreground leading-relaxed mb-5">
                      {isPt ? t.pt_desc : t.en_desc}
                    </p>
                    <ul className="space-y-2">
                      {t.items.map((item, j) => (
                        <li key={j} className="flex items-start gap-2 text-sm text-foreground">
                          <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-14 sm:py-20 bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-10">
            <span className="inline-block px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold uppercase tracking-wider mb-3">
              {L("Why Choose Clinical Exercise Supervision", "Porquê Supervisão Clínica de Exercício")}
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground">
              {L("Clinical Benefits", "Benefícios Clínicos")}
            </h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {benefits.map((b, i) => {
              const BIcon = b.icon;
              return (
                <div key={i} className="flex items-start gap-3 p-4 rounded-xl bg-card border border-border">
                  <div className={`w-10 h-10 rounded-lg ${b.color} flex items-center justify-center shrink-0`}>
                    <BIcon className="h-5 w-5" />
                  </div>
                  <p className="text-sm text-foreground leading-relaxed">{isPt ? b.pt : b.en}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section className="py-14 sm:py-20 bg-card/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-10">
            <span className="inline-block px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold uppercase tracking-wider mb-3">
              {L("The Process", "O Processo")}
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground">
              {L("How It Works", "Como Funciona")}
            </h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {steps.map((s, i) => {
              const SIcon = s.icon;
              return (
                <div key={i} className="relative p-6 rounded-xl bg-background border border-border">
                  <span className="absolute -top-3 left-5 w-7 h-7 rounded-full bg-emerald-500 text-white text-xs font-bold flex items-center justify-center shadow-sm">
                    {s.num}
                  </span>
                  <div className={`w-10 h-10 rounded-lg ${s.color} flex items-center justify-center mb-3 mt-1`}>
                    <SIcon className="h-5 w-5" />
                  </div>
                  <h3 className="font-semibold text-foreground mb-2">{isPt ? s.pt_title : s.en_title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{isPt ? s.pt_desc : s.en_desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Who Is It For + Session Info */}
      <section className="py-14 sm:py-20 bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-10 items-start">
            <div>
              <span className="inline-block px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold uppercase tracking-wider mb-3">
                {L("Who Is It For?", "Para Quem É?")}
              </span>
              <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-4">
                {L("For every body. Every goal.", "Para todos os corpos. Todos os objetivos.")}
              </h2>
              <p className="text-muted-foreground leading-relaxed mb-6">
                {L(
                  "This service has no prerequisite. The only requirement is the desire to move better, recover faster, or train smarter. Our clinical approach adapts to wherever you are right now.",
                  "Este serviço não tem pré-requisitos. O único requisito é o desejo de se mover melhor, recuperar mais rápido ou treinar de forma mais inteligente. A nossa abordagem clínica adapta-se a onde quer que esteja agora."
                )}
              </p>
              <div className="flex flex-wrap gap-2">
                {whoFor.map((w, i) => (
                  <span key={i} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-full bg-muted/60 text-sm font-medium text-foreground border border-border">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                    {w}
                  </span>
                ))}
              </div>
            </div>
            <div>
              <span className="inline-block px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold uppercase tracking-wider mb-3">
                {L("Session Information", "Informações da Sessão")}
              </span>
              <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-4">
                {L("What to Expect", "O Que Esperar")}
              </h2>
              <div className="space-y-3">
                {[
                  { icon: Clock, label: L("Initial Assessment", "Avaliação Inicial"), value: L("60 minutes — movement analysis + programme design", "60 minutos — análise de movimento + design de programa") },
                  { icon: Activity, label: L("Follow-up Sessions", "Sessões de Seguimento"), value: L("45–60 minutes — guided exercise + progression", "45–60 minutos — exercício guiado + progressão") },
                  { icon: Dumbbell, label: L("Home Programme", "Programa Domiciliar"), value: L("Daily exercises via video portal — 20–40 minutes", "Exercícios diários via portal de vídeo — 20–40 minutos") },
                  { icon: Target, label: L("Frequency", "Frequência"), value: L("1–3 clinic sessions/week depending on goal", "1–3 sessões de clínica/semana dependendo do objetivo") },
                  { icon: Shield, label: L("Location", "Local"), value: L("In-clinic + remote guidance via patient portal", "Na clínica + orientação remota via portal do paciente") },
                ].map((item, i) => {
                  const IIcon = item.icon;
                  return (
                    <div key={i} className="flex items-start gap-3 p-4 rounded-xl bg-card border border-border">
                      <div className="w-9 h-9 rounded-lg bg-emerald-500/15 text-emerald-500 flex items-center justify-center shrink-0">
                        <IIcon className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-0.5">{item.label}</p>
                        <p className="text-sm text-foreground">{item.value}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-14 sm:py-20 bg-card/50">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-10">
            <span className="inline-block px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold uppercase tracking-wider mb-3">
              {L("Common Questions", "Perguntas Frequentes")}
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground">
              {L("Frequently Asked Questions", "Perguntas Frequentes")}
            </h2>
          </div>
          <div className="space-y-3">
            {faqs.map((f, i) => (
              <div key={i} className="border border-border rounded-xl overflow-hidden">
                <button
                  className="w-full flex items-center justify-between p-5 text-left hover:bg-muted/30 transition-colors"
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                >
                  <span className="font-semibold text-foreground pr-4">{isPt ? f.pt_q : f.en_q}</span>
                  <ChevronDown className={`h-5 w-5 text-muted-foreground shrink-0 transition-transform ${openFaq === i ? "rotate-180" : ""}`} />
                </button>
                {openFaq === i && (
                  <div className="px-5 pb-5 text-muted-foreground leading-relaxed text-sm">
                    {isPt ? f.pt_a : f.en_a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-14 sm:py-20 bg-gradient-to-r from-emerald-500/10 via-blue-500/5 to-background">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-4">
            {L("Start Moving. Start Recovering.", "Comece a Mover. Comece a Recuperar.")}
          </h2>
          <p className="text-muted-foreground mb-8 leading-relaxed">
            {L(
              "Book your initial movement assessment and let us build a programme that fits your body, your goals, and your life — with or without an injury.",
              "Marque a sua avaliação de movimento inicial e deixe-nos construir um programa que se adapte ao seu corpo, aos seus objetivos e à sua vida — com ou sem lesão."
            )}
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/signup">
              <Button size="lg" className="gap-2 bg-gradient-to-r from-emerald-500 to-blue-500 hover:from-emerald-600 hover:to-blue-600 text-white shadow-lg shadow-emerald-500/20">
                {L("Book Assessment", "Marcar Avaliação")} <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="/#services">
              <Button size="lg" variant="outline">{L("View All Services", "Ver Todos os Serviços")}</Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
