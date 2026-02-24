"use client";

import { useState, useEffect } from "react";
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
import { ImageAnnotator, Annotation } from "@/components/body-assessment/image-annotator";
import { PlumbLineOverlay } from "@/components/body-assessment/plumb-line-overlay";
import { ImageComparison } from "@/components/body-assessment/image-comparison";
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
} from "lucide-react";
import { useLocale } from "@/hooks/use-locale";
import { t as i18nT } from "@/lib/i18n";
import { BodyCapture, BodyCaptureResult } from "@/components/body-assessment/body-capture";

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
  reviewedAt: string | null;
  aiProcessedAt: string | null;
  createdAt: string;
  updatedAt: string;
  patient: { id: string; firstName: string; lastName: string; email: string };
  therapist: { id: string; firstName: string; lastName: string } | null;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  PENDING_CAPTURE: { label: "Pending Capture", color: "bg-orange-100 text-orange-700", icon: Camera },
  CAPTURING: { label: "Capturing", color: "bg-blue-100 text-blue-700", icon: Camera },
  PENDING_ANALYSIS: { label: "Pending Analysis", color: "bg-yellow-100 text-yellow-700", icon: Clock },
  ANALYZING: { label: "Analyzing...", color: "bg-purple-100 text-purple-700", icon: Brain },
  PENDING_REVIEW: { label: "Pending Review", color: "bg-indigo-100 text-indigo-700", icon: ClipboardList },
  REVIEWED: { label: "Reviewed", color: "bg-teal-100 text-teal-700", icon: CheckCircle2 },
  COMPLETED: { label: "Completed", color: "bg-green-100 text-green-700", icon: CheckCircle2 },
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
  const [bodyMapView, setBodyMapView] = useState<"front" | "back">("front");
  const [bodyGender, setBodyGender] = useState<"male" | "female">("male");
  const [detailTab, setDetailTab] = useState<"overview" | "images" | "videos" | "annotate" | "analysis" | "notes">("overview");
  const [annotateView, setAnnotateView] = useState<"front" | "back" | "left" | "right">("front");
  const [annotateMode, setAnnotateMode] = useState<"draw" | "plumb" | "compare">("draw");
  const [showCameraCapture, setShowCameraCapture] = useState(false);
  const [isCaptureUploading, setIsCaptureUploading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchAssessments();
    fetchPatients();
  }, []);

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
      const res = await fetch("/api/admin/users?role=PATIENT");
      if (res.ok) {
        const data = await res.json();
        setPatients(Array.isArray(data) ? data : data.users || []);
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

  const runAiAnalysis = async (assessment: Assessment) => {
    setIsAnalyzing(true);
    toast({ title: "AI Analysis Started", description: "Processing images... This may take a minute." });
    try {
      const res = await fetch(`/api/admin/body-assessments/${assessment.id}/analyze`, {
        method: "POST",
      });
      if (res.ok) {
        const updated = await res.json();
        setSelectedAssessment(updated);
        fetchAssessments();
        toast({ title: "Analysis Complete", description: "AI analysis finished successfully." });
      } else {
        const err = await res.json();
        toast({ title: "Error", description: err.error, variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "AI analysis failed.", variant: "destructive" });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const saveTherapistNotes = async () => {
    if (!selectedAssessment) return;
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
        toast({ title: "Notes Saved", description: "Assessment marked as reviewed." });
      }
    } catch {
      toast({ title: "Error", description: "Failed to save notes.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

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

  const copyCaptureLink = (token: string) => {
    const url = `${window.location.origin}/capture/${token}`;
    navigator.clipboard.writeText(url);
    toast({ title: "Link Copied", description: "Capture link copied to clipboard." });
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
      { id: "images" as const, label: "Images", icon: ImageIcon },
      { id: "videos" as const, label: "Videos", icon: Video },
      { id: "annotate" as const, label: "Tools", icon: Pencil },
      { id: "analysis" as const, label: "AI Analysis", icon: Brain },
      { id: "notes" as const, label: "Notes", icon: StickyNote },
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
              {a.status === "PENDING_CAPTURE" && (
                <Button size="sm" className="bg-white text-indigo-700 hover:bg-blue-50 font-semibold" onClick={() => setShowCameraCapture(true)}>
                  <Camera className="h-4 w-4 mr-2" /> Capture Now
                </Button>
              )}
              {a.captureToken && (
                <Button variant="ghost" size="sm" className="text-white hover:bg-white/20" onClick={() => copyCaptureLink(a.captureToken!)}>
                  <Copy className="h-4 w-4 mr-1.5" /> Link
                </Button>
              )}
              {a.captureToken && (
                <Button variant="ghost" size="sm" className="text-white hover:bg-white/20" onClick={() => window.open(`/capture/${a.captureToken}`, '_blank')}>
                  <ExternalLink className="h-4 w-4 mr-1.5" /> Open Capture
                </Button>
              )}
              {(a.status === "PENDING_ANALYSIS" || a.status === "PENDING_REVIEW") && (
                <Button size="sm" className="bg-white text-indigo-700 hover:bg-blue-50 font-semibold" onClick={() => runAiAnalysis(a)} disabled={isAnalyzing}>
                  {isAnalyzing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
                  {isAnalyzing ? "Analyzing..." : "AI Analysis"}
                </Button>
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

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Body Map Card */}
              <Card className="overflow-hidden">
                <CardHeader className="bg-gradient-to-b from-muted/50 to-transparent pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Activity className="h-4 w-4 text-primary" /> Body Map
                    </CardTitle>
                    <div className="flex gap-1">
                      <Button variant={bodyMapView === "front" ? "default" : "outline"} size="sm" className="h-7 text-xs" onClick={() => setBodyMapView("front")}>Frontal</Button>
                      <Button variant={bodyMapView === "back" ? "default" : "outline"} size="sm" className="h-7 text-xs" onClick={() => setBodyMapView("back")}>Posterior</Button>
                      <div className="border-l ml-1 pl-1 flex gap-1">
                        <Button variant={bodyGender === "male" ? "default" : "outline"} size="sm" className="h-7 text-xs px-2" onClick={() => setBodyGender("male")} title="Male">♂</Button>
                        <Button variant={bodyGender === "female" ? "default" : "outline"} size="sm" className="h-7 text-xs px-2" onClick={() => setBodyGender("female")} title="Female">♀</Button>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="flex justify-center pt-2">
                  <BodyMap
                    view={bodyMapView}
                    motorPoints={a.motorPoints || []}
                    alignmentData={a.alignmentData}
                    width={280}
                    height={450}
                    gender={bodyGender}
                  />
                </CardContent>
              </Card>

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
                            {a.captureToken && (
                              <Button variant="outline" size="sm" onClick={() => copyCaptureLink(a.captureToken!)}>
                                <Copy className="h-4 w-4 mr-1.5" /> Copy Link
                              </Button>
                            )}
                            {a.captureToken && (
                              <Button variant="outline" size="sm" onClick={() => window.open(`/capture/${a.captureToken}`, '_blank')}>
                                <ExternalLink className="h-4 w-4 mr-1.5" /> Open in New Tab
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

                {/* AI Summary */}
                {a.aiSummary && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Sparkles className="h-4 w-4 text-amber-500" /> AI Summary
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm whitespace-pre-wrap leading-relaxed">{a.aiSummary}</p>
                    </CardContent>
                  </Card>
                )}

                {/* Key Findings */}
                {a.aiFindings && a.aiFindings.length > 0 && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Key Findings</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {a.aiFindings.slice(0, 5).map((f: any, i: number) => (
                        <div key={i} className="flex gap-3 p-2.5 rounded-lg bg-muted/50 hover:bg-muted/80 transition-colors">
                          <Badge
                            variant={f.severity === "severe" ? "destructive" : f.severity === "moderate" ? "default" : "secondary"}
                            className="text-xs h-fit shrink-0"
                          >
                            {f.severity}
                          </Badge>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium">{f.area}</p>
                            <p className="text-xs text-muted-foreground truncate">{f.finding}</p>
                            {f.recommendation && (
                              <p className="text-xs text-primary mt-1 truncate">→ {f.recommendation}</p>
                            )}
                          </div>
                        </div>
                      ))}
                      {a.aiFindings.length > 5 && (
                        <Button variant="ghost" size="sm" className="w-full text-xs" onClick={() => setDetailTab("analysis")}>
                          View all ({a.aiFindings.length}) <ArrowRight className="h-3 w-3 ml-1" />
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                )}

                {/* Recommendations */}
                {a.aiRecommendations && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-green-500" /> Recommendations
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm whitespace-pre-wrap leading-relaxed">{a.aiRecommendations}</p>
                    </CardContent>
                  </Card>
                )}

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
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: "Front", url: a.frontImageUrl, annotated: a.frontAnnotatedUrl },
              { label: "Back", url: a.backImageUrl, annotated: a.backAnnotatedUrl },
              { label: "Left", url: a.leftImageUrl, annotated: a.leftAnnotatedUrl },
              { label: "Right", url: a.rightImageUrl, annotated: a.rightAnnotatedUrl },
            ].map((img) => (
              <Card key={img.label}>
                <CardHeader className="p-3">
                  <CardTitle className="text-sm">{img.label}</CardTitle>
                </CardHeader>
                <CardContent className="p-3 pt-0">
                  {img.url ? (
                    <div className="aspect-[3/4] bg-muted rounded-lg overflow-hidden">
                      <img src={img.annotated || img.url} alt={img.label} className="w-full h-full object-cover" />
                    </div>
                  ) : (
                    <div className="aspect-[3/4] bg-muted rounded-lg flex items-center justify-center">
                      <Camera className="h-8 w-8 text-muted-foreground" />
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* VIDEOS TAB */}
        {detailTab === "videos" && (
          <div className="space-y-4">
            {a.movementVideos && Array.isArray(a.movementVideos) && a.movementVideos.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {a.movementVideos.map((vid: any, i: number) => (
                  <Card key={vid.id || i}>
                    <CardHeader className="p-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm">{vid.label || vid.testType}</CardTitle>
                        <Badge variant="secondary" className="text-xs">{vid.duration}s</Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="p-3 pt-0">
                      {vid.videoUrl ? (
                        <video
                          src={vid.videoUrl}
                          controls
                          playsInline
                          className="w-full rounded-lg bg-black aspect-video"
                        />
                      ) : (
                        <div className="aspect-video bg-muted rounded-lg flex items-center justify-center">
                          <p className="text-xs text-muted-foreground">Video unavailable</p>
                        </div>
                      )}
                      <p className="text-xs text-muted-foreground mt-2">
                        Recorded: {vid.createdAt ? new Date(vid.createdAt).toLocaleString() : "—"}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
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
          <div className="space-y-4">
            {a.postureAnalysis ? (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Posture Analysis</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <pre className="text-xs bg-muted p-3 rounded-lg overflow-auto max-h-[300px]">
                      {JSON.stringify(a.postureAnalysis, null, 2)}
                    </pre>
                  </CardContent>
                </Card>
                {a.jointAngles && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Joint Angles</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <pre className="text-xs bg-muted p-3 rounded-lg overflow-auto max-h-[300px]">
                        {JSON.stringify(a.jointAngles, null, 2)}
                      </pre>
                    </CardContent>
                  </Card>
                )}
                {a.kineticChain && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Kinetic Chain</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <pre className="text-xs bg-muted p-3 rounded-lg overflow-auto max-h-[300px]">
                        {JSON.stringify(a.kineticChain, null, 2)}
                      </pre>
                    </CardContent>
                  </Card>
                )}
              </>
            ) : (
              <Card>
                <CardContent className="p-8 text-center">
                  <Brain className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No AI analysis yet.</p>
                  {(a.frontImageUrl || a.backImageUrl) && (
                    <Button className="mt-4" onClick={() => runAiAnalysis(a)} disabled={isAnalyzing}>
                      {isAnalyzing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Brain className="h-4 w-4 mr-2" />}
                      Run AI Analysis
                    </Button>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* NOTES TAB */}
        {detailTab === "notes" && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Therapist Notes</CardTitle>
              <CardDescription>Add your clinical observations and review</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                value={therapistNotes}
                onChange={(e) => setTherapistNotes(e.target.value)}
                placeholder="Enter your clinical notes, observations, and treatment recommendations..."
                rows={8}
              />
              <div className="flex justify-end gap-2">
                <Button onClick={saveTherapistNotes} disabled={isSubmitting}>
                  {isSubmitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
                  Save & Mark Reviewed
                </Button>
              </div>
            </CardContent>
          </Card>
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
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">{a.assessmentNumber}</span>
                          <Badge className={sc.color + " text-xs"}>{sc.label}</Badge>
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
