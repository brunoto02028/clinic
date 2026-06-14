"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft, ArrowRight, Activity, CheckCircle2, ChevronDown,
  Clock, Shield, Target, Layers, Zap, RefreshCw,
  BarChart3, Brain, HeartPulse, Crosshair, Flame,
  TrendingUp, Users, AlertTriangle, Waves,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useLocale } from "@/hooks/use-locale";

export default function SportsInjuryPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const { locale } = useLocale();
  const isPt = locale === "pt-BR";
  const L = (en: string, pt: string) => isPt ? pt : en;

  const injuryTypes = [
    {
      icon: Flame,
      color: "bg-rose-100 text-rose-700",
      badge: "bg-rose-500/15 text-rose-400 border-rose-500/20",
      en_label: "Acute Injury",
      pt_label: "Lesão Aguda",
      en_title: "Sudden Onset — Immediate Structural Damage",
      pt_title: "Início Súbito — Dano Estrutural Imediato",
      en_desc: "Acute sports injuries occur from a single traumatic event — a tackle, fall, awkward landing, or collision. They involve immediate tissue disruption: ligament fibres tearing under excessive tensile load, muscle fibres rupturing from excessive eccentric demand, bone fracturing under compressive or shear force. The biological response — pain, swelling, heat, and loss of function — is the inflammatory cascade initiating tissue repair. Clinical management in the acute phase focuses on protecting the injury from further damage, controlling excessive inflammation without eliminating it, and preserving surrounding joint mobility.",
      pt_desc: "As lesões desportivas agudas ocorrem de um único evento traumático — uma entrada, queda, aterragem irregular ou colisão. Envolvem ruptura tecidual imediata: fibras ligamentares a rasgar sob carga tensional excessiva, fibras musculares a romper por exigência excêntrica excessiva, osso a fracturar sob força compressiva ou de corte. A resposta biológica — dor, inchaço, calor e perda de função — é a cascata inflamatória que inicia a reparação tecidual. O tratamento clínico na fase aguda foca-se em proteger a lesão de danos adicionais, controlar a inflamação excessiva sem a eliminar e preservar a mobilidade articular circundante.",
      items: [
        L("Ligament sprains — Grade I, II, III (partial to complete rupture)", "Entorses ligamentares — Grau I, II, III (ruptura parcial a completa)"),
        L("Muscle strains — mild pull to complete tear", "Distensões musculares — estiramento leve a ruptura completa"),
        L("Fractures — stress and traumatic", "Fracturas — de stress e traumáticas"),
        L("Joint dislocations and subluxations", "Luxações e subluxações articulares"),
        L("Contusions and haematomas", "Contusões e hematomas"),
        L("Tendon ruptures (Achilles, quadriceps, rotator cuff)", "Rupturas tendinosas (Aquiles, quadricípite, manguito rotador)"),
      ],
    },
    {
      icon: TrendingUp,
      color: "bg-amber-100 text-amber-700",
      badge: "bg-amber-500/15 text-amber-400 border-amber-500/20",
      en_label: "Overuse Injury",
      pt_label: "Lesão por Uso Excessivo",
      en_title: "Gradual Onset — Load Exceeding Tissue Capacity",
      pt_title: "Início Gradual — Carga Excedendo a Capacidade Tecidual",
      en_desc: "Overuse injuries develop when repetitive mechanical load is applied to a tissue faster than that tissue can repair and remodel itself. The pathological process begins with microdamage accumulation that outpaces biological recovery — initially silent, then progressively symptomatic. The root causes are almost always identifiable: a sudden spike in training volume or intensity, inadequate recovery between sessions, biomechanical inefficiency, movement asymmetry, or nutritional insufficiency. Treating the pain without addressing the load driver guarantees recurrence.",
      pt_desc: "As lesões por uso excessivo desenvolvem-se quando a carga mecânica repetitiva é aplicada a um tecido mais rapidamente do que esse tecido pode reparar-se e remodelar-se. O processo patológico começa com a acumulação de microdano que supera a recuperação biológica — inicialmente silencioso, depois progressivamente sintomático. As causas raiz são quase sempre identificáveis: um aumento súbito no volume ou intensidade de treino, recuperação inadequada entre sessões, ineficiência biomecânica, assimetria de movimento ou insuficiência nutricional. Tratar a dor sem abordar o driver de carga garante recorrência.",
      items: [
        L("Tendinopathies — Achilles, patellar, rotator cuff, proximal hamstring", "Tendinopatias — Aquiles, patelar, manguito rotador, isquiotibial proximal"),
        L("Stress fractures — tibia, metatarsals, navicular, femoral neck", "Fracturas de stress — tíbia, metatársicos, navicular, colo femoral"),
        L("Bursitis — subacromial, trochanteric, pes anserinus", "Bursite — subacromial, trocantérica, anserina"),
        L("Shin splints (medial tibial stress syndrome)", "Periostite tibial (síndrome de stress tibial medial)"),
        L("IT band syndrome — lateral knee pain in runners", "Síndrome da IT band — dor lateral no joelho em corredores"),
        L("Nerve entrapments — piriformis, meralgia paraesthetica", "Compressões nervosas — piriforme, meralgia parestésica"),
      ],
    },
  ];

  const regions = [
    {
      region: L("Shoulder", "Ombro"),
      color: "bg-violet-500/10 text-violet-400 border-violet-500/20",
      items: [
        L("Rotator cuff tears & tendinopathy", "Rupturas & tendinopatia do manguito rotador"),
        L("Shoulder dislocation / instability", "Luxação / instabilidade do ombro"),
        L("SLAP lesions (labral pathology)", "Lesões SLAP (patologia labral)"),
        L("AC joint sprains & separation", "Entorses & separação AC"),
        L("Calcific rotator cuff tendinitis", "Tendinite calcificante do manguito"),
      ],
    },
    {
      region: L("Elbow & Wrist", "Cotovelo & Pulso"),
      color: "bg-blue-500/10 text-blue-400 border-blue-500/20",
      items: [
        L("Lateral epicondylitis — tennis elbow", "Epicondilite lateral — cotovelo de tenista"),
        L("Medial epicondylitis — golfer's elbow", "Epicondilite medial — cotovelo de golfista"),
        L("UCL sprain (thrower's elbow)", "Entorse do LCU (cotovelo do lançador)"),
        L("De Quervain's tenosynovitis", "Tenossinovite de De Quervain"),
        L("Scaphoid fracture & wrist sprains", "Fractura do escafoide & entorses do pulso"),
      ],
    },
    {
      region: L("Hip & Groin", "Anca & Virilha"),
      color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
      items: [
        L("Adductor strains — groin pull", "Distensões dos adutores — pubalgia"),
        L("Hip flexor strains (iliopsoas)", "Distensões do flexor do quadril (iliopsoas)"),
        L("Femoroacetabular impingement (FAI)", "Impingement femoroacetabular (IFA)"),
        L("Hip labral tears", "Rupturas do lábrum da anca"),
        L("Proximal hamstring tendinopathy", "Tendinopatia isquiotibial proximal"),
      ],
    },
    {
      region: L("Knee", "Joelho"),
      color: "bg-rose-500/10 text-rose-400 border-rose-500/20",
      items: [
        L("ACL sprain & post-ACL reconstruction", "Entorse do LCA & pós-reconstrução LCA"),
        L("Meniscal tears (medial & lateral)", "Rupturas meniscais (medial & lateral)"),
        L("Patellofemoral pain syndrome", "Síndrome da dor patelofemoral"),
        L("Patellar tendinopathy — jumper's knee", "Tendinopatia patelar — joelho do saltador"),
        L("MCL, LCL, PCL sprains", "Entorses do LCM, LCL, LCP"),
      ],
    },
    {
      region: L("Lower Leg & Ankle", "Perna & Tornozelo"),
      color: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
      items: [
        L("Lateral ankle sprain — ATFL, CFL", "Entorse lateral do tornozelo — LTFA, LCF"),
        L("High ankle sprain (syndesmosis)", "Entorse alta do tornozelo (sindesmose)"),
        L("Achilles tendinopathy & partial tears", "Tendinopatia do Aquiles & rupturas parciais"),
        L("Calf strains — gastrocnemius & soleus", "Distensões do gémeo — gastrocnémio & sóleo"),
        L("Shin splints & tibial stress fractures", "Periostite tibial & fracturas de stress tibial"),
      ],
    },
    {
      region: L("Foot", "Pé"),
      color: "bg-amber-500/10 text-amber-400 border-amber-500/20",
      items: [
        L("Plantar fasciitis — heel & arch pain", "Fasceíte plantar — dor no calcanhar & arco"),
        L("Metatarsal stress fractures", "Fracturas de stress metatarsais"),
        L("Peroneal tendon tears & subluxation", "Rupturas & subluxação dos tendões peroniais"),
        L("Sesamoiditis & turf toe", "Sesamoidite & turf toe"),
        L("Navicular stress fracture (high risk in track athletes)", "Fractura de stress do navicular (alto risco em atletas de pista)"),
      ],
    },
  ];

  const rehabilitationPhases = [
    {
      phase: "01",
      icon: Shield,
      color: "bg-rose-100 text-rose-700",
      en_title: "Acute Phase — Protect & Control",
      pt_title: "Fase Aguda — Proteger & Controlar",
      en_timeframe: "Days 1–7 (acute injuries)",
      pt_timeframe: "Dias 1–7 (lesões agudas)",
      en_desc: "Goal: protect the injured tissue from further damage while managing pain and excessive swelling. PEACE & LOVE protocol (Protection, Elevation, Avoid anti-inflammatories, Compression, Education — followed by Load, Optimism, Vascularisation, Exercise). We replace the outdated RICE protocol with evidence-based acute management that does not suppress the inflammatory response needed for optimal tissue healing. Electrotherapy (TENS, EMS at low frequencies) is applied from day 1 for analgesia and to maintain muscle activation.",
      pt_desc: "Objectivo: proteger o tecido lesionado de danos adicionais enquanto gere a dor e o inchaço excessivo. Protocolo PEACE & LOVE (Proteção, Elevação, Evitar anti-inflamatórios, Compressão, Educação — seguido de Carga, Otimismo, Vascularização, Exercício). Substituímos o protocolo RICE desatualizado por uma gestão aguda baseada em evidências que não suprime a resposta inflamatória necessária para a cicatrização tecidual óptima. A eletroterapia (TENS, EMS a baixas frequências) é aplicada desde o dia 1 para analgesia e para manter a activação muscular.",
    },
    {
      phase: "02",
      icon: RefreshCw,
      color: "bg-amber-100 text-amber-700",
      en_title: "Subacute Phase — Restore",
      pt_title: "Fase Subaguda — Restaurar",
      en_timeframe: "Week 1–6 (injury dependent)",
      pt_timeframe: "Semana 1–6 (dependente da lesão)",
      en_desc: "Goal: restore full pain-free range of motion, normalise tissue loading tolerance, and begin rebuilding the neuromuscular control lost at the time of injury. Proprioception is among the first casualties of any joint injury — the mechanoreceptors within the damaged tissue are disrupted, impairing the joint's ability to sense its own position and respond to perturbation. Neuromuscular re-education begins in this phase. Therapeutic ultrasound and MLS laser are used to accelerate tissue repair. Loading is graded — beginning with isometric, progressing to isotonic, then functional movement patterns.",
      pt_desc: "Objectivo: restaurar amplitude de movimento completa sem dor, normalizar a tolerância de carga tecidual e começar a reconstruir o controlo neuromuscular perdido no momento da lesão. A propriocepção está entre as primeiras vítimas de qualquer lesão articular — os mecanorreceptores dentro do tecido danificado são perturbados, prejudicando a capacidade da articulação de sentir a sua própria posição e responder à perturbação. A reeducação neuromuscular começa nesta fase. O ultrassom terapêutico e o laser MLS são usados para acelerar a reparação tecidual. A carga é graduada — começando com isométrico, progredindo para isotónico, depois padrões de movimento funcional.",
    },
    {
      phase: "03",
      icon: Zap,
      color: "bg-blue-100 text-blue-700",
      en_title: "Rehabilitation Phase — Rebuild",
      pt_title: "Fase de Reabilitação — Reconstruir",
      en_timeframe: "Week 3–12+ (injury dependent)",
      pt_timeframe: "Semana 3–12+ (dependente da lesão)",
      en_desc: "Goal: rebuild full strength, power, and movement quality to at least the pre-injury level — and ideally beyond it. Progressive overload principles are applied systematically: load, volume, and complexity are increased as strength and movement quality milestones are achieved. Sport-specific movement patterns are introduced progressively. Limb symmetry index (LSI) — the ratio of injured to uninjured side strength — is measured objectively. A minimum LSI of 90% is required before return to full training in most protocols; 95%+ for high-demand sports.",
      pt_desc: "Objectivo: reconstruir força, potência e qualidade de movimento completas pelo menos ao nível pré-lesão — e idealmente além disso. Os princípios de sobrecarga progressiva são aplicados sistematicamente: a carga, o volume e a complexidade são aumentados à medida que os marcos de força e qualidade de movimento são alcançados. Os padrões de movimento específicos do desporto são introduzidos progressivamente. O índice de simetria dos membros (ISM) — a razão entre a força do lado lesionado e do lado não lesionado — é medido objectivamente. Um ISM mínimo de 90% é necessário antes do retorno ao treino completo na maioria dos protocolos; 95%+ para desportos de alta exigência.",
    },
    {
      phase: "04",
      icon: Target,
      color: "bg-emerald-100 text-emerald-700",
      en_title: "Return to Sport — Criteria-Based Clearance",
      pt_title: "Retorno ao Desporto — Liberação Baseada em Critérios",
      en_timeframe: "Individualised — criteria-driven, not time-driven",
      pt_timeframe: "Individualizado — critérios, não tempo",
      en_desc: "Return to full sport is not determined by the calendar — it is determined by objective clinical criteria. The return-to-sport decision integrates: limb symmetry index ≥90–95%, pain-free sport-specific movement under full load, psychological readiness (ACL-RSI or equivalent scale score ≥65), neuromuscular control quality during high-speed and directional change tasks, and confirmation from the treating therapist. Premature return is the primary driver of re-injury and long-term sequelae. We will not clear a patient until every criterion is met.",
      pt_desc: "O retorno ao desporto completo não é determinado pelo calendário — é determinado por critérios clínicos objectivos. A decisão de retorno ao desporto integra: índice de simetria dos membros ≥90–95%, movimento específico do desporto sem dor sob carga total, prontidão psicológica (pontuação ACL-RSI ou escala equivalente ≥65), qualidade do controlo neuromuscular durante tarefas de alta velocidade e mudança de direção, e confirmação do terapeuta responsável. O retorno prematuro é o principal driver de re-lesão e sequelas a longo prazo. Não liberamos um paciente até que cada critério seja cumprido.",
    },
  ];

  const loadManagement = [
    {
      icon: BarChart3, color: "bg-blue-100 text-blue-700",
      en_title: "Acute:Chronic Workload Ratio (ACWR)",
      pt_title: "Rácio Carga Aguda:Crónica (RCAC)",
      en_desc: "The ACWR compares the training load of the past week (acute load) to the average load of the preceding 4 weeks (chronic load). Research from Tim Gabbett's group (BJSM, 2016) demonstrated that athletes with an ACWR between 0.8–1.3 have the lowest injury risk. Ratios >1.5 — representing a sudden spike in load — are associated with a 2–4× increase in injury risk. We use session RPE (rate of perceived exertion × training minutes) to calculate load and flag dangerous spikes.",
      pt_desc: "O RCAC compara a carga de treino da semana passada (carga aguda) com a carga média das 4 semanas precedentes (carga crónica). A investigação do grupo de Tim Gabbett (BJSM, 2016) demonstrou que atletas com um RCAC entre 0.8–1.3 têm o menor risco de lesão. Rácios >1.5 — representando um aumento súbito de carga — estão associados a um aumento de 2–4× no risco de lesão. Utilizamos a PSE da sessão (percepção subjectiva de esforço × minutos de treino) para calcular a carga e sinalizar picos perigosos.",
    },
    {
      icon: HeartPulse, color: "bg-rose-100 text-rose-700",
      en_title: "HRV-Based Recovery Monitoring",
      pt_title: "Monitorização de Recuperação Baseada em VFC",
      en_desc: "Heart rate variability (HRV) is the most sensitive non-invasive marker of autonomic nervous system recovery status. A suppressed morning HRV — measured immediately upon waking before getting out of bed — indicates incomplete recovery and elevated injury risk for that training session. We integrate HRV data (from Whoop, Garmin, Polar, or Oura) into load management decisions: high HRV = proceed as planned; moderate suppression = reduce intensity; significant suppression = active recovery session only.",
      pt_desc: "A variabilidade da frequência cardíaca (VFC) é o marcador não invasivo mais sensível do estado de recuperação do sistema nervoso autónomo. Uma VFC matinal suprimida — medida imediatamente ao acordar antes de sair da cama — indica recuperação incompleta e risco elevado de lesão para essa sessão de treino. Integramos dados de VFC (Whoop, Garmin, Polar ou Oura) nas decisões de gestão de carga: VFC alta = prosseguir conforme planeado; supressão moderada = reduzir intensidade; supressão significativa = apenas sessão de recuperação activa.",
    },
    {
      icon: TrendingUp, color: "bg-emerald-100 text-emerald-700",
      en_title: "Training Monotony & Strain",
      pt_title: "Monotonia & Strain de Treino",
      en_desc: "Training monotony (repetitive daily loads with little variation) increases injury risk independently of total volume, because it eliminates the day-to-day variation that tissues need to recover fully between sessions. We calculate weekly training monotony (mean daily load ÷ SD of daily load) — values >2 signal excessive monotony. Training strain (monotony × weekly load) identifies the combined risk of both high volume and low variation. Periodisation — planned variation of high, moderate, and low intensity days — is the primary tool for managing these metrics.",
      pt_desc: "A monotonia do treino (cargas diárias repetitivas com pouca variação) aumenta o risco de lesão independentemente do volume total, porque elimina a variação dia-a-dia de que os tecidos precisam para recuperar completamente entre sessões. Calculamos a monotonia de treino semanal (carga diária média ÷ DP da carga diária) — valores >2 sinalizam monotonia excessiva. O strain de treino (monotonia × carga semanal) identifica o risco combinado de alto volume e baixa variação. A periodização — variação planeada de dias de alta, média e baixa intensidade — é a ferramenta principal para gerir estas métricas.",
    },
    {
      icon: Brain, color: "bg-violet-100 text-violet-700",
      en_title: "Psychological Readiness — Often Overlooked",
      pt_title: "Prontidão Psicológica — Frequentemente Ignorada",
      en_desc: "Fear of re-injury is the most underrecognised barrier to full sport recovery. Research shows that athletes who return to sport without meeting psychological readiness criteria have a 5× higher re-injury rate than those who do — regardless of physical criteria being met. We use validated tools (ACL-RSI, Tampa Scale of Kinesiophobia, FABQ) to quantify fear avoidance and kinesiophobia, and integrate psychological support strategies — graded exposure, education, and confidence-building progressions — directly into the rehabilitation programme.",
      pt_desc: "O medo de re-lesão é a barreira mais subreconhecida para a recuperação desportiva completa. A investigação mostra que atletas que retornam ao desporto sem cumprir critérios de prontidão psicológica têm uma taxa de re-lesão 5× maior do que aqueles que cumprem — independentemente dos critérios físicos serem cumpridos. Utilizamos ferramentas validadas (ACL-RSI, Escala de Tampa de Cinesiofobia, FABQ) para quantificar a evitação por medo e a cinesiofobia, e integramos estratégias de apoio psicológico — exposição graduada, educação e progressões de construção de confiança — directamente no programa de reabilitação.",
    },
  ];

  const faqs = [
    {
      en_q: "Should I rest completely until my sports injury stops hurting?",
      pt_q: "Devo repousar completamente até a minha lesão desportiva deixar de doer?",
      en_a: "Complete rest beyond the initial protection period (24–72 hours for acute injuries) is almost never the right answer — and for overuse injuries, it is never the right answer. Research consistently shows that graded loading accelerates tissue healing faster than immobilisation. Tendon, cartilage, and ligament tissue require mechanical stimulus to remodel correctly — without it, the new tissue is deposited in a disorganised, weaker structure. The goal in rehabilitation is to find the optimal load zone: enough mechanical stimulus to drive positive tissue remodelling, but not so much that it re-injures the healing tissue. Your therapist calculates this individually and adjusts it at every session.",
      pt_a: "O repouso completo para além do período de proteção inicial (24–72 horas para lesões agudas) quase nunca é a resposta correcta — e para lesões por uso excessivo, nunca é a resposta correcta. A investigação mostra consistentemente que a carga graduada acelera a cicatrização tecidual mais rapidamente do que a imobilização. O tecido tendinoso, cartilaginoso e ligamentar requer estímulo mecânico para remodelar correctamente — sem ele, o novo tecido é depositado numa estrutura desorganizada e mais fraca. O objectivo na reabilitação é encontrar a zona de carga óptima: estímulo mecânico suficiente para impulsionar a remodelação tecidual positiva, mas não tanto que re-lesione o tecido em cicatrização. O seu terapeuta calcula isto individualmente e ajusta em cada sessão.",
    },
    {
      en_q: "How long does sports injury rehabilitation take?",
      pt_q: "Quanto tempo dura a reabilitação de uma lesão desportiva?",
      en_a: "It depends entirely on the tissue type, injury severity, and how consistently the programme is followed. General timelines: Grade I ligament sprain (stretching, no fibres torn) — 1–3 weeks. Grade II ligament sprain (partial tear, <50% fibres) — 3–8 weeks. Grade III sprain (complete rupture, conservative management) — 8–16 weeks. Muscle strain Grade II — 4–8 weeks. Tendinopathy (chronic) — 8–16 weeks with progressive loading. ACL reconstruction — 9–12 months for return to high-demand sport (criteria-based, not time-based). Stress fractures — 6–12 weeks protected loading plus 4–8 weeks return to training. These are average ranges — your programme may be faster or longer depending on individual biology, age, nutrition, and sleep quality.",
      pt_a: "Depende inteiramente do tipo de tecido, gravidade da lesão e consistência com que o programa é seguido. Prazos gerais: Entorse ligamentar grau I (estiramento, sem fibras rasgadas) — 1–3 semanas. Entorse grau II (ruptura parcial, <50% das fibras) — 3–8 semanas. Entorse grau III (ruptura completa, gestão conservadora) — 8–16 semanas. Distensão muscular grau II — 4–8 semanas. Tendinopatia (crónica) — 8–16 semanas com carga progressiva. Reconstrução do LCA — 9–12 meses para retorno ao desporto de alta exigência (baseado em critérios, não em tempo). Fracturas de stress — 6–12 semanas de carga protegida mais 4–8 semanas de retorno ao treino. Estes são intervalos médios — o seu programa pode ser mais rápido ou mais longo dependendo da biologia individual, idade, nutrição e qualidade do sono.",
    },
    {
      en_q: "What is the difference between a Grade I, II, and III ligament sprain?",
      pt_q: "Qual é a diferença entre uma entorse ligamentar de Grau I, II e III?",
      en_a: "Ligament injuries are classified by the proportion of fibres disrupted and the mechanical consequence on joint stability. Grade I: Microtearing of individual fibres with intact ligament continuity. The joint tests stable to clinical stress testing. Pain and tenderness present but weight-bearing is possible. Recovery 1–3 weeks. Grade II: Partial rupture — a significant number of fibres are torn but the ligament maintains some continuity. The joint may show increased laxity on stress testing but has a definite endpoint. Weight-bearing is painful and often requires support. Recovery 4–8 weeks for most ligaments, longer for complex joints. Grade III: Complete rupture — the ligament is fully torn, joint shows excessive laxity with no firm endpoint on stress testing. Management can be conservative (bracing + progressive loading) or surgical depending on the specific ligament, joint demands, and functional requirements of the patient.",
      pt_a: "As lesões ligamentares são classificadas pela proporção de fibras perturbadas e a consequência mecânica na estabilidade articular. Grau I: Micro-ruptura de fibras individuais com continuidade ligamentar intacta. A articulação testa estável nos testes de stress clínico. Dor e sensibilidade presentes, mas a carga é possível. Recuperação 1–3 semanas. Grau II: Ruptura parcial — um número significativo de fibras está rasgado, mas o ligamento mantém alguma continuidade. A articulação pode mostrar laxidez aumentada nos testes de stress mas tem um ponto final definido. A carga é dolorosa e frequentemente requer suporte. Recuperação 4–8 semanas para a maioria dos ligamentos, mais longa para articulações complexas. Grau III: Ruptura completa — o ligamento está completamente rasgado, a articulação mostra laxidez excessiva sem ponto final firme nos testes de stress. A gestão pode ser conservadora (imobilização + carga progressiva) ou cirúrgica dependendo do ligamento específico, das exigências articulares e dos requisitos funcionais do paciente.",
    },
    {
      en_q: "What is a tendinopathy and why is it different from tendinitis?",
      pt_q: "O que é uma tendinopatia e porque é diferente de tendinite?",
      en_a: "The terminology shift from 'tendinitis' to 'tendinopathy' reflects a fundamental change in understanding the pathological process. Tendinitis implies active inflammation — but histological studies of chronic tendon pain consistently show minimal inflammatory cells within the tendon tissue. Instead, the pathological changes are degenerative: disorganised collagen fibre arrangement, tenocyte death, increased ground substance (mucoid degeneration), and neovascularisation (new abnormal blood vessel ingrowth that co-travels with nerves, directly contributing to pain). This means anti-inflammatory drugs (NSAIDs, corticosteroid injections) have limited long-term efficacy for tendinopathy — they treat a process that isn't the primary pathology. The most evidence-based treatment for tendinopathy is progressive tendon loading (heavy slow resistance training), which drives collagen synthesis, fibre realignment, and restoration of normal tendon architecture.",
      pt_a: "A mudança terminológica de 'tendinite' para 'tendinopatia' reflecte uma mudança fundamental na compreensão do processo patológico. Tendinite implica inflamação activa — mas os estudos histológicos da dor tendinosa crónica mostram consistentemente células inflamatórias mínimas dentro do tecido tendinoso. Em vez disso, as alterações patológicas são degenerativas: arranjo desordenado das fibras de colagénio, morte de tenócitos, aumento da substância fundamental (degeneração mucoide) e neovascularização (novo crescimento anormal de vasos sanguíneos que co-viaja com nervos, contribuindo directamente para a dor). Isto significa que os medicamentos anti-inflamatórios (AINEs, injeções de corticosteroides) têm eficácia limitada a longo prazo para a tendinopatia — tratam um processo que não é a patologia primária. O tratamento mais baseado em evidências para a tendinopatia é a carga tendinosa progressiva (treino de resistência pesado e lento), que impulsiona a síntese de colagénio, o realinhamento das fibras e a restauração da arquitectura tendinosa normal.",
    },
    {
      en_q: "My scan (MRI or ultrasound) shows a tear — does that mean I need surgery?",
      pt_q: "O meu exame (RM ou ecografia) mostra uma ruptura — isso significa que preciso de cirurgia?",
      en_a: "Not necessarily — and this is one of the most important and consistently misunderstood areas in sports medicine. Imaging findings and symptoms have a surprisingly weak correlation. Large rotator cuff tears, for example, are found in roughly 25% of asymptomatic people over 60 years old on MRI — their tendons are torn but they have no pain. Conversely, some patients with severe pain have minimal structural change on imaging. The clinical decision for surgery is made on functional criteria: does the tear cause meaningful functional loss or instability that conservative treatment (rehabilitation, loading, manual therapy, electrotherapy) cannot adequately restore? For the majority of partial tears, even significant ones, a well-structured conservative programme achieves outcomes equivalent or superior to surgery — without surgical risks, recovery time, or post-operative rehabilitation costs.",
      pt_a: "Não necessariamente — e esta é uma das áreas mais importantes e consistentemente mal compreendidas na medicina desportiva. Os achados de imagem e os sintomas têm uma correlação surpreendentemente fraca. As rupturas grandes do manguito rotador, por exemplo, são encontradas em aproximadamente 25% das pessoas assintomáticas com mais de 60 anos em RM — os seus tendões estão rasgados mas não têm dor. Inversamente, alguns pacientes com dor grave têm alteração estrutural mínima na imagem. A decisão clínica para cirurgia é tomada com base em critérios funcionais: a ruptura causa perda funcional significativa ou instabilidade que o tratamento conservador (reabilitação, carga, terapia manual, eletroterapia) não consegue adequadamente restaurar? Para a maioria das rupturas parciais, mesmo as significativas, um programa conservador bem estruturado alcança resultados equivalentes ou superiores à cirurgia — sem riscos cirúrgicos, tempo de recuperação ou custos de reabilitação pós-operatória.",
    },
    {
      en_q: "Can I prevent sports injuries from recurring through rehabilitation?",
      pt_q: "Posso prevenir a recorrência de lesões desportivas através da reabilitação?",
      en_a: "Yes — and this is one of the most powerful applications of evidence-based rehabilitation. Re-injury risk after an inadequately rehabilitated sports injury is dramatically elevated: after a lateral ankle sprain, athletes who do not complete proprioceptive neuromuscular rehabilitation have a 70% re-injury rate within 1 year. After ACL injury, athletes who return without meeting psychological and physical criteria have a re-injury rate of 15–25%. After hamstring strain, the most powerful predictor of re-injury is the deficit in eccentric hamstring strength versus the uninjured leg at the time of return to sport. Every aspect of our return-to-sport programme is designed with secondary prevention in mind: correcting the movement patterns and strength deficits that created vulnerability to the original injury.",
      pt_a: "Sim — e esta é uma das aplicações mais poderosas da reabilitação baseada em evidências. O risco de re-lesão após uma lesão desportiva inadequadamente reabilitada é dramaticamente elevado: após uma entorse lateral do tornozelo, atletas que não completam a reabilitação neuromuscular proprioceptiva têm uma taxa de re-lesão de 70% num ano. Após lesão do LCA, atletas que retornam sem cumprir critérios psicológicos e físicos têm uma taxa de re-lesão de 15–25%. Após distensão dos isquiotibiais, o preditor mais poderoso de re-lesão é o défice de força excêntrica dos isquiotibiais versus a perna não lesionada no momento do retorno ao desporto. Cada aspecto do nosso programa de retorno ao desporto é concebido com prevenção secundária em mente: corrigindo os padrões de movimento e défices de força que criaram vulnerabilidade à lesão original.",
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
          <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-orange-500/[0.06] to-transparent" />
          <div className="absolute bottom-0 left-0 w-1/3 h-2/3 bg-gradient-to-tr from-rose-500/[0.04] to-transparent" />
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-start gap-5 mb-6">
            <div className="w-16 h-16 rounded-2xl bg-orange-500/15 text-orange-400 flex items-center justify-center shrink-0 shadow-lg shadow-orange-500/10">
              <Activity className="h-8 w-8" />
            </div>
            <div>
              <span className="inline-block px-3 py-1 rounded-full bg-orange-500/15 text-orange-400 text-xs font-semibold uppercase tracking-wider mb-3">
                {L("Sports Injury Treatment", "Tratamento de Lesões Desportivas")}
              </span>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground leading-tight">
                {L("Get Back to Sport.", "Voltar ao Desporto.")}
                <span className="block text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-rose-500">
                  {L("Faster. Stronger. Safer.", "Mais Rápido. Mais Forte. Mais Seguro.")}
                </span>
              </h1>
            </div>
          </div>
          <p className="text-base sm:text-lg text-muted-foreground leading-relaxed max-w-3xl mb-6">
            {L(
              "Sports injury rehabilitation built on criteria-based return to sport — not arbitrary timelines. Every programme is designed to address the root cause of injury, restore tissue tolerance beyond pre-injury levels, and return you to full athletic function with measurably lower re-injury risk.",
              "Reabilitação de lesões desportivas construída em retorno ao desporto baseado em critérios — não em prazos arbitrários. Cada programa é concebido para abordar a causa raiz da lesão, restaurar a tolerância tecidual além dos níveis pré-lesão e devolvê-lo à função atlética completa com risco de re-lesão mensuravelmente menor."
            )}
          </p>
          <div className="flex flex-wrap gap-3 mb-8">
            {[
              { en: "Acute & Overuse Injuries", pt: "Lesões Agudas & Uso Excessivo" },
              { en: "Criteria-Based Return to Sport", pt: "Retorno Baseado em Critérios" },
              { en: "Load Management & HRV", pt: "Gestão de Carga & VFC" },
              { en: "Multi-Modal Treatment", pt: "Tratamento Multi-Modal" },
            ].map((tag, i) => (
              <span key={i} className="px-3 py-1.5 rounded-full bg-muted/60 border border-border text-xs font-medium text-foreground">
                {isPt ? tag.pt : tag.en}
              </span>
            ))}
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <Link href="/signup">
              <Button size="lg" className="gap-2 bg-gradient-to-r from-orange-500 to-rose-600 hover:from-orange-600 hover:to-rose-700 text-white shadow-lg shadow-orange-500/20">
                {L("Book Assessment", "Marcar Avaliação")} <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="/#services">
              <Button size="lg" variant="outline">{L("View All Services", "Ver Todos os Serviços")}</Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Injury Types */}
      <section className="py-14 sm:py-20 bg-card/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-10">
            <span className="inline-block px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold uppercase tracking-wider mb-3">
              {L("Understanding Sports Injuries", "Compreender as Lesões Desportivas")}
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground">
              {L("Acute vs Overuse — Different Mechanisms, Different Protocols", "Aguda vs Uso Excessivo — Mecanismos Diferentes, Protocolos Diferentes")}
            </h2>
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            {injuryTypes.map((t, i) => {
              const TIcon = t.icon;
              return (
                <Card key={i} className="border border-border bg-card">
                  <CardContent className="p-6 sm:p-8">
                    <div className="flex items-center gap-3 mb-4">
                      <div className={`w-11 h-11 rounded-xl ${t.color} flex items-center justify-center shrink-0`}>
                        <TIcon className="h-5 w-5" />
                      </div>
                      <span className={`px-2.5 py-1 rounded-full border text-xs font-semibold ${t.badge}`}>
                        {isPt ? t.pt_label : t.en_label}
                      </span>
                    </div>
                    <h3 className="text-lg font-bold text-foreground mb-3">{isPt ? t.pt_title : t.en_title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed mb-5">{isPt ? t.pt_desc : t.en_desc}</p>
                    <ul className="space-y-2">
                      {t.items.map((item, j) => (
                        <li key={j} className="flex items-start gap-2 text-sm text-foreground">
                          <CheckCircle2 className="h-4 w-4 text-orange-400 shrink-0 mt-0.5" />
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

      {/* Regions */}
      <section className="py-14 sm:py-20 bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-10">
            <span className="inline-block px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold uppercase tracking-wider mb-3">
              {L("Conditions Treated", "Condições Tratadas")}
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground">
              {L("Sports Injuries by Region", "Lesões Desportivas por Região")}
            </h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {regions.map((r, i) => (
              <div key={i} className={`rounded-xl border ${r.color} p-5`}>
                <h3 className="font-bold text-sm uppercase tracking-wider mb-3 opacity-90">{r.region}</h3>
                <ul className="space-y-2">
                  {r.items.map((item, j) => (
                    <li key={j} className="flex items-start gap-2 text-xs text-foreground">
                      <CheckCircle2 className="h-3.5 w-3.5 text-orange-400 shrink-0 mt-0.5" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Rehabilitation Phases */}
      <section className="py-14 sm:py-20 bg-card/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-10">
            <span className="inline-block px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold uppercase tracking-wider mb-3">
              {L("Rehabilitation Framework", "Framework de Reabilitação")}
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground">
              {L("Four Phases of Sports Injury Rehabilitation", "Quatro Fases da Reabilitação de Lesões Desportivas")}
            </h2>
          </div>
          <div className="grid sm:grid-cols-2 gap-5">
            {rehabilitationPhases.map((p, i) => {
              const PIcon = p.icon;
              return (
                <div key={i} className="relative p-6 rounded-xl bg-background border border-border">
                  <span className="absolute -top-3 left-5 w-8 h-8 rounded-full bg-orange-500 text-white text-xs font-bold flex items-center justify-center shadow-sm">
                    {p.phase}
                  </span>
                  <div className="flex items-center gap-3 mb-3 mt-2">
                    <div className={`w-10 h-10 rounded-lg ${p.color} flex items-center justify-center shrink-0`}>
                      <PIcon className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-foreground">{isPt ? p.pt_title : p.en_title}</h3>
                      <p className="text-xs text-muted-foreground">{isPt ? p.pt_timeframe : p.en_timeframe}</p>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">{isPt ? p.pt_desc : p.en_desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Load Management */}
      <section className="py-14 sm:py-20 bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-10">
            <span className="inline-block px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold uppercase tracking-wider mb-3">
              {L("Sports Science Applied", "Ciência Desportiva Aplicada")}
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground">
              {L("Load Management & Injury Prevention Science", "Ciência da Gestão de Carga & Prevenção de Lesões")}
            </h2>
            <p className="mt-2 text-muted-foreground max-w-2xl">
              {L(
                "Returning to sport is one thing. Staying injury-free once you're back is another. We apply evidence-based load monitoring to prevent the next injury before it happens.",
                "Retornar ao desporto é uma coisa. Manter-se sem lesões depois de voltar é outra. Aplicamos monitorização de carga baseada em evidências para prevenir a próxima lesão antes que aconteça."
              )}
            </p>
          </div>
          <div className="grid sm:grid-cols-2 gap-5">
            {loadManagement.map((l, i) => {
              const LIcon = l.icon;
              return (
                <div key={i} className="p-6 rounded-xl bg-card border border-border">
                  <div className="flex items-start gap-3 mb-3">
                    <div className={`w-10 h-10 rounded-lg ${l.color} flex items-center justify-center shrink-0`}>
                      <LIcon className="h-5 w-5" />
                    </div>
                    <h3 className="font-bold text-foreground">{isPt ? l.pt_title : l.en_title}</h3>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">{isPt ? l.pt_desc : l.en_desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Session Info */}
      <section className="py-14 sm:py-20 bg-card/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-start">
            <div>
              <span className="inline-block px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold uppercase tracking-wider mb-3">
                {L("Treatment Approach", "Abordagem de Tratamento")}
              </span>
              <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-4">
                {L("Multi-Modal. Evidence-Based.", "Multi-Modal. Baseado em Evidências.")}
              </h2>
              <p className="text-muted-foreground leading-relaxed mb-6">
                {L(
                  "No single modality optimises sports injury recovery. We combine clinical tools based on your injury type, phase, and response to treatment — selecting the combination that produces the fastest, most durable outcome.",
                  "Nenhuma modalidade única optimiza a recuperação de lesões desportivas. Combinamos ferramentas clínicas com base no seu tipo de lesão, fase e resposta ao tratamento — seleccionando a combinação que produz o resultado mais rápido e duradouro."
                )}
              </p>
              <div className="space-y-3">
                {[
                  { icon: Zap, label: L("Electrotherapy", "Eletroterapia"), value: L("TENS, EMS, IFT, Russian stim — pain, oedema, muscle activation", "TENS, EMS, IFT, Estim Russa — dor, edema, activação muscular") },
                  { icon: Waves, label: L("Therapeutic Ultrasound", "Ultrassom Terapêutico"), value: L("Tissue repair acceleration, scar tissue, phonophoresis", "Aceleração da reparação tecidual, tecido cicatricial, fonoforese") },
                  { icon: Activity, label: L("MLS® Laser", "Laser MLS®"), value: L("Anti-inflammatory, analgesic, tissue repair from session 1", "Anti-inflamatório, analgésico, reparação tecidual desde a 1ª sessão") },
                  { icon: RefreshCw, label: L("Exercise Therapy", "Terapia por Exercício"), value: L("Progressive loading — isometric → isotonic → sport-specific", "Carga progressiva — isométrico → isotónico → específico do desporto") },
                  { icon: Brain, label: L("Manual Therapy", "Terapia Manual"), value: L("Joint mobilisation, soft tissue therapy, neural mobilisation", "Mobilização articular, terapia de tecidos moles, mobilização neural") },
                ].map((item, i) => {
                  const IIcon = item.icon;
                  return (
                    <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-background border border-border">
                      <div className="w-9 h-9 rounded-lg bg-orange-500/15 text-orange-400 flex items-center justify-center shrink-0">
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
            <div>
              <span className="inline-block px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold uppercase tracking-wider mb-3">
                {L("Session Information", "Informações da Sessão")}
              </span>
              <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-4">
                {L("What to Expect", "O Que Esperar")}
              </h2>
              <div className="space-y-3">
                {[
                  { icon: Clock, label: L("Initial Assessment", "Avaliação Inicial"), value: L("60 minutes — full sports injury assessment + diagnosis", "60 minutos — avaliação completa de lesão desportiva + diagnóstico") },
                  { icon: Activity, label: L("Follow-up Sessions", "Sessões de Seguimento"), value: L("45–60 minutes — combined treatment + exercise", "45–60 minutos — tratamento combinado + exercício") },
                  { icon: Target, label: L("Frequency", "Frequência"), value: L("Acute: 3–5×/week. Subacute: 2–3×/week. Rehab: 1–2×/week", "Aguda: 3–5×/semana. Subaguda: 2–3×/semana. Reab: 1–2×/semana") },
                  { icon: AlertTriangle, label: L("Return to Sport", "Retorno ao Desporto"), value: L("Criteria-based — strength, movement, and psychological readiness", "Baseado em critérios — força, movimento e prontidão psicológica") },
                  { icon: Users, label: L("Who We Treat", "Quem Tratamos"), value: L("Amateur to elite athletes, recreational exercisers, all sports", "Atletas amadores a elite, praticantes recreativos, todos os desportos") },
                ].map((item, i) => {
                  const IIcon = item.icon;
                  return (
                    <div key={i} className="flex items-start gap-3 p-4 rounded-xl bg-background border border-border">
                      <div className="w-9 h-9 rounded-lg bg-orange-500/15 text-orange-400 flex items-center justify-center shrink-0">
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
      <section className="py-14 sm:py-20 bg-gradient-to-r from-orange-500/10 via-rose-500/5 to-background">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-4">
            {L("Your Sport Is Waiting.", "O Seu Desporto Está à Espera.")}
          </h2>
          <p className="text-muted-foreground mb-8 leading-relaxed">
            {L(
              "Book your sports injury assessment and let us build a return-to-sport programme that gets you back faster — and keeps you there longer.",
              "Marque a sua avaliação de lesão desportiva e deixe-nos construir um programa de retorno ao desporto que o leva de volta mais rápido — e mantém-no lá por mais tempo."
            )}
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/signup">
              <Button size="lg" className="gap-2 bg-gradient-to-r from-orange-500 to-rose-600 hover:from-orange-600 hover:to-rose-700 text-white shadow-lg shadow-orange-500/20">
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
