"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft, ArrowRight, ScanLine, CheckCircle2, ChevronDown,
  Clock, Activity, Shield, Target, Layers,
  BarChart3, ArrowUpDown, Brain, Crosshair, Users,
  Footprints, Zap, RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useLocale } from "@/hooks/use-locale";

export default function BiomechanicalAssessmentPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const { locale } = useLocale();
  const isPt = locale === "pt-BR";
  const L = (en: string, pt: string) => isPt ? pt : en;

  const assessmentComponents = [
    {
      icon: ArrowUpDown,
      color: "bg-purple-100 text-purple-700",
      badge: "bg-purple-500/15 text-purple-400 border-purple-500/20",
      en_label: "Postural Analysis",
      pt_label: "Análise Postural",
      en_title: "Static Posture — Three Planes",
      pt_title: "Postura Estática — Três Planos",
      en_desc: "Full-body postural analysis in the sagittal (side), frontal (front/back), and transverse (rotational) planes. We identify head-forward posture, thoracic kyphosis, lumbar lordosis, pelvic tilt (anterior/posterior/lateral), shoulder height asymmetry, and spinal curvatures. Deviations in one segment are documented alongside compensatory patterns above and below.",
      pt_desc: "Análise postural de corpo inteiro nos planos sagital (lateral), frontal (frente/costas) e transverso (rotacional). Identificamos postura de cabeça projetada, cifose torácica, lordose lombar, inclinação pélvica (anterior/posterior/lateral), assimetria de altura dos ombros e curvaturas espinhais. Os desvios num segmento são documentados juntamente com padrões compensatórios acima e abaixo.",
    },
    {
      icon: Activity,
      color: "bg-emerald-100 text-emerald-700",
      badge: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
      en_label: "Gait Analysis",
      pt_label: "Análise da Marcha",
      en_title: "Walking & Running Mechanics",
      pt_title: "Mecânica da Marcha & Corrida",
      en_desc: "Observational and video-assisted gait analysis in multiple planes. We assess stride length, cadence, foot strike pattern, hip and knee flexion/extension during stance and swing, trunk lean, arm swing symmetry, and pelvic drop (Trendelenburg sign). Runners are assessed at their training pace to identify overstriding, excessive bounce, crossover gait, and heel-strike loading patterns.",
      pt_desc: "Análise de marcha observacional e assistida por vídeo em múltiplos planos. Avaliamos comprimento da passada, cadência, padrão de apoio do pé, flexão/extensão do quadril e joelho durante apoio e balanço, inclinação do tronco, simetria do balanço dos braços e queda pélvica (sinal de Trendelenburg). Corredores são avaliados à sua velocidade de treino para identificar sobreavanço, bounce excessivo, marcha cruzada e padrões de carga no calcanhar.",
    },
    {
      icon: RefreshCw,
      color: "bg-blue-100 text-blue-700",
      badge: "bg-blue-500/15 text-blue-400 border-blue-500/20",
      en_label: "Joint ROM",
      pt_label: "ADM Articular",
      en_title: "Range of Motion Testing",
      pt_title: "Testes de Amplitude de Movimento",
      en_desc: "Standardised goniometric measurement of joint range of motion at all clinically relevant segments: cervical and lumbar spine, hip (flexion, extension, abduction, internal/external rotation), knee, ankle dorsiflexion (weightbearing and non-weightbearing), shoulder (all planes), and thoracic rotation. Restrictions are correlated with functional movement deficits and identified pain sources.",
      pt_desc: "Medição goniométrica padronizada da amplitude de movimento articular em todos os segmentos clinicamente relevantes: coluna cervical e lombar, quadril (flexão, extensão, abdução, rotação interna/externa), joelho, dorsiflexão do tornozelo (com e sem carga), ombro (todos os planos) e rotação torácica. As restrições são correlacionadas com défices de movimento funcional e fontes de dor identificadas.",
    },
    {
      icon: Layers,
      color: "bg-amber-100 text-amber-700",
      badge: "bg-amber-500/15 text-amber-400 border-amber-500/20",
      en_label: "Muscle Length & Flexibility",
      pt_label: "Comprimento Muscular & Flexibilidade",
      en_title: "Tight vs Lengthened Muscles",
      pt_title: "Músculos Encurtados vs Alongados",
      en_desc: "Clinical muscle length tests identify which muscles are shortened and adaptively tight versus those that are neurally inhibited and lengthened. Key assessments include: Thomas test (hip flexor length), Ober's test (IT band/TFL), Ely test (rectus femoris), hamstring length (active and passive knee extension), Silfverskiöld test (gastrocnemius vs soleus tightness), pectoralis minor length, and upper trapezius/levator scapulae tightness.",
      pt_desc: "Testes clínicos de comprimento muscular identificam quais músculos estão encurtados e adaptativamente tensos versus aqueles que são neurologicamente inibidos e alongados. Avaliações chave incluem: teste de Thomas (comprimento do flexor do quadril), teste de Ober (IT band/TFL), teste de Ely (reto femoral), comprimento dos isquiotibiais (extensão ativa e passiva do joelho), teste de Silfverskiöld (tensão gastrocnêmio vs sóleo), comprimento do peitoral menor e tensão do trapézio superior/elevador da escápula.",
    },
    {
      icon: Target,
      color: "bg-rose-100 text-rose-700",
      badge: "bg-rose-500/15 text-rose-400 border-rose-500/20",
      en_label: "Muscle Strength",
      pt_label: "Força Muscular",
      en_title: "Strength & Activation Testing",
      pt_title: "Testes de Força & Ativação",
      en_desc: "Manual muscle testing (MMT) and functional strength tests identify inhibited or weak muscle groups — including glutes, deep hip stabilisers, rotator cuff, deep cervical flexors, and transversus abdominis. Single-leg squat quality, single-leg hop landing mechanics, and bridge tests reveal real-world strength deficits and control during functional loading.",
      pt_desc: "Testes musculares manuais (TMM) e testes de força funcional identificam grupos musculares inibidos ou enfraquecidos — incluindo glúteos, estabilizadores profundos do quadril, manguito rotador, flexores cervicais profundos e transverso do abdómen. A qualidade do agachamento unipodal, a mecânica de aterragem do salto unipodal e os testes de ponte revelam défices de força e controlo no mundo real durante a carga funcional.",
    },
    {
      icon: Brain,
      color: "bg-teal-100 text-teal-700",
      badge: "bg-teal-500/15 text-teal-400 border-teal-500/20",
      en_label: "Functional Movement",
      pt_label: "Movimento Funcional",
      en_title: "Movement Pattern Screening",
      pt_title: "Rastreio de Padrões de Movimento",
      en_desc: "Functional movement screening tests challenge the body to coordinate multiple joints simultaneously — revealing compensation patterns that individual joint tests miss. Key screens include: overhead squat, single-leg squat, hip hinge mechanics, shoulder mobility screen, active straight-leg raise, rotary stability, and sport-specific movement patterns where relevant.",
      pt_desc: "Os testes de rastreio de movimento funcional desafiam o corpo a coordenar múltiplas articulações simultaneamente — revelando padrões de compensação que os testes articulares individuais não detectam. Os rastreios chave incluem: agachamento com braços elevados, agachamento unipodal, mecânica do hip hinge, rastreio de mobilidade do ombro, elevação ativa da perna estendida, estabilidade rotatória e padrões de movimento específicos do desporto quando relevante.",
    },
  ];

  const findings = [
    { icon: ArrowUpDown, color: "bg-purple-100 text-purple-700", en: "Leg length discrepancy (true anatomical vs functional)", pt: "Discrepância no comprimento dos membros (verdadeira vs funcional)" },
    { icon: Layers, color: "bg-blue-100 text-blue-700", en: "Gluteal inhibition — the most underdiagnosed cause of knee and back pain", pt: "Inibição glútea — a causa mais subdiagnosticada de dor no joelho e nas costas" },
    { icon: Activity, color: "bg-emerald-100 text-emerald-700", en: "Hip flexor dominance replacing weak posterior chain", pt: "Dominância do flexor do quadril substituindo cadeia posterior fraca" },
    { icon: RefreshCw, color: "bg-amber-100 text-amber-700", en: "Restricted thoracic rotation causing lumbar compensation", pt: "Rotação torácica restrita causando compensação lombar" },
    { icon: Target, color: "bg-rose-100 text-rose-700", en: "Scapular dyskinesis — altered shoulder blade mechanics affecting rotator cuff", pt: "Discinesia escapular — mecânica alterada da omoplata afectando o manguito rotador" },
    { icon: Brain, color: "bg-violet-100 text-violet-700", en: "Pelvic asymmetry — sacroiliac joint malalignment", pt: "Assimetria pélvica — desalinhamento da articulação sacroilíaca" },
    { icon: Footprints, color: "bg-teal-100 text-teal-700", en: "Ankle dorsiflexion restriction — a hidden driver of knee and hip compensations", pt: "Restrição de dorsiflexão do tornozelo — um driver oculto de compensações no joelho e quadril" },
    { icon: Crosshair, color: "bg-orange-100 text-orange-700", en: "Valgus collapse during loading — ACL, patellofemoral and IT band risk", pt: "Colapso em valgo durante carga — risco para LCA, patelofemoral e IT band" },
  ];

  const conditions = [
    {
      en: "Recurrent or Unexplained Musculoskeletal Pain",
      pt: "Dor Musculoesquelética Recorrente ou Inexplicada",
      en_detail: "When pain keeps returning despite treatment, it is usually because the biomechanical driver was never identified. A full assessment maps the movement chain to find why the tissue is being repeatedly stressed beyond its tolerance.",
      pt_detail: "Quando a dor continua a regressar apesar do tratamento, normalmente é porque o driver biomecânico nunca foi identificado. Uma avaliação completa mapeia a cadeia de movimento para encontrar por que o tecido está a ser repetidamente sobrecarregado além da sua tolerância.",
    },
    {
      en: "Return to Sport After Injury",
      pt: "Retorno ao Desporto Após Lesão",
      en_detail: "Before return-to-sport clearance, a biomechanical assessment confirms that movement quality, symmetry, and loading mechanics meet the demands of the sport. This is critical for ACL rehabilitation, where movement quality predicts re-injury risk far better than time-based protocols alone.",
      pt_detail: "Antes da liberação para retorno ao desporto, uma avaliação biomecânica confirma que a qualidade do movimento, simetria e mecânica de carga satisfazem as exigências do desporto. Isto é crítico para a reabilitação do LCA, onde a qualidade do movimento prediz o risco de re-lesão muito melhor do que protocolos baseados apenas no tempo.",
    },
    {
      en: "Running Injuries & Overuse Syndromes",
      pt: "Lesões de Corrida & Síndromes de Uso Excessivo",
      en_detail: "Runners with recurring shin splints, IT band syndrome, patellofemoral pain, Achilles tendinopathy, or stress fractures almost always have an identifiable biomechanical contributor — cadence, strike pattern, hip drop, crossover gait, or shoe-foot mismatch. A gait analysis identifies the specific fault to correct.",
      pt_detail: "Corredores com periostite tibial recorrente, síndrome da IT band, dor patelofemoral, tendinopatia do Aquiles ou fracturas de stress quase sempre têm um contribuidor biomecânico identificável — cadência, padrão de apoio, queda do quadril, marcha cruzada ou incompatibilidade sapato-pé. Uma análise de marcha identifica a falha específica a corrigir.",
    },
    {
      en: "Chronic Low Back & Neck Pain",
      pt: "Dor Lombar e Cervical Crónica",
      en_detail: "Most chronic spinal pain is maintained by movement compensations and postural loading habits rather than structural damage. The assessment identifies which segments are overloaded, which are hypomobile, and what upstream or downstream mechanics are perpetuating the problem.",
      pt_detail: "A maior parte da dor espinhal crónica é mantida por compensações de movimento e hábitos posturais de carga em vez de dano estrutural. A avaliação identifica quais segmentos estão sobrecarregados, quais estão hipomóveis e qual a mecânica upstream ou downstream que está a perpetuar o problema.",
    },
    {
      en: "Pre-Surgical Assessment",
      pt: "Avaliação Pré-Cirúrgica",
      en_detail: "Before joint replacement, ligament reconstruction, or spinal surgery, a biomechanical baseline documents current movement patterns, strength levels, and compensations. This baseline is used post-surgery to track recovery and ensure the patient returns to movement quality that exceeds pre-surgical function.",
      pt_detail: "Antes de substituição articular, reconstrução ligamentar ou cirurgia espinhal, uma linha de base biomecânica documenta os padrões de movimento actuais, níveis de força e compensações. Esta linha de base é usada pós-cirurgia para acompanhar a recuperação e garantir que o paciente retorna a uma qualidade de movimento que supera a função pré-cirúrgica.",
    },
    {
      en: "Athletic Performance Optimisation",
      pt: "Optimização da Performance Atlética",
      en_detail: "Asymmetries in movement efficiency, power transfer, and joint loading that are not yet causing pain are nonetheless reducing performance and increasing long-term injury risk. Elite athletes use biomechanical assessments proactively to identify efficiency gains and loading risks before they become injuries.",
      pt_detail: "Assimetrias na eficiência do movimento, transferência de potência e carga articular que ainda não estão a causar dor estão no entanto a reduzir a performance e a aumentar o risco de lesão a longo prazo. Atletas de elite utilizam avaliações biomecânicas proactivamente para identificar ganhos de eficiência e riscos de carga antes de se tornarem lesões.",
    },
  ];

  const reportSections = [
    { en: "Postural findings in all three planes with photographic documentation", pt: "Achados posturais nos três planos com documentação fotográfica" },
    { en: "Joint ROM measurements vs normative values for age and activity level", pt: "Medições de ADM articular vs valores normativos para idade e nível de atividade" },
    { en: "Muscle imbalance map — tight/overactive vs inhibited/lengthened", pt: "Mapa de desequilíbrio muscular — encurtado/sobreativo vs inibido/alongado" },
    { en: "Gait analysis findings with video reference frames", pt: "Achados da análise de marcha com frames de referência de vídeo" },
    { en: "Functional movement screen scores with identified compensations", pt: "Pontuações do rastreio de movimento funcional com compensações identificadas" },
    { en: "Clinical diagnosis summary — primary dysfunction and contributing factors", pt: "Resumo do diagnóstico clínico — disfunção primária e factores contribuintes" },
    { en: "Prioritised treatment plan — what to address first and why", pt: "Plano de tratamento priorizado — o que abordar primeiro e porquê" },
    { en: "Exercise prescription recommendations linked to assessment findings", pt: "Recomendações de prescrição de exercício vinculadas aos achados da avaliação" },
  ];

  const steps = [
    {
      num: "01", icon: Users, color: "bg-purple-100 text-purple-700",
      en_title: "History & Goal Setting",
      pt_title: "Historial & Definição de Objetivos",
      en_desc: "Detailed intake covering injury history, pain patterns, activity demands, previous treatments, and your specific goals. Understanding the full clinical picture before any physical testing ensures the assessment is targeted and efficient.",
      pt_desc: "Intake detalhado cobrindo historial de lesões, padrões de dor, exigências de atividade, tratamentos anteriores e os seus objetivos específicos. Compreender o quadro clínico completo antes de qualquer teste físico garante que a avaliação seja dirigida e eficiente.",
    },
    {
      num: "02", icon: ScanLine, color: "bg-blue-100 text-blue-700",
      en_title: "Static Postural & Structural Screen",
      pt_title: "Rastreio Postural Estático & Estrutural",
      en_desc: "Standing postural analysis in all three planes. Leg length measurement (supine anatomical and functional standing). Spinal curvature assessment (Adams forward bend for scoliosis screening). Shoulder height, pelvic level, and tibial torsion documented.",
      pt_desc: "Análise postural em pé nos três planos. Medição do comprimento dos membros (anatómica em supino e funcional em pé). Avaliação da curvatura espinhal (flexão anterior de Adams para rastreio de escoliose). Altura dos ombros, nível pélvico e torção tibial documentados.",
    },
    {
      num: "03", icon: RefreshCw, color: "bg-emerald-100 text-emerald-700",
      en_title: "Joint Mobility & Muscle Testing",
      pt_title: "Mobilidade Articular & Testes Musculares",
      en_desc: "Systematic goniometric ROM measurement, muscle length tests (Thomas, Ober, Ely, hamstring, Silfverskiöld), and manual muscle strength testing across all relevant segments. Neural tension tests (SLR, slump, upper limb tension) where clinically indicated.",
      pt_desc: "Medição goniométrica sistemática de ADM, testes de comprimento muscular (Thomas, Ober, Ely, isquiotibiais, Silfverskiöld) e testes manuais de força muscular em todos os segmentos relevantes. Testes de tensão neural (SLR, slump, tensão do membro superior) quando clinicamente indicado.",
    },
    {
      num: "04", icon: Activity, color: "bg-amber-100 text-amber-700",
      en_title: "Functional & Gait Analysis",
      pt_title: "Análise Funcional & de Marcha",
      en_desc: "Overhead squat, single-leg squat, hip hinge, and sport-specific screens. Gait analysis at walking speed with video. Runners assessed at training pace on treadmill where available. Single-leg stance balance and Y-balance test for dynamic stability.",
      pt_desc: "Agachamento com braços elevados, agachamento unipodal, hip hinge e rastreios específicos do desporto. Análise de marcha à velocidade de caminhada com vídeo. Corredores avaliados à velocidade de treino em passadeira quando disponível. Equilíbrio unipodal e teste Y-balance para estabilidade dinâmica.",
    },
    {
      num: "05", icon: BarChart3, color: "bg-rose-100 text-rose-700",
      en_title: "Report, Diagnosis & Treatment Plan",
      pt_title: "Relatório, Diagnóstico & Plano de Tratamento",
      en_desc: "All findings are integrated into a written report with clinical diagnosis, identified movement dysfunctions, and a prioritised treatment plan. This becomes the blueprint for your rehabilitation — shared with you and any other healthcare providers involved in your care.",
      pt_desc: "Todos os achados são integrados num relatório escrito com diagnóstico clínico, disfunções de movimento identificadas e um plano de tratamento priorizado. Isto torna-se o blueprint para a sua reabilitação — partilhado consigo e com quaisquer outros profissionais de saúde envolvidos nos seus cuidados.",
    },
  ];

  const faqs = [
    {
      en_q: "What exactly happens during a biomechanical assessment appointment?",
      pt_q: "O que acontece exatamente durante uma consulta de avaliação biomecânica?",
      en_a: "The appointment typically lasts 60–90 minutes. It begins with a detailed history (your pain, activity level, previous treatments, and goals), followed by postural analysis in standing, joint range of motion measurements, muscle length and strength tests, and functional movement screening. Gait analysis is included where relevant. The session ends with a verbal summary of findings and the beginnings of your treatment plan. A written report is provided — either on the day or within a few days for complex cases.",
      pt_a: "A consulta dura tipicamente 60–90 minutos. Começa com um historial detalhado (a sua dor, nível de atividade, tratamentos anteriores e objetivos), seguido de análise postural em pé, medições de amplitude de movimento articular, testes de comprimento e força muscular e rastreio de movimento funcional. A análise de marcha é incluída quando relevante. A sessão termina com um resumo verbal dos achados e o início do seu plano de tratamento. Um relatório escrito é fornecido — no próprio dia ou dentro de alguns dias para casos complexos.",
    },
    {
      en_q: "How is this different from a normal physiotherapy consultation?",
      pt_q: "Como é que isto é diferente de uma consulta normal de fisioterapia?",
      en_a: "A standard physiotherapy consultation focuses on the presenting complaint — the pain, the structure, and the local treatment. A biomechanical assessment is a full-body systematic analysis that maps how your entire movement system works, where the inefficiencies and compensations are, and what their downstream consequences are. Many patients with chronic pain have seen multiple therapists who treated the pain location rather than the biomechanical driver. The assessment is designed to find what conventional consultation misses — and then connect those findings to a targeted treatment strategy.",
      pt_a: "Uma consulta de fisioterapia padrão foca-se na queixa apresentada — a dor, a estrutura e o tratamento local. Uma avaliação biomecânica é uma análise sistemática de corpo inteiro que mapeia como todo o seu sistema de movimento funciona, onde estão as ineficiências e compensações, e quais as suas consequências downstream. Muitos pacientes com dor crónica consultaram múltiplos terapeutas que trataram a localização da dor em vez do driver biomecânico. A avaliação é concebida para encontrar o que a consulta convencional falha — e depois ligar esses achados a uma estratégia de tratamento dirigida.",
    },
    {
      en_q: "Do I need to have pain to benefit from a biomechanical assessment?",
      pt_q: "Preciso ter dor para beneficiar de uma avaliação biomecânica?",
      en_a: "No. Athletes and active individuals use biomechanical assessments proactively to identify movement inefficiencies and loading asymmetries that reduce performance and increase injury risk — before any pain develops. Many elite sports programmes include routine biomechanical screening as injury prevention. If you train regularly and want to ensure you're moving well, loading symmetrically, and not building up compensations that will cause problems later, a biomechanical assessment is a worthwhile investment.",
      pt_a: "Não. Atletas e indivíduos activos utilizam avaliações biomecânicas proactivamente para identificar ineficiências de movimento e assimetrias de carga que reduzem a performance e aumentam o risco de lesão — antes de qualquer dor se desenvolver. Muitos programas desportivos de elite incluem rastreio biomecânico de rotina como prevenção de lesões. Se treina regularmente e quer garantir que se move bem, carrega simetricamente e não está a acumular compensações que causarão problemas mais tarde, uma avaliação biomecânica é um investimento que vale a pena.",
    },
    {
      en_q: "Will I receive a written report?",
      pt_q: "Vou receber um relatório escrito?",
      en_a: "Yes. A written clinical report is provided summarising postural findings, ROM measurements, muscle imbalance patterns, gait analysis observations, functional movement screen scores, the clinical diagnosis, and a prioritised treatment plan with exercise recommendations. This report is yours to keep, share with other healthcare providers (GP, surgeon, specialist), or use as a reference baseline for future assessments.",
      pt_a: "Sim. Um relatório clínico escrito é fornecido resumindo os achados posturais, medições de ADM, padrões de desequilíbrio muscular, observações da análise de marcha, pontuações do rastreio de movimento funcional, o diagnóstico clínico e um plano de tratamento priorizado com recomendações de exercício. Este relatório é seu para guardar, partilhar com outros profissionais de saúde (médico de família, cirurgião, especialista) ou usar como baseline de referência para avaliações futuras.",
    },
    {
      en_q: "Can a biomechanical assessment identify the cause of my back pain?",
      pt_q: "Uma avaliação biomecânica pode identificar a causa da minha dor lombar?",
      en_a: "For the majority of non-traumatic low back pain cases, yes. Research indicates that around 85% of low back pain is classified as 'non-specific' — meaning there is no single structural lesion explaining it. In practice, this usually means there is an identifiable biomechanical movement pattern driving it: restricted hip mobility forcing lumbar compensation, weak gluteals causing excessive lumbar loading, tight hip flexors creating anterior pelvic tilt, or asymmetric sacroiliac mechanics. A biomechanical assessment systematically identifies these drivers. For cases with a neurological component (radiation, weakness, altered sensation), the assessment is combined with neural tension testing and, where indicated, referral for imaging.",
      pt_a: "Para a maioria dos casos de dor lombar não traumática, sim. A investigação indica que cerca de 85% da dor lombar é classificada como 'não específica' — o que significa que não há uma única lesão estrutural a explicá-la. Na prática, isto geralmente significa que existe um padrão de movimento biomecânico identificável a impulsioná-la: mobilidade do quadril restrita forçando compensação lombar, glúteos fracos causando sobrecarga lombar excessiva, flexores do quadril tensos criando inclinação pélvica anterior, ou mecânica sacroilíaca assimétrica. Uma avaliação biomecânica identifica sistematicamente estes drivers. Para casos com componente neurológico (irradiação, fraqueza, sensação alterada), a avaliação é combinada com testes de tensão neural e, quando indicado, encaminhamento para imagem.",
    },
    {
      en_q: "How often should I have a biomechanical reassessment?",
      pt_q: "Com que frequência devo fazer uma reavaliação biomecânica?",
      en_a: "For patients in active rehabilitation, a structured reassessment is typically performed every 4–6 weeks to track objective progress and adjust the treatment plan. For athletes in competitive training, a reassessment at the start of pre-season and mid-season is standard practice. For general wellness and prevention, an annual reassessment ensures your movement quality is maintained and any emerging compensations are caught early. If you experience a significant injury, change activity level, have surgery, or notice a return of old symptoms, an unscheduled reassessment is warranted.",
      pt_a: "Para pacientes em reabilitação ativa, uma reavaliação estruturada é normalmente realizada a cada 4–6 semanas para acompanhar o progresso objectivo e ajustar o plano de tratamento. Para atletas em treino competitivo, uma reavaliação no início da pré-época e a meio da época é prática padrão. Para bem-estar geral e prevenção, uma reavaliação anual garante que a sua qualidade de movimento é mantida e quaisquer compensações emergentes são detectadas precocemente. Se sofrer uma lesão significativa, mudar de nível de atividade, tiver cirurgia ou notar um retorno de sintomas antigos, uma reavaliação não programada é justificada.",
    },
  ];

  const whoFor = [
    L("Chronic or recurrent pain (any region)", "Dor crónica ou recorrente (qualquer região)"),
    L("Runners & cyclists", "Corredores & ciclistas"),
    L("Return to sport after injury", "Retorno ao desporto após lesão"),
    L("Pre & post-surgical patients", "Pacientes pré & pós-cirúrgicos"),
    L("Postural concerns", "Preocupações posturais"),
    L("Adolescents with scoliosis screening", "Adolescentes com rastreio de escoliose"),
    L("Athletes — proactive injury prevention", "Atletas — prevenção proactiva de lesões"),
    L("Workplace ergonomics concerns", "Preocupações com ergonomia no trabalho"),
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
          <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-purple-500/[0.06] to-transparent" />
          <div className="absolute bottom-0 left-0 w-1/3 h-2/3 bg-gradient-to-tr from-blue-500/[0.04] to-transparent" />
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-start gap-5 mb-6">
            <div className="w-16 h-16 rounded-2xl bg-purple-500/15 text-purple-400 flex items-center justify-center shrink-0 shadow-lg shadow-purple-500/10">
              <ScanLine className="h-8 w-8" />
            </div>
            <div>
              <span className="inline-block px-3 py-1 rounded-full bg-purple-500/15 text-purple-400 text-xs font-semibold uppercase tracking-wider mb-3">
                {L("Biomechanical Assessment", "Avaliação Biomecânica")}
              </span>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground leading-tight">
                {L("Find the Cause.", "Encontrar a Causa.")}
                <span className="block text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-blue-500">
                  {L("Not Just the Pain Location.", "Não Apenas a Localização da Dor.")}
                </span>
              </h1>
            </div>
          </div>
          <p className="text-base sm:text-lg text-muted-foreground leading-relaxed max-w-3xl mb-6">
            {L(
              "A comprehensive, systematic analysis of how your entire body moves — identifying postural deviations, joint restrictions, muscle imbalances, and dysfunctional movement patterns that drive pain, limit performance, and cause injury to keep recurring. Every finding is documented and translated into a precise, prioritised treatment plan.",
              "Uma análise abrangente e sistemática de como todo o seu corpo se move — identificando desvios posturais, restrições articulares, desequilíbrios musculares e padrões de movimento disfuncionais que impulsionam a dor, limitam a performance e fazem com que as lesões continuem a recorrer. Cada achado é documentado e traduzido num plano de tratamento preciso e priorizado."
            )}
          </p>
          <div className="flex flex-wrap gap-3 mb-8">
            {[
              { en: "Full-Body Analysis", pt: "Análise Corpo Inteiro" },
              { en: "Gait & Video Analysis", pt: "Análise de Marcha & Vídeo" },
              { en: "Written Clinical Report", pt: "Relatório Clínico Escrito" },
              { en: "Prioritised Treatment Plan", pt: "Plano de Tratamento Priorizado" },
            ].map((tag, i) => (
              <span key={i} className="px-3 py-1.5 rounded-full bg-muted/60 border border-border text-xs font-medium text-foreground">
                {isPt ? tag.pt : tag.en}
              </span>
            ))}
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <Link href="/signup">
              <Button size="lg" className="gap-2 bg-gradient-to-r from-purple-500 to-blue-600 hover:from-purple-600 hover:to-blue-700 text-white shadow-lg shadow-purple-500/20">
                {L("Book Assessment", "Marcar Avaliação")} <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="/#services">
              <Button size="lg" variant="outline">{L("View All Services", "Ver Todos os Serviços")}</Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Six Components */}
      <section className="py-14 sm:py-20 bg-card/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-10">
            <span className="inline-block px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold uppercase tracking-wider mb-3">
              {L("What Is Assessed", "O Que É Avaliado")}
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground">
              {L("Six Components of a Complete Assessment", "Seis Componentes de uma Avaliação Completa")}
            </h2>
            <p className="mt-2 text-muted-foreground max-w-2xl">
              {L(
                "No single test reveals the full picture. A biomechanical assessment combines six clinical domains to build a complete map of how your body functions.",
                "Nenhum teste isolado revela o quadro completo. Uma avaliação biomecânica combina seis domínios clínicos para construir um mapa completo de como o seu corpo funciona."
              )}
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {assessmentComponents.map((c, i) => {
              const CIcon = c.icon;
              return (
                <Card key={i} className="border border-border bg-card">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <div className={`w-11 h-11 rounded-xl ${c.color} flex items-center justify-center shrink-0`}>
                        <CIcon className="h-5 w-5" />
                      </div>
                      <span className={`px-2.5 py-1 rounded-full border text-xs font-semibold ${c.badge}`}>
                        {isPt ? c.pt_label : c.en_label}
                      </span>
                    </div>
                    <h3 className="font-bold text-foreground mb-2">{isPt ? c.pt_title : c.en_title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{isPt ? c.pt_desc : c.en_desc}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* Common Findings */}
      <section className="py-14 sm:py-20 bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-10">
            <span className="inline-block px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold uppercase tracking-wider mb-3">
              {L("What We Find", "O Que Encontramos")}
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground">
              {L("The Most Common Hidden Drivers of Pain", "Os Drivers Ocultos Mais Comuns da Dor")}
            </h2>
            <p className="mt-2 text-muted-foreground max-w-2xl">
              {L(
                "These findings are frequently missed in standard consultations because they require a full-body systematic approach to detect.",
                "Estes achados são frequentemente perdidos nas consultas padrão porque requerem uma abordagem sistemática de corpo inteiro para detectar."
              )}
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {findings.map((f, i) => {
              const FIcon = f.icon;
              return (
                <div key={i} className="flex items-start gap-3 p-4 rounded-xl bg-card border border-border">
                  <div className={`w-10 h-10 rounded-lg ${f.color} flex items-center justify-center shrink-0`}>
                    <FIcon className="h-5 w-5" />
                  </div>
                  <p className="text-sm text-foreground leading-relaxed">{isPt ? f.pt : f.en}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Conditions */}
      <section className="py-14 sm:py-20 bg-card/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-10">
            <span className="inline-block px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold uppercase tracking-wider mb-3">
              {L("When to Book", "Quando Marcar")}
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground">
              {L("Clinical Indications", "Indicações Clínicas")}
            </h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {conditions.map((c, i) => (
              <div key={i} className="p-5 rounded-xl bg-background border border-border">
                <div className="flex items-start gap-2 mb-2">
                  <CheckCircle2 className="h-4 w-4 text-purple-400 shrink-0 mt-1" />
                  <h3 className="font-semibold text-foreground">{isPt ? c.pt : c.en}</h3>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed pl-6">{isPt ? c.pt_detail : c.en_detail}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Process */}
      <section className="py-14 sm:py-20 bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-10">
            <span className="inline-block px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold uppercase tracking-wider mb-3">
              {L("The Process", "O Processo")}
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground">
              {L("How the Assessment Works", "Como Funciona a Avaliação")}
            </h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-5">
            {steps.map((s, i) => {
              const SIcon = s.icon;
              return (
                <div key={i} className="relative p-5 rounded-xl bg-card border border-border">
                  <span className="absolute -top-3 left-4 w-7 h-7 rounded-full bg-purple-500 text-white text-xs font-bold flex items-center justify-center shadow-sm">
                    {s.num}
                  </span>
                  <div className={`w-10 h-10 rounded-lg ${s.color} flex items-center justify-center mb-3 mt-1`}>
                    <SIcon className="h-5 w-5" />
                  </div>
                  <h3 className="font-semibold text-foreground text-sm mb-2">{isPt ? s.pt_title : s.en_title}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">{isPt ? s.pt_desc : s.en_desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Report + Who For */}
      <section className="py-14 sm:py-20 bg-card/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-start">
            <div>
              <span className="inline-block px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold uppercase tracking-wider mb-3">
                {L("Written Clinical Report", "Relatório Clínico Escrito")}
              </span>
              <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-4">
                {L("What Your Report Contains", "O Que o Seu Relatório Contém")}
              </h2>
              <p className="text-muted-foreground mb-5 leading-relaxed">
                {L(
                  "Every assessment produces a structured clinical report — not a generic printout, but a document specific to your body, your findings, and your goals.",
                  "Cada avaliação produz um relatório clínico estruturado — não uma impressão genérica, mas um documento específico para o seu corpo, os seus achados e os seus objetivos."
                )}
              </p>
              <ul className="space-y-2">
                {reportSections.map((r, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-foreground">
                    <CheckCircle2 className="h-4 w-4 text-purple-400 shrink-0 mt-0.5" />
                    {isPt ? r.pt : r.en}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <span className="inline-block px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold uppercase tracking-wider mb-3">
                {L("Who Is It For?", "Para Quem É?")}
              </span>
              <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-4">
                {L("Ideal for these patients", "Indicado para estes pacientes")}
              </h2>
              <div className="flex flex-wrap gap-2 mb-8">
                {whoFor.map((w, i) => (
                  <span key={i} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-full bg-muted/60 text-sm font-medium text-foreground border border-border">
                    <CheckCircle2 className="h-3.5 w-3.5 text-purple-400 shrink-0" />
                    {w}
                  </span>
                ))}
              </div>
              <div className="space-y-3">
                {[
                  { icon: Clock, label: L("Duration", "Duração"), value: L("60–90 minutes", "60–90 minutos") },
                  { icon: BarChart3, label: L("Report", "Relatório"), value: L("Written report provided — same day or within 3 days", "Relatório escrito fornecido — no próprio dia ou em 3 dias") },
                  { icon: Zap, label: L("Includes", "Inclui"), value: L("Postural, joint, muscle, gait & functional movement analysis", "Análise postural, articular, muscular, de marcha & movimento funcional") },
                  { icon: Shield, label: L("Next Steps", "Próximos Passos"), value: L("Treatment plan discussed and started at same appointment", "Plano de tratamento discutido e iniciado na mesma consulta") },
                ].map((item, i) => {
                  const IIcon = item.icon;
                  return (
                    <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-background border border-border">
                      <div className="w-9 h-9 rounded-lg bg-purple-500/15 text-purple-400 flex items-center justify-center shrink-0">
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
      <section className="py-14 sm:py-20 bg-background">
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
      <section className="py-14 sm:py-20 bg-gradient-to-r from-purple-500/10 via-blue-500/5 to-background">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-4">
            {L("Stop Treating the Symptom. Find the Cause.", "Pare de Tratar o Sintoma. Encontre a Causa.")}
          </h2>
          <p className="text-muted-foreground mb-8 leading-relaxed">
            {L(
              "Book your comprehensive biomechanical assessment and leave with a clear, evidence-based answer to why your pain keeps returning — and exactly what needs to change.",
              "Marque a sua avaliação biomecânica abrangente e saia com uma resposta clara e baseada em evidências sobre por que a sua dor continua a regressar — e exactamente o que precisa de mudar."
            )}
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/signup">
              <Button size="lg" className="gap-2 bg-gradient-to-r from-purple-500 to-blue-600 hover:from-purple-600 hover:to-blue-700 text-white shadow-lg shadow-purple-500/20">
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
