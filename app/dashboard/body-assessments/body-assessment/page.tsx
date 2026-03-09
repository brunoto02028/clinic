"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FindingCards } from "@/components/body-assessment/finding-cards";
import { SegmentScores } from "@/components/body-assessment/segment-scores";
import { CorrectiveExercises } from "@/components/body-assessment/corrective-exercises";
import {
  Activity,
  ChevronLeft,
  CalendarDays,
  User,
  Loader2,
  Brain,
  TrendingUp,
  Download,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { useLocale } from "@/hooks/use-locale";
import { FormattedAISummary } from "@/components/body-assessment/formatted-ai-summary";
import { TreatmentPriorities } from "@/components/body-assessment/treatment-priorities";
import { PatientReportSummary } from "@/components/body-assessment/patient-report-summary";

interface PatientAssessment {
  id: string;
  assessmentNumber: string;
  status: string;
  frontImageUrl: string | null;
  backImageUrl: string | null;
  leftImageUrl: string | null;
  rightImageUrl: string | null;
  postureScore: number | null;
  symmetryScore: number | null;
  mobilityScore: number | null;
  overallScore: number | null;
  segmentScores: any | null;
  aiSummary: string | null;
  aiRecommendations: string | null;
  aiFindings: any[] | null;
  correctiveExercises: any[] | null;
  reportLanguage: string | null;
  sentToPatientAt: string | null;
  createdAt: string;
  therapist: { id: string; firstName: string; lastName: string } | null;
}

export default function PatientBodyAssessmentPage() {
  const { locale } = useLocale();
  const isPt = locale === "pt-BR";
  const [assessments, setAssessments] = useState<PatientAssessment[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<PatientAssessment | null>(null);

  useEffect(() => {
    fetch("/api/patient/body-assessments")
      .then((r) => r.json())
      .then((data) => {
        setAssessments(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const scoreColor = (score: number) => {
    if (score >= 80) return "text-green-500";
    if (score >= 60) return "text-yellow-500";
    if (score >= 40) return "text-orange-500";
    return "text-red-500";
  };

  // DETAIL VIEW
  if (selected) {
    const a = selected;
    const reportLocale = a.reportLanguage || locale;

    return (
      <div className="space-y-6 max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => setSelected(null)}>
            <ChevronLeft className="h-4 w-4 mr-1" />
            {isPt ? "Voltar" : "Back"}
          </Button>
          <div className="flex-1">
            <h1 className="text-xl font-bold">{a.assessmentNumber}</h1>
            <p className="text-sm text-muted-foreground">
              {new Date(a.createdAt).toLocaleDateString(isPt ? "pt-BR" : "en-GB", { day: "2-digit", month: "long", year: "numeric" })}
              {a.therapist && ` — ${a.therapist.firstName} ${a.therapist.lastName}`}
            </p>
          </div>
          <Badge className="bg-green-100 text-green-700">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            {isPt ? "Finalizada" : "Completed"}
          </Badge>
        </div>

        {/* Score Overview */}
        {a.overallScore && (
          <Card>
            <CardContent className="p-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                <div>
                  <p className={`text-3xl font-bold ${scoreColor(a.overallScore)}`}>{Math.round(a.overallScore)}</p>
                  <p className="text-xs text-muted-foreground">{isPt ? "Pontuação Geral" : "Overall Score"}</p>
                </div>
                {a.postureScore && (
                  <div>
                    <p className={`text-2xl font-bold ${scoreColor(a.postureScore)}`}>{Math.round(a.postureScore)}</p>
                    <p className="text-xs text-muted-foreground">{isPt ? "Postura" : "Posture"}</p>
                  </div>
                )}
                {a.symmetryScore && (
                  <div>
                    <p className={`text-2xl font-bold ${scoreColor(a.symmetryScore)}`}>{Math.round(a.symmetryScore)}</p>
                    <p className="text-xs text-muted-foreground">{isPt ? "Simetria" : "Symmetry"}</p>
                  </div>
                )}
                {a.mobilityScore && (
                  <div>
                    <p className={`text-2xl font-bold ${scoreColor(a.mobilityScore)}`}>{Math.round(a.mobilityScore)}</p>
                    <p className="text-xs text-muted-foreground">{isPt ? "Mobilidade" : "Mobility"}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Photos */}
        {(a.frontImageUrl || a.backImageUrl || a.leftImageUrl || a.rightImageUrl) && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">{isPt ? "Fotos da Avaliação" : "Assessment Photos"}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { url: a.frontImageUrl, label: isPt ? "Frontal" : "Front" },
                  { url: a.backImageUrl, label: isPt ? "Posterior" : "Back" },
                  { url: a.leftImageUrl, label: isPt ? "Lateral Esq." : "Left" },
                  { url: a.rightImageUrl, label: isPt ? "Lateral Dir." : "Right" },
                ].filter(img => img.url).map((img, i) => (
                  <div key={i} className="relative">
                    <img src={img.url!} alt={img.label} className="w-full rounded-lg border" />
                    <span className="absolute top-1 left-1 text-[10px] bg-black/60 text-white px-1.5 py-0.5 rounded">{img.label}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Patient Report Summary */}
        <PatientReportSummary
          assessmentDate={a.createdAt}
          assessmentNumber={a.assessmentNumber}
          overallScore={a.overallScore}
          postureScore={a.postureScore}
          symmetryScore={a.symmetryScore}
          mobilityScore={a.mobilityScore}
          segmentScores={a.segmentScores}
          aiFindings={a.aiFindings}
          locale={locale}
        />

        {/* AI Summary */}
        {a.aiSummary && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Brain className="h-4 w-4 text-purple-500" />
                {isPt ? "Resumo da Avaliação" : "Assessment Summary"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <FormattedAISummary text={a.aiSummary} locale={locale} />
            </CardContent>
          </Card>
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

        {/* Segment Scores */}
        {a.segmentScores && (
          <SegmentScores segmentScores={a.segmentScores} />
        )}

        {/* Clinical Findings */}
        {a.aiFindings && a.aiFindings.length > 0 && (
          <FindingCards findings={a.aiFindings} locale={reportLocale} />
        )}

        {/* Recommendations */}
        {a.aiRecommendations && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-green-500" />
                {isPt ? "Recomendações" : "Recommendations"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <FormattedAISummary text={a.aiRecommendations} locale={locale} />
            </CardContent>
          </Card>
        )}

        {/* Corrective Exercises */}
        {a.correctiveExercises && a.correctiveExercises.length > 0 && (
          <CorrectiveExercises exercises={a.correctiveExercises} />
        )}
      </div>
    );
  }

  // LIST VIEW
  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-xl font-bold flex items-center gap-2">
          <Activity className="h-5 w-5 text-purple-500" />
          {isPt ? "Avaliação Corporal" : "Body Assessment"}
        </h1>
        <p className="text-muted-foreground text-sm">
          {isPt ? "Veja suas avaliações biomecânicas finalizadas." : "View your finalized biomechanical assessments."}
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : assessments.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Activity className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-semibold">{isPt ? "Nenhuma avaliação disponível" : "No assessments available"}</h3>
            <p className="text-muted-foreground text-sm mt-1">
              {isPt ? "Suas avaliações aparecerão aqui após serem finalizadas pelo seu fisioterapeuta." : "Your assessments will appear here after being finalized by your therapist."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {assessments.map((a) => (
            <Card key={a.id} className="cursor-pointer hover:border-primary/30 transition-colors" onClick={() => setSelected(a)}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold">{a.assessmentNumber}</p>
                    <p className="text-xs text-muted-foreground">
                      <CalendarDays className="h-3 w-3 inline mr-1" />
                      {new Date(a.createdAt).toLocaleDateString(isPt ? "pt-BR" : "en-GB")}
                      {a.therapist && (
                        <span className="ml-2">
                          <User className="h-3 w-3 inline mr-1" />
                          {a.therapist.firstName} {a.therapist.lastName}
                        </span>
                      )}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    {a.overallScore && (
                      <div className="text-right">
                        <p className={`text-xl font-bold ${scoreColor(a.overallScore)}`}>{Math.round(a.overallScore)}</p>
                        <p className="text-[10px] text-muted-foreground">{isPt ? "Pontuação" : "Score"}</p>
                      </div>
                    )}
                    {a.aiFindings && (
                      <Badge variant="outline" className="text-[10px]">
                        <AlertCircle className="h-2.5 w-2.5 mr-0.5" />
                        {a.aiFindings.length} {isPt ? "achados" : "findings"}
                      </Badge>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
