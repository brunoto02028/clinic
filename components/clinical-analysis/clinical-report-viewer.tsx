"use client";

import { useState, useEffect } from "react";
import {
  Activity,
  AlertTriangle,
  CheckCircle,
  Shield,
  Zap,
  ClipboardList,
  Clock,
  Loader2,
  AlertCircle,
  XCircle,
  HelpCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { useToast } from "@/hooks/use-toast";
import { ClinicalAnalysis, Modality, ModalityDecision, UrgencyLevel } from "@/lib/clinical-analysis";

interface ClinicalReportViewerProps {
  patientId: string;
  patientName: string;
}

interface AnalysisResponse {
  success: boolean;
  patientId: string;
  patientName: string;
  screeningCompletedAt: string;
  analysis: ClinicalAnalysis;
}

export function ClinicalReportViewer({ patientId, patientName }: ClinicalReportViewerProps) {
  const [analysis, setAnalysis] = useState<AnalysisResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const fetchAnalysis = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/medical-screening/analyze?patientId=${patientId}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to load analysis');
      }

      setAnalysis(data);
    } catch (error) {
      console.error('Error fetching analysis:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to load clinical analysis',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalysis();
  }, [patientId]);

  if (loading) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="flex flex-col items-center justify-center gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Analyzing medical screening data...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!analysis) {
    return null;
  }

  const { analysis: clinicalData } = analysis;

  return (
    <div>
      {/* Risk Score Overview */}
      <Card className={`border-2 ${
        clinicalData.urgencyLevel === 'urgent' ? 'border-red-500 bg-red-50' :
        clinicalData.urgencyLevel === 'high' ? 'border-orange-500 bg-orange-50' :
        clinicalData.urgencyLevel === 'moderate' ? 'border-yellow-500 bg-yellow-50' :
        'border-green-500 bg-green-50'
      }`}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Clinical Risk Assessment
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Risk Score</p>
              <p className="text-3xl font-bold">{clinicalData.riskScore}/100</p>
            </div>
            <Badge
              variant={clinicalData.urgencyLevel === 'urgent' || clinicalData.urgencyLevel === 'high' ? 'destructive' : 'secondary'}
              className="text-lg px-4 py-2"
            >
              {clinicalData.urgencyLevel.toUpperCase()}
            </Badge>
          </div>
          
          <div className="p-4 bg-card rounded-lg border">
            <p className="text-sm font-semibold mb-2">Clinical Summary:</p>
            <p className="text-sm">{clinicalData.clinicalSummary}</p>
          </div>
        </CardContent>
      </Card>

      {/* Tabs for detailed analysis */}
      <Tabs defaultValue="red-flags" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="red-flags">
            <AlertTriangle className="h-4 w-4 mr-2" />
            Red Flags
          </TabsTrigger>
          <TabsTrigger value="modalities">
            <Zap className="h-4 w-4 mr-2" />
            Modalities
          </TabsTrigger>
          <TabsTrigger value="planning">
            <Clock className="h-4 w-4 mr-2" />
            Planning
          </TabsTrigger>
          <TabsTrigger value="triage">
            <Shield className="h-4 w-4 mr-2" />
            Triage
          </TabsTrigger>
        </TabsList>

        {/* Red Flags Tab */}
        <TabsContent value="red-flags" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-600" />
                Red Flag Assessment
              </CardTitle>
            </CardHeader>
            <CardContent>
              {clinicalData.redFlagAssessment.flags.length === 0 ? (
                <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-lg">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <p className="text-sm font-medium text-green-700">
                    No red flags detected. Standard care pathway appropriate.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {clinicalData.redFlagAssessment.flags.map((flag, index) => (
                    <div>
                      <div className="flex items-start gap-3">
                        <AlertCircle className={`h-5 w-5 flex-shrink-0 mt-0.5 ${
                          flag.urgencyLevel === 'urgent' ? 'text-red-600' :
                          flag.urgencyLevel === 'high' ? 'text-orange-600' :
                          'text-yellow-600'
                        }`} />
                        <div className="flex-1">
                          <p className="font-semibold text-sm">{flag.flag}</p>
                          <p className="text-sm text-muted-foreground mt-1">{flag.evidence}</p>
                          <div className="mt-2 pt-2 border-t">
                            <p className="text-xs font-medium text-muted-foreground">Suggested Action:</p>
                            <p className="text-sm font-medium mt-1">{flag.suggestedAction}</p>
                          </div>
                        </div>
                        <Badge variant={flag.urgencyLevel === 'urgent' ? 'destructive' : 'secondary'}>
                          {flag.urgencyLevel}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Modalities Tab */}
        <TabsContent value="modalities" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5" />
                Modality Safety Gating
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Treatment modality recommendations based on patient screening
              </p>
            </CardHeader>
            <CardContent>
              <Accordion type="single" collapsible className="w-full">
                {Object.entries(clinicalData.modalityGating).map(([modality, assessment], index) => (
                  <AccordionItem key={modality} value={modality}>
                    <AccordionTrigger>
                      <div className="flex items-center gap-3 w-full">
                        <span className="font-medium">{formatModalityName(modality as Modality)}</span>
                        <div className="ml-auto mr-4">
                          {getModalityDecisionBadge(assessment.decision)}
                        </div>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-4 pt-2">
                        {/* Contraindications */}
                        {assessment.contraindications.length > 0 && (
                          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                            <p className="text-sm font-semibold text-red-900 mb-2 flex items-center gap-2">
                              <XCircle className="h-4 w-4" />
                              Contraindications
                            </p>
                            <ul className="list-disc list-inside space-y-1">
                              {assessment.contraindications.map((item, i) => (
                                <li key={i} className="text-sm text-red-800">{item}</li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* Precautions */}
                        {assessment.precautions.length > 0 && (
                          <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                            <p className="text-sm font-semibold text-yellow-900 mb-2 flex items-center gap-2">
                              <AlertTriangle className="h-4 w-4" />
                              Precautions
                            </p>
                            <ul className="list-disc list-inside space-y-1">
                              {assessment.precautions.map((item, i) => (
                                <li key={i} className="text-sm text-yellow-800">{item}</li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* Required Checks */}
                        {assessment.requiredChecks.length > 0 && (
                          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                            <p className="text-sm font-semibold text-blue-900 mb-2 flex items-center gap-2">
                              <ClipboardList className="h-4 w-4" />
                              Required Checks Before Use
                            </p>
                            <ul className="list-disc list-inside space-y-1">
                              {assessment.requiredChecks.map((item, i) => (
                                <li key={i} className="text-sm text-blue-800">{item}</li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* Clinician Notes */}
                        <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                          <p className="text-sm font-semibold text-slate-900 mb-2">Clinician Notes:</p>
                          <ul className="list-disc list-inside space-y-1">
                            {assessment.clinicianNotes.map((note, i) => (
                              <li key={i} className="text-sm text-slate-700">{note}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Planning Tab */}
        <TabsContent value="planning" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Session Planning
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Session Length */}
              <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium">Recommended Session Length:</p>
                  <Badge variant="secondary" className="text-lg">
                    {clinicalData.sessionPlanningSuggestions.recommendedSessionLength} minutes
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  {clinicalData.sessionPlanningSuggestions.justification}
                </p>
              </div>

              {/* Assessment Priorities */}
              <div>
                <p className="text-sm font-semibold mb-3">Assessment Priorities:</p>
                <div className="space-y-2">
                  {clinicalData.sessionPlanningSuggestions.assessmentPriorities.map((priority, index) => (
                    <div key={index} className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg">
                      <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold flex-shrink-0">
                        {index + 1}
                      </div>
                      <p className="text-sm flex-1">{priority}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Follow-up Questions */}
              <div>
                <p className="text-sm font-semibold mb-3 flex items-center gap-2">
                  <HelpCircle className="h-4 w-4" />
                  Targeted Follow-up Questions:
                </p>
                <div className="space-y-3">
                  {clinicalData.targetedFollowUpQuestions.map((q, index) => (
                    <div key={index} className="p-4 bg-card border rounded-lg">
                      <p className="text-sm font-medium mb-2">{q.question}</p>
                      <p className="text-xs text-muted-foreground mb-2">
                        <span className="font-semibold">Why it matters:</span> {q.whyItMatters}
                      </p>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {q.impactsModalities.map((mod, i) => (
                          <Badge key={i} variant="outline" className="text-xs">
                            {mod}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Triage Tab */}
        <TabsContent value="triage" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Triage Classification
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="p-4 bg-slate-50 rounded-lg">
                  <p className="text-xs text-muted-foreground mb-1">Likely Domain</p>
                  <p className="text-sm font-semibold">
                    {clinicalData.triageClassification.likelyDomain.replace('_', ' ')}
                  </p>
                </div>
                <div className="p-4 bg-slate-50 rounded-lg">
                  <p className="text-xs text-muted-foreground mb-1">Acuity</p>
                  <p className="text-sm font-semibold capitalize">
                    {clinicalData.triageClassification.acuity}
                  </p>
                </div>
                <div className="p-4 bg-slate-50 rounded-lg">
                  <p className="text-xs text-muted-foreground mb-1">Complexity</p>
                  <Badge variant={clinicalData.triageClassification.complexity === 'high' ? 'destructive' : 'secondary'}>
                    {clinicalData.triageClassification.complexity}
                  </Badge>
                </div>
              </div>

              <div>
                <p className="text-sm font-semibold mb-3">Clinical Rationale:</p>
                <ul className="list-disc list-inside space-y-2">
                  {clinicalData.triageClassification.rationaleBullets.map((bullet, index) => (
                    <li key={index} className="text-sm text-muted-foreground">{bullet}</li>
                  ))}
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Action Buttons */}
      <div className="flex gap-3">
        <Button onClick={fetchAnalysis} variant="outline">
          <Activity className="h-4 w-4 mr-2" />
          Refresh Analysis
        </Button>
      </div>
    </div>
  );
}

// Helper functions

function formatModalityName(modality: Modality): string {
  const names: Record<Modality, string> = {
    MENS: 'Microcurrent (MENS)',
    EMS_Aussie: 'EMS - Aussie Current',
    EMS_Russian: 'EMS - Russian Stimulation',
    Ultrasound_1MHz: 'Therapeutic Ultrasound (1 MHz)',
    Ultrasound_3MHz: 'Therapeutic Ultrasound (3 MHz)',
    Laser_Therapy: 'Laser Therapy / Photobiomodulation',
    Kinesiotherapy: 'Kinesiotherapy',
    Manual_Therapy: 'Manual Therapy',
    Neuromuscular_Reeducation: 'Neuromuscular Re-education',
    Postural_Exercise: 'Postural Education & Exercise',
  };
  return names[modality] || modality;
}

function getModalityDecisionBadge(decision: ModalityDecision) {
  switch (decision) {
    case 'allowed':
      return (
        <Badge variant="secondary" className="bg-green-100 text-green-800 border-green-300">
          <CheckCircle className="h-3 w-3 mr-1" />
          Allowed
        </Badge>
      );
    case 'allowed_with_precautions':
      return (
        <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 border-yellow-300">
          <AlertTriangle className="h-3 w-3 mr-1" />
          Precautions
        </Badge>
      );
    case 'do_not_use_until_cleared':
      return (
        <Badge variant="destructive">
          <XCircle className="h-3 w-3 mr-1" />
          Do Not Use
        </Badge>
      );
  }
}
