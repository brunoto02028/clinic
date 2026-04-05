"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Camera, 
  Video, 
  CheckCircle2, 
  AlertCircle, 
  Lightbulb,
  ArrowRight,
  Play,
  X,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface PhotoInstructionsProps {
  onComplete: () => void;
  type: "photos" | "video" | "both";
}

export function PhotoInstructions({ onComplete, type }: PhotoInstructionsProps) {
  const [showVideo, setShowVideo] = useState(false);
  const [understood, setUnderstood] = useState(false);

  const photoAngles = [
    {
      name: "Frontal",
      description: "Pés juntos, vista de frente",
      icon: "👣",
      tips: ["Fique em pé naturalmente", "Pés paralelos", "Câmera na altura dos joelhos"],
    },
    {
      name: "Lateral Esquerda",
      description: "Vista do lado esquerdo",
      icon: "🦶",
      tips: ["Perfil completo do pé", "Arco plantar visível", "Tornozelo à mostra"],
    },
    {
      name: "Lateral Direita",
      description: "Vista do lado direito",
      icon: "🦶",
      tips: ["Perfil completo do pé", "Arco plantar visível", "Tornozelo à mostra"],
    },
    {
      name: "Posterior",
      description: "Vista de trás (calcanhares)",
      icon: "👟",
      tips: ["Calcanhares centralizados", "Tendão de Aquiles visível", "Alinhamento dos pés"],
    },
    {
      name: "Superior",
      description: "Vista de cima",
      icon: "📸",
      tips: ["Câmera acima dos pés", "Dedos e planta visíveis", "Ambos os pés na foto"],
    },
  ];

  const generalTips = [
    {
      icon: Lightbulb,
      title: "Iluminação",
      description: "Use luz natural ou ambiente bem iluminado. Evite sombras fortes.",
      color: "text-yellow-600",
    },
    {
      icon: Camera,
      title: "Fundo Neutro",
      description: "Prefira piso claro e liso. Evite tapetes ou pisos com padrões.",
      color: "text-blue-600",
    },
    {
      icon: CheckCircle2,
      title: "Pés Descalços",
      description: "Remova meias, sapatos e qualquer acessório dos pés.",
      color: "text-green-600",
    },
    {
      icon: AlertCircle,
      title: "Qualidade",
      description: "Fotos nítidas e focadas. Evite fotos tremidas ou desfocadas.",
      color: "text-red-600",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="flex items-center justify-center gap-2 mb-4">
          <Camera className="h-8 w-8 text-primary" />
          <h2 className="text-2xl font-bold">Como Tirar Fotos dos Seus Pés</h2>
        </div>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Siga estas instruções para garantir fotos de qualidade que permitirão uma análise precisa.
          Fotos bem tiradas resultam em palmilhas mais eficazes!
        </p>
      </div>

      {/* Video Tutorial */}
      <Card className="border-primary/20 bg-primary/5">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Play className="h-5 w-5 text-primary" />
              <CardTitle>Vídeo Tutorial</CardTitle>
            </div>
            <Badge variant="secondary">Recomendado</Badge>
          </div>
          <CardDescription>
            Assista ao vídeo explicativo antes de começar (2 minutos)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button 
            onClick={() => setShowVideo(true)} 
            className="w-full gap-2"
            size="lg"
          >
            <Play className="h-4 w-4" />
            Assistir Vídeo Tutorial
          </Button>
        </CardContent>
      </Card>

      {/* Photo Angles */}
      {(type === "photos" || type === "both") && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Camera className="h-5 w-5" />
            Ângulos Necessários
          </h3>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {photoAngles.map((angle, index) => (
              <Card key={index} className="hover:border-primary/50 transition-colors">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-3xl">{angle.icon}</span>
                      <div>
                        <CardTitle className="text-base">{angle.name}</CardTitle>
                        <CardDescription className="text-xs">
                          {angle.description}
                        </CardDescription>
                      </div>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {index + 1}/5
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-1 text-sm text-muted-foreground">
                    {angle.tips.map((tip, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                        <span>{tip}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Video Instructions */}
      {(type === "video" || type === "both") && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Video className="h-5 w-5" />
              <CardTitle>Vídeo de Marcha</CardTitle>
            </div>
            <CardDescription>
              Grave um vídeo caminhando naturalmente
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid md:grid-cols-2 gap-3">
              <div className="space-y-2">
                <h4 className="font-medium text-sm">Como Gravar:</h4>
                <ul className="space-y-1 text-sm text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5" />
                    <span>Caminhe 5-10 passos em linha reta</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5" />
                    <span>Vista lateral (perfil completo)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5" />
                    <span>Caminhe naturalmente, sem exageros</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5" />
                    <span>Duração: 10-15 segundos</span>
                  </li>
                </ul>
              </div>
              <div className="space-y-2">
                <h4 className="font-medium text-sm">Evite:</h4>
                <ul className="space-y-1 text-sm text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <X className="h-4 w-4 text-red-600 mt-0.5" />
                    <span>Vídeo tremido ou desfocado</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <X className="h-4 w-4 text-red-600 mt-0.5" />
                    <span>Caminhar muito rápido ou devagar</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <X className="h-4 w-4 text-red-600 mt-0.5" />
                    <span>Usar calçados (deve ser descalço)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <X className="h-4 w-4 text-red-600 mt-0.5" />
                    <span>Iluminação muito fraca</span>
                  </li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* General Tips */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Lightbulb className="h-5 w-5" />
          Dicas Importantes
        </h3>
        <div className="grid md:grid-cols-2 gap-4">
          {generalTips.map((tip, index) => (
            <Card key={index}>
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  <tip.icon className={`h-5 w-5 ${tip.color} flex-shrink-0 mt-0.5`} />
                  <div>
                    <h4 className="font-medium mb-1">{tip.title}</h4>
                    <p className="text-sm text-muted-foreground">{tip.description}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Confirmation */}
      <Card className="border-primary">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3 mb-4">
            <input
              type="checkbox"
              id="understood"
              checked={understood}
              onChange={(e) => setUnderstood(e.target.checked)}
              className="mt-1 h-4 w-4 rounded border-gray-300"
            />
            <label htmlFor="understood" className="text-sm cursor-pointer">
              Li e entendi todas as instruções. Estou pronto(a) para tirar fotos de qualidade
              que permitirão uma análise precisa dos meus pés.
            </label>
          </div>
          <Button
            onClick={onComplete}
            disabled={!understood}
            className="w-full gap-2"
            size="lg"
          >
            Entendi, Começar Upload
            <ArrowRight className="h-4 w-4" />
          </Button>
        </CardContent>
      </Card>

      {/* Video Dialog */}
      <Dialog open={showVideo} onOpenChange={setShowVideo}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Vídeo Tutorial - Como Tirar Fotos dos Pés</DialogTitle>
          </DialogHeader>
          <div className="aspect-video bg-muted rounded-lg flex items-center justify-center">
            {/* Placeholder for video - replace with actual video embed */}
            <div className="text-center space-y-4">
              <Play className="h-16 w-16 mx-auto text-muted-foreground" />
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  Vídeo tutorial será adicionado aqui
                </p>
                <p className="text-xs text-muted-foreground">
                  Você pode usar YouTube, Vimeo ou hospedar o vídeo diretamente
                </p>
              </div>
              {/* Example YouTube embed:
              <iframe
                width="100%"
                height="100%"
                src="https://www.youtube.com/embed/YOUR_VIDEO_ID"
                title="Tutorial"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
              */}
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowVideo(false)}>
              Fechar
            </Button>
            <Button onClick={() => {
              setShowVideo(false);
              setUnderstood(true);
            }}>
              Entendi, Continuar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
