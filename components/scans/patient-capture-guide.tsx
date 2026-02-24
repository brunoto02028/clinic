"use client";

import { useState } from "react";
import {
  Camera, Footprints, Ruler, Sun, Smartphone, CheckCircle,
  ChevronRight, ChevronLeft, Eye, AlertTriangle, HelpCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type Locale = "en-GB" | "pt-BR";

interface PatientCaptureGuideProps {
  locale?: Locale;
  onComplete?: () => void;
  onClose?: () => void;
  mode?: "full" | "compact";
}

// ── Bilingual content ──
const T: Record<string, Record<Locale, string>> = {
  title: {
    "en-GB": "Foot Scan Guide",
    "pt-BR": "Guia de Escaneamento do Pé",
  },
  subtitle: {
    "en-GB": "Follow these steps for the best scan results",
    "pt-BR": "Siga estes passos para os melhores resultados",
  },
  next: { "en-GB": "Next", "pt-BR": "Próximo" },
  prev: { "en-GB": "Back", "pt-BR": "Voltar" },
  ready: { "en-GB": "I'm Ready to Scan", "pt-BR": "Estou Pronto para Escanear" },
  close: { "en-GB": "Close Guide", "pt-BR": "Fechar Guia" },
  stepOf: { "en-GB": "Step", "pt-BR": "Passo" },
  of: { "en-GB": "of", "pt-BR": "de" },
  tips: { "en-GB": "Tips for Best Results", "pt-BR": "Dicas para Melhores Resultados" },
};

interface GuideStep {
  icon: any;
  title: Record<Locale, string>;
  description: Record<Locale, string>;
  details: Record<Locale, string[]>;
  visual: "prep" | "a4" | "lighting" | "plantar" | "medial" | "lateral" | "posterior" | "shoe" | "review";
}

const GUIDE_STEPS: GuideStep[] = [
  {
    icon: Footprints,
    title: {
      "en-GB": "Prepare Your Feet",
      "pt-BR": "Prepare Seus Pés",
    },
    description: {
      "en-GB": "Remove shoes and socks completely. Clean, dry feet give the best results.",
      "pt-BR": "Remova sapatos e meias completamente. Pés limpos e secos dão os melhores resultados.",
    },
    details: {
      "en-GB": [
        "Remove ALL footwear — shoes, socks, stockings",
        "Ensure feet are clean and dry",
        "Stand on a flat, hard surface (not carpet)",
        "Wear comfortable clothing that doesn't cover your ankles",
      ],
      "pt-BR": [
        "Remova TODO calçado — sapatos, meias, meias-calças",
        "Certifique-se de que os pés estão limpos e secos",
        "Fique em uma superfície plana e dura (não tapete)",
        "Use roupas confortáveis que não cubram os tornozelos",
      ],
    },
    visual: "prep",
  },
  {
    icon: Ruler,
    title: {
      "en-GB": "Set Up A4 Paper (Scale Reference)",
      "pt-BR": "Prepare o Papel A4 (Referência de Escala)",
    },
    description: {
      "en-GB": "Place a standard A4 sheet of paper on the floor. This is used to calibrate measurements.",
      "pt-BR": "Coloque uma folha A4 padrão no chão. Isso é usado para calibrar as medições.",
    },
    details: {
      "en-GB": [
        "Use a standard white A4 paper (210mm × 297mm)",
        "Place it flat on the floor — no folds or creases",
        "You will stand ON the paper for the plantar (bottom) photo",
        "Keep all 4 edges visible in the photo for accurate calibration",
      ],
      "pt-BR": [
        "Use um papel A4 branco padrão (210mm × 297mm)",
        "Coloque-o plano no chão — sem dobras ou vincos",
        "Você ficará EM PÉ sobre o papel para a foto plantar (sola)",
        "Mantenha todas as 4 bordas visíveis na foto para calibração precisa",
      ],
    },
    visual: "a4",
  },
  {
    icon: Sun,
    title: {
      "en-GB": "Ensure Good Lighting",
      "pt-BR": "Garanta Boa Iluminação",
    },
    description: {
      "en-GB": "Good lighting is essential. Natural daylight or bright indoor lights work best.",
      "pt-BR": "Boa iluminação é essencial. Luz natural do dia ou luzes internas fortes funcionam melhor.",
    },
    details: {
      "en-GB": [
        "Natural daylight is ideal — near a window",
        "If indoors, turn on all available lights",
        "Avoid harsh shadows on the foot",
        "Avoid backlighting (don't face a window with light behind you)",
        "The system checks brightness automatically and warns if too dark",
      ],
      "pt-BR": [
        "Luz natural do dia é ideal — perto de uma janela",
        "Se estiver em ambiente interno, acenda todas as luzes disponíveis",
        "Evite sombras fortes sobre o pé",
        "Evite contraluz (não fique de costas para uma janela)",
        "O sistema verifica o brilho automaticamente e avisa se estiver muito escuro",
      ],
    },
    visual: "lighting",
  },
  {
    icon: Camera,
    title: {
      "en-GB": "Bottom View (Plantar)",
      "pt-BR": "Vista de Baixo (Plantar)",
    },
    description: {
      "en-GB": "Stand on the A4 paper and photograph your foot from directly above.",
      "pt-BR": "Fique em pé sobre o papel A4 e fotografe seu pé diretamente de cima.",
    },
    details: {
      "en-GB": [
        "Stand with your foot on the A4 paper",
        "Hold the phone above your foot, pointing straight down",
        "Capture the full outline of your foot AND the paper edges",
        "Keep the camera parallel to the floor (not angled)",
        "This photo is critical for sizing — take your time",
      ],
      "pt-BR": [
        "Fique com o pé sobre o papel A4",
        "Segure o celular acima do seu pé, apontando para baixo",
        "Capture o contorno completo do seu pé E as bordas do papel",
        "Mantenha a câmera paralela ao chão (não inclinada)",
        "Esta foto é fundamental para dimensionamento — não tenha pressa",
      ],
    },
    visual: "plantar",
  },
  {
    icon: Eye,
    title: {
      "en-GB": "Side Views (Medial & Lateral)",
      "pt-BR": "Vistas Laterais (Medial e Lateral)",
    },
    description: {
      "en-GB": "Photograph both sides of each foot at ground level to capture the arch profile.",
      "pt-BR": "Fotografe ambos os lados de cada pé no nível do chão para capturar o perfil do arco.",
    },
    details: {
      "en-GB": [
        "INNER SIDE (Medial): Shows your arch height — place phone on the floor pointing at the inside of your foot",
        "OUTER SIDE (Lateral): Shows the outer profile — place phone on the floor pointing at the outside of your foot",
        "Camera must be at floor level (not angled down from above)",
        "Include from heel to toes in the frame",
        "Stand naturally with weight evenly distributed",
      ],
      "pt-BR": [
        "LADO INTERNO (Medial): Mostra a altura do arco — coloque o celular no chão apontando para o lado interno do pé",
        "LADO EXTERNO (Lateral): Mostra o perfil externo — coloque o celular no chão apontando para o lado externo do pé",
        "A câmera deve estar no nível do chão (não inclinada de cima)",
        "Inclua do calcanhar até os dedos no enquadramento",
        "Fique em pé naturalmente com o peso distribuído igualmente",
      ],
    },
    visual: "medial",
  },
  {
    icon: Camera,
    title: {
      "en-GB": "Back View (Posterior)",
      "pt-BR": "Vista Traseira (Posterior)",
    },
    description: {
      "en-GB": "Photograph the back of each heel/ankle from behind to check alignment.",
      "pt-BR": "Fotografe a parte de trás de cada calcanhar/tornozelo por trás para verificar o alinhamento.",
    },
    details: {
      "en-GB": [
        "Place the camera on the floor behind your heel",
        "Point the camera forward towards the heel",
        "Shows calcaneal alignment (heel straight vs tilted)",
        "Shows Achilles tendon alignment",
        "Stand naturally — don't adjust your posture",
      ],
      "pt-BR": [
        "Coloque a câmera no chão atrás do seu calcanhar",
        "Aponte a câmera para frente, em direção ao calcanhar",
        "Mostra o alinhamento do calcâneo (calcanhar reto vs inclinado)",
        "Mostra o alinhamento do tendão de Aquiles",
        "Fique em pé naturalmente — não ajuste sua postura",
      ],
    },
    visual: "posterior",
  },
  {
    icon: Smartphone,
    title: {
      "en-GB": "Shoe Sole Photos",
      "pt-BR": "Fotos da Sola do Sapato",
    },
    description: {
      "en-GB": "Photograph the bottom of each shoe. Wear patterns reveal your walking habits.",
      "pt-BR": "Fotografe a parte de baixo de cada sapato. Padrões de desgaste revelam seus hábitos de caminhada.",
    },
    details: {
      "en-GB": [
        "Use your most-worn everyday shoes",
        "Turn each shoe upside down on a flat surface",
        "Photograph the entire sole from directly above",
        "Areas of heavy wear show where you put the most pressure",
        "Medial (inner) wear = overpronation | Lateral (outer) wear = supination",
      ],
      "pt-BR": [
        "Use seus sapatos do dia a dia mais usados",
        "Vire cada sapato de cabeça para baixo em uma superfície plana",
        "Fotografe toda a sola diretamente de cima",
        "Áreas de desgaste intenso mostram onde você coloca mais pressão",
        "Desgaste medial (interno) = pronação excessiva | Desgaste lateral (externo) = supinação",
      ],
    },
    visual: "shoe",
  },
  {
    icon: CheckCircle,
    title: {
      "en-GB": "Review & Upload",
      "pt-BR": "Revisar e Enviar",
    },
    description: {
      "en-GB": "Review all your photos before uploading. Retake any that are blurry or poorly lit.",
      "pt-BR": "Revise todas as suas fotos antes de enviar. Refaça qualquer uma que esteja borrada ou mal iluminada.",
    },
    details: {
      "en-GB": [
        "Review each photo — the system warns if quality is low",
        "Retake blurry, dark, or poorly framed photos",
        "Ensure both feet have matching angle photos",
        "Once uploaded, our AI analyses your photos within minutes",
        "Your clinician will review the results and contact you",
      ],
      "pt-BR": [
        "Revise cada foto — o sistema avisa se a qualidade está baixa",
        "Refaça fotos borradas, escuras ou mal enquadradas",
        "Certifique-se de que ambos os pés tenham fotos de ângulos correspondentes",
        "Uma vez enviadas, nossa IA analisa suas fotos em minutos",
        "Seu clínico revisará os resultados e entrará em contato",
      ],
    },
    visual: "review",
  },
];

// ── Visual illustrations (SVG-based) ──
function StepVisual({ type }: { type: string }) {
  const baseClass = "w-full max-w-[200px] mx-auto aspect-square flex items-center justify-center rounded-2xl";
  
  switch (type) {
    case "prep":
      return (
        <div className={`${baseClass} bg-gradient-to-br from-teal-50 to-teal-100`}>
          <svg viewBox="0 0 100 100" className="w-24 h-24">
            <path d="M50 15 C60 15 68 25 68 35 L70 50 C72 60 70 70 67 80 C65 87 60 92 50 92 C40 92 35 87 33 80 C30 70 28 60 30 50 L32 35 C32 25 40 15 50 15Z" fill="#5dc9c0" opacity="0.3" stroke="#5dc9c0" strokeWidth="1.5"/>
            <line x1="20" y1="10" x2="30" y2="20" stroke="#ef4444" strokeWidth="2" strokeLinecap="round"/>
            <line x1="30" y1="10" x2="20" y2="20" stroke="#ef4444" strokeWidth="2" strokeLinecap="round"/>
            <text x="25" y="30" fontSize="6" fill="#ef4444" textAnchor="middle">socks</text>
            <path d="M75 15 L85 12 L83 22 L78 18Z" fill="#ef4444" opacity="0.5"/>
          </svg>
        </div>
      );
    case "a4":
      return (
        <div className={`${baseClass} bg-gradient-to-br from-blue-50 to-blue-100`}>
          <svg viewBox="0 0 100 100" className="w-24 h-24">
            <rect x="20" y="15" width="60" height="70" rx="1" fill="white" stroke="#3b82f6" strokeWidth="1.5" strokeDasharray="3,2"/>
            <text x="50" y="48" fontSize="8" fill="#3b82f6" textAnchor="middle" fontWeight="bold">A4</text>
            <text x="50" y="58" fontSize="5" fill="#93c5fd" textAnchor="middle">210 × 297mm</text>
            <path d="M50 30 C55 30 58 35 58 40 L59 50 C60 55 59 60 58 65 C57 68 55 72 50 72 C45 72 43 68 42 65 C41 60 40 55 41 50 L42 40 C42 35 45 30 50 30Z" fill="#5dc9c0" opacity="0.4" stroke="#5dc9c0" strokeWidth="0.8"/>
            <path d="M15 50 L20 45 M15 50 L20 55" stroke="#3b82f6" strokeWidth="1" strokeLinecap="round"/>
            <path d="M85 50 L80 45 M85 50 L80 55" stroke="#3b82f6" strokeWidth="1" strokeLinecap="round"/>
          </svg>
        </div>
      );
    case "lighting":
      return (
        <div className={`${baseClass} bg-gradient-to-br from-amber-50 to-amber-100`}>
          <svg viewBox="0 0 100 100" className="w-24 h-24">
            <circle cx="50" cy="35" r="18" fill="#fbbf24" opacity="0.3" stroke="#f59e0b" strokeWidth="1.5"/>
            {[0, 45, 90, 135, 180, 225, 270, 315].map((angle, i) => {
              const rad = (angle * Math.PI) / 180;
              const x1 = 50 + Math.cos(rad) * 22;
              const y1 = 35 + Math.sin(rad) * 22;
              const x2 = 50 + Math.cos(rad) * 28;
              const y2 = 35 + Math.sin(rad) * 28;
              return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#f59e0b" strokeWidth="1.5" strokeLinecap="round"/>;
            })}
            <path d="M50 65 C55 65 58 70 58 75 L59 82 C60 85 55 88 50 88 C45 88 40 85 41 82 L42 75 C42 70 45 65 50 65Z" fill="#607d7d" opacity="0.3" stroke="#607d7d" strokeWidth="0.8"/>
            <circle cx="50" cy="35" r="8" fill="#fcd34d"/>
          </svg>
        </div>
      );
    case "plantar":
      return (
        <div className={`${baseClass} bg-gradient-to-br from-green-50 to-green-100`}>
          <svg viewBox="0 0 100 100" className="w-24 h-24">
            <rect x="25" y="20" width="50" height="60" rx="1" fill="white" stroke="#d1d5db" strokeWidth="0.8"/>
            <path d="M50 28 C56 28 60 33 60 38 L61 48 C62 53 61 58 60 63 C59 66 57 70 53 72 C50 73 47 73 45 72 C41 70 39 66 38 63 C37 58 36 53 37 48 L38 38 C38 33 42 28 50 28Z" fill="#5dc9c0" opacity="0.5" stroke="#5dc9c0" strokeWidth="1"/>
            <path d="M50 8 L50 20" stroke="#3b82f6" strokeWidth="1.5" strokeLinecap="round" strokeDasharray="2,2"/>
            <circle cx="50" cy="8" r="4" fill="none" stroke="#3b82f6" strokeWidth="1"/>
            <text x="50" y="10" fontSize="4" fill="#3b82f6" textAnchor="middle">📱</text>
            <text x="50" y="92" fontSize="5" fill="#22c55e" textAnchor="middle">directly above</text>
          </svg>
        </div>
      );
    case "medial":
      return (
        <div className={`${baseClass} bg-gradient-to-br from-indigo-50 to-indigo-100`}>
          <svg viewBox="0 0 100 100" className="w-24 h-24">
            <line x1="10" y1="70" x2="90" y2="70" stroke="#d1d5db" strokeWidth="0.8"/>
            <path d="M15 70 L25 70 C30 70 40 65 50 55 C60 45 70 50 80 60 L85 70" fill="none" stroke="#5dc9c0" strokeWidth="2"/>
            <path d="M15 70 L25 70 C30 70 40 65 50 55 C60 45 70 50 80 60 L85 70 L85 75 L15 75Z" fill="#5dc9c0" opacity="0.2"/>
            <text x="50" y="50" fontSize="5" fill="#6366f1" textAnchor="middle">arch</text>
            <path d="M50 50 L50 42" stroke="#6366f1" strokeWidth="0.8" strokeDasharray="1,1"/>
            <rect x="5" y="65" width="8" height="12" rx="1" fill="#3b82f6" opacity="0.3" stroke="#3b82f6" strokeWidth="0.8"/>
            <text x="9" y="73" fontSize="4" fill="#3b82f6" textAnchor="middle">📱</text>
            <text x="50" y="88" fontSize="5" fill="#6366f1" textAnchor="middle">floor level</text>
          </svg>
        </div>
      );
    case "posterior":
      return (
        <div className={`${baseClass} bg-gradient-to-br from-purple-50 to-purple-100`}>
          <svg viewBox="0 0 100 100" className="w-24 h-24">
            <line x1="10" y1="75" x2="90" y2="75" stroke="#d1d5db" strokeWidth="0.8"/>
            <path d="M40 75 L40 35 C40 25 45 18 50 15 C55 18 60 25 60 35 L60 75Z" fill="#5dc9c0" opacity="0.3" stroke="#5dc9c0" strokeWidth="1.5"/>
            <line x1="50" y1="15" x2="50" y2="75" stroke="#a855f7" strokeWidth="0.8" strokeDasharray="2,2"/>
            <text x="50" y="85" fontSize="5" fill="#7c3aed" textAnchor="middle">heel alignment</text>
            <rect x="44" y="78" width="12" height="8" rx="1" fill="#3b82f6" opacity="0.3" stroke="#3b82f6" strokeWidth="0.8"/>
            <text x="50" y="84" fontSize="4" fill="#3b82f6" textAnchor="middle">📱</text>
          </svg>
        </div>
      );
    case "shoe":
      return (
        <div className={`${baseClass} bg-gradient-to-br from-orange-50 to-orange-100`}>
          <svg viewBox="0 0 100 100" className="w-24 h-24">
            <ellipse cx="50" cy="50" rx="30" ry="40" fill="#d1d5db" opacity="0.3" stroke="#9ca3af" strokeWidth="1"/>
            <ellipse cx="50" cy="25" rx="15" ry="8" fill="#ef4444" opacity="0.3"/>
            <ellipse cx="50" cy="65" rx="18" ry="12" fill="#f97316" opacity="0.3"/>
            <ellipse cx="42" cy="45" rx="8" ry="12" fill="#22c55e" opacity="0.2"/>
            <text x="50" y="25" fontSize="4" fill="#ef4444" textAnchor="middle">wear</text>
            <text x="50" y="67" fontSize="4" fill="#f97316" textAnchor="middle">wear</text>
            <text x="50" y="92" fontSize="5" fill="#ea580c" textAnchor="middle">sole facing up</text>
          </svg>
        </div>
      );
    case "review":
      return (
        <div className={`${baseClass} bg-gradient-to-br from-emerald-50 to-emerald-100`}>
          <svg viewBox="0 0 100 100" className="w-24 h-24">
            {[0,1,2,3,4,5].map((i) => {
              const col = i % 3;
              const row = Math.floor(i / 3);
              return (
                <g key={i}>
                  <rect x={15 + col * 25} y={15 + row * 35} width="20" height="28" rx="2" fill="#d1fae5" stroke="#22c55e" strokeWidth="0.8"/>
                  <circle cx={15 + col * 25 + 15} cy={15 + row * 35 + 4} r="3" fill="#22c55e"/>
                  <path d={`M${14 + col * 25 + 14} ${15 + row * 35 + 3} l2 2 l3-4`} fill="none" stroke="white" strokeWidth="1" strokeLinecap="round"/>
                </g>
              );
            })}
            <text x="50" y="92" fontSize="5" fill="#059669" textAnchor="middle">all photos reviewed</text>
          </svg>
        </div>
      );
    default:
      return <div className={`${baseClass} bg-slate-100`}><HelpCircle className="h-12 w-12 text-slate-300" /></div>;
  }
}

export default function PatientCaptureGuide({
  locale = "en-GB",
  onComplete,
  onClose,
  mode = "full",
}: PatientCaptureGuideProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [lang, setLang] = useState<Locale>(locale);

  const step = GUIDE_STEPS[currentStep];
  const isLast = currentStep === GUIDE_STEPS.length - 1;
  const isFirst = currentStep === 0;

  const t = (key: string) => T[key]?.[lang] || key;

  if (mode === "compact") {
    return (
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="pt-4 pb-3 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold flex items-center gap-2">
              <HelpCircle className="h-4 w-4 text-primary" />
              {t("tips")}
            </h3>
            <div className="flex gap-1">
              <Button size="sm" variant={lang === "en-GB" ? "default" : "outline"} className="h-6 text-[10px] px-2" onClick={() => setLang("en-GB")}>EN</Button>
              <Button size="sm" variant={lang === "pt-BR" ? "default" : "outline"} className="h-6 text-[10px] px-2" onClick={() => setLang("pt-BR")}>PT</Button>
            </div>
          </div>
          <div className="space-y-2">
            {GUIDE_STEPS.slice(0, 4).map((s, i) => (
              <div key={i} className="flex gap-2 items-start">
                <div className="w-5 h-5 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-primary font-bold text-[10px]">{i + 1}</span>
                </div>
                <div>
                  <p className="text-xs font-medium">{s.title[lang]}</p>
                  <p className="text-[10px] text-muted-foreground">{s.description[lang]}</p>
                </div>
              </div>
            ))}
          </div>
          {onClose && <Button variant="ghost" size="sm" className="w-full text-xs h-7" onClick={onClose}>{t("close")}</Button>}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">{t("title")}</h1>
          <p className="text-xs text-muted-foreground mt-0.5">{t("subtitle")}</p>
        </div>
        <div className="flex gap-1">
          <Button size="sm" variant={lang === "en-GB" ? "default" : "outline"} className="h-7 text-xs px-2.5" onClick={() => setLang("en-GB")}>EN</Button>
          <Button size="sm" variant={lang === "pt-BR" ? "default" : "outline"} className="h-7 text-xs px-2.5" onClick={() => setLang("pt-BR")}>PT</Button>
        </div>
      </div>

      {/* Progress dots */}
      <div className="flex items-center gap-1.5 justify-center">
        {GUIDE_STEPS.map((_, i) => (
          <button
            key={i}
            onClick={() => setCurrentStep(i)}
            className={`w-2.5 h-2.5 rounded-full transition-all ${
              i === currentStep ? "bg-primary w-6" : i < currentStep ? "bg-primary/40" : "bg-slate-200"
            }`}
          />
        ))}
      </div>

      {/* Step counter */}
      <div className="flex items-center justify-between">
        <Badge variant="outline" className="text-xs">{t("stepOf")} {currentStep + 1} {t("of")} {GUIDE_STEPS.length}</Badge>
        <Badge variant="outline" className="text-xs gap-1">
          <step.icon className="h-3 w-3" /> {step.title[lang]}
        </Badge>
      </div>

      {/* Visual */}
      <StepVisual type={step.visual} />

      {/* Content */}
      <div className="space-y-3">
        <h2 className="text-lg font-bold">{step.title[lang]}</h2>
        <p className="text-sm text-muted-foreground">{step.description[lang]}</p>

        <div className="space-y-2 mt-3">
          {step.details[lang].map((detail, i) => (
            <div key={i} className="flex gap-2.5 items-start">
              <CheckCircle className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
              <p className="text-xs text-slate-700 leading-snug">{detail}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Navigation */}
      <div className="flex gap-3 pt-2">
        {!isFirst ? (
          <Button variant="outline" className="flex-1 gap-1" onClick={() => setCurrentStep(c => c - 1)}>
            <ChevronLeft className="h-4 w-4" /> {t("prev")}
          </Button>
        ) : (
          onClose && <Button variant="outline" className="flex-1" onClick={onClose}>{t("close")}</Button>
        )}
        {isLast ? (
          <Button className="flex-1 gap-2 h-11" onClick={onComplete}>
            {t("ready")} <ChevronRight className="h-4 w-4" />
          </Button>
        ) : (
          <Button className="flex-1 gap-2 h-11" onClick={() => setCurrentStep(c => c + 1)}>
            {t("next")} <ChevronRight className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
