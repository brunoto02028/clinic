"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { BodyMap, AssessmentScores } from "@/components/body-assessment/body-map";
import { AnatomicalAvatar, MuscleHighlight } from "@/components/body-assessment/anatomical-avatar";
import { PosturalComparisonView } from "@/components/body-assessment/postural-comparison-view";
import { ImageAnnotator, Annotation } from "@/components/body-assessment/image-annotator";
import { PlumbLineOverlay } from "@/components/body-assessment/plumb-line-overlay";
import { ImageComparison } from "@/components/body-assessment/image-comparison";
import { SegmentScores } from "@/components/body-assessment/segment-scores";
import { TreatmentPriorities } from "@/components/body-assessment/treatment-priorities";
import { FindingCards } from "@/components/body-assessment/finding-cards";
import { CorrectiveExercises } from "@/components/body-assessment/corrective-exercises";
import { enrichExercisesWithVideos } from "@/lib/match-exercise-videos";
import { ProgressTracker } from "@/components/body-assessment/progress-tracker";
import { AssessmentProgressChart } from "@/components/body-assessment/assessment-progress-chart";
import { InteractiveBodyModel } from "@/components/body-assessment/interactive-body-model";
import dynamic from "next/dynamic";
const BodyViewer3D = dynamic(() => import("@/components/body-assessment/body-viewer-3d").then(m => m.BodyViewer3D), { ssr: false, loading: () => <div className="flex items-center justify-center h-64"><div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" /></div> });
import { PostureAnalysisPanel } from "@/components/body-assessment/posture-analysis-panel";
import { BeforeAfterAngles } from "@/components/body-assessment/before-after-angles";
import { PostureStages } from "@/components/body-assessment/posture-stages";
import { CrossSessionComparison } from "@/components/body-assessment/cross-session-comparison";
import { SkeletonAnalysisOverlay } from "@/components/body-assessment/skeleton-analysis-overlay";
import { AiChatField } from "@/components/body-assessment/ai-chat-field";
import { PhotoQualityPanel } from "@/components/body-assessment/photo-quality-panel";
import { PosturalGridOverlay } from "@/components/body-assessment/postural-grid-overlay";
import { GaitMetrics } from "@/components/body-assessment/gait-metrics";
import { ScoliosisPanel } from "@/components/body-assessment/scoliosis-panel";
import { VideoSkeletonPlayer } from "@/components/body-assessment/video-skeleton-player";
import {
  Search,
  Plus,
  Eye,
  Loader2,
  MoreVertical,
  Brain,
  Copy,
  QrCode,
  Trash2,
  ClipboardList,
  Activity,
  Users,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Camera,
  FileText,
  ChevronLeft,
  Video,
  Pencil,
  StickyNote,
  LayoutGrid,
  Image as ImageIcon,
  Sparkles,
  ExternalLink,
  CalendarDays,
  User,
  Mail,
  ArrowRight,
  Target,
  TrendingUp,
  Shield,
  Zap,
  Home,
  ClipboardCheck,
  Upload,
  RefreshCw,
  ChevronDown,
  BookOpen,
  Send,
  Undo2,
  Download,
  Grid3x3,
  Heart,
  Ruler,
  Scale,
  MessageCircle,
  Smartphone,
  Save,
} from "lucide-react";
import { useLocale } from "@/hooks/use-locale";
import { t as i18nT } from "@/lib/i18n";
import { BodyCapture, BodyCaptureResult } from "@/components/body-assessment/body-capture";
import { RemoteCaptureSession } from "@/components/body-assessment/remote-capture-session";
import { computeAllMetrics } from "@/lib/health-metrics";
import { HealthMetricsCard } from "@/components/body-assessment/health-metrics-card";
import { BodyMetricsTab } from "@/components/body-assessment/body-metrics-tab";
import { ShareReportDialog } from "@/components/body-assessment/share-report-dialog";

interface Assessment {
  id: string;
  assessmentNumber: string;
  clinicId: string;
  patientId: string;
  therapistId: string | null;
  captureToken: string | null;
  captureTokenExpiry: string | null;
  status: string;
  frontImageUrl: string | null;
  backImageUrl: string | null;
  leftImageUrl: string | null;
  rightImageUrl: string | null;
  frontAnnotatedUrl: string | null;
  backAnnotatedUrl: string | null;
  leftAnnotatedUrl: string | null;
  rightAnnotatedUrl: string | null;
  motorPoints: any[] | null;
  postureAnalysis: any | null;
  symmetryAnalysis: any | null;
  jointAngles: any | null;
  alignmentData: any | null;
  kineticChain: any | null;
  frontLandmarks: any[] | null;
  backLandmarks: any[] | null;
  leftLandmarks: any[] | null;
  rightLandmarks: any[] | null;
  postureScore: number | null;
  symmetryScore: number | null;
  mobilityScore: number | null;
  overallScore: number | null;
  aiSummary: string | null;
  aiRecommendations: string | null;
  aiFindings: any[] | null;
  therapistNotes: string | null;
  therapistFindings: any | null;
  movementVideos: any[] | null;
  movementPatterns: any | null;
  segmentScores: any | null;
  gaitMetrics: any | null;
  correctiveExercises: any[] | null;
  recommendedProducts: any[] | null;
  deviationLabels: any[] | null;
  idealComparison: any[] | null;
  reviewedAt: string | null;
  aiProcessedAt: string | null;
  sentToPatientAt: string | null;
  // Anthropometric & Body Composition
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
  visceralFatLevel: number | null;
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
  ergonomicAssessment: any | null;
  sedentaryRecommendations: any | null;
  activityLevel: string | null;
  sportModality: string | null;
  createdAt: string;
  updatedAt: string;
  patient: { id: string; firstName: string; lastName: string; email: string };
  therapist: { id: string; firstName: string; lastName: string } | null;
}

const STATUS_CONFIG: Record<string, { label: string; labelPt: string; color: string; icon: any }> = {
  PENDING_CAPTURE: { label: "Pending Capture", labelPt: "Aguardando Captura", color: "bg-orange-100 text-orange-700", icon: Camera },
  CAPTURING: { label: "Capturing", labelPt: "Capturando", color: "bg-blue-100 text-blue-700", icon: Camera },
  PENDING_ANALYSIS: { label: "Pending Analysis", labelPt: "Aguardando Análise", color: "bg-yellow-100 text-yellow-700", icon: Clock },
  ANALYZING: { label: "Analyzing...", labelPt: "Analisando...", color: "bg-purple-100 text-purple-700", icon: Brain },
  PENDING_REVIEW: { label: "Pending Review", labelPt: "Aguardando Revisão", color: "bg-indigo-100 text-indigo-700", icon: ClipboardList },
  REVIEWED: { label: "Reviewed", labelPt: "Revisado", color: "bg-teal-100 text-teal-700", icon: CheckCircle2 },
  SENT_TO_PATIENT: { label: "Sent to Patient", labelPt: "Enviado ao Paciente", color: "bg-cyan-100 text-cyan-700", icon: Mail },
  COMPLETED: { label: "Completed", labelPt: "Concluído", color: "bg-green-100 text-green-700", icon: CheckCircle2 },
  RECAPTURE_REQUESTED: { label: "Recapture Requested", labelPt: "Re-captura Solicitada", color: "bg-orange-100 text-orange-700", icon: RefreshCw },
};

export default function AdminBodyAssessmentsPage() {
  const { locale } = useLocale();
  const T = (key: string) => i18nT(key, locale);
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedAssessment, setSelectedAssessment] = useState<Assessment | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [patients, setPatients] = useState<any[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [therapistNotes, setTherapistNotes] = useState("");
  const [notesLang, setNotesLang] = useState<"pt-BR" | "en">("en");
  const [showNotesPreview, setShowNotesPreview] = useState(false);
  const [bodyMapView, setBodyMapView] = useState<"front" | "back">("front");
  const [bodyGender, setBodyGender] = useState<"male" | "female">("male");
  const [detailTab, setDetailTab] = useState<"overview" | "images" | "videos" | "annotate" | "analysis" | "notes" | "metrics" | "3dmodel">("overview");
  const [annotateView, setAnnotateView] = useState<"front" | "back" | "left" | "right">("front");
  const [annotateMode, setAnnotateMode] = useState<"draw" | "plumb" | "compare">("draw");
  const [skeletonView, setSkeletonView] = useState<"front" | "back" | "left" | "right">("front");
  const [gridOverlayView, setGridOverlayView] = useState<"front" | "back" | "left" | "right" | null>(null);
  const [showCameraCapture, setShowCameraCapture] = useState(false);
  const [showRemoteCapture, setShowRemoteCapture] = useState(false);
  const [isCaptureUploading, setIsCaptureUploading] = useState(false);
  const [isGeneratingProtocol, setIsGeneratingProtocol] = useState(false);
  const [generatedProtocol, setGeneratedProtocol] = useState<any>(null);
  const [showProtocolReview, setShowProtocolReview] = useState(false);
  const [isExportingExercises, setIsExportingExercises] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [uploadingView, setUploadingView] = useState<string | null>(null);
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const gridOverlayRef = useRef<HTMLDivElement>(null);
  const [enrichedExercises, setEnrichedExercises] = useState<any[] | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchAssessments();
    fetchPatients();
  }, []);

  // Auto-enrich exercises with library videos
  useEffect(() => {
    if (showDetail && selectedAssessment?.correctiveExercises?.length && !enrichedExercises) {
      enrichExercisesWithVideos(selectedAssessment.correctiveExercises).then(setEnrichedExercises);
    }
    if (!showDetail) setEnrichedExercises(null);
  }, [showDetail, selectedAssessment?.id]);

  // Scroll to grid overlay when opened
  useEffect(() => {
    if (gridOverlayView && gridOverlayRef.current) {
      gridOverlayRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [gridOverlayView]);

  const fetchAssessments = async () => {
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (statusFilter !== "all") params.set("status", statusFilter);
      const res = await fetch(`/api/admin/body-assessments?${params}`);
      if (res.ok) {
        const data = await res.json();
        setAssessments(data);
      }
    } catch (error) {
      console.error("Error fetching assessments:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPatients = async () => {
    try {
      const res = await fetch("/api/admin/patients?limit=500");
      if (res.ok) {
        const data = await res.json();
        setPatients(Array.isArray(data) ? data : data.patients || []);
      }
    } catch {}
  };

  useEffect(() => {
    const timer = setTimeout(() => fetchAssessments(), 300);
    return () => clearTimeout(timer);
  }, [search, statusFilter]);

  const createAssessment = async () => {
    if (!selectedPatientId) {
      toast({ title: "Error", description: "Please select a patient.", variant: "destructive" });
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/admin/body-assessments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ patientId: selectedPatientId }),
      });
      if (res.ok) {
        const data = await res.json();
        setShowNewDialog(false);
        setSelectedPatientId("");
        fetchAssessments();
        toast({ title: "Assessment Created", description: `${data.assessmentNumber} created.` });
      } else {
        const err = await res.json();
        toast({ title: "Error", description: err.error, variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Failed to create assessment.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const [analysisLanguage, setAnalysisLanguage] = useState(locale === "pt-BR" ? "pt-BR" : "en");
  const [activityLevel, setActivityLevel] = useState("");
  const [sportModality, setSportModality] = useState("");
  const [analysisObjectives, setAnalysisObjectives] = useState("");
  const [showAnalysisConfig, setShowAnalysisConfig] = useState(false);
  const [isSendingToPatient, setIsSendingToPatient] = useState(false);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);

  const runAiAnalysis = async (assessment: Assessment) => {
    setIsAnalyzing(true);
    toast({ title: locale === "pt-BR" ? "Análise IA Iniciada" : "AI Analysis Started", description: locale === "pt-BR" ? "Processando imagens... Pode levar um minuto." : "Processing images... This may take a minute." });
    try {
      const res = await fetch(`/api/admin/body-assessments/${assessment.id}/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          language: analysisLanguage,
          activityLevel: activityLevel || undefined,
          sportModality: sportModality || undefined,
          objectives: analysisObjectives || undefined,
        }),
      });
      if (res.ok) {
        const updated = await res.json();
        setSelectedAssessment(updated);
        fetchAssessments();
        setShowAnalysisConfig(false);
        toast({ title: locale === "pt-BR" ? "Análise Completa" : "Analysis Complete", description: locale === "pt-BR" ? "Análise da IA finalizada com sucesso." : "AI analysis finished successfully." });
      } else {
        const err = await res.json();
        toast({ title: "Error", description: err.error, variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: locale === "pt-BR" ? "Análise da IA falhou." : "AI analysis failed.", variant: "destructive" });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const saveDraftNotes = async () => {
    if (!selectedAssessment) return;
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/admin/body-assessments/${selectedAssessment.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ therapistNotes }),
      });
      if (res.ok) {
        const updated = await res.json();
        setSelectedAssessment(updated);
        fetchAssessments();
        toast({ title: locale === "pt-BR" ? "Rascunho Salvo" : "Draft Saved", description: locale === "pt-BR" ? "Suas notas foram salvas. Você pode continuar editando." : "Your notes have been saved. You can continue editing." });
      }
    } catch {
      toast({ title: "Error", description: locale === "pt-BR" ? "Falha ao salvar notas." : "Failed to save notes.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const markAsReviewed = async () => {
    if (!selectedAssessment) return;
    if (!therapistNotes?.trim()) {
      toast({ title: locale === "pt-BR" ? "Notas vazias" : "Empty notes", description: locale === "pt-BR" ? "Escreva suas notas antes de marcar como revisado." : "Write your notes before marking as reviewed.", variant: "destructive" });
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/admin/body-assessments/${selectedAssessment.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          therapistNotes,
          status: "REVIEWED",
        }),
      });
      if (res.ok) {
        const updated = await res.json();
        setSelectedAssessment(updated);
        fetchAssessments();
        toast({ title: locale === "pt-BR" ? "Revisado!" : "Reviewed!", description: locale === "pt-BR" ? "Avaliação marcada como revisada." : "Assessment marked as reviewed." });
      }
    } catch {
      toast({ title: "Error", description: locale === "pt-BR" ? "Falha ao salvar." : "Failed to save.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Keep backward compat for AiChatField onSave callback
  const saveTherapistNotes = saveDraftNotes;

  const deleteAssessment = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/body-assessments/${id}`, { method: "DELETE" });
      if (res.ok) {
        fetchAssessments();
        if (selectedAssessment?.id === id) {
          setShowDetail(false);
          setSelectedAssessment(null);
        }
        toast({ title: "Deleted", description: "Assessment deleted." });
      }
    } catch {
      toast({ title: "Error", description: "Failed to delete.", variant: "destructive" });
    }
  };

  const sendToPatient = async (id: string) => {
    if (!confirm(locale === "pt-BR" ? "Enviar relatório ao paciente? Ele receberá uma notificação por email." : "Send report to patient? They will receive an email notification.")) return;
    try {
      const res = await fetch(`/api/admin/body-assessments/${id}/send-to-patient`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ language: locale }),
      });
      if (res.ok) {
        const updated = await res.json();
        if (selectedAssessment?.id === id) setSelectedAssessment({ ...selectedAssessment, ...updated });
        fetchAssessments();
        toast({ title: locale === "pt-BR" ? "Enviado!" : "Sent!", description: locale === "pt-BR" ? "Relatório enviado ao paciente. Notificação por email disparada." : "Report sent to patient. Email notification dispatched." });
      } else {
        const err = await res.json().catch(() => ({}));
        toast({ title: "Error", description: err.error || "Failed to send.", variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Failed to send.", variant: "destructive" });
    }
  };

  const revokeFromPatient = async (id: string) => {
    if (!confirm(locale === "pt-BR" ? "Revogar envio? O paciente não verá mais este relatório." : "Revoke? The patient will no longer see this report.")) return;
    try {
      const res = await fetch(`/api/admin/body-assessments/${id}/send-to-patient`, {
        method: "DELETE",
      });
      if (res.ok) {
        if (selectedAssessment?.id === id) setSelectedAssessment({ ...selectedAssessment, sentToPatientAt: null, status: "PENDING_REVIEW" });
        fetchAssessments();
        toast({ title: locale === "pt-BR" ? "Revogado" : "Revoked", description: locale === "pt-BR" ? "Relatório removido da área do paciente." : "Report removed from patient's view." });
      } else {
        toast({ title: "Error", description: "Failed to revoke.", variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Failed to revoke.", variant: "destructive" });
    }
  };

  const copyCaptureLink = (token: string) => {
    const url = `${window.location.origin}/capture/${token}`;
    navigator.clipboard.writeText(url);
    toast({ title: "Link Copied", description: "Capture link copied to clipboard." });
  };

  const generateHomeProtocol = async (assessment: Assessment) => {
    setIsGeneratingProtocol(true);
    try {
      const res = await fetch(`/api/admin/body-assessments/${assessment.id}/generate-home-protocol`, {
        method: "POST",
      });
      if (res.ok) {
        const protocol = await res.json();
        setGeneratedProtocol(protocol);
        setShowProtocolReview(true);
        toast({
          title: locale === "pt-BR" ? "Protocolo Gerado como Rascunho" : "Protocol Generated as Draft",
          description: locale === "pt-BR" ? "Revise e edite antes de compartilhar com o paciente." : "Review and edit before sharing with the patient.",
        });
      } else {
        const err = await res.json();
        toast({ title: "Error", description: err.error || "Failed to generate protocol.", variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Failed to generate home protocol.", variant: "destructive" });
    } finally {
      setIsGeneratingProtocol(false);
    }
  };

  const exportExercises = async (assessment: Assessment) => {
    setIsExportingExercises(true);
    try {
      const res = await fetch(`/api/admin/body-assessments/${assessment.id}/export-exercises`, {
        method: "POST",
      });
      if (res.ok) {
        const data = await res.json();
        toast({
          title: "Exercises Exported",
          description: `${data.created} new exercise(s) prescribed${data.alreadyExisted > 0 ? `, ${data.alreadyExisted} already existed` : ""}. Patient can now see them in their exercises page.`,
        });
      } else {
        const err = await res.json();
        toast({ title: "Error", description: err.error || "Failed to export exercises.", variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Failed to export exercises.", variant: "destructive" });
    } finally {
      setIsExportingExercises(false);
    }
  };

  const handleDirectCapture = async (result: BodyCaptureResult) => {
    if (!selectedAssessment?.captureToken) return;
    setIsCaptureUploading(true);
    try {
      const views = ["front", "back", "left", "right"] as const;
      for (const view of views) {
        const photo = result.photos[view];
        if (!photo) continue;
        const formData = new FormData();
        const blob = await fetch(photo.imageData).then(r => r.blob());
        formData.append("image", blob, `${view}.jpg`);
        formData.append("view", view);
        formData.append("landmarks", JSON.stringify(photo.landmarks));
        await fetch(`/api/body-assessments/capture/${selectedAssessment.captureToken}`, {
          method: "PUT",
          body: formData,
        });
      }
      for (const vid of result.videos) {
        const formData = new FormData();
        formData.append("movementVideo", vid.blob, `${vid.testType}.webm`);
        formData.append("testType", vid.testType);
        formData.append("label", vid.label);
        formData.append("duration", String(vid.duration));
        await fetch(`/api/body-assessments/capture/${selectedAssessment.captureToken}`, {
          method: "PUT",
          body: formData,
        });
      }
      // Advance status to PENDING_ANALYSIS after all uploads
      await fetch(`/api/admin/body-assessments/${selectedAssessment.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "PENDING_ANALYSIS" }),
      });
      toast({ title: "Capture Complete!", description: "Images and videos saved successfully." });
      setShowCameraCapture(false);
      // Refresh
      const res = await fetch(`/api/admin/body-assessments/${selectedAssessment.id}`);
      if (res.ok) {
        const full = await res.json();
        setSelectedAssessment(full);
        fetchAssessments();
      }
    } catch (error) {
      console.error(error);
      toast({ title: "Error", description: "Failed to upload captures.", variant: "destructive" });
    } finally {
      setIsCaptureUploading(false);
    }
  };

  const handlePhotoUpload = async (assessmentId: string, view: string, file: File) => {
    setIsUploadingPhoto(true);
    setUploadingView(view);
    try {
      const formData = new FormData();
      formData.append("image", file);
      formData.append("view", view);
      const res = await fetch(`/api/admin/body-assessments/${assessmentId}/upload-photo`, {
        method: "POST",
        body: formData,
      });
      if (res.ok) {
        const data = await res.json();
        setSelectedAssessment(data.assessment);
        fetchAssessments();
        toast({ title: "Photo Uploaded", description: `${view.charAt(0).toUpperCase() + view.slice(1)} view uploaded successfully.` });
      } else {
        const err = await res.json();
        toast({ title: "Error", description: err.error || "Failed to upload photo.", variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Failed to upload photo.", variant: "destructive" });
    } finally {
      setIsUploadingPhoto(false);
      setUploadingView(null);
    }
  };

  const viewDetail = async (assessment: Assessment) => {
    // Fetch full detail
    try {
      const res = await fetch(`/api/admin/body-assessments/${assessment.id}`);
      if (res.ok) {
        const full = await res.json();
        setSelectedAssessment(full);
        setTherapistNotes(full.therapistNotes || "");
        setDetailTab("overview");
        setShowDetail(true);
      }
    } catch {
      setSelectedAssessment(assessment);
      setTherapistNotes(assessment.therapistNotes || "");
      setShowDetail(true);
    }
  };

  // Stats
  const stats = {
    total: assessments.length,
    pending: assessments.filter((a) => a.status === "PENDING_CAPTURE" || a.status === "CAPTURING").length,
    analysis: assessments.filter((a) => a.status === "PENDING_ANALYSIS" || a.status === "ANALYZING").length,
    review: assessments.filter((a) => a.status === "PENDING_REVIEW").length,
    completed: assessments.filter((a) => a.status === "COMPLETED" || a.status === "REVIEWED").length,
  };

  // DETAIL VIEW
  if (showDetail && selectedAssessment) {
    const a = selectedAssessment;
    const sc = STATUS_CONFIG[a.status] || STATUS_CONFIG.PENDING_CAPTURE;
    const capturedViews = [a.frontImageUrl, a.backImageUrl, a.leftImageUrl, a.rightImageUrl].filter(Boolean).length;
    const videoCount = Array.isArray(a.movementVideos) ? a.movementVideos.length : 0;
    const WORKFLOW_STEPS = [
      { key: "PENDING_CAPTURE", label: "Capture", icon: Camera },
      { key: "PENDING_ANALYSIS", label: "AI Analysis", icon: Brain },
      { key: "PENDING_REVIEW", label: "Review", icon: ClipboardList },
      { key: "COMPLETED", label: "Completed", icon: CheckCircle2 },
    ];
    const statusOrder = ["PENDING_CAPTURE", "CAPTURING", "PENDING_ANALYSIS", "ANALYZING", "PENDING_REVIEW", "REVIEWED", "COMPLETED"];
    const currentIdx = statusOrder.indexOf(a.status);
    const getStepStatus = (stepKey: string) => {
      const stepMap: Record<string, number> = { PENDING_CAPTURE: 0, PENDING_ANALYSIS: 2, PENDING_REVIEW: 4, COMPLETED: 6 };
      const stepIdx = stepMap[stepKey] ?? 0;
      if (currentIdx >= stepIdx + 1) return "done";
      if (currentIdx >= stepIdx) return "active";
      return "pending";
    };

    // Remote capture session mode
    if (showRemoteCapture && a.captureToken) {
      return (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => setShowRemoteCapture(false)}>
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-xl font-bold">{locale === "pt-BR" ? "Captura Remota" : "Remote Capture"} — {a.assessmentNumber}</h1>
              <p className="text-sm text-muted-foreground">{a.patient.firstName} {a.patient.lastName}</p>
            </div>
          </div>
          <RemoteCaptureSession
            assessmentId={a.id}
            captureToken={a.captureToken}
            patientName={`${a.patient.firstName} ${a.patient.lastName}`}
            patientEmail={a.patient.email}
            locale={locale}
            onClose={() => {
              setShowRemoteCapture(false);
              viewDetail(a); // Refresh data
            }}
            onPhotosReceived={() => {
              fetchAssessments();
            }}
          />
        </div>
      );
    }

    // Camera capture mode
    if (showCameraCapture) {
      return (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => setShowCameraCapture(false)}>
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-xl font-bold">Direct Capture — {a.assessmentNumber}</h1>
              <p className="text-sm text-muted-foreground">{a.patient.firstName} {a.patient.lastName}</p>
            </div>
            {isCaptureUploading && <Loader2 className="h-5 w-5 animate-spin text-primary" />}
          </div>
          <BodyCapture
            onComplete={handleDirectCapture}
            onCancel={() => setShowCameraCapture(false)}
          />
        </div>
      );
    }

    const TAB_CONFIG = [
      { id: "overview" as const, label: "Overview", icon: LayoutGrid },
      { id: "metrics" as const, label: "Body Metrics", icon: Heart },
      { id: "images" as const, label: "Images", icon: ImageIcon },
      { id: "videos" as const, label: "Videos", icon: Video },
      { id: "annotate" as const, label: "Tools", icon: Pencil },
      { id: "analysis" as const, label: "AI Analysis", icon: Brain },
      { id: "notes" as const, label: "Notes", icon: StickyNote },
      ...(a.segmentScores ? [{ id: "3dmodel" as const, label: locale === "pt-BR" ? "Modelo 3D" : "3D Model", icon: Eye }] : []),
    ];

    return (
      <div className="space-y-6">
        {/* Modern Header */}
        <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 p-6 text-white">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBvcGFjaXR5PSIwLjEiPjxjaXJjbGUgY3g9IjIwIiBjeT0iMjAiIHI9IjEiIGZpbGw9IndoaXRlIi8+PC9nPjwvc3ZnPg==')] opacity-30" />
          <div className="relative flex items-start justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => setShowDetail(false)} className="text-white hover:bg-white/20 -ml-2">
                <ChevronLeft className="h-5 w-5" />
              </Button>
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <h1 className="text-2xl font-bold tracking-tight">{a.assessmentNumber}</h1>
                  <Badge className="bg-white/20 text-white border-white/30 backdrop-blur-sm">{sc.label}</Badge>
                </div>
                <div className="flex items-center gap-3 text-blue-100 text-sm">
                  <span className="flex items-center gap-1"><User className="h-3.5 w-3.5" /> {a.patient.firstName} {a.patient.lastName}</span>
                  <span className="flex items-center gap-1"><Mail className="h-3.5 w-3.5" /> {a.patient.email}</span>
                  <span className="flex items-center gap-1"><CalendarDays className="h-3.5 w-3.5" /> {new Date(a.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {a.captureToken && (
                <Button size="sm" className="bg-white text-indigo-700 hover:bg-blue-50 font-semibold" onClick={() => setShowRemoteCapture(true)}>
                  <Smartphone className="h-4 w-4 mr-2" /> {locale === "pt-BR" ? "Captura Remota" : "Remote Capture"}
                </Button>
              )}
              {a.status === "PENDING_CAPTURE" && (
                <Button size="sm" className="bg-white/20 text-white hover:bg-white/30 font-semibold" onClick={() => setShowCameraCapture(true)}>
                  <Camera className="h-4 w-4 mr-2" /> {locale === "pt-BR" ? "Captura Direta" : "Direct Capture"}
                </Button>
              )}
              {a.captureToken && (
                <Button variant="ghost" size="sm" className="text-white hover:bg-white/20" onClick={() => copyCaptureLink(a.captureToken!)}>
                  <Copy className="h-4 w-4 mr-1.5" /> Link
                </Button>
              )}
              {(a.status === "PENDING_ANALYSIS" || a.status === "PENDING_REVIEW") && (
                <Button size="sm" className="bg-white text-indigo-700 hover:bg-blue-50 font-semibold" onClick={() => runAiAnalysis(a)} disabled={isAnalyzing}>
                  {isAnalyzing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
                  {isAnalyzing ? "Analyzing..." : "AI Analysis"}
                </Button>
              )}
              {a.correctiveExercises && a.correctiveExercises.length > 0 && (
                <>
                  <Button size="sm" className="bg-white/20 text-white hover:bg-white/30 font-semibold" onClick={() => generateHomeProtocol(a)} disabled={isGeneratingProtocol}>
                    {isGeneratingProtocol ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Home className="h-4 w-4 mr-2" />}
                    {isGeneratingProtocol ? "Generating..." : "Home Protocol"}
                  </Button>
                  <Button size="sm" className="bg-white/20 text-white hover:bg-white/30 font-semibold" onClick={() => exportExercises(a)} disabled={isExportingExercises}>
                    {isExportingExercises ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <ClipboardCheck className="h-4 w-4 mr-2" />}
                    {isExportingExercises ? "Exporting..." : "Export Exercises"}
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* Workflow Stepper */}
          <div className="relative mt-6 flex items-center justify-between">
            {WORKFLOW_STEPS.map((step, i) => {
              const status = getStepStatus(step.key);
              const StepIcon = step.icon;
              return (
                <div key={step.key} className="flex items-center flex-1">
                  <div className="flex flex-col items-center gap-1 z-10">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                      status === "done" ? "bg-white text-indigo-700" :
                      status === "active" ? "bg-white/90 text-indigo-700 ring-4 ring-white/30 scale-110" :
                      "bg-white/15 text-white/60"
                    }`}>
                      {status === "done" ? <CheckCircle2 className="h-5 w-5" /> : <StepIcon className="h-5 w-5" />}
                    </div>
                    <span className={`text-xs font-medium ${status === "pending" ? "text-white/50" : "text-white"}`}>{step.label}</span>
                  </div>
                  {i < WORKFLOW_STEPS.length - 1 && (
                    <div className="flex-1 mx-2 relative">
                      <div className="h-0.5 bg-white/20 w-full rounded-full" />
                      <div className={`absolute top-0 left-0 h-0.5 rounded-full transition-all duration-500 ${
                        status === "done" ? "bg-white w-full" : status === "active" ? "bg-white/60 w-1/2" : "w-0"
                      }`} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Tab navigation with icons */}
        <div className="flex gap-1 border-b">
          {TAB_CONFIG.map((tab) => {
            const TabIcon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setDetailTab(tab.id)}
                className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                  detailTab === tab.id ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                <TabIcon className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* OVERVIEW TAB */}
        {detailTab === "overview" && (
          <div className="space-y-6">
            {/* Quick Stats Row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card className="border-l-4 border-l-blue-500">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Photos</p>
                      <p className="text-2xl font-bold mt-1">{capturedViews}<span className="text-sm text-muted-foreground font-normal">/4</span></p>
                    </div>
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${capturedViews === 4 ? "bg-green-100 text-green-600" : "bg-blue-100 text-blue-600"}`}>
                      <Camera className="h-5 w-5" />
                    </div>
                  </div>
                  {capturedViews < 4 && <p className="text-xs text-muted-foreground mt-2">{4 - capturedViews} views remaining</p>}
                </CardContent>
              </Card>

              <Card className="border-l-4 border-l-purple-500">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Videos</p>
                      <p className="text-2xl font-bold mt-1">{videoCount}</p>
                    </div>
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${videoCount > 0 ? "bg-purple-100 text-purple-600" : "bg-gray-100 text-gray-400"}`}>
                      <Video className="h-5 w-5" />
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">{videoCount > 0 ? "Functional tests" : "None recorded"}</p>
                </CardContent>
              </Card>

              <Card className="border-l-4 border-l-amber-500">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">AI Analysis</p>
                      <p className="text-2xl font-bold mt-1">{a.aiProcessedAt ? "✓" : "—"}</p>
                    </div>
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${a.aiProcessedAt ? "bg-green-100 text-green-600" : "bg-amber-100 text-amber-600"}`}>
                      <Brain className="h-5 w-5" />
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">{a.aiProcessedAt ? new Date(a.aiProcessedAt).toLocaleDateString() : "Pending"}</p>
                </CardContent>
              </Card>

              <Card className="border-l-4 border-l-green-500">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Score</p>
                      <p className="text-2xl font-bold mt-1">{a.overallScore != null ? Math.round(a.overallScore) : "—"}<span className="text-sm text-muted-foreground font-normal">/100</span></p>
                    </div>
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      a.overallScore != null
                        ? a.overallScore >= 80 ? "bg-green-100 text-green-600" : a.overallScore >= 60 ? "bg-amber-100 text-amber-600" : "bg-red-100 text-red-600"
                        : "bg-gray-100 text-gray-400"
                    }`}>
                      <Target className="h-5 w-5" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Scores */}
            {a.overallScore != null && (
              <AssessmentScores
                postureScore={a.postureScore}
                symmetryScore={a.symmetryScore}
                mobilityScore={a.mobilityScore}
                overallScore={a.overallScore}
              />
            )}

            {/* Treatment Priorities */}
            {a.segmentScores && (
              <TreatmentPriorities
                segmentScores={a.segmentScores}
                aiFindings={a.aiFindings}
                overallScore={a.overallScore}
                locale={locale}
              />
            )}

            {/* Progress Chart (if patient has multiple assessments) */}
            {assessments.filter(x => x.patientId === a.patientId && x.overallScore != null).length >= 2 && (
              <AssessmentProgressChart
                assessments={assessments.filter(x => x.patientId === a.patientId)}
                locale={locale}
              />
            )}

            {/* Segment Scores */}
            {a.segmentScores && (
              <SegmentScores
                segmentScores={a.segmentScores}
                overallScore={a.overallScore || undefined}
                frontImageUrl={a.frontImageUrl}
                backImageUrl={a.backImageUrl}
                frontLandmarks={a.frontLandmarks}
                backLandmarks={a.backLandmarks}
                locale={locale}
              />
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Postural Analysis — Real photos with biomechanical lines */}
              <PosturalComparisonView
                frontImageUrl={a.frontImageUrl}
                backImageUrl={a.backImageUrl}
                frontLandmarks={a.frontLandmarks}
                backLandmarks={a.backLandmarks}
                segmentScores={a.segmentScores}
                postureScore={a.postureScore}
                locale={locale}
              />

              {/* Muscle Imbalance Summary (text-based, replaces avatar) */}
              {a.postureAnalysis?.muscleHypotheses && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Activity className="h-4 w-4 text-primary" /> {locale === "pt-BR" ? "Desequilíbrios Musculares" : "Muscle Imbalances"}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {a.postureAnalysis.muscleHypotheses.hypertonic?.length > 0 && (
                      <div className="space-y-1.5">
                        <p className="text-xs font-semibold text-red-400 flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-red-500" />
                          {locale === "pt-BR" ? "Hipertonia (Tenso/Hiperativo)" : "Hypertonia (Tight/Overactive)"}
                        </p>
                        {a.postureAnalysis.muscleHypotheses.hypertonic.map((m: any, i: number) => (
                          <div key={i} className="flex items-center gap-2 text-xs bg-red-500/5 border border-red-500/20 rounded-lg px-2.5 py-1.5">
                            <span className="font-medium text-foreground">{m.muscle}</span>
                            <Badge variant="outline" className="text-[9px] h-4 border-red-500/30 text-red-400">{m.side || "bilateral"}</Badge>
                            {m.severity && <Badge variant="outline" className="text-[9px] h-4">{m.severity}</Badge>}
                          </div>
                        ))}
                      </div>
                    )}
                    {a.postureAnalysis.muscleHypotheses.hypotonic?.length > 0 && (
                      <div className="space-y-1.5">
                        <p className="text-xs font-semibold text-blue-400 flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-blue-500" />
                          {locale === "pt-BR" ? "Hipotonia (Fraco/Hipoativo)" : "Hypotonia (Weak/Underactive)"}
                        </p>
                        {a.postureAnalysis.muscleHypotheses.hypotonic.map((m: any, i: number) => (
                          <div key={i} className="flex items-center gap-2 text-xs bg-blue-500/5 border border-blue-500/20 rounded-lg px-2.5 py-1.5">
                            <span className="font-medium text-foreground">{m.muscle}</span>
                            <Badge variant="outline" className="text-[9px] h-4 border-blue-500/30 text-blue-400">{m.side || "bilateral"}</Badge>
                            {m.severity && <Badge variant="outline" className="text-[9px] h-4">{m.severity}</Badge>}
                          </div>
                        ))}
                      </div>
                    )}
                    {a.postureAnalysis.muscleHypotheses.summary && (
                      <p className="text-xs text-muted-foreground border-t border-white/5 pt-2">{a.postureAnalysis.muscleHypotheses.summary}</p>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Right column */}
              <div className="space-y-4">
                {/* Quick Actions */}
                {(a.status === "PENDING_CAPTURE" || capturedViews < 4) && (
                  <Card className="border-dashed border-2 border-primary/30 bg-primary/5">
                    <CardContent className="p-5">
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                          <Camera className="h-6 w-6 text-primary" />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold text-sm">Image Capture</h3>
                          <p className="text-xs text-muted-foreground mt-1">Use your device camera to capture postural photos and record functional tests.</p>
                          <div className="flex flex-wrap gap-2 mt-3">
                            <Button size="sm" onClick={() => setShowCameraCapture(true)}>
                              <Camera className="h-4 w-4 mr-1.5" /> Open Camera
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => {
                              const inp = document.createElement("input");
                              inp.type = "file";
                              inp.accept = "image/*";
                              inp.multiple = true;
                              inp.onchange = async (e) => {
                                const files = (e.target as HTMLInputElement).files;
                                if (!files || files.length === 0) return;
                                const viewOrder = ["front", "back", "left", "right"];
                                for (let i = 0; i < Math.min(files.length, 4); i++) {
                                  const defaultVal = String(i + 1);
                                  const assignView = prompt(
                                    `Photo ${i + 1} of ${files.length}: "${files[i].name}"\n\nAssign to which view?\n\n1 = Front\n2 = Back\n3 = Left\n4 = Right`,
                                    defaultVal
                                  );
                                  if (assignView === null) continue; // user cancelled
                                  const viewIdx = parseInt(assignView) - 1;
                                  const view = viewOrder[viewIdx] || viewOrder[i];
                                  await handlePhotoUpload(a.id, view, files[i]);
                                }
                              };
                              inp.click();
                            }}>
                              <Upload className="h-4 w-4 mr-1.5" /> Upload Photos
                            </Button>
                            {a.captureToken && (
                              <Button size="sm" variant="default" className="bg-purple-600 hover:bg-purple-700" onClick={() => setShowRemoteCapture(true)}>
                                <Smartphone className="h-4 w-4 mr-1.5" /> {locale === "pt-BR" ? "📱 Captura Remota" : "📱 Remote Capture"}
                              </Button>
                            )}
                            {a.captureToken && (
                              <Button variant="outline" size="sm" onClick={() => copyCaptureLink(a.captureToken!)}>
                                <Copy className="h-4 w-4 mr-1.5" /> Copy Link
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Captured Images Preview */}
                {capturedViews > 0 && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <ImageIcon className="h-4 w-4 text-primary" /> Captured Images
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-4 gap-2">
                        {["Front", "Back", "Left", "Right"].map((label, i) => {
                          const urls = [a.frontImageUrl, a.backImageUrl, a.leftImageUrl, a.rightImageUrl];
                          return (
                            <div key={label} className="aspect-[3/4] rounded-lg overflow-hidden bg-muted relative group">
                              {urls[i] ? (
                                <>
                                  <img src={urls[i]!} alt={label} className="w-full h-full object-cover" />
                                  <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/60 to-transparent p-1">
                                    <p className="text-[10px] text-white font-medium text-center">{label}</p>
                                  </div>
                                </>
                              ) : (
                                <div className="w-full h-full flex flex-col items-center justify-center">
                                  <Camera className="h-4 w-4 text-muted-foreground" />
                                  <p className="text-[9px] text-muted-foreground mt-1">{label}</p>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                      <Button variant="ghost" size="sm" className="w-full mt-2 text-xs" onClick={() => setDetailTab("images")}>
                        View all images <ArrowRight className="h-3 w-3 ml-1" />
                      </Button>
                    </CardContent>
                  </Card>
                )}

                {/* Photo Quality Panel + Recapture */}
                <PhotoQualityPanel
                  assessment={a}
                  locale={locale}
                  onRequestRecapture={async (views, reason, instructions) => {
                    const res = await fetch(`/api/admin/body-assessments/${a.id}/request-recapture`, {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ views, reason, instructions, language: locale }),
                    });
                    const data = await res.json();
                    if (data.success) {
                      toast({ title: data.message });
                      setSelectedAssessment({ ...a, status: "RECAPTURE_REQUESTED" });
                    } else {
                      toast({ title: locale === "pt-BR" ? "Erro ao solicitar re-captura" : "Error requesting recapture", variant: "destructive" });
                    }
                  }}
                  onReanalyze={async () => {
                    setIsAnalyzing(true);
                    try {
                      const res = await fetch(`/api/admin/body-assessments/${a.id}/analyze`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ language: locale }),
                      });
                      if (res.ok) {
                        const updated = await res.json();
                        setSelectedAssessment({ ...a, ...updated });
                        fetchAssessments();
                        toast({
                          title: locale === "pt-BR" ? "Re-análise concluída!" : "Re-analysis complete!",
                          description: locale === "pt-BR" ? "Scores e achados atualizados com sucesso." : "Scores and findings updated successfully.",
                        });
                      } else {
                        const err = await res.json().catch(() => ({}));
                        toast({ title: "Error", description: err.error || "Analysis failed", variant: "destructive" });
                      }
                    } catch {
                      toast({ title: "Error", description: "Analysis failed", variant: "destructive" });
                    } finally {
                      setIsAnalyzing(false);
                    }
                  }}
                />

                {/* AI Summary — Editable */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-amber-500" /> {locale === "pt-BR" ? "Sumário IA" : "AI Summary"}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <AiChatField
                      value={a.aiSummary || ""}
                      assessmentId={a.id}
                      field="aiSummary"
                      locale={locale}
                      placeholder={locale === "pt-BR" ? "Nenhum sumário gerado ainda. Clique no ícone de chat IA para gerar." : "No summary generated yet. Click the AI chat icon to generate."}
                      rows={5}
                      onSave={async (val) => {
                        await fetch(`/api/admin/body-assessments/${a.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ aiSummary: val }) });
                        setSelectedAssessment({ ...a, aiSummary: val });
                        toast({ title: locale === "pt-BR" ? "Sumário salvo" : "Summary saved" });
                      }}
                    />
                  </CardContent>
                </Card>

                {/* Key Findings */}
                {a.aiFindings && a.aiFindings.length > 0 && (
                  <FindingCards findings={a.aiFindings} compact locale={locale} />
                )}

                {/* Recommendations — Editable */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-green-500" /> {locale === "pt-BR" ? "Recomendações" : "Recommendations"}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <AiChatField
                      value={a.aiRecommendations || ""}
                      assessmentId={a.id}
                      field="aiRecommendations"
                      locale={locale}
                      placeholder={locale === "pt-BR" ? "Nenhuma recomendação ainda. Use o chat IA para gerar." : "No recommendations yet. Use AI chat to generate."}
                      rows={6}
                      onSave={async (val) => {
                        await fetch(`/api/admin/body-assessments/${a.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ aiRecommendations: val }) });
                        setSelectedAssessment({ ...a, aiRecommendations: val });
                        toast({ title: locale === "pt-BR" ? "Recomendações salvas" : "Recommendations saved" });
                      }}
                    />
                  </CardContent>
                </Card>

                {/* No data yet prompt */}
                {!a.aiSummary && capturedViews === 0 && (
                  <Card className="bg-muted/30">
                    <CardContent className="p-6 text-center">
                      <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
                        <Camera className="h-7 w-7 text-muted-foreground" />
                      </div>
                      <h3 className="font-semibold">Awaiting Capture</h3>
                      <p className="text-sm text-muted-foreground mt-1">Capture postural photos to start the biomechanical assessment.</p>
                      <Button className="mt-4" onClick={() => setShowCameraCapture(true)}>
                        <Camera className="h-4 w-4 mr-2" /> Start Capture
                      </Button>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          </div>
        )}

        {/* IMAGES TAB */}
        {detailTab === "images" && (
          <div className="space-y-4">
            {/* Grid Overlay Fullscreen View */}
            <div ref={gridOverlayRef} />
            {gridOverlayView && (() => {
              const viewMap: Record<string, { url: string | null; landmarks: any }> = {
                front: { url: a.frontImageUrl, landmarks: a.frontLandmarks },
                back: { url: a.backImageUrl, landmarks: a.backLandmarks },
                left: { url: a.leftImageUrl, landmarks: a.leftLandmarks },
                right: { url: a.rightImageUrl, landmarks: a.rightLandmarks },
              };
              const gv = viewMap[gridOverlayView];
              if (!gv?.url) return null;
              return (
                <Card>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Grid3x3 className="h-4 w-4 text-blue-500" />
                        {locale === "pt-BR" ? "Grade Postural" : "Postural Grid"} — {gridOverlayView.charAt(0).toUpperCase() + gridOverlayView.slice(1)}
                      </CardTitle>
                      <div className="flex items-center gap-1">
                        {(["front", "back", "left", "right"] as const).map(v => (
                          <Button key={v} variant={gridOverlayView === v ? "default" : "ghost"} size="sm" className="h-7 text-[11px] px-2"
                            onClick={() => viewMap[v]?.url ? setGridOverlayView(v) : null}
                            disabled={!viewMap[v]?.url}
                          >
                            {v.charAt(0).toUpperCase() + v.slice(1)}
                          </Button>
                        ))}
                        <Button variant="ghost" size="sm" className="h-7 text-[11px] ml-2" onClick={() => setGridOverlayView(null)}>
                          ✕ {locale === "pt-BR" ? "Fechar" : "Close"}
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <PosturalGridOverlay
                      imageUrl={gv.url}
                      landmarks={Array.isArray(gv.landmarks) ? gv.landmarks : undefined}
                      view={gridOverlayView}
                      locale={locale}
                    />
                  </CardContent>
                </Card>
              );
            })()}

            {/* Image Cards Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: "Front", view: "front", url: a.frontImageUrl, annotated: a.frontAnnotatedUrl },
              { label: "Back", view: "back", url: a.backImageUrl, annotated: a.backAnnotatedUrl },
              { label: "Left", view: "left", url: a.leftImageUrl, annotated: a.leftAnnotatedUrl },
              { label: "Right", view: "right", url: a.rightImageUrl, annotated: a.rightAnnotatedUrl },
            ].map((img) => (
              <Card key={img.label}>
                <CardHeader className="p-3">
                  <CardTitle className="text-sm flex items-center justify-between">
                    {img.label}
                    <div className="flex items-center gap-0.5">
                      {img.url && (
                        <Button
                          variant={gridOverlayView === img.view ? "default" : "ghost"}
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => setGridOverlayView(gridOverlayView === img.view ? null : img.view as any)}
                          title={locale === "pt-BR" ? "Grade Postural" : "Postural Grid"}
                        >
                          <Grid3x3 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        ref={(el) => { if (fileInputRefs.current) fileInputRefs.current[img.view] = el; }}
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (file) await handlePhotoUpload(a.id, img.view, file);
                          e.target.value = "";
                        }}
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        disabled={isUploadingPhoto && uploadingView === img.view}
                        onClick={() => fileInputRefs.current?.[img.view]?.click()}
                        title={img.url ? "Replace photo" : "Upload photo"}
                      >
                        {isUploadingPhoto && uploadingView === img.view
                          ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          : <Upload className="h-3.5 w-3.5" />}
                      </Button>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-3 pt-0">
                  {img.url ? (
                    <div
                      className="aspect-[3/4] bg-muted rounded-lg overflow-hidden cursor-pointer relative group"
                      onClick={() => setGridOverlayView(img.view as any)}
                    >
                      <img src={img.annotated || img.url} alt={img.label} className="w-full h-full object-cover" />
                      {/* AI Image Annotations — arrows/labels pointing to findings */}
                      {a.postureAnalysis?.imageAnnotations && Array.isArray(a.postureAnalysis.imageAnnotations) && (
                        <>
                          {a.postureAnalysis.imageAnnotations
                            .filter((ann: any) => ann.view === img.view)
                            .map((ann: any, idx: number) => {
                              const sevColor = ann.severity === "severe" ? "bg-red-500 border-red-400" : ann.severity === "moderate" ? "bg-orange-500 border-orange-400" : "bg-blue-500 border-blue-400";
                              const arrowChar = ann.arrowDirection === "up" ? "↑" : ann.arrowDirection === "down" ? "↓" : ann.arrowDirection === "left" ? "←" : "→";
                              return (
                                <div
                                  key={idx}
                                  className="absolute z-10 pointer-events-none"
                                  style={{ left: `${(ann.x || 0.5) * 100}%`, top: `${(ann.y || 0.5) * 100}%`, transform: "translate(-50%, -50%)" }}
                                >
                                  <div className={`${sevColor} text-white text-[7px] leading-tight px-1 py-0.5 rounded border shadow-lg whitespace-nowrap max-w-[80px] text-center`}>
                                    <span className="font-bold">{arrowChar}</span> {ann.label}
                                  </div>
                                </div>
                              );
                            })}
                        </>
                      )}
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <Grid3x3 className="h-6 w-6 text-white" />
                      </div>
                    </div>
                  ) : (
                    <div
                      className="aspect-[3/4] bg-muted rounded-lg flex flex-col items-center justify-center cursor-pointer border-2 border-dashed border-muted-foreground/30 hover:border-primary/50 transition-colors"
                      onClick={() => fileInputRefs.current?.[img.view]?.click()}
                    >
                      <Upload className="h-8 w-8 text-muted-foreground" />
                      <p className="text-xs text-muted-foreground mt-2">Click to upload</p>
                      <p className="text-[10px] text-muted-foreground">{img.label} view</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
            </div>
          </div>
        )}

        {/* VIDEOS TAB */}
        {detailTab === "videos" && (
          <div className="space-y-4">
            {a.movementVideos && Array.isArray(a.movementVideos) && a.movementVideos.length > 0 ? (
              <>
                {/* Enhanced Video Player with skeleton overlay */}
                <VideoSkeletonPlayer
                  videos={a.movementVideos.filter((v: any) => v.videoUrl).map((v: any) => ({
                    videoUrl: v.videoUrl,
                    testType: v.testType,
                    label: v.label || v.testType,
                    duration: v.duration,
                  }))}
                  title="Movement Analysis — Skeleton Overlay"
                />
              </>
            ) : (
              <Card>
                <CardContent className="p-8 text-center">
                  <Camera className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No movement videos recorded yet.</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Videos are captured during the assessment: squat, gait, lunge, balance tests.
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Movement Patterns Analysis (from AI) */}
            {a.movementPatterns && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Movement Pattern Analysis</CardTitle>
                </CardHeader>
                <CardContent>
                  <pre className="text-xs bg-muted p-3 rounded-lg overflow-auto max-h-[300px]">
                    {JSON.stringify(a.movementPatterns, null, 2)}
                  </pre>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* ANNOTATE TAB */}
        {detailTab === "annotate" && (
          <div className="space-y-4">
            {/* Sub-mode tabs */}
            <div className="flex items-center gap-2 border-b pb-2">
              {(["draw", "plumb", "compare"] as const).map((mode) => {
                const labels = { draw: "Annotate / Angles", plumb: "Plumb Line", compare: "Comparison" };
                return (
                  <Button key={mode} variant={annotateMode === mode ? "default" : "outline"} size="sm" onClick={() => setAnnotateMode(mode)}>
                    {labels[mode]}
                  </Button>
                );
              })}
            </div>

            {/* DRAW / ANGLE MODE */}
            {annotateMode === "draw" && (
              <>
                <div className="flex items-center gap-2">
                  {(["front", "back", "left", "right"] as const).map((v) => {
                    const imgUrl = v === "front" ? a.frontImageUrl : v === "back" ? a.backImageUrl : v === "left" ? a.leftImageUrl : a.rightImageUrl;
                    return (
                      <Button key={v} variant={annotateView === v ? "default" : "outline"} size="sm" onClick={() => setAnnotateView(v)} disabled={!imgUrl}>
                        {v.charAt(0).toUpperCase() + v.slice(1)}{imgUrl ? "" : " (N/A)"}
                      </Button>
                    );
                  })}
                </div>
                {(() => {
                  const imgUrl = annotateView === "front" ? a.frontImageUrl : annotateView === "back" ? a.backImageUrl : annotateView === "left" ? a.leftImageUrl : a.rightImageUrl;
                  const lm = annotateView === "front" ? a.frontLandmarks : annotateView === "back" ? a.backLandmarks : annotateView === "left" ? a.leftLandmarks : a.rightLandmarks;
                  if (!imgUrl) return <Card><CardContent className="p-8 text-center"><Camera className="h-12 w-12 text-muted-foreground mx-auto mb-4" /><p className="text-muted-foreground">Nenhuma imagem para esta vista.</p></CardContent></Card>;
                  return (
                    <ImageAnnotator
                      imageUrl={imgUrl}
                      landmarks={Array.isArray(lm) ? lm : undefined}
                      width={700}
                      height={900}
                      onSave={async (anns, autoAngles) => {
                        try {
                          await fetch(`/api/admin/body-assessments/${a.id}`, {
                            method: "PUT",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ therapistFindings: { ...(a.therapistFindings || {}), [`${annotateView}Annotations`]: anns, [`${annotateView}AutoAngles`]: autoAngles } }),
                          });
                          toast({ title: "Annotations saved!", description: `${annotateView} view updated.` });
                        } catch { toast({ title: "Error", description: "Failed to save.", variant: "destructive" }); }
                      }}
                      onExport={async (dataUrl) => {
                        try {
                          await fetch(`/api/admin/body-assessments/${a.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ [`${annotateView}AnnotatedUrl`]: dataUrl }) });
                          toast({ title: "Exported!" });
                        } catch { toast({ title: "Error", variant: "destructive" }); }
                      }}
                    />
                  );
                })()}
              </>
            )}

            {/* PLUMB LINE MODE */}
            {annotateMode === "plumb" && (
              <>
                <div className="flex items-center gap-2">
                  {(["front", "back", "left", "right"] as const).map((v) => {
                    const imgUrl = v === "front" ? a.frontImageUrl : v === "back" ? a.backImageUrl : v === "left" ? a.leftImageUrl : a.rightImageUrl;
                    return (
                      <Button key={v} variant={annotateView === v ? "default" : "outline"} size="sm" onClick={() => setAnnotateView(v)} disabled={!imgUrl}>
                        {v.charAt(0).toUpperCase() + v.slice(1)}{imgUrl ? "" : " (N/A)"}
                      </Button>
                    );
                  })}
                </div>
                {(() => {
                  const imgUrl = annotateView === "front" ? a.frontImageUrl : annotateView === "back" ? a.backImageUrl : annotateView === "left" ? a.leftImageUrl : a.rightImageUrl;
                  const lm = annotateView === "front" ? a.frontLandmarks : annotateView === "back" ? a.backLandmarks : annotateView === "left" ? a.leftLandmarks : a.rightLandmarks;
                  if (!imgUrl) return <Card><CardContent className="p-8 text-center"><Camera className="h-12 w-12 text-muted-foreground mx-auto mb-4" /><p className="text-muted-foreground">Nenhuma imagem para esta vista.</p></CardContent></Card>;
                  return (
                    <PlumbLineOverlay
                      imageUrl={imgUrl}
                      landmarks={Array.isArray(lm) ? lm : undefined}
                      view={annotateView}
                      width={700}
                      height={900}
                      onSave={async (plumbAnalysis) => {
                        try {
                          await fetch(`/api/admin/body-assessments/${a.id}`, {
                            method: "PUT",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ therapistFindings: { ...(a.therapistFindings || {}), [`${annotateView}PlumbLine`]: plumbAnalysis } }),
                          });
                          toast({ title: "Plumb line analysis saved!" });
                        } catch { toast({ title: "Error", variant: "destructive" }); }
                      }}
                      onExport={async (dataUrl) => {
                        try {
                          await fetch(`/api/admin/body-assessments/${a.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ [`${annotateView}AnnotatedUrl`]: dataUrl }) });
                          toast({ title: "Exported!" });
                        } catch { toast({ title: "Error", variant: "destructive" }); }
                      }}
                    />
                  );
                })()}
              </>
            )}

            {/* COMPARISON MODE */}
            {annotateMode === "compare" && (
              <ImageComparison
                images={[
                  { label: "Frontal", url: a.frontImageUrl, landmarks: Array.isArray(a.frontLandmarks) ? a.frontLandmarks : undefined },
                  { label: "Posterior", url: a.backImageUrl, landmarks: Array.isArray(a.backLandmarks) ? a.backLandmarks : undefined },
                  { label: "Lateral Esq", url: a.leftImageUrl, landmarks: Array.isArray(a.leftLandmarks) ? a.leftLandmarks : undefined },
                  { label: "Lateral Dir", url: a.rightImageUrl, landmarks: Array.isArray(a.rightLandmarks) ? a.rightLandmarks : undefined },
                ].filter((img) => img.url !== null)}
                onExport={(dataUrl) => {
                  const link = document.createElement("a");
                  link.download = `comparison-${a.assessmentNumber}.png`;
                  link.href = dataUrl;
                  link.click();
                }}
              />
            )}
          </div>
        )}

        {/* ANALYSIS TAB */}
        {detailTab === "analysis" && (
          <div className="space-y-6">
            {/* Re-run AI Analysis (collapsible) */}
            {a.postureAnalysis && (a.frontImageUrl || a.backImageUrl) && (
              <div className="border rounded-lg overflow-hidden">
                <button
                  onClick={() => setShowAnalysisConfig(!showAnalysisConfig)}
                  className="w-full flex items-center justify-between px-4 py-2.5 text-sm font-medium hover:bg-muted/50 transition-colors"
                >
                  <span className="flex items-center gap-2">
                    <RefreshCw className="h-4 w-4 text-purple-500" />
                    {locale === "pt-BR" ? "Refazer Análise IA" : "Re-run AI Analysis"}
                  </span>
                  <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${showAnalysisConfig ? "rotate-180" : ""}`} />
                </button>
                {showAnalysisConfig && (
                  <div className="px-4 pb-4 pt-1 border-t space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs">{locale === "pt-BR" ? "Idioma da Análise" : "Analysis Language"}</Label>
                        <Select value={analysisLanguage} onValueChange={setAnalysisLanguage}>
                          <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pt-BR">Português (BR)</SelectItem>
                            <SelectItem value="en">English</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-xs">{locale === "pt-BR" ? "Nível de Atividade" : "Activity Level"}</Label>
                        <Select value={activityLevel} onValueChange={setActivityLevel}>
                          <SelectTrigger className="h-9"><SelectValue placeholder={locale === "pt-BR" ? "Selecionar..." : "Select..."} /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="sedentary">{locale === "pt-BR" ? "Sedentário" : "Sedentary"}</SelectItem>
                            <SelectItem value="recreational">{locale === "pt-BR" ? "Recreativo" : "Recreational"}</SelectItem>
                            <SelectItem value="amateur">{locale === "pt-BR" ? "Amador" : "Amateur"}</SelectItem>
                            <SelectItem value="professional">{locale === "pt-BR" ? "Profissional" : "Professional"}</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div>
                      <Label className="text-xs">{locale === "pt-BR" ? "Modalidade Esportiva" : "Sport / Modality"}</Label>
                      <Input className="h-9" placeholder={locale === "pt-BR" ? "Ex: Futebol, Corrida, Musculação..." : "Ex: Football, Running, Weightlifting..."} value={sportModality} onChange={(e) => setSportModality(e.target.value)} />
                    </div>
                    <div>
                      <Label className="text-xs">{locale === "pt-BR" ? "Objetivos" : "Objectives"}</Label>
                      <Input className="h-9" placeholder={locale === "pt-BR" ? "Ex: Reabilitação, Performance, Prevenção..." : "Ex: Rehabilitation, Performance, Prevention..."} value={analysisObjectives} onChange={(e) => setAnalysisObjectives(e.target.value)} />
                    </div>
                    <Button className="w-full" variant="destructive" onClick={() => runAiAnalysis(a)} disabled={isAnalyzing}>
                      {isAnalyzing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
                      {locale === "pt-BR" ? "Refazer Análise (substituirá a atual)" : "Re-run Analysis (will replace current)"}
                    </Button>
                  </div>
                )}
              </div>
            )}

            {a.postureAnalysis ? (
              <>
                {/* ── Multi-View Posture Analysis Panel (Moti Physio-level) ── */}
                {(a.frontImageUrl || a.backImageUrl || a.leftImageUrl || a.rightImageUrl) && (
                  <PostureAnalysisPanel
                    frontImageUrl={a.frontImageUrl}
                    backImageUrl={a.backImageUrl}
                    leftImageUrl={a.leftImageUrl}
                    rightImageUrl={a.rightImageUrl}
                    frontLandmarks={a.frontLandmarks}
                    backLandmarks={a.backLandmarks}
                    leftLandmarks={a.leftLandmarks}
                    rightLandmarks={a.rightLandmarks}
                    deviationLabels={a.deviationLabels || []}
                    idealComparison={a.idealComparison || []}
                    postureAnalysis={a.postureAnalysis}
                    overallScore={a.overallScore}
                    postureScore={a.postureScore}
                    symmetryScore={a.symmetryScore}
                    patientName={a.patient ? `${a.patient.firstName} ${a.patient.lastName}` : undefined}
                    assessmentNumber={a.assessmentNumber}
                    assessmentDate={a.createdAt}
                    locale={locale}
                  />
                )}

                {/* ── 3 Stages of Posture (Standard / Current / Worsened) ── */}
                {a.postureAnalysis && (
                  <PostureStages
                    overallScore={a.overallScore}
                    postureScore={a.postureScore}
                    postureAnalysis={a.postureAnalysis}
                    locale={locale}
                    frontImageUrl={a.frontImageUrl}
                    backImageUrl={a.backImageUrl}
                    leftImageUrl={a.leftImageUrl}
                    rightImageUrl={a.rightImageUrl}
                    frontLandmarks={a.frontLandmarks}
                    backLandmarks={a.backLandmarks}
                    leftLandmarks={a.leftLandmarks}
                    rightLandmarks={a.rightLandmarks}
                  />
                )}


                {/* ── Before/After Angle Comparison ── */}
                {assessments.filter(x => x.patientId === a.patientId && (x.frontImageUrl || x.backImageUrl || x.leftImageUrl || x.rightImageUrl)).length >= 2 && (
                  <BeforeAfterAngles
                    assessments={assessments
                      .filter(x => x.patientId === a.patientId && (x.frontImageUrl || x.backImageUrl))
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

                {/* Skeleton Analysis with view selector */}
                {(a.frontImageUrl || a.backImageUrl || a.leftImageUrl || a.rightImageUrl) && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-semibold">Skeleton Analysis</h3>
                      <div className="flex gap-1.5 ml-auto">
                        {(["front", "back", "left", "right"] as const).map((v) => {
                          const imgUrl = v === "front" ? a.frontImageUrl : v === "back" ? a.backImageUrl : v === "left" ? a.leftImageUrl : a.rightImageUrl;
                          return (
                            <Button key={v} variant={skeletonView === v ? "default" : "outline"} size="sm" className="h-7 text-xs capitalize" onClick={() => setSkeletonView(v)} disabled={!imgUrl}>
                              {v}
                            </Button>
                          );
                        })}
                      </div>
                    </div>
                    {(() => {
                      const imgUrl = skeletonView === "front" ? a.frontImageUrl : skeletonView === "back" ? a.backImageUrl : skeletonView === "left" ? a.leftImageUrl : a.rightImageUrl;
                      const lm = skeletonView === "front" ? a.frontLandmarks : skeletonView === "back" ? a.backLandmarks : skeletonView === "left" ? a.leftLandmarks : a.rightLandmarks;
                      return imgUrl ? (
                        <SkeletonAnalysisOverlay
                          imageUrl={imgUrl}
                          landmarks={Array.isArray(lm) ? lm : undefined}
                          deviationLabels={a.deviationLabels || []}
                          idealComparison={a.idealComparison || []}
                          view={skeletonView}
                          width={600}
                        />
                      ) : null;
                    })()}
                  </div>
                )}

                {/* ── Enhanced Report Sections ── */}

                {/* Proprietary Scores Bar */}
                {a.postureAnalysis?.proprietaryScores && (
                  <Card className="border-l-4 border-l-purple-500">
                    <CardContent className="p-4">
                      <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                        <Zap className="h-4 w-4 text-purple-500" />
                        {locale === "pt-BR" ? "Scores Proprietários" : "Proprietary Scores"}
                      </h3>
                      <div className="grid grid-cols-3 gap-4">
                        {[
                          { label: locale === "pt-BR" ? "Índice Postural Global" : "Global Postural Index", value: a.postureAnalysis.proprietaryScores.globalPosturalIndex, color: "text-blue-500" },
                          { label: locale === "pt-BR" ? "Risco Biomecânico" : "Biomechanical Risk", value: a.postureAnalysis.proprietaryScores.biomechanicalRiskScore, color: "text-red-500", invert: true },
                          { label: locale === "pt-BR" ? "Índice de Assimetria" : "Asymmetry Index", value: a.postureAnalysis.proprietaryScores.bodyAsymmetryIndex, color: "text-orange-500", invert: true },
                        ].map((s: any) => (
                          <div key={s.label} className="text-center">
                            <div className={`text-2xl font-bold ${s.color}`}>{Math.round(s.value || 0)}<span className="text-xs font-normal text-muted-foreground">/100</span></div>
                            <p className="text-[10px] text-muted-foreground mt-0.5">{s.label}</p>
                          </div>
                        ))}
                      </div>
                      {a.postureAnalysis.proprietaryScores.formula && (
                        <p className="text-[10px] text-muted-foreground mt-2 italic">{a.postureAnalysis.proprietaryScores.formula}</p>
                      )}
                    </CardContent>
                  </Card>
                )}

                {/* Confidence Scores */}
                {a.postureAnalysis?.confidenceScores && (
                  <Card>
                    <CardContent className="p-4">
                      <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
                        <Shield className="h-4 w-4 text-cyan-500" />
                        {locale === "pt-BR" ? "Confiança da Análise" : "Analysis Confidence"}
                        <Badge variant="outline" className="ml-auto text-[10px]">
                          {locale === "pt-BR" ? "Global" : "Overall"}: {a.postureAnalysis.confidenceScores.overallConfidence || 0}%
                        </Badge>
                      </h3>
                      <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                        {Object.entries(a.postureAnalysis.confidenceScores.perMeasurement || {}).map(([key, val]: [string, any]) => (
                          <div key={key} className="text-center p-1.5 rounded bg-muted/50">
                            <div className="text-xs font-semibold">{val}%</div>
                            <p className="text-[9px] text-muted-foreground capitalize">{key.replace(/([A-Z])/g, " $1").trim()}</p>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Biomechanical Integration — Editable */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Activity className="h-4 w-4 text-indigo-500" />
                      {locale === "pt-BR" ? "Integração Biomecânica Global" : "Global Biomechanical Integration"}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <AiChatField
                      value={a.postureAnalysis?.biomechanicalIntegration || ""}
                      assessmentId={a.id}
                      field="biomechanicalIntegration"
                      locale={locale}
                      placeholder={locale === "pt-BR" ? "Sem dados. Use o chat IA para gerar." : "No data. Use AI chat to generate."}
                      rows={5}
                      onSave={async (val) => {
                        await fetch(`/api/admin/body-assessments/${a.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ postureAnalysis: { biomechanicalIntegration: val } }) });
                        setSelectedAssessment({ ...a, postureAnalysis: { ...a.postureAnalysis, biomechanicalIntegration: val } });
                        toast({ title: locale === "pt-BR" ? "Salvo" : "Saved" });
                      }}
                    />
                  </CardContent>
                </Card>

                {/* Functional Impact — Editable */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Target className="h-4 w-4 text-amber-500" />
                      {locale === "pt-BR" ? "Impacto Funcional Provável" : "Probable Functional Impact"}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <AiChatField
                      value={a.postureAnalysis?.functionalImpact || ""}
                      assessmentId={a.id}
                      field="functionalImpact"
                      locale={locale}
                      placeholder={locale === "pt-BR" ? "Sem dados. Use o chat IA para gerar." : "No data. Use AI chat to generate."}
                      rows={4}
                      onSave={async (val) => {
                        await fetch(`/api/admin/body-assessments/${a.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ postureAnalysis: { functionalImpact: val } }) });
                        setSelectedAssessment({ ...a, postureAnalysis: { ...a.postureAnalysis, functionalImpact: val } });
                        toast({ title: locale === "pt-BR" ? "Salvo" : "Saved" });
                      }}
                    />
                  </CardContent>
                </Card>

                {/* Muscle Hypotheses */}
                {a.postureAnalysis?.muscleHypotheses && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Zap className="h-4 w-4 text-red-500" />
                        {locale === "pt-BR" ? "Hipóteses Musculares" : "Muscular Hypotheses"}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {a.postureAnalysis.muscleHypotheses.hypertonic?.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold text-red-500 mb-1">{locale === "pt-BR" ? "Hipertonia Provável" : "Probable Hypertonia"}</p>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                            {a.postureAnalysis.muscleHypotheses.hypertonic.map((m: any, i: number) => (
                              <div key={i} className="flex items-center gap-2 text-xs p-1.5 rounded bg-red-500/10 border border-red-500/20">
                                <span className="font-medium">{m.muscle}</span>
                                <Badge variant="outline" className="text-[9px] h-4">{m.side}</Badge>
                                <Badge variant="outline" className="text-[9px] h-4 ml-auto">{m.severity}</Badge>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      {a.postureAnalysis.muscleHypotheses.hypotonic?.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold text-blue-500 mb-1">{locale === "pt-BR" ? "Hipotonia Provável" : "Probable Hypotonia"}</p>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                            {a.postureAnalysis.muscleHypotheses.hypotonic.map((m: any, i: number) => (
                              <div key={i} className="flex items-center gap-2 text-xs p-1.5 rounded bg-blue-500/10 border border-blue-500/20">
                                <span className="font-medium">{m.muscle}</span>
                                <Badge variant="outline" className="text-[9px] h-4">{m.side}</Badge>
                                <Badge variant="outline" className="text-[9px] h-4 ml-auto">{m.severity}</Badge>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      {a.postureAnalysis.muscleHypotheses.summary && (
                        <p className="text-xs text-muted-foreground mt-1">{a.postureAnalysis.muscleHypotheses.summary}</p>
                      )}
                    </CardContent>
                  </Card>
                )}

                {/* Patient Complaint Correlation — Editable */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-yellow-500" />
                      {locale === "pt-BR" ? "Correlação com Queixa do Paciente" : "Patient Complaint Correlation"}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <AiChatField
                      value={a.postureAnalysis?.patientComplaintCorrelation || ""}
                      assessmentId={a.id}
                      field="patientComplaintCorrelation"
                      locale={locale}
                      placeholder={locale === "pt-BR" ? "Sem dados. Use o chat IA para gerar." : "No data. Use AI chat to generate."}
                      rows={4}
                      onSave={async (val) => {
                        await fetch(`/api/admin/body-assessments/${a.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ postureAnalysis: { patientComplaintCorrelation: val } }) });
                        setSelectedAssessment({ ...a, postureAnalysis: { ...a.postureAnalysis, patientComplaintCorrelation: val } });
                        toast({ title: locale === "pt-BR" ? "Salvo" : "Saved" });
                      }}
                    />
                  </CardContent>
                </Card>

                {/* Findings Cards */}
                {a.aiFindings && a.aiFindings.length > 0 && (
                  <FindingCards findings={a.aiFindings} editable locale={locale} onSaveFindings={async (updated) => {
                    try {
                      await fetch(`/api/admin/body-assessments/${a.id}`, {
                        method: "PUT",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ aiFindings: updated }),
                      });
                      setSelectedAssessment({ ...a, aiFindings: updated });
                      toast({ title: locale === "pt-BR" ? "Achados salvos" : "Findings saved" });
                    } catch { toast({ title: "Error", variant: "destructive" }); }
                  }} />
                )}

                {/* Intervention Plan */}
                {a.postureAnalysis?.interventionPlan && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <ClipboardList className="h-4 w-4 text-green-500" />
                        {locale === "pt-BR" ? "Plano de Intervenção Inicial" : "Initial Intervention Plan"}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {(["immediate", "shortTerm", "mediumTerm", "longTerm"] as const).map((phase) => {
                        const items = a.postureAnalysis?.interventionPlan?.[phase];
                        if (!items || !Array.isArray(items) || items.length === 0) return null;
                        const phaseLabels: Record<string, Record<string, string>> = {
                          immediate: { "pt-BR": "Imediato (1-2 sem)", en: "Immediate (1-2 wks)" },
                          shortTerm: { "pt-BR": "Curto Prazo (3-6 sem)", en: "Short Term (3-6 wks)" },
                          mediumTerm: { "pt-BR": "Médio Prazo (7-12 sem)", en: "Medium Term (7-12 wks)" },
                          longTerm: { "pt-BR": "Longo Prazo / Manutenção", en: "Long Term / Maintenance" },
                        };
                        const colors: Record<string, string> = { immediate: "border-red-500/30", shortTerm: "border-orange-500/30", mediumTerm: "border-yellow-500/30", longTerm: "border-green-500/30" };
                        return (
                          <div key={phase} className={`border-l-2 ${colors[phase]} pl-3`}>
                            <p className="text-xs font-semibold mb-1">{phaseLabels[phase][locale === "pt-BR" ? "pt-BR" : "en"]}</p>
                            <ul className="space-y-0.5">
                              {items.map((item: string, i: number) => (
                                <li key={i} className="text-xs text-muted-foreground flex items-start gap-1.5">
                                  <span className="text-primary mt-0.5">•</span>{item}
                                </li>
                              ))}
                            </ul>
                          </div>
                        );
                      })}
                    </CardContent>
                  </Card>
                )}

                {/* Complementary Tests */}
                {a.postureAnalysis?.complementaryTests && Array.isArray(a.postureAnalysis.complementaryTests) && a.postureAnalysis.complementaryTests.length > 0 && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-teal-500" />
                        {locale === "pt-BR" ? "Testes Complementares Sugeridos" : "Suggested Complementary Tests"}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {a.postureAnalysis.complementaryTests.map((t: any, i: number) => (
                          <div key={i} className="flex items-start gap-2 text-xs p-2 rounded bg-muted/50">
                            <Badge variant={t.priority === "high" ? "destructive" : t.priority === "medium" ? "default" : "secondary"} className="text-[9px] h-4 mt-0.5">{t.priority}</Badge>
                            <div>
                              <p className="font-medium">{t.test}</p>
                              <p className="text-muted-foreground">{t.purpose}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Future Risk + Re-evaluation — Editable */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <Card className="border-l-4 border-l-red-500">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-red-500" />
                        {locale === "pt-BR" ? "Risco Mecânico Futuro" : "Future Mechanical Risk"}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <AiChatField
                        value={a.postureAnalysis?.futureRisk || ""}
                        assessmentId={a.id}
                        field="futureRisk"
                        locale={locale}
                        placeholder={locale === "pt-BR" ? "Sem dados. Use o chat IA para gerar." : "No data. Use AI chat to generate."}
                        rows={4}
                        onSave={async (val) => {
                          await fetch(`/api/admin/body-assessments/${a.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ postureAnalysis: { futureRisk: val } }) });
                          setSelectedAssessment({ ...a, postureAnalysis: { ...a.postureAnalysis, futureRisk: val } });
                          toast({ title: locale === "pt-BR" ? "Salvo" : "Saved" });
                        }}
                      />
                    </CardContent>
                  </Card>
                  <Card className="border-l-4 border-l-blue-500">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <CalendarDays className="h-4 w-4 text-blue-500" />
                        {locale === "pt-BR" ? "Cronograma de Reavaliação" : "Re-evaluation Timeline"}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <AiChatField
                        value={a.postureAnalysis?.reEvaluationTimeline || ""}
                        assessmentId={a.id}
                        field="reEvaluationTimeline"
                        locale={locale}
                        placeholder={locale === "pt-BR" ? "Sem dados. Use o chat IA para gerar." : "No data. Use AI chat to generate."}
                        rows={4}
                        onSave={async (val) => {
                          await fetch(`/api/admin/body-assessments/${a.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ postureAnalysis: { reEvaluationTimeline: val } }) });
                          setSelectedAssessment({ ...a, postureAnalysis: { ...a.postureAnalysis, reEvaluationTimeline: val } });
                          toast({ title: locale === "pt-BR" ? "Salvo" : "Saved" });
                        }}
                      />
                    </CardContent>
                  </Card>
                </div>

                {/* Gait Metrics */}
                {a.gaitMetrics && Object.values(a.gaitMetrics).some((v: any) => typeof v === "number" && v > 0) && (
                  <GaitMetrics metrics={a.gaitMetrics} />
                )}

                {/* Scoliosis Panel */}
                {a.postureAnalysis?.scoliosisScreening && a.postureAnalysis.scoliosisScreening.severity !== "none" && (
                  <ScoliosisPanel screening={a.postureAnalysis.scoliosisScreening} />
                )}

                {/* Corrective Exercises */}
                {a.correctiveExercises && a.correctiveExercises.length > 0 && (
                  <CorrectiveExercises exercises={enrichedExercises || a.correctiveExercises} />
                )}

                {/* Scientific References */}
                {a.postureAnalysis?.references && Array.isArray(a.postureAnalysis.references) && a.postureAnalysis.references.length > 0 && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <BookOpen className="h-4 w-4 text-gray-500" />
                        {locale === "pt-BR" ? "Referências Bibliográficas" : "Scientific References"}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-1.5">
                        {a.postureAnalysis.references.map((ref: any, i: number) => (
                          <div key={i} className="text-[11px] leading-relaxed">
                            <span className="text-muted-foreground">[{ref.id}]</span>{" "}
                            <span className="font-medium">{ref.authors}</span>{" "}
                            <span className="text-muted-foreground">({ref.year}).</span>{" "}
                            <span className="italic">{ref.title}.</span>{" "}
                            <span className="text-muted-foreground">{ref.journal}.</span>
                            {ref.relevance && (
                              <span className="text-[10px] text-muted-foreground/70 ml-1">— {ref.relevance}</span>
                            )}
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Technical Notes */}
                {a.postureAnalysis?.technicalNotes && (
                  <Card className="border border-dashed">
                    <CardContent className="p-4">
                      <p className="text-xs text-muted-foreground italic flex items-start gap-2">
                        <FileText className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
                        {a.postureAnalysis.technicalNotes}
                      </p>
                    </CardContent>
                  </Card>
                )}

                {/* Raw Data (collapsible) */}
                <details className="group">
                  <summary className="cursor-pointer text-sm font-medium text-muted-foreground hover:text-foreground flex items-center gap-2 py-2">
                    <FileText className="h-4 w-4" /> Raw Analysis Data
                  </summary>
                  <div className="space-y-4 mt-3">
                    <Card>
                      <CardHeader className="pb-2"><CardTitle className="text-sm">Posture Analysis</CardTitle></CardHeader>
                      <CardContent>
                        <pre className="text-xs bg-muted p-3 rounded-lg overflow-auto max-h-[300px]">{JSON.stringify(a.postureAnalysis, null, 2)}</pre>
                      </CardContent>
                    </Card>
                    {a.jointAngles && (
                      <Card>
                        <CardHeader className="pb-2"><CardTitle className="text-sm">Joint Angles</CardTitle></CardHeader>
                        <CardContent>
                          <pre className="text-xs bg-muted p-3 rounded-lg overflow-auto max-h-[300px]">{JSON.stringify(a.jointAngles, null, 2)}</pre>
                        </CardContent>
                      </Card>
                    )}
                    {a.kineticChain && (
                      <Card>
                        <CardHeader className="pb-2"><CardTitle className="text-sm">Kinetic Chain</CardTitle></CardHeader>
                        <CardContent>
                          <pre className="text-xs bg-muted p-3 rounded-lg overflow-auto max-h-[300px]">{JSON.stringify(a.kineticChain, null, 2)}</pre>
                        </CardContent>
                      </Card>
                    )}
                    {a.segmentScores && (
                      <Card>
                        <CardHeader className="pb-2"><CardTitle className="text-sm">Segment Scores</CardTitle></CardHeader>
                        <CardContent>
                          <pre className="text-xs bg-muted p-3 rounded-lg overflow-auto max-h-[300px]">{JSON.stringify(a.segmentScores, null, 2)}</pre>
                        </CardContent>
                      </Card>
                    )}
                    {a.gaitMetrics && (
                      <Card>
                        <CardHeader className="pb-2"><CardTitle className="text-sm">Gait Metrics</CardTitle></CardHeader>
                        <CardContent>
                          <pre className="text-xs bg-muted p-3 rounded-lg overflow-auto max-h-[300px]">{JSON.stringify(a.gaitMetrics, null, 2)}</pre>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                </details>
              </>
            ) : (
              <Card>
                <CardContent className="p-6 space-y-4">
                  <div className="text-center mb-2">
                    <Brain className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                    <p className="text-muted-foreground">{locale === "pt-BR" ? "Nenhuma análise de IA ainda." : "No AI analysis yet."}</p>
                  </div>
                  {(a.frontImageUrl || a.backImageUrl) && (
                    <div className="space-y-3 max-w-md mx-auto">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label className="text-xs">{locale === "pt-BR" ? "Idioma da Análise" : "Analysis Language"}</Label>
                          <Select value={analysisLanguage} onValueChange={setAnalysisLanguage}>
                            <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="pt-BR">Português (BR)</SelectItem>
                              <SelectItem value="en">English</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label className="text-xs">{locale === "pt-BR" ? "Nível de Atividade" : "Activity Level"}</Label>
                          <Select value={activityLevel} onValueChange={setActivityLevel}>
                            <SelectTrigger className="h-9"><SelectValue placeholder={locale === "pt-BR" ? "Selecionar..." : "Select..."} /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="sedentary">{locale === "pt-BR" ? "Sedentário" : "Sedentary"}</SelectItem>
                              <SelectItem value="recreational">{locale === "pt-BR" ? "Recreativo" : "Recreational"}</SelectItem>
                              <SelectItem value="amateur">{locale === "pt-BR" ? "Amador" : "Amateur"}</SelectItem>
                              <SelectItem value="professional">{locale === "pt-BR" ? "Profissional" : "Professional"}</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div>
                        <Label className="text-xs">{locale === "pt-BR" ? "Modalidade Esportiva" : "Sport / Modality"}</Label>
                        <Input className="h-9" placeholder={locale === "pt-BR" ? "Ex: Futebol, Corrida, Musculação..." : "Ex: Football, Running, Weightlifting..."} value={sportModality} onChange={(e) => setSportModality(e.target.value)} />
                      </div>
                      <div>
                        <Label className="text-xs">{locale === "pt-BR" ? "Objetivos" : "Objectives"}</Label>
                        <Input className="h-9" placeholder={locale === "pt-BR" ? "Ex: Reabilitação, Performance, Prevenção..." : "Ex: Rehabilitation, Performance, Prevention..."} value={analysisObjectives} onChange={(e) => setAnalysisObjectives(e.target.value)} />
                      </div>
                      <Button className="w-full" onClick={() => runAiAnalysis(a)} disabled={isAnalyzing}>
                        {isAnalyzing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Brain className="h-4 w-4 mr-2" />}
                        {locale === "pt-BR" ? "Executar Análise IA" : "Run AI Analysis"}
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* BODY METRICS TAB */}
        {detailTab === "metrics" && (
          <BodyMetricsTab
            assessment={a}
            locale={locale}
            onSave={async (data: any) => {
              try {
                const res = await fetch(`/api/admin/body-assessments/${a.id}`, {
                  method: "PUT",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify(data),
                });
                if (res.ok) {
                  const updated = await res.json();
                  setSelectedAssessment(updated);
                  toast({ title: "Saved", description: "Body metrics updated successfully." });
                } else {
                  toast({ title: "Error", description: "Failed to save metrics.", variant: "destructive" });
                }
              } catch {
                toast({ title: "Error", description: "Failed to save metrics.", variant: "destructive" });
              }
            }}
          />
        )}

        {/* NOTES TAB */}
        {detailTab === "notes" && (
          <div className="space-y-4">
            {/* Language selector + Preview toggle */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">{locale === "pt-BR" ? "Idioma das notas:" : "Notes language:"}</span>
                <div className="flex rounded-lg border overflow-hidden">
                  <button
                    className={`px-3 py-1.5 text-xs font-medium transition-colors ${notesLang === "pt-BR" ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
                    onClick={() => setNotesLang("pt-BR")}
                  >
                    Português
                  </button>
                  <button
                    className={`px-3 py-1.5 text-xs font-medium transition-colors ${notesLang === "en" ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
                    onClick={() => setNotesLang("en")}
                  >
                    English
                  </button>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant={showNotesPreview ? "default" : "outline"}
                  size="sm"
                  className="text-xs gap-1.5"
                  onClick={() => setShowNotesPreview(!showNotesPreview)}
                >
                  <Eye className="h-3.5 w-3.5" />
                  {locale === "pt-BR" ? "Preview Paciente" : "Patient Preview"}
                </Button>
              </div>
            </div>

            {/* Patient Preview */}
            {showNotesPreview && therapistNotes && (
              <Card className="border-blue-500/30 bg-blue-500/5">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Eye className="h-4 w-4 text-blue-500" />
                    {locale === "pt-BR" ? "Assim o paciente verá:" : "Patient will see:"}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="prose prose-sm dark:prose-invert max-w-none text-sm leading-relaxed whitespace-pre-wrap">
                    {therapistNotes.split("\n").map((line, i) => {
                      if (line.startsWith("## ")) return <h3 key={i} className="text-base font-bold mt-3 mb-1">{line.replace("## ", "")}</h3>;
                      if (line.startsWith("**") && line.endsWith("**")) return <p key={i} className="font-bold mt-2 mb-0.5">{line.replace(/\*\*/g, "")}</p>;
                      if (line.startsWith("- ") || line.startsWith("* ")) return <p key={i} className="ml-4 text-muted-foreground">• {line.replace(/^[-*]\s/, "")}</p>;
                      if (line.trim() === "") return <br key={i} />;
                      return <p key={i} className="text-muted-foreground">{line.replace(/\*\*(.*?)\*\*/g, "$1")}</p>;
                    })}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* AI Chat Notes Editor */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base">
                      {notesLang === "pt-BR" ? "Notas do Terapeuta" : "Therapist Notes"}
                    </CardTitle>
                    <CardDescription>
                      {notesLang === "pt-BR"
                        ? "Converse com a IA (texto ou voz) para co-escrever suas notas clínicas"
                        : "Chat with AI (text or voice) to co-write your clinical notes"}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <AiChatField
                  value={therapistNotes}
                  onChange={setTherapistNotes}
                  onSave={async (val) => {
                    setTherapistNotes(val);
                    await saveTherapistNotes();
                  }}
                  assessmentId={a.id}
                  field="therapistNotes"
                  label={notesLang === "pt-BR" ? "Notas Clínicas" : "Clinical Notes"}
                  rows={14}
                />
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={saveDraftNotes} disabled={isSubmitting}>
                    {isSubmitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                    {notesLang === "pt-BR" ? "Salvar Rascunho" : "Save Draft"}
                  </Button>
                  <Button onClick={markAsReviewed} disabled={isSubmitting || a.status === "REVIEWED" || a.status === "COMPLETED"}>
                    {isSubmitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
                    {a.status === "REVIEWED" || a.status === "COMPLETED"
                      ? (notesLang === "pt-BR" ? "✓ Revisado" : "✓ Reviewed")
                      : (notesLang === "pt-BR" ? "Marcar como Revisado" : "Mark as Reviewed")}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* ── Report Actions: Download PDF / Share / Revoke ── */}
            {a.postureAnalysis && (
              <Card className="border-purple-500/30 bg-purple-500/5">
                <CardContent className="p-4 space-y-3">
                  <p className="font-semibold text-sm flex items-center gap-2">
                    <Send className="h-4 w-4 text-purple-500" />
                    {locale === "pt-BR" ? "Ações do Relatório" : "Report Actions"}
                  </p>

                  {/* Status indicator */}
                  {a.sentToPatientAt ? (
                    <div className="flex items-center gap-2 text-xs text-green-600 bg-green-500/10 border border-green-500/20 rounded-md px-3 py-1.5">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      {locale === "pt-BR" ? "Compartilhado com o paciente em " : "Shared with patient on "}
                      {new Date(a.sentToPatientAt).toLocaleString(locale === "pt-BR" ? "pt-BR" : "en-GB")}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      {locale === "pt-BR"
                        ? "Revise o relatório antes de compartilhar. O paciente só verá quando você enviar."
                        : "Review the report before sharing. Patient will only see it when you send."}
                    </p>
                  )}

                  <div className="flex flex-wrap gap-2">
                    {/* Download PDF — with error handling */}
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs gap-1.5"
                      disabled={isDownloadingPdf}
                      onClick={async () => {
                        setIsDownloadingPdf(true);
                        try {
                          const res = await fetch(`/api/body-assessments/${a.id}/report-pdf`);
                          if (!res.ok) {
                            const err = await res.json().catch(() => ({ error: "Unknown error" }));
                            toast({ title: locale === "pt-BR" ? "Erro no PDF" : "PDF Error", description: err.error || (locale === "pt-BR" ? "Falha ao gerar PDF. Tente novamente." : "Failed to generate PDF. Please try again."), variant: "destructive" });
                            return;
                          }
                          const blob = await res.blob();
                          const url = URL.createObjectURL(blob);
                          const link = document.createElement("a");
                          link.href = url;
                          link.download = `body-assessment-${a.assessmentNumber}.pdf`;
                          link.click();
                          URL.revokeObjectURL(url);
                          toast({ title: locale === "pt-BR" ? "PDF baixado!" : "PDF downloaded!" });
                        } catch {
                          toast({ title: locale === "pt-BR" ? "Erro no PDF" : "PDF Error", description: locale === "pt-BR" ? "Falha na conexão. Tente novamente." : "Connection failed. Please try again.", variant: "destructive" });
                        } finally {
                          setIsDownloadingPdf(false);
                        }
                      }}
                    >
                      {isDownloadingPdf ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
                      {locale === "pt-BR" ? "Baixar PDF" : "Download PDF"}
                    </Button>

                    {/* Share with Patient — opens confirmation dialog */}
                    <Button
                      variant={a.sentToPatientAt ? "outline" : "default"}
                      size="sm"
                      className={`text-xs gap-1.5 ${!a.sentToPatientAt ? "bg-purple-600 hover:bg-purple-700" : ""}`}
                      onClick={() => setShowShareDialog(true)}
                    >
                      <Send className="h-3.5 w-3.5" />
                      {a.sentToPatientAt
                        ? (locale === "pt-BR" ? "Reenviar / Compartilhar" : "Resend / Share")
                        : (locale === "pt-BR" ? "Compartilhar com Paciente" : "Share with Patient")}
                    </Button>

                    {/* Revoke from Patient */}
                    {a.sentToPatientAt && (
                      <Button
                        variant="destructive"
                        size="sm"
                        className="text-xs gap-1.5"
                        disabled={isSendingToPatient}
                        onClick={async () => {
                          if (!confirm(locale === "pt-BR"
                            ? "Tem certeza? O paciente não poderá mais ver este relatório."
                            : "Are you sure? Patient will no longer be able to see this report.")) return;
                          setIsSendingToPatient(true);
                          try {
                            const res = await fetch(`/api/admin/body-assessments/${a.id}/send-to-patient`, {
                              method: "DELETE",
                            });
                            if (res.ok) {
                              setSelectedAssessment({ ...a, sentToPatientAt: null, status: "PENDING_REVIEW" });
                              fetchAssessments();
                              toast({ title: locale === "pt-BR" ? "Relatório revogado" : "Report revoked", description: locale === "pt-BR" ? "O paciente não pode mais ver este relatório." : "Patient can no longer see this report." });
                            } else {
                              toast({ title: "Error", variant: "destructive" });
                            }
                          } catch {
                            toast({ title: "Error", variant: "destructive" });
                          } finally {
                            setIsSendingToPatient(false);
                          }
                        }}
                      >
                        <Undo2 className="h-3.5 w-3.5" />
                        {locale === "pt-BR" ? "Revogar do Paciente" : "Revoke from Patient"}
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* ── Share Confirmation Dialog ── */}
            <ShareReportDialog
              open={showShareDialog}
              onOpenChange={setShowShareDialog}
              assessment={a}
              locale={locale}
              therapistNotes={therapistNotes}
              onShared={(updated) => setSelectedAssessment(updated)}
              onRefresh={fetchAssessments}
            />
          </div>
        )}

        {/* 3D MODEL TAB */}
        {detailTab === "3dmodel" && a.segmentScores && (
          <div className="space-y-6">
            <BodyViewer3D
              segmentScores={a.segmentScores}
              aiFindings={a.aiFindings}
              muscleHypotheses={(a as any).muscleHypotheses}
              postureAnalysis={a.postureAnalysis}
              assessmentId={a.id}
              patientName={a.patient ? `${a.patient.firstName} ${a.patient.lastName}` : null}
              assessmentDate={a.createdAt ? new Date(a.createdAt).toISOString() : null}
              locale={locale}
            />
          </div>
        )}
      </div>
    );
  }

  // LIST VIEW
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">{T("admin.bodyAssessmentsTitle")}</h1>
          <p className="text-muted-foreground">{T("admin.bodyAssessmentsDesc")}</p>
        </div>
        <Button onClick={() => setShowNewDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New Assessment
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold">{stats.total}</p><p className="text-xs text-muted-foreground">Total</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-orange-600">{stats.pending}</p><p className="text-xs text-muted-foreground">Pending Capture</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-yellow-600">{stats.analysis}</p><p className="text-xs text-muted-foreground">Awaiting Analysis</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-indigo-600">{stats.review}</p><p className="text-xs text-muted-foreground">Pending Review</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-green-600">{stats.completed}</p><p className="text-xs text-muted-foreground">Completed</p></CardContent></Card>
      </div>

      {/* Search & Filter */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by number, patient name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {Object.entries(STATUS_CONFIG).map(([key, config]) => (
              <SelectItem key={key} value={key}>{config.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : assessments.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Activity className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-semibold text-lg">No assessments found</h3>
            <p className="text-muted-foreground mt-1">Create a new body assessment to get started.</p>
            <Button className="mt-4" onClick={() => setShowNewDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              New Assessment
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
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <StatusIcon className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold">{a.assessmentNumber}</span>
                          <Badge className={sc.color + " text-xs"}>{sc.label}</Badge>
                          {a.sentToPatientAt ? (
                            <Badge className="bg-green-500/15 text-green-400 border-green-500/30 text-[10px] gap-1">
                              <Send className="h-2.5 w-2.5" /> {locale === "pt-BR" ? "Enviado" : "Sent"}
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-[10px] text-muted-foreground gap-1">
                              <Clock className="h-2.5 w-2.5" /> {locale === "pt-BR" ? "Não enviado" : "Not sent"}
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {a.patient.firstName} {a.patient.lastName} · {a.patient.email}
                        </p>
                        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                          <span>📅 {new Date(a.createdAt).toLocaleDateString()}</span>
                          <span>📷 {capturedViews}/4 views</span>
                          {a.overallScore != null && <span>⭐ {Math.round(a.overallScore)}/100</span>}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" onClick={() => viewDetail(a)}>
                        <Eye className="h-4 w-4 mr-1" />
                        View
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => viewDetail(a)}>
                            <Eye className="h-4 w-4 mr-2" /> View Details
                          </DropdownMenuItem>
                          {a.captureToken && (
                            <DropdownMenuItem onClick={() => copyCaptureLink(a.captureToken!)}>
                              <Copy className="h-4 w-4 mr-2" /> Copy Capture Link
                            </DropdownMenuItem>
                          )}
                          {(a.status === "PENDING_ANALYSIS" || a.status === "PENDING_REVIEW") && (
                            <DropdownMenuItem onClick={() => runAiAnalysis(a)}>
                              <Brain className="h-4 w-4 mr-2" /> Run AI Analysis
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          {!a.sentToPatientAt ? (
                            <DropdownMenuItem onClick={() => sendToPatient(a.id)}>
                              <Send className="h-4 w-4 mr-2" /> {locale === "pt-BR" ? "Enviar ao Paciente" : "Send to Patient"}
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem onClick={() => revokeFromPatient(a.id)}>
                              <Undo2 className="h-4 w-4 mr-2" /> {locale === "pt-BR" ? "Revogar do Paciente" : "Revoke from Patient"}
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-red-600" onClick={() => deleteAssessment(a.id)}>
                            <Trash2 className="h-4 w-4 mr-2" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Protocol Review Dialog */}
      <Dialog open={showProtocolReview} onOpenChange={setShowProtocolReview}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Home className="h-5 w-5 text-green-500" />
              {locale === "pt-BR" ? "Revisar Protocolo Domiciliar" : "Review Home Protocol"}
            </DialogTitle>
            <DialogDescription>
              {locale === "pt-BR"
                ? "Este protocolo foi gerado como RASCUNHO. Revise os exercícios e ajuste antes de compartilhar com o paciente."
                : "This protocol was generated as a DRAFT. Review the exercises and adjust before sharing with the patient."}
            </DialogDescription>
          </DialogHeader>
          {generatedProtocol && (
            <div className="space-y-4 py-2">
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3">
                <p className="text-xs font-semibold text-amber-400 flex items-center gap-1.5">
                  <FileText className="h-3.5 w-3.5" />
                  {locale === "pt-BR" ? "Status: RASCUNHO — Paciente NÃO vê ainda" : "Status: DRAFT — Patient does NOT see this yet"}
                </p>
              </div>

              <div>
                <p className="text-sm font-semibold">{generatedProtocol.title}</p>
                <p className="text-xs text-muted-foreground mt-1">{generatedProtocol.summary}</p>
              </div>

              {/* Goals */}
              {generatedProtocol.goals && Array.isArray(generatedProtocol.goals) && (
                <div>
                  <p className="text-xs font-semibold mb-2">{locale === "pt-BR" ? "Metas:" : "Goals:"}</p>
                  <div className="space-y-1.5">
                    {generatedProtocol.goals.map((g: any, i: number) => (
                      <div key={i} className="flex items-start gap-2 text-xs p-2 bg-muted/50 rounded-lg">
                        <Badge variant="outline" className="text-[9px] h-5 flex-shrink-0">{g.phase}</Badge>
                        <div>
                          <span className="font-medium">{g.goal}</span>
                          <span className="text-muted-foreground ml-1">— {g.timeline}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Protocol Items */}
              {generatedProtocol.items && Array.isArray(generatedProtocol.items) && (
                <div>
                  <p className="text-xs font-semibold mb-2">
                    {locale === "pt-BR" ? `Exercícios (${generatedProtocol.items.length}):` : `Exercises (${generatedProtocol.items.length}):`}
                  </p>
                  <div className="space-y-2">
                    {generatedProtocol.items.map((item: any, i: number) => (
                      <div key={i} className="p-3 border rounded-lg bg-card">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-primary">{i + 1}.</span>
                              <span className="text-sm font-medium">{item.title}</span>
                              <Badge variant="outline" className="text-[9px] h-4">{item.phase?.replace("_", " ")}</Badge>
                            </div>
                            {item.description && (
                              <p className="text-[11px] text-muted-foreground mt-1 line-clamp-2">{item.description}</p>
                            )}
                            <div className="flex items-center gap-3 mt-1.5 text-[10px] text-muted-foreground">
                              {item.sets && <span>{item.sets} sets</span>}
                              {item.reps && <span>{item.reps} reps</span>}
                              {item.holdSeconds && <span>{item.holdSeconds}s hold</span>}
                              {item.frequency && <span>{item.frequency}</span>}
                              {item.daysPerWeek && <span>{item.daysPerWeek}x/week</span>}
                            </div>
                          </div>
                          {item.exercise?.videoUrl && (
                            <Badge variant="secondary" className="text-[9px] h-5 flex-shrink-0">
                              <Video className="h-3 w-3 mr-0.5" /> Video
                            </Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Precautions */}
              {generatedProtocol.precautions && Array.isArray(generatedProtocol.precautions) && generatedProtocol.precautions.length > 0 && (
                <div className="bg-red-500/5 border border-red-500/20 rounded-lg p-3">
                  <p className="text-xs font-semibold text-red-400 mb-1">{locale === "pt-BR" ? "Precauções:" : "Precautions:"}</p>
                  {generatedProtocol.precautions.map((p: any, i: number) => (
                    <p key={i} className="text-[11px] text-muted-foreground">• {p.precaution}</p>
                  ))}
                </div>
              )}
            </div>
          )}
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setShowProtocolReview(false)}>
              {locale === "pt-BR" ? "Fechar" : "Close"}
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                if (generatedProtocol?.patientId) {
                  window.open(`/admin/patients/${generatedProtocol.patientId}/diagnosis`, "_blank");
                }
              }}
            >
              <FileText className="h-4 w-4 mr-1.5" />
              {locale === "pt-BR" ? "Editar no Tratamento" : "Edit in Treatment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New Assessment Dialog */}
      <Dialog open={showNewDialog} onOpenChange={setShowNewDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Body Assessment</DialogTitle>
            <DialogDescription>Create a new biomechanical body assessment for a patient.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Select Patient</Label>
              <Select value={selectedPatientId} onValueChange={setSelectedPatientId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a patient..." />
                </SelectTrigger>
                <SelectContent>
                  {patients.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.firstName} {p.lastName} — {p.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="bg-muted/50 rounded-lg p-3 text-sm text-muted-foreground">
              <p>A capture link will be generated that can be shared with the patient or used in-clinic.</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewDialog(false)}>Cancel</Button>
            <Button onClick={createAssessment} disabled={isSubmitting || !selectedPatientId}>
              {isSubmitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
              Create Assessment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
