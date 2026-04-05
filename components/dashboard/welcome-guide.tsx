"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Calendar,
  FileText,
  Activity,
  Dumbbell,
  CheckCircle2,
  ArrowRight,
  X,
  Sparkles,
  Target,
  TrendingUp,
} from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface WelcomeGuideProps {
  userName: string;
  onComplete: () => void;
  onDismiss: () => void;
}

export function WelcomeGuide({ userName, onComplete, onDismiss }: WelcomeGuideProps) {
  const [currentStep, setCurrentStep] = useState(0);

  const steps = [
    {
      title: "Bem-vindo ao seu Portal de Saúde! 🎉",
      description: "Vamos fazer um tour rápido para você aproveitar ao máximo sua experiência",
      icon: Sparkles,
      color: "text-purple-600",
      bgColor: "bg-purple-100",
      content: (
        <div className="space-y-4">
          <p className="text-muted-foreground">
            Olá <strong>{userName}</strong>! Estamos muito felizes em tê-lo(a) conosco. 
            Este portal foi criado para tornar sua jornada de saúde mais fácil e eficiente.
          </p>
          <div className="grid md:grid-cols-2 gap-3">
            <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
              <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="font-medium text-sm">Agende Consultas</h4>
                <p className="text-xs text-muted-foreground">Online, 24/7</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
              <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="font-medium text-sm">Acesse Resultados</h4>
                <p className="text-xs text-muted-foreground">Análises e relatórios</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
              <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="font-medium text-sm">Exercícios Personalizados</h4>
                <p className="text-xs text-muted-foreground">Com vídeos guiados</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
              <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="font-medium text-sm">Acompanhe Progresso</h4>
                <p className="text-xs text-muted-foreground">Métricas e conquistas</p>
              </div>
            </div>
          </div>
        </div>
      ),
    },
    {
      title: "Agende sua Primeira Consulta 📅",
      description: "Comece sua jornada agendando uma avaliação inicial",
      icon: Calendar,
      color: "text-blue-600",
      bgColor: "bg-blue-100",
      content: (
        <div className="space-y-4">
          <p className="text-muted-foreground">
            O primeiro passo é agendar uma consulta de avaliação. É rápido e fácil!
          </p>
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-blue-600 text-xs font-bold flex-shrink-0">
                1
              </div>
              <div>
                <h4 className="font-medium text-sm">Escolha o Serviço</h4>
                <p className="text-xs text-muted-foreground">
                  Avaliação Biomecânica, Fisioterapia, Palmilhas Customizadas, etc.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-blue-600 text-xs font-bold flex-shrink-0">
                2
              </div>
              <div>
                <h4 className="font-medium text-sm">Selecione Data e Hora</h4>
                <p className="text-xs text-muted-foreground">
                  Veja horários disponíveis em tempo real
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-blue-600 text-xs font-bold flex-shrink-0">
                3
              </div>
              <div>
                <h4 className="font-medium text-sm">Confirme</h4>
                <p className="text-xs text-muted-foreground">
                  Receba confirmação por email e SMS
                </p>
              </div>
            </div>
          </div>
          <div className="p-4 rounded-lg bg-blue-50 border border-blue-200">
            <p className="text-sm text-blue-900">
              💡 <strong>Dica:</strong> Você pode reagendar ou cancelar até 24h antes sem custo!
            </p>
          </div>
        </div>
      ),
    },
    {
      title: "Complete seu Perfil de Saúde 📋",
      description: "Ajude-nos a conhecê-lo melhor para um atendimento personalizado",
      icon: FileText,
      color: "text-green-600",
      bgColor: "bg-green-100",
      content: (
        <div className="space-y-4">
          <p className="text-muted-foreground">
            Quanto mais informações você compartilhar, melhor poderemos personalizar seu tratamento.
          </p>
          <div className="space-y-3">
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Triagem Médica</span>
                  <Badge variant="outline" className="text-xs">Obrigatório</Badge>
                </div>
                <p className="text-xs text-muted-foreground mb-2">
                  Histórico médico, medicações, alergias
                </p>
                <Progress value={0} className="h-2" />
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Consentimento GDPR</span>
                  <Badge variant="outline" className="text-xs">Obrigatório</Badge>
                </div>
                <p className="text-xs text-muted-foreground mb-2">
                  Autorização para processamento de dados de saúde
                </p>
                <Progress value={0} className="h-2" />
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Objetivos de Tratamento</span>
                  <Badge variant="secondary" className="text-xs">Opcional</Badge>
                </div>
                <p className="text-xs text-muted-foreground mb-2">
                  O que você espera alcançar?
                </p>
                <Progress value={0} className="h-2" />
              </CardContent>
            </Card>
          </div>
        </div>
      ),
    },
    {
      title: "Explore suas Ferramentas 🛠️",
      description: "Descubra tudo que você pode fazer no portal",
      icon: Target,
      color: "text-orange-600",
      bgColor: "bg-orange-100",
      content: (
        <div className="space-y-4">
          <p className="text-muted-foreground">
            Seu portal tem várias ferramentas para ajudar na sua recuperação:
          </p>
          <div className="grid gap-3">
            <div className="flex items-start gap-3 p-3 rounded-lg border hover:border-primary/50 transition-colors">
              <Activity className="h-5 w-5 text-purple-600 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="font-medium text-sm">Análise Biomecânica</h4>
                <p className="text-xs text-muted-foreground">
                  Tire fotos em casa e receba análise de postura com IA
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 rounded-lg border hover:border-primary/50 transition-colors">
              <Dumbbell className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="font-medium text-sm">Programa de Exercícios</h4>
                <p className="text-xs text-muted-foreground">
                  Exercícios personalizados com vídeos e instruções
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 rounded-lg border hover:border-primary/50 transition-colors">
              <TrendingUp className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="font-medium text-sm">Acompanhamento de Progresso</h4>
                <p className="text-xs text-muted-foreground">
                  Veja sua evolução com gráficos e métricas
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 rounded-lg border hover:border-primary/50 transition-colors">
              <FileText className="h-5 w-5 text-indigo-600 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="font-medium text-sm">Documentos e Resultados</h4>
                <p className="text-xs text-muted-foreground">
                  Acesse todos os seus relatórios e exames
                </p>
              </div>
            </div>
          </div>
        </div>
      ),
    },
    {
      title: "Você está pronto! 🚀",
      description: "Comece sua jornada de saúde agora",
      icon: CheckCircle2,
      color: "text-green-600",
      bgColor: "bg-green-100",
      content: (
        <div className="space-y-4">
          <p className="text-muted-foreground">
            Parabéns! Você concluiu o tour. Agora você está pronto para aproveitar todos os recursos do portal.
          </p>
          <div className="p-4 rounded-lg bg-gradient-to-r from-primary/10 to-purple-100 border border-primary/20">
            <h4 className="font-semibold mb-2 flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Próximos Passos Recomendados:
            </h4>
            <ol className="space-y-2 text-sm">
              <li className="flex items-start gap-2">
                <span className="font-bold text-primary">1.</span>
                <span>Agende sua primeira consulta de avaliação</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold text-primary">2.</span>
                <span>Complete a triagem médica (obrigatório)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold text-primary">3.</span>
                <span>Explore a análise biomecânica (tire fotos em casa)</span>
              </li>
            </ol>
          </div>
          <div className="text-center p-4 rounded-lg bg-muted/50">
            <p className="text-sm text-muted-foreground">
              Precisa de ajuda? Entre em contato conosco a qualquer momento através do chat ou email.
            </p>
          </div>
        </div>
      ),
    },
  ];

  const currentStepData = steps[currentStep];
  const progress = ((currentStep + 1) / steps.length) * 100;
  const Icon = currentStepData.icon;

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete();
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  return (
    <Card className="border-2 border-primary/20 shadow-lg">
      <CardHeader className="relative">
        <Button
          variant="ghost"
          size="sm"
          className="absolute top-4 right-4 h-8 w-8 p-0"
          onClick={onDismiss}
        >
          <X className="h-4 w-4" />
        </Button>
        
        <div className="flex items-center gap-3 mb-4">
          <div className={`p-3 rounded-lg ${currentStepData.bgColor}`}>
            <Icon className={`h-6 w-6 ${currentStepData.color}`} />
          </div>
          <div className="flex-1">
            <CardTitle className="text-xl">{currentStepData.title}</CardTitle>
            <CardDescription>{currentStepData.description}</CardDescription>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Passo {currentStep + 1} de {steps.length}</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {currentStepData.content}

        <div className="flex gap-3 pt-4">
          {currentStep > 0 && (
            <Button
              variant="outline"
              onClick={handleBack}
            >
              Voltar
            </Button>
          )}
          <Button
            onClick={handleNext}
            className="flex-1 gap-2"
          >
            {currentStep === steps.length - 1 ? (
              <>
                Começar a Usar
                <CheckCircle2 className="h-4 w-4" />
              </>
            ) : (
              <>
                Próximo
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </Button>
        </div>

        {currentStep < steps.length - 1 && (
          <button
            onClick={onDismiss}
            className="w-full text-center text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Pular tour
          </button>
        )}
      </CardContent>
    </Card>
  );
}
