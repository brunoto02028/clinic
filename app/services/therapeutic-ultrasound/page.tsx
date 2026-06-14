"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft, ArrowRight, Waves, CheckCircle2, ChevronDown,
  Clock, Activity, Shield, Target, Layers,
  Flame, Zap, FlaskConical, RefreshCw, Thermometer,
  Crosshair, BarChart3, HeartPulse,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useLocale } from "@/hooks/use-locale";

export default function TherapeuticUltrasoundPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const { locale } = useLocale();
  const isPt = locale === "pt-BR";
  const L = (en: string, pt: string) => isPt ? pt : en;

  const frequencies = [
    {
      freq: "1 MHz",
      color: "from-cyan-500/20 to-blue-600/10 border-cyan-500/30",
      badge: "bg-cyan-500/20 text-cyan-400",
      icon: Layers,
      en_title: "Deep Tissue Penetration — 3 to 5 cm",
      pt_title: "Penetração Profunda — 3 a 5 cm",
      en_desc: "At 1 MHz, ultrasound waves have a longer wavelength that is absorbed more slowly as they travel through tissue. This allows energy delivery to structures 3–5 cm below the skin surface — joint capsules, deep tendons, muscle bellies, ligaments, and spinal facet joints. The 1 MHz setting is preferred for the hip, shoulder, lumbar paraspinals, deep Achilles tendon, and patellar tendon — structures that a 3 MHz beam cannot reach at therapeutic intensity.",
      pt_desc: "A 1 MHz, as ondas de ultrassom têm um comprimento de onda maior que é absorvido mais lentamente à medida que viajam através do tecido. Isto permite a entrega de energia a estruturas 3–5 cm abaixo da superfície da pele — cápsulas articulares, tendões profundos, ventres musculares, ligamentos e articulações facetárias espinhais. A configuração de 1 MHz é preferida para o quadril, ombro, paraespinhais lombares, tendão de Aquiles profundo e tendão patelar — estruturas que um feixe de 3 MHz não consegue atingir com intensidade terapêutica.",
    },
    {
      freq: "3 MHz",
      color: "from-violet-500/20 to-purple-600/10 border-violet-500/30",
      badge: "bg-violet-500/20 text-violet-400",
      icon: Crosshair,
      en_title: "Superficial Tissue Precision — 1 to 2 cm",
      pt_title: "Precisão para Tecidos Superficiais — 1 a 2 cm",
      en_desc: "At 3 MHz, the shorter wavelength is absorbed rapidly in the first 1–2 cm of tissue — making it ideal for structures close to the skin surface: plantar fascia, finger and wrist tendons, superficial ligaments, carpal tunnel, trigger points in superficial muscle layers, and post-surgical scar tissue. The 3 MHz frequency heats superficial tissue approximately 3× faster than 1 MHz, allowing shorter treatment times for the same thermal dose.",
      pt_desc: "A 3 MHz, o comprimento de onda mais curto é absorvido rapidamente nos primeiros 1–2 cm de tecido — tornando-o ideal para estruturas próximas da superfície da pele: fáscia plantar, tendões dos dedos e pulso, ligamentos superficiais, canal cárpico, pontos-gatilho em camadas musculares superficiais e tecido cicatricial pós-cirúrgico. A frequência de 3 MHz aquece o tecido superficial aproximadamente 3× mais rápido que 1 MHz, permitindo tempos de tratamento mais curtos para a mesma dose térmica.",
    },
  ];

  const mechanisms = [
    {
      icon: Thermometer,
      color: "bg-orange-100 text-orange-700",
      en_label: "Thermal Effects",
      pt_label: "Efeitos Térmicos",
      en_title: "Continuous Mode — Controlled Tissue Heating",
      pt_title: "Modo Contínuo — Aquecimento Tecidual Controlado",
      en_desc: "In continuous emission mode, ultrasound produces a therapeutic temperature rise of 1–4°C within the target tissue. This controlled heating has multiple clinical effects: it increases the extensibility of collagen fibres (critical for scar tissue, joint contractures, and tendon adhesions), raises nerve conduction velocity (which reduces pain), causes local vasodilation and increased blood flow to the treatment area, accelerates enzymatic metabolic processes, and reduces muscle spasm. The temperature rise is precise, localised, and clinically controlled by the therapist through intensity and treatment time settings.",
      pt_desc: "No modo de emissão contínua, o ultrassom produz um aumento de temperatura terapêutico de 1–4°C dentro do tecido alvo. Este aquecimento controlado tem múltiplos efeitos clínicos: aumenta a extensibilidade das fibras de colagénio (crítico para tecido cicatricial, contraturas articulares e aderências tendinosas), eleva a velocidade de condução nervosa (o que reduz a dor), causa vasodilatação local e aumento do fluxo sanguíneo para a área de tratamento, acelera os processos metabólicos enzimáticos e reduz o espasmo muscular. O aumento de temperatura é preciso, localizado e clinicamente controlado pelo terapeuta através das definições de intensidade e tempo de tratamento.",
    },
    {
      icon: Waves,
      color: "bg-cyan-100 text-cyan-700",
      en_label: "Stable Cavitation",
      pt_label: "Cavitação Estável",
      en_title: "Pulsed Mode — Oscillating Microbubbles",
      pt_title: "Modo Pulsado — Microbolhas Oscilatórias",
      en_desc: "In pulsed mode (typically 20% duty cycle), thermal effects are negligible — but powerful non-thermal mechanical effects dominate. Stable cavitation is the rhythmic oscillation of microscopic gas bubbles already dissolved in tissue fluids, driven by the alternating pressure waves of the ultrasound beam. These oscillating bubbles create significant mechanical stress on nearby cell membranes, increasing their permeability. This enhanced membrane permeability stimulates mast cell degranulation (releasing histamine to initiate healing), increases fibroblast activity and protein synthesis, and accelerates the early inflammatory-to-proliferative phase transition of tissue repair.",
      pt_desc: "No modo pulsado (tipicamente ciclo de trabalho de 20%), os efeitos térmicos são negligenciáveis — mas dominam poderosos efeitos mecânicos não térmicos. A cavitação estável é a oscilação rítmica de microbolhas de gás já dissolvidas nos fluidos do tecido, impulsionada pelas ondas de pressão alternadas do feixe de ultrassom. Estas bolhas oscilatórias criam stress mecânico significativo nas membranas celulares próximas, aumentando a sua permeabilidade. Esta permeabilidade membranar aumentada estimula a desgranulação de mastócitos (libertando histamina para iniciar a cicatrização), aumenta a atividade dos fibroblastos e a síntese de proteínas, e acelera a transição da fase inflamatória para a proliferativa na reparação tecidual.",
    },
    {
      icon: FlaskConical,
      color: "bg-emerald-100 text-emerald-700",
      en_label: "Acoustic Streaming",
      pt_label: "Streaming Acústico",
      en_title: "Unidirectional Fluid Movement at Cell Membranes",
      pt_title: "Movimento Unidirecional de Fluidos nas Membranas Celulares",
      en_desc: "Acoustic streaming is the steady, unidirectional movement of fluid along and around cell membranes caused by the radiation pressure of the ultrasound beam. This microfluid motion increases the diffusion of ions and molecules across cell membranes, enhancing nutrient delivery and waste removal at the cellular level. It also promotes the local synthesis of collagen, increases the production of growth factors critical for tissue regeneration, and alters calcium ion flux across membranes — a key trigger for multiple healing-related intracellular signalling cascades.",
      pt_desc: "O streaming acústico é o movimento estacionário e unidirecional de fluido ao longo e em torno das membranas celulares causado pela pressão de radiação do feixe de ultrassom. Este movimento de microfluido aumenta a difusão de iões e moléculas através das membranas celulares, melhorando a entrega de nutrientes e a remoção de resíduos ao nível celular. Também promove a síntese local de colagénio, aumenta a produção de fatores de crescimento críticos para a regeneração tecidual e altera o fluxo de iões de cálcio através das membranas — um gatilho chave para múltiplas cascatas de sinalização intracelular relacionadas com a cicatrização.",
    },
    {
      icon: Zap,
      color: "bg-violet-100 text-violet-700",
      en_label: "Phonophoresis",
      pt_label: "Fonoforese",
      en_title: "Ultrasound-Driven Transdermal Drug Delivery",
      pt_title: "Entrega Transdérmica de Medicamentos Guiada por Ultrassom",
      en_desc: "Phonophoresis (also called sonophoresis) is the application of ultrasound to drive topical anti-inflammatory medications — typically diclofenac sodium or hydrocortisone — through the skin and into deep target tissues. The mechanical pressure waves temporarily increase skin permeability by widening intercellular lipid channels in the stratum corneum, allowing topically applied drug molecules to penetrate to the treatment site. This delivers therapeutic drug concentrations directly to the inflamed structure without systemic absorption or gastrointestinal side effects — particularly valuable in tendinopathy, bursitis, and periarticular inflammation.",
      pt_desc: "A fonoforese (também chamada sonoforese) é a aplicação de ultrassom para conduzir medicamentos anti-inflamatórios tópicos — tipicamente diclofenac sódico ou hidrocortisona — através da pele e para os tecidos-alvo profundos. As ondas de pressão mecânicas aumentam temporariamente a permeabilidade da pele alargando os canais lipídicos intercelulares no estrato córneo, permitindo que as moléculas de medicamento aplicadas topicamente penetrem até ao local de tratamento. Isto fornece concentrações terapêuticas de medicamento diretamente à estrutura inflamada sem absorção sistémica ou efeitos secundários gastrointestinais — particularmente valioso na tendinopatia, bursite e inflamação periarticular.",
    },
  ];

  const conditions = [
    {
      cat: L("Tendon Pathologies", "Patologias Tendinosas"),
      color: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
      items: [
        L("Calcific rotator cuff tendinitis — ultrasound disrupts calcium deposits", "Tendinite calcificante do manguito rotador — ultrassom fragmenta depósitos de cálcio"),
        L("Achilles tendinopathy (mid-portion and insertional)", "Tendinopatia do Aquiles (porção média e insercional)"),
        L("Patellar tendinopathy — jumper's knee", "Tendinopatia patelar — joelho do saltador"),
        L("Lateral epicondylitis — tennis elbow", "Epicondilite lateral — cotovelo de tenista"),
        L("Medial epicondylitis — golfer's elbow", "Epicondilite medial — cotovelo de golfista"),
        L("Supraspinatus & biceps long head tendinopathy", "Tendinopatia do supraespinhoso & cabeça longa do bíceps"),
      ],
    },
    {
      cat: L("Fascia & Ligament", "Fáscia & Ligamento"),
      color: "bg-violet-500/10 text-violet-400 border-violet-500/20",
      items: [
        L("Plantar fasciitis — strong evidence base", "Fasceíte plantar — forte base de evidências"),
        L("Iliotibial band syndrome", "Síndrome da banda iliotibial"),
        L("Lateral ankle ligament — subacute & chronic sprain", "Ligamento lateral do tornozelo — entorse subaguda & crónica"),
        L("Medial collateral ligament sprain", "Entorse do ligamento colateral medial"),
        L("Plantar plate insufficiency — lesser toe pain", "Insuficiência da placa plantar — dor nos dedos menores"),
      ],
    },
    {
      cat: L("Joint & Soft Tissue", "Articulação & Tecido Mole"),
      color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
      items: [
        L("Shoulder bursitis (subacromial)", "Bursite do ombro (subacromial)"),
        L("Hip trochanteric bursitis", "Bursite trocantérica do quadril"),
        L("Carpal tunnel syndrome — mild to moderate", "Síndrome do canal cárpico — leve a moderado"),
        L("Trigger points in superficial muscle groups", "Pontos-gatilho em grupos musculares superficiais"),
        L("Temporomandibular joint (TMJ) dysfunction", "Disfunção da articulação temporomandibular (ATM)"),
      ],
    },
    {
      cat: L("Scar Tissue & Wound Healing", "Tecido Cicatricial & Cicatrização"),
      color: "bg-rose-500/10 text-rose-400 border-rose-500/20",
      items: [
        L("Post-surgical scar adhesions — collagen realignment", "Aderências cicatriciais pós-cirúrgicas — realinhamento do colagénio"),
        L("Keloid and hypertrophic scar management", "Gestão de cicatriz queloide e hipertrófica"),
        L("Chronic wound healing support", "Suporte à cicatrização de feridas crónicas"),
        L("Dupuytren's contracture — early-stage softening", "Contratura de Dupuytren — amolecimento em fase inicial"),
        L("Post-mastectomy adhesion management", "Gestão de aderências pós-mastectomia"),
      ],
    },
  ];

  const evidence = [
    {
      icon: Activity, color: "bg-cyan-100 text-cyan-700",
      en_title: "Plantar Fasciitis — Strong Evidence",
      pt_title: "Fasceíte Plantar — Evidência Forte",
      en_desc: "Multiple RCTs and systematic reviews confirm that therapeutic ultrasound combined with stretching produces superior outcomes to stretching alone. A 2018 Cochrane-reviewed meta-analysis found statistically significant reductions in pain scores (VAS) and improvements in function at 4–8 weeks. The 1 MHz pulsed protocol targeting the plantar fascia origin at the calcaneus is the most-evidenced approach.",
      pt_desc: "Múltiplos ECAs e revisões sistemáticas confirmam que o ultrassom terapêutico combinado com alongamento produz resultados superiores ao alongamento isolado. Uma meta-análise revisada pela Cochrane de 2018 encontrou reduções estatisticamente significativas nas pontuações de dor (EVA) e melhorias na função às 4–8 semanas. O protocolo pulsado de 1 MHz dirigido à origem da fáscia plantar no calcâneo é a abordagem com mais evidências.",
    },
    {
      icon: Crosshair, color: "bg-violet-100 text-violet-700",
      en_title: "Calcific Tendinitis — Disruption of Calcium Deposits",
      pt_title: "Tendinite Calcificante — Fragmentação de Depósitos de Cálcio",
      en_desc: "High-intensity ultrasound (continuous mode, 1.5–2.5 W/cm²) has demonstrated the ability to mechanically disrupt and fragment calcium hydroxyapatite deposits in calcific rotator cuff tendinitis. A 2016 RCT in JAMA found significantly higher rates of calcium resorption at 9 months compared to placebo. This is one of the few conservative interventions with structural evidence of calcium reduction — making it a first-line option before subacromial injection or surgical calcium removal.",
      pt_desc: "O ultrassom de alta intensidade (modo contínuo, 1.5–2.5 W/cm²) demonstrou a capacidade de interromper e fragmentar mecanicamente depósitos de hidroxiapatite de cálcio na tendinite calcificante do manguito rotador. Um ECA de 2016 no JAMA encontrou taxas significativamente mais altas de reabsorção de cálcio aos 9 meses comparado com placebo. Esta é uma das poucas intervenções conservadoras com evidência estrutural de redução de cálcio — tornando-a uma opção de primeira linha antes de injeção subacromial ou remoção cirúrgica de cálcio.",
    },
    {
      icon: FlaskConical, color: "bg-emerald-100 text-emerald-700",
      en_title: "Carpal Tunnel Syndrome — Nerve Healing Support",
      pt_title: "Síndrome do Canal Cárpico — Suporte à Cicatrização Nervosa",
      en_desc: "A 2014 RCT published in Archives of Physical Medicine & Rehabilitation found that 3 MHz pulsed ultrasound (1.0 W/cm², 5 minutes, 5×/week for 2 weeks) produced significant improvements in nerve conduction velocity, symptom severity, and functional status scores compared to sham ultrasound. The non-thermal mechanical effects are believed to reduce perineural oedema and promote Schwann cell activity — supporting remyelination of compressed median nerve fibres.",
      pt_desc: "Um ECA de 2014 publicado no Archives of Physical Medicine & Rehabilitation encontrou que o ultrassom pulsado de 3 MHz (1.0 W/cm², 5 minutos, 5×/semana durante 2 semanas) produziu melhorias significativas na velocidade de condução nervosa, gravidade dos sintomas e pontuações de estado funcional comparado com ultrassom simulado. Acredita-se que os efeitos mecânicos não térmicos reduzem o edema perineural e promovem a atividade das células de Schwann — suportando a remielinização das fibras do nervo mediano comprimido.",
    },
    {
      icon: Thermometer, color: "bg-orange-100 text-orange-700",
      en_title: "Scar Tissue — Collagen Remodelling",
      pt_title: "Tecido Cicatricial — Remodelação do Colagénio",
      en_desc: "The thermal effects of 1 MHz continuous ultrasound increase the extensibility of scar collagen by disrupting abnormal cross-links between fibres. Combined with the non-thermal promotion of fibroblast activity, ultrasound promotes the deposition of type I collagen (organised, load-bearing) and reduces type III collagen (disorganised, weak). This results in softer, more extensible scar tissue with improved mechanical properties — clinically evidenced in post-surgical adhesion management and Dupuytren's contracture.",
      pt_desc: "Os efeitos térmicos do ultrassom contínuo de 1 MHz aumentam a extensibilidade do colagénio cicatricial ao disrumpir ligações cruzadas anormais entre fibras. Combinado com a promoção não térmica da atividade dos fibroblastos, o ultrassom promove a deposição de colagénio tipo I (organizado, portador de carga) e reduz o colagénio tipo III (desorganizado, fraco). Isto resulta em tecido cicatricial mais suave e extensível com propriedades mecânicas melhoradas — com evidência clínica na gestão de aderências pós-cirúrgicas e contratura de Dupuytren.",
    },
  ];

  const steps = [
    {
      num: "01", icon: Target, color: "bg-cyan-100 text-cyan-700",
      en_title: "Clinical Diagnosis & Frequency Selection",
      pt_title: "Diagnóstico Clínico & Selecção de Frequência",
      en_desc: "The target structure's depth determines whether 1 MHz or 3 MHz is selected. Your therapist palpates the treatment area and calculates the effective radiating area (ERA) needed to prescribe the correct spatial average temporal average intensity (SATA).",
      pt_desc: "A profundidade da estrutura-alvo determina se 1 MHz ou 3 MHz é selecionado. O terapeuta palpa a área de tratamento e calcula a área de radiação eficaz (ARE) necessária para prescrever a intensidade temporal média espacial média correcta (ITMET).",
    },
    {
      num: "02", icon: Waves, color: "bg-violet-100 text-violet-700",
      en_title: "Mode & Intensity Setting",
      pt_title: "Definição de Modo & Intensidade",
      en_desc: "Continuous mode for thermal effects (heating, collagen extensibility, scar tissue). Pulsed mode (20% duty cycle) for non-thermal effects (healing acceleration, inflammation control). Intensity typically 0.5–2.5 W/cm² depending on tissue depth, pathology, and treatment stage.",
      pt_desc: "Modo contínuo para efeitos térmicos (aquecimento, extensibilidade do colagénio, tecido cicatricial). Modo pulsado (ciclo de trabalho de 20%) para efeitos não térmicos (aceleração da cicatrização, controlo da inflamação). Intensidade tipicamente 0.5–2.5 W/cm² dependendo da profundidade do tecido, patologia e fase de tratamento.",
    },
    {
      num: "03", icon: RefreshCw, color: "bg-emerald-100 text-emerald-700",
      en_title: "Coupling & Application",
      pt_title: "Acoplamento & Aplicação",
      en_desc: "Ultrasound gel is applied to the skin to eliminate the air gap between transducer and skin (air reflects 99.9% of ultrasound energy). The transducer head is kept moving in slow, overlapping circles over the treatment area to prevent standing waves and ensure uniform energy distribution.",
      pt_desc: "O gel de ultrassom é aplicado na pele para eliminar a lacuna de ar entre o transdutor e a pele (o ar reflecte 99.9% da energia de ultrassom). O cabeçote do transdutor é mantido em movimento em círculos lentos e sobrepostos sobre a área de tratamento para prevenir ondas estacionárias e garantir distribuição uniforme de energia.",
    },
    {
      num: "04", icon: BarChart3, color: "bg-amber-100 text-amber-700",
      en_title: "Session Duration & Dosing",
      pt_title: "Duração da Sessão & Dosagem",
      en_desc: "Treatment time is calculated from the size of the area being treated: typically 5 minutes per 2× the ERA (effective radiating area) of the transducer head, per tissue region. Total session time for one to two areas is typically 10–20 minutes. Phonophoresis sessions apply the anti-inflammatory medium before transducer contact.",
      pt_desc: "O tempo de tratamento é calculado a partir do tamanho da área a tratar: tipicamente 5 minutos por 2× a ARE (área de radiação eficaz) do cabeçote do transdutor, por região de tecido. O tempo total de sessão para uma a duas áreas é tipicamente 10–20 minutos. As sessões de fonoforese aplicam o meio anti-inflamatório antes do contacto do transdutor.",
    },
  ];

  const faqs = [
    {
      en_q: "What does therapeutic ultrasound feel like during treatment?",
      pt_q: "Como se sente o ultrassom terapêutico durante o tratamento?",
      en_a: "Most patients feel either nothing at all or a very mild, pleasant warmth in the treated area. The transducer head is kept moving throughout, preventing any hotspot accumulation. Occasionally a deep aching or periosteal (bone surface) pain is felt if the intensity is too high or the transducer is held still over bone — your therapist immediately adjusts if this occurs. Phonophoresis sessions (with gel medium containing anti-inflammatory medication) feel identical to standard ultrasound. There is no electrical sensation, vibration, or surface heat.",
      pt_a: "A maioria dos pacientes não sente nada ou um calor muito leve e agradável na área tratada. O cabeçote do transdutor mantém-se em movimento ao longo de todo o tratamento, prevenindo a acumulação de pontos quentes. Ocasionalmente sente-se uma dor profunda ou periosteal (superfície óssea) se a intensidade for demasiado alta ou o transdutor for mantido imóvel sobre o osso — o terapeuta ajusta imediatamente se isto ocorrer. As sessões de fonoforese (com meio em gel contendo medicação anti-inflamatória) sentem-se de forma idêntica ao ultrassom padrão. Não há sensação eléctrica, vibração ou calor superficial.",
    },
    {
      en_q: "What is the difference between continuous and pulsed ultrasound?",
      pt_q: "Qual é a diferença entre ultrassom contínuo e pulsado?",
      en_a: "In continuous mode, the transducer emits sound waves without interruption, producing a genuine thermal effect — raising tissue temperature by 1–4°C. This is used when the clinical goal is to heat tissue: increasing collagen extensibility for contractures, reducing muscle spasm, or preparing scar tissue for stretching. In pulsed mode (20% duty cycle), the beam is turned on for 20% of each cycle and off for 80% — allowing the tissue to dissipate any heat between pulses. This eliminates the thermal effect and isolates the non-thermal mechanical effects: cavitation and acoustic streaming. Pulsed mode is used for acute inflammation, post-surgical healing, and conditions where heating would be counterproductive or unsafe.",
      pt_a: "No modo contínuo, o transdutor emite ondas sonoras sem interrupção, produzindo um efeito térmico genuíno — elevando a temperatura do tecido em 1–4°C. Isto é usado quando o objectivo clínico é aquecer o tecido: aumentar a extensibilidade do colagénio para contraturas, reduzir o espasmo muscular ou preparar o tecido cicatricial para alongamento. No modo pulsado (ciclo de trabalho de 20%), o feixe é activado durante 20% de cada ciclo e desligado durante 80% — permitindo que o tecido dissipe qualquer calor entre pulsos. Isto elimina o efeito térmico e isola os efeitos mecânicos não térmicos: cavitação e streaming acústico. O modo pulsado é usado para inflamação aguda, cicatrização pós-cirúrgica e condições onde o aquecimento seria contraproducente ou inseguro.",
    },
    {
      en_q: "Can ultrasound be used over metal implants (joint replacement, plates, screws)?",
      pt_q: "O ultrassom pode ser usado sobre implantes metálicos (prótese articular, placas, parafusos)?",
      en_a: "This is one of the most common questions and the answer is nuanced. Ultrasound should NOT be used in continuous (thermal) mode directly over cemented joint replacements, as heat conduction through the metal-cement interface can cause localised periosteal damage. Pulsed (non-thermal) mode is generally considered safe over metal implants, as the thermal dose is negligible. Your therapist will always identify implant locations through your surgical history before beginning treatment and will modify the protocol — treating adjacent structures rather than directly over the implant when continuous mode is required.",
      pt_a: "Esta é uma das perguntas mais comuns e a resposta é matizada. O ultrassom NÃO deve ser usado no modo contínuo (térmico) diretamente sobre próteses articulares cimentadas, pois a condução de calor através da interface metal-cimento pode causar dano periosteal localizado. O modo pulsado (não térmico) é geralmente considerado seguro sobre implantes metálicos, pois a dose térmica é negligenciável. O terapeuta identificará sempre as localizações dos implantes através do seu historial cirúrgico antes de iniciar o tratamento e modificará o protocolo — tratando estruturas adjacentes em vez de directamente sobre o implante quando o modo contínuo é necessário.",
    },
    {
      en_q: "How many sessions will I need and how quickly will I notice a difference?",
      pt_q: "Quantas sessões precisarei e com que rapidez vou notar diferença?",
      en_a: "The response timeline depends on the pathology. For acute subacute conditions (muscle strains, recent ligament sprains, early tendinopathy), most patients notice improvement within 3–5 sessions. For chronic tendinopathies, calcific tendinitis, and scar tissue, a minimum course of 8–12 sessions is typically required, with the first measurable changes appearing at sessions 4–6. Therapeutic ultrasound works best as part of a combined treatment approach — it is most effective when paired with manual therapy, exercise, and electrotherapy rather than as a standalone intervention. A typical course is 2–3 sessions per week for 4–6 weeks.",
      pt_a: "O prazo de resposta depende da patologia. Para condições agudas e subagudas (distensões musculares, entorses ligamentares recentes, tendinopatia inicial), a maioria dos pacientes nota melhoria em 3–5 sessões. Para tendinopatias crónicas, tendinite calcificante e tecido cicatricial, é normalmente necessário um curso mínimo de 8–12 sessões, com as primeiras mudanças mensuráveis a aparecer nas sessões 4–6. O ultrassom terapêutico funciona melhor como parte de uma abordagem de tratamento combinada — é mais eficaz quando combinado com terapia manual, exercício e eletroterapia do que como intervenção isolada. Um curso típico é de 2–3 sessões por semana durante 4–6 semanas.",
    },
    {
      en_q: "What is phonophoresis and is it more effective than standard ultrasound?",
      pt_q: "O que é a fonoforese e é mais eficaz do que o ultrassom padrão?",
      en_a: "Phonophoresis uses the mechanical pressure waves of ultrasound to drive topical anti-inflammatory agents (most commonly diclofenac sodium 1% or 5% gel, or hydrocortisone cream) through the skin into underlying inflamed structures. The benefit over standard ultrasound gel is that you receive both the mechanical effects of the ultrasound AND the anti-inflammatory action of the drug at the target site — without systemic drug exposure. Research supports phonophoresis as superior to ultrasound alone for conditions with significant inflammatory load such as acute bursitis, calcific tendinitis, and periarticular inflammation. It is particularly valuable for patients who cannot tolerate oral NSAIDs or corticosteroid injections.",
      pt_a: "A fonoforese usa as ondas de pressão mecânicas do ultrassom para conduzir agentes anti-inflamatórios tópicos (mais comumente gel de diclofenac sódico a 1% ou 5%, ou creme de hidrocortisona) através da pele para as estruturas inflamadas subjacentes. O benefício em relação ao gel de ultrassom padrão é que recebe tanto os efeitos mecânicos do ultrassom COMO a ação anti-inflamatória do medicamento no local-alvo — sem exposição sistémica ao medicamento. A investigação suporta a fonoforese como superior ao ultrassom isolado para condições com carga inflamatória significativa como bursite aguda, tendinite calcificante e inflamação periarticular. É particularmente valiosa para pacientes que não toleram AINEs orais ou injeções de corticosteroides.",
    },
    {
      en_q: "Are there conditions where ultrasound is contraindicated?",
      pt_q: "Existem condições em que o ultrassom é contraindicado?",
      en_a: "Absolute contraindications: active malignancy in the treatment area; over the pregnant uterus; over the eyes; over active DVT or thrombophlebitis; over actively bleeding tissues; over growth plates in children (thermal mode). Relative contraindications requiring protocol modification: over pacemakers (avoid thoracic proximity); over areas of impaired sensation (patient cannot report overheating); cemented joint implants (pulsed only); recent surgical wounds (pulsed only, after 72 hours); active infection (heat may worsen spread). A thorough pre-treatment screening is standard. When in doubt about a specific clinical situation, your therapist will modify the protocol, substitute with pulsed mode, or recommend an alternative modality.",
      pt_a: "Contraindicações absolutas: neoplasia maligna ativa na área de tratamento; sobre o útero grávido; sobre os olhos; sobre TVP ativa ou tromboflebite; sobre tecidos com hemorragia ativa; sobre placas de crescimento em crianças (modo térmico). Contraindicações relativas que requerem modificação do protocolo: sobre pacemakers (evitar proximidade torácica); sobre áreas com sensação diminuída (o paciente não consegue relatar sobreaquecimento); implantes articulares cimentados (apenas pulsado); feridas cirúrgicas recentes (apenas pulsado, após 72 horas); infecção ativa (o calor pode piorar a propagação). Uma triagem pré-tratamento completa é padrão. Em caso de dúvida sobre uma situação clínica específica, o terapeuta modificará o protocolo, substituirá pelo modo pulsado ou recomendará uma modalidade alternativa.",
    },
  ];

  const whoFor = [
    L("Calcific rotator cuff tendinitis", "Tendinite calcificante do manguito"),
    L("Plantar fasciitis", "Fasceíte plantar"),
    L("Tennis & golfer's elbow", "Cotovelo de tenista & golfista"),
    L("Post-surgical scar adhesions", "Aderências cicatriciais pós-cirúrgicas"),
    L("Shoulder bursitis", "Bursite do ombro"),
    L("Achilles tendinopathy", "Tendinopatia do Aquiles"),
    L("Carpal tunnel syndrome", "Síndrome do canal cárpico"),
    L("Muscle strains (subacute)", "Distensões musculares (subagudas)"),
    L("Trigger points", "Pontos-gatilho"),
    L("Dupuytren's contracture", "Contratura de Dupuytren"),
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
          <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-cyan-500/[0.06] to-transparent" />
          <div className="absolute bottom-0 left-0 w-1/3 h-2/3 bg-gradient-to-tr from-blue-500/[0.04] to-transparent" />
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-start gap-5 mb-6">
            <div className="w-16 h-16 rounded-2xl bg-cyan-500/15 text-cyan-400 flex items-center justify-center shrink-0 shadow-lg shadow-cyan-500/10">
              <Waves className="h-8 w-8" />
            </div>
            <div>
              <span className="inline-block px-3 py-1 rounded-full bg-cyan-500/15 text-cyan-400 text-xs font-semibold uppercase tracking-wider mb-3">
                {L("Therapeutic Ultrasound", "Ultrassom Terapêutico")}
              </span>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground leading-tight">
                {L("Deep Tissue Healing.", "Cicatrização Profunda.")}
                <span className="block text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">
                  {L("At the Cellular Level.", "Ao Nível Celular.")}
                </span>
              </h1>
            </div>
          </div>
          <p className="text-base sm:text-lg text-muted-foreground leading-relaxed max-w-3xl mb-6">
            {L(
              "Therapeutic ultrasound uses high-frequency sound waves (1 MHz and 3 MHz) to deliver precisely controlled thermal and non-thermal energy to target tissues up to 5 cm deep — accelerating tissue repair through multiple cellular mechanisms including cavitation, acoustic streaming, and phonophoresis.",
              "O ultrassom terapêutico utiliza ondas sonoras de alta frequência (1 MHz e 3 MHz) para fornecer energia térmica e não térmica precisamente controlada a tecidos-alvo até 5 cm de profundidade — acelerando a reparação tecidual através de múltiplos mecanismos celulares incluindo cavitação, streaming acústico e fonoforese."
            )}
          </p>
          <div className="flex flex-wrap gap-3 mb-8">
            {[
              { en: "1 MHz & 3 MHz", pt: "1 MHz & 3 MHz" },
              { en: "Thermal & Non-Thermal", pt: "Térmico & Não Térmico" },
              { en: "Phonophoresis Available", pt: "Fonoforese Disponível" },
              { en: "Up to 5 cm Deep", pt: "Até 5 cm de Profundidade" },
            ].map((tag, i) => (
              <span key={i} className="px-3 py-1.5 rounded-full bg-muted/60 border border-border text-xs font-medium text-foreground">
                {isPt ? tag.pt : tag.en}
              </span>
            ))}
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <Link href="/signup">
              <Button size="lg" className="gap-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white shadow-lg shadow-cyan-500/20">
                {L("Book Treatment", "Marcar Tratamento")} <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="/#services">
              <Button size="lg" variant="outline">{L("View All Services", "Ver Todos os Serviços")}</Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Frequencies */}
      <section className="py-14 sm:py-20 bg-card/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-10">
            <span className="inline-block px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold uppercase tracking-wider mb-3">
              {L("Dual Frequency System", "Sistema de Dupla Frequência")}
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground">
              {L("1 MHz vs 3 MHz — Right Frequency for the Right Depth", "1 MHz vs 3 MHz — A Frequência Certa para a Profundidade Certa")}
            </h2>
            <p className="mt-2 text-muted-foreground max-w-3xl">
              {L(
                "Frequency selection is not arbitrary — it is determined by the depth of the target structure. Applying the wrong frequency delivers energy to the wrong tissue layer.",
                "A seleção de frequência não é arbitrária — é determinada pela profundidade da estrutura-alvo. Aplicar a frequência errada fornece energia à camada de tecido errada."
              )}
            </p>
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            {frequencies.map((f, i) => {
              const FIcon = f.icon;
              return (
                <div key={i} className={`rounded-2xl border bg-gradient-to-br ${f.color} p-6 sm:p-8`}>
                  <div className="flex items-center gap-3 mb-4">
                    <div className={`w-11 h-11 rounded-xl ${f.badge} flex items-center justify-center`}>
                      <FIcon className="h-5 w-5" />
                    </div>
                    <span className={`text-3xl font-black ${f.badge.includes('cyan') ? 'text-cyan-400' : 'text-violet-400'}`}>{f.freq}</span>
                  </div>
                  <h3 className="text-lg font-bold text-foreground mb-3">{isPt ? f.pt_title : f.en_title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{isPt ? f.pt_desc : f.en_desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Four Mechanisms */}
      <section className="py-14 sm:py-20 bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-10">
            <span className="inline-block px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold uppercase tracking-wider mb-3">
              {L("Mechanisms of Action", "Mecanismos de Acção")}
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground">
              {L("Four Distinct Therapeutic Mechanisms", "Quatro Mecanismos Terapêuticos Distintos")}
            </h2>
            <p className="mt-2 text-muted-foreground max-w-2xl">
              {L(
                "Therapeutic ultrasound is not a single treatment — it is a platform for four separate biological mechanisms, each selectable through precise parameter choices.",
                "O ultrassom terapêutico não é um tratamento único — é uma plataforma para quatro mecanismos biológicos separados, cada um seleccionável através de escolhas precisas de parâmetros."
              )}
            </p>
          </div>
          <div className="grid sm:grid-cols-2 gap-5">
            {mechanisms.map((m, i) => {
              const MIcon = m.icon;
              return (
                <Card key={i} className="border border-border bg-card">
                  <CardContent className="p-6 sm:p-7">
                    <div className="flex items-center gap-3 mb-4">
                      <div className={`w-11 h-11 rounded-xl ${m.color} flex items-center justify-center shrink-0`}>
                        <MIcon className="h-5 w-5" />
                      </div>
                      <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{isPt ? m.pt_label : m.en_label}</span>
                    </div>
                    <h3 className="font-bold text-foreground mb-3">{isPt ? m.pt_title : m.en_title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{isPt ? m.pt_desc : m.en_desc}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* Evidence Highlights */}
      <section className="py-14 sm:py-20 bg-card/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-10">
            <span className="inline-block px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold uppercase tracking-wider mb-3">
              {L("Scientific Evidence", "Evidência Científica")}
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground">
              {L("Key Evidence-Based Applications", "Aplicações Chave Baseadas em Evidências")}
            </h2>
          </div>
          <div className="grid sm:grid-cols-2 gap-5">
            {evidence.map((e, i) => {
              const EIcon = e.icon;
              return (
                <div key={i} className="p-6 rounded-xl bg-background border border-border">
                  <div className="flex items-start gap-3 mb-3">
                    <div className={`w-10 h-10 rounded-lg ${e.color} flex items-center justify-center shrink-0`}>
                      <EIcon className="h-5 w-5" />
                    </div>
                    <h3 className="font-bold text-foreground">{isPt ? e.pt_title : e.en_title}</h3>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">{isPt ? e.pt_desc : e.en_desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Conditions */}
      <section className="py-14 sm:py-20 bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-10">
            <span className="inline-block px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold uppercase tracking-wider mb-3">
              {L("Conditions Treated", "Condições Tratadas")}
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground">
              {L("Clinical Applications", "Aplicações Clínicas")}
            </h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {conditions.map((c, i) => (
              <div key={i} className={`rounded-xl border ${c.color} p-5`}>
                <h3 className="font-bold text-sm uppercase tracking-wider mb-3 opacity-90">{c.cat}</h3>
                <ul className="space-y-2">
                  {c.items.map((item, j) => (
                    <li key={j} className="flex items-start gap-2 text-xs text-foreground">
                      <CheckCircle2 className="h-3.5 w-3.5 text-cyan-400 shrink-0 mt-0.5" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Process + Who For */}
      <section className="py-14 sm:py-20 bg-card/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-10">
            <span className="inline-block px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold uppercase tracking-wider mb-3">
              {L("Clinical Protocol", "Protocolo Clínico")}
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground">
              {L("How a Session is Delivered", "Como Uma Sessão é Administrada")}
            </h2>
          </div>
          <div className="grid lg:grid-cols-2 gap-10 items-start">
            <div className="grid sm:grid-cols-2 gap-4">
              {steps.map((s, i) => {
                const SIcon = s.icon;
                return (
                  <div key={i} className="relative p-5 rounded-xl bg-background border border-border">
                    <span className="absolute -top-3 left-4 w-7 h-7 rounded-full bg-cyan-500 text-white text-xs font-bold flex items-center justify-center shadow-sm">
                      {s.num}
                    </span>
                    <div className={`w-9 h-9 rounded-lg ${s.color} flex items-center justify-center mb-3 mt-1`}>
                      <SIcon className="h-4 w-4" />
                    </div>
                    <h3 className="font-semibold text-foreground text-sm mb-1">{isPt ? s.pt_title : s.en_title}</h3>
                    <p className="text-xs text-muted-foreground leading-relaxed">{isPt ? s.pt_desc : s.en_desc}</p>
                  </div>
                );
              })}
            </div>
            <div>
              <span className="inline-block px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold uppercase tracking-wider mb-3">
                {L("Who Is It For?", "Para Quem É?")}
              </span>
              <h2 className="text-xl font-bold text-foreground mb-4">
                {L("Ideal for these conditions", "Indicado para estas condições")}
              </h2>
              <div className="flex flex-wrap gap-2 mb-6">
                {whoFor.map((w, i) => (
                  <span key={i} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-full bg-muted/60 text-sm font-medium text-foreground border border-border">
                    <CheckCircle2 className="h-3.5 w-3.5 text-cyan-400 shrink-0" />
                    {w}
                  </span>
                ))}
              </div>
              <div className="space-y-3">
                {[
                  { icon: Clock, label: L("Session Duration", "Duração da Sessão"), value: L("10–20 min per 1–2 treatment areas", "10–20 min por 1–2 áreas de tratamento") },
                  { icon: Activity, label: L("Frequency", "Frequência"), value: L("2–3 times per week for 4–6 weeks", "2–3 vezes por semana durante 4–6 semanas") },
                  { icon: HeartPulse, label: L("Phonophoresis", "Fonoforese"), value: L("Available — anti-inflammatory medium on request", "Disponível — meio anti-inflamatório a pedido") },
                  { icon: Shield, label: L("Combined With", "Combinado Com"), value: L("Manual therapy, electrotherapy, MLS laser, exercise", "Terapia manual, eletroterapia, laser MLS, exercício") },
                ].map((item, i) => {
                  const IIcon = item.icon;
                  return (
                    <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-background border border-border">
                      <div className="w-9 h-9 rounded-lg bg-cyan-500/15 text-cyan-400 flex items-center justify-center shrink-0">
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
      <section className="py-14 sm:py-20 bg-gradient-to-r from-cyan-500/10 via-blue-500/5 to-background">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-4">
            {L("Precision Healing for Deep Structures.", "Cicatrização de Precisão para Estruturas Profundas.")}
          </h2>
          <p className="text-muted-foreground mb-8 leading-relaxed">
            {L(
              "Book your therapeutic ultrasound session and let clinically precise sound energy reach the structures that need healing — deep tendons, joint capsules, calcified deposits, and scar tissue — with measurable, lasting results.",
              "Marque a sua sessão de ultrassom terapêutico e deixe a energia sonora clinicamente precisa chegar às estruturas que precisam de cicatrização — tendões profundos, cápsulas articulares, depósitos calcificados e tecido cicatricial — com resultados mensuráveis e duradouros."
            )}
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/signup">
              <Button size="lg" className="gap-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white shadow-lg shadow-cyan-500/20">
                {L("Book Treatment", "Marcar Tratamento")} <ArrowRight className="h-4 w-4" />
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
