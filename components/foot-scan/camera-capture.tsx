'use client';

/**
 * Camera Capture Component for Foot Scanning
 * 
 * Allows patients to capture images of their feet using their device camera.
 * Guides them through the process with visual instructions.
 */

import { useRef, useState, useCallback, useEffect } from 'react';
import { Camera, RotateCcw, CheckCircle2, XCircle, Footprints, ArrowRight, AlertTriangle, Zap } from 'lucide-react';
import { QRCameraFallback } from '@/components/ui/qr-camera-fallback';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';

interface CameraCaptureProps {
  onCapture: (images: CapturedImage[]) => void;
  onComplete: (data: ScanData) => void;
  patientId: string;
  isSimulation?: boolean;
}

interface CapturedImage {
  id: string;
  dataUrl: string; // Stores the Object URL
  blob: Blob;     // Stores the actual image data
  foot: 'left' | 'right';
  angle: string;
  timestamp: number;
}

interface ScanData {
  leftFootImages: CapturedImage[];
  rightFootImages: CapturedImage[];
  captureMetadata: {
    deviceInfo: string;
    captureDate: string;
    totalImages: number;
    isSimulation?: boolean;
  };
}

type CaptureStep = 'instructions' | 'left-top' | 'left-side' | 'left-bottom' | 'right-top' | 'right-side' | 'right-bottom' | 'review' | 'complete';

const CAPTURE_STEPS: { step: CaptureStep; foot: 'left' | 'right'; angle: string; instruction: string; tip: string }[] = [
  { step: 'left-top', foot: 'left', angle: 'top', instruction: '📸 PÉ ESQUERDO — Vista de Cima', tip: 'Coloque uma folha A4 no chão. Pise em cima e fotografe de cima com o pé bem assente.' },
  { step: 'left-side', foot: 'left', angle: 'side', instruction: '📸 PÉ ESQUERDO — Lado Interno', tip: 'Sente-se e coloque a câmera ao nível do chão, do lado do arco do pé. Deixe o pé no chão.' },
  { step: 'left-bottom', foot: 'left', angle: 'bottom', instruction: '📸 PÉ ESQUERDO — Planta do Pé', tip: 'Levante o pé esquerdo e fotografe a sola. Tente manter a planta bem visível.' },
  { step: 'right-top', foot: 'right', angle: 'top', instruction: '📸 PÉ DIREITO — Vista de Cima', tip: 'Mantenha a folha A4 no chão. Mude para o pé direito e fotografe de cima.' },
  { step: 'right-side', foot: 'right', angle: 'side', instruction: '📸 PÉ DIREITO — Lado Interno', tip: 'Câmera ao nível do chão, do lado do arco do pé direito.' },
  { step: 'right-bottom', foot: 'right', angle: 'bottom', instruction: '📸 PÉ DIREITO — Planta do Pé', tip: 'Levante o pé direito e fotografe a sola.' },
];

export function CameraCapture({ onCapture, onComplete, patientId, isSimulation = false }: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [currentStep, setCurrentStep] = useState<CaptureStep>('instructions');
  const [capturedImages, setCapturedImages] = useState<CapturedImage[]>([]);
  const [torchActive, setTorchActive] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');

  // Calculate progress
  const currentStepIndex = CAPTURE_STEPS.findIndex(s => s.step === currentStep);
  const progress = currentStep === 'instructions' ? 0
    : currentStep === 'review' ? 100
      : currentStep === 'complete' ? 100
        : ((currentStepIndex + 1) / CAPTURE_STEPS.length) * 100;

  // Start camera
  const startCamera = useCallback(async (isInitial = false) => {
    try {
      setError(null);

      // Stop any existing stream if we are explicitly re-initializing or changing mode
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }

      console.log('Starting camera with facingMode:', facingMode);
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: facingMode,
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      });

      setStream(mediaStream);

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.onloadedmetadata = () => {
          setCameraReady(true);
        };
      }
      
      // Reset torch state if camera re-opened
      setTorchActive(false);
    } catch (err) {
      console.error('Camera error:', err);
      if (err instanceof Error) {
        if (err.name === 'NotAllowedError') {
          setError('Camera access denied. Please allow camera access in your browser settings.');
        } else if (err.name === 'NotFoundError') {
          setError('No camera found. Please ensure your device has a camera.');
        } else {
          setError(`Camera error: ${err.message}`);
        }
      }
    }
  }, [facingMode]);

  // Stop camera
  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
      setCameraReady(false);
    }
  }, [stream]);

  // Toggle camera facing mode
  const toggleCamera = useCallback(() => {
    setFacingMode(prev => prev === 'user' ? 'environment' : 'user');
  }, []);

  // Toggle torch (flashlight)
  const toggleTorch = useCallback(async () => {
    if (!stream) return;
    const track = stream.getVideoTracks()[0];
    try {
      const capabilities = (track as any).getCapabilities?.() || {};
      if (capabilities.torch) {
        const newState = !torchActive;
        await (track as any).applyConstraints({
          advanced: [{ torch: newState }]
        });
        setTorchActive(newState);
      } else {
        setError('Flashlight (torch) is not supported on this device/camera.');
      }
    } catch (err) {
      console.error('Torch error:', err);
      setError('Could not access flashlight.');
    }
  }, [stream, torchActive]);

  // Effect to manage camera stream lifecycle
  useEffect(() => {
    const isActivePhase = currentStep !== 'instructions' && currentStep !== 'review' && currentStep !== 'complete';
    
    if (isActivePhase) {
      // Only start if we don't have a stream or facingMode changed
      // (facingMode is in dependency array, so it will trigger startCamera)
      if (!stream) {
        startCamera();
      }
    }
    
    return () => {
      // We only stop the camera when leaving the active phases entirely
      if (!isActivePhase && stream) {
        stream.getTracks().forEach(track => track.stop());
        setStream(null);
        setCameraReady(false);
      }
    };
  }, [facingMode, currentStep, startCamera, stream]);

  // Capture image
  const captureImage = useCallback(() => {
    if (!videoRef.current || !canvasRef.current || !cameraReady) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    if (!context) return;

    setIsCapturing(true);

    // Set canvas size to video size
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw video frame to canvas
    context.drawImage(video, 0, 0);

    // Convert to Blob instead of Base64 for better memory usage
    canvas.toBlob((blob) => {
      if (!blob) {
        setIsCapturing(false);
        return;
      }

      const dataUrl = URL.createObjectURL(blob);
      const stepInfo = CAPTURE_STEPS.find(s => s.step === currentStep);

      if (stepInfo) {
        const newImage: CapturedImage = {
          id: `${stepInfo.foot}-${stepInfo.angle}-${Date.now()}`,
          dataUrl,
          blob,
          foot: stepInfo.foot,
          angle: stepInfo.angle,
          timestamp: Date.now(),
        };

        setCapturedImages(prev => {
          const updated = [...prev, newImage];
          // We call onCapture later to ensure we don't have race conditions with state
          return updated;
        });

        // Move to next step
        const nextIndex = currentStepIndex + 1;
        if (nextIndex < CAPTURE_STEPS.length) {
          setCurrentStep(CAPTURE_STEPS[nextIndex].step);
        } else {
          setCurrentStep('review');
          stopCamera();
        }
      }

      setTimeout(() => setIsCapturing(false), 300);
    }, 'image/jpeg', 0.9);
  }, [cameraReady, currentStep, currentStepIndex, stopCamera]);

  // Sync captured images with parent
  useEffect(() => {
    onCapture(capturedImages);
  }, [capturedImages, onCapture]);

  // Retake image
  const retakeImage = useCallback((foot: 'left' | 'right', angle: CapturedImage['angle']) => {
    setCapturedImages(prev => {
      const imgToRevoke = prev.find(img => img.foot === foot && img.angle === angle);
      if (imgToRevoke) {
        URL.revokeObjectURL(imgToRevoke.dataUrl);
      }
      return prev.filter(img => !(img.foot === foot && img.angle === angle));
    });
    
    const stepToRetake = CAPTURE_STEPS.find(s => s.foot === foot && s.angle === angle);
    if (stepToRetake) {
      setCurrentStep(stepToRetake.step);
    }
  }, []);

  // Cleanup Object URLs on unmount
  useEffect(() => {
    return () => {
      capturedImages.forEach(img => {
        URL.revokeObjectURL(img.dataUrl);
      });
    };
  }, []);

  // Complete scan
  const completeScan = useCallback(() => {
    const leftImages = capturedImages.filter(img => img.foot === 'left');
    const rightImages = capturedImages.filter(img => img.foot === 'right');

    const scanData: ScanData = {
      leftFootImages: leftImages,
      rightFootImages: rightImages,
      captureMetadata: {
        deviceInfo: navigator.userAgent,
        captureDate: new Date().toISOString(),
        totalImages: capturedImages.length,
        isSimulation,
      },
    };

    onComplete(scanData);
    setCurrentStep('complete');
  }, [capturedImages, onComplete, isSimulation]);

  // Render instructions
  if (currentStep === 'instructions') {
    return (
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Footprints className="h-6 w-6 text-bruno-turquoise" />
            {isSimulation ? 'Teste de Câmera (Simulação)' : 'Pronto para tirar as fotos?'}
          </CardTitle>
          {isSimulation && (
            <Badge variant="secondary" className="bg-orange-100 text-orange-800 border-orange-200">
              MODO TESTE — nenhum dado será guardado
            </Badge>
          )}
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="rounded-lg border border-blue-500/30 bg-blue-500/10 p-4">
            <h4 className="font-semibold text-blue-300 mb-2">Antes de começar:</h4>
            <ul className="text-blue-400 space-y-1.5 text-sm">
              <li>• Retire as meias e adornos nos pés</li>
              <li>• Escolha um local bem iluminado</li>
              <li>• Coloque uma folha A4 no chão (para a foto de cima)</li>
              <li>• Coloque os pés numa superfície de cor contrastante</li>
              <li>• A câmera traseira do telemóvel dá melhores resultados</li>
            </ul>
          </div>

          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="p-3 rounded-lg bg-muted/40 border border-border/40">
              <div className="text-2xl mb-1">📸</div>
              <p className="text-sm font-semibold">6 Fotos</p>
              <p className="text-xs text-muted-foreground">3 por pé</p>
            </div>
            <div className="p-3 rounded-lg bg-muted/40 border border-border/40">
              <div className="text-2xl mb-1">⏱️</div>
              <p className="text-sm font-semibold">2-3 Minutos</p>
              <p className="text-xs text-muted-foreground">Tempo total</p>
            </div>
            <div className="p-3 rounded-lg bg-muted/40 border border-border/40">
              <div className="text-2xl mb-1">🦶</div>
              <p className="text-sm font-semibold">Ambos os Pés</p>
              <p className="text-xs text-muted-foreground">Diagnóstico completo</p>
            </div>
          </div>

          <Button
            className="w-full bg-bruno-turquoise hover:bg-bruno-turquoise/90"
            size="lg"
            onClick={() => {
              setCurrentStep('left-top');
              startCamera();
            }}
          >
            <Camera className="mr-2 h-5 w-5" />
            {isSimulation ? 'Iniciar Teste' : 'Começar a Tirar Fotos'} <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Render review
  if (currentStep === 'review') {
    const angleLabels: Record<string, string> = { top: 'Cima', side: 'Interno', bottom: 'Planta' };
    return (
      <Card className="max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-6 w-6 text-green-500" />
              Rever as Fotos Tiradas
            </div>
            {isSimulation && <Badge className="bg-orange-100 text-orange-800 uppercase">Simulação</Badge>}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            {/* Pé Esquerdo */}
            <div>
              <h4 className="font-semibold mb-3">🦶 Pé Esquerdo</h4>
              <div className="grid grid-cols-3 gap-2">
                {['top', 'side', 'bottom'].map(angle => {
                  const img = capturedImages.find(i => i.foot === 'left' && i.angle === angle);
                  return (
                    <div key={`left-${angle}`} className="relative aspect-square rounded-lg overflow-hidden bg-muted/50 border border-border">
                      {img ? (
                        <>
                          <img src={img.dataUrl} alt={`Esquerdo ${angle}`} className="w-full h-full object-cover" />
                          <button
                            onClick={() => retakeImage('left', angle)}
                            className="absolute bottom-1 right-1 p-1 bg-white/80 rounded-full hover:bg-white shadow-sm"
                            title="Repetir foto"
                          >
                            <RotateCcw className="h-3 w-3" />
                          </button>
                        </>
                      ) : (
                        <div className="flex items-center justify-center h-full text-muted-foreground">
                          <XCircle className="h-6 w-6" />
                        </div>
                      )}
                      <span className="absolute top-0 left-0 text-[10px] bg-black/60 text-white px-1 py-0.5 rounded-br">
                        {angleLabels[angle] || angle}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Pé Direito */}
            <div>
              <h4 className="font-semibold mb-3">🦶 Pé Direito</h4>
              <div className="grid grid-cols-3 gap-2">
                {['top', 'side', 'bottom'].map(angle => {
                  const img = capturedImages.find(i => i.foot === 'right' && i.angle === angle);
                  return (
                    <div key={`right-${angle}`} className="relative aspect-square rounded-lg overflow-hidden bg-muted/50 border border-border">
                      {img ? (
                        <>
                          <img src={img.dataUrl} alt={`Direito ${angle}`} className="w-full h-full object-cover" />
                          <button
                            onClick={() => retakeImage('right', angle)}
                            className="absolute bottom-1 right-1 p-1 bg-white/80 rounded-full hover:bg-white shadow-sm"
                            title="Repetir foto"
                          >
                            <RotateCcw className="h-3 w-3" />
                          </button>
                        </>
                      ) : (
                        <div className="flex items-center justify-center h-full text-muted-foreground">
                          <XCircle className="h-6 w-6" />
                        </div>
                      )}
                      <span className="absolute top-0 left-0 text-[10px] bg-black/60 text-white px-1 py-0.5 rounded-br">
                        {angleLabels[angle] || angle}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <p className="text-sm text-muted-foreground text-center">
            {capturedImages.length} de 6 fotos tiradas. Pode repetir qualquer foto clicando no ícone de repetição.
          </p>

          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => {
                setCapturedImages([]);
                setCurrentStep('left-top');
              }}
            >
              <RotateCcw className="mr-2 h-4 w-4" />
              Recomeçar
            </Button>
            <Button
              className="flex-1 bg-bruno-turquoise hover:bg-bruno-turquoise/90"
              onClick={completeScan}
              disabled={capturedImages.length < 6 && !isSimulation}
            >
              <CheckCircle2 className="mr-2 h-4 w-4" />
              {isSimulation ? 'Finalizar Teste' : `Enviar ${capturedImages.length}/6 Fotos`}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Render complete
  if (currentStep === 'complete') {
    return (
      <Card className="max-w-2xl mx-auto text-center">
        <CardContent className="py-12">
          <div className="w-20 h-20 bg-green-500/15 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="h-10 w-10 text-green-500" />
          </div>
          <h3 className="text-2xl font-bold mb-2">{isSimulation ? 'Teste Concluído!' : 'Fotos Enviadas!'}</h3>
          {isSimulation ? (
            <>
              <p className="text-muted-foreground mb-6">
                Excelente! Completou todos os passos do teste. Nenhuma imagem foi guardada.
              </p>
              <Button onClick={() => setCurrentStep('instructions')} variant="outline">
                <RotateCcw className="mr-2 h-4 w-4" /> Tentar Novamente
              </Button>
            </>
          ) : (
            <>
              <p className="text-muted-foreground mb-4">
                As suas fotos foram enviadas com sucesso. A nossa IA vai analisar as imagens e o seu terapeuta irá rever os resultados.
              </p>
              <p className="text-sm text-muted-foreground">
                Receberá uma notificação quando a análise estiver pronta. Pode fechar esta janela.
              </p>
            </>
          )}
        </CardContent>
      </Card>
    );
  }

  // Render capture view
  const stepInfo = CAPTURE_STEPS.find(s => s.step === currentStep);

  return (
    <Card className="max-w-2xl mx-auto overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">
            Foto {currentStepIndex + 1} de {CAPTURE_STEPS.length}
          </CardTitle>
          <span className="text-sm text-muted-foreground">
            {stepInfo?.foot === 'left' ? '🦶 Pé Esquerdo' : '🦶 Pé Direito'}
          </span>
        </div>
        <Progress value={progress} className="h-2" />
      </CardHeader>

      <CardContent className="space-y-0 p-0">
        {error ? (
          <QRCameraFallback
            errorMessage={error}
            featureName={{ en: "the foot scan", pt: "o envio de fotos dos pés" }}
            onRetry={() => { setError(null); startCamera(); }}
          />
        ) : (
          <>
            {/* Instruction banner above camera */}
            <div className="px-4 py-3 bg-bruno-turquoise/15 border-b border-bruno-turquoise/20">
              <p className="text-sm font-semibold text-center">{stepInfo?.instruction}</p>
              <p className="text-xs text-muted-foreground text-center mt-0.5">{stepInfo?.tip}</p>
            </div>

            {/* Camera View */}
            <div className="relative aspect-[4/3] bg-black">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className={`w-full h-full object-cover ${isCapturing ? 'brightness-150' : ''}`}
              />

              {/* Overlay Guide */}
              <div className="absolute inset-0 pointer-events-none">
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-48 h-64 border-2 border-white/50 border-dashed rounded-3xl">
                    <div className="absolute top-2 left-1/2 -translate-x-1/2 text-white/70 text-xs whitespace-nowrap">
                      Posicione o pé aqui
                    </div>
                  </div>
                </div>
                <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-bruno-turquoise to-transparent animate-scan-line" />
              </div>

              {/* Camera controls */}
              <div className="absolute top-4 right-4 flex flex-col gap-2">
                <button
                  onClick={toggleCamera}
                  className="p-2 bg-black/50 rounded-full text-white hover:bg-black/70 transition-colors"
                  title="Mudar câmera"
                >
                  <RotateCcw className="h-5 w-5" />
                </button>
                <button
                  onClick={toggleTorch}
                  className={`p-2 rounded-full text-white transition-colors ${torchActive ? 'bg-yellow-500 hover:bg-yellow-600' : 'bg-black/50 hover:bg-black/70'}`}
                  title="Lanterna"
                >
                  <Zap className={`h-5 w-5 ${torchActive ? 'fill-white' : ''}`} />
                </button>
              </div>

              {/* Not ready overlay */}
              {!cameraReady && !error && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/80">
                  <div className="text-white text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-2" />
                    <p className="text-sm">A iniciar câmera...</p>
                  </div>
                </div>
              )}
            </div>

            {/* Capture Button */}
            <div className="p-5 flex flex-col items-center gap-2">
              <button
                onClick={captureImage}
                disabled={!cameraReady || isCapturing}
                className="w-20 h-20 rounded-full bg-bruno-turquoise hover:bg-bruno-turquoise/90 disabled:bg-muted transition-colors flex items-center justify-center shadow-lg"
              >
                <Camera className="h-9 w-9 text-white" />
              </button>
              <p className="text-xs text-muted-foreground">Toque para tirar a foto</p>
            </div>
          </>
        )}
      </CardContent>

      {/* Hidden canvas for capture */}
      <canvas ref={canvasRef} className="hidden" />
    </Card>
  );
}

export default CameraCapture;
