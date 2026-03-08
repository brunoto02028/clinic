'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useLocale } from '@/hooks/use-locale';
import {
  Footprints,
  Plus,
  Camera,
  Eye,
  Clock,
  CheckCircle,
  AlertCircle,
  FileText,
  ChevronRight,
  Info,
  Brain,
  HelpCircle,
  Shield,
  Heart,
  Target,
  Dumbbell,
  TrendingUp,
  AlertTriangle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { CameraCapture } from '@/components/foot-scan/camera-capture';
import AssessmentGate from '@/components/dashboard/assessment-gate';
import ProfessionalReviewBanner from '@/components/dashboard/professional-review-banner';
import { FootScanViewer } from '@/components/foot-scan/foot-scan-viewer';
import { t as i18nT } from '@/lib/i18n';

interface FootScan {
  id: string;
  scanNumber: string;
  status: string;
  archType: string | null;
  pronation: string | null;
  leftFootLength: number | null;
  rightFootLength: number | null;
  aiRecommendation: string | null;
  createdAt: string;
  updatedAt: string;
}

const STATUS_CONFIG: Record<string, { labelEn: string; labelPt: string; color: string; icon: any }> = {
  PENDING_UPLOAD: { labelEn: 'Pending Upload', labelPt: 'Aguardando Envio', color: 'bg-yellow-500/15 text-yellow-400', icon: Clock },
  SCANNING: { labelEn: 'Scanning', labelPt: 'Escaneando', color: 'bg-blue-500/15 text-blue-400', icon: Camera },
  PROCESSING: { labelEn: 'Processing', labelPt: 'Processando', color: 'bg-purple-500/15 text-purple-400', icon: Clock },
  PENDING_REVIEW: { labelEn: 'Pending Review', labelPt: 'Aguardando Revisão', color: 'bg-orange-500/15 text-orange-400', icon: AlertCircle },
  APPROVED: { labelEn: 'Approved', labelPt: 'Aprovado', color: 'bg-green-500/15 text-green-400', icon: CheckCircle },
  IN_PRODUCTION: { labelEn: 'In Production', labelPt: 'Em Produção', color: 'bg-cyan-500/15 text-cyan-400', icon: FileText },
  SHIPPED: { labelEn: 'Shipped', labelPt: 'Enviado', color: 'bg-indigo-500/15 text-indigo-400', icon: FileText },
  DELIVERED: { labelEn: 'Delivered', labelPt: 'Entregue', color: 'bg-green-500/15 text-green-400', icon: CheckCircle },
};

export default function PatientScansPage() {
  return (
    <AssessmentGate requiredService="FOOT_SCAN">
      <PatientScansContent />
    </AssessmentGate>
  );
}

function PatientScansContent() {
  const { data: session } = useSession() || {};
  const router = useRouter();
  const { toast } = useToast();
  const { locale } = useLocale();
  const isPt = locale === 'pt-BR';

  const [scans, setScans] = useState<FootScan[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCaptureDialog, setShowCaptureDialog] = useState(false);
  const [showViewDialog, setShowViewDialog] = useState(false);
  const [selectedScan, setSelectedScan] = useState<FootScan | null>(null);
  const [activeScanId, setActiveScanId] = useState<string | null>(null);
  const [isSimulationMode, setIsSimulationMode] = useState(false);

  // Fetch scans
  useEffect(() => {
    fetchScans();
  }, []);

  const fetchScans = async () => {
    try {
      const res = await fetch('/api/foot-scans');
      if (res.ok) {
        const data = await res.json();
        setScans(data);
      }
    } catch (error) {
      console.error('Error fetching scans:', error);
    } finally {
      setLoading(false);
    }
  };

  // Start new scan
  const handleStartNewScan = async (simulation = false) => {
    setIsSimulationMode(simulation);

    if (simulation) {
      setActiveScanId('SIMULATION');
      setShowCaptureDialog(true);
      return;
    }

    try {
      const res = await fetch('/api/foot-scans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });

      if (res.ok) {
        const newScan = await res.json();
        setActiveScanId(newScan.id);
        setShowCaptureDialog(true);
        fetchScans();
      } else {
        const error = await res.json();
        toast({
          title: isPt ? 'Erro' : 'Error',
          description: error.error || (isPt ? 'Falha ao criar escaneamento' : 'Failed to create scan'),
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('Error creating scan:', error);
    }
  };

  // Handle capture completion
  const handleCaptureComplete = async (data: any) => {
    if (!activeScanId) return;

    if (isSimulationMode) {
      setShowCaptureDialog(false);
      setIsSimulationMode(false);
      setActiveScanId(null);
      return;
    }

    try {
      // Upload images to S3 and update scan
      const leftFootUrls: string[] = [];
      const rightFootUrls: string[] = [];

      // Upload each image
      for (const img of data.leftFootImages) {
        const uploadRes = await uploadImage(activeScanId, img, 'leftFoot');
        if (uploadRes) leftFootUrls.push(uploadRes);
      }

      for (const img of data.rightFootImages) {
        const uploadRes = await uploadImage(activeScanId, img, 'rightFoot');
        if (uploadRes) rightFootUrls.push(uploadRes);
      }

      // Update scan with image URLs
      await fetch(`/api/foot-scans/${activeScanId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leftFootImages: leftFootUrls,
          rightFootImages: rightFootUrls,
          captureMetadata: data.captureMetadata,
          status: 'SCANNING'
        })
      });

      toast({
        title: isPt ? 'Escaneamento Concluído!' : 'Scan Complete!',
        description: isPt ? 'Suas imagens foram enviadas. O especialista entrará em contato em breve.' : 'Your images have been uploaded. The specialist will contact you soon.',
      });

      setShowCaptureDialog(false);
      setActiveScanId(null);
      fetchScans();

    } catch (error) {
      console.error('Error completing capture:', error);
      toast({
        title: isPt ? 'Erro' : 'Error',
        description: isPt ? 'Falha ao completar o escaneamento. Tente novamente.' : 'Failed to complete scan. Please try again.',
        variant: 'destructive'
      });
    }
  };

  // View scan details
  const handleViewScan = (scan: FootScan) => {
    setSelectedScan(scan);
    setShowViewDialog(true);
  };

  // Upload image to S3
  const uploadImage = async (scanId: string, image: any, uploadType: string): Promise<string | null> => {
    try {
      // Get presigned URL
      const fileName = `${uploadType}-${image.angle}-${Date.now()}.jpg`;
      const presignRes = await fetch(`/api/foot-scans/${scanId}/upload`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName,
          fileType: 'image/jpeg',
          uploadType
        })
      });

      if (!presignRes.ok) return null;

      const { uploadUrl, cloud_storage_path } = await presignRes.json();

      // Convert data URL to blob
      const response = await fetch(image.dataUrl);
      const blob = await response.blob();

      // Upload to S3
      const uploadRes = await fetch(uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': 'image/jpeg' },
        body: blob
      });

      if (uploadRes.ok) {
        return cloud_storage_path;
      }

      return null;
    } catch (error) {
      console.error('Upload error:', error);
      return null;
    }
  };

  // Parse AI recommendation
  const parseRecommendation = (rec: string | null) => {
    if (!rec) return null;
    try {
      return JSON.parse(rec);
    } catch {
      return null;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-bruno-turquoise"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">{isPt ? 'Meus Escaneamentos' : 'My Foot Scans'}</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {isPt ? 'Capture e acompanhe a análise dos seus pés' : 'Capture and track the analysis of your feet'}
          </p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <Button variant="outline" size="sm" onClick={() => handleStartNewScan(true)} className="flex-1 sm:flex-none">
            {isPt ? 'Simulação' : 'Simulation'}
          </Button>
          <Button size="sm" onClick={() => handleStartNewScan(false)} className="flex-1 sm:flex-none bg-bruno-turquoise hover:bg-bruno-turquoise-dark">
            <Plus className="h-4 w-4 mr-1" />
            {isPt ? 'Novo Escaneamento' : 'New Scan'}
          </Button>
        </div>
      </div>

      <ProfessionalReviewBanner />

      {/* Calibration Phase Banner */}
      <div className="flex items-start gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 p-4">
        <div className="w-9 h-9 rounded-full bg-amber-500/15 flex items-center justify-center flex-shrink-0">
          <AlertTriangle className="h-[18px] w-[18px] text-amber-400" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-amber-300">
            {i18nT('footScan.calibrationTitle', locale)}
          </p>
          <p className="text-xs text-amber-400/80 mt-0.5 leading-relaxed">
            {i18nT('footScan.calibrationDesc', locale)}
          </p>
        </div>
      </div>

      {/* What Is a Foot Scan? */}
      <Card className="border-blue-500/20 bg-gradient-to-br from-blue-500/5 to-cyan-500/5">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <HelpCircle className="h-4 w-4 text-blue-400" />
            {i18nT('footScan.whatIsTitle', locale)}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground leading-relaxed">{i18nT('footScan.whatIsDesc', locale)}</p>
        </CardContent>
      </Card>

      {/* Benefits Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { icon: Heart, title: i18nT('footScan.benefit1Title', locale), desc: i18nT('footScan.benefit1Desc', locale), color: 'text-rose-400', bg: 'bg-rose-500/10' },
          { icon: Footprints, title: i18nT('footScan.benefit2Title', locale), desc: i18nT('footScan.benefit2Desc', locale), color: 'text-blue-400', bg: 'bg-blue-500/10' },
          { icon: Shield, title: i18nT('footScan.benefit3Title', locale), desc: i18nT('footScan.benefit3Desc', locale), color: 'text-amber-400', bg: 'bg-amber-500/10' },
          { icon: TrendingUp, title: i18nT('footScan.benefit4Title', locale), desc: i18nT('footScan.benefit4Desc', locale), color: 'text-green-400', bg: 'bg-green-500/10' },
        ].map((b, i) => {
          const BIcon = b.icon;
          return (
            <Card key={i} className="border-muted/40">
              <CardContent className="p-3 sm:p-4 text-center">
                <div className={`w-9 h-9 rounded-lg ${b.bg} flex items-center justify-center mx-auto mb-2`}>
                  <BIcon className={`h-4 w-4 ${b.color}`} />
                </div>
                <p className="text-xs sm:text-sm font-semibold">{b.title}</p>
                <p className="text-[10px] sm:text-xs text-muted-foreground mt-1 leading-relaxed">{b.desc}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* How It Works Info Panel */}
      <Card className="border-primary/20 bg-primary/5">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Info className="h-4 w-4 text-primary" />
            {i18nT('footScan.infoTitle', locale)}
          </CardTitle>
        </CardHeader>
        <CardContent className="grid sm:grid-cols-3 gap-4 pt-0">
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
              <Camera className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-sm font-semibold">{i18nT('footScan.infoStep1Title', locale)}</p>
              <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{i18nT('footScan.infoStep1Desc', locale)}</p>
            </div>
          </div>
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-purple-500/15 flex items-center justify-center flex-shrink-0 mt-0.5">
              <Brain className="h-4 w-4 text-purple-400" />
            </div>
            <div>
              <p className="text-sm font-semibold">{i18nT('footScan.infoStep2Title', locale)}</p>
              <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{i18nT('footScan.infoStep2Desc', locale)}</p>
            </div>
          </div>
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-green-500/15 flex items-center justify-center flex-shrink-0 mt-0.5">
              <CheckCircle className="h-4 w-4 text-green-400" />
            </div>
            <div>
              <p className="text-sm font-semibold">{i18nT('footScan.infoStep3Title', locale)}</p>
              <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{i18nT('footScan.infoStep3Desc', locale)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Arch Types Explanation */}
      <Card className="border-muted/40">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Footprints className="h-4 w-4 text-blue-400" />
            {i18nT('footScan.archExplainTitle', locale)}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 pt-0">
          <div className="flex items-center gap-2 p-2 rounded-lg bg-green-500/10">
            <div className="w-3 h-3 rounded-full bg-green-500 flex-shrink-0" />
            <p className="text-xs text-green-400">{i18nT('footScan.archNormal', locale)}</p>
          </div>
          <div className="flex items-center gap-2 p-2 rounded-lg bg-amber-500/10">
            <div className="w-3 h-3 rounded-full bg-amber-500 flex-shrink-0" />
            <p className="text-xs text-amber-400">{i18nT('footScan.archHigh', locale)}</p>
          </div>
          <div className="flex items-center gap-2 p-2 rounded-lg bg-blue-500/10">
            <div className="w-3 h-3 rounded-full bg-blue-500 flex-shrink-0" />
            <p className="text-xs text-blue-400">{i18nT('footScan.archFlat', locale)}</p>
          </div>
        </CardContent>
      </Card>

      {scans.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-10 sm:py-12 px-4">
            <Footprints className="h-12 w-12 sm:h-16 sm:w-16 text-muted-foreground mb-4" />
            <h3 className="text-base sm:text-lg font-semibold mb-2 text-center">{isPt ? 'Nenhum Registro Ainda' : 'No Records Yet'}</h3>
            <p className="text-muted-foreground text-center text-sm mb-4 max-w-md">
              {isPt ? 'Inicie seu primeiro escaneamento para receber uma análise biomecânica personalizada e recomendação de palmilhas sob medida.' : 'Start your first scan to receive a personalised biomechanical analysis and custom insole recommendation.'}
            </p>
            <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
              <Button variant="outline" onClick={() => handleStartNewScan(true)} className="w-full sm:w-auto">
                {isPt ? 'Testar Câmera' : 'Test Camera'}
              </Button>
              <Button onClick={() => handleStartNewScan(false)} className="w-full sm:w-auto bg-bruno-turquoise hover:bg-bruno-turquoise-dark">
                <Camera className="h-4 w-4 mr-2" />
                {isPt ? 'Começar Agora' : 'Start Now'}
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {scans.map((scan, index) => {
            const statusConfig = STATUS_CONFIG[scan.status] || STATUS_CONFIG.PENDING_UPLOAD;
            const StatusIcon = statusConfig.icon;

            return (
              <div>
                <Card className="hover:shadow-md transition-shadow">
                  <CardContent className="p-3 sm:p-5">
                    <div className="flex flex-col sm:flex-row sm:items-start gap-3">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <div className="p-2 sm:p-3 bg-bruno-turquoise/10 rounded-lg flex-shrink-0">
                          <Footprints className="h-5 w-5 sm:h-6 sm:w-6 text-bruno-turquoise" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-semibold text-sm sm:text-base">{scan.scanNumber}</h3>
                            <Badge className={statusConfig.color + " text-[10px]"}>
                              <StatusIcon className="h-3 w-3 mr-1" />
                              {isPt ? statusConfig.labelPt : statusConfig.labelEn}
                            </Badge>
                          </div>
                          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                            {new Date(scan.createdAt).toLocaleDateString('pt-BR')}
                          </p>
                          <div className="bg-blue-500/10 text-blue-400 text-[10px] sm:text-xs px-2 py-0.5 rounded-full inline-block mt-2 font-medium">
                            {scan.status === 'PENDING_REVIEW' || scan.status === 'PROCESSING'
                              ? (isPt ? 'Imagens sendo analisadas pelo especialista' : 'Images being analysed by the specialist')
                              : (isPt ? statusConfig.labelPt : statusConfig.labelEn)}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 ml-10 sm:ml-0 sm:flex-shrink-0">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewScan(scan)}
                          className="h-8 text-xs"
                        >
                          <Eye className="h-3.5 w-3.5 mr-1" />
                          {isPt ? 'Ver' : 'View'}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            );
          })}
        </div>
      )}

      {/* Camera Capture Dialog */}
      <Dialog open={showCaptureDialog} onOpenChange={setShowCaptureDialog}>
        <DialogContent className="max-w-4xl h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{isSimulationMode ? (isPt ? 'Teste de Câmera (Simulação)' : 'Camera Test (Simulation)') : (isPt ? 'Escaneamento Diagnóstico' : 'Diagnostic Scan')}</DialogTitle>
            <DialogDescription>
              {isSimulationMode
                ? (isPt ? 'Siga os passos abaixo para testar sua câmera. Nenhum dado será salvo.' : 'Follow the steps below to test your camera. No data will be saved.')
                : (isPt ? 'Siga rigorosamente as instruções para a melhor análise biomecânica.' : 'Follow the instructions carefully for the best biomechanical analysis.')}
            </DialogDescription>
          </DialogHeader>
          <CameraCapture
            patientId={(session?.user as any)?.id || ''}
            onCapture={() => { }}
            onComplete={handleCaptureComplete}
            isSimulation={isSimulationMode}
          />
        </DialogContent>
      </Dialog>

      {/* View Scan Dialog */}
      <Dialog open={showViewDialog} onOpenChange={setShowViewDialog}>
        <DialogContent className="max-w-4xl h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{isPt ? 'Detalhes do Escaneamento' : 'Scan Details'} - {selectedScan?.scanNumber}</DialogTitle>
          </DialogHeader>
          {selectedScan && (
            <div className="space-y-6">
              {/* Status and basic info */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="p-4 text-center">
                    <p className="text-sm text-muted-foreground">{isPt ? 'Tipo de Arco' : 'Arch Type'}</p>
                    <p className="text-lg font-semibold">{selectedScan.archType || 'N/A'}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <p className="text-sm text-muted-foreground">{isPt ? 'Pronação' : 'Pronation'}</p>
                    <p className="text-lg font-semibold">{selectedScan.pronation || 'N/A'}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <p className="text-sm text-muted-foreground">{isPt ? 'Pé Esquerdo' : 'Left Foot'}</p>
                    <p className="text-lg font-semibold">
                      {selectedScan.leftFootLength ? `${selectedScan.leftFootLength}mm` : 'N/A'}
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <p className="text-sm text-muted-foreground">{isPt ? 'Pé Direito' : 'Right Foot'}</p>
                    <p className="text-lg font-semibold">
                      {selectedScan.rightFootLength ? `${selectedScan.rightFootLength}mm` : 'N/A'}
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* AI Recommendations */}
              {selectedScan.aiRecommendation && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">{isPt ? 'Resultados da Análise' : 'Analysis Results'}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {(() => {
                      const rec = parseRecommendation(selectedScan.aiRecommendation);
                      if (!rec) return <p className="text-muted-foreground">{isPt ? 'Análise não disponível' : 'No analysis available'}</p>;

                      return (
                        <div className="space-y-4">
                          <p>{rec.patientSummary}</p>

                          {rec.recommendations && (
                            <div className="bg-muted p-4 rounded-lg">
                              <h4 className="font-semibold mb-2">{isPt ? 'Recomendações' : 'Recommendations'}</h4>
                              <ul className="space-y-1 text-sm">
                                {rec.recommendations.insoleType && (
                                  <li><strong>{isPt ? 'Tipo de Palmilha' : 'Insole Type'}:</strong> {rec.recommendations.insoleType}</li>
                                )}
                                {rec.recommendations.supportLevel && (
                                  <li><strong>{isPt ? 'Nível de Suporte' : 'Support Level'}:</strong> {rec.recommendations.supportLevel}</li>
                                )}
                                {rec.recommendations.footwearAdvice && (
                                  <li><strong>{isPt ? 'Calçado' : 'Footwear'}:</strong> {rec.recommendations.footwearAdvice}</li>
                                )}
                              </ul>
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
