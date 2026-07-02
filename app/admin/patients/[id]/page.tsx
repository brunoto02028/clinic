"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, User, FileText, Footprints, Activity, Stethoscope, Brain, Heart, FileUp,
  RefreshCw, AlertCircle, CheckCircle2, X, Loader2, Mic, MicOff, Languages, Plus, Save,
  ChevronDown, ChevronRight, Calendar, Mail, Phone, Eye, Pencil, Trash2, HeartPulse, Shield,
  Link2, Copy, Check, Sparkles, Upload, Lock, EyeOff, ExternalLink, Flame, Bot, Send,
  BookOpen, TriangleAlert, ClipboardList, ChevronUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const DOC_TYPES = [
  { value: "MEDICAL_REFERRAL", label: "Medical Referral" },
  { value: "MEDICAL_REPORT", label: "Medical Report" },
  { value: "PRESCRIPTION", label: "Prescription" },
  { value: "IMAGING", label: "Imaging" },
  { value: "INSURANCE", label: "Insurance" },
  { value: "CONSENT_FORM", label: "Consent Form" },
  { value: "PREVIOUS_TREATMENT", label: "Previous Treatment" },
  { value: "OTHER", label: "Other" },
  { value: "THERMOGRAPHY", label: "Thermography" },
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

  // Thermography
  const [showThermoUpload, setShowThermoUpload] = useState(false);
  const [thermoFiles, setThermoFiles] = useState<File[]>([]);
  const [thermoNotes, setThermoNotes] = useState("");
  const [thermoUploading, setThermoUploading] = useState(false);
  const [editingThermoId, setEditingThermoId] = useState<string | null>(null);
  const [thermoEditNotes, setThermoEditNotes] = useState("");

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

  // Delete Body Assessment
  const deleteBA = async (id: string) => {
    if (!confirm("Delete this body assessment? This cannot be undone.")) return;
    try {
      const res = await fetch(`/api/admin/body-assessments/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error((await res.json()).error);
      flash("Body assessment deleted"); fetchData();
    } catch (err: any) { setError(err.message); }
  };

  // Upload Thermography
  const handleThermoUpload = async () => {
    if (thermoFiles.length === 0) return;
    setThermoUploading(true);
    try {
      for (const file of thermoFiles) {
        const fd = new FormData();
        fd.append("file", file);
        fd.append("title", thermoNotes || `Thermography - ${new Date().toLocaleDateString()}`);
        fd.append("documentType", "THERMOGRAPHY");
        fd.append("source", "ADMIN_UPLOAD");
        fd.append("description", thermoNotes);
        const res = await fetch(`/api/admin/patients/${patientId}/documents`, { method: "POST", body: fd });
        if (!res.ok) throw new Error((await res.json()).error);
      }
      setThermoFiles([]); setThermoNotes(""); setShowThermoUpload(false);
      flash("Thermography images uploaded!"); fetchData();
    } catch (err: any) { setError(err.message); }
    finally { setThermoUploading(false); }
  };

  // Save Thermography notes
  const saveThermoNotes = async () => {
    if (!editingThermoId) return;
    const r = await apiPatch({ action: "edit_document", documentId: editingThermoId, description: thermoEditNotes });
    if (r) { setEditingThermoId(null); flash("Thermography notes updated"); fetchData(); }
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
          <Link href={`/admin/patients/${patientId}/permissions`}><Button variant="outline" size="sm" className="h-8 text-xs bg-amber-500/10 border-amber-500/30 text-amber-400 hover:bg-amber-500/20"><Shield className="h-3.5 w-3.5 mr-1" /> Permissões</Button></Link>
          <Link href={`/admin/patients/${patientId}/documents`}><Button variant="outline" size="sm" className="h-8 text-xs"><FileUp className="h-3.5 w-3.5 mr-1" /> Documents</Button></Link>
          <Link href={`/admin/patients/${patientId}/diagnosis`}><Button variant="outline" size="sm" className="h-8 text-xs"><Brain className="h-3.5 w-3.5 mr-1" /> AI Assessment</Button></Link>
        </div>
      </div>

      {/* Patient Status Badges */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Profile/Intake Status */}
        {p.profileCompleted ? (
          <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30 text-[10px]">
            <CheckCircle2 className="h-3 w-3 mr-1" /> Perfil Completo
          </Badge>
        ) : (
          <Badge className="bg-amber-500/15 text-amber-400 border-amber-500/30 text-[10px]">
            <AlertCircle className="h-3 w-3 mr-1" /> Perfil Pendente
          </Badge>
        )}
        {/* Password Status */}
        {p.hasPassword ? (
          <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30 text-[10px]">
            <Shield className="h-3 w-3 mr-1" /> Senha Definida
          </Badge>
        ) : (
          <Badge className="bg-red-500/15 text-red-400 border-red-500/30 text-[10px]">
            <AlertCircle className="h-3 w-3 mr-1" /> Sem Senha
          </Badge>
        )}
        {/* Consent Status */}
        {p.consentAcceptedAt ? (
          <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30 text-[10px]">
            <CheckCircle2 className="h-3 w-3 mr-1" /> Consentimento Aceito
          </Badge>
        ) : (
          <Badge className="bg-amber-500/15 text-amber-400 border-amber-500/30 text-[10px]">
            <AlertCircle className="h-3 w-3 mr-1" /> Sem Consentimento
          </Badge>
        )}
        {/* Full Access Toggle */}
        <Button
          variant={p.fullAccessOverride ? "default" : "outline"}
          size="sm"
          className={`h-7 text-[10px] gap-1 ${p.fullAccessOverride ? "bg-emerald-600 hover:bg-emerald-700" : "border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/10"}`}
          onClick={toggleFullAccess}
          disabled={togglingAccess}
        >
          {togglingAccess ? <Loader2 className="h-3 w-3 animate-spin" /> : <Shield className="h-3 w-3" />}
          {p.fullAccessOverride ? "Acesso Total Ativo" : "Liberar Acesso Total"}
        </Button>
        {/* Reset Password */}
        <Button variant="outline" size="sm" className="h-7 text-[10px] gap-1 border-amber-500/40 text-amber-400 hover:bg-amber-500/10" onClick={() => setShowResetPw(!showResetPw)}>
          <Lock className="h-3 w-3" /> Resetar Senha
        </Button>
        {/* View as Patient */}
        <Button variant="outline" size="sm" className="h-7 text-[10px] gap-1 border-blue-500/40 text-blue-400 hover:bg-blue-500/10" onClick={handleImpersonate}>
          <Eye className="h-3 w-3" /> Ver como Paciente
        </Button>
      </div>

      {/* Inline Reset Password */}
      {showResetPw && (
        <div className="flex items-center gap-2 p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
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
      {success && <div className="bg-emerald-500/10 text-emerald-400 text-xs p-2.5 rounded-lg flex items-center gap-2"><CheckCircle2 className="h-3.5 w-3.5" /> {success}</div>}

      {/* ─── Tabs ─── */}
      <Tabs defaultValue="resumo" className="mt-4">
        <TabsList className="w-full justify-start bg-muted/30 p-1 h-auto flex-wrap">
          <TabsTrigger value="resumo" className="text-xs data-[state=active]:bg-primary/15 data-[state=active]:text-primary">Resumo</TabsTrigger>
          <TabsTrigger value="screening" className="text-xs data-[state=active]:bg-primary/15 data-[state=active]:text-primary">Screening</TabsTrigger>
          <TabsTrigger value="avaliacoes" className="text-xs data-[state=active]:bg-primary/15 data-[state=active]:text-primary">Avaliacoes</TabsTrigger>
          <TabsTrigger value="notas" className="text-xs data-[state=active]:bg-primary/15 data-[state=active]:text-primary">Notas Clinicas</TabsTrigger>
            <TabsTrigger value="docs" className="text-xs data-[state=active]:bg-primary/15 data-[state=active]:text-primary">Documentos</TabsTrigger>
          <TabsTrigger value="rehab" className="text-xs data-[state=active]:bg-emerald-500/20 data-[state=active]:text-emerald-400 flex items-center gap-1">
            <Bot className="h-3 w-3" />Rehab Agent
          </TabsTrigger>
        </TabsList>

        {/* ── Tab: Resumo ── */}
        <TabsContent value="resumo" className="space-y-4 mt-4">

      {/* Invite Link */}
      <div className="flex flex-wrap items-center gap-2 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
        <Link2 className="h-4 w-4 text-blue-400 shrink-0" />
        <span className="text-xs font-medium text-blue-300">Patient Invite Link</span>
        {inviteUrl ? (
          <>
            <code className="text-[10px] bg-card border rounded px-2 py-1 text-blue-400 flex-1 min-w-0 truncate">{inviteUrl}</code>
            <Button variant="outline" size="sm" className="h-7 text-xs border-blue-500/40 text-blue-400" onClick={copyInvite}>
              {inviteCopied ? <><Check className="h-3 w-3 mr-1" /> Copied!</> : <><Copy className="h-3 w-3 mr-1" /> Copy</>}
            </Button>
          </>
        ) : (
          <Button variant="outline" size="sm" className="h-7 text-xs border-blue-500/40 text-blue-400 hover:bg-blue-500/10" onClick={generateInvite} disabled={inviteLoading}>
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
        <Button variant="outline" size="sm" className={`${btnCls} bg-violet-500/10 border-violet-500/30 text-violet-400 hover:bg-violet-500/20`} onClick={() => setShowAIImport(true)}>
          <Sparkles className="h-2.5 w-2.5 mr-0.5" /> AI Import
        </Button>
      </div>

      {/* AI Import Panel */}
      {showAIImport && (
        <Card className="border-violet-500/30 bg-violet-500/10">
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
                className="text-xs w-full file:mr-2 file:py-1 file:px-3 file:rounded-md file:border file:text-xs file:bg-violet-500/20 file:text-violet-400 file:border-violet-500/30"
              />
              {aiImportFiles.length > 0 && (
                <p className="text-[10px] text-violet-600">{aiImportFiles.length} file(s) selected</p>
              )}
            </div>

            {/* AI Import Result Preview */}
            {aiImportResult && (
              <div className="bg-card border border-violet-500/30 rounded-lg p-3 space-y-2">
                <p className="text-xs font-semibold text-violet-300">AI Import Results:</p>
                {aiImportResult.screening && (
                  <div className="text-[10px]">
                    <Badge variant="outline" className="text-[9px] bg-emerald-500/10">Screening</Badge>
                    <span className="ml-1 text-muted-foreground">
                      {aiImportResult.screening.conditions?.length || 0} conditions,{" "}
                      {aiImportResult.screening.medications ? "medications found" : "no medications"},
                      {aiImportResult.screening.redFlagsCount || 0} red flags
                    </span>
                  </div>
                )}
                {aiImportResult.soapNotesCreated > 0 && (
                  <div className="text-[10px]">
                    <Badge variant="outline" className="text-[9px] bg-blue-500/10">SOAP Notes</Badge>
                    <span className="ml-1 text-muted-foreground">{aiImportResult.soapNotesCreated} note(s) created</span>
                  </div>
                )}
                {aiImportResult.documentsCreated > 0 && (
                  <div className="text-[10px]">
                    <Badge variant="outline" className="text-[9px] bg-purple-500/10">Documents</Badge>
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

      {/* Red Flags Summary */}
      {data.screening && (() => {
        const activeFlags = RED_FLAGS.filter(f => data.screening[f.key]);
        return activeFlags.length > 0 ? (
          <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
            <p className="text-[10px] font-semibold text-red-400 uppercase mb-1.5">Red Flags Identified</p>
            <div className="flex flex-wrap gap-1">
              {activeFlags.map(f => (
                <Badge key={f.key} className="bg-red-500/15 text-red-400 border-red-500/30 text-[9px]">
                  <AlertCircle className="h-2.5 w-2.5 mr-0.5" /> {f.label}
                </Badge>
              ))}
            </div>
          </div>
        ) : null;
      })()}

      {/* Chief Complaint */}
      {data.screening?.chiefComplaint && (
        <div className="p-3 bg-muted/30 border rounded-lg">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase mb-1">Chief Complaint</p>
          <p className="text-xs">{data.screening.chiefComplaint}</p>
        </div>
      )}

        </TabsContent>

        {/* ── Tab: Screening ── */}
        <TabsContent value="screening" className="mt-4">
        <div className="space-y-2.5">
        {/* ── Assessment Screening ── */}
        <Sec title="Assessment Screening" icon={FileText} badge={data.screening ? "Completed" : "Not filled"} open={!!data.screening}
          actions={data.screening && <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => { setScreeningForm({ ...data.screening }); setEditingScreening(true); }}><Pencil className="h-3 w-3" /></Button>}
        >
          {editingScreening && data.screening ? (
            <div className="space-y-3">
              <h4 className="text-[10px] font-semibold text-muted-foreground uppercase">Red Flag Questions (click to toggle)</h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-1">
                {RED_FLAGS.map((f) => (
                  <button key={f.key} type="button" onClick={() => setScreeningForm({ ...screeningForm, [f.key]: !screeningForm[f.key] })}
                    className={`flex items-center gap-1 text-[10px] px-2 py-1 rounded cursor-pointer transition-colors ${screeningForm[f.key] ? "bg-red-500/15 text-red-400 ring-1 ring-red-500/30" : "bg-emerald-500/10 text-emerald-400"}`}>
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
                  <div key={f.key} className={`flex items-center gap-1 text-[10px] px-2 py-1 rounded ${data.screening[f.key] ? "bg-red-500/10 text-red-400" : "bg-emerald-500/10 text-emerald-400"}`}>
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
        </div>
        </TabsContent>

        {/* ── Tab: Avaliacoes ── */}
        <TabsContent value="avaliacoes" className="space-y-4 mt-4">
        <div className="space-y-2.5">
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
                  {s.aiRecommendation && <p className="text-[10px] bg-blue-500/10 p-1.5 rounded text-blue-400">{s.aiRecommendation}</p>}
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
                  <Button variant="ghost" size="sm" className="h-5 w-5 p-0 text-red-400 hover:text-red-300" onClick={() => deleteBA(ba.id)}><Trash2 className="h-2.5 w-2.5" /></Button>
                </div>
              </div>
              {(ba.postureScore || ba.symmetryScore || ba.mobilityScore || ba.overallScore) && (
                <div className="grid grid-cols-4 gap-1.5 text-center">
                  {[{ l: "Posture", v: ba.postureScore }, { l: "Symmetry", v: ba.symmetryScore }, { l: "Mobility", v: ba.mobilityScore }, { l: "Overall", v: ba.overallScore }].map((s) => (
                    <div key={s.l} className="bg-muted/50 rounded p-1"><p className="text-[8px] text-muted-foreground">{s.l}</p><p className={`text-xs font-bold ${s.v >= 70 ? "text-emerald-400" : s.v >= 50 ? "text-amber-400" : "text-red-400"}`}>{s.v != null ? Math.round(s.v) : "—"}</p></div>
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
                  {ba.aiSummary && <p className="text-[10px] bg-blue-500/10 p-1.5 rounded text-blue-400">{ba.aiSummary}</p>}
                  {ba.therapistNotes && <p className="text-[10px] bg-muted/50 p-1.5 rounded">{ba.therapistNotes}</p>}
                </>
              )}
            </div>
          )) : <p className="text-xs text-muted-foreground">No body assessments.</p>}
        </Sec>

        {/* ── Thermography ── */}
        {(() => {
          const thermoImages = data.documents?.filter((d: any) => d.documentType === "THERMOGRAPHY") || [];
          return (
            <Sec title="Infrared Thermography" icon={Flame} badge={thermoImages.length ? `${thermoImages.length}` : "None"}
              actions={<Button variant="ghost" size="sm" className="h-6 px-1.5 text-[10px]" onClick={() => setShowThermoUpload(true)}><Plus className="h-2.5 w-2.5 mr-0.5" /> Upload</Button>}
            >
              {showThermoUpload && (
                <div className="border border-primary rounded-lg p-3 mb-3 space-y-2 bg-orange-500/10">
                  <p className="text-xs font-semibold flex items-center gap-1"><Flame className="h-3.5 w-3.5 text-orange-500" /> Upload Thermography Images</p>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={(e) => e.target.files && setThermoFiles(Array.from(e.target.files))}
                    className="text-xs w-full file:mr-2 file:py-1 file:px-3 file:rounded-md file:border file:text-xs file:bg-orange-500/20 file:text-orange-400 file:border-orange-500/30"
                  />
                  {thermoFiles.length > 0 && <p className="text-[10px] text-orange-600">{thermoFiles.length} image(s) selected</p>}
                  <EF label="Clinical Notes / Analysis" value={thermoNotes} onChange={setThermoNotes} rows={3} placeholder="Describe findings: inflammation areas, temperature differences, suspected lesions..." />
                  <div className="flex gap-1.5">
                    <Button size="sm" className="h-7 text-xs bg-orange-600 hover:bg-orange-700" onClick={handleThermoUpload} disabled={thermoUploading || thermoFiles.length === 0}>
                      {thermoUploading ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Upload className="h-3 w-3 mr-1" />} Upload
                    </Button>
                    <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => { setShowThermoUpload(false); setThermoFiles([]); setThermoNotes(""); }}>Cancel</Button>
                  </div>
                </div>
              )}

              {thermoImages.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {thermoImages.map((img: any) => (
                    <div key={img.id} className="border rounded-lg overflow-hidden bg-black/5">
                      {img.fileUrl && (
                        <a href={img.fileUrl} target="_blank" rel="noopener noreferrer" className="block">
                          <img src={img.fileUrl} alt={img.title || "Thermography"} className="w-full h-48 object-contain bg-black/90" />
                        </a>
                      )}
                      <div className="p-2.5 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-medium">{img.title || "Thermography"}</span>
                          <div className="flex items-center gap-1">
                            <span className="text-[9px] text-muted-foreground">{new Date(img.createdAt).toLocaleDateString()}</span>
                            <Button variant="ghost" size="sm" className="h-5 w-5 p-0" onClick={() => { setThermoEditNotes(img.description || ""); setEditingThermoId(img.id); }}><Pencil className="h-2.5 w-2.5" /></Button>
                          </div>
                        </div>
                        {editingThermoId === img.id ? (
                          <div className="space-y-1.5 bg-muted/30 p-2 rounded">
                            <EF label="Clinical Analysis" value={thermoEditNotes} onChange={setThermoEditNotes} rows={3} placeholder="Inflammation findings, temperature analysis..." />
                            <div className="flex gap-1">
                              <Button size="sm" className="h-6 text-[10px]" onClick={saveThermoNotes} disabled={saving}><Save className="h-2.5 w-2.5 mr-0.5" /> Save</Button>
                              <Button variant="outline" size="sm" className="h-6 text-[10px]" onClick={() => setEditingThermoId(null)}>Cancel</Button>
                            </div>
                          </div>
                        ) : (
                          img.description && <p className="text-[10px] bg-orange-500/10 p-1.5 rounded text-orange-400">{img.description}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : !showThermoUpload && <p className="text-xs text-muted-foreground">No thermography images uploaded yet.</p>}
            </Sec>
          );
        })()}

        {/* ── AI Assessments (inside avaliacoes) ── */}
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
                  {d.therapistComments && <p className="text-[10px] bg-amber-500/10 p-1.5 rounded text-amber-400">Therapist: {d.therapistComments}</p>}
                  <Link href={`/admin/patients/${patientId}/diagnosis`} className="text-[10px] text-primary hover:underline">View full &rarr;</Link>
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

        {/* ── Treatment Protocols (inside avaliacoes) ── */}
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
        </div>
        </TabsContent>

        {/* ── Tab: Notas Clinicas ── */}
        <TabsContent value="notas" className="space-y-4 mt-4">
        <div className="space-y-2.5">
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
        </TabsContent>

        {/* ── Tab: Documentos ── */}
        <TabsContent value="docs" className="mt-4">
        <div className="space-y-2.5">
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
        </div>
        </TabsContent>

        {/* ── Tab: Rehab Agent ── */}
        <TabsContent value="rehab" className="mt-4">
          <RehabAgentTab patientId={patientId} patientData={data} />
        </TabsContent>

      </Tabs>
    </div>
  );
}

// ─── Rehab Agent Tab Component ───────────────────────────────────────────────

const ATLAS_AVATAR = "https://randomuser.me/api/portraits/men/52.jpg";
const ATLAS_NAME   = "Atlas";
const ATLAS_TITLE  = "Clinical Rehabilitation Specialist";

function AtlasAvatar({ size = "sm" }: { size?: "sm" | "md" | "lg" }) {
  const sz = size === "lg" ? "w-14 h-14" : size === "md" ? "w-10 h-10" : "w-7 h-7";
  return (
    <img src={ATLAS_AVATAR} alt={ATLAS_NAME}
      className={`${sz} rounded-full object-cover ring-2 ring-emerald-500/30 shrink-0`}
      onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
  );
}

function RehabAgentTab({ patientId, patientData }: { patientId: string; patientData: any }) {
  const [plans, setPlans]           = useState<any[]>([]);
  const [activePlan, setActivePlan] = useState<any>(null);
  const [view, setView]             = useState<"list" | "assess" | "plan">("list");

  // Pre-assessment state
  const [preChat, setPreChat]           = useState<Array<{ role: "user" | "assistant"; content: string }>>([]);
  const [preInput, setPreInput]         = useState("");
  const [preLoading, setPreLoading]     = useState(false);
  const [preStarted, setPreStarted]     = useState(false);
  const [generating, setGenerating]     = useState(false);

  // Plan chat state
  const [chatMsg, setChatMsg]           = useState("");
  const [chatLoading, setChatLoading]   = useState(false);
  const [error, setError]               = useState("");

  // Send to patient state
  const [sendNote, setSendNote]         = useState("");
  const [sending, setSending]           = useState(false);
  const [sentPlanId, setSentPlanId]     = useState<string | null>(null);

  // Quick free-form chat with Atlas (list view)
  const [quickHistory, setQuickHistory] = useState<Array<{ role: "user" | "assistant"; content: string }>>([]);
  const [quickInput, setQuickInput]     = useState("");
  const [quickLoading, setQuickLoading] = useState(false);
  const quickEndRef = useRef<HTMLDivElement>(null);

  // Send questions to patient
  const [showQDialog, setShowQDialog]   = useState(false);
  const [qText, setQText]               = useState("");
  const [qLang, setQLang]               = useState<"en" | "pt">("en");
  const [sendingQ, setSendingQ]         = useState(false);
  const [qSentOk, setQSentOk]           = useState(false);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [sentQuestions, setSentQuestions] = useState<any[]>([]);
  const [expandedQSet, setExpandedQSet] = useState<string | null>(null);
  const [reformulating, setReformulating] = useState(false);

  const preEndRef  = useRef<HTMLDivElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const fetchSentQuestions = () => {
    fetch(`/api/admin/patients/${patientId}/questions`)
      .then(r => r.ok ? r.json() : [])
      .then((data: any[]) => setSentQuestions(Array.isArray(data) ? data : []))
      .catch(() => {});
  };

  useEffect(() => { fetchSentQuestions(); }, [patientId]);

  const handleReformatQuestions = async () => {
    const lines = qText.split("\n").map(l => l.trim()).filter(Boolean);
    if (!lines.length) return;
    setReformulating(true);
    try {
      const r = await fetch("/api/admin/reformat-questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questions: lines, lang: qLang }),
      });
      const d = await r.json();
      if (d.questions?.length) setQText(d.questions.join("\n"));
    } catch {}
    finally { setReformulating(false); }
  };

  const screening = patientData?.screening;
  const initialContext = {
    chiefComplaint:     screening?.chiefComplaint    || "",
    bodyPart:           "",
    severity:           "moderate" as const,
    phase:              "subacute" as const,
    aggravatingFactors: screening?.aggravatingFactors       || "",
    relievingFactors:   screening?.relievingFactors         || "",
    relevantHistory:    screening?.relevantMedicalHistory   || "",
    age: patientData?.profile?.dateOfBirth
      ? new Date().getFullYear() - new Date(patientData.profile.dateOfBirth).getFullYear()
      : undefined,
    sex:          patientData?.profile?.gender     || "",
    occupation:   patientData?.profile?.occupation || "",
  };

  const loadPlans = useCallback(async () => {
    const r = await fetch(`/api/admin/patients/${patientId}/rehab-plan`);
    if (r.ok) setPlans(await r.json());
  }, [patientId]);

  const loadHistory = useCallback(async () => {
    if (historyLoaded) return;
    const r = await fetch(`/api/admin/patients/${patientId}/atlas-chat`);
    if (r.ok) {
      const data = await r.json();
      setQuickHistory(data.map((m: any) => ({ role: m.role, content: m.content })));
      setHistoryLoaded(true);
    }
  }, [patientId, historyLoaded]);

  useEffect(() => { loadPlans(); loadHistory(); }, [loadPlans, loadHistory]);
  useEffect(() => { preEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [preChat]);
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [activePlan?.messages]);

  // Start pre-assessment: Atlas fires first
  const startAssessment = async () => {
    setView("assess");
    if (preStarted) return;
    setPreStarted(true);
    setPreLoading(true);
    try {
      const r = await fetch(`/api/admin/patients/${patientId}/rehab-plan/pre-assess`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: [] }),
      });
      const d = await r.json();
      setPreChat([{ role: "assistant", content: d.reply }]);
    } catch { setPreChat([{ role: "assistant", content: "Connection error. Please retry." }]); }
    finally { setPreLoading(false); }
  };

  const sendPreMessage = async () => {
    if (!preInput.trim() || preLoading) return;
    const msg = preInput.trim(); setPreInput("");
    const next = [...preChat, { role: "user" as const, content: msg }];
    setPreChat(next);
    setPreLoading(true);
    try {
      const r = await fetch(`/api/admin/patients/${patientId}/rehab-plan/pre-assess`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next }),
      });
      const d = await r.json();
      setPreChat(prev => [...prev, { role: "assistant", content: d.reply }]);
    } catch { setPreChat(prev => [...prev, { role: "assistant", content: "Error — please retry." }]); }
    finally { setPreLoading(false); }
  };

  const handleGenerate = async () => {
    setGenerating(true); setError("");
    try {
      const r = await fetch(`/api/admin/patients/${patientId}/rehab-plan`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...initialContext, preAssessChat: preChat }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      await loadPlans();
      const pr = await fetch(`/api/admin/patients/${patientId}/rehab-plan/${d.plan.id}`);
      setActivePlan(await pr.json());
      setView("plan");
    } catch (e: any) { setError(e.message); }
    finally { setGenerating(false); }
  };

  const loadPlan = async (id: string) => {
    const r = await fetch(`/api/admin/patients/${patientId}/rehab-plan/${id}`);
    setActivePlan(await r.json()); setView("plan");
  };

  const handleChat = async () => {
    if (!chatMsg.trim() || !activePlan) return;
    const msg = chatMsg; setChatMsg(""); setChatLoading(true);
    setActivePlan((p: any) => ({ ...p, messages: [...(p.messages || []), { role: "user", content: msg }] }));
    try {
      const r = await fetch(`/api/admin/patients/${patientId}/rehab-plan/${activePlan.id}/chat`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: msg }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      setActivePlan((p: any) => ({ ...p, messages: [...(p.messages || []), { role: "assistant", content: d.reply }] }));
    } catch (e: any) { setError(e.message); }
    finally { setChatLoading(false); }
  };

  const handleQuickChat = async () => {
    const msg = quickInput.trim();
    if (!msg || quickLoading) return;
    const newHistory = [...quickHistory, { role: "user" as const, content: msg }];
    setQuickHistory(newHistory);
    setQuickInput("");
    setQuickLoading(true);
    setTimeout(() => quickEndRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
    try {
      const r = await fetch(`/api/admin/patients/${patientId}/atlas-chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: msg, history: quickHistory }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      setQuickHistory(h => [...h, { role: "assistant", content: d.reply }]);
    } catch (e: any) { setError(e.message); }
    finally {
      setQuickLoading(false);
      setTimeout(() => quickEndRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
    }
  };

  const handleSendQuestions = async () => {
    const stripMd = (s: string) => s
      .replace(/\*\*/g, "").replace(/\*/g, "").replace(/_/g, "")
      .replace(/^#+\s*/gm, "").replace(/^>\s*/gm, "").replace(/`/g, "")
      .replace(/^[-•–]\s*/gm, "").replace(/^\d+[\.\)]\s*/, "").trim();
    const lines = qText.split("\n").map(l => stripMd(l)).filter(Boolean);
    if (!lines.length) return;
    setSendingQ(true);
    try {
      const r = await fetch(`/api/admin/patients/${patientId}/questions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questions: lines, context: "Pre-assessment questions", language: qLang }),
      });
      if (!r.ok) throw new Error("Failed");
      setQSentOk(true);
      setQText("");
      fetchSentQuestions();
      setTimeout(() => { setShowQDialog(false); setQSentOk(false); }, 1500);
    } catch (e: any) { setError(e.message); }
    finally { setSendingQ(false); }
  };

  const handleSend = async () => {
    if (!activePlan || sending) return;
    setSending(true);
    try {
      const r = await fetch(`/api/admin/patients/${patientId}/rehab-plan/${activePlan.id}/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ therapistNote: sendNote }),
      });
      if (!r.ok) throw new Error("Failed to send");
      setSentPlanId(activePlan.id);
      setActivePlan((p: any) => ({ ...p, sentToPatient: true, sentAt: new Date().toISOString(), therapistNote: sendNote }));
    } catch (e: any) { setError(e.message); }
    finally { setSending(false); }
  };

  const handleRevoke = async () => {
    if (!activePlan) return;
    await fetch(`/api/admin/patients/${patientId}/rehab-plan/${activePlan.id}/send`, { method: "DELETE" });
    setSentPlanId(null);
    setActivePlan((p: any) => ({ ...p, sentToPatient: false, sentAt: null }));
  };

  const plan: any = activePlan?.planJson;

  // ── List View ──
  if (view === "list") return (
    <div className="space-y-3">
      {/* Atlas header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <AtlasAvatar size="md" />
          <div>
            <p className="text-sm font-semibold leading-tight">{ATLAS_NAME}</p>
            <p className="text-[10px] text-muted-foreground leading-tight">{ATLAS_TITLE}</p>
          </div>
          <Badge variant="outline" className="text-[9px] border-emerald-500/30 text-emerald-400 hidden sm:flex">Claude Sonnet 5</Badge>
        </div>
        <Button size="sm" className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700" onClick={startAssessment}>
          <Plus className="h-3 w-3 mr-1" />New Assessment
        </Button>
      </div>
      {plans.length === 0 ? (
        <div className="text-center py-4 text-muted-foreground border border-dashed rounded-lg">
          <p className="text-[10px] mt-1">Nenhum plano gerado. Usa "New Assessment" para criar um plano estruturado.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {plans.map((p: any) => (
            <div key={p.id} className="flex items-center justify-between p-3 bg-muted/20 border rounded-lg hover:bg-muted/30 cursor-pointer active:opacity-70 transition-opacity" onClick={() => loadPlan(p.id)}>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium truncate">{p.bodyPart} — {p.chiefComplaint}</p>
                <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                  <Badge variant="outline" className="text-[9px] h-4">{p.severity}</Badge>
                  <Badge variant="outline" className="text-[9px] h-4">{p.phase}</Badge>
                  <Badge variant="outline" className={`text-[9px] h-4 ${p.status === "active" ? "border-emerald-500/40 text-emerald-400" : ""}`}>{p.status}</Badge>
                  {p.sentToPatient && <Badge variant="outline" className="text-[9px] h-4 border-emerald-500/40 text-emerald-400">Enviado ✓</Badge>}
                  <span className="text-[9px] text-muted-foreground">{new Date(p.createdAt).toLocaleDateString("en-GB")}</span>
                </div>
              </div>
              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0 ml-2" />
            </div>
          ))}
        </div>
      )}

      {/* ── Chat Livre com Atlas ── */}
      <div className="border rounded-lg overflow-hidden">
        <div className="flex items-center gap-2 px-3 py-2 bg-emerald-500/5 border-b">
          <AtlasAvatar size="sm" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold leading-tight">Chat com Atlas</p>
            <p className="text-[9px] text-muted-foreground leading-tight">Chat persistente — o Atlas lembra-se de cada paciente</p>
          </div>
          <Button size="sm" variant="outline" className="h-6 px-2 text-[10px] border-blue-500/30 text-blue-400 hover:bg-blue-500/10 shrink-0"
            onClick={() => {
              const lastAssistant = [...quickHistory].reverse().find(m => m.role === "assistant");
              if (lastAssistant) {
                const stripMd = (s: string) => s
                  .replace(/\*\*/g, "").replace(/\*/g, "").replace(/_/g, "")
                  .replace(/^#+\s*/gm, "").replace(/^>\s*/gm, "").replace(/`/g, "")
                  .replace(/^[-•–]\s*/gm, "").trim();
                const numbered = lastAssistant.content.split("\n")
                  .filter(l => /^\d+[\.\)]/.test(l.trim()))
                  .map(l => stripMd(l.replace(/^\d+[\.\)]\s*/, "")))
                  .filter(Boolean);
                const questions = lastAssistant.content.split("\n")
                  .filter(l => l.trim().endsWith("?"))
                  .map(l => stripMd(l))
                  .filter(Boolean);
                const extracted = numbered.length > 0 ? numbered : questions.length > 0 ? questions : [];
                setQText(extracted.length > 0 ? extracted.join("\n") : stripMd(lastAssistant.content).slice(0, 800));
              }
              setShowQDialog(true);
            }}>
            <Send className="h-2.5 w-2.5 mr-1" />Enviar ao Paciente
          </Button>
        </div>

        {quickHistory.length > 0 && (
          <div className="max-h-72 overflow-y-auto p-3 space-y-2.5">
            {quickHistory.map((m, i) => (
              <div key={i} className={`flex items-start gap-2 ${m.role === "user" ? "flex-row-reverse" : ""}`}>
                {m.role === "assistant" && <AtlasAvatar size="sm" />}
                <div className={`max-w-[90%] text-[10px] rounded-xl px-2.5 py-2 leading-relaxed whitespace-pre-wrap ${
                  m.role === "user" ? "bg-emerald-600 text-white rounded-tr-none" : "bg-muted/40 rounded-tl-none"
                }`}>{m.content}</div>
              </div>
            ))}
            {quickLoading && (
              <div className="flex items-start gap-2">
                <AtlasAvatar size="sm" />
                <div className="bg-muted/40 rounded-xl rounded-tl-none px-2.5 py-2">
                  <Loader2 className="h-3 w-3 animate-spin text-emerald-400" />
                </div>
              </div>
            )}
            <div ref={quickEndRef} />
          </div>
        )}

        <div className="p-2 flex gap-2">
          <Input
            className="text-xs h-9 flex-1"
            placeholder="Ex: 'Que exercícios sugeres para esta fase?' ou 'O que pode causar este padrão de dor?'"
            value={quickInput}
            onChange={e => setQuickInput(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleQuickChat(); } }}
            disabled={quickLoading}
          />
          <Button size="sm" className="h-9 w-9 p-0 bg-emerald-600 hover:bg-emerald-700 shrink-0" onClick={handleQuickChat} disabled={quickLoading || !quickInput.trim()}>
            {quickLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
          </Button>
        </div>
      </div>

      {/* ── Questions History ── */}
      {sentQuestions.length > 0 && (
        <div className="border rounded-lg overflow-hidden">
          <div className="flex items-center justify-between px-3 py-2 bg-blue-500/5 border-b">
            <p className="text-xs font-semibold text-blue-400">Perguntas Enviadas ao Paciente ({sentQuestions.length})</p>
            <button onClick={fetchSentQuestions} className="text-[10px] text-muted-foreground hover:text-foreground">↻ Refresh</button>
          </div>
          <div className="divide-y">
            {sentQuestions.map((qs: any) => {
              const isExpanded = expandedQSet === qs.id;
              const statusColor = qs.status === "answered" ? "text-emerald-400" : qs.status === "reviewed" ? "text-blue-400" : "text-amber-400";
              const statusLabel = qs.status === "answered" ? "✅ Respondido" : qs.status === "reviewed" ? "👁 Revisto" : "⏳ Pendente";
              return (
                <div key={qs.id}>
                  <button
                    className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-muted/20 text-left transition-colors"
                    onClick={() => setExpandedQSet(isExpanded ? null : qs.id)}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-semibold ${statusColor}`}>{statusLabel}</span>
                        <span className="text-[10px] text-muted-foreground">·</span>
                        <span className="text-[10px] text-muted-foreground">{(qs.questions as string[]).length} pergunta{(qs.questions as string[]).length !== 1 ? "s" : ""}</span>
                        <span className="text-[10px] text-muted-foreground">·</span>
                        <span className="text-[10px] text-muted-foreground">{new Date(qs.createdAt).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
                      </div>
                      {qs.context && <p className="text-[9px] text-muted-foreground/60 mt-0.5 truncate">{qs.context}</p>}
                    </div>
                    <span className="text-muted-foreground text-xs">{isExpanded ? "▲" : "▼"}</span>
                  </button>
                  {isExpanded && (
                    <div className="px-3 pb-3 space-y-2 bg-muted/10">
                      {(qs.questions as string[]).map((q: string, i: number) => {
                        const answer = qs.answers?.find((a: any) => a.index === i);
                        return (
                          <div key={i} className="rounded-lg border border-border/40 overflow-hidden">
                            <div className="px-2.5 py-1.5 bg-muted/30">
                              <p className="text-[10px] font-medium">{i + 1}. {q}</p>
                            </div>
                            {answer ? (
                              <div className="px-2.5 py-1.5 bg-emerald-500/5 border-t border-emerald-500/20">
                                <p className="text-[10px] text-emerald-300 leading-relaxed">{answer.answer || <em className="text-muted-foreground">Sem resposta</em>}</p>
                              </div>
                            ) : (
                              <div className="px-2.5 py-1.5 border-t border-amber-500/20 bg-amber-500/5">
                                <p className="text-[10px] text-amber-400/70 italic">Ainda não respondido</p>
                              </div>
                            )}
                          </div>
                        );
                      })}
                      {qs.answeredAt && (
                        <p className="text-[9px] text-muted-foreground">Respondido a {new Date(qs.answeredAt).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })}</p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Dialog: Enviar Perguntas ao Paciente ── */}
      {showQDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setShowQDialog(false)}>
          <div className="bg-background border rounded-xl shadow-xl w-full max-w-lg p-5 space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold">Rever e Enviar Perguntas</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">Revê cada pergunta antes de enviar — use a 2ª pessoa (você) e tom directo.</p>
              </div>
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setShowQDialog(false)}><X className="h-3.5 w-3.5" /></Button>
            </div>

            {/* Warning banner */}
            <div className="flex items-start gap-2 p-2.5 bg-amber-500/10 border border-amber-500/20 rounded-lg">
              <span className="text-amber-400 text-xs mt-0.5">⚠️</span>
              <p className="text-[10px] text-amber-300 leading-relaxed">
                Verifique: perguntas devem ser dirigidas ao paciente em <strong>2ª pessoa ("você")</strong>, em <strong>Português do Brasil</strong>, sem linguagem clínica. Use o botão <strong>✨ Reformular</strong> para corrigir automaticamente.
              </p>
            </div>

            {/* Language + Reformat row */}
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-[10px] text-muted-foreground shrink-0">Língua:</p>
              <Button size="sm" variant={qLang === "pt" ? "default" : "outline"} className="h-7 text-[10px] px-3" onClick={() => setQLang("pt")}>🇧🇷 PT-BR</Button>
              <Button size="sm" variant={qLang === "en" ? "default" : "outline"} className="h-7 text-[10px] px-3" onClick={() => setQLang("en")}>🇬🇧 EN</Button>
              <div className="flex-1" />
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-[10px] px-3 border-purple-500/40 text-purple-400 hover:bg-purple-500/10 gap-1"
                onClick={handleReformatQuestions}
                disabled={reformulating || !qText.trim()}
              >
                {reformulating ? <Loader2 className="h-3 w-3 animate-spin" /> : "✨"}
                {reformulating ? "A reformular..." : "Reformular para pt-BR"}
              </Button>
            </div>

            <textarea
              className="w-full text-xs bg-muted/30 border rounded-lg p-2.5 resize-none h-52 placeholder:text-muted-foreground/50 font-mono leading-relaxed"
              placeholder={qLang === "pt"
                ? "Escreva uma pergunta por linha, ex:\nHá quanto tempo você sente essa dor?\nA dor irradia para o braço ou a mão?\nQue medicação você está tomando?"
                : "One question per line, e.g.:\nHow long have you been experiencing this pain?\nDoes the pain radiate to your arm or hand?\nWhat medication are you currently taking?"}
              value={qText} onChange={e => setQText(e.target.value)}
            />
            <p className="text-[9px] text-muted-foreground">Cada linha = uma pergunta. O paciente responde no portal antes da consulta.</p>

            {qSentOk ? (
              <div className="flex items-center gap-2 text-xs text-emerald-400 font-medium">
                <CheckCircle2 className="h-4 w-4" />Perguntas enviadas! O paciente será notificado por email.
              </div>
            ) : (
              <Button className="w-full bg-blue-600 hover:bg-blue-700 h-9 text-xs" onClick={handleSendQuestions} disabled={sendingQ || !qText.trim()}>
                {sendingQ ? <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />A enviar…</> : <><Send className="h-3.5 w-3.5 mr-1.5" />Confirmar e Enviar ao Paciente</>}
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );

  // ── Pre-Assessment Chat ──
  if (view === "assess") return (
    <div className="flex flex-col h-full space-y-0">
      {/* Header */}
      <div className="flex items-center gap-2 pb-2 mb-2 border-b">
        <Button variant="ghost" size="sm" className="h-7 w-7 p-0 shrink-0" onClick={() => setView("list")}><ArrowLeft className="h-3.5 w-3.5" /></Button>
        <AtlasAvatar size="sm" />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold leading-tight">{ATLAS_NAME} — Pre-Assessment</p>
          <p className="text-[9px] text-muted-foreground">Answer Atlas's questions, then generate the full plan</p>
        </div>
      </div>

      {error && <div className="flex items-center gap-2 p-2 mb-2 bg-red-500/10 border border-red-500/30 rounded text-xs text-red-400"><AlertCircle className="h-3.5 w-3.5 shrink-0" />{error}</div>}

      {/* Chat messages */}
      <div className="flex-1 overflow-y-auto min-h-0 space-y-3 pb-2" style={{ maxHeight: "420px" }}>
        {preLoading && preChat.length === 0 && (
          <div className="flex items-start gap-2">
            <AtlasAvatar size="sm" />
            <div className="bg-muted/40 rounded-xl rounded-tl-none px-3 py-2">
              <Loader2 className="h-3.5 w-3.5 animate-spin text-emerald-400" />
            </div>
          </div>
        )}
        {preChat.map((m, i) => (
          <div key={i} className={`flex items-start gap-2 ${m.role === "user" ? "flex-row-reverse" : ""}`}>
            {m.role === "assistant" && <AtlasAvatar size="sm" />}
            <div className={`max-w-[88%] rounded-xl text-xs px-3 py-2 leading-relaxed whitespace-pre-wrap ${
              m.role === "user"
                ? "bg-emerald-600 text-white rounded-tr-none"
                : "bg-muted/40 text-foreground rounded-tl-none"
            }`}>{m.content}</div>
          </div>
        ))}
        {preLoading && preChat.length > 0 && (
          <div className="flex items-start gap-2">
            <AtlasAvatar size="sm" />
            <div className="bg-muted/40 rounded-xl rounded-tl-none px-3 py-2">
              <Loader2 className="h-3.5 w-3.5 animate-spin text-emerald-400" />
            </div>
          </div>
        )}
        <div ref={preEndRef} />
      </div>

      {/* Input */}
      <div className="flex gap-2 pt-2 border-t">
        <Input className="text-xs h-9 flex-1" placeholder="Reply to Atlas…"
          value={preInput} onChange={e => setPreInput(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendPreMessage(); } }}
          disabled={preLoading} />
        <Button size="sm" className="h-9 w-9 p-0 bg-emerald-600 hover:bg-emerald-700 shrink-0" onClick={sendPreMessage} disabled={preLoading || !preInput.trim()}>
          <Send className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* Generate CTA */}
      {preChat.length >= 2 && (
        <Button className="w-full mt-2 bg-emerald-600 hover:bg-emerald-700 text-xs h-9" onClick={handleGenerate} disabled={generating}>
          {generating
            ? <><Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" />Generating plan…</>
            : <><Brain className="h-3.5 w-3.5 mr-2" />Generate Full Rehab Plan from this discussion</>}
        </Button>
      )}
    </div>
  );

  // ── Plan View ──
  if (view === "plan" && plan) return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" className="h-7 w-7 p-0 shrink-0" onClick={() => { setActivePlan(null); setView("list"); loadPlans(); }}><ArrowLeft className="h-3.5 w-3.5" /></Button>
        <AtlasAvatar size="sm" />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold truncate">{activePlan.bodyPart} — {activePlan.chiefComplaint}</p>
          <p className="text-[9px] text-muted-foreground">{ATLAS_NAME} · {new Date(activePlan.createdAt).toLocaleDateString("en-GB")}</p>
        </div>
        <Badge variant="outline" className="text-[9px] border-emerald-500/30 text-emerald-400 shrink-0">{activePlan.status}</Badge>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {[{label:"Diagnosis Hypothesis",val:plan.diagnosisHypothesis,cols:"col-span-2"},{label:"Severity",val:plan.severity},{label:"Phase",val:plan.phase},{label:"Prognosis",val:plan.prognosis,cols:"col-span-2"},{label:"Return to Activity",val:plan.returnToActivityTimeline,cols:"col-span-2"}].map((item,i)=>(
          <div key={i} className={`${item.cols||""} p-2.5 bg-emerald-500/5 border border-emerald-500/20 rounded-lg`}>
            <p className="text-[9px] font-semibold text-emerald-400 uppercase mb-0.5">{item.label}</p>
            <p className="text-xs leading-snug">{item.val}</p>
          </div>
        ))}
      </div>

      {plan.differentialDiagnoses?.length > 0 && (
        <div className="p-2.5 bg-amber-500/5 border border-amber-500/20 rounded-lg">
          <p className="text-[9px] font-semibold text-amber-400 uppercase mb-1">Differential Diagnoses</p>
          <div className="flex flex-wrap gap-1">{plan.differentialDiagnoses.map((d:string,i:number)=><Badge key={i} variant="outline" className="text-[9px] border-amber-500/30 text-amber-400">{d}</Badge>)}</div>
        </div>
      )}

      {plan.redFlags?.length > 0 && (
        <div className="p-2.5 bg-red-500/5 border border-red-500/30 rounded-lg">
          <div className="flex items-center gap-1 mb-1"><TriangleAlert className="h-3 w-3 text-red-400" /><p className="text-[9px] font-semibold text-red-400 uppercase">Red Flags</p></div>
          <ul className="space-y-0.5">{plan.redFlags.map((f:string,i:number)=><li key={i} className="text-[10px] text-red-300 flex gap-1"><span>•</span><span>{f}</span></li>)}</ul>
        </div>
      )}

      <div className="space-y-1.5">
        <p className="text-xs font-semibold flex items-center gap-1"><ClipboardList className="h-3.5 w-3.5" />Rehabilitation Phases</p>
        {plan.phases?.map((phase: any, i: number) => (
          <details key={i} className="border rounded-lg" open={i === 0}>
            <summary className="p-3 text-xs font-medium cursor-pointer flex items-center justify-between list-none">
              <span className="flex items-center gap-2 min-w-0">
                <span className="w-5 h-5 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center text-[9px] font-bold shrink-0">{i+1}</span>
                <span className="truncate">{phase.phase}</span>
                <span className="text-muted-foreground text-[10px] shrink-0">({phase.duration})</span>
              </span>
              <ChevronDown className="h-3 w-3 text-muted-foreground shrink-0 ml-2" />
            </summary>
            <div className="px-3 pb-3 space-y-2.5">
              <div><p className="text-[9px] font-semibold text-muted-foreground uppercase mb-1">Goals</p>
                <ul className="space-y-0.5">{phase.goals?.map((g:string,j:number)=><li key={j} className="text-[10px] flex gap-1"><CheckCircle2 className="h-2.5 w-2.5 text-emerald-400 shrink-0 mt-0.5" /><span>{g}</span></li>)}</ul></div>
              <div><p className="text-[9px] font-semibold text-muted-foreground uppercase mb-1">BPR Treatments</p>
                <div className="flex flex-wrap gap-1">{phase.bprTreatments?.map((t:string,j:number)=><Badge key={j} variant="outline" className="text-[9px] border-emerald-500/30 text-emerald-400">{t}</Badge>)}</div></div>
              {phase.exercises?.length > 0 && (<div><p className="text-[9px] font-semibold text-muted-foreground uppercase mb-1">Exercises</p>
                <div className="space-y-1">{phase.exercises.map((ex:any,j:number)=>(
                  <div key={j} className="text-[10px] flex items-start gap-1.5 p-1.5 bg-muted/20 rounded">
                    <Activity className="h-2.5 w-2.5 text-blue-400 shrink-0 mt-0.5" />
                    <span><strong>{ex.name}</strong>{ex.sets&&` — ${ex.sets}`}{ex.reps&&` × ${ex.reps}`}{ex.frequency&&`, ${ex.frequency}`}{ex.notes&&<span className="text-muted-foreground"> ({ex.notes})</span>}</span>
                  </div>
                ))}</div></div>)}
              {phase.precautions?.length > 0 && (<div><p className="text-[9px] font-semibold text-amber-400 uppercase mb-1">Precautions</p>
                <ul className="space-y-0.5">{phase.precautions.map((p:string,j:number)=><li key={j} className="text-[10px] text-amber-300 flex gap-1"><span>⚠</span><span>{p}</span></li>)}</ul></div>)}
            </div>
          </details>
        ))}
      </div>

      {plan.references?.length > 0 && (
        <details className="border rounded-lg">
          <summary className="p-3 text-xs font-medium cursor-pointer flex items-center gap-2 list-none">
            <BookOpen className="h-3.5 w-3.5 text-blue-400 shrink-0" />References ({plan.references.length})
          </summary>
          <div className="px-3 pb-3"><ol className="space-y-1 list-decimal list-inside">{plan.references.map((ref:string,i:number)=><li key={i} className="text-[10px] text-muted-foreground">{ref}</li>)}</ol></div>
        </details>
      )}

      {/* ── Send to Patient ── */}
      <div className={`p-3 rounded-lg border-2 ${activePlan?.sentToPatient ? "border-emerald-500/40 bg-emerald-500/5" : "border-dashed border-muted-foreground/30"}`}>
        {activePlan?.sentToPatient ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                <p className="text-xs font-semibold text-emerald-400">Plano enviado ao paciente</p>
              </div>
              <span className="text-[9px] text-muted-foreground">{activePlan.sentAt ? new Date(activePlan.sentAt).toLocaleDateString("en-GB") : ""}</span>
            </div>
            {activePlan.therapistNote && (
              <p className="text-[10px] text-muted-foreground italic">Nota: {activePlan.therapistNote}</p>
            )}
            <Button variant="outline" size="sm" className="h-7 text-[10px] text-red-400 border-red-500/30 hover:bg-red-500/10" onClick={handleRevoke}>
              Retirar acesso ao paciente
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-xs font-semibold flex items-center gap-1.5">
              <Send className="h-3.5 w-3.5 text-emerald-400" />Enviar plano ao paciente
            </p>
            <p className="text-[10px] text-muted-foreground">O paciente verá o plano e os exercícios no app. Podes adicionar uma nota pessoal antes de enviar.</p>
            <textarea
              className="w-full text-[10px] bg-muted/30 border rounded-lg p-2 resize-none h-16 placeholder:text-muted-foreground/50"
              placeholder="Nota para o paciente (opcional)… ex: 'Lembra-te de fazer os exercícios pela manhã. Próxima sessão na 4ª feira.'"
              value={sendNote} onChange={e => setSendNote(e.target.value)}
            />
            <Button size="sm" className="w-full h-8 text-xs bg-emerald-600 hover:bg-emerald-700" onClick={handleSend} disabled={sending}>
              {sending ? <><Loader2 className="h-3 w-3 mr-1.5 animate-spin" />A enviar…</> : <><Send className="h-3 w-3 mr-1.5" />Confirmar e enviar ao paciente</>}
            </Button>
          </div>
        )}
      </div>

      {/* Atlas chat on plan */}
      <div className="border rounded-lg">
        <div className="p-2.5 border-b flex items-center gap-2">
          <AtlasAvatar size="sm" />
          <div>
            <p className="text-xs font-semibold leading-tight">{ATLAS_NAME}</p>
            <p className="text-[9px] text-muted-foreground leading-tight">Follow-up questions · Evidence-based answers</p>
          </div>
        </div>
        <div className="max-h-56 overflow-y-auto p-3 space-y-2">
          {(activePlan?.messages || []).map((m: any, i: number) => (
            <div key={i} className={`flex items-start gap-2 ${m.role === "user" ? "flex-row-reverse" : ""}`}>
              {m.role === "assistant" && <AtlasAvatar size="sm" />}
              <div className={`max-w-[88%] text-[10px] rounded-xl px-2.5 py-1.5 leading-relaxed whitespace-pre-wrap ${
                m.role === "user" ? "bg-emerald-600 text-white rounded-tr-none" : "bg-muted/40 rounded-tl-none"
              }`}>{m.content}</div>
            </div>
          ))}
          {chatLoading && <div className="flex items-start gap-2"><AtlasAvatar size="sm" /><div className="bg-muted/40 rounded-xl rounded-tl-none px-2.5 py-2"><Loader2 className="h-3 w-3 animate-spin" /></div></div>}
          <div ref={chatEndRef} />
        </div>
        <div className="p-2 border-t flex gap-2">
          <Input className="text-xs h-9 flex-1" placeholder="Ask Atlas about this plan…"
            value={chatMsg} onChange={e => setChatMsg(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleChat(); } }} />
          <Button size="sm" className="h-9 w-9 p-0 bg-emerald-600 hover:bg-emerald-700 shrink-0" onClick={handleChat} disabled={chatLoading || !chatMsg.trim()}>
            <Send className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );

  return null;
}
