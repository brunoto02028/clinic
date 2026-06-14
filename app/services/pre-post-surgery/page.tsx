"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft, ArrowRight, Syringe, CheckCircle2, ChevronDown,
  Clock, Shield, Target, Activity, Brain,
  Zap, Waves, RefreshCw, BarChart3, Layers,
  TrendingUp, Users, HeartPulse, Crosshair, Star,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useLocale } from "@/hooks/use-locale";

export default function PrePostSurgeryPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const { locale } = useLocale();
  const isPt = locale === "pt-BR";
  const L = (en: string, pt: string) => isPt ? pt : en;

  const prehab = [
    {
      icon: TrendingUp, color: "bg-teal-100 text-teal-700",
      en_title: "Why Prehabilitation Matters — The Evidence",
      pt_title: "Porque a Pré-habilitação Importa — A Evidência",
      en_desc: "The concept of prehabilitation (prehab) rests on a well-established physiological principle: stronger tissues heal faster. Patients who complete structured prehabilitation programmes before surgery consistently demonstrate superior post-operative outcomes across multiple metrics. A 2014 RCT in the British Journal of Sports Medicine found that patients who completed 6 weeks of prehab before ACL reconstruction returned to sport 4 weeks earlier and had 30% higher quadriceps strength at 12 weeks post-op compared to controls. For joint replacement surgery, prehab reduces hospital stay by 25–30%, reduces post-operative analgesia requirements, and accelerates functional milestones. The pre-operative window is one of the most clinically valuable — and most under-used — rehabilitation opportunities.",
      pt_desc: "O conceito de pré-habilitação (prehab) assenta num princípio fisiológico bem estabelecido: tecidos mais fortes cicatrizam mais rapidamente. Pacientes que completam programas estruturados de pré-habilitação antes da cirurgia demonstram consistentemente resultados pós-operatórios superiores em múltiplas métricas. Um ECA de 2014 no British Journal of Sports Medicine descobriu que pacientes que completaram 6 semanas de prehab antes da reconstrução do LCA retornaram ao desporto 4 semanas antes e tinham 30% mais força do quadricípite às 12 semanas pós-operatórias em comparação com os controlos. Para cirurgia de substituição articular, o prehab reduz a estadia hospitalar em 25–30%, reduz as necessidades de analgesia pós-operatória e acelera os marcos funcionais. A janela pré-operatória é uma das oportunidades de reabilitação mais clinicamente valiosas — e mais sub-utilizadas.",
    },
    {
      icon: Brain, color: "bg-violet-100 text-violet-700",
      en_title: "Optimising Surgical Readiness",
      pt_title: "Optimizar a Preparação Cirúrgica",
      en_desc: "Prehabilitation addresses several specific physiological deficits that surgery will temporarily worsen: muscle atrophy and strength loss around the surgical joint (which begins within 48 hours of surgery due to arthrogenic muscle inhibition), restricted range of motion from chronic pain and disuse, proprioceptive loss from degenerative joint disease, and cardiovascular deconditioning from reduced activity. By maximising pre-operative strength, mobility, proprioception, and aerobic capacity, we set the highest possible biological starting point for post-operative recovery. Every degree of pre-operative strength that is preserved translates directly into faster post-operative functional milestones.",
      pt_desc: "A pré-habilitação aborda vários défices fisiológicos específicos que a cirurgia irá temporariamente piorar: atrofia muscular e perda de força em torno da articulação cirúrgica (que começa dentro de 48 horas após a cirurgia devido à inibição muscular artrogénica), amplitude de movimento restrita por dor crónica e desuso, perda proprioceptiva por doença articular degenerativa e descondicionamento cardiovascular por actividade reduzida. Ao maximizar a força pré-operatória, mobilidade, propriocepção e capacidade aeróbica, estabelecemos o ponto de partida biológico mais elevado possível para a recuperação pós-operatória. Cada grau de força pré-operatória que é preservado traduz-se directamente em marcos funcionais pós-operatórios mais rápidos.",
    },
    {
      icon: Shield, color: "bg-blue-100 text-blue-700",
      en_title: "Pain & Expectation Management",
      pt_title: "Gestão da Dor & Expectativas",
      en_desc: "Pre-operative pain neuroscience education significantly reduces post-operative pain scores, opioid analgesic consumption, and length of hospital stay. Patients who understand what post-operative pain represents — protective neurological output, not ongoing tissue damage — report less fear, better coping, and earlier engagement with rehabilitation. We also set realistic, evidence-based functional milestones for each surgical procedure, so patients enter surgery with accurate expectations of the recovery trajectory rather than generic timelines.",
      pt_desc: "A educação em neurociência da dor pré-operatória reduz significativamente as pontuações de dor pós-operatória, o consumo de analgésicos opióides e a duração da estadia hospitalar. Pacientes que compreendem o que a dor pós-operatória representa — saída neurológica protetora, não dano tecidual em curso — relatam menos medo, melhor coping e envolvimento mais precoce com a reabilitação. Também estabelecemos marcos funcionais realistas e baseados em evidências para cada procedimento cirúrgico, para que os pacientes entrem na cirurgia com expectativas precisas da trajectória de recuperação em vez de prazos genéricos.",
    },
  ];

  const procedures = [
    {
      cat: L("Knee Surgery", "Cirurgia do Joelho"),
      color: "bg-teal-500/10 text-teal-400 border-teal-500/20",
      items: [
        { en: "ACL reconstruction — hamstring graft, patellar tendon graft", pt: "Reconstrução do LCA — enxerto isquiotibial, enxerto do tendão patelar", time: "9–12 mo RTS" },
        { en: "Total knee replacement (TKR)", pt: "Prótese total do joelho (PTJ)", time: "3–6 mo full function" },
        { en: "Partial knee replacement (UKA)", pt: "Prótese parcial do joelho (UKA)", time: "6–12 weeks" },
        { en: "Meniscal repair & meniscectomy", pt: "Reparação & meniscectomia meniscal", time: "4–12 weeks" },
        { en: "Patella realignment & MPFL reconstruction", pt: "Realinhamento rotuliano & reconstrução LMPF", time: "4–6 months" },
      ],
    },
    {
      cat: L("Hip Surgery", "Cirurgia da Anca"),
      color: "bg-blue-500/10 text-blue-400 border-blue-500/20",
      items: [
        { en: "Total hip replacement (THR)", pt: "Prótese total da anca (PTA)", time: "3–6 mo full function" },
        { en: "Hip arthroscopy — FAI, labral repair", pt: "Artroscopia da anca — IFA, reparação labral", time: "4–6 months RTS" },
        { en: "Hip resurfacing", pt: "Resurfacing da anca", time: "3–4 months" },
        { en: "Periacetabular osteotomy (PAO)", pt: "Osteotomia periacetabular (OPA)", time: "6–9 months" },
      ],
    },
    {
      cat: L("Shoulder Surgery", "Cirurgia do Ombro"),
      color: "bg-violet-500/10 text-violet-400 border-violet-500/20",
      items: [
        { en: "Rotator cuff repair — partial & full thickness", pt: "Reparação do manguito rotador — parcial & espessura total", time: "4–6 mo RTS" },
        { en: "SLAP repair & labral reconstruction", pt: "Reparação SLAP & reconstrução labral", time: "4–6 months" },
        { en: "Shoulder stabilisation — Latarjet, Bankart", pt: "Estabilização do ombro — Latarjet, Bankart", time: "6 months RTS" },
        { en: "Shoulder replacement (TSR, reverse TSR)", pt: "Prótese do ombro (PST, PST invertida)", time: "3–6 months" },
        { en: "Subacromial decompression (ASAD)", pt: "Descompressão subacromial (DSAC)", time: "3–4 months" },
      ],
    },
    {
      cat: L("Spine Surgery", "Cirurgia da Coluna"),
      color: "bg-rose-500/10 text-rose-400 border-rose-500/20",
      items: [
        { en: "Discectomy & microdiscectomy", pt: "Discectomia & microdiscectomia", time: "6–12 weeks" },
        { en: "Lumbar spinal fusion (TLIF, PLIF, ALIF)", pt: "Fusão espinhal lombar (TLIF, PLIF, ALIF)", time: "6–12 months" },
        { en: "Cervical disc replacement (ACDR)", pt: "Substituição discal cervical (SDCA)", time: "6–12 weeks" },
        { en: "Laminectomy & decompression", pt: "Laminectomia & descompressão", time: "8–16 weeks" },
      ],
    },
    {
      cat: L("Foot & Ankle Surgery", "Cirurgia do Pé & Tornozelo"),
      color: "bg-amber-500/10 text-amber-400 border-amber-500/20",
      items: [
        { en: "Achilles tendon repair", pt: "Reparação do tendão de Aquiles", time: "6 months RTS" },
        { en: "Ankle ligament reconstruction (ATFL, CFL)", pt: "Reconstrução ligamentar do tornozelo", time: "4–6 months" },
        { en: "Bunion correction (hallux valgus osteotomy)", pt: "Correção de joanete (osteotomia de hálux valgo)", time: "6–12 weeks" },
        { en: "Plantar fascia release", pt: "Liberação da fáscia plantar", time: "6–12 weeks" },
      ],
    },
    {
      cat: L("Upper Limb & Other", "Membro Superior & Outros"),
      color: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
      items: [
        { en: "Elbow UCL reconstruction (Tommy John)", pt: "Reconstrução UCL do cotovelo (Tommy John)", time: "12 months RTS" },
        { en: "Carpal tunnel release", pt: "Libertação do canal cárpico", time: "6–12 weeks" },
        { en: "Achilles, patellar, quadriceps tendon repair", pt: "Reparação tendão Aquiles, patelar, quadricípite", time: "4–9 months" },
        { en: "Abdominal & hernia surgery", pt: "Cirurgia abdominal & hérnia", time: "6–12 weeks" },
      ],
    },
  ];

  const postOpPhases = [
    {
      phase: "01", icon: Shield, color: "bg-rose-100 text-rose-700",
      en_title: "Immediate Post-Op (Days 1–14)",
      pt_title: "Pós-Operatório Imediato (Dias 1–14)",
      en_desc: "Pain control, oedema management, wound protection, and prevention of post-operative complications (DVT, pulmonary complications, joint stiffness). Early mobilisation within surgical protocol limits. Gentle TENS for analgesia. Cryotherapy. Patellar mobilisation (knee surgery). Pendulum exercises (shoulder surgery). Range of motion within protected arc only.",
      pt_desc: "Controlo da dor, gestão do edema, protecção da ferida e prevenção de complicações pós-operatórias (TVP, complicações pulmonares, rigidez articular). Mobilização precoce dentro dos limites do protocolo cirúrgico. TENS suave para analgesia. Crioterapia. Mobilização rotuliana (cirurgia do joelho). Exercícios pendulares (cirurgia do ombro). Amplitude de movimento apenas dentro do arco protegido.",
    },
    {
      phase: "02", icon: Activity, color: "bg-amber-100 text-amber-700",
      en_title: "Early Rehabilitation (Weeks 2–6)",
      pt_title: "Reabilitação Precoce (Semanas 2–6)",
      en_desc: "Progressive restoration of range of motion to protocol milestones. Introduction of isometric and early isotonic strengthening. Neuromuscular re-education — the mechanoreceptors in surgically repaired tissue are disrupted and must be retrained. Gait normalisation (lower limb procedures). Scar tissue management begins at suture removal — ultrasound, soft tissue mobilisation, and silicone gel. MLS laser from week 2 to accelerate tissue healing.",
      pt_desc: "Restauração progressiva da amplitude de movimento até aos marcos do protocolo. Introdução de fortalecimento isométrico e isotónico precoce. Reeducação neuromuscular — os mecanorreceptores no tecido cirurgicamente reparado são perturbados e devem ser retreinados. Normalização da marcha (procedimentos do membro inferior). A gestão do tecido cicatricial começa na remoção das suturas — ultrassom, mobilização de tecidos moles e gel de silicone. Laser MLS desde a semana 2 para acelerar a cicatrização tecidual.",
    },
    {
      phase: "03", icon: Zap, color: "bg-blue-100 text-blue-700",
      en_title: "Progressive Strengthening (Weeks 6–16)",
      pt_title: "Fortalecimento Progressivo (Semanas 6–16)",
      en_desc: "Progressive resistance training based on tissue healing milestones and surgical protocol clearance. Concentric → eccentric loading progression. Closed kinetic chain exercises (lower limb). Rotator cuff progressive loading (shoulder). Limb symmetry index (LSI) measured regularly — the injured side must reach ≥80% at 12 weeks, ≥90% before return to unrestricted training. Balance, proprioception, and neuromuscular control training throughout.",
      pt_desc: "Treino de resistência progressiva com base nos marcos de cicatrização tecidual e liberação do protocolo cirúrgico. Progressão de carga concêntrica → excêntrica. Exercícios de cadeia cinética fechada (membro inferior). Carga progressiva do manguito rotador (ombro). Índice de simetria dos membros (ISM) medido regularmente — o lado lesionado deve atingir ≥80% às 12 semanas, ≥90% antes do retorno ao treino irrestrito. Treino de equilíbrio, propriocepção e controlo neuromuscular ao longo de todo o processo.",
    },
    {
      phase: "04", icon: Target, color: "bg-emerald-100 text-emerald-700",
      en_title: "Functional & Sport-Specific (Weeks 12–36+)",
      pt_title: "Funcional & Específico do Desporto (Semanas 12–36+)",
      en_desc: "High-speed and impact loading introduction (criteria-dependent). Running programme for lower limb procedures (walk-to-run progression protocol). Plyometrics and reactive neuromuscular training. Sport-specific movement skills reintroduced in controlled conditions. Return-to-sport criteria testing: LSI ≥90%, hop tests, movement quality assessments, and ACL-RSI or equivalent psychological readiness tool. Full RTS clearance only when all criteria are met.",
      pt_desc: "Introdução de carga de alta velocidade e impacto (dependente de critérios). Programa de corrida para procedimentos do membro inferior (protocolo de progressão de caminhada para corrida). Pliometria e treino neuromuscular reactivo. Habilidades de movimento específicas do desporto reintroduzidas em condições controladas. Testes de critérios de retorno ao desporto: ISM ≥90%, testes de salto, avaliações de qualidade de movimento e ferramenta de prontidão psicológica ACL-RSI ou equivalente. Liberação total para RTS apenas quando todos os critérios são cumpridos.",
    },
  ];

  const whyUs = [
    { icon: Star, color: "bg-teal-100 text-teal-700", en: "Protocol adherence — we work within your surgeon's specific post-operative protocol, not generic timelines", pt: "Adesão ao protocolo — trabalhamos dentro do protocolo pós-operatório específico do seu cirurgião, não prazos genéricos" },
    { icon: BarChart3, color: "bg-blue-100 text-blue-700", en: "Objective milestone tracking — strength, ROM, LSI, and functional scores documented at every session", pt: "Acompanhamento objetivo de marcos — força, ADM, ISM e pontuações funcionais documentados em cada sessão" },
    { icon: Zap, color: "bg-violet-100 text-violet-700", en: "MLS laser & electrotherapy from day 1 of rehabilitation — accelerates tissue healing and reduces analgesia need", pt: "Laser MLS & eletroterapia desde o dia 1 de reabilitação — acelera a cicatrização tecidual e reduz a necessidade de analgesia" },
    { icon: Brain, color: "bg-rose-100 text-rose-700", en: "Pain neuroscience education — understanding post-op pain reduces fear, opioid use, and length of stay", pt: "Educação em neurociência da dor — compreender a dor pós-op reduz o medo, o uso de opióides e a duração da estadia" },
    { icon: Activity, color: "bg-amber-100 text-amber-700", en: "Video exercise portal — follow correct technique at home between clinic sessions", pt: "Portal de exercícios em vídeo — seguir a técnica correcta em casa entre sessões de clínica" },
    { icon: Users, color: "bg-emerald-100 text-emerald-700", en: "Surgeon communication — written progress reports shared with your surgical team on request", pt: "Comunicação com o cirurgião — relatórios de progresso escritos partilhados com a sua equipa cirúrgica a pedido" },
    { icon: Crosshair, color: "bg-cyan-100 text-cyan-700", en: "Criteria-based clearance — return to sport only when objective criteria are met, not when the calendar says so", pt: "Liberação baseada em critérios — retorno ao desporto apenas quando critérios objectivos são cumpridos, não quando o calendário o diz" },
    { icon: TrendingUp, color: "bg-indigo-100 text-indigo-700", en: "Post-surgical scar management — ultrasound and soft tissue techniques from suture removal to prevent adhesions", pt: "Gestão de cicatriz pós-cirúrgica — ultrassom e técnicas de tecidos moles desde a remoção das suturas para prevenir aderências" },
  ];

  const faqs = [
    {
      en_q: "When should I start physiotherapy before surgery?",
      pt_q: "Quando devo começar a fisioterapia antes da cirurgia?",
      en_a: "The evidence consistently favours starting prehabilitation 4–8 weeks before surgery, but even 2 weeks of structured prehab produces measurable benefits versus no prehab. For elective procedures with a longer waiting list (total knee/hip replacement, ACL reconstruction), starting prehab as soon as surgery is confirmed maximises the pre-operative strength and conditioning window. For urgent surgical procedures with shorter timelines, we focus on the most impactful components — quadriceps and glute activation for lower limb procedures, rotator cuff and scapular stability for shoulder procedures — and prioritise pain neuroscience education so patients understand the post-operative experience before it happens.",
      pt_a: "A evidência favorece consistentemente iniciar a pré-habilitação 4–8 semanas antes da cirurgia, mas mesmo 2 semanas de prehab estruturado produz benefícios mensuráveis versus nenhum prehab. Para procedimentos electivos com lista de espera mais longa (prótese total do joelho/anca, reconstrução do LCA), iniciar o prehab assim que a cirurgia é confirmada maximiza a janela de força e condicionamento pré-operatório. Para procedimentos cirúrgicos urgentes com prazos mais curtos, focamo-nos nos componentes de maior impacto — activação do quadricípite e glúteos para procedimentos do membro inferior, estabilidade do manguito rotador e escapular para procedimentos do ombro — e priorizamos a educação em neurociência da dor para que os pacientes compreendam a experiência pós-operatória antes de acontecer.",
    },
    {
      en_q: "When can I start physiotherapy after surgery?",
      pt_q: "Quando posso começar a fisioterapia depois da cirurgia?",
      en_a: "This depends entirely on your surgical procedure and your surgeon's specific protocol. For most procedures, outpatient physiotherapy begins within 1–2 weeks of surgery. For some procedures — total knee replacement, discectomy, shoulder stabilisation — physiotherapy begins within days of surgery or even in hospital. For others — complex rotator cuff repair, spinal fusion — the surgeon may request a protected period of 4–6 weeks before active rehabilitation begins. We always work within your surgeon's protocol and will liaise with your surgical team to confirm the appropriate start date and any specific restrictions.",
      pt_a: "Isto depende inteiramente do seu procedimento cirúrgico e do protocolo específico do seu cirurgião. Para a maioria dos procedimentos, a fisioterapia ambulatória começa dentro de 1–2 semanas após a cirurgia. Para alguns procedimentos — prótese total do joelho, discectomia, estabilização do ombro — a fisioterapia começa dentro de dias da cirurgia ou mesmo no hospital. Para outros — reparação complexa do manguito rotador, fusão espinhal — o cirurgião pode solicitar um período protegido de 4–6 semanas antes de a reabilitação activa começar. Trabalhamos sempre dentro do protocolo do seu cirurgião e liaisons com a sua equipa cirúrgica para confirmar a data de início apropriada e quaisquer restrições específicas.",
    },
    {
      en_q: "Why does my muscle waste away so quickly after surgery?",
      pt_q: "Porque é que o meu músculo atrofia tão rapidamente após a cirurgia?",
      en_a: "The rapid muscle atrophy that follows joint surgery — sometimes visible within days of the procedure — is driven primarily by a reflex mechanism called arthrogenic muscle inhibition (AMI). AMI is the neurological suppression of motor neurone activation to muscles surrounding a damaged or operated joint. It is triggered by joint effusion (swelling), pain signals from the joint capsule, and afferent signals from joint mechanoreceptors. AMI effectively prevents the nervous system from fully activating the surrounding muscles even when the patient is trying to contract them — making voluntary exercise alone insufficient to prevent early atrophy. This is why we use neuromuscular electrical stimulation (EMS/NMES) from the very early post-operative phase: it bypasses the inhibitory neural signals and directly activates muscle fibres, maintaining muscle mass and neuromuscular recruitment patterns during the period when voluntary activation is insufficient.",
      pt_a: "A atrofia muscular rápida que se segue à cirurgia articular — às vezes visível dentro de dias do procedimento — é impulsionada principalmente por um mecanismo reflexo chamado inibição muscular artrogénica (IMA). A IMA é a supressão neurológica da activação de neurónios motores para os músculos que envolvem uma articulação danificada ou operada. É desencadeada pelo derrame articular (inchaço), sinais de dor da cápsula articular e sinais aferentes dos mecanorreceptores articulares. A IMA impede efectivamente o sistema nervoso de activar totalmente os músculos envolventes mesmo quando o paciente está a tentar contraí-los — tornando o exercício voluntário isolado insuficiente para prevenir a atrofia precoce. É por isso que utilizamos estimulação eléctrica neuromuscular (EMS/EENM) desde a fase pós-operatória muito precoce: contorna os sinais neurais inibitórios e activa directamente as fibras musculares, mantendo a massa muscular e os padrões de recrutamento neuromuscular durante o período em que a activação voluntária é insuficiente.",
    },
    {
      en_q: "How long will my full recovery take?",
      pt_q: "Quanto tempo levará a minha recuperação completa?",
      en_a: "Recovery timelines vary enormously by procedure, but the most important clarification is the difference between symptom resolution and full functional recovery. Many patients feel 'fine' weeks before they have actually recovered the strength, proprioception, and movement quality required for safe return to full activity. This premature cessation of rehabilitation — leaving strength asymmetries, movement compensations, and proprioceptive deficits in place — is the primary cause of re-injury and long-term joint deterioration. General milestones: ACL reconstruction (9–12 months return to full sport, with LSI criteria); total knee/hip replacement (3–6 months for full daily function, 6–12 months for all activity levels); rotator cuff repair (4–6 months for daily activities, 6–12 months for overhead sport); lumbar discectomy (6–12 weeks return to light activity, 3–6 months for heavy loading). All return-to-activity decisions are criteria-based.",
      pt_a: "Os prazos de recuperação variam enormemente por procedimento, mas o esclarecimento mais importante é a diferença entre resolução de sintomas e recuperação funcional completa. Muitos pacientes sentem-se 'bem' semanas antes de terem realmente recuperado a força, propriocepção e qualidade de movimento necessárias para um retorno seguro à atividade total. Esta cessação prematura da reabilitação — deixando assimetrias de força, compensações de movimento e défices proprioceptivos no lugar — é a principal causa de re-lesão e deterioração articular a longo prazo. Marcos gerais: reconstrução do LCA (9–12 meses retorno ao desporto completo, com critérios ISM); prótese total do joelho/anca (3–6 meses para função diária completa, 6–12 meses para todos os níveis de actividade); reparação do manguito rotador (4–6 meses para atividades diárias, 6–12 meses para desporto com movimentos acima da cabeça); discectomia lombar (6–12 semanas retorno a atividade leve, 3–6 meses para carga pesada). Todas as decisões de retorno à atividade são baseadas em critérios.",
    },
    {
      en_q: "Should I use ice or heat after surgery?",
      pt_q: "Devo usar gelo ou calor após a cirurgia?",
      en_a: "In the acute post-operative phase (days 1–14), cryotherapy (ice/cold packs applied for 15–20 minutes, 3–4×/day) is appropriate for managing surgical swelling and reducing post-operative pain — it causes local vasoconstriction, reduces metabolic rate in the tissue, and has a direct analgesic effect on peripheral nociceptors. However, the evidence does not support continuous or excessive icing, and the more aggressive anti-inflammatory paradigm (suppressing all post-operative inflammation with ice and NSAIDs around the clock) is being reconsidered — post-operative inflammation is a necessary component of the healing process. After the acute phase (week 3+), superficial heat can be used to increase local blood flow and tissue extensibility before exercise and stretching sessions. Your therapist will advise specifically for your procedure and healing stage.",
      pt_a: "Na fase pós-operatória aguda (dias 1–14), a crioterapia (sacos de gelo/frios aplicados durante 15–20 minutos, 3–4×/dia) é apropriada para gerir o inchaço cirúrgico e reduzir a dor pós-operatória — causa vasoconstrição local, reduz a taxa metabólica no tecido e tem um efeito analgésico directo nos nociceptores periféricos. No entanto, a evidência não suporta a aplicação contínua ou excessiva de gelo, e o paradigma anti-inflamatório mais agressivo (supressão de toda a inflamação pós-operatória com gelo e AINEs 24 horas por dia) está a ser reconsiderado — a inflamação pós-operatória é um componente necessário do processo de cicatrização. Após a fase aguda (semana 3+), o calor superficial pode ser usado para aumentar o fluxo sanguíneo local e a extensibilidade tecidual antes das sessões de exercício e alongamento. O seu terapeuta aconselhará especificamente para o seu procedimento e fase de cicatrização.",
    },
    {
      en_q: "Can physiotherapy replace surgery?",
      pt_q: "A fisioterapia pode substituir a cirurgia?",
      en_a: "For a significant number of conditions that are commonly offered surgical intervention, well-structured conservative rehabilitation produces outcomes equivalent or superior to surgery — without surgical risks, recovery time, or costs. The most robust evidence: for most meniscal tears in the absence of mechanical locking, physiotherapy-based management matches surgical outcomes at 2 years (METEOR trial, NEJM 2013). For rotator cuff tears (partial and many complete), conservative rehabilitation produces equivalent functional outcomes to surgical repair for the majority of patients. For knee osteoarthritis, exercise-based rehabilitation reduces pain and improves function as effectively as arthroscopic surgery (OARSI guidelines, 2019). For ACL tears, non-surgical management with neuromuscular training achieves return to full sport in the majority of recreational athletes without reconstruction. Surgery remains the appropriate choice when conservative management fails to restore acceptable function, when there is progressive structural deterioration, or when the patient's functional demands require anatomical repair. We provide honest, evidence-based guidance on this decision.",
      pt_a: "Para um número significativo de condições às quais é comumente oferecida intervenção cirúrgica, a reabilitação conservadora bem estruturada produz resultados equivalentes ou superiores à cirurgia — sem riscos cirúrgicos, tempo de recuperação ou custos. A evidência mais robusta: para a maioria das lesões meniscais na ausência de bloqueio mecânico, a gestão baseada em fisioterapia corresponde aos resultados cirúrgicos aos 2 anos (ensaio METEOR, NEJM 2013). Para lesões do manguito rotador (parciais e muitas completas), a reabilitação conservadora produz resultados funcionais equivalentes à reparação cirúrgica para a maioria dos pacientes. Para osteoartrite do joelho, a reabilitação baseada em exercício reduz a dor e melhora a função tão eficazmente quanto a cirurgia artroscópica (guidelines OARSI, 2019). Para lesões do LCA, a gestão não cirúrgica com treino neuromuscular alcança o retorno ao desporto completo na maioria dos atletas recreativos sem reconstrução. A cirurgia permanece a escolha apropriada quando a gestão conservadora falha em restaurar uma função aceitável, quando há deterioração estrutural progressiva ou quando as exigências funcionais do paciente requerem reparação anatómica. Fornecemos orientação honesta e baseada em evidências sobre esta decisão.",
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
          <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-teal-500/[0.06] to-transparent" />
          <div className="absolute bottom-0 left-0 w-1/3 h-2/3 bg-gradient-to-tr from-blue-500/[0.04] to-transparent" />
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-start gap-5 mb-6">
            <div className="w-16 h-16 rounded-2xl bg-teal-500/15 text-teal-400 flex items-center justify-center shrink-0 shadow-lg shadow-teal-500/10">
              <Syringe className="h-8 w-8" />
            </div>
            <div>
              <span className="inline-block px-3 py-1 rounded-full bg-teal-500/15 text-teal-400 text-xs font-semibold uppercase tracking-wider mb-3">
                {L("Pre & Post-Surgery Rehabilitation", "Reabilitação Pré & Pós-Cirúrgica")}
              </span>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground leading-tight">
                {L("Stronger Before.", "Mais Forte Antes.")}
                <span className="block text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-blue-500">
                  {L("Faster After. Better Long-Term.", "Mais Rápido Depois. Melhor a Longo Prazo.")}
                </span>
              </h1>
            </div>
          </div>
          <p className="text-base sm:text-lg text-muted-foreground leading-relaxed max-w-3xl mb-6">
            {L(
              "Prehabilitation maximises your biological starting point before surgery. Post-operative rehabilitation uses criteria-based protocols — not arbitrary timelines — to restore full strength, movement, and confidence. Together, they produce the best possible surgical outcome.",
              "A pré-habilitação maximiza o seu ponto de partida biológico antes da cirurgia. A reabilitação pós-operatória usa protocolos baseados em critérios — não prazos arbitrários — para restaurar força, movimento e confiança completos. Juntos, produzem o melhor resultado cirúrgico possível."
            )}
          </p>
          <div className="flex flex-wrap gap-3 mb-8">
            {[
              { en: "Pre-Surgery Conditioning", pt: "Condicionamento Pré-Cirurgia" },
              { en: "Protocol-Compliant Rehab", pt: "Reabilitação Conforme Protocolo" },
              { en: "Criteria-Based Return", pt: "Retorno Baseado em Critérios" },
              { en: "Surgeon Liaison", pt: "Liaison com Cirurgião" },
            ].map((tag, i) => (
              <span key={i} className="px-3 py-1.5 rounded-full bg-muted/60 border border-border text-xs font-medium text-foreground">
                {isPt ? tag.pt : tag.en}
              </span>
            ))}
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <Link href="/signup">
              <Button size="lg" className="gap-2 bg-gradient-to-r from-teal-500 to-blue-600 hover:from-teal-600 hover:to-blue-700 text-white shadow-lg shadow-teal-500/20">
                {L("Book Assessment", "Marcar Avaliação")} <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="/#services">
              <Button size="lg" variant="outline">{L("View All Services", "Ver Todos os Serviços")}</Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Prehab */}
      <section className="py-14 sm:py-20 bg-card/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-10">
            <span className="inline-block px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold uppercase tracking-wider mb-3">
              {L("Before Surgery", "Antes da Cirurgia")}
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground">
              {L("Prehabilitation — Why Stronger Patients Recover Faster", "Pré-habilitação — Porque Pacientes Mais Fortes Recuperam Mais Rápido")}
            </h2>
          </div>
          <div className="grid md:grid-cols-3 gap-5">
            {prehab.map((p, i) => {
              const PIcon = p.icon;
              return (
                <Card key={i} className="border border-border bg-card">
                  <CardContent className="p-6">
                    <div className={`w-11 h-11 rounded-xl ${p.color} flex items-center justify-center mb-4`}>
                      <PIcon className="h-5 w-5" />
                    </div>
                    <h3 className="font-bold text-foreground mb-3">{isPt ? p.pt_title : p.en_title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{isPt ? p.pt_desc : p.en_desc}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* Procedures */}
      <section className="py-14 sm:py-20 bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-10">
            <span className="inline-block px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold uppercase tracking-wider mb-3">
              {L("Surgical Procedures", "Procedimentos Cirúrgicos")}
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground">
              {L("Procedures We Rehabilitate", "Procedimentos Que Reabilitamos")}
            </h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {procedures.map((p, i) => (
              <div key={i} className={`rounded-xl border ${p.color} p-5`}>
                <h3 className="font-bold text-sm uppercase tracking-wider mb-3 opacity-90">{p.cat}</h3>
                <ul className="space-y-2">
                  {p.items.map((item, j) => (
                    <li key={j} className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-2 text-xs text-foreground">
                        <CheckCircle2 className="h-3.5 w-3.5 text-teal-400 shrink-0 mt-0.5" />
                        {isPt ? item.pt : item.en}
                      </div>
                      <span className="text-xs text-muted-foreground whitespace-nowrap shrink-0 ml-1">{item.time}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Post-Op Phases */}
      <section className="py-14 sm:py-20 bg-card/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-10">
            <span className="inline-block px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold uppercase tracking-wider mb-3">
              {L("After Surgery", "Após a Cirurgia")}
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground">
              {L("Four Phases of Post-Operative Rehabilitation", "Quatro Fases da Reabilitação Pós-Operatória")}
            </h2>
          </div>
          <div className="grid sm:grid-cols-2 gap-5">
            {postOpPhases.map((p, i) => {
              const PIcon = p.icon;
              return (
                <div key={i} className="relative p-6 rounded-xl bg-background border border-border">
                  <span className="absolute -top-3 left-5 w-8 h-8 rounded-full bg-teal-500 text-white text-xs font-bold flex items-center justify-center shadow-sm">
                    {p.phase}
                  </span>
                  <div className="flex items-center gap-3 mb-3 mt-2">
                    <div className={`w-10 h-10 rounded-lg ${p.color} flex items-center justify-center shrink-0`}>
                      <PIcon className="h-5 w-5" />
                    </div>
                    <h3 className="font-bold text-foreground">{isPt ? p.pt_title : p.en_title}</h3>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">{isPt ? p.pt_desc : p.en_desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Why Us */}
      <section className="py-14 sm:py-20 bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-10">
            <span className="inline-block px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold uppercase tracking-wider mb-3">
              {L("Our Approach", "A Nossa Abordagem")}
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground">
              {L("What Makes Our Surgical Rehab Different", "O Que Torna a Nossa Reabilitação Cirúrgica Diferente")}
            </h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {whyUs.map((w, i) => {
              const WIcon = w.icon;
              return (
                <div key={i} className="flex items-start gap-3 p-4 rounded-xl bg-card border border-border">
                  <div className={`w-10 h-10 rounded-lg ${w.color} flex items-center justify-center shrink-0`}>
                    <WIcon className="h-5 w-5" />
                  </div>
                  <p className="text-sm text-foreground leading-relaxed">{isPt ? w.pt : w.en}</p>
                </div>
              );
            })}
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
      <section className="py-14 sm:py-20 bg-gradient-to-r from-teal-500/10 via-blue-500/5 to-background">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-4">
            {L("Surgery is One Day. Rehabilitation is the Result.", "A Cirurgia é Um Dia. A Reabilitação é o Resultado.")}
          </h2>
          <p className="text-muted-foreground mb-8 leading-relaxed">
            {L(
              "Book your pre or post-surgical assessment and let us build a programme that prepares your body for surgery — or restores it fully afterwards.",
              "Marque a sua avaliação pré ou pós-cirúrgica e deixe-nos construir um programa que prepara o seu corpo para a cirurgia — ou o restaura totalmente depois."
            )}
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/signup">
              <Button size="lg" className="gap-2 bg-gradient-to-r from-teal-500 to-blue-600 hover:from-teal-600 hover:to-blue-700 text-white shadow-lg shadow-teal-500/20">
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
