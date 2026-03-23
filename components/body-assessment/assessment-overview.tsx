"use client";

import React from "react";

import { Activity, Brain, Crosshair, Dumbbell, TrendingUp, Stethoscope, Shield, Camera, ShieldCheck, Clock, Info } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { PatientReportSummary } from "./patient-report-summary";
import { TreatmentPriorities } from "./treatment-priorities";
import { InteractiveBodyModel } from "./interactive-body-model";
import { PostureAnalysisPanel } from "./posture-analysis-panel";
import { PostureStages } from "./posture-stages";
import { SegmentScores } from "./segment-scores";
import { PosturalComparisonView } from "./postural-comparison-view";
import { HealthMetricsCard } from "./health-metrics-card";
import { FormattedAISummary } from "./formatted-ai-summary";
import { FindingCards } from "./finding-cards";
import { ScoliosisPanel } from "./scoliosis-panel";
import { SocialMediaConsentCard } from "./social-media-consent-card";
import dynamic from "next/dynamic";

const BodyViewer3D = dynamic(() => import("./body-viewer-3d").then(m => m.BodyViewer3D), { 
  ssr: false, 
  loading: () => <div className="flex items-center justify-center h-64"><div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" /></div> 
});

interface AssessmentOverviewProps {
  assessment: any;
  locale: string;
  isPt: boolean;
  T: (key: string) => string;
}

export function AssessmentOverview({ assessment: a, locale, isPt, T }: AssessmentOverviewProps) {
  const hasScoliosis = a.postureAnalysis?.scoliosisScreening && a.postureAnalysis.scoliosisScreening.severity !== "none";

  return (
    <div className="space-y-6">
      {/* Patient Report Summary */}
      <PatientReportSummary
        patientName={a.patient ? `${a.patient.firstName} ${a.patient.lastName}` : undefined}
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

      {/* Treatment Priorities */}
      {a.segmentScores && (
        <TreatmentPriorities
          segmentScores={a.segmentScores}
          aiFindings={a.aiFindings}
          overallScore={a.overallScore}
          locale={locale}
        />
      )}

      {/* 3D Anatomical Model */}
      {a.segmentScores && (
        <BodyViewer3D
          segmentScores={a.segmentScores}
          aiFindings={a.aiFindings}
          postureAnalysis={a.postureAnalysis}
          assessmentId={a.id}
          patientName={a.patient ? `${a.patient.firstName} ${a.patient.lastName}` : null}
          assessmentDate={a.createdAt ? new Date(a.createdAt).toISOString() : null}
          locale={locale}
        />
      )}

      {/* Interactive Body Model */}
      {a.segmentScores && (
        <InteractiveBodyModel
          segmentScores={a.segmentScores}
          aiFindings={a.aiFindings}
          locale={locale}
        />
      )}

      {/* Multi-View Posture Analysis Panel */}
      {a.postureAnalysis && (a.frontImageUrl || a.backImageUrl || a.leftImageUrl || a.rightImageUrl) && (
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

      {/* 3 Stages of Posture */}
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

      {/* Segment Scores + Body Map Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {a.segmentScores && (
          <SegmentScores
            segmentScores={a.segmentScores}
            overallScore={a.overallScore || undefined}
            frontImageUrl={a.frontImageUrl}
            backImageUrl={a.backImageUrl}
            frontLandmarks={a.frontLandmarks}
            backLandmarks={a.backLandmarks}
            locale={isPt ? "pt-BR" : "en"}
          />
        )}

        <PosturalComparisonView
          frontImageUrl={a.frontImageUrl}
          backImageUrl={a.backImageUrl}
          frontLandmarks={a.frontLandmarks}
          backLandmarks={a.backLandmarks}
          segmentScores={a.segmentScores}
          postureScore={a.postureScore}
          locale={isPt ? "pt-BR" : "en"}
        />
      </div>

      {/* Body Composition & Health Metrics */}
      {a.bmi != null && (
        <HealthMetricsCard
          data={{
            heightCm: a.heightCm,
            weightKg: a.weightKg,
            bmi: a.bmi,
            bmiClassification: a.bmiClassification,
            waistCm: a.waistCm,
            hipCm: a.hipCm,
            waistHipRatio: a.waistHipRatio,
            neckCm: a.neckCm,
            chestCm: a.chestCm,
            thighCm: a.thighCm,
            calfCm: a.calfCm,
            armCm: a.armCm,
            bodyFatPercent: a.bodyFatPercent,
            bodyFatMethod: a.bodyFatMethod,
            leanMassKg: a.leanMassKg,
            fatMassKg: a.fatMassKg,
            basalMetabolicRate: a.basalMetabolicRate,
            cardiovascularRisk: a.cardiovascularRisk,
            metabolicRisk: a.metabolicRisk,
            healthScore: a.healthScore,
            healthRiskFactors: a.healthRiskFactors,
            sittingHoursPerDay: a.sittingHoursPerDay,
            screenTimeHours: a.screenTimeHours,
            walkingMinutesDay: a.walkingMinutesDay,
            stepsPerDay: a.stepsPerDay,
            ergonomicScore: a.ergonomicScore,
          }}
          locale={isPt ? "pt-BR" : "en"}
        />
      )}

      {/* AI Summary */}
      {a.aiSummary && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Brain className="h-4 w-4 text-purple-500" />
              {T("bodyAssessment.summary")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <FormattedAISummary text={a.aiSummary} locale={locale} />
          </CardContent>
        </Card>
      )}

      {/* Findings */}
      {a.aiFindings && a.aiFindings.length > 0 && (
        <FindingCards findings={a.aiFindings} compact />
      )}

      {/* Scoliosis Screening */}
      {hasScoliosis && (
        <ScoliosisPanel screening={a.postureAnalysis.scoliosisScreening} />
      )}

      {/* Therapist Notes */}
      {a.therapistNotes && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Stethoscope className="h-4 w-4 text-teal-500" />
              {T("bodyAssessment.therapistNotes")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap leading-relaxed">{a.therapistNotes}</p>
          </CardContent>
        </Card>
      )}

      {/* Captured Images */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle className="text-base">{T("bodyAssessment.capturedImages")}</CardTitle>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/30 border border-white/10 rounded-full px-2.5 py-1">
              <Shield className="h-3 w-3" />
              {T("bodyAssessment.faceBlurNotice")}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: T("bodyAssessment.front"), url: a.frontImageUrl, view: "front" },
              { label: T("bodyAssessment.back"), url: a.backImageUrl, view: "back" },
              { label: T("bodyAssessment.left"), url: a.leftImageUrl, view: "left" },
              { label: T("bodyAssessment.right"), url: a.rightImageUrl, view: "right" },
            ].map((img) => (
              <div key={img.label} className="text-center">
                <p className="text-xs font-medium mb-1">{img.label}</p>
                {img.url ? (
                  <div className="aspect-[3/4] bg-muted rounded-lg overflow-hidden relative">
                    <img src={img.url} alt={img.label} className="w-full h-full object-cover" />
                    {a.postureAnalysis?.imageAnnotations && Array.isArray(a.postureAnalysis.imageAnnotations) && (
                      <>
                        {a.postureAnalysis.imageAnnotations
                          .filter((ann: any) => ann.view === img.view)
                          .map((ann: any, idx: number) => {
                            const sevColor = ann.severity === "severe" ? "bg-red-500 border-red-400" : ann.severity === "moderate" ? "bg-orange-500 border-orange-400" : "bg-blue-500 border-blue-400";
                            const arrowChar = ann.arrowDirection === "up" ? "\u2191" : ann.arrowDirection === "down" ? "\u2193" : ann.arrowDirection === "left" ? "\u2190" : "\u2192";
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

      {/* Social Media Image Consent */}
      <SocialMediaConsentCard locale={locale} />

      {/* Therapist Alert Notes */}
      {a.therapistNotes && (() => {
        const alertLines = (a.therapistNotes as string).split("\n").filter((l: string) => l.startsWith("[ALERT]") || l.startsWith("[AVISO]"));
        if (alertLines.length === 0) return null;
        return (
          <Card className="border-amber-500/30 bg-amber-500/5">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2 text-amber-400">
                <Info className="h-4 w-4" />
                {isPt ? "Avisos do Terapeuta" : "Therapist Alerts"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {alertLines.map((line: string, i: number) => (
                <div key={i} className="flex items-start gap-2 p-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
                  <ShieldCheck className="h-4 w-4 text-amber-400 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-300">{line.replace(/^\[(ALERT|AVISO)\]\s*/, "")}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        );
      })()}

      {!a.aiSummary && !a.therapistNotes && (
        <Card>
          <CardContent className="p-8 text-center">
            <Clock className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">{T("bodyAssessment.pendingReview")}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
