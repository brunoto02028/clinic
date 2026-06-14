"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft, ArrowRight, Zap, CheckCircle2, ChevronDown,
  Clock, Activity, Brain, Shield, Heart, Target, Waves,
  Cpu, Radio, FlaskConical, Bolt,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useLocale } from "@/hooks/use-locale";

export default function ElectrotherapyPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const { locale } = useLocale();
  const isPt = locale === "pt-BR";
  const L = (en: string, pt: string) => isPt ? pt : en;

  const modalities = [
    {
      icon: Radio,
      color: "bg-amber-100 text-amber-700",
      en_name: "TENS — Transcutaneous Electrical Nerve Stimulation",
      pt_name: "TENS — Estimulação Elétrica Nervosa Transcutânea",
      en_desc: "TENS works by delivering low-voltage electrical impulses through the skin to interrupt pain signals travelling to the brain (Gate Control Theory). At higher frequencies (80–150 Hz) it provides immediate pain relief; at lower frequencies (2–4 Hz) it stimulates the release of endogenous opioids (endorphins and enkephalins) for longer-lasting analgesia. It is completely non-invasive and one of the most widely researched pain-management tools in physiotherapy.",
      pt_desc: "A TENS funciona entregando impulsos elétricos de baixa voltagem através da pele para interromper os sinais de dor que viajam ao cérebro (Teoria do Controlo de Portão). Em frequências mais altas (80–150 Hz) proporciona alívio imediato da dor; em frequências mais baixas (2–4 Hz) estimula a libertação de opioides endógenos (endorfinas e encefalinas) para uma analgesia mais duradoura. É completamente não invasiva e uma das ferramentas de controlo da dor mais estudadas na fisioterapia.",
      en_uses: ["Acute & chronic musculoskeletal pain", "Neuropathic & nerve pain", "Post-operative pain", "Arthritis and joint pain", "Labour pain management"],
      pt_uses: ["Dor musculoesquelética aguda e crónica", "Dor neuropática e nervosa", "Dor pós-operatória", "Artrite e dor articular", "Gestão da dor do parto"],
    },
    {
      icon: Zap,
      color: "bg-orange-100 text-orange-700",
      en_name: "EMS / NMES — Electrical Muscle Stimulation",
      pt_name: "EMS / NMES — Estimulação Elétrica Muscular",
      en_desc: "EMS (Electrical Muscle Stimulation) and NMES (Neuromuscular Electrical Stimulation) use electrical impulses to directly activate motor nerves and produce muscle contractions — bypassing the voluntary nervous system. This is critical when a patient cannot voluntarily contract a muscle due to pain inhibition, neurological impairment, or post-surgical weakness. EMS preserves muscle mass, re-educates firing patterns, and accelerates strength recovery at a rate not achievable through exercise alone in the acute phase.",
      pt_desc: "EMS (Estimulação Elétrica Muscular) e NMES (Estimulação Elétrica Neuromuscular) usam impulsos elétricos para ativar diretamente os nervos motores e produzir contrações musculares — contornando o sistema nervoso voluntário. Isto é fundamental quando um paciente não consegue contrair voluntariamente um músculo devido a inibição pela dor, comprometimento neurológico ou fraqueza pós-cirúrgica. EMS preserva a massa muscular, reeduca os padrões de ativação e acelera a recuperação de força a uma taxa não alcançável apenas com exercício na fase aguda.",
      en_uses: ["Post-surgical muscle re-education (ACL, knee replacement)", "Muscle atrophy prevention during immobilisation", "Quadriceps & glute strengthening", "Shoulder and rotator cuff rehabilitation", "Neurological muscle weakness"],
      pt_uses: ["Reeducação muscular pós-cirúrgica (LCA, prótese de joelho)", "Prevenção de atrofia muscular durante imobilização", "Fortalecimento de quadríceps e glúteos", "Reabilitação do ombro e manguito rotador", "Fraqueza muscular neurológica"],
    },
    {
      icon: Waves,
      color: "bg-cyan-100 text-cyan-700",
      en_name: "Interferential Therapy (IFT)",
      pt_name: "Terapia Interferencial (IFT)",
      en_desc: "Interferential therapy uses two medium-frequency alternating currents (typically 4,000 Hz) that cross within the tissue and produce a low-frequency interference pattern at their intersection. This allows deep tissue penetration (up to 8 cm) without the discomfort of low-frequency currents applied at skin level. The interference beat frequency (1–150 Hz selectable) can be dialled in for analgesia, oedema reduction, improved circulation, or muscle stimulation — making IFT one of the most versatile electrotherapy tools in the clinic.",
      pt_desc: "A terapia interferencial usa duas correntes alternadas de média frequência (tipicamente 4.000 Hz) que se cruzam no interior do tecido e produzem um padrão de interferência de baixa frequência na sua intersecção. Isto permite uma penetração profunda no tecido (até 8 cm) sem o desconforto das correntes de baixa frequência aplicadas ao nível da pele. A frequência de batimento de interferência (1–150 Hz selecionável) pode ser ajustada para analgesia, redução de edema, melhora da circulação ou estimulação muscular — tornando a IFT uma das ferramentas de eletroterapia mais versáteis na clínica.",
      en_uses: ["Deep joint pain (hip, shoulder, spine)", "Oedema and swelling reduction", "Improved tissue circulation", "Subacute and chronic inflammatory conditions", "Pelvic floor dysfunction"],
      pt_uses: ["Dor articular profunda (anca, ombro, coluna)", "Redução de edema e inchaço", "Melhora da circulação tecidual", "Condições inflamatórias subagudas e crónicas", "Disfunção do pavimento pélvico"],
    },
    {
      icon: Activity,
      color: "bg-blue-100 text-blue-700",
      en_name: "Aussie Current (Medium-Frequency Burst AC)",
      pt_name: "Corrente Australiana / Corrente Alça",
      en_desc: "The Australian current (also known as Aussie current or burst-mode medium-frequency AC) operates at 4,000 Hz delivered in 2 ms bursts with a 10 ms interburst interval. This waveform is designed to produce comfortable yet strong muscle contractions by exploiting the skin's impedance characteristics at medium frequency — allowing more current to reach deeper motor units with less surface sensation. It is particularly popular for athletic populations, pelvic floor rehabilitation, and patients who find Russian stimulation too intense. The higher comfort tolerance allows longer treatment sessions and greater patient compliance.",
      pt_desc: "A corrente australiana (também conhecida como corrente alça ou CA de média frequência em rajadas) opera a 4.000 Hz entregue em rajadas de 2 ms com um intervalo entre rajadas de 10 ms. Esta forma de onda é projetada para produzir contrações musculares confortáveis mas fortes, explorando as características de impedância da pele em média frequência — permitindo que mais corrente alcance unidades motoras mais profundas com menos sensação superficial. É particularmente popular para populações atléticas, reabilitação do pavimento pélvico e pacientes que consideram a estimulação russa muito intensa. A maior tolerância ao conforto permite sessões de tratamento mais longas e maior adesão do paciente.",
      en_uses: ["Athletic muscle conditioning and strength recovery", "Pelvic floor rehabilitation", "Post-ACL and post-knee replacement strengthening", "Patients with low tolerance to Russian stimulation", "Arm, trunk, and lower limb re-education"],
      pt_uses: ["Condicionamento muscular atlético e recuperação de força", "Reabilitação do pavimento pélvico", "Fortalecimento pós-LCA e pós-prótese de joelho", "Pacientes com baixa tolerância à estimulação russa", "Reeducação de braço, tronco e membro inferior"],
    },
    {
      icon: Bolt,
      color: "bg-rose-100 text-rose-700",
      en_name: "Russian Stimulation (Kots Current)",
      pt_name: "Corrente Russa (Corrente de Kots)",
      en_desc: "Russian stimulation, developed by Soviet sports scientist Dr Yakov Kots in the 1970s, uses a 2,500 Hz sinusoidal carrier frequency delivered in 10 ms bursts with 10 ms rest periods (50% duty cycle). This burst pattern produces powerful, tetanic muscle contractions that closely mimic voluntary maximal effort. Clinical trials have demonstrated that Russian stimulation can produce 30–40% greater quadriceps torque compared to voluntary exercise alone in post-surgical patients. It is the gold standard for quadriceps re-education following knee surgery (ACL, total knee replacement) and for elite strength development in athlete populations.",
      pt_desc: "A estimulação russa, desenvolvida pelo cientista desportivo soviético Dr. Yakov Kots na década de 1970, usa uma frequência portadora sinusoidal de 2.500 Hz entregue em rajadas de 10 ms com períodos de repouso de 10 ms (ciclo de trabalho de 50%). Este padrão de rajadas produz contrações musculares poderosas e tetânicas que imitam de perto o esforço máximo voluntário. Ensaios clínicos demonstraram que a estimulação russa pode produzir 30–40% mais torque do quadríceps em comparação com o exercício voluntário isolado em pacientes pós-cirúrgicos. É o padrão ouro para reeducação do quadríceps após cirurgia do joelho (LCA, prótese total do joelho) e para desenvolvimento de força de elite em populações atléticas.",
      en_uses: ["Quadriceps re-education post-ACL reconstruction", "Knee replacement rehabilitation", "Elite strength training protocols", "Prevention of post-surgical atrophy", "Hamstring, glute, and shoulder girdle strengthening"],
      pt_uses: ["Reeducação do quadríceps pós-reconstrução do LCA", "Reabilitação de prótese de joelho", "Protocolos de treino de força de elite", "Prevenção de atrofia pós-cirúrgica", "Fortalecimento de isquiotibiais, glúteos e cintura escapular"],
    },
    {
      icon: FlaskConical,
      color: "bg-violet-100 text-violet-700",
      en_name: "Microcurrent (MENS — Microcurrent Electrical Neuromuscular Stimulation)",
      pt_name: "Microcorrente (MENS — Estimulação Neuromuscular Elétrica por Microcorrente)",
      en_desc: "Microcurrent therapy delivers electrical currents in the microampere range (millionths of an ampere) — currents so small they are below the threshold of sensation, making the treatment completely painless. At this intensity, the current does not stimulate nerves or muscles but instead mimics the body's own bioelectrical signals. Research shows that MENS increases ATP (adenosine triphosphate) production by up to 500% at the cellular level, dramatically enhancing the energy available for tissue repair. It also upregulates protein synthesis and reduces cellular inflammation, making it uniquely effective for slow-healing injuries, fracture recovery, chronic inflammatory conditions, and post-surgical tissue repair.",
      pt_desc: "A terapia por microcorrente entrega correntes elétricas na faixa dos microamperes (milionésimos de ampere) — correntes tão pequenas que estão abaixo do limiar de sensação, tornando o tratamento completamente indolor. Nessa intensidade, a corrente não estimula nervos ou músculos, mas sim imita os próprios sinais bioelétricos do corpo. A investigação mostra que o MENS aumenta a produção de ATP (trifosfato de adenosina) em até 500% ao nível celular, aumentando dramaticamente a energia disponível para a reparação tecidual. Também regula positivamente a síntese de proteínas e reduz a inflamação celular, tornando-o exclusivamente eficaz para lesões de cicatrização lenta, recuperação de fraturas, condições inflamatórias crónicas e reparação tecidual pós-cirúrgica.",
      en_uses: ["Slow-healing soft tissue injuries", "Fracture recovery support", "Chronic inflammation and tendinopathy", "Post-surgical tissue repair", "Wound healing and scar tissue management"],
      pt_uses: ["Lesões de tecidos moles de cicatrização lenta", "Suporte à recuperação de fraturas", "Inflamação crónica e tendinopatia", "Reparação tecidual pós-cirúrgica", "Cicatrização de feridas e gestão de tecido cicatricial"],
    },
  ];

  const benefits = [
    { icon: Shield, color: "bg-amber-100 text-amber-700", en: "Evidence-based pain relief without medication or surgery", pt: "Alívio da dor baseado em evidências sem medicação ou cirurgia" },
    { icon: Zap, color: "bg-orange-100 text-orange-700", en: "Multiple modalities in one session — protocols tailored to your exact condition", pt: "Múltiplas modalidades numa sessão — protocolos adaptados à sua condição específica" },
    { icon: Activity, color: "bg-blue-100 text-blue-700", en: "Muscle re-education for patients who cannot voluntarily activate key muscle groups", pt: "Reeducação muscular para pacientes que não conseguem ativar voluntariamente grupos musculares chave" },
    { icon: Heart, color: "bg-rose-100 text-rose-700", en: "Reduced swelling and improved local circulation at the injury site", pt: "Redução do inchaço e melhora da circulação local no local da lesão" },
    { icon: Brain, color: "bg-violet-100 text-violet-700", en: "Cellular-level healing via microcurrent — ATP boost of up to 500%", pt: "Cura ao nível celular via microcorrente — aumento de ATP até 500%" },
    { icon: Target, color: "bg-emerald-100 text-emerald-700", en: "Completely non-invasive, safe, and well-tolerated with minimal side effects", pt: "Completamente não invasivo, seguro e bem tolerado com efeitos secundários mínimos" },
    { icon: Clock, color: "bg-cyan-100 text-cyan-700", en: "Accelerated return to sport and daily function through combined electro + exercise protocols", pt: "Retorno acelerado ao desporto e função diária através de protocolos combinados de eletro + exercício" },
    { icon: Cpu, color: "bg-indigo-100 text-indigo-700", en: "Precise, programmable parameters — your therapist selects the exact waveform for your stage of healing", pt: "Parâmetros precisos e programáveis — o seu terapeuta seleciona a forma de onda exata para o seu estágio de recuperação" },
  ];

  const whoFor = [
    L("Post-Surgical Patients", "Pacientes Pós-Cirúrgicos"),
    L("Athletes & Sports People", "Atletas e Desportistas"),
    L("Chronic Pain Sufferers", "Pacientes com Dor Crónica"),
    L("Neurological Conditions", "Condições Neurológicas"),
    L("Acute Injury Recovery", "Recuperação de Lesão Aguda"),
    L("Elderly & Mobility Issues", "Idosos e Mobilidade Reduzida"),
    L("Fracture Rehabilitation", "Reabilitação de Fraturas"),
    L("Pelvic Floor Dysfunction", "Disfunção do Pavimento Pélvico"),
  ];

  const steps = [
    {
      num: "01", icon: Target, color: "bg-amber-100 text-amber-700",
      en_title: "Comprehensive Assessment", pt_title: "Avaliação Abrangente",
      en_desc: "Your therapist reviews your diagnosis, imaging reports, surgical history, and functional goals. We assess the specific tissues involved, your current pain levels, and any contraindications to establish the safest and most effective protocol for your stage of healing.",
      pt_desc: "O seu terapeuta analisa o seu diagnóstico, relatórios de imagem, histórico cirúrgico e objetivos funcionais. Avaliamos os tecidos específicos envolvidos, os seus níveis de dor atuais e quaisquer contraindicações para estabelecer o protocolo mais seguro e eficaz para o seu estágio de recuperação.",
    },
    {
      num: "02", icon: Cpu, color: "bg-orange-100 text-orange-700",
      en_title: "Modality Selection & Parameter Setting", pt_title: "Seleção de Modalidade e Definição de Parâmetros",
      en_desc: "Based on your assessment, we select the most appropriate modality (or combination of modalities) and programme the precise frequency, intensity, waveform, and duration. Different modalities are often combined in a single session — for example, TENS for pain control followed by Russian stimulation for muscle re-education.",
      pt_desc: "Com base na sua avaliação, selecionamos a modalidade mais adequada (ou combinação de modalidades) e programamos a frequência, intensidade, forma de onda e duração precisas. Diferentes modalidades são frequentemente combinadas numa única sessão — por exemplo, TENS para controlo da dor seguido de estimulação russa para reeducação muscular.",
    },
    {
      num: "03", icon: Zap, color: "bg-blue-100 text-blue-700",
      en_title: "Treatment Session", pt_title: "Sessão de Tratamento",
      en_desc: "Electrodes or probes are placed at clinically relevant sites — over muscles, nerve pathways, or directly at the injury site. Current is progressively increased to the therapeutic level. You will feel tingling, buzzing, or muscle contractions depending on the modality. Microcurrent is completely sub-sensory — you will feel nothing at all.",
      pt_desc: "Elétrodos ou sondas são colocados em locais clinicamente relevantes — sobre músculos, vias nervosas ou diretamente no local da lesão. A corrente é progressivamente aumentada até ao nível terapêutico. Sentirá formigueiro, vibração ou contrações musculares dependendo da modalidade. A microcorrente é completamente sub-sensorial — não sentirá absolutamente nada.",
    },
    {
      num: "04", icon: Activity, color: "bg-emerald-100 text-emerald-700",
      en_title: "Integration with Exercise", pt_title: "Integração com Exercício",
      en_desc: "Where clinically indicated, electrotherapy is combined with active exercise in the same session — for example, EMS applied during voluntary muscle contraction to maximise motor unit recruitment. This combination produces outcomes superior to either treatment alone and is a core principle of our rehabilitation approach.",
      pt_desc: "Quando clinicamente indicado, a eletroterapia é combinada com exercício ativo na mesma sessão — por exemplo, EMS aplicado durante contração muscular voluntária para maximizar o recrutamento de unidades motoras. Esta combinação produz resultados superiores a qualquer tratamento isolado e é um princípio central da nossa abordagem de reabilitação.",
    },
  ];

  const faqs = [
    {
      en_q: "Is electrotherapy painful?",
      pt_q: "A eletroterapia é dolorosa?",
      en_a: "Most electrotherapy modalities are comfortable or painless. TENS produces a tingling sensation; EMS and Russian stimulation produce visible muscle contractions that can feel intense but should not be painful. Microcurrent (MENS) is completely sub-sensory — you feel nothing at all. Your therapist always starts at low intensity and increases gradually based on your feedback. Any discomfort should be reported immediately so parameters can be adjusted.",
      pt_a: "A maioria das modalidades de eletroterapia é confortável ou indolor. A TENS produz uma sensação de formigueiro; o EMS e a estimulação russa produzem contrações musculares visíveis que podem parecer intensas mas não devem ser dolorosas. A microcorrente (MENS) é completamente sub-sensorial — não sente absolutamente nada. O seu terapeuta começa sempre com baixa intensidade e aumenta gradualmente com base no seu feedback. Qualquer desconforto deve ser reportado imediatamente para que os parâmetros possam ser ajustados.",
    },
    {
      en_q: "What is the difference between the Aussie Current and Russian Stimulation?",
      pt_q: "Qual é a diferença entre a Corrente Australiana e a Estimulação Russa?",
      en_a: "Both are medium-frequency burst-mode currents used for muscle strengthening, but they differ in their carrier frequency and burst characteristics. Russian stimulation (2,500 Hz, 50% duty cycle) produces stronger, more forceful contractions and has a longer research history for quadriceps rehabilitation. The Aussie current (4,000 Hz, shorter burst cycles) penetrates more deeply and is generally better tolerated — it produces effective contractions with less discomfort, making it the preferred choice for pelvic floor rehab, sensitive patients, and longer training sessions. Your therapist selects the most appropriate one based on your specific needs, tolerance, and treatment goals.",
      pt_a: "Ambas são correntes de média frequência em modo de rajada usadas para fortalecimento muscular, mas diferem na frequência portadora e nas características das rajadas. A estimulação russa (2.500 Hz, ciclo de trabalho de 50%) produz contrações mais fortes e vigorosas e tem uma história de investigação mais longa para reabilitação do quadríceps. A corrente australiana (4.000 Hz, ciclos de rajada mais curtos) penetra mais profundamente e é geralmente melhor tolerada — produz contrações eficazes com menos desconforto, tornando-a a escolha preferida para reabilitação do pavimento pélvico, pacientes sensíveis e sessões de treino mais longas. O seu terapeuta seleciona a mais adequada com base nas suas necessidades específicas, tolerância e objetivos de tratamento.",
    },
    {
      en_q: "Can electrotherapy be used alongside other treatments?",
      pt_q: "A eletroterapia pode ser usada em simultâneo com outros tratamentos?",
      en_a: "Absolutely — and this is one of its greatest strengths. Electrotherapy is almost always combined with manual therapy, exercise, and in some cases with laser or ultrasound in the same session. The combination of EMS with active exercise, for example, produces significantly greater strength gains than either alone. Microcurrent can be applied simultaneously with MLS laser therapy for a synergistic cellular healing effect. Your therapist designs a multimodal session to maximise every clinic visit.",
      pt_a: "Absolutamente — e esta é uma das suas maiores forças. A eletroterapia é quase sempre combinada com terapia manual, exercício e, em alguns casos, com laser ou ultrassom na mesma sessão. A combinação de EMS com exercício ativo, por exemplo, produz ganhos de força significativamente maiores do que qualquer um isolado. A microcorrente pode ser aplicada simultaneamente com a terapia laser MLS para um efeito sinérgico de cura celular. O seu terapeuta desenha uma sessão multimodal para maximizar cada visita à clínica.",
    },
    {
      en_q: "Who should NOT use electrotherapy?",
      pt_q: "Quem NÃO deve usar eletroterapia?",
      en_a: "Contraindications include: cardiac pacemakers or implanted electronic devices, active malignancy over the treatment area, epilepsy, pregnancy (over abdomen or lower back), open wounds or broken skin at electrode sites, deep vein thrombosis, and areas of absent or impaired sensation. A thorough pre-treatment screening is always conducted to ensure safety. Some conditions are relative contraindications where modified protocols can still be used safely — your therapist will advise.",
      pt_a: "As contraindicações incluem: pacemaker cardíaco ou dispositivos electrónicos implantados, neoplasia maligna ativa sobre a área de tratamento, epilepsia, gravidez (sobre o abdómen ou região lombar), feridas abertas ou pele lesada nos locais dos elétrodos, trombose venosa profunda e áreas com sensação ausente ou diminuída. Uma triagem pré-tratamento completa é sempre realizada para garantir a segurança. Algumas condições são contraindicações relativas onde protocolos modificados ainda podem ser usados com segurança — o seu terapeuta irá aconselhar.",
    },
    {
      en_q: "How many sessions will I need?",
      pt_q: "De quantas sessões precisarei?",
      en_a: "The number of sessions depends entirely on your condition, its severity, and your response to treatment. Acute conditions may show significant improvement in 4–6 sessions. Post-surgical muscle re-education programmes typically run for 8–12 sessions alongside exercise. Chronic pain and neurological conditions may benefit from longer courses. Your therapist will outline a realistic treatment plan at your first appointment and reassess your progress at each stage.",
      pt_a: "O número de sessões depende inteiramente da sua condição, da sua gravidade e da sua resposta ao tratamento. Condições agudas podem mostrar melhora significativa em 4–6 sessões. Os programas de reeducação muscular pós-cirúrgica normalmente decorrem durante 8–12 sessões em paralelo com exercício. A dor crónica e as condições neurológicas podem beneficiar de cursos mais longos. O seu terapeuta delineará um plano de tratamento realista na sua primeira consulta e reavaliará o seu progresso em cada etapa.",
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
      <section className="relative py-12 sm:py-16 lg:py-20 bg-gradient-to-br from-amber-500/[0.07] via-background to-orange-500/[0.05] overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 right-0 w-1/3 h-full bg-gradient-to-l from-amber-500/[0.04] to-transparent" />
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-start gap-5 mb-6">
            <div className="w-16 h-16 rounded-2xl bg-amber-500/15 text-amber-500 flex items-center justify-center shrink-0 shadow-lg shadow-amber-500/10">
              <Zap className="h-8 w-8" />
            </div>
            <div>
              <span className="inline-block px-3 py-1 rounded-full bg-amber-500/15 text-amber-500 text-xs font-semibold uppercase tracking-wider mb-3">
                {L("Electrotherapy", "Eletroterapia")}
              </span>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground leading-tight">
                {L("Advanced Electrotherapy", "Eletroterapia Avançada")}
                <span className="block text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-500">
                  {L("Modalities & Protocols", "Modalidades & Protocolos")}
                </span>
              </h1>
            </div>
          </div>
          <p className="text-base sm:text-lg text-muted-foreground leading-relaxed max-w-3xl mb-8">
            {L(
              "Our clinic offers the full spectrum of evidence-based electrotherapy modalities — from TENS and interferential therapy for pain control, to Russian stimulation and Aussie current for muscle re-education, to sub-sensory microcurrent for cellular repair. Each protocol is precisely matched to your diagnosis, stage of healing, and functional goals.",
              "A nossa clínica oferece o espectro completo de modalidades de eletroterapia baseadas em evidências — desde TENS e terapia interferencial para controlo da dor, até estimulação russa e corrente australiana para reeducação muscular, até microcorrente sub-sensorial para reparação celular. Cada protocolo é precisamente adaptado ao seu diagnóstico, estágio de recuperação e objetivos funcionais."
            )}
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <Link href="/signup">
              <Button size="lg" className="gap-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-lg shadow-amber-500/20">
                {L("Book Assessment", "Marcar Avaliação")} <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="/#services">
              <Button size="lg" variant="outline">{L("View All Services", "Ver Todos os Serviços")}</Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Modalities */}
      <section className="py-14 sm:py-20 bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-10 sm:mb-14">
            <span className="inline-block px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold uppercase tracking-wider mb-3">
              {L("Modalities Available", "Modalidades Disponíveis")}
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground">
              {L("Six Clinical Electrotherapy Modalities", "Seis Modalidades de Eletroterapia Clínica")}
            </h2>
            <p className="mt-2 text-muted-foreground max-w-2xl">
              {L(
                "Each modality has distinct physics, physiological mechanisms, and clinical indications. Your therapist selects and combines them based on your specific pathology.",
                "Cada modalidade tem física, mecanismos fisiológicos e indicações clínicas distintos. O seu terapeuta seleciona-as e combina-as com base na sua patologia específica."
              )}
            </p>
          </div>

          <div className="space-y-6">
            {modalities.map((m, i) => {
              const MIcon = m.icon;
              const uses = isPt ? m.pt_uses : m.en_uses;
              return (
                <Card key={i} className="border border-border bg-card overflow-hidden">
                  <CardContent className="p-0">
                    <div className="p-6 sm:p-8">
                      <div className="flex items-start gap-4 mb-4">
                        <div className={`w-12 h-12 rounded-xl ${m.color} flex items-center justify-center shrink-0`}>
                          <MIcon className="h-6 w-6" />
                        </div>
                        <div>
                          <h3 className="text-lg sm:text-xl font-bold text-foreground leading-snug">
                            {isPt ? m.pt_name : m.en_name}
                          </h3>
                        </div>
                      </div>
                      <p className="text-muted-foreground leading-relaxed mb-5 text-sm sm:text-base">
                        {isPt ? m.pt_desc : m.en_desc}
                      </p>
                      <div>
                        <p className="text-xs font-semibold text-foreground uppercase tracking-wider mb-2">
                          {L("Key Applications", "Principais Aplicações")}
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {uses.map((u, j) => (
                            <span key={j} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-muted/60 text-xs font-medium text-foreground">
                              <CheckCircle2 className="h-3 w-3 text-amber-500 shrink-0" />
                              {u}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-14 sm:py-20 bg-card/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-10">
            <span className="inline-block px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold uppercase tracking-wider mb-3">
              {L("Why Choose Electrotherapy", "Por Que Escolher a Eletroterapia")}
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground">
              {L("Clinical Benefits", "Benefícios Clínicos")}
            </h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {benefits.map((b, i) => {
              const BIcon = b.icon;
              return (
                <div key={i} className="flex items-start gap-3 p-4 rounded-xl bg-background border border-border">
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

      {/* Who Is It For */}
      <section className="py-14 sm:py-20 bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-10 items-start">
            <div>
              <span className="inline-block px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold uppercase tracking-wider mb-3">
                {L("Who Is It For?", "Para Quem É?")}
              </span>
              <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-4">
                {L("Electrotherapy is suitable for", "A eletroterapia é indicada para")}
              </h2>
              <p className="text-muted-foreground leading-relaxed mb-6">
                {L(
                  "Electrotherapy is one of the most versatile tools in physiotherapy — applicable across a wide range of conditions, ages, and stages of recovery. With six distinct modalities, there is almost always a safe and effective option available, even where other treatments may be contraindicated.",
                  "A eletroterapia é uma das ferramentas mais versáteis na fisioterapia — aplicável a uma ampla gama de condições, idades e estágios de recuperação. Com seis modalidades distintas, há quase sempre uma opção segura e eficaz disponível, mesmo onde outros tratamentos possam ser contraindicados."
                )}
              </p>
              <div className="flex flex-wrap gap-2">
                {whoFor.map((w, i) => (
                  <span key={i} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-full bg-muted/60 text-sm font-medium text-foreground border border-border">
                    <CheckCircle2 className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                    {w}
                  </span>
                ))}
              </div>
            </div>

            <div>
              <span className="inline-block px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold uppercase tracking-wider mb-3">
                {L("Session Info", "Informações da Sessão")}
              </span>
              <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-4">
                {L("What to Expect", "O Que Esperar")}
              </h2>
              <div className="space-y-3">
                {[
                  { icon: Clock, label: L("Session Duration", "Duração da Sessão"), value: L("15–45 minutes depending on modality and condition", "15–45 minutos dependendo da modalidade e condição") },
                  { icon: Activity, label: L("Frequency", "Frequência"), value: L("2–3 times per week for most conditions", "2–3 vezes por semana para a maioria das condições") },
                  { icon: Target, label: L("Location", "Local"), value: L("In-clinic only — equipment cannot be replicated at home", "Apenas na clínica — o equipamento não pode ser replicado em casa") },
                  { icon: Shield, label: L("Combined With", "Combinado Com"), value: L("Manual therapy, exercise, laser, or ultrasound in the same session", "Terapia manual, exercício, laser ou ultrassom na mesma sessão") },
                ].map((item, i) => {
                  const IIcon = item.icon;
                  return (
                    <div key={i} className="flex items-start gap-3 p-4 rounded-xl bg-card border border-border">
                      <div className="w-9 h-9 rounded-lg bg-amber-500/15 text-amber-500 flex items-center justify-center shrink-0">
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

      {/* How It Works */}
      <section className="py-14 sm:py-20 bg-card/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-10">
            <span className="inline-block px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold uppercase tracking-wider mb-3">
              {L("The Process", "O Processo")}
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground">
              {L("How a Session Works", "Como Funciona uma Sessão")}
            </h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {steps.map((s, i) => {
              const SIcon = s.icon;
              return (
                <div key={i} className="relative p-6 rounded-xl bg-background border border-border">
                  <span className="absolute -top-3 left-5 w-7 h-7 rounded-full bg-amber-500 text-white text-xs font-bold flex items-center justify-center shadow-sm">
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
      <section className="py-14 sm:py-20 bg-gradient-to-r from-amber-500/10 via-orange-500/5 to-background">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-4">
            {L("Ready to Start Your Recovery?", "Pronto para Iniciar a sua Recuperação?")}
          </h2>
          <p className="text-muted-foreground mb-8 leading-relaxed">
            {L(
              "Book an initial assessment and let us design a precise electrotherapy protocol tailored to your condition, stage of healing, and goals.",
              "Marque uma avaliação inicial e deixe-nos desenhar um protocolo de eletroterapia preciso adaptado à sua condição, estágio de recuperação e objetivos."
            )}
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/signup">
              <Button size="lg" className="gap-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-lg shadow-amber-500/20">
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
