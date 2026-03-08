"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import {
  CheckCircle2, AlertTriangle, XCircle, Camera, RefreshCw,
  Send, Loader2, Landmark, ImageOff, Info, Lightbulb, ChevronDown,
} from "lucide-react";

interface ViewQuality {
  view: string;
  label: string;
  hasImage: boolean;
  imageUrl?: string;
  landmarkCount: number;
  totalLandmarks: number;
  landmarkCoverage: number;
  status: "good" | "fair" | "poor" | "missing";
  issues: string[];
  tips: string[];
}

interface PhotoQualityPanelProps {
  assessment: any;
  locale?: string;
  onRequestRecapture?: (views: string[], reason: string, instructions: string) => Promise<void>;
  onReanalyze?: () => Promise<void>;
}

const VIEW_CONFIG = [
  { key: "front", en: "Frontal", pt: "Frontal", landmarksKey: "frontLandmarks", imageKey: "frontImageUrl" },
  { key: "back", en: "Posterior", pt: "Posterior", landmarksKey: "backLandmarks", imageKey: "backImageUrl" },
  { key: "left", en: "Left Lateral", pt: "Lateral Esq.", landmarksKey: "leftLandmarks", imageKey: "leftImageUrl" },
  { key: "right", en: "Right Lateral", pt: "Lateral Dir.", landmarksKey: "rightLandmarks", imageKey: "rightImageUrl" },
];

// Photo-taking tips per view
const VIEW_TIPS: Record<string, { en: string[]; pt: string[] }> = {
  front: {
    en: [
      "Stand 2-3 meters from camera, full body visible head to feet",
      "Arms relaxed at sides, feet hip-width apart",
      "Face the camera directly, looking straight ahead",
      "Wear minimal, form-fitting clothing (shorts + sports bra/no shirt)",
      "Plain, light-colored wall background with good lighting",
    ],
    pt: [
      "Fique a 2-3 metros da câmera, corpo inteiro visível da cabeça aos pés",
      "Braços relaxados ao lado do corpo, pés na largura do quadril",
      "Olhe diretamente para a câmera, olhando para frente",
      "Use roupas justas e mínimas (shorts + top esportivo/sem camisa)",
      "Fundo liso e claro, com boa iluminação",
    ],
  },
  back: {
    en: [
      "Same position as frontal, but turn 180° facing away from camera",
      "Hair tied up if long (to see neck/upper back)",
      "Arms relaxed, do not hold anything",
      "Ensure lower back and calves are fully visible",
    ],
    pt: [
      "Mesma posição da frontal, mas vire 180° de costas para a câmera",
      "Cabelo preso se longo (para ver pescoço/coluna torácica)",
      "Braços relaxados, não segure nada",
      "Certifique-se que lombar e panturrilhas estão totalmente visíveis",
    ],
  },
  left: {
    en: [
      "Turn 90° so your LEFT side faces the camera",
      "Arms relaxed at sides (not crossed or behind back)",
      "Feet together, natural standing posture",
      "Camera should capture from ear to ankle",
      "Good for assessing: head forward posture, kyphosis, lordosis, knee flexion",
    ],
    pt: [
      "Vire 90° para que seu lado ESQUERDO fique de frente para a câmera",
      "Braços relaxados ao lado (não cruzados nem atrás)",
      "Pés juntos, postura natural em pé",
      "Câmera deve capturar da orelha ao tornozelo",
      "Ideal para avaliar: anteriorização da cabeça, cifose, lordose, flexão do joelho",
    ],
  },
  right: {
    en: [
      "Turn 90° so your RIGHT side faces the camera",
      "Same instructions as left lateral view",
      "Both lateral views allow comparison of asymmetries",
    ],
    pt: [
      "Vire 90° para que seu lado DIREITO fique de frente para a câmera",
      "Mesmas instruções da vista lateral esquerda",
      "Ambas as vistas laterais permitem comparação de assimetrias",
    ],
  },
};

function assessViewQuality(assessment: any, viewConfig: typeof VIEW_CONFIG[0], isPt: boolean): ViewQuality {
  const imageUrl = assessment[viewConfig.imageKey];
  const landmarks = assessment[viewConfig.landmarksKey];
  const hasImage = !!imageUrl;
  const landmarkArray = Array.isArray(landmarks) ? landmarks : [];
  const visibleLandmarks = landmarkArray.filter((l: any) => l && l.visibility > 0.5);
  const landmarkCount = visibleLandmarks.length;
  const totalLandmarks = 33;
  const landmarkCoverage = Math.round((landmarkCount / totalLandmarks) * 100);

  const issues: string[] = [];
  const tips: string[] = [];

  if (!hasImage) {
    tips.push(...(isPt ? VIEW_TIPS[viewConfig.key].pt : VIEW_TIPS[viewConfig.key].en));
    return {
      view: viewConfig.key,
      label: isPt ? viewConfig.pt : viewConfig.en,
      hasImage: false,
      landmarkCount: 0,
      totalLandmarks,
      landmarkCoverage: 0,
      status: "missing",
      issues: [isPt ? "Foto não capturada" : "Photo not captured"],
      tips,
    };
  }

  if (landmarkCount === 0) {
    issues.push(isPt
      ? "Nenhum ponto anatômico detectado automaticamente. Possíveis causas: foto escura, corpo cortado, roupa larga ou fundo confuso. A IA ainda analisa visualmente, mas a precisão é reduzida."
      : "No anatomical landmarks auto-detected. Possible causes: dark photo, body cropped, baggy clothing, or busy background. AI still analyzes visually but accuracy is reduced.");
    tips.push(isPt
      ? "Para melhor detecção: tire a foto com boa iluminação, corpo inteiro visível, roupa justa e fundo neutro."
      : "For better detection: take photo with good lighting, full body visible, tight clothing, and neutral background.");
  } else if (landmarkCount < 15) {
    issues.push(isPt
      ? `Apenas ${landmarkCount} de 33 pontos detectados. Corpo provavelmente cortado parcialmente na foto.`
      : `Only ${landmarkCount} of 33 landmarks detected. Body likely partially cropped in photo.`);
    tips.push(isPt
      ? "Afaste-se mais da câmera para que o corpo inteiro apareça (cabeça aos pés)."
      : "Stand further from camera so full body is visible (head to feet).");
  }

  // Check for key landmarks per view
  if (viewConfig.key === "front" || viewConfig.key === "back") {
    const keyParts = [
      { indices: [11, 12], name: isPt ? "ombros" : "shoulders" },
      { indices: [23, 24], name: isPt ? "quadril" : "hips" },
      { indices: [25, 26], name: isPt ? "joelhos" : "knees" },
      { indices: [27, 28], name: isPt ? "tornozelos" : "ankles" },
    ];
    const missingParts = keyParts.filter(p =>
      p.indices.every(i => !landmarkArray[i] || landmarkArray[i].visibility < 0.4)
    );
    if (missingParts.length > 0) {
      const partNames = missingParts.map(p => p.name).join(", ");
      issues.push(isPt
        ? `Região não detectada: ${partNames}. Certifique-se que essas áreas estão visíveis na foto.`
        : `Region not detected: ${partNames}. Ensure these areas are visible in the photo.`);
    }
  }

  if (viewConfig.key === "left" || viewConfig.key === "right") {
    if (landmarkCount > 0 && landmarkCount < 10) {
      issues.push(isPt
        ? "Detecção parcial na vista lateral — é normal ter menos pontos nesta angulação, mas a IA compensa com análise visual."
        : "Partial detection in lateral view — fewer landmarks are normal at this angle, but AI compensates with visual analysis.");
    }
  }

  let status: "good" | "fair" | "poor";
  if (landmarkCoverage >= 60) {
    status = "good";
  } else if (landmarkCoverage >= 30 || (landmarkCount === 0 && hasImage)) {
    status = "fair";
  } else if (landmarkCoverage > 0) {
    status = "poor";
  } else {
    // No landmarks but has image
    status = "fair";
  }

  if (hasImage && issues.length === 0) {
    status = "good";
  }

  return {
    view: viewConfig.key,
    label: isPt ? viewConfig.pt : viewConfig.en,
    hasImage,
    imageUrl,
    landmarkCount,
    totalLandmarks,
    landmarkCoverage,
    status,
    issues,
    tips,
  };
}

const STATUS_ICON = {
  good: <CheckCircle2 className="h-4 w-4 text-green-500" />,
  fair: <AlertTriangle className="h-4 w-4 text-yellow-500" />,
  poor: <XCircle className="h-4 w-4 text-red-500" />,
  missing: <ImageOff className="h-4 w-4 text-muted-foreground" />,
};

const STATUS_BADGE = {
  good: "bg-green-500/10 text-green-600 border-green-500/20",
  fair: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20",
  poor: "bg-red-500/10 text-red-600 border-red-500/20",
  missing: "bg-muted text-muted-foreground",
};

export function PhotoQualityPanel({ assessment, locale = "en", onRequestRecapture, onReanalyze }: PhotoQualityPanelProps) {
  const isPt = locale === "pt-BR";
  const [selectedViews, setSelectedViews] = useState<string[]>([]);
  const [reason, setReason] = useState("");
  const [instructions, setInstructions] = useState("");
  const [showRecapture, setShowRecapture] = useState(false);
  const [sending, setSending] = useState(false);
  const [reanalyzing, setReanalyzing] = useState(false);
  const [expandedView, setExpandedView] = useState<string | null>(null);
  const [showGuide, setShowGuide] = useState(false);

  const qualities = VIEW_CONFIG.map(vc => assessViewQuality(assessment, vc, isPt));
  const capturedCount = qualities.filter(q => q.hasImage).length;
  const hasAnyIssues = qualities.some(q => q.status !== "good" && q.hasImage);
  const hasNoLandmarks = qualities.every(q => q.landmarkCount === 0);

  const toggleView = (view: string) => {
    setSelectedViews(prev =>
      prev.includes(view) ? prev.filter(v => v !== view) : [...prev, view]
    );
  };

  const handleRequestRecapture = async () => {
    if (selectedViews.length === 0 || !onRequestRecapture) return;
    setSending(true);
    try {
      await onRequestRecapture(selectedViews, reason, instructions);
      setShowRecapture(false);
      setSelectedViews([]);
      setReason("");
      setInstructions("");
    } finally {
      setSending(false);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <Camera className="h-4 w-4 text-blue-500" />
            {isPt ? "Qualidade das Fotos" : "Photo Quality"}
          </CardTitle>
          <div className="flex items-center gap-1.5 text-xs">
            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
              {capturedCount}/4 {isPt ? "capturadas" : "captured"}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Overall assessment message */}
        {hasNoLandmarks && capturedCount > 0 && (
          <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/5 p-3 space-y-2">
            <div className="flex items-start gap-2">
              <Info className="h-4 w-4 text-yellow-500 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs font-medium text-yellow-600">
                  {isPt ? "Detecção automática de pontos anatômicos não disponível" : "Automatic anatomical landmark detection unavailable"}
                </p>
                <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">
                  {isPt
                    ? "As fotos foram enviadas por upload direto (galeria), sem passar pela câmera com detecção em tempo real. A IA Gemini Vision ainda analisa as imagens visualmente, mas sem os 33 pontos de referência a precisão das medições angulares é reduzida. Para análise com detecção completa, peça ao paciente usar a câmera do sistema (botão 'Open Capture')."
                    : "Photos were uploaded directly (gallery) without going through the live camera with real-time detection. The Gemini Vision AI still analyzes images visually, but without the 33 reference points, angular measurement accuracy is reduced. For full detection analysis, ask the patient to use the system camera ('Open Capture' button)."}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Quality grid */}
        <div className="grid grid-cols-2 gap-2">
          {qualities.map(q => (
            <div key={q.view} className="space-y-0">
              <div
                className={`rounded-lg border p-2.5 cursor-pointer transition-all ${
                  selectedViews.includes(q.view) ? "ring-2 ring-purple-500 border-purple-500" : ""
                } ${showRecapture ? "hover:border-purple-500/50" : ""}`}
                onClick={() => {
                  if (showRecapture) {
                    toggleView(q.view);
                  } else {
                    setExpandedView(expandedView === q.view ? null : q.view);
                  }
                }}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-medium">{q.label}</span>
                  <div className="flex items-center gap-1">
                    {STATUS_ICON[q.status]}
                    {(q.issues.length > 0 || q.tips.length > 0) && (
                      <ChevronDown className={`h-3 w-3 text-muted-foreground transition-transform ${expandedView === q.view ? "rotate-180" : ""}`} />
                    )}
                  </div>
                </div>

                {q.hasImage ? (
                  <>
                    <div className="flex items-center gap-1.5 mb-1">
                      <Landmark className="h-3 w-3 text-muted-foreground" />
                      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            q.landmarkCoverage >= 60 ? "bg-green-500" :
                            q.landmarkCoverage >= 30 ? "bg-yellow-500" : "bg-red-500"
                          }`}
                          style={{ width: `${Math.max(q.landmarkCoverage, 5)}%` }}
                        />
                      </div>
                      <span className="text-[10px] text-muted-foreground">{q.landmarkCount}/{q.totalLandmarks}</span>
                    </div>
                    <Badge variant="outline" className={`text-[9px] px-1 py-0 ${STATUS_BADGE[q.status]}`}>
                      {q.status === "good" ? (isPt ? "Boa" : "Good") :
                       q.status === "fair" ? (isPt ? "Razoável" : "Fair") :
                       isPt ? "Ruim" : "Poor"}
                    </Badge>
                  </>
                ) : (
                  <p className="text-[10px] text-muted-foreground italic">
                    {isPt ? "Não capturada" : "Not captured"}
                  </p>
                )}
              </div>

              {/* Expanded details for this view */}
              {expandedView === q.view && (q.issues.length > 0 || q.tips.length > 0) && (
                <div className="rounded-b-lg border border-t-0 bg-muted/30 p-2.5 space-y-2 -mt-px">
                  {q.issues.map((issue, i) => (
                    <div key={i} className="flex items-start gap-1.5">
                      <AlertTriangle className="h-3 w-3 text-yellow-500 mt-0.5 shrink-0" />
                      <p className="text-[10px] text-muted-foreground leading-relaxed">{issue}</p>
                    </div>
                  ))}
                  {q.tips.map((tip, i) => (
                    <div key={`t-${i}`} className="flex items-start gap-1.5">
                      <Lightbulb className="h-3 w-3 text-blue-400 mt-0.5 shrink-0" />
                      <p className="text-[10px] text-blue-400 leading-relaxed">{tip}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Photo Guide toggle */}
        <Button
          variant="ghost"
          size="sm"
          className="w-full text-xs gap-1.5 text-blue-500 hover:text-blue-600 hover:bg-blue-500/10"
          onClick={() => setShowGuide(!showGuide)}
        >
          <Lightbulb className="h-3.5 w-3.5" />
          {isPt ? "Como tirar fotos ideais para avaliação" : "How to take ideal assessment photos"}
          <ChevronDown className={`h-3 w-3 ml-auto transition-transform ${showGuide ? "rotate-180" : ""}`} />
        </Button>

        {showGuide && (
          <div className="rounded-lg border border-blue-500/20 bg-blue-500/5 p-3 space-y-3">
            <p className="text-xs font-medium text-blue-500">
              {isPt ? "Guia de Fotografia para Avaliação Postural" : "Photography Guide for Postural Assessment"}
            </p>
            <div className="space-y-2 text-[11px] text-muted-foreground leading-relaxed">
              <div>
                <p className="font-medium text-foreground text-[11px] mb-0.5">{isPt ? "Ambiente:" : "Environment:"}</p>
                <p>{isPt
                  ? "• Fundo liso e claro (parede branca/bege)\n• Boa iluminação uniforme (sem sombras fortes)\n• Espaço suficiente para capturar corpo inteiro (2-3m de distância)"
                  : "• Plain, light background (white/beige wall)\n• Good uniform lighting (no harsh shadows)\n• Enough space to capture full body (2-3m distance)"}</p>
              </div>
              <div>
                <p className="font-medium text-foreground text-[11px] mb-0.5">{isPt ? "Vestimenta:" : "Clothing:"}</p>
                <p>{isPt
                  ? "• Roupas justas que mostrem o contorno do corpo\n• Ideal: shorts + top esportivo (mulheres) ou shorts sem camisa (homens)\n• Sem sapatos — pés descalços\n• Cabelo preso se comprido"
                  : "• Tight-fitting clothes that show body contour\n• Ideal: shorts + sports bra (women) or shorts shirtless (men)\n• No shoes — barefoot\n• Hair tied up if long"}</p>
              </div>
              <div>
                <p className="font-medium text-foreground text-[11px] mb-0.5">{isPt ? "Posicionamento:" : "Positioning:"}</p>
                <p>{isPt
                  ? "• Em pé, postura natural e relaxada\n• Braços ao lado do corpo, não cruzados\n• Pés na largura do quadril\n• Olhar para frente (frontal/posterior)\n• 4 vistas: frontal → posterior → lateral esquerda → lateral direita"
                  : "• Standing, natural relaxed posture\n• Arms at sides, not crossed\n• Feet hip-width apart\n• Looking straight ahead (front/back)\n• 4 views: front → back → left side → right side"}</p>
              </div>
              <div>
                <p className="font-medium text-foreground text-[11px] mb-0.5">{isPt ? "Câmera:" : "Camera:"}</p>
                <p>{isPt
                  ? "• Altura da cintura do paciente\n• Corpo inteiro enquadrado (da cabeça aos pés)\n• Sem zoom — use distância física\n• Use preferencialmente a câmera do sistema (botão 'Open Capture') para detecção automática de pontos"
                  : "• At patient's waist height\n• Full body framed (head to feet)\n• No zoom — use physical distance\n• Preferably use the system camera ('Open Capture' button) for automatic landmark detection"}</p>
              </div>
            </div>
          </div>
        )}

        {/* Re-analyze existing photos */}
        {onReanalyze && capturedCount > 0 && (
          <Button
            variant="outline"
            size="sm"
            className="w-full text-xs gap-1.5 border-purple-500/30 text-purple-600 hover:bg-purple-500/10"
            disabled={reanalyzing}
            onClick={async () => {
              setReanalyzing(true);
              try { await onReanalyze(); } finally { setReanalyzing(false); }
            }}
          >
            {reanalyzing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
            {isPt ? "Re-analisar Fotos com IA" : "Re-analyze Photos with AI"}
          </Button>
        )}

        {/* Re-capture request section */}
        {onRequestRecapture && (
          <>
            {!showRecapture ? (
              <Button
                variant="outline"
                size="sm"
                className="w-full text-xs gap-1.5 border-orange-500/30 text-orange-600 hover:bg-orange-500/10"
                onClick={() => setShowRecapture(true)}
              >
                <RefreshCw className="h-3.5 w-3.5" />
                {isPt ? "Solicitar Nova Captura" : "Request Recapture"}
              </Button>
            ) : (
              <div className="space-y-2 border rounded-lg p-3 bg-orange-500/5 border-orange-500/20">
                <p className="text-xs font-medium text-orange-600 flex items-center gap-1.5">
                  <RefreshCw className="h-3.5 w-3.5" />
                  {isPt ? "Clique nas vistas acima para selecionar quais precisam ser refeitas" : "Click on views above to select which need to be retaken"}
                </p>

                {selectedViews.length > 0 && (
                  <div className="flex gap-1 flex-wrap">
                    {selectedViews.map(v => (
                      <Badge key={v} variant="secondary" className="text-[10px]">
                        {qualities.find(q => q.view === v)?.label || v}
                      </Badge>
                    ))}
                  </div>
                )}

                <Textarea
                  value={reason}
                  onChange={e => setReason(e.target.value)}
                  placeholder={isPt ? "Motivo (ex: Foto frontal cortada nos pés, fundo confuso)" : "Reason (e.g. Frontal photo cropped at feet, busy background)"}
                  rows={2}
                  className="text-xs"
                />
                <Textarea
                  value={instructions}
                  onChange={e => setInstructions(e.target.value)}
                  placeholder={isPt
                    ? "Instruções para o paciente (ex: Fique mais longe, corpo inteiro visível, fundo claro, use a câmera do sistema)"
                    : "Instructions for patient (e.g. Stand further back, full body visible, light background, use the system camera)"}
                  rows={2}
                  className="text-xs"
                />

                <div className="flex gap-2">
                  <Button
                    variant="ghost" size="sm" className="text-xs flex-1"
                    onClick={() => { setShowRecapture(false); setSelectedViews([]); }}
                  >
                    {isPt ? "Cancelar" : "Cancel"}
                  </Button>
                  <Button
                    size="sm"
                    className="text-xs flex-1 bg-orange-600 hover:bg-orange-700 gap-1.5"
                    onClick={handleRequestRecapture}
                    disabled={selectedViews.length === 0 || sending}
                  >
                    {sending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                    {isPt ? "Enviar Solicitação" : "Send Request"}
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
