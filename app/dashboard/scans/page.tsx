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
  TrendingUp,
  Smartphone,
  Upload,
  ImageIcon,
  ArrowRight,
  Layers,
  Ruler,
  Copy,
  ExternalLink,
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

  // Upload image to Railway Volume via upload-local (session-auth)
  const uploadImage = async (scanId: string, image: any, uploadType: string): Promise<string | null> => {
    try {
      // Use image.blob directly if available (preferred), otherwise fetch from dataUrl
      let blob: Blob;
      if (image.blob instanceof Blob) {
        blob = image.blob;
      } else {
        const res = await fetch(image.dataUrl);
        blob = await res.blob();
      }
      const foot = uploadType === 'leftFoot' ? 'left' : 'right';
      const angle = image.angle || uploadType;
      const mimeType = blob.type || 'image/jpeg';
      const ext = mimeType.split('/')[1]?.split('+')[0] || 'jpg';
      const fileName = `${foot}-${angle}-${Date.now()}.${ext}`;
      const file = new File([blob], fileName, { type: mimeType });

      const formData = new FormData();
      formData.append('file', file);
      formData.append('angle', angle);
      formData.append('foot', foot);
      // No scanToken — uses session auth

      const uploadRes = await fetch(`/api/foot-scans/${scanId}/upload-local`, {
        method: 'POST',
        body: formData,
      });

      if (!uploadRes.ok) return null;

      const data = await uploadRes.json();
      return data.imageUrl || null;
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

  // Photo angles guide data
  const photoAngles = [
    { emoji: '👆', label: isPt ? 'Planta do Pé' : 'Sole (Plantar)', desc: isPt ? 'De cima, pé no papel A4' : 'From above, foot on A4 paper', foot: isPt ? 'Esq & Dir' : 'L & R' },
    { emoji: '◀', label: isPt ? 'Lado Interno' : 'Inner Side (Medial)', desc: isPt ? 'Câmera no chão, lado do arco' : 'Camera on floor, arch side', foot: isPt ? 'Esq & Dir' : 'L & R' },
    { emoji: '▶', label: isPt ? 'Lado Externo' : 'Outer Side (Lateral)', desc: isPt ? 'Câmera no chão, lado externo' : 'Camera on floor, outer side', foot: isPt ? 'Esq & Dir' : 'L & R' },
    { emoji: '⬇', label: isPt ? 'Frente (Dedos)' : 'Front (Toes)', desc: isPt ? 'Câmera ao nível dos dedos' : 'Camera at toe level', foot: isPt ? 'Esq & Dir' : 'L & R' },
    { emoji: '⬆', label: isPt ? 'Atrás (Calcanhar)' : 'Back (Heel)', desc: isPt ? 'Câmera atrás do calcanhar' : 'Camera behind heel', foot: isPt ? 'Esq & Dir' : 'L & R' },
    { emoji: '👟', label: isPt ? 'Sola do Sapato' : 'Shoe Sole', desc: isPt ? 'Mostra o padrão de desgaste' : 'Shows wear pattern', foot: isPt ? 'Esq & Dir' : 'L & R' },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-bruno-turquoise"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground flex items-center gap-2">
            <Footprints className="h-6 w-6 text-bruno-turquoise" />
            {isPt ? 'Escaneamento dos Pés' : 'Foot Scan'}
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            {isPt
              ? 'Envie fotos dos seus pés para análise biomecânica e palmilha personalizada'
              : 'Upload photos of your feet for biomechanical analysis and custom insoles'}
          </p>
        </div>
        <Button
          size="sm"
          onClick={() => handleStartNewScan(false)}
          className="w-full sm:w-auto bg-bruno-turquoise hover:bg-bruno-turquoise/90 font-semibold"
        >
          <Upload className="h-4 w-4 mr-2" />
          {isPt ? 'Enviar Fotos Agora' : 'Upload Photos Now'}
        </Button>
      </div>

      <ProfessionalReviewBanner />

      {/* ── How It Works — 3 steps ── */}
      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-cyan-500/5">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Info className="h-4 w-4 text-primary" />
            {isPt ? 'Como Funciona' : 'How It Works'}
          </CardTitle>
        </CardHeader>
        <CardContent className="grid sm:grid-cols-3 gap-4 pt-0">
          {[
            {
              icon: Camera,
              color: 'bg-blue-500/15', iconColor: 'text-blue-400',
              num: '1',
              title: isPt ? 'Tire as Fotos' : 'Take the Photos',
              desc: isPt
                ? '12 fotos guiadas: 5 ângulos de cada pé + as solas dos seus sapatos. Use a câmera do browser ou o link que o seu terapeuta enviar para o telemóvel.'
                : '12 guided photos: 5 angles per foot + both shoe soles. Use your browser camera or the mobile link your therapist sends.',
            },
            {
              icon: Brain,
              color: 'bg-purple-500/15', iconColor: 'text-purple-400',
              num: '2',
              title: isPt ? 'IA Analisa' : 'AI Analyses',
              desc: isPt
                ? 'A nossa IA identifica o tipo de arco, mede o pé, detecta pronação/supinação e analisa o padrão de desgaste dos sapatos.'
                : 'Our AI identifies arch type, measures the foot, detects pronation/supination and analyses shoe wear patterns.',
            },
            {
              icon: Layers,
              color: 'bg-green-500/15', iconColor: 'text-green-400',
              num: '3',
              title: isPt ? 'Palmilha Personalizada' : 'Custom Insole',
              desc: isPt
                ? 'O seu terapeuta revê os resultados e recomenda o tipo ideal de palmilha, nível de suporte e calçado para a sua biomecânica.'
                : 'Your therapist reviews the results and recommends the ideal insole type, support level and footwear for your biomechanics.',
            },
          ].map((s, i) => {
            const SIcon = s.icon;
            return (
              <div key={i} className="flex gap-3">
                <div className={`w-9 h-9 rounded-full ${s.color} flex items-center justify-center flex-shrink-0 mt-0.5 relative`}>
                  <SIcon className={`h-4 w-4 ${s.iconColor}`} />
                  <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-background border border-border text-[9px] font-bold flex items-center justify-center text-foreground">{s.num}</span>
                </div>
                <div>
                  <p className="text-sm font-semibold">{s.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{s.desc}</p>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* ── Photo Angles Guide ── */}
      <Card className="border-muted/40">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <ImageIcon className="h-4 w-4 text-amber-400" />
            {isPt ? 'As 12 Fotos que Precisa Tirar' : 'The 12 Photos You Need to Take'}
          </CardTitle>
          <CardDescription className="text-xs">
            {isPt
              ? 'Cada ângulo dá informação diferente ao especialista. Não precisa de equipamento especial — apenas o telemóvel e boa iluminação.'
              : 'Each angle gives different information to the specialist. No special equipment needed — just your phone and good lighting.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {photoAngles.map((a, i) => (
              <div key={i} className="flex items-start gap-2.5 p-2.5 rounded-lg bg-muted/30 border border-border/40">
                <span className="text-xl flex-shrink-0 mt-0.5">{a.emoji}</span>
                <div className="min-w-0">
                  <p className="text-xs font-semibold leading-tight">{a.label}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5 leading-relaxed">{a.desc}</p>
                  <span className="text-[10px] font-medium text-bruno-turquoise">{a.foot}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Paper reference note */}
          <div className="mt-3 flex items-start gap-2 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
            <Ruler className="h-4 w-4 text-blue-400 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-blue-400 leading-relaxed">
              {isPt
                ? 'Para a foto da planta do pé: coloque uma folha A4 no chão, pise em cima e fotografe de cima. O papel serve como referência de tamanho para medições precisas.'
                : 'For the sole photo: place an A4 sheet on the floor, stand on it and photograph from above. The paper is used as a size reference for precise measurements.'}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* ── Upload Options ── */}
      <div className="grid sm:grid-cols-2 gap-3">
        <Card className="border-bruno-turquoise/30 bg-gradient-to-br from-bruno-turquoise/5 to-cyan-500/5 cursor-pointer hover:border-bruno-turquoise/60 transition-colors" onClick={() => handleStartNewScan(false)}>
          <CardContent className="p-4 flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-bruno-turquoise/15 flex items-center justify-center flex-shrink-0">
              <Camera className="h-5 w-5 text-bruno-turquoise" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm">{isPt ? 'Câmera do Browser' : 'Browser Camera'}</p>
              <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                {isPt
                  ? 'Use a câmera do computador ou telemóvel directamente aqui. Guia passo a passo com instruções para cada ângulo.'
                  : 'Use your computer or phone camera directly here. Step-by-step guide with instructions for each angle.'}
              </p>
              <div className="mt-2 flex items-center gap-1 text-xs font-medium text-bruno-turquoise">
                {isPt ? 'Começar agora' : 'Start now'} <ArrowRight className="h-3 w-3" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-purple-500/30 bg-gradient-to-br from-purple-500/5 to-pink-500/5">
          <CardContent className="p-4 flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/15 flex items-center justify-center flex-shrink-0">
              <Smartphone className="h-5 w-5 text-purple-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm">{isPt ? 'Link para Telemóvel' : 'Mobile Phone Link'}</p>
              <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                {isPt
                  ? 'O seu terapeuta envia-lhe um link personalizado para capturar as fotos directamente pelo telemóvel com guia optimizado.'
                  : 'Your therapist sends you a personalised link to capture photos directly on your phone with an optimised guide.'}
              </p>
              <div className="mt-2 text-[10px] text-purple-400 font-medium">
                {isPt ? 'Solicite ao seu terapeuta' : 'Request from your therapist'}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Arch Types ── */}
      <Card className="border-muted/40">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Footprints className="h-4 w-4 text-blue-400" />
            {isPt ? 'Tipos de Arco do Pé' : 'Foot Arch Types'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 pt-0">
          {[
            { color: 'bg-green-500', ringColor: 'bg-green-500/10', label: isPt ? 'Arco Normal — distribuição equilibrada de peso, suporte padrão recomendado' : 'Normal Arch — balanced weight distribution, standard support recommended', textColor: 'text-green-400' },
            { color: 'bg-amber-500', ringColor: 'bg-amber-500/10', label: isPt ? 'Arco Alto (Pé Cavo) — tende a supronar; palmilhas acolchoadas absorvem impacto' : 'High Arch (Cavus) — tends to supinate; cushioned insoles absorb impact', textColor: 'text-amber-400' },
            { color: 'bg-blue-500', ringColor: 'bg-blue-500/10', label: isPt ? 'Pé Plano (Pé Chato) — tende a pronar; palmilhas com suporte estruturado recomendadas' : 'Flat Foot — tends to pronate; structured support insoles recommended', textColor: 'text-blue-400' },
          ].map((arch, i) => (
            <div key={i} className={`flex items-center gap-2 p-2 rounded-lg ${arch.ringColor}`}>
              <div className={`w-3 h-3 rounded-full ${arch.color} flex-shrink-0`} />
              <p className={`text-xs ${arch.textColor}`}>{arch.label}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* ── Scans List / Empty State ── */}
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wide">
          {isPt ? 'Meus Registos' : 'My Records'} {scans.length > 0 && `(${scans.length})`}
        </h2>

        {scans.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-10 px-4 text-center">
              <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mb-4">
                <Footprints className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-base font-semibold mb-1">{isPt ? 'Nenhum registo ainda' : 'No records yet'}</h3>
              <p className="text-muted-foreground text-sm mb-5 max-w-sm">
                {isPt
                  ? 'Envie as fotos dos seus pés para receber análise biomecânica e recomendação de palmilha personalizada.'
                  : 'Upload photos of your feet to receive a biomechanical analysis and personalised insole recommendation.'}
              </p>
              <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                <Button variant="outline" size="sm" onClick={() => handleStartNewScan(true)}>
                  <Camera className="h-4 w-4 mr-2" />
                  {isPt ? 'Testar Câmera' : 'Test Camera'}
                </Button>
                <Button size="sm" onClick={() => handleStartNewScan(false)} className="bg-bruno-turquoise hover:bg-bruno-turquoise/90">
                  <Upload className="h-4 w-4 mr-2" />
                  {isPt ? 'Enviar Fotos' : 'Upload Photos'}
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3">
            {scans.map((scan) => {
              const statusConfig = STATUS_CONFIG[scan.status] || STATUS_CONFIG.PENDING_UPLOAD;
              const StatusIcon = statusConfig.icon;
              const isAwaitingUpload = scan.status === 'PENDING_UPLOAD';
              const isAnalysed = ['APPROVED', 'IN_PRODUCTION', 'SHIPPED', 'DELIVERED'].includes(scan.status);

              return (
                <Card key={scan.id} className={`hover:shadow-md transition-shadow ${isAwaitingUpload ? 'border-amber-500/30' : isAnalysed ? 'border-green-500/20' : ''}`}>
                  <CardContent className="p-3 sm:p-5">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className={`p-2 sm:p-3 rounded-xl flex-shrink-0 ${isAnalysed ? 'bg-green-500/10' : 'bg-bruno-turquoise/10'}`}>
                          <Footprints className={`h-5 w-5 sm:h-6 sm:w-6 ${isAnalysed ? 'text-green-400' : 'text-bruno-turquoise'}`} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-semibold text-sm sm:text-base">{scan.scanNumber}</h3>
                            <Badge className={`${statusConfig.color} text-[10px] border-0`}>
                              <StatusIcon className="h-3 w-3 mr-1" />
                              {isPt ? statusConfig.labelPt : statusConfig.labelEn}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {new Date(scan.createdAt).toLocaleDateString(isPt ? 'pt-BR' : 'en-GB')}
                          </p>
                          {/* Status progress line */}
                          <div className="mt-2 flex items-center gap-1.5">
                            {(['PENDING_UPLOAD', 'SCANNING', 'PROCESSING', 'PENDING_REVIEW', 'APPROVED'] as const).map((s, idx) => {
                              const statuses = ['PENDING_UPLOAD', 'SCANNING', 'PROCESSING', 'PENDING_REVIEW', 'APPROVED', 'IN_PRODUCTION', 'SHIPPED', 'DELIVERED'];
                              const currentIdx = statuses.indexOf(scan.status);
                              const stepIdx = statuses.indexOf(s);
                              const done = currentIdx > stepIdx;
                              const active = currentIdx === stepIdx;
                              return (
                                <div key={s} className={`h-1 flex-1 rounded-full transition-all ${done ? 'bg-green-500' : active ? 'bg-bruno-turquoise' : 'bg-muted/50'}`} />
                              );
                            })}
                          </div>
                          <p className="text-[10px] text-muted-foreground mt-1">
                            {isAwaitingUpload
                              ? (isPt ? '⏳ Aguardando o envio das suas fotos' : '⏳ Awaiting your photo upload')
                              : scan.status === 'SCANNING'
                              ? (isPt ? '📸 Fotos recebidas — a processar' : '📸 Photos received — processing')
                              : scan.status === 'PROCESSING' || scan.status === 'PENDING_REVIEW'
                              ? (isPt ? '🧠 IA a analisar as suas imagens' : '🧠 AI analysing your images')
                              : isAnalysed
                              ? (isPt ? '✅ Análise concluída — veja os resultados' : '✅ Analysis complete — view results')
                              : (isPt ? statusConfig.labelPt : statusConfig.labelEn)}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 ml-[52px] sm:ml-0 flex-shrink-0">
                        {isAwaitingUpload && (
                          <Button
                            size="sm"
                            onClick={() => { setActiveScanId(scan.id); setShowCaptureDialog(true); }}
                            className="h-8 text-xs bg-amber-500 hover:bg-amber-600 text-white"
                          >
                            <Upload className="h-3.5 w-3.5 mr-1" />
                            {isPt ? 'Enviar Fotos' : 'Upload'}
                          </Button>
                        )}
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
              );
            })}
          </div>
        )}
      </div>

      {/* ── Camera Capture Dialog ── */}
      <Dialog open={showCaptureDialog} onOpenChange={setShowCaptureDialog}>
        <DialogContent className="max-w-4xl h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {isSimulationMode
                ? (isPt ? 'Teste de Câmera' : 'Camera Test')
                : (isPt ? 'Envio de Fotos dos Pés' : 'Foot Photo Upload')}
            </DialogTitle>
            <DialogDescription>
              {isSimulationMode
                ? (isPt ? 'Modo de teste — nenhum dado será guardado.' : 'Test mode — no data will be saved.')
                : (isPt ? 'Siga as instruções para cada ângulo. Boas fotos = análise mais precisa.' : 'Follow the instructions for each angle. Better photos = more accurate analysis.')}
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

      {/* ── View Scan Dialog ── */}
      <Dialog open={showViewDialog} onOpenChange={setShowViewDialog}>
        <DialogContent className="max-w-4xl h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{isPt ? 'Detalhes do Registo' : 'Record Details'} — {selectedScan?.scanNumber}</DialogTitle>
          </DialogHeader>
          {selectedScan && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="p-4 text-center">
                    <p className="text-xs text-muted-foreground">{isPt ? 'Tipo de Arco' : 'Arch Type'}</p>
                    <p className="text-lg font-semibold mt-1">{selectedScan.archType || '—'}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <p className="text-xs text-muted-foreground">{isPt ? 'Pronação' : 'Pronation'}</p>
                    <p className="text-lg font-semibold mt-1">{selectedScan.pronation || '—'}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <p className="text-xs text-muted-foreground">{isPt ? 'Pé Esq.' : 'Left Foot'}</p>
                    <p className="text-lg font-semibold mt-1">{selectedScan.leftFootLength ? `${selectedScan.leftFootLength}mm` : '—'}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <p className="text-xs text-muted-foreground">{isPt ? 'Pé Dir.' : 'Right Foot'}</p>
                    <p className="text-lg font-semibold mt-1">{selectedScan.rightFootLength ? `${selectedScan.rightFootLength}mm` : '—'}</p>
                  </CardContent>
                </Card>
              </div>

              {selectedScan.aiRecommendation && (() => {
                const rec = parseRecommendation(selectedScan.aiRecommendation);
                if (!rec) return null;
                return (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base flex items-center gap-2">
                        <Brain className="h-4 w-4 text-purple-400" />
                        {isPt ? 'Resultados da Análise' : 'Analysis Results'}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {rec.patientSummary && <p className="text-sm leading-relaxed">{rec.patientSummary}</p>}
                      {rec.recommendations && (
                        <div className="bg-muted/50 p-4 rounded-lg space-y-2">
                          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{isPt ? 'Recomendações' : 'Recommendations'}</p>
                          {rec.recommendations.insoleType && (
                            <p className="text-sm"><span className="font-medium">{isPt ? 'Palmilha:' : 'Insole:'}</span> {rec.recommendations.insoleType}</p>
                          )}
                          {rec.recommendations.supportLevel && (
                            <p className="text-sm"><span className="font-medium">{isPt ? 'Suporte:' : 'Support:'}</span> {rec.recommendations.supportLevel}</p>
                          )}
                          {rec.recommendations.footwearAdvice && (
                            <p className="text-sm"><span className="font-medium">{isPt ? 'Calçado:' : 'Footwear:'}</span> {rec.recommendations.footwearAdvice}</p>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })()}

              {!selectedScan.aiRecommendation && (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <Brain className="h-10 w-10 text-muted-foreground mb-3" />
                  <p className="text-sm font-medium">{isPt ? 'Análise ainda não disponível' : 'Analysis not yet available'}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {isPt ? 'O seu terapeuta irá analisar as fotos em breve.' : 'Your therapist will analyse the photos shortly.'}
                  </p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
