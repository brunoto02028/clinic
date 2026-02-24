'use client';

/**
 * Camera Capture Component for Foot Scanning
 * 
 * Allows patients to capture images of their feet using their device camera.
 * Guides them through the process with visual instructions.
 */

import { useRef, useState, useCallback, useEffect } from 'react';
import { Camera, RotateCcw, CheckCircle2, XCircle, Footprints, ArrowRight, AlertTriangle } from 'lucide-react';
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
  dataUrl: string;
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

const CAPTURE_STEPS: { step: CaptureStep; foot: 'left' | 'right'; angle: string; instruction: string }[] = [
  { step: 'left-top', foot: 'left', angle: 'top', instruction: 'Position your LEFT foot flat and capture from above' },
  { step: 'left-side', foot: 'left', angle: 'side', instruction: 'Capture the INNER side of your LEFT foot' },
  { step: 'left-bottom', foot: 'left', angle: 'bottom', instruction: 'Lift your LEFT foot and capture the sole' },
  { step: 'right-top', foot: 'right', angle: 'top', instruction: 'Position your RIGHT foot flat and capture from above' },
  { step: 'right-side', foot: 'right', angle: 'side', instruction: 'Capture the INNER side of your RIGHT foot' },
  { step: 'right-bottom', foot: 'right', angle: 'bottom', instruction: 'Lift your RIGHT foot and capture the sole' },
];

export function CameraCapture({ onCapture, onComplete, patientId, isSimulation = false }: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [currentStep, setCurrentStep] = useState<CaptureStep>('instructions');
  const [capturedImages, setCapturedImages] = useState<CapturedImage[]>([]);
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
  const startCamera = useCallback(async () => {
    try {
      setError(null);

      // Stop any existing stream
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }

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
  }, [facingMode, stream]);

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

  // Effect to restart camera when facing mode changes
  useEffect(() => {
    if (currentStep !== 'instructions' && currentStep !== 'review' && currentStep !== 'complete') {
      startCamera();
    }
    return () => stopCamera();
  }, [facingMode, currentStep]);

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

    // Get image data
    const dataUrl = canvas.toDataURL('image/jpeg', 0.9);

    // Find current step info
    const stepInfo = CAPTURE_STEPS.find(s => s.step === currentStep);

    if (stepInfo) {
      const newImage: CapturedImage = {
        id: `${stepInfo.foot}-${stepInfo.angle}-${Date.now()}`,
        dataUrl,
        foot: stepInfo.foot,
        angle: stepInfo.angle,
        timestamp: Date.now(),
      };

      const updatedImages = [...capturedImages, newImage];
      setCapturedImages(updatedImages);
      onCapture(updatedImages);

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
  }, [cameraReady, currentStep, currentStepIndex, capturedImages, onCapture, stopCamera]);

  // Retake image
  const retakeImage = useCallback((foot: 'left' | 'right', angle: CapturedImage['angle']) => {
    setCapturedImages(prev => prev.filter(img => !(img.foot === foot && img.angle === angle)));
    const stepToRetake = CAPTURE_STEPS.find(s => s.foot === foot && s.angle === angle);
    if (stepToRetake) {
      setCurrentStep(stepToRetake.step);
    }
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
            {isSimulation ? 'Trial Scan / Simulação' : 'Foot Scan Instructions'}
          </CardTitle>
          {isSimulation && (
            <Badge variant="secondary" className="bg-orange-100 text-orange-800 border-orange-200">
              MODO SIMULAÇÃO - Nenhum dado será salvo
            </Badge>
          )}
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-semibold text-blue-800 mb-2">Before you start:</h4>
            <ul className="text-blue-700 space-y-2 text-sm">
              <li>• Find a well-lit area</li>
              <li>• Remove socks and any foot jewellery</li>
              <li>• Place your feet on a plain, contrasting surface</li>
              <li>• For REAR view, keep the camera level with your heel</li>
              <li>• For ELEVATED view, lift your foot or lie down</li>
            </ul>
          </div>

          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="text-3xl mb-2">📸</div>
              <p className="text-sm font-medium">10 Photos</p>
              <p className="text-xs text-muted-foreground">5 per foot</p>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="text-3xl mb-2">⏱️</div>
              <p className="text-sm font-medium">3-4 Minutes</p>
              <p className="text-xs text-muted-foreground">Total time</p>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="text-3xl mb-2">🦶</div>
              <p className="text-sm font-medium">Both Feet</p>
              <p className="text-xs text-muted-foreground">Pro Diagnostic</p>
            </div>
          </div>

          <Button
            className="w-full"
            size="lg"
            onClick={() => {
              setCurrentStep('left-top');
              startCamera();
            }}
          >
            {isSimulation ? 'Iniciar Simulação' : 'Start Scanning'} <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Render review
  if (currentStep === 'review') {
    return (
      <Card className="max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-6 w-6 text-green-500" />
              Review Your Captures
            </div>
            {isSimulation && <Badge className="bg-orange-100 text-orange-800 uppercase">Simulação</Badge>}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            {/* Left Foot */}
            <div>
              <h4 className="font-semibold mb-3">Left Foot</h4>
              <div className="grid grid-cols-5 gap-2">
                {['top', 'side', 'sole', 'rear', 'elevated'].map(angle => {
                  const img = capturedImages.find(i => i.foot === 'left' && i.angle === angle);
                  return (
                    <div key={`left-${angle}`} className="relative aspect-square rounded-lg overflow-hidden bg-gray-100 border border-gray-200">
                      {img ? (
                        <>
                          <img src={img.dataUrl} alt={`Left ${angle}`} className="w-full h-full object-cover" />
                          <button
                            onClick={() => retakeImage('left', angle)}
                            className="absolute bottom-1 right-1 p-1 bg-white/80 rounded-full hover:bg-white shadow-sm"
                          >
                            <RotateCcw className="h-3 w-3" />
                          </button>
                        </>
                      ) : (
                        <div className="flex items-center justify-center h-full text-gray-400">
                          <XCircle className="h-6 w-6" />
                        </div>
                      )}
                      <span className="absolute top-0 left-0 text-[10px] bg-black/50 text-white px-1 py-0.5 rounded-br">
                        {angle}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right Foot */}
            <div>
              <h4 className="font-semibold mb-3">Right Foot</h4>
              <div className="grid grid-cols-5 gap-2">
                {['top', 'side', 'sole', 'rear', 'elevated'].map(angle => {
                  const img = capturedImages.find(i => i.foot === 'right' && i.angle === angle);
                  return (
                    <div key={`right-${angle}`} className="relative aspect-square rounded-lg overflow-hidden bg-gray-100 border border-gray-200">
                      {img ? (
                        <>
                          <img src={img.dataUrl} alt={`Right ${angle}`} className="w-full h-full object-cover" />
                          <button
                            onClick={() => retakeImage('right', angle)}
                            className="absolute bottom-1 right-1 p-1 bg-white/80 rounded-full hover:bg-white shadow-sm"
                          >
                            <RotateCcw className="h-3 w-3" />
                          </button>
                        </>
                      ) : (
                        <div className="flex items-center justify-center h-full text-gray-400">
                          <XCircle className="h-6 w-6" />
                        </div>
                      )}
                      <span className="absolute top-0 left-0 text-[10px] bg-black/50 text-white px-1 py-0.5 rounded-br">
                        {angle}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="flex gap-4">
            <Button
              variant="outline"
              onClick={() => {
                setCapturedImages([]);
                setCurrentStep('left-top');
              }}
            >
              <RotateCcw className="mr-2 h-4 w-4" />
              Start Over
            </Button>
            <Button
              className="flex-1 bg-bruno-turquoise hover:bg-bruno-turquoise-dark"
              onClick={completeScan}
              disabled={capturedImages.length < 10 && !isSimulation}
            >
              <CheckCircle2 className="mr-2 h-4 w-4" />
              {isSimulation ? 'Finalizar Teste' : `Submit Scan (${capturedImages.length}/10 images)`}
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
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="h-10 w-10 text-green-500" />
          </div>
          <h3 className="text-2xl font-bold mb-2">{isSimulation ? 'Simulação Concluída' : 'Scan Complete!'}</h3>
          {isSimulation ? (
            <>
              <p className="text-muted-foreground mb-6">
                Excelente! Você completou os passos do escaneamento diagnóstico.
                Nenhuma imagem foi arquivada neste modo de teste.
              </p>
              <Button onClick={() => setCurrentStep('instructions')} variant="outline">
                <RotateCcw className="mr-2 h-4 w-4" /> Tentar Novamente
              </Button>
            </>
          ) : (
            <>
              <p className="text-muted-foreground mb-6">
                Your foot scan has been submitted successfully. Our AI will analyse your scans and your clinician will review the results.
              </p>
              <p className="text-sm text-muted-foreground">
                You will receive a notification when your analysis is ready.
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
          <CardTitle className="text-lg">
            {stepInfo?.foot === 'left' ? 'Left' : 'Right'} Foot - {stepInfo?.angle}
          </CardTitle>
          <span className="text-sm text-muted-foreground">
            {currentStepIndex + 1} of {CAPTURE_STEPS.length}
          </span>
        </div>
        <Progress value={progress} className="h-2" />
      </CardHeader>

      <CardContent className="space-y-4 p-0">
        {error ? (
          <div className="p-6 bg-red-50 text-center">
            <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <p className="text-red-700 mb-4">{error}</p>
            <Button onClick={startCamera}>Try Again</Button>
          </div>
        ) : (
          <>
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
                {/* Foot outline guide */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-48 h-64 border-2 border-white/50 border-dashed rounded-3xl">
                    <div className="absolute top-2 left-1/2 -translate-x-1/2 text-white/70 text-xs">
                      Position foot here
                    </div>
                  </div>
                </div>

                {/* Scan animation */}
                <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-bruno-turquoise to-transparent animate-scan-line" />
              </div>

              {/* Camera switch button */}
              <button
                onClick={toggleCamera}
                className="absolute top-4 right-4 p-2 bg-black/50 rounded-full text-white hover:bg-black/70 transition-colors"
              >
                <RotateCcw className="h-5 w-5" />
              </button>

              {/* Not ready overlay */}
              {!cameraReady && !error && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/80">
                  <div className="text-white text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-2" />
                    <p>Starting camera...</p>
                  </div>
                </div>
              )}
            </div>

            {/* Instruction */}
            <div className="px-6 py-4 bg-blue-50 border-t border-b border-blue-100">
              <p className="text-blue-800 text-center font-medium">
                {stepInfo?.instruction}
              </p>
            </div>

            {/* Capture Button */}
            <div className="p-6 flex justify-center">
              <button
                onClick={captureImage}
                disabled={!cameraReady || isCapturing}
                className="w-20 h-20 rounded-full bg-bruno-turquoise hover:bg-bruno-turquoise-dark disabled:bg-gray-300 transition-colors flex items-center justify-center shadow-lg"
              >
                <Camera className="h-10 w-10 text-white" />
              </button>
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
