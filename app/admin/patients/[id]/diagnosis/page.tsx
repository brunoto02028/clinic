"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Brain,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  FileText,
  Footprints,
  ScanLine,
  Stethoscope,
  ClipboardCheck,
  Send,
  ChevronDown,
  ChevronUp,
  BookOpen,
  Shield,
  Target,
  AlertTriangle,
  Clock,
  Activity,
  Loader2,
  X,
  Plus,
  ExternalLink,
  MapPin,
  Video,
  Wifi,
  Package,
  PoundSterling,
  Languages,
  Edit,
  Save,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// ─── Types ───

interface DataAvailability {
  hasScreening: boolean;
  hasFootScan: boolean;
  hasBodyAssessment: boolean;
  hasSoapNotes: boolean;
  hasDocuments: boolean;
  screeningId: string | null;
  latestFootScanId: string | null;
  latestBodyAssessmentId: string | null;
  footScanCount: number;
  bodyAssessmentCount: number;
  soapNoteCount: number;
  documentCount: number;
}

interface Diagnosis {
  id: string;
  summary: string;
  conditions: any[];
  findings: any[];
  riskFactors: any[];
  recommendations: any[];
  additionalAssessments: any[];
  references: any[];
  hasScreening: boolean;
  hasFootScan: boolean;
  hasBodyAssessment: boolean;
  hasTherapistNotes: boolean;
  status: string;
  therapistComments: string | null;
  approvedAt: string | null;
  sentToPatientAt: string | null;
  createdAt: string;
  therapist: { firstName: string; lastName: string };
  _count?: { protocols: number };
}

interface Protocol {
  id: string;
  title: string;
  summary: string;
  goals: any[];
  precautions: any[];
  references: any[];
  estimatedWeeks: number | null;
  status: string;
  approvedAt: string | null;
  sentToPatientAt: string | null;
  therapistComments: string | null;
  createdAt: string;
  therapist: { firstName: string; lastName: string };
  diagnosis: { id: string; summary: string };
  items: any[];
}

const STATUS_COLORS: Record<string, string> = {
  GENERATING: "bg-blue-100 text-blue-700",
  DRAFT: "bg-yellow-100 text-yellow-700",
  UNDER_REVIEW: "bg-orange-100 text-orange-700",
  APPROVED: "bg-green-100 text-green-700",
  SENT_TO_PATIENT: "bg-purple-100 text-purple-700",
  ARCHIVED: "bg-gray-100 text-gray-700",
};

const SEVERITY_COLORS: Record<string, string> = {
  mild: "bg-green-100 text-green-700",
  moderate: "bg-yellow-100 text-yellow-700",
  severe: "bg-red-100 text-red-700",
  critical: "bg-red-200 text-red-800",
  low: "bg-green-100 text-green-700",
  high: "bg-red-100 text-red-700",
};

const PHASE_LABELS: Record<string, { label: string; color: string; desc: string }> = {
  SHORT_TERM: { label: "Short-Term (Acute)", color: "bg-red-100 text-red-700 border-red-200", desc: "Weeks 1-4" },
  MEDIUM_TERM: { label: "Medium-Term (Rehab)", color: "bg-amber-100 text-amber-700 border-amber-200", desc: "Weeks 4-12" },
  LONG_TERM: { label: "Long-Term (Maintenance)", color: "bg-green-100 text-green-700 border-green-200", desc: "Weeks 12+" },
};

const ITEM_TYPE_LABELS: Record<string, { label: string; color: string }> = {
  IN_CLINIC: { label: "In-Clinic", color: "bg-blue-100 text-blue-700" },
  HOME_EXERCISE: { label: "Home Exercise", color: "bg-green-100 text-green-700" },
  HOME_CARE: { label: "Home Care", color: "bg-teal-100 text-teal-700" },
  ASSESSMENT: { label: "Assessment", color: "bg-purple-100 text-purple-700" },
};

// ─── Main Page ───

export default function PatientDiagnosisPage() {
  const { id: patientId } = useParams<{ id: string }>();
  const router = useRouter();
  const [tab, setTab] = useState<"diagnosis" | "protocol">("diagnosis");
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [generatingProtocol, setGeneratingProtocol] = useState(false);
  const [error, setError] = useState("");

  const [patient, setPatient] = useState<any>(null);
  const [dataAvail, setDataAvail] = useState<DataAvailability | null>(null);
  const [diagnoses, setDiagnoses] = useState<Diagnosis[]>([]);
  const [protocols, setProtocols] = useState<Protocol[]>([]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [diagRes, protoRes] = await Promise.all([
        fetch(`/api/admin/patients/${patientId}/diagnosis`),
        fetch(`/api/admin/patients/${patientId}/protocol`),
      ]);
      const diagData = await diagRes.json();
      const protoData = await protoRes.json();
      if (!diagRes.ok) throw new Error(diagData.error);
      setPatient(diagData.patient);
      setDataAvail(diagData.dataAvailability);
      setDiagnoses(diagData.diagnoses || []);
      setProtocols(protoData.protocols || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [patientId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleGenerateDiagnosis = async () => {
    setGenerating(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/patients/${patientId}/diagnosis`, {
        method: "POST",
      });
      let data: any;
      try { data = await res.json(); } catch { throw new Error("Invalid server response"); }
      if (!res.ok) throw new Error(data.error);
      fetchData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setGenerating(false);
    }
  };

  const handleGenerateProtocol = async (diagnosisId: string) => {
    setGeneratingProtocol(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/patients/${patientId}/protocol`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ diagnosisId }),
      });
      let data: any;
      try { data = await res.json(); } catch { throw new Error("Invalid server response"); }
      if (!res.ok) throw new Error(data.error);
      setTab("protocol");
      fetchData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setGeneratingProtocol(false);
    }
  };

  const handleUpdateDiagnosis = async (diagnosisId: string, update: any) => {
    try {
      const res = await fetch(`/api/admin/patients/${patientId}/diagnosis`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ diagnosisId, ...update }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error); }
      fetchData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleUpdateProtocol = async (protocolId: string, update: any) => {
    try {
      const res = await fetch(`/api/admin/patients/${patientId}/protocol`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ protocolId, ...update }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error); }
      fetchData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <RefreshCw className="h-5 w-5 animate-spin text-primary" />
        <span className="ml-2 text-sm text-muted-foreground">Loading patient data...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start sm:items-center gap-3 sm:gap-4 flex-wrap">
        <Button variant="ghost" size="sm" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Back
        </Button>
        <div className="min-w-0">
          <h1 className="text-lg sm:text-2xl font-bold flex items-center gap-2">
            <Brain className="h-5 w-5 sm:h-6 sm:w-6 text-primary shrink-0" />
            <span className="truncate">AI Assessment & Treatment</span>
          </h1>
          {patient && (
            <p className="text-xs sm:text-sm text-muted-foreground truncate">
              Patient: <strong>{patient.firstName} {patient.lastName}</strong>
            </p>
          )}
        </div>
      </div>

      {error && (
        <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-lg flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" /> {error}
          <Button variant="ghost" size="sm" className="ml-auto h-6 w-6 p-0" onClick={() => setError("")}><X className="h-3 w-3" /></Button>
        </div>
      )}

      {/* Data Availability */}
      {dataAvail && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <DataCard
            icon={FileText}
            label="Medical Screening"
            available={dataAvail.hasScreening}
            detail={dataAvail.hasScreening ? "Completed" : "Not filled"}
            required
          />
          <DataCard
            icon={Footprints}
            label="Foot Scan"
            available={dataAvail.hasFootScan}
            detail={dataAvail.hasFootScan ? `${dataAvail.footScanCount} scan(s)` : "Not done"}
          />
          <DataCard
            icon={ScanLine}
            label="Body Assessment"
            available={dataAvail.hasBodyAssessment}
            detail={dataAvail.hasBodyAssessment ? `${dataAvail.bodyAssessmentCount} assessment(s)` : "Not done"}
          />
          <DataCard
            icon={Stethoscope}
            label="Clinical Notes"
            available={dataAvail.hasSoapNotes}
            detail={dataAvail.hasSoapNotes ? `${dataAvail.soapNoteCount} note(s)` : "None"}
          />
          <DataCard
            icon={FileText}
            label="Documents"
            available={dataAvail.hasDocuments}
            detail={dataAvail.hasDocuments ? `${dataAvail.documentCount} doc(s)` : "None"}
          />
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-muted rounded-lg p-1">
        <button
          className={`flex-1 text-sm font-medium py-2 px-4 rounded-md transition-colors ${tab === "diagnosis" ? "bg-background shadow-sm" : "hover:bg-background/50"}`}
          onClick={() => setTab("diagnosis")}
        >
          <Brain className="h-4 w-4 inline mr-1.5" />
          AI Assessment ({diagnoses.length})
        </button>
        <button
          className={`flex-1 text-sm font-medium py-2 px-4 rounded-md transition-colors ${tab === "protocol" ? "bg-background shadow-sm" : "hover:bg-background/50"}`}
          onClick={() => setTab("protocol")}
        >
          <ClipboardCheck className="h-4 w-4 inline mr-1.5" />
          Treatment Protocol ({protocols.length})
        </button>
      </div>

      {/* Assessment Tab */}
      {tab === "diagnosis" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">AI Assessment</h2>
            <Button onClick={handleGenerateDiagnosis} disabled={generating}>
              {generating ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Generating...</>
              ) : (
                <><Brain className="h-4 w-4 mr-2" /> Generate AI Assessment</>
              )}
            </Button>
          </div>

          {generating && (
            <Card className="border-primary/30 bg-primary/5">
              <CardContent className="flex items-center gap-3 py-6">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                <div>
                  <p className="font-medium">AI is analyzing patient data...</p>
                  <p className="text-sm text-muted-foreground">Reading screening, assessments, and clinical notes. This may take 10-30 seconds.</p>
                </div>
              </CardContent>
            </Card>
          )}

          {diagnoses.length === 0 && !generating && (
            <Card className="border-dashed">
              <CardContent className="py-10 text-center text-muted-foreground">
                <Brain className="h-10 w-10 mx-auto mb-3 text-muted-foreground/40" />
                <p>No AI assessment generated yet.</p>
                <p className="text-sm mt-1">Click "Generate AI Assessment" to analyze all available patient data.</p>
              </CardContent>
            </Card>
          )}

          {diagnoses.map((diag) => (
            <DiagnosisCard
              key={diag.id}
              diagnosis={diag}
              onUpdate={(update) => handleUpdateDiagnosis(diag.id, update)}
              onGenerateProtocol={() => handleGenerateProtocol(diag.id)}
              generatingProtocol={generatingProtocol}
            />
          ))}
        </div>
      )}

      {/* Protocol Tab */}
      {tab === "protocol" && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Treatment Protocols</h2>

          {generatingProtocol && (
            <Card className="border-primary/30 bg-primary/5">
              <CardContent className="flex items-center gap-3 py-6">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                <div>
                  <p className="font-medium">AI is creating treatment protocol...</p>
                  <p className="text-sm text-muted-foreground">Building phased plan with exercises, treatments and references. 15-45 seconds.</p>
                </div>
              </CardContent>
            </Card>
          )}

          {protocols.length === 0 && !generatingProtocol && (
            <Card className="border-dashed">
              <CardContent className="py-10 text-center text-muted-foreground">
                <ClipboardCheck className="h-10 w-10 mx-auto mb-3 text-muted-foreground/40" />
                <p>No treatment protocol created yet.</p>
                <p className="text-sm mt-1">First approve an assessment, then generate a treatment protocol.</p>
              </CardContent>
            </Card>
          )}

          {protocols.map((proto) => (
            <ProtocolCard
              key={proto.id}
              protocol={proto}
              onUpdate={(update) => handleUpdateProtocol(proto.id, update)}
              patientId={patientId}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Data Availability Card ───

function DataCard({ icon: Icon, label, available, detail, required }: {
  icon: any; label: string; available: boolean; detail: string; required?: boolean;
}) {
  return (
    <Card className={available ? "border-green-200 bg-green-50/50 dark:bg-green-950/20" : "border-dashed"}>
      <CardContent className="pt-3 pb-2 px-3">
        <div className="flex items-center gap-2 mb-1">
          <Icon className={`h-4 w-4 ${available ? "text-green-600" : "text-muted-foreground"}`} />
          <span className="text-xs font-semibold">{label}</span>
          {required && <Badge variant="outline" className="text-[9px] px-1 py-0">Required</Badge>}
        </div>
        <div className="flex items-center gap-1.5">
          {available ? (
            <CheckCircle2 className="h-3 w-3 text-green-600" />
          ) : (
            <AlertCircle className="h-3 w-3 text-muted-foreground" />
          )}
          <span className={`text-xs ${available ? "text-green-700" : "text-muted-foreground"}`}>{detail}</span>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Assessment Card ───

function DiagnosisCard({ diagnosis: d, onUpdate, onGenerateProtocol, generatingProtocol }: {
  diagnosis: Diagnosis;
  onUpdate: (update: any) => void;
  onGenerateProtocol: () => void;
  generatingProtocol: boolean;
}) {
  const [expanded, setExpanded] = useState(true);
  const [showRefs, setShowRefs] = useState(false);
  const [comment, setComment] = useState(d.therapistComments || "");

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <CardTitle className="text-base">AI Assessment</CardTitle>
              <Badge className={`text-[10px] ${STATUS_COLORS[d.status] || ""}`}>{d.status.replace("_", " ")}</Badge>
              {d.hasScreening && <Badge variant="outline" className="text-[10px]">Screening</Badge>}
              {d.hasFootScan && <Badge variant="outline" className="text-[10px]">Foot Scan</Badge>}
              {d.hasBodyAssessment && <Badge variant="outline" className="text-[10px]">Body Assessment</Badge>}
              {d.hasTherapistNotes && <Badge variant="outline" className="text-[10px]">Clinical Notes</Badge>}
            </div>
            <p className="text-xs text-muted-foreground">
              By {d.therapist.firstName} {d.therapist.lastName} · {new Date(d.createdAt).toLocaleString()}
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setExpanded(!expanded)}>
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </div>
      </CardHeader>

      {expanded && (
        <CardContent className="space-y-4 pt-0">
          {/* Summary */}
          <div className="bg-muted/30 rounded-lg p-4">
            <h4 className="text-sm font-semibold mb-1 flex items-center gap-1.5">
              <FileText className="h-4 w-4" /> Clinical Summary
            </h4>
            <p className="text-sm leading-relaxed">{d.summary}</p>
          </div>

          {/* Conditions */}
          {d.conditions?.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold mb-2 flex items-center gap-1.5">
                <Target className="h-4 w-4" /> Identified Conditions ({d.conditions.length})
              </h4>
              <div className="space-y-2">
                {d.conditions.map((c: any, i: number) => (
                  <div key={i} className="border rounded-lg p-3">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="font-medium text-sm">{c.name}</span>
                      <Badge className={`text-[10px] ${SEVERITY_COLORS[c.severity] || ""}`}>{c.severity}</Badge>
                      {c.bodyRegion && <Badge variant="outline" className="text-[10px]">{c.bodyRegion}</Badge>}
                      {c.confidence && <span className="text-[10px] text-muted-foreground">Confidence: {c.confidence}</span>}
                    </div>
                    <p className="text-xs text-muted-foreground">{c.description}</p>
                    {c.references?.map((r: any, j: number) => (
                      <p key={j} className="text-[10px] text-primary/70 mt-1 italic">
                        <BookOpen className="h-2.5 w-2.5 inline mr-0.5" /> {r.citation}
                      </p>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Risk Factors */}
          {d.riskFactors?.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold mb-2 flex items-center gap-1.5">
                <AlertTriangle className="h-4 w-4" /> Risk Factors
              </h4>
              <div className="space-y-1">
                {d.riskFactors.map((r: any, i: number) => (
                  <div key={i} className="flex items-start gap-2 text-sm">
                    <Badge className={`text-[10px] shrink-0 ${SEVERITY_COLORS[r.level] || ""}`}>{r.level}</Badge>
                    <div>
                      <span className="font-medium">{r.factor}</span>
                      <span className="text-muted-foreground"> — {r.description}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recommendations */}
          {d.recommendations?.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold mb-2 flex items-center gap-1.5">
                <Activity className="h-4 w-4" /> Recommendations
              </h4>
              <div className="space-y-2">
                {d.recommendations.map((r: any, i: number) => (
                  <div key={i} className="border rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline" className="text-[10px]">{r.type}</Badge>
                      <Badge className={`text-[10px] ${r.priority === "immediate" ? "bg-red-100 text-red-700" : r.priority === "high" ? "bg-orange-100 text-orange-700" : "bg-blue-100 text-blue-700"}`}>{r.priority}</Badge>
                    </div>
                    <p className="text-sm">{r.description}</p>
                    {r.rationale && <p className="text-xs text-muted-foreground mt-1">{r.rationale}</p>}
                    {r.references?.map((ref: any, j: number) => (
                      <p key={j} className="text-[10px] text-primary/70 mt-1 italic">
                        <BookOpen className="h-2.5 w-2.5 inline mr-0.5" /> {ref.citation}
                      </p>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Additional Assessments Needed */}
          {d.additionalAssessments?.length > 0 && (
            <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 rounded-lg p-3">
              <h4 className="text-sm font-semibold mb-2 flex items-center gap-1.5 text-amber-700">
                <AlertTriangle className="h-4 w-4" /> Additional Assessments Recommended
              </h4>
              {d.additionalAssessments.map((a: any, i: number) => (
                <div key={i} className="flex items-center gap-2 text-sm mb-1">
                  <Badge className={`text-[10px] ${a.priority === "required" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"}`}>{a.priority}</Badge>
                  <span className="font-medium">{a.assessmentType?.replace("_", " ")}</span>
                  <span className="text-muted-foreground">— {a.reason}</span>
                </div>
              ))}
            </div>
          )}

          {/* References */}
          {d.references?.length > 0 && (
            <div>
              <button
                className="text-sm font-semibold flex items-center gap-1.5 text-primary hover:underline"
                onClick={() => setShowRefs(!showRefs)}
              >
                <BookOpen className="h-4 w-4" /> References ({d.references.length})
                {showRefs ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              </button>
              {showRefs && (
                <div className="mt-2 space-y-1.5 pl-2 border-l-2 border-primary/20">
                  {d.references.map((r: any, i: number) => (
                    <div key={i} className="text-xs">
                      <p className="text-foreground">{r.citation}</p>
                      {r.doi && (
                        <a href={`https://doi.org/${r.doi}`} target="_blank" rel="noopener noreferrer" className="text-primary/70 hover:underline flex items-center gap-0.5">
                          DOI: {r.doi} <ExternalLink className="h-2.5 w-2.5" />
                        </a>
                      )}
                      {r.relevantTo && <p className="text-muted-foreground italic">Relevant to: {r.relevantTo}</p>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Therapist Comments */}
          <div className="space-y-2 border-t pt-3">
            <Label className="text-sm font-semibold">Therapist Comments</Label>
            <Textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Add your clinical comments, corrections or notes..."
              rows={2}
            />
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 flex-wrap border-t pt-3">
            {d.status === "DRAFT" && (
              <>
                <Button size="sm" variant="outline" onClick={() => onUpdate({ status: "UNDER_REVIEW", therapistComments: comment })}>
                  <Shield className="h-3.5 w-3.5 mr-1" /> Mark Under Review
                </Button>
                <Button size="sm" onClick={() => onUpdate({ status: "APPROVED", therapistComments: comment })}>
                  <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Approve Assessment
                </Button>
              </>
            )}
            {d.status === "UNDER_REVIEW" && (
              <Button size="sm" onClick={() => onUpdate({ status: "APPROVED", therapistComments: comment })}>
                <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Approve Assessment
              </Button>
            )}
            {(d.status === "APPROVED" || d.status === "DRAFT" || d.status === "UNDER_REVIEW") && (
              <Button size="sm" variant="outline" onClick={onGenerateProtocol} disabled={generatingProtocol}>
                {generatingProtocol ? (
                  <><Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> Generating...</>
                ) : (
                  <><Plus className="h-3.5 w-3.5 mr-1" /> Generate Treatment Protocol</>
                )}
              </Button>
            )}
            {d.status === "APPROVED" && !d.sentToPatientAt && (
              <Button size="sm" variant="default" onClick={() => onUpdate({ status: "SENT_TO_PATIENT" })}>
                <Send className="h-3.5 w-3.5 mr-1" /> Send to Patient
              </Button>
            )}
            {comment !== (d.therapistComments || "") && (
              <Button size="sm" variant="ghost" onClick={() => onUpdate({ therapistComments: comment })}>
                Save Comments
              </Button>
            )}
          </div>
        </CardContent>
      )}
    </Card>
  );
}

// ─── Protocol Card (Enhanced) ───

const DELIVERY_MODES = [
  { value: "IN_CLINIC", label: "In-Clinic", icon: MapPin, color: "text-blue-600", desc: "Patient visits the clinic" },
  { value: "HOME_VISIT", label: "Home Visit", icon: Wifi, color: "text-orange-600", desc: "Therapist visits patient" },
  { value: "REMOTE", label: "Remote / Online", icon: Video, color: "text-green-600", desc: "Online video sessions" },
];

function ProtocolCard({ protocol: p, onUpdate, patientId }: {
  protocol: Protocol;
  onUpdate: (update: any) => void;
  patientId: string;
}) {
  const [expanded, setExpanded] = useState(true);
  const [showRefs, setShowRefs] = useState(false);
  const [editing, setEditing] = useState(false);
  const [showPackageForm, setShowPackageForm] = useState(false);
  const [saving, setSaving] = useState(false);

  // Editable protocol fields
  const [editTitle, setEditTitle] = useState(p.title);
  const [editSummary, setEditSummary] = useState(p.summary);
  const [editDelivery, setEditDelivery] = useState((p as any).deliveryMode || "IN_CLINIC");
  const [editTotalSessions, setEditTotalSessions] = useState((p as any).totalSessions || 12);
  const [editSessionsPerWeek, setEditSessionsPerWeek] = useState((p as any).sessionsPerWeek || 2);
  const [editLanguage, setEditLanguage] = useState((p as any).language || "en-GB");
  const [editComment, setEditComment] = useState(p.therapistComments || "");

  // Package form
  const [pkgForm, setPkgForm] = useState({
    pricePerSession: 60,
    pricePerWeek: 0,
    priceFullPackage: 0,
    consultationFee: 80,
    selectedPaymentType: "FULL_PACKAGE",
    currency: "GBP",
  });
  const [pkgSaving, setPkgSaving] = useState(false);
  const [pkgMsg, setPkgMsg] = useState("");
  const [pkgDeleting, setPkgDeleting] = useState<string | null>(null);

  const existingPackages = (p as any).packages || [];
  const hasUnpaidPackage = existingPackages.some((pk: any) => !pk.isPaid);

  const hasElectro = (p as any).includesElectrotherapy || p.items?.some((it: any) => it.treatmentTypeName?.toLowerCase().includes("electro") || it.treatmentTypeName?.toLowerCase().includes("tens") || it.treatmentTypeName?.toLowerCase().includes("ultrasound"));

  const saveEdits = async () => {
    setSaving(true);
    onUpdate({
      title: editTitle,
      summary: editSummary,
      deliveryMode: editDelivery,
      totalSessions: editTotalSessions,
      sessionsPerWeek: editSessionsPerWeek,
      language: editLanguage,
      therapistComments: editComment,
      includesElectrotherapy: hasElectro,
    });
    setTimeout(() => { setSaving(false); setEditing(false); }, 500);
  };

  const createPackage = async () => {
    setPkgSaving(true); setPkgMsg("");
    try {
      const totalPrice = pkgForm.pricePerSession * editTotalSessions;
      const res = await fetch(`/api/admin/patients/${patientId}/packages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          protocolId: p.id,
          name: `${editTitle} — ${editTotalSessions} Sessions`,
          totalSessions: editTotalSessions,
          pricePerSession: pkgForm.pricePerSession,
          pricePerWeek: pkgForm.pricePerWeek || (pkgForm.pricePerSession * editSessionsPerWeek),
          priceFullPackage: pkgForm.priceFullPackage || (totalPrice * 0.9),
          consultationFee: pkgForm.consultationFee,
          selectedPaymentType: pkgForm.selectedPaymentType,
          currency: pkgForm.currency,
          inClinicSessions: editDelivery === "IN_CLINIC" ? editTotalSessions : (hasElectro ? Math.ceil(editTotalSessions * 0.4) : 0),
          remoteSessions: editDelivery === "REMOTE" ? editTotalSessions : 0,
          homeVisitSessions: editDelivery === "HOME_VISIT" ? editTotalSessions : 0,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setPkgMsg("Package created successfully!");
      setShowPackageForm(false);
    } catch (err: any) { setPkgMsg(`Error: ${err.message}`); }
    finally { setPkgSaving(false); }
  };

  // Group items by phase
  const byPhase: Record<string, any[]> = {};
  p.items?.forEach((item: any) => {
    if (!byPhase[item.phase]) byPhase[item.phase] = [];
    byPhase[item.phase].push(item);
  });
  const phaseOrder = ["SHORT_TERM", "MEDIUM_TERM", "LONG_TERM"];

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              {editing ? (
                <Input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} className="text-base font-semibold h-8 max-w-md" />
              ) : (
                <CardTitle className="text-base">{p.title}</CardTitle>
              )}
              <Badge className={`text-[10px] ${STATUS_COLORS[p.status] || ""}`}>{p.status.replace("_", " ")}</Badge>
              {p.estimatedWeeks && <Badge variant="outline" className="text-[10px]"><Clock className="h-2.5 w-2.5 mr-0.5" /> {p.estimatedWeeks} weeks</Badge>}
              {(p as any).totalSessions && <Badge variant="outline" className="text-[10px]">{(p as any).totalSessions} sessions</Badge>}
              {hasElectro && <Badge className="text-[10px] bg-yellow-100 text-yellow-700"><Zap className="h-2 w-2 mr-0.5" /> Electro</Badge>}
            </div>
            <p className="text-xs text-muted-foreground">
              By {p.therapist.firstName} {p.therapist.lastName} · {new Date(p.createdAt).toLocaleString()}
            </p>
          </div>
          <div className="flex gap-1">
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setEditing(!editing)}>
              <Edit className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setExpanded(!expanded)}>
              {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </CardHeader>

      {expanded && (
        <CardContent className="space-y-4 pt-0">
          {/* Summary */}
          {editing ? (
            <Textarea value={editSummary} onChange={(e) => setEditSummary(e.target.value)} rows={3} className="text-sm" />
          ) : (
            <p className="text-sm bg-muted/30 rounded-lg p-3">{p.summary}</p>
          )}

          {/* ─── Session Delivery Configuration ─── */}
          <div className="border rounded-lg p-3 space-y-3 bg-muted/20">
            <h4 className="text-sm font-semibold flex items-center gap-1.5"><MapPin className="h-4 w-4" /> Session Configuration</h4>

            {/* Delivery Mode */}
            <div className="grid grid-cols-3 gap-2">
              {DELIVERY_MODES.map((dm) => {
                const Icon = dm.icon;
                const isDisabled = dm.value === "REMOTE" && hasElectro;
                const isSelected = editDelivery === dm.value;
                return (
                  <button
                    key={dm.value}
                    disabled={isDisabled || !editing}
                    onClick={() => editing && setEditDelivery(dm.value)}
                    className={`rounded-lg border p-2 text-center transition-all ${isSelected ? "border-primary bg-primary/5 ring-1 ring-primary" : "hover:bg-muted/50"} ${isDisabled ? "opacity-40 cursor-not-allowed" : "cursor-pointer"}`}
                  >
                    <Icon className={`h-4 w-4 mx-auto mb-1 ${isSelected ? "text-primary" : dm.color}`} />
                    <p className="text-xs font-medium">{dm.label}</p>
                    <p className="text-[9px] text-muted-foreground">{dm.desc}</p>
                  </button>
                );
              })}
            </div>

            {hasElectro && editDelivery === "REMOTE" && (
              <div className="bg-amber-50 border border-amber-200 rounded p-2 text-xs text-amber-700 flex items-start gap-1.5">
                <Zap className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                This protocol includes electrotherapy which requires in-person attendance. Fully remote delivery is not available.
              </div>
            )}

            {/* Session counts & Language */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div>
                <Label className="text-[10px]">Total Sessions</Label>
                <Input type="number" value={editTotalSessions} onChange={(e) => setEditTotalSessions(parseInt(e.target.value) || 0)} disabled={!editing} className="h-8 text-sm" />
              </div>
              <div>
                <Label className="text-[10px]">Sessions/Week</Label>
                <Input type="number" value={editSessionsPerWeek} onChange={(e) => setEditSessionsPerWeek(parseInt(e.target.value) || 0)} disabled={!editing} className="h-8 text-sm" />
              </div>
              <div className="sm:col-span-2">
                <Label className="text-[10px] flex items-center gap-1"><Languages className="h-3 w-3" /> Language</Label>
                <div className="flex gap-1 mt-1">
                  {[{ v: "en-GB", l: "English (UK)" }, { v: "pt-BR", l: "Português (BR)" }].map((lang) => (
                    <button
                      key={lang.v}
                      disabled={!editing}
                      onClick={() => editing && setEditLanguage(lang.v)}
                      className={`flex-1 text-[10px] font-medium py-1.5 px-2 rounded-md border transition-colors ${editLanguage === lang.v ? "border-primary bg-primary/5 text-primary" : "hover:bg-muted/50"}`}
                    >
                      {lang.l}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Therapist Comments */}
          {editing && (
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Therapist Comments</Label>
              <Textarea value={editComment} onChange={(e) => setEditComment(e.target.value)} placeholder="Add comments, corrections..." rows={2} />
            </div>
          )}

          {/* Save Edits Button */}
          {editing && (
            <div className="flex gap-2">
              <Button size="sm" onClick={saveEdits} disabled={saving}>
                {saving ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Save className="h-3.5 w-3.5 mr-1" />} Save Changes
              </Button>
              <Button size="sm" variant="outline" onClick={() => setEditing(false)}>Cancel</Button>
            </div>
          )}

          {/* Goals */}
          {p.goals?.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold mb-2">Treatment Goals</h4>
              <div className="space-y-1">
                {p.goals.map((g: any, i: number) => (
                  <div key={i} className="flex items-center gap-2 text-sm">
                    <Badge className={`text-[10px] ${PHASE_LABELS[g.phase]?.color || ""}`}>{g.timeline}</Badge>
                    <span>{g.goal}</span>
                    {g.metrics && <span className="text-muted-foreground text-xs">({g.metrics})</span>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Precautions */}
          {p.precautions?.length > 0 && (
            <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 rounded-lg p-3">
              <h4 className="text-sm font-semibold mb-1 text-red-700 flex items-center gap-1.5">
                <AlertTriangle className="h-4 w-4" /> Precautions
              </h4>
              {p.precautions.map((pc: any, i: number) => (
                <p key={i} className="text-sm text-red-700">• {pc.precaution}</p>
              ))}
            </div>
          )}

          {/* Items by Phase */}
          {phaseOrder.map((phase) => {
            const items = byPhase[phase];
            if (!items || items.length === 0) return null;
            const meta = PHASE_LABELS[phase];

            return (
              <div key={phase}>
                <div className={`rounded-lg border p-3 mb-2 ${meta.color}`}>
                  <h4 className="text-sm font-bold">{meta.label}</h4>
                  <p className="text-[11px]">{meta.desc} · {items.length} items</p>
                </div>
                <div className="space-y-2 ml-2 border-l-2 pl-3">
                  {items.map((item: any, i: number) => (
                    <div key={i} className="border rounded-lg p-3">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <Badge className={`text-[10px] ${ITEM_TYPE_LABELS[item.itemType]?.color || ""}`}>
                          {ITEM_TYPE_LABELS[item.itemType]?.label || item.itemType}
                        </Badge>
                        <span className="font-medium text-sm">{item.title}</span>
                        {item.bodyRegion && <Badge variant="outline" className="text-[10px]">{item.bodyRegion}</Badge>}
                      </div>
                      <p className="text-xs text-muted-foreground mb-1">{item.description}</p>

                      <div className="flex flex-wrap gap-2 text-[11px]">
                        {item.frequency && <span className="bg-muted px-1.5 py-0.5 rounded">{item.frequency}</span>}
                        {item.sets && <span className="bg-muted px-1.5 py-0.5 rounded">{item.sets} sets</span>}
                        {item.reps && <span className="bg-muted px-1.5 py-0.5 rounded">{item.reps} reps</span>}
                        {item.holdSeconds && <span className="bg-muted px-1.5 py-0.5 rounded">Hold {item.holdSeconds}s</span>}
                        {item.restSeconds && <span className="bg-muted px-1.5 py-0.5 rounded">Rest {item.restSeconds}s</span>}
                        {item.sessionsPerWeek && <span className="bg-muted px-1.5 py-0.5 rounded">{item.sessionsPerWeek}x/week</span>}
                        {item.sessionDuration && <span className="bg-muted px-1.5 py-0.5 rounded">{item.sessionDuration}min</span>}
                        {item.startWeek && <span className="bg-muted px-1.5 py-0.5 rounded">Week {item.startWeek}{item.endWeek ? `-${item.endWeek}` : "+"}</span>}
                      </div>

                      {item.exercise && (
                        <div className="mt-1.5 flex items-center gap-1.5 text-xs text-primary">
                          <Activity className="h-3 w-3" />
                          <span>{item.exercise.name}</span>
                          {item.exercise.videoUrl && <Badge variant="outline" className="text-[9px]">Video</Badge>}
                        </div>
                      )}

                      {item.references?.map((r: any, j: number) => (
                        <p key={j} className="text-[10px] text-primary/70 mt-1 italic">
                          <BookOpen className="h-2.5 w-2.5 inline mr-0.5" /> {r.citation}
                        </p>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}

          {/* References */}
          {p.references?.length > 0 && (
            <div>
              <button
                className="text-sm font-semibold flex items-center gap-1.5 text-primary hover:underline"
                onClick={() => setShowRefs(!showRefs)}
              >
                <BookOpen className="h-4 w-4" /> References ({p.references.length})
                {showRefs ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              </button>
              {showRefs && (
                <div className="mt-2 space-y-1.5 pl-2 border-l-2 border-primary/20">
                  {p.references.map((r: any, i: number) => (
                    <div key={i} className="text-xs">
                      <p>{r.citation}</p>
                      {r.doi && (
                        <a href={`https://doi.org/${r.doi}`} target="_blank" rel="noopener noreferrer" className="text-primary/70 hover:underline">
                          DOI: {r.doi}
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ─── Financial Package Section ─── */}
          {showPackageForm && (
            <div className="border-2 border-primary/30 rounded-lg p-4 space-y-3 bg-primary/5">
              <h4 className="text-sm font-semibold flex items-center gap-1.5"><Package className="h-4 w-4" /> Create Financial Package</h4>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div>
                  <Label className="text-[10px]">Price per Session (£)</Label>
                  <Input type="number" step="0.01" value={pkgForm.pricePerSession} onChange={(e) => setPkgForm({ ...pkgForm, pricePerSession: parseFloat(e.target.value) || 0 })} className="h-8 text-sm" />
                </div>
                <div>
                  <Label className="text-[10px]">Weekly Price (£)</Label>
                  <Input type="number" step="0.01" value={pkgForm.pricePerWeek || ""} onChange={(e) => setPkgForm({ ...pkgForm, pricePerWeek: parseFloat(e.target.value) || 0 })} className="h-8 text-sm" placeholder="Auto" />
                </div>
                <div>
                  <Label className="text-[10px]">Full Package (£)</Label>
                  <Input type="number" step="0.01" value={pkgForm.priceFullPackage || ""} onChange={(e) => setPkgForm({ ...pkgForm, priceFullPackage: parseFloat(e.target.value) || 0 })} className="h-8 text-sm" placeholder="Auto -10%" />
                </div>
                <div>
                  <Label className="text-[10px]">Consultation Fee (£)</Label>
                  <Input type="number" step="0.01" value={pkgForm.consultationFee} onChange={(e) => setPkgForm({ ...pkgForm, consultationFee: parseFloat(e.target.value) || 0 })} className="h-8 text-sm" />
                </div>
                <div className="col-span-2">
                  <Label className="text-[10px]">Payment Type</Label>
                  <div className="flex gap-1 mt-1">
                    {[{ v: "PER_SESSION", l: "Per Session" }, { v: "WEEKLY", l: "Weekly" }, { v: "FULL_PACKAGE", l: "Full Package" }].map((pt) => (
                      <button
                        key={pt.v}
                        onClick={() => setPkgForm({ ...pkgForm, selectedPaymentType: pt.v })}
                        className={`flex-1 text-[10px] font-medium py-1.5 px-2 rounded-md border transition-colors ${pkgForm.selectedPaymentType === pt.v ? "border-primary bg-primary/10 text-primary" : "hover:bg-muted/50"}`}
                      >
                        {pt.l}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Price Summary */}
              <div className="bg-background rounded p-2 text-xs space-y-1">
                <div className="flex justify-between"><span>Sessions × Price:</span><span className="font-semibold">£{(pkgForm.pricePerSession * editTotalSessions).toFixed(2)}</span></div>
                <div className="flex justify-between"><span>Consultation Fee:</span><span>£{pkgForm.consultationFee.toFixed(2)}</span></div>
                <div className="flex justify-between font-bold border-t pt-1">
                  <span>Total ({pkgForm.selectedPaymentType === "FULL_PACKAGE" ? "package" : pkgForm.selectedPaymentType === "WEEKLY" ? "weekly" : "per session"}):</span>
                  <span>£{pkgForm.selectedPaymentType === "FULL_PACKAGE"
                    ? ((pkgForm.priceFullPackage || pkgForm.pricePerSession * editTotalSessions * 0.9) + pkgForm.consultationFee).toFixed(2)
                    : pkgForm.selectedPaymentType === "WEEKLY"
                    ? ((pkgForm.pricePerWeek || pkgForm.pricePerSession * editSessionsPerWeek) + pkgForm.consultationFee / (p.estimatedWeeks || 12)).toFixed(2) + "/week"
                    : (pkgForm.pricePerSession + pkgForm.consultationFee / editTotalSessions).toFixed(2) + "/session"
                  }</span>
                </div>
              </div>

              <div className="flex gap-2">
                <Button size="sm" onClick={createPackage} disabled={pkgSaving}>
                  {pkgSaving ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Package className="h-3.5 w-3.5 mr-1" />} Create Package
                </Button>
                <Button size="sm" variant="outline" onClick={() => setShowPackageForm(false)}>Cancel</Button>
              </div>
              {pkgMsg && <p className={`text-xs ${pkgMsg.startsWith("Error") ? "text-red-600" : "text-green-600"}`}>{pkgMsg}</p>}
            </div>
          )}

          {/* Existing Packages */}
          {existingPackages.length > 0 && (
            <div className="border rounded-lg p-3 space-y-2 bg-muted/20">
              <h4 className="text-xs font-semibold flex items-center gap-1.5"><Package className="h-3.5 w-3.5" /> Financial Packages ({existingPackages.length})</h4>
              {existingPackages.map((pk: any) => (
                <div key={pk.id} className="flex items-center justify-between text-xs bg-background rounded p-2 border">
                  <div className="flex items-center gap-2">
                    <span className={`inline-block w-2 h-2 rounded-full ${pk.isPaid ? "bg-green-500" : pk.status === "SENT" ? "bg-blue-500" : pk.status === "CANCELLED" ? "bg-red-500" : "bg-yellow-500"}`} />
                    <span className="font-medium">{pk.name}</span>
                    <Badge variant="outline" className="text-[9px]">{pk.status}</Badge>
                    <span className="text-muted-foreground">£{(pk.priceFullPackage || pk.pricePerSession * pk.totalSessions).toFixed(2)}</span>
                  </div>
                  {!pk.isPaid && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                      disabled={pkgDeleting === pk.id}
                      onClick={async () => {
                        if (!confirm("Delete this package?")) return;
                        setPkgDeleting(pk.id);
                        try {
                          const res = await fetch(`/api/admin/patients/${patientId}/packages?packageId=${pk.id}`, { method: "DELETE" });
                          const data = await res.json();
                          if (!res.ok) throw new Error(data.error);
                          setPkgMsg("Package deleted.");
                          // Trigger parent refresh
                          onUpdate({});
                        } catch (err: any) { setPkgMsg(`Error: ${err.message}`); }
                        finally { setPkgDeleting(null); }
                      }}
                    >
                      {pkgDeleting === pk.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <X className="h-3 w-3" />}
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-2 flex-wrap border-t pt-3">
            {p.status === "DRAFT" && (
              <Button size="sm" onClick={() => onUpdate({ status: "APPROVED", therapistComments: editComment })}>
                <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Approve Protocol
              </Button>
            )}
            {p.status === "APPROVED" && !hasUnpaidPackage && !showPackageForm && (
              <Button size="sm" variant="outline" onClick={() => setShowPackageForm(true)}>
                <Package className="h-3.5 w-3.5 mr-1" /> Create Financial Package
              </Button>
            )}
            {p.status === "APPROVED" && !p.sentToPatientAt && (
              <Button size="sm" onClick={() => onUpdate({ status: "SENT_TO_PATIENT" })}>
                <Send className="h-3.5 w-3.5 mr-1" /> Send to Patient
              </Button>
            )}
            {p.sentToPatientAt && (
              <span className="text-xs text-green-600 flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" /> Sent {new Date(p.sentToPatientAt).toLocaleDateString()}
              </span>
            )}
          </div>
        </CardContent>
      )}
    </Card>
  );
}
