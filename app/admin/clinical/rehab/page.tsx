"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Bot, Plus, ArrowLeft, Loader2, AlertCircle, CheckCircle2, Send, Brain,
  BookOpen, TriangleAlert, ClipboardList, ChevronDown, ChevronRight,
  Activity, Search, User, Calendar,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

export default function RehabAgentPage() {
  const [view, setView] = useState<"list" | "new" | "plan">("list");
  const [recentPlans, setRecentPlans] = useState<any[]>([]);
  const [patients, setPatients] = useState<any[]>([]);
  const [patientSearch, setPatientSearch] = useState("");
  const [selectedPatient, setSelectedPatient] = useState<any>(null);
  const [activePlan, setActivePlan] = useState<any>(null);
  const [generating, setGenerating] = useState(false);
  const [chatMsg, setChatMsg] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [error, setError] = useState("");
  const chatEndRef = useRef<HTMLDivElement>(null);

  const [form, setForm] = useState({
    chiefComplaint: "",
    bodyPart: "",
    severity: "moderate",
    phase: "subacute",
    age: "",
    sex: "",
    occupation: "",
    activityLevel: "",
    duration: "",
    mechanism: "",
    aggravatingFactors: "",
    relievingFactors: "",
    previousTreatment: "",
    relevantHistory: "",
    assessmentFindings: "",
    additionalNotes: "",
  });

  // Load recent plans across all patients
  const loadRecent = useCallback(async () => {
    const r = await fetch("/api/admin/rehab-plans/recent");
    if (r.ok) setRecentPlans(await r.json());
  }, []);

  useEffect(() => { loadRecent(); }, [loadRecent]);
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [activePlan?.messages]);

  // Search patients
  useEffect(() => {
    if (patientSearch.length < 2) { setPatients([]); return; }
    const t = setTimeout(async () => {
      const r = await fetch(`/api/admin/patients?search=${encodeURIComponent(patientSearch)}&limit=8`);
      if (r.ok) {
        const d = await r.json();
        setPatients(d.patients || d || []);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [patientSearch]);

  const handleGenerate = async () => {
    if (!selectedPatient) { setError("Select a patient first."); return; }
    if (!form.chiefComplaint || !form.bodyPart) { setError("Chief complaint and body part are required."); return; }
    setGenerating(true); setError("");
    try {
      const r = await fetch(`/api/admin/patients/${selectedPatient.id}/rehab-plan`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, age: form.age ? Number(form.age) : undefined }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      const pr = await fetch(`/api/admin/patients/${selectedPatient.id}/rehab-plan/${d.plan.id}`);
      setActivePlan({ ...(await pr.json()), patientName: `${selectedPatient.firstName} ${selectedPatient.lastName}` });
      setView("plan");
      loadRecent();
    } catch (e: any) { setError(e.message); }
    finally { setGenerating(false); }
  };

  const loadPlan = async (patientId: string, planId: string, patientName?: string) => {
    const r = await fetch(`/api/admin/patients/${patientId}/rehab-plan/${planId}`);
    const d = await r.json();
    setActivePlan({ ...d, patientName });
    setView("plan");
  };

  const handleChat = async () => {
    if (!chatMsg.trim() || !activePlan) return;
    const msg = chatMsg; setChatMsg(""); setChatLoading(true);
    setActivePlan((p: any) => ({ ...p, messages: [...(p.messages || []), { role: "user", content: msg }] }));
    try {
      const r = await fetch(`/api/admin/patients/${activePlan.patientId}/rehab-plan/${activePlan.id}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: msg }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      setActivePlan((p: any) => ({ ...p, messages: [...(p.messages || []), { role: "assistant", content: d.reply }] }));
    } catch (e: any) { setError(e.message); }
    finally { setChatLoading(false); }
  };

  const plan: any = activePlan?.planJson;

  // ── List View ──
  if (view === "list") return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-emerald-400" />
            <h1 className="text-lg font-semibold">Clinical Rehab Agent</h1>
            <Badge variant="outline" className="text-[9px] border-emerald-500/30 text-emerald-400">Claude Sonnet 5</Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">Evidence-based rehabilitation planning · PubMed · NICE · Cochrane</p>
        </div>
        <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={() => setView("new")}>
          <Plus className="h-4 w-4 mr-1.5" />New Analysis
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "50 Conditions covered", sub: "Shoulder to foot, acute to chronic" },
          { label: "Evidence-only references", sub: "PubMed · NICE · Cochrane · BJSM" },
          { label: "BPR-specific plans", sub: "MLS Laser, MENS, dry needling & more" },
        ].map((s, i) => (
          <div key={i} className="p-3 bg-emerald-500/5 border border-emerald-500/20 rounded-lg">
            <p className="text-xs font-semibold text-emerald-400">{s.label}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">{s.sub}</p>
          </div>
        ))}
      </div>

      {/* Recent plans */}
      <div>
        <p className="text-xs font-semibold mb-2 text-muted-foreground uppercase">Recent Plans</p>
        {recentPlans.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground border border-dashed rounded-lg">
            <Bot className="h-8 w-8 mx-auto mb-2 opacity-20" />
            <p className="text-xs">No plans generated yet.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {recentPlans.map((p: any) => (
              <div key={p.id} className="flex items-center justify-between p-3 bg-muted/20 border rounded-lg hover:bg-muted/30 cursor-pointer"
                onClick={() => loadPlan(p.patientId, p.id, p.patient?.name)}>
                <div className="flex items-center gap-3 min-w-0">
                  <User className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs font-medium truncate">{p.patient?.name || "Patient"} — {p.bodyPart}</p>
                    <p className="text-[10px] text-muted-foreground truncate">{p.chiefComplaint}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <Badge variant="outline" className="text-[8px] h-3.5">{p.severity}</Badge>
                      <Badge variant="outline" className="text-[8px] h-3.5">{p.phase}</Badge>
                      <span className="text-[9px] text-muted-foreground">{new Date(p.createdAt).toLocaleDateString("en-GB")}</span>
                    </div>
                  </div>
                </div>
                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0 ml-2" />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  // ── New Plan Form ──
  if (view === "new") return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto space-y-4">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => setView("list")}><ArrowLeft className="h-4 w-4" /></Button>
        <h1 className="text-base font-semibold">New Rehab Analysis</h1>
      </div>

      {error && <div className="flex items-center gap-2 p-2 bg-red-500/10 border border-red-500/30 rounded text-xs text-red-400"><AlertCircle className="h-3.5 w-3.5" />{error}</div>}

      {/* Patient selector */}
      <div className="space-y-1.5">
        <Label className="text-xs font-semibold">Patient *</Label>
        {selectedPatient ? (
          <div className="flex items-center justify-between p-2.5 bg-emerald-500/5 border border-emerald-500/30 rounded-lg">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-emerald-400" />
              <span className="text-sm font-medium">{selectedPatient.firstName} {selectedPatient.lastName}</span>
              <span className="text-xs text-muted-foreground">{selectedPatient.email}</span>
            </div>
            <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={() => setSelectedPatient(null)}>Change</Button>
          </div>
        ) : (
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input className="pl-8 text-xs h-9" placeholder="Search patient by name or email…"
              value={patientSearch} onChange={e => setPatientSearch(e.target.value)} />
            {patients.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-popover border rounded-lg shadow-lg z-20 max-h-48 overflow-y-auto">
                {patients.map((p: any) => (
                  <button key={p.id} className="w-full text-left flex items-center gap-2 px-3 py-2 hover:bg-muted/30 text-xs"
                    onClick={() => { setSelectedPatient(p); setPatientSearch(""); setPatients([]);
                      if (p.profile?.dateOfBirth) setForm(f => ({ ...f, age: String(new Date().getFullYear() - new Date(p.profile.dateOfBirth).getFullYear()) }));
                      if (p.profile?.gender) setForm(f => ({ ...f, sex: p.profile.gender }));
                    }}>
                    <User className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="font-medium">{p.firstName} {p.lastName}</span>
                    <span className="text-muted-foreground">{p.email}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Clinical form */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="sm:col-span-2 space-y-1"><Label className="text-xs">Chief Complaint *</Label>
          <Textarea rows={2} className="text-xs" placeholder="e.g. Sharp knee pain on running, started 3 weeks ago after twisting…" value={form.chiefComplaint} onChange={e => setForm(f => ({ ...f, chiefComplaint: e.target.value }))} /></div>
        <div className="space-y-1"><Label className="text-xs">Body Part *</Label>
          <Input className="text-xs h-8" placeholder="e.g. Left knee, Right shoulder" value={form.bodyPart} onChange={e => setForm(f => ({ ...f, bodyPart: e.target.value }))} /></div>
        <div className="space-y-1"><Label className="text-xs">Duration</Label>
          <Input className="text-xs h-8" placeholder="e.g. 3 weeks, 6 months" value={form.duration} onChange={e => setForm(f => ({ ...f, duration: e.target.value }))} /></div>
        <div className="space-y-1"><Label className="text-xs">Severity</Label>
          <select className="w-full h-8 text-xs border rounded-md bg-background px-2" value={form.severity} onChange={e => setForm(f => ({ ...f, severity: e.target.value }))}>
            <option value="mild">Mild</option><option value="moderate">Moderate</option><option value="severe">Severe</option></select></div>
        <div className="space-y-1"><Label className="text-xs">Phase</Label>
          <select className="w-full h-8 text-xs border rounded-md bg-background px-2" value={form.phase} onChange={e => setForm(f => ({ ...f, phase: e.target.value }))}>
            <option value="acute">Acute (0–2 weeks)</option><option value="subacute">Subacute (2–12 weeks)</option><option value="chronic">Chronic (12+ weeks)</option></select></div>
        <div className="space-y-1"><Label className="text-xs">Mechanism of Injury</Label>
          <Input className="text-xs h-8" placeholder="e.g. Twisting, fall, overuse" value={form.mechanism} onChange={e => setForm(f => ({ ...f, mechanism: e.target.value }))} /></div>
        <div className="space-y-1"><Label className="text-xs">Activity Level</Label>
          <select className="w-full h-8 text-xs border rounded-md bg-background px-2" value={form.activityLevel} onChange={e => setForm(f => ({ ...f, activityLevel: e.target.value }))}>
            <option value="">Select…</option><option value="sedentary">Sedentary</option><option value="light">Light active</option>
            <option value="moderate">Moderately active</option><option value="active">Active</option><option value="athlete">Athlete</option></select></div>
        <div className="sm:col-span-2 space-y-1"><Label className="text-xs">Aggravating Factors</Label>
          <Input className="text-xs h-8" placeholder="e.g. Stairs, prolonged sitting, overhead activity" value={form.aggravatingFactors} onChange={e => setForm(f => ({ ...f, aggravatingFactors: e.target.value }))} /></div>
        <div className="sm:col-span-2 space-y-1"><Label className="text-xs">Relieving Factors</Label>
          <Input className="text-xs h-8" placeholder="e.g. Rest, ice, elevation" value={form.relievingFactors} onChange={e => setForm(f => ({ ...f, relievingFactors: e.target.value }))} /></div>
        <div className="sm:col-span-2 space-y-1"><Label className="text-xs">Relevant History / Comorbidities</Label>
          <Textarea rows={2} className="text-xs" placeholder="Previous injuries, surgeries, diabetes, medications…" value={form.relevantHistory} onChange={e => setForm(f => ({ ...f, relevantHistory: e.target.value }))} /></div>
        <div className="sm:col-span-2 space-y-1"><Label className="text-xs">Assessment Findings</Label>
          <Textarea rows={2} className="text-xs" placeholder="ROM, strength tests, special tests, body assessment results…" value={form.assessmentFindings} onChange={e => setForm(f => ({ ...f, assessmentFindings: e.target.value }))} /></div>
        <div className="sm:col-span-2 space-y-1"><Label className="text-xs">Additional Notes</Label>
          <Textarea rows={2} className="text-xs" placeholder="Anything else relevant…" value={form.additionalNotes} onChange={e => setForm(f => ({ ...f, additionalNotes: e.target.value }))} /></div>
      </div>
      <Button className="w-full bg-emerald-600 hover:bg-emerald-700" size="lg" onClick={handleGenerate} disabled={generating}>
        {generating ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Analysing with Claude Sonnet 5…</> : <><Bot className="h-4 w-4 mr-2" />Generate Evidence-Based Rehab Plan</>}
      </Button>
      <p className="text-[10px] text-muted-foreground text-center">References from PubMed · NICE Guidelines · Cochrane Reviews · BJSM · JOSPT</p>
    </div>
  );

  // ── Plan View ──
  if (view === "plan" && plan) return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-4">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => { setActivePlan(null); setView("list"); loadRecent(); }}><ArrowLeft className="h-4 w-4" /></Button>
        <div>
          <h1 className="text-base font-semibold">{activePlan.bodyPart} — {activePlan.chiefComplaint}</h1>
          {activePlan.patientName && <p className="text-xs text-muted-foreground">{activePlan.patientName}</p>}
        </div>
        <Badge variant="outline" className="ml-auto text-[9px] border-emerald-500/30 text-emerald-400">{activePlan.status}</Badge>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {[{l:"Diagnosis",v:plan.diagnosisHypothesis,c:"sm:col-span-2"},{l:"Severity",v:plan.severity},{l:"Phase",v:plan.phase},{l:"Prognosis",v:plan.prognosis,c:"sm:col-span-2"},{l:"Return to Activity",v:plan.returnToActivityTimeline,c:"sm:col-span-2"}].map((item,i)=>(
          <div key={i} className={`${item.c||""} p-2.5 bg-emerald-500/5 border border-emerald-500/20 rounded-lg`}>
            <p className="text-[9px] font-semibold text-emerald-400 uppercase mb-0.5">{item.l}</p>
            <p className="text-xs">{item.v}</p>
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
          <ul className="space-y-0.5">{plan.redFlags.map((f:string,i:number)=><li key={i} className="text-[10px] text-red-300 flex gap-1"><span>•</span>{f}</li>)}</ul>
        </div>
      )}

      <div className="space-y-2">
        <p className="text-xs font-semibold flex items-center gap-1"><ClipboardList className="h-3.5 w-3.5" />Rehabilitation Phases</p>
        {plan.phases?.map((phase:any,i:number)=>(
          <details key={i} className="border rounded-lg" open={i===0}>
            <summary className="p-3 text-xs font-medium cursor-pointer flex items-center justify-between list-none">
              <span className="flex items-center gap-2">
                <span className="w-5 h-5 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center text-[9px] font-bold shrink-0">{i+1}</span>
                {phase.phase} <span className="text-muted-foreground text-[10px]">({phase.duration})</span>
              </span>
              <ChevronDown className="h-3 w-3 text-muted-foreground" />
            </summary>
            <div className="px-3 pb-3 space-y-2.5">
              <div><p className="text-[9px] font-semibold text-muted-foreground uppercase mb-1">Goals</p>
                <ul className="space-y-0.5">{phase.goals?.map((g:string,j:number)=><li key={j} className="text-[10px] flex gap-1"><CheckCircle2 className="h-2.5 w-2.5 text-emerald-400 shrink-0 mt-0.5"/>{g}</li>)}</ul></div>
              <div><p className="text-[9px] font-semibold text-muted-foreground uppercase mb-1">BPR Treatments</p>
                <div className="flex flex-wrap gap-1">{phase.bprTreatments?.map((t:string,j:number)=><Badge key={j} variant="outline" className="text-[9px] border-emerald-500/30 text-emerald-400">{t}</Badge>)}</div></div>
              {phase.exercises?.length>0&&(<div><p className="text-[9px] font-semibold text-muted-foreground uppercase mb-1">Exercises</p>
                <div className="space-y-1">{phase.exercises.map((ex:any,j:number)=>(
                  <div key={j} className="text-[10px] flex items-start gap-1.5 p-1.5 bg-muted/20 rounded">
                    <Activity className="h-2.5 w-2.5 text-blue-400 shrink-0 mt-0.5"/>
                    <span><strong>{ex.name}</strong>{ex.sets&&` — ${ex.sets}`}{ex.reps&&` × ${ex.reps}`}{ex.frequency&&`, ${ex.frequency}`}{ex.notes&&<span className="text-muted-foreground"> ({ex.notes})</span>}</span>
                  </div>
                ))}</div></div>)}
              {phase.precautions?.length>0&&(<div><p className="text-[9px] font-semibold text-amber-400 uppercase mb-1">Precautions</p>
                <ul className="space-y-0.5">{phase.precautions.map((p:string,j:number)=><li key={j} className="text-[10px] text-amber-300 flex gap-1"><span>⚠</span>{p}</li>)}</ul></div>)}
            </div>
          </details>
        ))}
      </div>

      {plan.references?.length>0&&(
        <details className="border rounded-lg">
          <summary className="p-3 text-xs font-medium cursor-pointer flex items-center gap-2 list-none">
            <BookOpen className="h-3.5 w-3.5 text-blue-400"/>References ({plan.references.length})
          </summary>
          <div className="px-3 pb-3">
            <ol className="space-y-1 list-decimal list-inside">{plan.references.map((ref:string,i:number)=><li key={i} className="text-[10px] text-muted-foreground">{ref}</li>)}</ol>
          </div>
        </details>
      )}

      <div className="border rounded-lg">
        <div className="p-3 border-b flex items-center gap-2">
          <Brain className="h-3.5 w-3.5 text-emerald-400"/>
          <p className="text-xs font-semibold">Ask the Rehab Agent</p>
          <span className="text-[9px] text-muted-foreground">All answers backed by peer-reviewed evidence</span>
        </div>
        <div className="max-h-72 overflow-y-auto p-3 space-y-2">
          {(activePlan?.messages||[]).map((m:any,i:number)=>(
            <div key={i} className={`flex ${m.role==="user"?"justify-end":"justify-start"}`}>
              <div className={`max-w-[85%] rounded-lg px-3 py-2 text-xs ${m.role==="user"?"bg-emerald-600 text-white":"bg-muted/40 text-foreground"}`}>{m.content}</div>
            </div>
          ))}
          {chatLoading&&<div className="flex justify-start"><div className="bg-muted/40 rounded-lg px-3 py-2"><Loader2 className="h-3 w-3 animate-spin"/></div></div>}
          <div ref={chatEndRef}/>
        </div>
        <div className="p-2 border-t flex gap-2">
          <Input className="text-xs h-9 flex-1" placeholder="e.g. What exercises are safe in week 1? Can I use MLS Laser daily?" value={chatMsg}
            onChange={e=>setChatMsg(e.target.value)}
            onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();handleChat();}}}/>
          <Button size="sm" className="h-9 w-9 p-0 bg-emerald-600 hover:bg-emerald-700" onClick={handleChat} disabled={chatLoading||!chatMsg.trim()}>
            <Send className="h-4 w-4"/>
          </Button>
        </div>
      </div>
    </div>
  );

  return null;
}
