"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, User, FileText, Footprints, Activity, Stethoscope, Brain, Heart, FileUp,
  RefreshCw, AlertCircle, CheckCircle2, X, Loader2, Mic, MicOff, Languages, Plus, Save,
  ChevronDown, ChevronRight, Calendar, Mail, Phone, Eye, Pencil, Trash2, HeartPulse, Shield,
  Link2, Copy, Check, Sparkles, Upload, Lock, EyeOff, ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

const DOC_TYPES = [
  { value: "MEDICAL_REFERRAL", label: "Medical Referral" },
  { value: "MEDICAL_REPORT", label: "Medical Report" },
  { value: "PRESCRIPTION", label: "Prescription" },
  { value: "IMAGING", label: "Imaging" },
  { value: "INSURANCE", label: "Insurance" },
  { value: "CONSENT_FORM", label: "Consent Form" },
  { value: "PREVIOUS_TREATMENT", label: "Previous Treatment" },
  { value: "OTHER", label: "Other" },
];

const RED_FLAGS = [
  { key: "unexplainedWeightLoss", label: "Unexplained Weight Loss" },
  { key: "nightPain", label: "Night Pain" },
  { key: "traumaHistory", label: "Trauma History" },
  { key: "neurologicalSymptoms", label: "Neurological Symptoms" },
  { key: "bladderBowelDysfunction", label: "Bladder/Bowel Dysfunction" },
  { key: "recentInfection", label: "Recent Infection" },
  { key: "cancerHistory", label: "Cancer History" },
  { key: "steroidUse", label: "Steroid Use" },
  { key: "osteoporosisRisk", label: "Osteoporosis Risk" },
  { key: "cardiovascularSymptoms", label: "Cardiovascular Symptoms" },
  { key: "severeHeadache", label: "Severe Headache" },
  { key: "dizzinessBalanceIssues", label: "Dizziness/Balance Issues" },
];

const TEXT_FIELDS = [
  { key: "currentMedications", label: "Medications" },
  { key: "allergies", label: "Allergies" },
  { key: "surgicalHistory", label: "Surgical History" },
  { key: "otherConditions", label: "Other Conditions" },
  { key: "gpDetails", label: "GP Details" },
  { key: "emergencyContact", label: "Emergency Contact" },
  { key: "emergencyContactPhone", label: "Emergency Phone" },
];

// ─── Voice Button ───
function VB({ onText, className = "" }: { onText: (t: string) => void; className?: string }) {
  const [on, setOn] = useState(false);
  const [lang, setLang] = useState<"pt-BR" | "en-GB">("pt-BR");
  const ref = useRef<any>(null);

  const toggle = () => {
    if (on) { ref.current?.stop(); setOn(false); return; }
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { alert("Speech recognition not supported. Use Chrome or Edge."); return; }
    const r = new SR(); r.continuous = true; r.interimResults = true; r.lang = lang;
    r.onresult = (e: any) => {
      let t = "";
      for (let i = 0; i < e.results.length; i++) if (e.results[i].isFinal) t += e.results[i][0].transcript + " ";
      if (t) onText(t);
    };
    r.onerror = () => setOn(false); r.onend = () => setOn(false);
    ref.current = r; r.start(); setOn(true);
  };

  return (
    <span className={`inline-flex items-center gap-0.5 ${className}`}>
      <select value={lang} onChange={(e) => setLang(e.target.value as any)} className="h-6 text-[9px] rounded border border-input bg-background px-0.5 w-9">
        <option value="pt-BR">PT</option><option value="en-GB">EN</option>
      </select>
      <Button type="button" variant={on ? "destructive" : "outline"} size="sm" className="h-6 w-6 p-0" onClick={toggle}>
        {on ? <MicOff className="h-2.5 w-2.5" /> : <Mic className="h-2.5 w-2.5" />}
      </Button>
      {on && <span className="text-[9px] text-destructive animate-pulse">Rec</span>}
    </span>
  );
}

// ─── Editable Text Field with Voice ───
function EF({ label, value, onChange, rows = 2, placeholder = "" }: {
  label: string; value: string; onChange: (v: string) => void; rows?: number; placeholder?: string;
}) {
  return (
    <div className="space-y-0.5">
      <div className="flex items-center gap-1.5">
        <Label className="text-[10px] font-semibold">{label}</Label>
        <VB onText={(t) => onChange(value + t)} />
      </div>
      {rows <= 1 ? (
        <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="h-8 text-xs" />
      ) : (
        <Textarea value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} rows={rows} className="text-xs" />
      )}
    </div>
  );
}

// ─── Collapsible Section ───
function Sec({ title, icon: Icon, children, open: dOpen = false, badge, actions }: {
  title: string; icon: any; children: React.ReactNode; open?: boolean; badge?: string; actions?: React.ReactNode;
}) {
  const [o, setO] = useState(dOpen);
  return (
    <div className="border rounded-lg">
      <div className="flex items-center gap-2 px-4 py-2.5">
        <button className="flex items-center gap-2 flex-1 text-left font-medium text-sm hover:text-primary transition-colors" onClick={() => setO(!o)}>
          {o ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
          <Icon className="h-4 w-4 text-primary" /> {title}
          {badge && <Badge variant="outline" className="ml-1 text-[10px]">{badge}</Badge>}
        </button>
        {actions && <div className="flex items-center gap-1">{actions}</div>}
      </div>
      {o && <div className="px-4 pb-4 border-t pt-3">{children}</div>}
    </div>
  );
}

// ─── Main Page ───
export default function PatientProfilePage() {
  const { id: patientId } = useParams<{ id: string }>();
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState("");

  // Edit states
  const [editingScreening, setEditingScreening] = useState(false);
  const [screeningForm, setScreeningForm] = useState<any>({});
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [noteForm, setNoteForm] = useState<any>({});
  const [showNewNote, setShowNewNote] = useState(false);
  const [newNote, setNewNote] = useState({ subjective: "", objective: "", assessment: "", plan: "" });
  const [editingScanId, setEditingScanId] = useState<string | null>(null);
  const [scanForm, setScanForm] = useState<any>({});
  const [editingBAId, setEditingBAId] = useState<string | null>(null);
  const [baForm, setBaForm] = useState<any>({});
  const [editingDocId, setEditingDocId] = useState<string | null>(null);
  const [docForm, setDocForm] = useState<any>({});
  const [editingDiagId, setEditingDiagId] = useState<string | null>(null);
  const [diagForm, setDiagForm] = useState<any>({});
  const [editingProtoId, setEditingProtoId] = useState<string | null>(null);
  const [protoForm, setProtoForm] = useState<any>({});

  // New document/upload/history
  const [showManualDoc, setShowManualDoc] = useState(false);
  const [manualForm, setManualForm] = useState({ title: "", content: "", documentType: "OTHER" });
  const [showUpload, setShowUpload] = useState(false);
  const [uploadFiles, setUploadFiles] = useState<File[]>([]);
  const [uploadTitle, setUploadTitle] = useState("");
  const [uploadType, setUploadType] = useState("OTHER");

  // Generating AI
  const [generating, setGenerating] = useState(false);
  const [genProtocol, setGenProtocol] = useState(false);

  // Invite link
  const [inviteUrl, setInviteUrl] = useState("");
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteCopied, setInviteCopied] = useState(false);

  // AI Import
  const [showAIImport, setShowAIImport] = useState(false);
  const [aiImportText, setAiImportText] = useState("");
  const [aiImportFiles, setAiImportFiles] = useState<File[]>([]);
  const [aiImporting, setAiImporting] = useState(false);
  const [aiImportResult, setAiImportResult] = useState<any>(null);

  // Full Access toggle
  const [togglingAccess, setTogglingAccess] = useState(false);

  // Admin reset password
  const [showResetPw, setShowResetPw] = useState(false);
  const [resetPw, setResetPw] = useState("");
  const [showResetPwText, setShowResetPwText] = useState(false);
  const [resettingPw, setResettingPw] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/patients/${patientId}`);
      const d = await res.json();
      if (!res.ok) throw new Error(d.error);
      setData(d);
    } catch (err: any) { setError(err.message); }
    finally { setLoading(false); }
  }, [patientId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const flash = (msg: string) => { setSuccess(msg); setTimeout(() => setSuccess(""), 3000); };

  const apiPatch = async (body: any) => {
    setSaving(true); setError("");
    try {
      const res = await fetch(`/api/admin/patients/${patientId}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error);
      return d;
    } catch (err: any) { setError(err.message); return null; }
    finally { setSaving(false); }
  };

  // ─── Save handlers ───
  const saveScreening = async () => {
    const r = await apiPatch({ action: "edit_screening", screeningId: data.screening.id, ...screeningForm });
    if (r) { setEditingScreening(false); flash("Screening updated"); fetchData(); }
  };

  const saveNewNote = async () => {
    const r = await apiPatch({ action: "add_clinical_note", ...newNote });
    if (r) { setShowNewNote(false); setNewNote({ subjective: "", objective: "", assessment: "", plan: "" }); flash("SOAP note added"); fetchData(); }
  };

  const saveEditNote = async () => {
    const r = await apiPatch({ action: "edit_soap_note", noteId: editingNoteId, ...noteForm });
    if (r) { setEditingNoteId(null); flash("SOAP note updated"); fetchData(); }
  };

  const saveScan = async () => {
    const r = await apiPatch({ action: "edit_foot_scan", scanId: editingScanId, ...scanForm });
    if (r) { setEditingScanId(null); flash("Foot scan updated"); fetchData(); }
  };

  const saveBA = async () => {
    const r = await apiPatch({ action: "edit_body_assessment", assessmentId: editingBAId, ...baForm });
    if (r) { setEditingBAId(null); flash("Body assessment updated"); fetchData(); }
  };

  const saveDoc = async () => {
    const r = await apiPatch({ action: "edit_document", documentId: editingDocId, ...docForm });
    if (r) { setEditingDocId(null); flash("Document updated"); fetchData(); }
  };

  const saveDiag = async () => {
    const r = await apiPatch({ action: "edit_diagnosis", diagnosisId: editingDiagId, ...diagForm });
    if (r) { setEditingDiagId(null); flash("Assessment updated"); fetchData(); }
  };

  const saveProto = async () => {
    const r = await apiPatch({ action: "edit_protocol", protocolId: editingProtoId, ...protoForm });
    if (r) { setEditingProtoId(null); flash("Protocol updated"); fetchData(); }
  };

  const saveManualDoc = async () => {
    if (!manualForm.content.trim()) return;
    const r = await apiPatch({ action: "add_manual_document", title: manualForm.title || "Clinical History", content: manualForm.content, documentType: manualForm.documentType });
    if (r) { setShowManualDoc(false); setManualForm({ title: "", content: "", documentType: "OTHER" }); flash("History saved"); fetchData(); }
  };

  const handleUpload = async () => {
    if (uploadFiles.length === 0) return;
    setSaving(true);
    try {
      for (const file of uploadFiles) {
        const fd = new FormData(); fd.append("file", file); fd.append("title", uploadTitle || file.name);
        fd.append("documentType", uploadType); fd.append("source", "ADMIN_UPLOAD");
        const res = await fetch(`/api/admin/patients/${patientId}/documents`, { method: "POST", body: fd });
        if (!res.ok) throw new Error((await res.json()).error);
      }
      setUploadFiles([]); setUploadTitle(""); setShowUpload(false); flash("Upload complete"); fetchData();
    } catch (err: any) { setError(err.message); }
    finally { setSaving(false); }
  };

  // Generate AI Assessment
  const generateDiagnosis = async () => {
    setGenerating(true); setError("");
    try {
      const res = await fetch(`/api/admin/patients/${patientId}/diagnosis`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}) });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error);
      flash("AI Assessment generated!"); fetchData();
    } catch (err: any) { setError(err.message); }
    finally { setGenerating(false); }
  };

  // Generate Protocol
  const generateProtocol = async (diagnosisId: string) => {
    setGenProtocol(true); setError("");
    try {
      const res = await fetch(`/api/admin/patients/${patientId}/protocol`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ diagnosisId }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error);
      flash("Treatment protocol generated!"); fetchData();
    } catch (err: any) { setError(err.message); }
    finally { setGenProtocol(false); }
  };

  // Generate Invite Link
  const generateInvite = async () => {
    setInviteLoading(true); setError("");
    try {
      const res = await fetch(`/api/admin/patients/${patientId}/invite`, { method: "POST" });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error);
      setInviteUrl(d.intakeUrl);
      flash("Invite link generated!");
    } catch (err: any) { setError(err.message); }
    finally { setInviteLoading(false); }
  };

  const copyInvite = async () => {
    if (!inviteUrl) return;
    await navigator.clipboard.writeText(inviteUrl);
    setInviteCopied(true);
    setTimeout(() => setInviteCopied(false), 2000);
  };

  // AI Import
  const handleAIImport = async () => {
    if (!aiImportText.trim() && aiImportFiles.length === 0) {
      setError("Provide clinical text or upload documents for AI import.");
      return;
    }
    setAiImporting(true); setError(""); setAiImportResult(null);
    try {
      const fd = new FormData();
      fd.append("clinicalText", aiImportText);
      for (const f of aiImportFiles) fd.append("files", f);
      const res = await fetch(`/api/admin/patients/${patientId}/ai-import`, { method: "POST", body: fd });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error);
      setAiImportResult(d);
      flash("AI Import complete! Data populated.");
      fetchData();
    } catch (err: any) { setError(err.message); }
    finally { setAiImporting(false); }
  };

  const confirmAIImport = async () => {
    if (!aiImportResult?.importId) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/patients/${patientId}/ai-import`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ importId: aiImportResult.importId, action: "confirm" }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      setShowAIImport(false); setAiImportResult(null); setAiImportText(""); setAiImportFiles([]);
      flash("AI Import confirmed and saved!"); fetchData();
    } catch (err: any) { setError(err.message); }
    finally { setSaving(false); }
  };

  // Toggle Full Access
  const toggleFullAccess = async () => {
    setTogglingAccess(true); setError("");
    try {
      const res = await fetch(`/api/admin/patients/${patientId}/permissions`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "toggleFullAccess" }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error);
      flash(d.fullAccessOverride ? "Full access granted!" : "Full access revoked.");
      fetchData();
    } catch (err: any) { setError(err.message); }
    finally { setTogglingAccess(false); }
  };

  // Admin Reset Password
  const handleResetPassword = async () => {
    if (!resetPw || resetPw.length < 6) { setError("Password must be at least 6 characters."); return; }
    setResettingPw(true); setError("");
    try {
      const res = await fetch(`/api/admin/patients/${patientId}/permissions`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "resetPassword", newPassword: resetPw }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error);
      flash("Password reset successfully!"); setShowResetPw(false); setResetPw(""); fetchData();
    } catch (err: any) { setError(err.message); }
    finally { setResettingPw(false); }
  };

  // Impersonate Patient
  const handleImpersonate = async () => {
    try {
      const res = await fetch("/api/admin/impersonate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ patientId }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error);
      window.open("/dashboard", "_blank");
    } catch (err: any) { setError(err.message); }
  };

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <RefreshCw className="h-5 w-5 animate-spin text-primary" /><span className="ml-2 text-sm text-muted-foreground">Loading patient data...</span>
    </div>
  );

  if (!data?.patient) return (
    <div className="text-center py-20 text-muted-foreground">
      <AlertCircle className="h-8 w-8 mx-auto mb-2" /><p>Patient not found.</p>
      <Button variant="outline" className="mt-4" onClick={() => router.push("/admin/patients")}>Back to Patients</Button>
    </div>
  );

  const p = data.patient;
  const btnCls = "h-6 text-[10px] px-2";

  return (
    <div className="space-y-5 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-start gap-3 flex-wrap">
        <Button variant="ghost" size="sm" onClick={() => router.push("/admin/patients")}><ArrowLeft className="h-4 w-4 mr-1" /> Patients</Button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0"><User className="h-6 w-6 text-primary" /></div>
            <div>
              <h1 className="text-xl font-bold">{p.firstName} {p.lastName}</h1>
              <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5 flex-wrap">
                <span className="flex items-center gap-1"><Mail className="h-3 w-3" /> {p.email}</span>
                {p.phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" /> {p.phone}</span>}
                <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> {new Date(p.createdAt).toLocaleDateString()}</span>
              </div>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          <Link href={`/admin/patients/${patientId}/permissions`}><Button variant="outline" size="sm" className="h-8 text-xs bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100"><Shield className="h-3.5 w-3.5 mr-1" /> Permissões</Button></Link>
          <Link href={`/admin/patients/${patientId}/documents`}><Button variant="outline" size="sm" className="h-8 text-xs"><FileUp className="h-3.5 w-3.5 mr-1" /> Documents</Button></Link>
          <Link href={`/admin/patients/${patientId}/diagnosis`}><Button variant="outline" size="sm" className="h-8 text-xs"><Brain className="h-3.5 w-3.5 mr-1" /> AI Assessment</Button></Link>
        </div>
      </div>

      {/* Patient Status Badges */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Profile/Intake Status */}
        {p.profileCompleted ? (
          <Badge className="bg-green-100 text-green-700 border-green-200 text-[10px]">
            <CheckCircle2 className="h-3 w-3 mr-1" /> Perfil Completo
          </Badge>
        ) : (
          <Badge className="bg-amber-100 text-amber-700 border-amber-200 text-[10px]">
            <AlertCircle className="h-3 w-3 mr-1" /> Perfil Pendente
          </Badge>
        )}
        {/* Password Status */}
        {p.hasPassword ? (
          <Badge className="bg-green-100 text-green-700 border-green-200 text-[10px]">
            <Shield className="h-3 w-3 mr-1" /> Senha Definida
          </Badge>
        ) : (
          <Badge className="bg-red-100 text-red-700 border-red-200 text-[10px]">
            <AlertCircle className="h-3 w-3 mr-1" /> Sem Senha
          </Badge>
        )}
        {/* Consent Status */}
        {p.consentAcceptedAt ? (
          <Badge className="bg-green-100 text-green-700 border-green-200 text-[10px]">
            <CheckCircle2 className="h-3 w-3 mr-1" /> Consentimento Aceito
          </Badge>
        ) : (
          <Badge className="bg-amber-100 text-amber-700 border-amber-200 text-[10px]">
            <AlertCircle className="h-3 w-3 mr-1" /> Sem Consentimento
          </Badge>
        )}
        {/* Full Access Toggle */}
        <Button
          variant={p.fullAccessOverride ? "default" : "outline"}
          size="sm"
          className={`h-7 text-[10px] gap-1 ${p.fullAccessOverride ? "bg-emerald-600 hover:bg-emerald-700" : "border-emerald-300 text-emerald-700 hover:bg-emerald-50"}`}
          onClick={toggleFullAccess}
          disabled={togglingAccess}
        >
          {togglingAccess ? <Loader2 className="h-3 w-3 animate-spin" /> : <Shield className="h-3 w-3" />}
          {p.fullAccessOverride ? "Acesso Total Ativo" : "Liberar Acesso Total"}
        </Button>
        {/* Reset Password */}
        <Button variant="outline" size="sm" className="h-7 text-[10px] gap-1 border-amber-300 text-amber-700 hover:bg-amber-50" onClick={() => setShowResetPw(!showResetPw)}>
          <Lock className="h-3 w-3" /> Resetar Senha
        </Button>
        {/* View as Patient */}
        <Button variant="outline" size="sm" className="h-7 text-[10px] gap-1 border-blue-300 text-blue-700 hover:bg-blue-50" onClick={handleImpersonate}>
          <Eye className="h-3 w-3" /> Ver como Paciente
        </Button>
      </div>

      {/* Inline Reset Password */}
      {showResetPw && (
        <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
          <Lock className="h-4 w-4 text-amber-600 shrink-0" />
          <div className="relative flex-1 max-w-xs">
            <Input
              type={showResetPwText ? "text" : "password"}
              placeholder="Nova senha (mín. 6 caracteres)"
              value={resetPw}
              onChange={(e) => setResetPw(e.target.value)}
              className="h-8 text-xs pr-8"
            />
            <Button type="button" variant="ghost" size="sm" className="absolute right-0.5 top-1/2 -translate-y-1/2 h-6 w-6 p-0" onClick={() => setShowResetPwText(!showResetPwText)}>
              {showResetPwText ? <EyeOff className="h-3 w-3 text-muted-foreground" /> : <Eye className="h-3 w-3 text-muted-foreground" />}
            </Button>
          </div>
          <Button size="sm" className="h-8 text-xs bg-amber-600 hover:bg-amber-700" onClick={handleResetPassword} disabled={resettingPw}>
            {resettingPw ? <Loader2 className="h-3 w-3 animate-spin" /> : "Confirmar"}
          </Button>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => { setShowResetPw(false); setResetPw(""); }}>
            <X className="h-3 w-3" />
          </Button>
        </div>
      )}

      {/* Messages */}
      {error && <div className="bg-destructive/10 text-destructive text-xs p-2.5 rounded-lg flex items-center gap-2"><AlertCircle className="h-3.5 w-3.5" /> {error} <Button variant="ghost" size="sm" className="ml-auto h-5 w-5 p-0" onClick={() => setError("")}><X className="h-3 w-3" /></Button></div>}
      {success && <div className="bg-green-50 text-green-700 text-xs p-2.5 rounded-lg flex items-center gap-2"><CheckCircle2 className="h-3.5 w-3.5" /> {success}</div>}

      {/* Quick Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-1.5">
        {[
          { icon: FileText, label: "Screening", ok: !!data.screening },
          { icon: Footprints, label: "Foot Scan", ok: data.footScans?.length > 0, c: data.footScans?.length },
          { icon: Activity, label: "Body Assess.", ok: data.bodyAssessments?.length > 0, c: data.bodyAssessments?.length },
          { icon: Stethoscope, label: "SOAP Notes", ok: data.soapNotes?.length > 0, c: data.soapNotes?.length },
          { icon: FileUp, label: "Documents", ok: data.documents?.length > 0, c: data.documents?.length },
          { icon: Brain, label: "AI Assessment", ok: data.diagnoses?.length > 0, c: data.diagnoses?.length },
          { icon: Heart, label: "Protocol", ok: data.protocols?.length > 0, c: data.protocols?.length },
          { icon: HeartPulse, label: "BP Readings", ok: data.bpReadings?.length > 0, c: data.bpReadings?.length },
        ].map((s) => (
          <div key={s.label} className={`rounded-lg border p-2 text-center ${s.ok ? "bg-green-50 border-green-200" : "bg-muted/30"}`}>
            <s.icon className={`h-3.5 w-3.5 mx-auto mb-0.5 ${s.ok ? "text-green-600" : "text-muted-foreground"}`} />
            <p className="text-[9px] font-medium">{s.label}</p>
            <p className={`text-[9px] ${s.ok ? "text-green-600" : "text-muted-foreground"}`}>{s.ok ? (s.c || "✓") : "—"}</p>
          </div>
        ))}
      </div>

      {/* Invite Link */}
      <div className="flex flex-wrap items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
        <Link2 className="h-4 w-4 text-blue-600 shrink-0" />
        <span className="text-xs font-medium text-blue-800">Patient Invite Link</span>
        {inviteUrl ? (
          <>
            <code className="text-[10px] bg-white border rounded px-2 py-1 text-blue-700 flex-1 min-w-0 truncate">{inviteUrl}</code>
            <Button variant="outline" size="sm" className="h-7 text-xs border-blue-300 text-blue-700" onClick={copyInvite}>
              {inviteCopied ? <><Check className="h-3 w-3 mr-1" /> Copied!</> : <><Copy className="h-3 w-3 mr-1" /> Copy</>}
            </Button>
          </>
        ) : (
          <Button variant="outline" size="sm" className="h-7 text-xs border-blue-300 text-blue-700 hover:bg-blue-100" onClick={generateInvite} disabled={inviteLoading}>
            {inviteLoading ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Link2 className="h-3 w-3 mr-1" />}
            Generate Invite Link
          </Button>
        )}
        <span className="text-[9px] text-blue-500">Send via WhatsApp/SMS so the patient can complete their profile</span>
      </div>

      {/* Quick Actions */}
      <div className="flex flex-wrap items-center gap-1.5 p-2.5 bg-muted/30 rounded-lg border">
        <span className="text-[10px] font-medium text-muted-foreground mr-1">Actions:</span>
        <Button variant="outline" size="sm" className={btnCls} onClick={() => { setShowNewNote(true); }}><Stethoscope className="h-2.5 w-2.5 mr-0.5" /> SOAP Note</Button>
        <Button variant="outline" size="sm" className={btnCls} onClick={() => setShowManualDoc(true)}><FileText className="h-2.5 w-2.5 mr-0.5" /> Write History</Button>
        <Button variant="outline" size="sm" className={btnCls} onClick={() => setShowUpload(true)}><FileUp className="h-2.5 w-2.5 mr-0.5" /> Upload</Button>
        <Button variant="outline" size="sm" className={btnCls} onClick={generateDiagnosis} disabled={generating}>
          {generating ? <Loader2 className="h-2.5 w-2.5 mr-0.5 animate-spin" /> : <Brain className="h-2.5 w-2.5 mr-0.5" />} Generate AI Assessment
        </Button>
        <Button variant="outline" size="sm" className={`${btnCls} bg-violet-50 border-violet-200 text-violet-700 hover:bg-violet-100`} onClick={() => setShowAIImport(true)}>
          <Sparkles className="h-2.5 w-2.5 mr-0.5" /> AI Import
        </Button>
      </div>

      {/* AI Import Panel */}
      {showAIImport && (
        <Card className="border-violet-300 bg-violet-50/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-violet-600" /> AI Patient History Import
              <Button variant="ghost" size="sm" className="ml-auto h-5 w-5 p-0" onClick={() => { setShowAIImport(false); setAiImportResult(null); }}><X className="h-3 w-3" /></Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-xs text-muted-foreground">
              Upload clinical documents (PDFs, images) and/or write what you know about this patient.
              AI will extract and populate the screening, SOAP notes, and documents automatically.
            </p>
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Clinical History (free text / dictation)</Label>
              <div className="flex items-center gap-1 mb-1">
                <VB onText={(t) => setAiImportText((prev) => prev + t)} />
              </div>
              <Textarea
                value={aiImportText}
                onChange={(e) => setAiImportText(e.target.value)}
                rows={5}
                placeholder="E.g.: Patient has chronic lower back pain for 5 years, had knee arthroscopy in 2021, takes Ibuprofen 400mg, allergic to penicillin, works seated 8h/day, history of plantar fasciitis..."
                className="text-xs"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Upload Documents (PDFs, images)</Label>
              <input
                type="file"
                multiple
                accept=".pdf,.jpg,.jpeg,.png,.webp,.heic"
                onChange={(e) => setAiImportFiles(Array.from(e.target.files || []))}
                className="text-xs w-full file:mr-2 file:py-1 file:px-3 file:rounded-md file:border file:text-xs file:bg-violet-100 file:text-violet-700 file:border-violet-300"
              />
              {aiImportFiles.length > 0 && (
                <p className="text-[10px] text-violet-600">{aiImportFiles.length} file(s) selected</p>
              )}
            </div>

            {/* AI Import Result Preview */}
            {aiImportResult && (
              <div className="bg-white border border-violet-200 rounded-lg p-3 space-y-2">
                <p className="text-xs font-semibold text-violet-800">AI Import Results:</p>
                {aiImportResult.screening && (
                  <div className="text-[10px]">
                    <Badge variant="outline" className="text-[9px] bg-green-50">Screening</Badge>
                    <span className="ml-1 text-muted-foreground">
                      {aiImportResult.screening.conditions?.length || 0} conditions,{" "}
                      {aiImportResult.screening.medications ? "medications found" : "no medications"},
                      {aiImportResult.screening.redFlagsCount || 0} red flags
                    </span>
                  </div>
                )}
                {aiImportResult.soapNotesCreated > 0 && (
                  <div className="text-[10px]">
                    <Badge variant="outline" className="text-[9px] bg-blue-50">SOAP Notes</Badge>
                    <span className="ml-1 text-muted-foreground">{aiImportResult.soapNotesCreated} note(s) created</span>
                  </div>
                )}
                {aiImportResult.documentsCreated > 0 && (
                  <div className="text-[10px]">
                    <Badge variant="outline" className="text-[9px] bg-purple-50">Documents</Badge>
                    <span className="ml-1 text-muted-foreground">{aiImportResult.documentsCreated} document(s) saved</span>
                  </div>
                )}
                <Button size="sm" className="h-7 text-xs bg-violet-600 hover:bg-violet-700" onClick={confirmAIImport} disabled={saving}>
                  {saving ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Check className="h-3 w-3 mr-1" />} Confirm & Save All
                </Button>
              </div>
            )}

            {!aiImportResult && (
              <Button
                size="sm"
                className="h-8 text-xs bg-violet-600 hover:bg-violet-700"
                onClick={handleAIImport}
                disabled={aiImporting || (!aiImportText.trim() && aiImportFiles.length === 0)}
              >
                {aiImporting ? <><Loader2 className="h-3 w-3 mr-1 animate-spin" /> Processing with AI...</> : <><Sparkles className="h-3 w-3 mr-1" /> Run AI Import</>}
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* ─── Inline Forms ─── */}
      {showNewNote && (
        <Card className="border-primary"><CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Stethoscope className="h-4 w-4" /> New SOAP Note <VB onText={() => {}} className="ml-auto" /></CardTitle></CardHeader>
          <CardContent className="space-y-2">
            <EF label="S — Subjective" value={newNote.subjective} onChange={(v) => setNewNote({ ...newNote, subjective: v })} placeholder="Complaints, symptoms..." />
            <EF label="O — Objective" value={newNote.objective} onChange={(v) => setNewNote({ ...newNote, objective: v })} placeholder="Clinical findings..." />
            <EF label="A — Assessment" value={newNote.assessment} onChange={(v) => setNewNote({ ...newNote, assessment: v })} placeholder="Diagnosis, assessment..." />
            <EF label="P — Plan" value={newNote.plan} onChange={(v) => setNewNote({ ...newNote, plan: v })} placeholder="Treatment plan..." />
            <div className="flex gap-1.5">
              <Button size="sm" className="h-7 text-xs" onClick={saveNewNote} disabled={saving}>{saving ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Save className="h-3 w-3 mr-1" />} Save</Button>
              <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setShowNewNote(false)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {showManualDoc && (
        <Card className="border-primary"><CardHeader className="pb-2"><CardTitle className="text-sm"><FileText className="h-4 w-4 inline mr-1" /> Write Clinical History</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <EF label="Title" value={manualForm.title} onChange={(v) => setManualForm({ ...manualForm, title: v })} rows={1} placeholder="e.g. Patient History" />
              <div className="space-y-0.5"><Label className="text-[10px] font-semibold">Category</Label><select value={manualForm.documentType} onChange={(e) => setManualForm({ ...manualForm, documentType: e.target.value })} className="w-full h-8 rounded-md border border-input bg-background px-2 text-xs">{DOC_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}</select></div>
            </div>
            <EF label="Content" value={manualForm.content} onChange={(v) => setManualForm({ ...manualForm, content: v })} rows={6} placeholder="Type or dictate..." />
            <div className="flex gap-1.5">
              <Button size="sm" className="h-7 text-xs" onClick={saveManualDoc} disabled={saving || !manualForm.content.trim()}><Save className="h-3 w-3 mr-1" /> Save</Button>
              <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setShowManualDoc(false)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {showUpload && (
        <Card className="border-primary"><CardHeader className="pb-2"><CardTitle className="text-sm"><FileUp className="h-4 w-4 inline mr-1" /> Upload Document</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-0.5"><Label className="text-[10px]">Title</Label><Input value={uploadTitle} onChange={(e) => setUploadTitle(e.target.value)} className="h-8 text-xs" placeholder="Document title" /></div>
              <div className="space-y-0.5"><Label className="text-[10px]">Type</Label><select value={uploadType} onChange={(e) => setUploadType(e.target.value)} className="w-full h-8 rounded-md border border-input bg-background px-2 text-xs">{DOC_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}</select></div>
            </div>
            <Input type="file" accept=".pdf,.jpg,.jpeg,.png,.webp,.heic" multiple onChange={(e) => e.target.files && setUploadFiles(Array.from(e.target.files))} className="text-xs" />
            <div className="flex gap-1.5">
              <Button size="sm" className="h-7 text-xs" onClick={handleUpload} disabled={saving || uploadFiles.length === 0}><FileUp className="h-3 w-3 mr-1" /> Upload</Button>
              <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => { setShowUpload(false); setUploadFiles([]); }}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ─── Sections ─── */}
      <div className="space-y-2.5">

        {/* ── Medical Screening ── */}
        <Sec title="Medical Screening" icon={FileText} badge={data.screening ? "Completed" : "Not filled"} open={!!data.screening}
          actions={data.screening && <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => { setScreeningForm({ ...data.screening }); setEditingScreening(true); }}><Pencil className="h-3 w-3" /></Button>}
        >
          {editingScreening && data.screening ? (
            <div className="space-y-3">
              <h4 className="text-[10px] font-semibold text-muted-foreground uppercase">Red Flag Questions (click to toggle)</h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-1">
                {RED_FLAGS.map((f) => (
                  <button key={f.key} type="button" onClick={() => setScreeningForm({ ...screeningForm, [f.key]: !screeningForm[f.key] })}
                    className={`flex items-center gap-1 text-[10px] px-2 py-1 rounded cursor-pointer transition-colors ${screeningForm[f.key] ? "bg-red-100 text-red-700 ring-1 ring-red-300" : "bg-green-50 text-green-700"}`}>
                    {screeningForm[f.key] ? <AlertCircle className="h-2.5 w-2.5" /> : <CheckCircle2 className="h-2.5 w-2.5" />} {f.label}
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {TEXT_FIELDS.map((f) => (
                  <EF key={f.key} label={f.label} value={screeningForm[f.key] || ""} onChange={(v) => setScreeningForm({ ...screeningForm, [f.key]: v })} rows={1} />
                ))}
              </div>
              <div className="flex gap-1.5">
                <Button size="sm" className="h-7 text-xs" onClick={saveScreening} disabled={saving}><Save className="h-3 w-3 mr-1" /> Save</Button>
                <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setEditingScreening(false)}>Cancel</Button>
              </div>
            </div>
          ) : data.screening ? (
            <div className="space-y-2">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-1">
                {RED_FLAGS.map((f) => (
                  <div key={f.key} className={`flex items-center gap-1 text-[10px] px-2 py-1 rounded ${data.screening[f.key] ? "bg-red-50 text-red-700" : "bg-green-50 text-green-700"}`}>
                    {data.screening[f.key] ? <AlertCircle className="h-2.5 w-2.5" /> : <CheckCircle2 className="h-2.5 w-2.5" />} {f.label}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {TEXT_FIELDS.map((f) => data.screening[f.key] ? <div key={f.key}><p className="text-[9px] font-semibold text-muted-foreground uppercase">{f.label}</p><p className="text-xs">{data.screening[f.key]}</p></div> : null)}
              </div>
            </div>
          ) : <p className="text-xs text-muted-foreground">Not completed.</p>}
        </Sec>

        {/* ── Foot Scans ── */}
        <Sec title="Foot Scans" icon={Footprints} badge={data.footScans?.length ? `${data.footScans.length}` : "None"}>
          {data.footScans?.length > 0 ? data.footScans.map((s: any) => (
            <div key={s.id} className="border rounded-lg p-2.5 mb-2 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-medium">{s.scanNumber}</span>
                <div className="flex items-center gap-1">
                  <Badge variant="outline" className="text-[9px]">{s.status}</Badge>
                  <Button variant="ghost" size="sm" className="h-5 w-5 p-0" onClick={() => { setScanForm({ clinicianNotes: s.clinicianNotes || "", aiRecommendation: s.aiRecommendation || "" }); setEditingScanId(s.id); }}><Pencil className="h-2.5 w-2.5" /></Button>
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 text-[10px]">
                {s.archType && <div><span className="text-muted-foreground">Arch:</span> {s.archType}</div>}
                {s.pronation && <div><span className="text-muted-foreground">Pronation:</span> {s.pronation}</div>}
                {s.calcanealAlignment != null && <div><span className="text-muted-foreground">Calcaneal:</span> {s.calcanealAlignment}°</div>}
                {s.halluxValgusAngle != null && <div><span className="text-muted-foreground">Hallux Valgus:</span> {s.halluxValgusAngle}°</div>}
              </div>
              {editingScanId === s.id ? (
                <div className="space-y-1.5 mt-1 bg-muted/30 p-2 rounded">
                  <EF label="Clinician Notes" value={scanForm.clinicianNotes} onChange={(v) => setScanForm({ ...scanForm, clinicianNotes: v })} rows={2} />
                  <EF label="AI Recommendation" value={scanForm.aiRecommendation} onChange={(v) => setScanForm({ ...scanForm, aiRecommendation: v })} rows={2} />
                  <div className="flex gap-1"><Button size="sm" className="h-6 text-[10px]" onClick={saveScan} disabled={saving}><Save className="h-2.5 w-2.5 mr-0.5" /> Save</Button><Button variant="outline" size="sm" className="h-6 text-[10px]" onClick={() => setEditingScanId(null)}>Cancel</Button></div>
                </div>
              ) : (
                <>
                  {s.clinicianNotes && <p className="text-[10px] bg-muted/50 p-1.5 rounded">{s.clinicianNotes}</p>}
                  {s.aiRecommendation && <p className="text-[10px] bg-blue-50 p-1.5 rounded text-blue-800">{s.aiRecommendation}</p>}
                </>
              )}
            </div>
          )) : <p className="text-xs text-muted-foreground">No foot scans.</p>}
        </Sec>

        {/* ── Body Assessments ── */}
        <Sec title="Body Assessments" icon={Activity} badge={data.bodyAssessments?.length ? `${data.bodyAssessments.length}` : "None"}>
          {data.bodyAssessments?.length > 0 ? data.bodyAssessments.map((ba: any) => (
            <div key={ba.id} className="border rounded-lg p-2.5 mb-2 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-medium">{ba.assessmentNumber}</span>
                <div className="flex items-center gap-1">
                  <Badge variant="outline" className="text-[9px]">{ba.status}</Badge>
                  <Button variant="ghost" size="sm" className="h-5 w-5 p-0" onClick={() => { setBaForm({ therapistNotes: ba.therapistNotes || "", aiSummary: ba.aiSummary || "" }); setEditingBAId(ba.id); }}><Pencil className="h-2.5 w-2.5" /></Button>
                </div>
              </div>
              {(ba.postureScore || ba.symmetryScore || ba.mobilityScore || ba.overallScore) && (
                <div className="grid grid-cols-4 gap-1.5 text-center">
                  {[{ l: "Posture", v: ba.postureScore }, { l: "Symmetry", v: ba.symmetryScore }, { l: "Mobility", v: ba.mobilityScore }, { l: "Overall", v: ba.overallScore }].map((s) => (
                    <div key={s.l} className="bg-muted/50 rounded p-1"><p className="text-[8px] text-muted-foreground">{s.l}</p><p className={`text-xs font-bold ${s.v >= 70 ? "text-green-600" : s.v >= 50 ? "text-amber-600" : "text-red-600"}`}>{s.v != null ? Math.round(s.v) : "—"}</p></div>
                  ))}
                </div>
              )}
              {editingBAId === ba.id ? (
                <div className="space-y-1.5 bg-muted/30 p-2 rounded">
                  <EF label="Therapist Notes" value={baForm.therapistNotes} onChange={(v) => setBaForm({ ...baForm, therapistNotes: v })} rows={3} />
                  <EF label="AI Summary" value={baForm.aiSummary} onChange={(v) => setBaForm({ ...baForm, aiSummary: v })} rows={3} />
                  <div className="flex gap-1"><Button size="sm" className="h-6 text-[10px]" onClick={saveBA} disabled={saving}><Save className="h-2.5 w-2.5 mr-0.5" /> Save</Button><Button variant="outline" size="sm" className="h-6 text-[10px]" onClick={() => setEditingBAId(null)}>Cancel</Button></div>
                </div>
              ) : (
                <>
                  {ba.aiSummary && <p className="text-[10px] bg-blue-50 p-1.5 rounded text-blue-800">{ba.aiSummary}</p>}
                  {ba.therapistNotes && <p className="text-[10px] bg-muted/50 p-1.5 rounded">{ba.therapistNotes}</p>}
                </>
              )}
            </div>
          )) : <p className="text-xs text-muted-foreground">No body assessments.</p>}
        </Sec>

        {/* ── SOAP Notes ── */}
        <Sec title="Clinical Notes (SOAP)" icon={Stethoscope} badge={data.soapNotes?.length ? `${data.soapNotes.length}` : "None"} open={true}
          actions={<Button variant="ghost" size="sm" className="h-6 px-1.5 text-[10px]" onClick={() => setShowNewNote(true)}><Plus className="h-2.5 w-2.5 mr-0.5" /> Add</Button>}
        >
          {data.soapNotes?.length > 0 ? data.soapNotes.map((n: any) => (
            <div key={n.id} className="border rounded-lg p-2.5 mb-2 space-y-1">
              <div className="flex items-center justify-between text-[9px] text-muted-foreground">
                <span>{new Date(n.createdAt).toLocaleString()}</span>
                <div className="flex items-center gap-1">
                  {n.therapist && <span>by {n.therapist.firstName} {n.therapist.lastName}</span>}
                  <Button variant="ghost" size="sm" className="h-5 w-5 p-0" onClick={() => { setNoteForm({ subjective: n.subjective || "", objective: n.objective || "", assessment: n.assessment || "", plan: n.plan || "" }); setEditingNoteId(n.id); }}><Pencil className="h-2.5 w-2.5" /></Button>
                </div>
              </div>
              {editingNoteId === n.id ? (
                <div className="space-y-1.5 bg-muted/30 p-2 rounded">
                  <EF label="S — Subjective" value={noteForm.subjective} onChange={(v) => setNoteForm({ ...noteForm, subjective: v })} />
                  <EF label="O — Objective" value={noteForm.objective} onChange={(v) => setNoteForm({ ...noteForm, objective: v })} />
                  <EF label="A — Assessment" value={noteForm.assessment} onChange={(v) => setNoteForm({ ...noteForm, assessment: v })} />
                  <EF label="P — Plan" value={noteForm.plan} onChange={(v) => setNoteForm({ ...noteForm, plan: v })} />
                  <div className="flex gap-1"><Button size="sm" className="h-6 text-[10px]" onClick={saveEditNote} disabled={saving}><Save className="h-2.5 w-2.5 mr-0.5" /> Save</Button><Button variant="outline" size="sm" className="h-6 text-[10px]" onClick={() => setEditingNoteId(null)}>Cancel</Button></div>
                </div>
              ) : (
                <>
                  {n.subjective && <div><p className="text-[9px] font-bold text-blue-600">S — Subjective</p><p className="text-[10px]">{n.subjective}</p></div>}
                  {n.objective && <div><p className="text-[9px] font-bold text-green-600">O — Objective</p><p className="text-[10px]">{n.objective}</p></div>}
                  {n.assessment && <div><p className="text-[9px] font-bold text-amber-600">A — Assessment</p><p className="text-[10px]">{n.assessment}</p></div>}
                  {n.plan && <div><p className="text-[9px] font-bold text-purple-600">P — Plan</p><p className="text-[10px]">{n.plan}</p></div>}
                </>
              )}
            </div>
          )) : <p className="text-xs text-muted-foreground">No notes yet.</p>}
        </Sec>

        {/* ── Documents ── */}
        <Sec title="Documents & Files" icon={FileUp} badge={data.documents?.length ? `${data.documents.length}` : "None"}
          actions={<>
            <Button variant="ghost" size="sm" className="h-6 px-1.5 text-[10px]" onClick={() => setShowUpload(true)}><Plus className="h-2.5 w-2.5 mr-0.5" /> Upload</Button>
            <Button variant="ghost" size="sm" className="h-6 px-1.5 text-[10px]" onClick={() => setShowManualDoc(true)}><FileText className="h-2.5 w-2.5 mr-0.5" /> Write</Button>
            <Link href={`/admin/patients/${patientId}/documents`}><Button variant="ghost" size="sm" className="h-6 px-1.5 text-[10px]"><Eye className="h-2.5 w-2.5 mr-0.5" /> Full</Button></Link>
          </>}
        >
          {data.documents?.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
              {data.documents.map((doc: any) => (
                <div key={doc.id} className="border rounded-lg p-2 flex items-start gap-2">
                  <div className="w-7 h-7 rounded bg-muted/50 flex items-center justify-center shrink-0">
                    {doc.fileType?.startsWith("image/") && doc.fileUrl ? <img src={doc.fileUrl} alt="" className="w-7 h-7 rounded object-cover" /> : <FileText className="h-3.5 w-3.5 text-muted-foreground" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    {editingDocId === doc.id ? (
                      <div className="space-y-1">
                        <EF label="Title" value={docForm.title || ""} onChange={(v) => setDocForm({ ...docForm, title: v })} rows={1} />
                        <EF label="Description" value={docForm.description || ""} onChange={(v) => setDocForm({ ...docForm, description: v })} rows={2} />
                        <EF label="Extracted Text" value={docForm.extractedText || ""} onChange={(v) => setDocForm({ ...docForm, extractedText: v })} rows={3} />
                        <div className="flex gap-1"><Button size="sm" className="h-5 text-[9px]" onClick={saveDoc} disabled={saving}><Save className="h-2 w-2 mr-0.5" /> Save</Button><Button variant="outline" size="sm" className="h-5 text-[9px]" onClick={() => setEditingDocId(null)}>Cancel</Button></div>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center gap-1">
                          <p className="text-[10px] font-medium truncate flex-1">{doc.title || doc.fileName}</p>
                          <Button variant="ghost" size="sm" className="h-4 w-4 p-0 shrink-0" onClick={() => { setDocForm({ title: doc.title || "", description: doc.description || "", extractedText: doc.extractedText || "" }); setEditingDocId(doc.id); }}><Pencil className="h-2 w-2" /></Button>
                        </div>
                        <Badge variant="outline" className="text-[7px] h-3.5">{DOC_TYPES.find(t => t.value === doc.documentType)?.label || doc.documentType}</Badge>
                        {doc.description && <p className="text-[9px] text-muted-foreground line-clamp-2 mt-0.5">{doc.description}</p>}
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : <p className="text-xs text-muted-foreground">No documents.</p>}
        </Sec>

        {/* ── AI Assessments ── */}
        <Sec title="AI Assessments" icon={Brain} badge={data.diagnoses?.length ? `${data.diagnoses.length}` : "None"}
          actions={<Button variant="ghost" size="sm" className="h-6 px-1.5 text-[10px]" onClick={generateDiagnosis} disabled={generating}>
            {generating ? <Loader2 className="h-2.5 w-2.5 mr-0.5 animate-spin" /> : <Plus className="h-2.5 w-2.5 mr-0.5" />} Generate
          </Button>}
        >
          {data.diagnoses?.length > 0 ? data.diagnoses.map((d: any) => (
            <div key={d.id} className="border rounded-lg p-2.5 mb-2 space-y-1.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Badge variant="outline" className="text-[9px]">{d.status}</Badge>
                  <span className="text-[9px] text-muted-foreground">{new Date(d.createdAt).toLocaleDateString()}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="sm" className="h-5 w-5 p-0" onClick={() => { setDiagForm({ summary: d.summary || "", therapistComments: d.therapistComments || "", status: d.status }); setEditingDiagId(d.id); }}><Pencil className="h-2.5 w-2.5" /></Button>
                  {d._count?.protocols === 0 && <Button variant="outline" size="sm" className="h-5 px-1.5 text-[9px]" onClick={() => generateProtocol(d.id)} disabled={genProtocol}>{genProtocol ? <Loader2 className="h-2.5 w-2.5 animate-spin" /> : <Heart className="h-2.5 w-2.5 mr-0.5" />} Protocol</Button>}
                </div>
              </div>
              {editingDiagId === d.id ? (
                <div className="space-y-1.5 bg-muted/30 p-2 rounded">
                  <div className="space-y-0.5"><Label className="text-[10px]">Status</Label>
                    <select value={diagForm.status} onChange={(e) => setDiagForm({ ...diagForm, status: e.target.value })} className="w-full h-7 rounded-md border border-input bg-background px-2 text-[10px]">
                      {["DRAFT", "UNDER_REVIEW", "APPROVED", "SENT_TO_PATIENT", "ARCHIVED"].map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <EF label="Summary (editable)" value={diagForm.summary} onChange={(v) => setDiagForm({ ...diagForm, summary: v })} rows={8} />
                  <EF label="Therapist Comments" value={diagForm.therapistComments} onChange={(v) => setDiagForm({ ...diagForm, therapistComments: v })} rows={3} />
                  <div className="flex gap-1"><Button size="sm" className="h-6 text-[10px]" onClick={saveDiag} disabled={saving}><Save className="h-2.5 w-2.5 mr-0.5" /> Save</Button><Button variant="outline" size="sm" className="h-6 text-[10px]" onClick={() => setEditingDiagId(null)}>Cancel</Button></div>
                </div>
              ) : (
                <>
                  <p className="text-[10px] whitespace-pre-wrap">{d.summary}</p>
                  {d.therapistComments && <p className="text-[10px] bg-amber-50 p-1.5 rounded text-amber-800">Therapist: {d.therapistComments}</p>}
                  <Link href={`/admin/patients/${patientId}/diagnosis`} className="text-[10px] text-primary hover:underline">View full →</Link>
                </>
              )}
            </div>
          )) : (
            <div><p className="text-xs text-muted-foreground mb-1.5">No AI assessment yet.</p>
              <Button variant="outline" size="sm" className="h-7 text-xs" onClick={generateDiagnosis} disabled={generating}>
                {generating ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Brain className="h-3 w-3 mr-1" />} Generate AI Assessment
              </Button>
            </div>
          )}
        </Sec>

        {/* ── Treatment Protocols ── */}
        <Sec title="Treatment Protocols" icon={Heart} badge={data.protocols?.length ? `${data.protocols.length}` : "None"}>
          {data.protocols?.length > 0 ? data.protocols.map((pr: any) => (
            <div key={pr.id} className="border rounded-lg p-2.5 mb-2 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-medium">{pr.title}</span>
                <div className="flex items-center gap-1">
                  <Badge variant="outline" className="text-[9px]">{pr.status}</Badge>
                  <Button variant="ghost" size="sm" className="h-5 w-5 p-0" onClick={() => { setProtoForm({ title: pr.title || "", summary: pr.summary || "", therapistComments: pr.therapistComments || "", status: pr.status }); setEditingProtoId(pr.id); }}><Pencil className="h-2.5 w-2.5" /></Button>
                </div>
              </div>
              {editingProtoId === pr.id ? (
                <div className="space-y-1.5 bg-muted/30 p-2 rounded">
                  <div className="space-y-0.5"><Label className="text-[10px]">Status</Label>
                    <select value={protoForm.status} onChange={(e) => setProtoForm({ ...protoForm, status: e.target.value })} className="w-full h-7 rounded-md border border-input bg-background px-2 text-[10px]">
                      {["DRAFT", "UNDER_REVIEW", "APPROVED", "SENT_TO_PATIENT", "ARCHIVED"].map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <EF label="Title" value={protoForm.title} onChange={(v) => setProtoForm({ ...protoForm, title: v })} rows={1} />
                  <EF label="Summary" value={protoForm.summary} onChange={(v) => setProtoForm({ ...protoForm, summary: v })} rows={4} />
                  <EF label="Therapist Comments" value={protoForm.therapistComments} onChange={(v) => setProtoForm({ ...protoForm, therapistComments: v })} rows={2} />
                  <div className="flex gap-1"><Button size="sm" className="h-6 text-[10px]" onClick={saveProto} disabled={saving}><Save className="h-2.5 w-2.5 mr-0.5" /> Save</Button><Button variant="outline" size="sm" className="h-6 text-[10px]" onClick={() => setEditingProtoId(null)}>Cancel</Button></div>
                </div>
              ) : (
                <>
                  {pr.summary && <p className="text-[10px] text-muted-foreground">{pr.summary?.substring(0, 300)}</p>}
                  <p className="text-[9px] text-muted-foreground">{pr.items?.length || 0} items · {pr.estimatedWeeks || "?"} weeks</p>
                  {pr.therapistComments && <p className="text-[10px] bg-amber-50 p-1.5 rounded text-amber-800">{pr.therapistComments}</p>}
                </>
              )}
            </div>
          )) : (
            <div><p className="text-xs text-muted-foreground mb-1.5">No protocol yet. Generate an AI assessment first.</p>
              {data.diagnoses?.length > 0 && (
                <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => generateProtocol(data.diagnoses[0].id)} disabled={genProtocol}>
                  {genProtocol ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Heart className="h-3 w-3 mr-1" />} Generate Protocol
                </Button>
              )}
            </div>
          )}
        </Sec>

        {/* ── Blood Pressure Readings ── */}
        <Sec title="Blood Pressure Readings" icon={HeartPulse} badge={data.bpReadings?.length ? `${data.bpReadings.length}` : "None"}>
          {data.bpReadings?.length > 0 ? (
            <div className="space-y-3">
              {/* Mini trend chart */}
              <div className="bg-muted/30 rounded-lg p-3">
                <p className="text-[9px] font-semibold text-muted-foreground uppercase mb-2">Trend (last {data.bpReadings.length} readings)</p>
                <div className="flex items-end gap-1 h-16">
                  {[...data.bpReadings].reverse().map((r: any, i: number) => {
                    const maxSys = Math.max(...data.bpReadings.map((x: any) => x.systolic));
                    const h = Math.max(10, (r.systolic / maxSys) * 100);
                    const color = r.systolic >= 140 || r.diastolic >= 90 ? "bg-red-400" : r.systolic >= 130 ? "bg-amber-400" : r.systolic >= 120 ? "bg-yellow-400" : "bg-green-400";
                    return (
                      <div key={r.id || i} className="flex-1 flex flex-col items-center gap-0.5" title={`${r.systolic}/${r.diastolic} mmHg — ${new Date(r.measuredAt).toLocaleDateString()}`}>
                        <div className={`w-full rounded-t ${color}`} style={{ height: `${h}%`, minHeight: "4px" }} />
                        <span className="text-[7px] text-muted-foreground">{r.systolic}</span>
                      </div>
                    );
                  })}
                </div>
                {/* Average */}
                {(() => {
                  const avgS = Math.round(data.bpReadings.reduce((s: number, r: any) => s + r.systolic, 0) / data.bpReadings.length);
                  const avgD = Math.round(data.bpReadings.reduce((s: number, r: any) => s + r.diastolic, 0) / data.bpReadings.length);
                  const avgColor = avgS >= 140 || avgD >= 90 ? "text-red-600" : avgS >= 130 ? "text-amber-600" : "text-green-600";
                  return (
                    <p className={`text-[10px] font-semibold mt-1.5 ${avgColor}`}>
                      Average: {avgS}/{avgD} mmHg
                      {avgS >= 140 || avgD >= 90 ? " — Stage 2 Hypertension ⚠️" : avgS >= 130 ? " — Stage 1 / Elevated" : avgS < 90 ? " — Low BP" : " — Normal range"}
                    </p>
                  );
                })()}
              </div>

              {/* Alerts */}
              {data.bpReadings.some((r: any) => r.systolic >= 140 || r.diastolic >= 90) && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-2 flex items-start gap-2">
                  <AlertCircle className="h-3.5 w-3.5 text-red-600 mt-0.5 shrink-0" />
                  <p className="text-[10px] text-red-700">
                    <strong>Alert:</strong> {data.bpReadings.filter((r: any) => r.systolic >= 140 || r.diastolic >= 90).length} of {data.bpReadings.length} readings show Stage 2 hypertension (≥140/90). Consider referring to GP for ABPM.
                  </p>
                </div>
              )}

              {/* Readings table */}
              <div className="overflow-x-auto">
                <table className="w-full text-[10px]">
                  <thead>
                    <tr className="border-b text-muted-foreground">
                      <th className="text-left py-1 font-medium">Date</th>
                      <th className="text-center py-1 font-medium">Sys</th>
                      <th className="text-center py-1 font-medium">Dia</th>
                      <th className="text-center py-1 font-medium">HR</th>
                      <th className="text-center py-1 font-medium">Method</th>
                      <th className="text-left py-1 font-medium">Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.bpReadings.map((r: any) => {
                      const high = r.systolic >= 140 || r.diastolic >= 90;
                      return (
                        <tr key={r.id} className={`border-b ${high ? "bg-red-50/50" : ""}`}>
                          <td className="py-1">{new Date(r.measuredAt).toLocaleString()}</td>
                          <td className={`text-center py-1 font-semibold ${high ? "text-red-600" : ""}`}>{r.systolic}</td>
                          <td className={`text-center py-1 font-semibold ${high ? "text-red-600" : ""}`}>{r.diastolic}</td>
                          <td className="text-center py-1">{r.heartRate || "—"}</td>
                          <td className="text-center py-1"><Badge variant="outline" className="text-[8px] h-4">{r.method === "CAMERA_PPG" ? "PPG" : "Manual"}</Badge></td>
                          <td className="py-1 text-muted-foreground truncate max-w-[150px]">{r.notes || "—"}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : <p className="text-xs text-muted-foreground">No blood pressure readings recorded.</p>}
        </Sec>

      </div>
    </div>
  );
}
