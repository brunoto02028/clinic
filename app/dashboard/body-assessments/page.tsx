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
import { BodyCapture, BodyCaptureResult } from "@/components/body-assessment/body-capture";
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
} from "lucide-react";
import { useLocale } from "@/hooks/use-locale";
import { t as i18nT } from "@/lib/i18n";
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
  motorPoints: any[] | null;
  postureScore: number | null;
  symmetryScore: number | null;
  mobilityScore: number | null;
  overallScore: number | null;
  aiSummary: string | null;
  aiRecommendations: string | null;
  aiFindings: any[] | null;
  therapistNotes: string | null;
  alignmentData: any | null;
  movementVideos: any[] | null;
  movementPatterns: any | null;
  createdAt: string;
  patient: { id: string; firstName: string; lastName: string; email: string };
  therapist: { id: string; firstName: string; lastName: string } | null;
}

const STATUS_CONFIG: Record<string, { labelEn: string; labelPt: string; color: string; icon: any }> = {
  PENDING_CAPTURE: { labelEn: "Pending Capture", labelPt: "Aguardando Captura", color: "bg-orange-100 text-orange-700", icon: Camera },
  CAPTURING: { labelEn: "Capturing", labelPt: "Capturando", color: "bg-blue-100 text-blue-700", icon: Camera },
  PENDING_ANALYSIS: { labelEn: "Processing", labelPt: "Processando", color: "bg-yellow-100 text-yellow-700", icon: Clock },
  ANALYZING: { labelEn: "Analyzing...", labelPt: "Analisando...", color: "bg-purple-100 text-purple-700", icon: Brain },
  PENDING_REVIEW: { labelEn: "Under Review", labelPt: "Em Revisão", color: "bg-indigo-100 text-indigo-700", icon: ClipboardList },
  REVIEWED: { labelEn: "Reviewed", labelPt: "Revisado", color: "bg-teal-100 text-teal-700", icon: CheckCircle2 },
  COMPLETED: { labelEn: "Completed", labelPt: "Concluído", color: "bg-green-100 text-green-700", icon: CheckCircle2 },
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
  const [bodyMapView, setBodyMapView] = useState<"front" | "back">("front");
  const { toast } = useToast();

  useEffect(() => {
    fetchAssessments();
  }, []);

  const fetchAssessments = async () => {
    try {
      const res = await fetch("/api/admin/body-assessments");
      if (res.ok) {
        setAssessments(await res.json());
      }
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  const startSelfCapture = async () => {
    // Create a new assessment for self-capture
    try {
      const res = await fetch("/api/admin/body-assessments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (res.ok) {
        const data = await res.json();
        setCaptureAssessment(data);
        setShowCapture(true);
      } else {
        const errData = await res.json().catch(() => ({}));
        toast({
          title: T("common.error"),
          description: errData.error || T("bodyAssessment.startError"),
          variant: "destructive",
        });
      }
    } catch {
      toast({
        title: T("common.error"),
        description: T("bodyAssessment.startError"),
        variant: "destructive",
      });
    }
  };

  const handleCaptureForExisting = (assessment: Assessment) => {
    setCaptureAssessment(assessment);
    setShowCapture(true);
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

      // Upload videos
      if (result.videos && result.videos.length > 0) {
        for (const vid of result.videos) {
          const videoDataUrl = await blobToDataUrl(vid.blob);
          await fetch(`/api/body-assessments/capture/${captureAssessment.captureToken}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              movementVideo: {
                testType: vid.testType,
                label: vid.label,
                duration: vid.duration,
                videoDataUrl,
              },
            }),
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

  // Capture mode
  if (showCapture) {
    return (
      <div className="h-screen">
        <BodyCapture
          onComplete={handleCaptureComplete}
          onCancel={() => setShowCapture(false)}
        />
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

    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2 sm:gap-3">
          <Button variant="ghost" size="icon" onClick={() => setShowDetail(false)} className="h-8 w-8 sm:h-9 sm:w-9">
            <ChevronLeft className="h-4 w-4 sm:h-5 sm:w-5" />
          </Button>
          <div>
            <h1 className="text-lg sm:text-xl font-bold">{a.assessmentNumber}</h1>
            <Badge className={sc.color + " text-[10px]"}>{isPt ? sc.labelPt : sc.labelEn}</Badge>
          </div>
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
          {/* Body Map */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">{T("bodyAssessment.bodyMap")}</CardTitle>
                <div className="flex gap-1">
                  <Button variant={bodyMapView === "front" ? "default" : "outline"} size="sm" onClick={() => setBodyMapView("front")}>{T("bodyAssessment.front")}</Button>
                  <Button variant={bodyMapView === "back" ? "default" : "outline"} size="sm" onClick={() => setBodyMapView("back")}>{T("bodyAssessment.back")}</Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="flex justify-center">
              <BodyMap
                view={bodyMapView}
                motorPoints={a.motorPoints || []}
                alignmentData={a.alignmentData}
                width={260}
                height={420}
                interactive={false}
              />
            </CardContent>
          </Card>

          {/* Results */}
          <div className="space-y-4">
            {a.aiSummary && (
              <Card>
                <CardHeader><CardTitle className="text-base">{T("bodyAssessment.summary")}</CardTitle></CardHeader>
                <CardContent><p className="text-sm whitespace-pre-wrap">{a.aiSummary}</p></CardContent>
              </Card>
            )}

            {a.aiFindings && a.aiFindings.length > 0 && (
              <Card>
                <CardHeader><CardTitle className="text-base">{T("bodyAssessment.findings")}</CardTitle></CardHeader>
                <CardContent className="space-y-2">
                  {a.aiFindings.map((f: any, i: number) => (
                    <div key={i} className="flex gap-3 p-2 rounded-lg bg-muted/50">
                      <Badge variant={f.severity === "severe" ? "destructive" : f.severity === "moderate" ? "default" : "secondary"} className="text-xs h-fit">
                        {f.severity}
                      </Badge>
                      <div>
                        <p className="text-sm font-medium">{f.area}</p>
                        <p className="text-xs text-muted-foreground">{f.finding}</p>
                        {f.recommendation && <p className="text-xs text-primary mt-1">→ {f.recommendation}</p>}
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {a.aiRecommendations && (
              <Card>
                <CardHeader><CardTitle className="text-base">{T("bodyAssessment.recommendations")}</CardTitle></CardHeader>
                <CardContent><p className="text-sm whitespace-pre-wrap">{a.aiRecommendations}</p></CardContent>
              </Card>
            )}

            {a.therapistNotes && (
              <Card>
                <CardHeader><CardTitle className="text-base">{T("bodyAssessment.therapistNotes")}</CardTitle></CardHeader>
                <CardContent><p className="text-sm whitespace-pre-wrap">{a.therapistNotes}</p></CardContent>
              </Card>
            )}

            {!a.aiSummary && !a.therapistNotes && (
              <Card>
                <CardContent className="p-8 text-center">
                  <Clock className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground">{T("bodyAssessment.pendingReview")}</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Images */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between flex-wrap gap-2">
              <CardTitle className="text-base">{T("bodyAssessment.capturedImages")}</CardTitle>
              <div className="flex items-center gap-1.5 text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded-full px-2.5 py-1">
                <Shield className="h-3 w-3" />
                {T("bodyAssessment.faceBlurNotice")}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: T("bodyAssessment.front"), url: a.frontImageUrl },
                { label: T("bodyAssessment.back"), url: a.backImageUrl },
                { label: T("bodyAssessment.left"), url: a.leftImageUrl },
                { label: T("bodyAssessment.right"), url: a.rightImageUrl },
              ].map((img) => (
                <div key={img.label} className="text-center">
                  <p className="text-xs font-medium mb-1">{img.label}</p>
                  {img.url ? (
                    <div className="aspect-[3/4] bg-muted rounded-lg overflow-hidden">
                      <img src={img.url} alt={img.label} className="w-full h-full object-cover" />
                    </div>
                  ) : (
                    <div className="aspect-[3/4] bg-muted rounded-lg flex items-center justify-center">
                      <Camera className="h-6 w-6 text-muted-foreground" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Movement Videos */}
        {a.movementVideos && Array.isArray(a.movementVideos) && a.movementVideos.length > 0 && (
          <Card>
            <CardHeader><CardTitle className="text-base">{T("bodyAssessment.movementVideos")}</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {a.movementVideos.map((vid: any, i: number) => (
                  <div key={vid.id || i} className="space-y-1">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-medium">{vid.label || vid.testType}</p>
                      <span className="text-xs text-muted-foreground">{vid.duration}s</span>
                    </div>
                    {vid.videoUrl ? (
                      <video src={vid.videoUrl} controls playsInline className="w-full rounded-lg bg-black aspect-video" />
                    ) : (
                      <div className="aspect-video bg-muted rounded-lg flex items-center justify-center">
                        <Camera className="h-6 w-6 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
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
            <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0 mt-0.5">
              <Brain className="h-4 w-4 text-purple-600" />
            </div>
            <div>
              <p className="text-sm font-semibold">{T("bodyAssessment.infoStep2Title")}</p>
              <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{T("bodyAssessment.infoStep2Desc")}</p>
            </div>
          </div>
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0 mt-0.5">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
            </div>
            <div>
              <p className="text-sm font-semibold">{T("bodyAssessment.infoStep3Title")}</p>
              <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{T("bodyAssessment.infoStep3Desc")}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Privacy Notice */}
      <div className="flex items-start gap-2.5 p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-600">
        <Shield className="h-4 w-4 text-slate-500 flex-shrink-0 mt-0.5" />
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
