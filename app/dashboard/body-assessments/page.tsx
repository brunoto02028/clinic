"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { BodyMap, AssessmentScores } from "@/components/body-assessment/body-map";
import { AnatomicalAvatar, MuscleHighlight } from "@/components/body-assessment/anatomical-avatar";
import { PosturalComparisonView } from "@/components/body-assessment/postural-comparison-view";
import { BodyCapture, BodyCaptureResult } from "@/components/body-assessment/body-capture";
import { SegmentScores } from "@/components/body-assessment/segment-scores";
import { CorrectiveExercises } from "@/components/body-assessment/corrective-exercises";
import { enrichExercisesWithVideos } from "@/lib/match-exercise-videos";
import { ProgressTracker } from "@/components/body-assessment/progress-tracker";
import { AssessmentProgressChart } from "@/components/body-assessment/assessment-progress-chart";
import { InteractiveBodyModel } from "@/components/body-assessment/interactive-body-model";
import dynamic from "next/dynamic";
const BodyViewer3D = dynamic(() => import("@/components/body-assessment/body-viewer-3d").then(m => m.BodyViewer3D), { ssr: false, loading: () => <div className="flex items-center justify-center h-64"><div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" /></div> });
import { CrossSessionComparison } from "@/components/body-assessment/cross-session-comparison";
import { SkeletonAnalysisOverlay } from "@/components/body-assessment/skeleton-analysis-overlay";
import { GaitMetrics } from "@/components/body-assessment/gait-metrics";
import { VideoSkeletonPlayer } from "@/components/body-assessment/video-skeleton-player";
import { AssessmentOverview } from "@/components/body-assessment/assessment-overview";
import {
  Loader2,
  Activity,
  Camera,
  Brain,
  Eye,
  CheckCircle2,
  Clock,
  ClipboardList,
  ChevronLeft,
  Plus,
  Shield,
  Info,
  TrendingUp,
  Dumbbell,
  Crosshair,
  Video,
  FileText,
  Stethoscope,
  Download,
  HelpCircle,
  ChevronDown,
  Search,
  Target,
  FileDown,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import { useLocale } from "@/hooks/use-locale";
import { t as i18nT } from "@/lib/i18n";
import { useSession } from "next-auth/react";
import AssessmentGate from "@/components/dashboard/assessment-gate";
import ProfessionalReviewBanner from "@/components/dashboard/professional-review-banner";

interface Assessment {
  id: string;
  assessmentNumber: string;
  status: string;
  captureToken: string | null;
  frontImageUrl: string | null;
  backImageUrl: string | null;
  leftImageUrl: string | null;
  rightImageUrl: string | null;
  frontLandmarks: any[] | null;
  backLandmarks: any[] | null;
  leftLandmarks: any[] | null;
  rightLandmarks: any[] | null;
  motorPoints: any[] | null;
  postureScore: number | null;
  symmetryScore: number | null;
  mobilityScore: number | null;
  overallScore: number | null;
  segmentScores: any | null;
  gaitMetrics: any | null;
  correctiveExercises: any[] | null;
  recommendedProducts: any[] | null;
  deviationLabels: any[] | null;
  idealComparison: any[] | null;
  postureAnalysis: any | null;
  sentToPatientAt: string | null;
  aiSummary: string | null;
  aiRecommendations: string | null;
  aiFindings: any[] | null;
  therapistNotes: string | null;
  alignmentData: any | null;
  movementVideos: any[] | null;
  movementPatterns: any | null;
  // Anthropometric & Health
  heightCm: number | null;
  weightKg: number | null;
  bmi: number | null;
  bmiClassification: string | null;
  waistCm: number | null;
  hipCm: number | null;
  waistHipRatio: number | null;
  neckCm: number | null;
  chestCm: number | null;
  thighCm: number | null;
  calfCm: number | null;
  armCm: number | null;
  bodyFatPercent: number | null;
  bodyFatMethod: string | null;
  leanMassKg: number | null;
  fatMassKg: number | null;
  basalMetabolicRate: number | null;
  cardiovascularRisk: string | null;
  metabolicRisk: string | null;
  healthScore: number | null;
  healthRiskFactors: any[] | null;
  sittingHoursPerDay: number | null;
  screenTimeHours: number | null;
  walkingMinutesDay: number | null;
  stepsPerDay: number | null;
  ergonomicScore: number | null;
  createdAt: string;
  patient: { id: string; firstName: string; lastName: string; email: string };
  therapist: { id: string; firstName: string; lastName: string } | null;
}

const STATUS_CONFIG: Record<string, { labelEn: string; labelPt: string; color: string; icon: any }> = {
  PENDING_CAPTURE: { labelEn: "Pending Capture", labelPt: "Aguardando Captura", color: "bg-orange-500/15 text-orange-400", icon: Camera },
  CAPTURING: { labelEn: "Capturing", labelPt: "Capturando", color: "bg-blue-500/15 text-blue-400", icon: Camera },
  PENDING_ANALYSIS: { labelEn: "Processing", labelPt: "Processando", color: "bg-yellow-500/15 text-yellow-400", icon: Clock },
  ANALYZING: { labelEn: "Analyzing...", labelPt: "Analisando...", color: "bg-purple-500/15 text-purple-400", icon: Brain },
  PENDING_REVIEW: { labelEn: "Under Review", labelPt: "Em Revisão", color: "bg-indigo-500/15 text-indigo-400", icon: ClipboardList },
  REVIEWED: { labelEn: "Reviewed", labelPt: "Revisado", color: "bg-teal-500/15 text-teal-400", icon: CheckCircle2 },
  COMPLETED: { labelEn: "Completed", labelPt: "Concluído", color: "bg-green-500/15 text-green-400", icon: CheckCircle2 },
};


export default function PatientBodyAssessmentsPage() {
  return (
    <AssessmentGate requiredService="BODY_ASSESSMENT">
      <PatientBodyAssessmentsContent />
    </AssessmentGate>
  );
}

function PatientBodyAssessmentsContent() {
  const { locale } = useLocale();
  const T = (key: string) => i18nT(key, locale);
  const isPt = locale === "pt-BR";
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAssessment, setSelectedAssessment] = useState<Assessment | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [showCapture, setShowCapture] = useState(false);
  const [captureAssessment, setCaptureAssessment] = useState<Assessment | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [qrAssessment, setQrAssessment] = useState<Assessment | null>(null);
  const [creatingAssessment, setCreatingAssessment] = useState(false);
  const [bodyMapView, setBodyMapView] = useState<"front" | "back">("front");
  const [detailTab, setDetailTab] = useState<"overview" | "analysis" | "exercises" | "progress" | "videos">("overview");
  const [skeletonView, setSkeletonView] = useState<"front" | "back" | "left" | "right">("front");
  const [enrichedExercises, setEnrichedExercises] = useState<any[] | null>(null);
  const [enrichingVideos, setEnrichingVideos] = useState(false);
  const { toast } = useToast();
  const { data: session } = useSession();
  const isAdmin = ["ADMIN", "SUPERADMIN", "THERAPIST"].includes((session?.user as any)?.role || "");

  useEffect(() => {
    fetchAssessments();
  }, []);

  const fetchAssessments = async () => {
    try {
      const res = await fetch("/api/admin/body-assessments");
      if (res.ok) {
        const data = await res.json();
        setAssessments(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error("Error:", error);
      setAssessments([]);
    } finally {
      setLoading(false);
    }
  };

  const deleteAssessment = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!confirm(isPt ? "Deletar esta avaliação corporal? Isso não pode ser desfeito." : "Delete this body assessment? This cannot be undone.")) return;
    try {
      const res = await fetch(`/api/admin/body-assessments/${id}`, { method: "DELETE" });
      if (res.ok) {
        toast({ title: isPt ? "Deletado" : "Deleted", description: isPt ? "Avaliação deletada." : "Assessment deleted." });
        if (selectedAssessment?.id === id) { setShowDetail(false); setSelectedAssessment(null); }
        fetchAssessments();
      } else {
        toast({ title: isPt ? "Erro" : "Error", description: isPt ? "Falha ao deletar." : "Failed to delete.", variant: "destructive" });
      }
    } catch {
      toast({ title: isPt ? "Erro" : "Error", description: isPt ? "Falha ao deletar." : "Failed to delete.", variant: "destructive" });
    }
  };

  const startSelfCapture = async () => {
    setCreatingAssessment(true);
    try {
      const res = await fetch("/api/admin/body-assessments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (res.ok) {
        const data = await res.json();
        setQrAssessment(data);
        setShowQR(true);
        fetchAssessments();
      } else {
        const errData = await res.json().catch(() => ({}));
        toast({ title: T("common.error"), description: errData.error || T("bodyAssessment.startError"), variant: "destructive" });
      }
    } catch {
      toast({ title: T("common.error"), description: T("bodyAssessment.startError"), variant: "destructive" });
    } finally {
      setCreatingAssessment(false);
    }
  };

  const handleCaptureForExisting = (assessment: Assessment) => {
    setQrAssessment(assessment);
    setShowQR(true);
  };

  const blobToDataUrl = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  const handleCaptureComplete = async (result: BodyCaptureResult) => {
    if (!captureAssessment?.captureToken) return;
    setIsUploading(true);
    setShowCapture(false);

    try {
      // Upload photos
      for (const [view, data] of Object.entries(result.photos)) {
        if (!data) continue;
        await fetch(`/api/body-assessments/capture/${captureAssessment.captureToken}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            view,
            imageData: data.imageData,
            landmarks: data.landmarks,
            captureMetadata: { device: navigator.userAgent, timestamp: data.timestamp },
          }),
        });
      }

      // Upload videos — FormData multipart (no base64 on mobile)
      if (result.videos && result.videos.length > 0) {
        for (const vid of result.videos) {
          const fd = new FormData();
          fd.append("movementVideo", vid.blob, `${vid.testType}.webm`);
          fd.append("testType", vid.testType);
          fd.append("label", vid.label);
          fd.append("duration", String(vid.duration));
          await fetch(`/api/body-assessments/capture/${captureAssessment.captureToken}`, {
            method: "PUT",
            body: fd,
          });
        }
      }

      // Set status to pending analysis
      await fetch(`/api/body-assessments/capture/${captureAssessment.captureToken}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "PENDING_ANALYSIS" }),
      });

      fetchAssessments();
      toast({ title: T("bodyAssessment.captureComplete"), description: T("bodyAssessment.captureCompleteDesc") });
    } catch {
      toast({ title: T("common.error"), description: isPt ? "Falha no envio." : "Failed to upload.", variant: "destructive" });
    } finally {
      setIsUploading(false);
    }
  };

  const viewDetail = async (assessment: Assessment) => {
    try {
      const res = await fetch(`/api/admin/body-assessments/${assessment.id}`);
      if (res.ok) {
        setSelectedAssessment(await res.json());
      } else {
        setSelectedAssessment(assessment);
      }
    } catch {
      setSelectedAssessment(assessment);
    }
    setShowDetail(true);
  };

  // Auto-enrich exercises — must be BEFORE any conditional returns (Rules of Hooks)
  useEffect(() => {
    if (showDetail && selectedAssessment?.correctiveExercises?.length && !enrichedExercises && isAdmin) {
      setEnrichingVideos(true);
      enrichExercisesWithVideos(selectedAssessment.correctiveExercises)
        .then(setEnrichedExercises)
        .finally(() => setEnrichingVideos(false));
    }
    if (!showDetail) setEnrichedExercises(null);
  }, [showDetail, selectedAssessment?.id]);

  // QR Code modal for phone capture
  if (showQR && qrAssessment?.captureToken) {
    const captureUrl = `${typeof window !== "undefined" ? window.location.origin : "https://bpr.rehab"}/capture/${qrAssessment.captureToken}`;
    return (
      <div className="flex flex-col items-center justify-center min-h-[80vh] p-6 text-center">
        <div className="max-w-sm w-full space-y-6">
          <div>
            <h2 className="text-xl font-bold">{isPt ? "Capture pelo Telemóvel" : "Capture via Phone"}</h2>
            <p className="text-sm text-muted-foreground mt-1">
              {isPt
                ? "Leia o QR Code abaixo com o seu telemóvel para abrir a câmera e tirar as fotos."
                : "Scan the QR code below with your phone to open the camera and take your photos."}
            </p>
          </div>

          <div className="bg-white rounded-2xl p-6 mx-auto inline-block shadow-xl">
            <img
              src={`https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(captureUrl)}`}
              alt="QR Code"
              width={220}
              height={220}
            />
          </div>

          <div className="space-y-2 text-left bg-muted/30 rounded-lg p-4">
            {[
              isPt ? "Abra a câmera do telemóvel" : "Open your phone camera",
              isPt ? "Aponte para o QR Code" : "Point at the QR code",
              isPt ? "Siga as instruções para tirar as 4 fotos" : "Follow the steps to take 4 photos",
            ].map((step, i) => (
              <div key={i} className="flex items-center gap-3">
                <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center shrink-0">{i + 1}</span>
                <span className="text-sm">{step}</span>
              </div>
            ))}
          </div>

          <div className="text-xs text-muted-foreground break-all bg-muted/20 rounded p-2">
            {captureUrl}
          </div>

          <div className="flex gap-3 justify-center">
            <Button variant="outline" onClick={() => { setShowQR(false); setQrAssessment(null); fetchAssessments(); }}>
              {isPt ? "Fechar" : "Close"}
            </Button>
            <Button onClick={() => { fetchAssessments(); toast({ title: isPt ? "Atualizado" : "Refreshed" }); }}>
              {isPt ? "Verificar Resultado" : "Check Result"}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Uploading
  if (isUploading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="text-center space-y-4">
          <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto" />
          <p className="text-lg font-medium">{T("bodyAssessment.uploading")}</p>
        </div>
      </div>
    );
  }

  // Detail view
  if (showDetail && selectedAssessment) {
    const a = selectedAssessment;
    const sc = STATUS_CONFIG[a.status] || STATUS_CONFIG.PENDING_CAPTURE;
    const hasAnalysis = a.overallScore != null || a.aiSummary;
    const hasExercises = a.correctiveExercises && a.correctiveExercises.length > 0;
    const hasVideos = a.movementVideos && Array.isArray(a.movementVideos) && a.movementVideos.length > 0;
    const hasScoliosis = a.postureAnalysis?.scoliosisScreening && a.postureAnalysis.scoliosisScreening.severity !== "none";
    const hasGaitMetrics = a.gaitMetrics && Object.values(a.gaitMetrics).some((v: any) => typeof v === "number" && v > 0);
    const reportReady = !!a.sentToPatientAt && hasAnalysis;

    // Get skeleton image/landmarks for selected view
    const skeletonImages: Record<string, { url: string | null; landmarks: any[] | null }> = {
      front: { url: a.frontImageUrl, landmarks: a.frontLandmarks },
      back: { url: a.backImageUrl, landmarks: a.backLandmarks },
      left: { url: a.leftImageUrl, landmarks: a.leftLandmarks },
      right: { url: a.rightImageUrl, landmarks: a.rightLandmarks },
    };
    const currentSkelImg = skeletonImages[skeletonView];

    // Build assessment history for progress tracker
    const progressData = assessments
      .filter((x: Assessment) => x.overallScore != null)
      .map((x: Assessment) => ({
        id: x.id,
        date: x.createdAt,
        overallScore: x.overallScore || 0,
        postureScore: x.postureScore || 0,
        symmetryScore: x.symmetryScore || 0,
        mobilityScore: x.mobilityScore || 0,
        segmentScores: x.segmentScores,
      }));

    // Build comparison data
    const comparisonData = assessments.map((x: Assessment) => ({
      id: x.id,
      date: x.createdAt,
      assessmentNumber: x.assessmentNumber,
      overallScore: x.overallScore,
      postureScore: x.postureScore,
      symmetryScore: x.symmetryScore,
      mobilityScore: x.mobilityScore,
      segmentScores: x.segmentScores,
      frontImageUrl: x.frontImageUrl,
      backImageUrl: x.backImageUrl,
      leftImageUrl: x.leftImageUrl,
      rightImageUrl: x.rightImageUrl,
      aiFindings: x.aiFindings || undefined,
    }));

    // Detail tab items
    const tabs = [
      { id: "overview" as const, label: isPt ? "Resumo" : "Overview", icon: Activity },
      ...(hasAnalysis ? [{ id: "analysis" as const, label: isPt ? "Análise" : "Analysis", icon: Crosshair }] : []),
      ...(hasExercises ? [{ id: "exercises" as const, label: isPt ? "Exercícios" : "Exercises", icon: Dumbbell }] : []),
      ...(hasVideos ? [{ id: "videos" as const, label: isPt ? "Vídeos" : "Videos", icon: Video }] : []),
      ...(progressData.length > 1 ? [{ id: "progress" as const, label: isPt ? "Progresso" : "Progress", icon: TrendingUp }] : []),
    ];

    return (
      <div className="space-y-4">
        {/* Report Ready Banner */}
        {reportReady && (
          <div className="bg-gradient-to-r from-green-500/15 to-emerald-500/15 border border-green-500/30 rounded-xl p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0">
              <CheckCircle2 className="h-5 w-5 text-green-400" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-green-300">
                {isPt ? "Seu relatório está pronto!" : "Your report is ready!"}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {isPt
                  ? "Seu terapeuta revisou sua avaliação biomecânica. Veja os resultados abaixo e baixe o PDF."
                  : "Your therapist has reviewed your biomechanical assessment. View the results below and download the PDF."}
              </p>
            </div>
            <Button
              size="sm"
              className="bg-green-600 hover:bg-green-700 text-white text-xs h-8 gap-1.5 flex-shrink-0"
              onClick={() => {
                const link = document.createElement("a");
                link.href = `/api/body-assessments/${a.id}/report-pdf`;
                link.download = `body-assessment-${a.assessmentNumber}.pdf`;
                link.click();
              }}
            >
              <Download className="h-3.5 w-3.5" />
              {isPt ? "Baixar PDF" : "Download PDF"}
            </Button>
          </div>
        )}

        {/* Header */}
        <div className="flex items-center gap-2 sm:gap-3">
          <Button variant="ghost" size="icon" onClick={() => { setShowDetail(false); setDetailTab("overview"); }} className="h-8 w-8 sm:h-9 sm:w-9">
            <ChevronLeft className="h-4 w-4 sm:h-5 sm:w-5" />
          </Button>
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-lg sm:text-xl font-bold">{a.assessmentNumber}</h1>
              <Badge className={sc.color + " text-[10px]"}>{isPt ? sc.labelPt : sc.labelEn}</Badge>
            </div>
            <p className="text-xs text-muted-foreground">{new Date(a.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" })}</p>
          </div>
          {a.therapist && (
            <div className="hidden sm:flex items-center gap-1.5 text-xs text-muted-foreground">
              <Stethoscope className="h-3.5 w-3.5" />
              {a.therapist.firstName} {a.therapist.lastName}
            </div>
          )}
          {hasAnalysis && (
            <Button
              variant="outline"
              size="sm"
              className="text-xs gap-1.5"
              onClick={() => {
                const link = document.createElement("a");
                link.href = `/api/body-assessments/${a.id}/report-pdf`;
                link.download = `body-assessment-${a.assessmentNumber}.pdf`;
                link.click();
              }}
            >
              <Download className="h-3.5 w-3.5" />
              {isPt ? "Baixar PDF" : "Download PDF"}
            </Button>
          )}
          {isAdmin && (
            <Button
              variant="ghost"
              size="sm"
              className="text-xs gap-1 text-red-400 hover:text-red-300 hover:bg-red-500/10"
              onClick={() => deleteAssessment(a.id)}
            >
              <Trash2 className="h-3.5 w-3.5" />
              {isPt ? "Deletar" : "Delete"}
            </Button>
          )}
        </div>

        {/* Overall Scores Bar */}
        {a.overallScore != null && (
          <AssessmentScores
            postureScore={a.postureScore}
            symmetryScore={a.symmetryScore}
            mobilityScore={a.mobilityScore}
            overallScore={a.overallScore}
          />
        )}

        {/* Tab Navigation */}
        <div className="flex gap-1 overflow-x-auto pb-1 border-b">
          {tabs.map((tab) => {
            const TabIcon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setDetailTab(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-t-lg border-b-2 transition-all whitespace-nowrap ${
                  detailTab === tab.id
                    ? "border-primary text-primary bg-primary/5"
                    : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/50"
                }`}
              >
                <TabIcon className="h-3.5 w-3.5" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* ===== OVERVIEW TAB ===== */}
        {detailTab === "overview" && (
          <AssessmentOverview 
            assessment={a} 
            locale={locale} 
            isPt={isPt} 
            T={T} 
          />
        )}

        {/* ===== ANALYSIS TAB ===== */}
        {detailTab === "analysis" && hasAnalysis && (
          <div className="space-y-6">
            {/* Skeleton View Selector */}
            <div className="flex gap-1.5">
              {(["front", "back", "left", "right"] as const).map((v) => {
                const hasImg = skeletonImages[v]?.url;
                return (
                  <Button
                    key={v}
                    variant={skeletonView === v ? "default" : "outline"}
                    size="sm"
                    className="h-8 text-xs capitalize"
                    onClick={() => setSkeletonView(v)}
                    disabled={!hasImg}
                  >
                    {v === "front" ? (isPt ? "Frontal" : "Front") :
                     v === "back" ? (isPt ? "Posterior" : "Back") :
                     v === "left" ? (isPt ? "Esquerdo" : "Left") :
                     (isPt ? "Direito" : "Right")}
                  </Button>
                );
              })}
            </div>

            {/* Skeleton Analysis Overlay */}
            {currentSkelImg?.url && (
              <SkeletonAnalysisOverlay
                imageUrl={currentSkelImg.url}
                landmarks={currentSkelImg.landmarks || undefined}
                deviationLabels={a.deviationLabels || []}
                idealComparison={a.idealComparison || []}
                view={skeletonView}
                width={500}
              />
            )}

            {/* Gait Metrics */}
            {hasGaitMetrics && (
              <GaitMetrics metrics={a.gaitMetrics} />
            )}

            {/* Scoliosis Screening (also shown here if present) */}
            {hasScoliosis && (
              <ScoliosisPanel screening={a.postureAnalysis.scoliosisScreening} />
            )}

            {/* Detailed Findings */}
            {a.aiFindings && a.aiFindings.length > 0 && (
              <FindingCards findings={a.aiFindings} />
            )}

            {/* AI Recommendations */}
            {a.aiRecommendations && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <FileText className="h-4 w-4 text-cyan-500" />
                    {T("bodyAssessment.recommendations")}
                  </CardTitle>
                </CardHeader>
                <CardContent><FormattedAISummary text={a.aiRecommendations} locale={locale} /></CardContent>
              </Card>
            )}
          </div>
        )}

        {/* ===== EXERCISES TAB ===== */}
        {detailTab === "exercises" && hasExercises && (
          <div className="space-y-6">
            <CorrectiveExercises exercises={enrichedExercises || a.correctiveExercises!} />

            {/* Show which findings each exercise addresses */}
            {a.aiFindings && a.aiFindings.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Info className="h-4 w-4 text-blue-500" />
                    {isPt ? "Esses exercícios foram selecionados com base nos seus achados clínicos" : "These exercises were selected based on your clinical findings"}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {a.aiFindings.slice(0, 6).map((f: any, i: number) => (
                      <div key={i} className="flex items-start gap-2 p-2 rounded-lg bg-muted/50">
                        <Badge variant={f.severity === "severe" ? "destructive" : f.severity === "moderate" ? "default" : "secondary"} className="text-[10px] h-fit mt-0.5">
                          {f.severity}
                        </Badge>
                        <div>
                          <p className="text-xs font-medium">{f.area}</p>
                          <p className="text-[10px] text-muted-foreground">{f.finding}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Recommended Products */}
            {a.recommendedProducts && a.recommendedProducts.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    🛒 {isPt ? "Produtos Recomendados para Sua Recuperação" : "Recommended Products for Your Recovery"}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {a.recommendedProducts.map((p: any, i: number) => (
                      <div key={i} className="flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors">
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 text-lg">
                          {p.category === "equipment" ? "🏋️" : p.category === "supplement" ? "💊" : "📦"}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium">{p.name}</p>
                          <p className="text-[10px] text-muted-foreground line-clamp-2">{p.reason}</p>
                          {p.finding && (
                            <Badge variant="outline" className="text-[9px] mt-1 h-4">{isPt ? "Para" : "For"}: {p.finding}</Badge>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-[10px] h-7 px-2 flex-shrink-0"
                          onClick={() => window.location.href = `/dashboard/marketplace?search=${encodeURIComponent(p.searchTerms?.[0] || p.name)}`}
                        >
                          {isPt ? "Ver" : "View"} →
                        </Button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* ===== VIDEOS TAB ===== */}
        {detailTab === "videos" && hasVideos && (
          <div className="space-y-6">
            <VideoSkeletonPlayer
              videos={a.movementVideos!.filter((v: any) => v.videoUrl).map((v: any) => ({
                videoUrl: v.videoUrl,
                testType: v.testType,
                label: v.label || v.testType,
                duration: v.duration,
              }))}
            />
          </div>
        )}

        {/* ===== PROGRESS TAB ===== */}
        {detailTab === "progress" && progressData.length > 1 && (
          <div className="space-y-6">
            <AssessmentProgressChart assessments={assessments} locale={locale} />
            <ProgressTracker assessments={progressData} />
            {comparisonData.length >= 2 && (
              <CrossSessionComparison assessments={comparisonData} currentId={a.id} locale={locale} />
            )}
            {/* Before/After with Angle Measurements */}
            {assessments.filter(x => x.frontImageUrl || x.backImageUrl).length >= 2 && (
              <BeforeAfterAngles
                assessments={assessments
                  .filter(x => x.frontImageUrl || x.backImageUrl)
                  .map(x => ({
                    id: x.id,
                    date: x.createdAt,
                    assessmentNumber: x.assessmentNumber,
                    overallScore: x.overallScore,
                    frontImageUrl: x.frontImageUrl,
                    backImageUrl: x.backImageUrl,
                    leftImageUrl: x.leftImageUrl,
                    rightImageUrl: x.rightImageUrl,
                    frontLandmarks: x.frontLandmarks,
                    backLandmarks: x.backLandmarks,
                    leftLandmarks: x.leftLandmarks,
                    rightLandmarks: x.rightLandmarks,
                  }))}
                currentId={a.id}
                locale={locale}
              />
            )}
          </div>
        )}
      </div>
    );
  }

  // List view
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">{T("bodyAssessment.title")}</h1>
          <p className="text-muted-foreground text-sm">{T("bodyAssessment.subtitle")}</p>
        </div>
        <Button onClick={startSelfCapture} className="w-full sm:w-auto">
          <Camera className="h-4 w-4 mr-2" />
          {T("bodyAssessment.newAssessment")}
        </Button>
      </div>

      <ProfessionalReviewBanner />

      {/* What Is a Biomechanical Assessment? */}
      <Card className="border-purple-500/20 bg-gradient-to-br from-purple-500/5 to-pink-500/5">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <HelpCircle className="h-4 w-4 text-purple-400" />
            {T("bodyAssessment.whatIsTitle")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground leading-relaxed">{T("bodyAssessment.whatIsDesc")}</p>
        </CardContent>
      </Card>

      {/* Benefits Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { icon: Search, title: T("bodyAssessment.benefit1Title"), desc: T("bodyAssessment.benefit1Desc"), color: "text-amber-400", bg: "bg-amber-500/10" },
          { icon: Dumbbell, title: T("bodyAssessment.benefit2Title"), desc: T("bodyAssessment.benefit2Desc"), color: "text-green-400", bg: "bg-green-500/10" },
          { icon: TrendingUp, title: T("bodyAssessment.benefit3Title"), desc: T("bodyAssessment.benefit3Desc"), color: "text-blue-400", bg: "bg-blue-500/10" },
          { icon: FileDown, title: T("bodyAssessment.benefit4Title"), desc: T("bodyAssessment.benefit4Desc"), color: "text-indigo-400", bg: "bg-indigo-500/10" },
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
            {T("bodyAssessment.infoTitle")}
          </CardTitle>
        </CardHeader>
        <CardContent className="grid sm:grid-cols-3 gap-4 pt-0">
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
              <Camera className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-sm font-semibold">{T("bodyAssessment.infoStep1Title")}</p>
              <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{T("bodyAssessment.infoStep1Desc")}</p>
            </div>
          </div>
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-purple-500/15 flex items-center justify-center flex-shrink-0 mt-0.5">
              <Brain className="h-4 w-4 text-purple-400" />
            </div>
            <div>
              <p className="text-sm font-semibold">{T("bodyAssessment.infoStep2Title")}</p>
              <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{T("bodyAssessment.infoStep2Desc")}</p>
            </div>
          </div>
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-green-500/15 flex items-center justify-center flex-shrink-0 mt-0.5">
              <CheckCircle2 className="h-4 w-4 text-green-400" />
            </div>
            <div>
              <p className="text-sm font-semibold">{T("bodyAssessment.infoStep3Title")}</p>
              <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{T("bodyAssessment.infoStep3Desc")}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Score Legend */}
      <Card className="border-muted/40">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Target className="h-4 w-4 text-primary" />
            {T("bodyAssessment.scoreExplainTitle")}
          </CardTitle>
          <CardDescription className="text-xs">{T("bodyAssessment.scoreExplainDesc")}</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-0">
          <div className="flex items-center gap-2 p-2 rounded-lg bg-green-500/10">
            <div className="w-3 h-3 rounded-full bg-green-500 flex-shrink-0" />
            <p className="text-xs text-green-400">{T("bodyAssessment.scoreExcellent")}</p>
          </div>
          <div className="flex items-center gap-2 p-2 rounded-lg bg-blue-500/10">
            <div className="w-3 h-3 rounded-full bg-blue-500 flex-shrink-0" />
            <p className="text-xs text-blue-400">{T("bodyAssessment.scoreGood")}</p>
          </div>
          <div className="flex items-center gap-2 p-2 rounded-lg bg-amber-500/10">
            <div className="w-3 h-3 rounded-full bg-amber-500 flex-shrink-0" />
            <p className="text-xs text-amber-400">{T("bodyAssessment.scoreFair")}</p>
          </div>
          <div className="flex items-center gap-2 p-2 rounded-lg bg-red-500/10">
            <div className="w-3 h-3 rounded-full bg-red-500 flex-shrink-0" />
            <p className="text-xs text-red-400">{T("bodyAssessment.scoreNeedsAttention")}</p>
          </div>
        </CardContent>
      </Card>

      {/* FAQ */}
      <Card className="border-muted/40">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <HelpCircle className="h-4 w-4 text-purple-400" />
            {T("bodyAssessment.faqTitle")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 pt-0">
          {[
            { q: T("bodyAssessment.faq1Q"), a: T("bodyAssessment.faq1A") },
            { q: T("bodyAssessment.faq2Q"), a: T("bodyAssessment.faq2A") },
            { q: T("bodyAssessment.faq3Q"), a: T("bodyAssessment.faq3A") },
            { q: T("bodyAssessment.faq4Q"), a: T("bodyAssessment.faq4A") },
          ].map((faq, i) => (
            <details key={i} className="group rounded-lg border border-muted/40 overflow-hidden">
              <summary className="flex items-center justify-between p-3 cursor-pointer hover:bg-muted/30 transition-colors text-sm font-medium">
                {faq.q}
                <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-open:rotate-180" />
              </summary>
              <div className="px-3 pb-3 text-xs text-muted-foreground leading-relaxed">{faq.a}</div>
            </details>
          ))}
        </CardContent>
      </Card>

      {/* Privacy Notice */}
      <div className="flex items-start gap-2.5 p-3 rounded-lg bg-muted/20 border border-white/10 text-xs text-muted-foreground">
        <Shield className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
        <p>{T("bodyAssessment.privacyNotice")}</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : assessments.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Activity className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-semibold text-lg">{T("bodyAssessment.noAssessments")}</h3>
            <p className="text-muted-foreground mt-1">{T("bodyAssessment.noAssessmentsDesc")}</p>
            <p className="text-muted-foreground text-xs mt-2 max-w-md mx-auto">{T("bodyAssessment.howItWorks")}</p>
            <Button className="mt-4" onClick={startSelfCapture}>
              <Camera className="h-4 w-4 mr-2" />
              {T("bodyAssessment.startSelfCapture")}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {assessments.map((a) => {
            const sc = STATUS_CONFIG[a.status] || STATUS_CONFIG.PENDING_CAPTURE;
            const StatusIcon = sc.icon;
            const capturedViews = [a.frontImageUrl, a.backImageUrl, a.leftImageUrl, a.rightImageUrl].filter(Boolean).length;
            return (
              <Card key={a.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-3 sm:p-4">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <StatusIcon className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-sm">{a.assessmentNumber}</span>
                          <Badge className={sc.color + " text-[10px]"}>{isPt ? sc.labelPt : sc.labelEn}</Badge>
                        </div>
                        <div className="flex items-center gap-2 sm:gap-3 text-[10px] sm:text-xs text-muted-foreground mt-0.5 flex-wrap">
                          <span>{new Date(a.createdAt).toLocaleDateString()}</span>
                          <span>{capturedViews}/4 {isPt ? "fotos" : "views"}</span>
                          {a.overallScore != null && <span>{Math.round(a.overallScore)}/100</span>}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 ml-12 sm:ml-0">
                      {a.status === "PENDING_CAPTURE" && (
                        <Button size="sm" onClick={() => handleCaptureForExisting(a)} className="h-8 text-xs">
                          <Camera className="h-3.5 w-3.5 mr-1" />
                          {isPt ? "Capturar" : "Capture"}
                        </Button>
                      )}
                      <Button variant="outline" size="sm" onClick={() => viewDetail(a)} className="h-8 text-xs">
                        <Eye className="h-3.5 w-3.5 mr-1" />
                        {isPt ? "Ver" : "View"}
                      </Button>
                      {isAdmin && (
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-red-400 hover:text-red-300 hover:bg-red-500/10" onClick={(e) => deleteAssessment(a.id, e)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
