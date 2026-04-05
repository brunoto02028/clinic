"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Camera, 
  CheckCircle2, 
  AlertCircle, 
  Lightbulb,
  User,
  ArrowRight,
} from "lucide-react";

interface PhotoGuideProps {
  onComplete: () => void;
}

export function BiomechanicalPhotoGuide({ onComplete }: PhotoGuideProps) {
  const angles = [
    {
      name: "Frontal (Frente)",
      icon: "🧍",
      description: "Vista de frente, corpo inteiro",
      tips: [
        "Fique em pé naturalmente",
        "Braços relaxados ao lado do corpo",
        "Olhar para frente",
        "Pés afastados na largura dos ombros",
      ],
      image: "/images/guide/frontal.svg", // Placeholder
    },
    {
      name: "Posterior (Costas)",
      icon: "🚶",
      description: "Vista de costas, corpo inteiro",
      tips: [
        "Mesma postura da foto frontal",
        "Braços relaxados",
        "Coluna visível",
        "Calcanhares alinhados",
      ],
      image: "/images/guide/posterior.svg",
    },
    {
      name: "Lateral Esquerda",
      icon: "👤",
      description: "Vista do lado esquerdo",
      tips: [
        "Perfil completo visível",
        "Braço esquerdo relaxado",
        "Orelha, ombro, quadril e tornozelo alinhados",
        "Não inclinar para frente ou trás",
      ],
      image: "/images/guide/lateral-left.svg",
    },
    {
      name: "Lateral Direita",
      icon: "👥",
      description: "Vista do lado direito",
      tips: [
        "Perfil completo visível",
        "Braço direito relaxado",
        "Mesma postura da lateral esquerda",
        "Câmera na altura do peito",
      ],
      image: "/images/guide/lateral-right.svg",
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
      description: "Prefira parede clara e lisa. Evite fundos com padrões ou objetos.",
      color: "text-blue-600",
    },
    {
      icon: User,
      title: "Roupa Adequada",
      description: "Use roupas justas ou de ginástica. Evite roupas largas que escondam o corpo.",
      color: "text-purple-600",
    },
    {
      icon: AlertCircle,
      title: "Distância",
      description: "Fique a 2-3 metros da câmera. Corpo inteiro deve aparecer na foto.",
      color: "text-red-600",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="flex items-center justify-center gap-2 mb-4">
          <Camera className="h-8 w-8 text-primary" />
          <h2 className="text-2xl font-bold">Guia de Fotos - Análise Biomecânica</h2>
        </div>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Siga estas instruções para garantir fotos de qualidade que permitirão uma análise precisa da sua postura e biomecânica.
        </p>
      </div>

      {/* Important Note */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
            <div className="space-y-2">
              <h3 className="font-semibold">Importante:</h3>
              <p className="text-sm text-muted-foreground">
                As fotos devem mostrar seu corpo inteiro, da cabeça aos pés. Use roupas justas (shorts e top/camiseta) 
                para que possamos visualizar claramente seus ombros, quadris, joelhos e tornozelos.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Photo Angles */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Camera className="h-5 w-5" />
          4 Ângulos Necessários
        </h3>
        <div className="grid md:grid-cols-2 gap-4">
          {angles.map((angle, index) => (
            <Card key={index} className="hover:border-primary/50 transition-colors">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-4xl">{angle.icon}</span>
                    <div>
                      <CardTitle className="text-base">{angle.name}</CardTitle>
                      <CardDescription className="text-xs">
                        {angle.description}
                      </CardDescription>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {index + 1}/4
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-1.5 text-sm text-muted-foreground">
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

      {/* What We Analyze */}
      <Card className="border-purple-200 bg-purple-50/50">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-purple-600" />
            O que analisamos com suas fotos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-3 text-sm">
            <div className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-purple-600 mt-0.5 flex-shrink-0" />
              <span>33 pontos corporais detectados automaticamente</span>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-purple-600 mt-0.5 flex-shrink-0" />
              <span>Ângulos articulares (ombros, quadris, joelhos)</span>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-purple-600 mt-0.5 flex-shrink-0" />
              <span>Assimetrias esquerda-direita</span>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-purple-600 mt-0.5 flex-shrink-0" />
              <span>Alinhamento postural (linha de prumo)</span>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-purple-600 mt-0.5 flex-shrink-0" />
              <span>Pontuação de postura (0-100)</span>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-purple-600 mt-0.5 flex-shrink-0" />
              <span>Desvios e compensações posturais</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Action Button */}
      <Card className="border-primary">
        <CardContent className="pt-6">
          <div className="text-center space-y-4">
            <p className="text-sm text-muted-foreground">
              Leia todas as instruções acima antes de começar. Fotos de qualidade resultam em análises mais precisas!
            </p>
            <Button
              onClick={onComplete}
              className="w-full gap-2"
              size="lg"
            >
              Entendi, Começar Upload
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
