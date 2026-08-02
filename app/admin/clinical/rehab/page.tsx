"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  Plus, ArrowLeft, Loader2, AlertCircle, CheckCircle2, Send, Brain,
  BookOpen, TriangleAlert, ClipboardList, ChevronDown, ChevronRight,
  Activity, Search, User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

const ATLAS_AVATAR = "https://randomuser.me/api/portraits/men/52.jpg";
const ATLAS_NAME   = "Atlas";
const ATLAS_TITLE  = "Clinical Rehabilitation Specialist";

function AtlasAvatar({ size = "sm" }: { size?: "sm" | "md" | "lg" }) {
  const sz = size === "lg" ? "w-16 h-16" : size === "md" ? "w-10 h-10" : "w-7 h-7";
  return (
    <img src={ATLAS_AVATAR} alt={ATLAS_NAME}
      className={`${sz} rounded-full object-cover ring-2 ring-emerald-500/30 shrink-0`}
      onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
  );
}

export default function RehabAgentPage() {
  const [view, setView]             = useState<"list" | "assess" | "plan">("list");
  const [recentPlans, setRecentPlans] = useState<any[]>([]);
  const [patients, setPatients]     = useState<any[]>([]);
  const [patientSearch, setPatientSearch] = useState("");
  const [selectedPatient, setSelectedPatient] = useState<any>(null);
  const [activePlan, setActivePlan] = useState<any>(null);

  // Pre-assessment
  const [preChat, setPreChat]       = useState<Array<{ role: "user" | "assistant"; content: string }>>([]);
  const [preInput, setPreInput]     = useState("");
  const [preLoading, setPreLoading] = useState(false);
  const [preStarted, setPreStarted] = useState(false);
  const [generating, setGenerating] = useState(false);

  // Plan chat
  const [chatMsg, setChatMsg]       = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [error, setError]           = useState("");

  const preEndRef  = useRef<HTMLDivElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Load recent plans across all patients
  const loadRecent = useCallback(async () => {
    const r = await fetch("/api/admin/rehab-plans/recent");
    if (r.ok) setRecentPlans(await r.json());
  }, []);

  useEffect(() => { loadRecent(); }, [loadRecent]);
  useEffect(() => { preEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [preChat]);
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [activePlan?.messages]);

  useEffect(() => {
    if (patientSearch.length < 2) { setPatients([]); return; }
    const t = setTimeout(async () => {
      const r = await fetch(`/api/admin/patients?search=${encodeURIComponent(patientSearch)}&limit=8`);
      if (r.ok) { const d = await r.json(); setPatients(d.patients || d || []); }
    }, 300);
    return () => clearTimeout(t);
  }, [patientSearch]);

  const startAssessment = async () => {
    if (!selectedPatient) { setError("Select a patient first."); return; }
    setError(""); setView("assess");
    if (preStarted) return;
    setPreStarted(true); setPreLoading(true);
    try {
      const r = await fetch(`/api/admin/patients/${selectedPatient.id}/rehab-plan/pre-assess`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: [] }),
      });
      const d = await r.json();
      setPreChat([{ role: "assistant", content: d.reply }]);
    } catch { setPreChat([{ role: "assistant", content: "Connection error. Please retry." }]); }
    finally { setPreLoading(false); }
  };

  const sendPreMessage = async () => {
    if (!preInput.trim() || preLoading || !selectedPatient) return;
    const msg = preInput.trim(); setPreInput("");
    const next = [...preChat, { role: "user" as const, content: msg }];
    setPreChat(next); setPreLoading(true);
    try {
      const r = await fetch(`/api/admin/patients/${selectedPatient.id}/rehab-plan/pre-assess`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next }),
      });
      const d = await r.json();
      setPreChat(prev => [...prev, { role: "assistant", content: d.reply }]);
    } catch { setPreChat(prev => [...prev, { role: "assistant", content: "Error — please retry." }]); }
    finally { setPreLoading(false); }
  };

  const handleGenerate = async () => {
    if (!selectedPatient) return;
    setGenerating(true); setError("");
    try {
      const r = await fetch(`/api/admin/patients/${selectedPatient.id}/rehab-plan`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chiefComplaint: "See pre-assessment chat", bodyPart: "See pre-assessment chat", preAssessChat: preChat }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      const pr = await fetch(`/api/admin/patients/${selectedPatient.id}/rehab-plan/${d.plan.id}`);
      setActivePlan({ ...(await pr.json()), patientName: `${selectedPatient.firstName} ${selectedPatient.lastName}` });
      setView("plan"); loadRecent();
    } catch (e: any) { setError(e.message); }
    finally { setGenerating(false); }
  };

  const loadPlan = async (patientId: string, planId: string, patientName?: string) => {
    const r = await fetch(`/api/admin/patients/${patientId}/rehab-plan/${planId}`);
    setActivePlan({ ...(await r.json()), patientName }); setView("plan");
  };

  const handleChat = async () => {
    if (!chatMsg.trim() || !activePlan) return;
    const msg = chatMsg; setChatMsg(""); setChatLoading(true);
    setActivePlan((p: any) => ({ ...p, messages: [...(p.messages || []), { role: "user", content: msg }] }));
    try {
      const r = await fetch(`/api/admin/patients/${activePlan.patientId}/rehab-plan/${activePlan.id}/chat`, {
        method: "POST", headers: { "Content-Type": "application/json" },
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
      {/* Atlas hero */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <AtlasAvatar size="lg" />
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-semibold">{ATLAS_NAME}</h1>
              <Badge variant="outline" className="text-[9px] border-emerald-500/30 text-emerald-400">Claude Sonnet 5</Badge>
            </div>
            <p className="text-xs text-muted-foreground">{ATLAS_TITLE} · BPR Internal</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">Knee · Ankle · Hip · Shoulder · Spine · Muscle</p>
          </div>
        </div>
      </div>

      {/* Specialties */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {[
          { label: "Knee Specialist", sub: "ACL · Meniscus · PFPS · Tendinopathy · OA" },
          { label: "Ankle & Foot", sub: "Sprain · Achilles · Plantar Fascia · PTTD" },
          { label: "Hip Specialist", sub: "FAI · Labral · GTPS · Hamstring Origin" },
          { label: "Shoulder Specialist", sub: "Rotator Cuff · SLAP · Frozen · Instability" },
          { label: "Spine Specialist", sub: "Lumbar · Cervical · Thoracic · SIJ · WAD" },
          { label: "Muscle Injuries", sub: "Grade I–III · Hamstring · Gastrocnemius · Adductor" },
        ].map((s, i) => (
          <div key={i} className="p-2.5 bg-emerald-500/5 border border-emerald-500/20 rounded-lg">
            <p className="text-[10px] font-semibold text-emerald-400">{s.label}</p>
            <p className="text-[9px] text-muted-foreground mt-0.5">{s.sub}</p>
          </div>
        ))}
      </div>

      {/* Patient selector + start */}
      <div className="space-y-2">
        <p className="text-xs font-semibold text-muted-foreground uppercase">Start New Pre-Assessment</p>
        {selectedPatient ? (
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
            <div className="flex items-center gap-2 p-2.5 bg-emerald-500/5 border border-emerald-500/30 rounded-lg flex-1 min-w-0">
              <User className="h-4 w-4 text-emerald-400 shrink-0" />
              <span className="text-sm font-medium truncate">{selectedPatient.firstName} {selectedPatient.lastName}</span>
              <span className="text-xs text-muted-foreground truncate hidden sm:block">{selectedPatient.email}</span>
              <Button variant="ghost" size="sm" className="h-6 text-xs ml-auto shrink-0" onClick={() => { setSelectedPatient(null); setPreChat([]); setPreStarted(false); }}>Change</Button>
            </div>
            <Button className="bg-emerald-600 hover:bg-emerald-700 shrink-0 w-full sm:w-auto" onClick={startAssessment}>
              <Plus className="h-4 w-4 mr-1.5" />Start with {ATLAS_NAME}
            </Button>
          </div>
        ) : (
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input className="pl-8 text-xs h-9" placeholder="Search patient by name or email…"
              value={patientSearch} onChange={e => setPatientSearch(e.target.value)} />
            {patients.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-popover border rounded-lg shadow-lg z-20 max-h-48 overflow-y-auto">
                {patients.map((p: any) => (
                  <button key={p.id} className="w-full text-left flex items-center gap-2 px-3 py-2.5 hover:bg-muted/30 text-xs"
                    onClick={() => { setSelectedPatient(p); setPatientSearch(""); setPatients([]); }}>
                    <User className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <span className="font-medium">{p.firstName} {p.lastName}</span>
                    <span className="text-muted-foreground truncate">{p.email}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
        {error && <div className="flex items-center gap-2 p-2 bg-red-500/10 border border-red-500/30 rounded text-xs text-red-400"><AlertCircle className="h-3.5 w-3.5" />{error}</div>}
      </div>

      {/* Recent plans */}
      <div>
        <p className="text-xs font-semibold mb-2 text-muted-foreground uppercase">Recent Plans</p>
        {recentPlans.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground border border-dashed rounded-lg">
            <AtlasAvatar size="md" />
            <p className="text-xs mt-2">No plans generated yet.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {recentPlans.map((p: any) => (
              <div key={p.id} className="flex items-center justify-between p-3 bg-muted/20 border rounded-lg hover:bg-muted/30 cursor-pointer active:opacity-70 transition-opacity"
                onClick={() => loadPlan(p.patientId, p.id, p.patient?.name)}>
                <div className="flex items-center gap-3 min-w-0">
                  <User className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs font-medium truncate">{p.patient?.name || "Patient"} — {p.bodyPart}</p>
                    <p className="text-[10px] text-muted-foreground truncate">{p.chiefComplaint}</p>
                    <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
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

  // ── Pre-Assessment Chat ──
  if (view === "assess") return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto flex flex-col" style={{ minHeight: "calc(100vh - 120px)" }}>
      <div className="flex items-center gap-2 pb-3 mb-3 border-b shrink-0">
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 shrink-0" onClick={() => setView("list")}><ArrowLeft className="h-4 w-4" /></Button>
        <AtlasAvatar size="md" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold">{ATLAS_NAME} — Pre-Assessment</p>
          <p className="text-[10px] text-muted-foreground">
            {selectedPatient ? `${selectedPatient.firstName} ${selectedPatient.lastName}` : ""} · Answer Atlas's questions, then generate the full plan
          </p>
        </div>
      </div>

      {error && <div className="flex items-center gap-2 p-2 mb-3 bg-red-500/10 border border-red-500/30 rounded text-xs text-red-400 shrink-0"><AlertCircle className="h-3.5 w-3.5 shrink-0" />{error}</div>}

      <div className="flex-1 overflow-y-auto space-y-3 pb-3" style={{ maxHeight: "calc(100vh - 320px)", minHeight: "300px" }}>
        {preLoading && preChat.length === 0 && (
          <div className="flex items-start gap-2">
            <AtlasAvatar size="sm" />
            <div className="bg-muted/40 rounded-xl rounded-tl-none px-3 py-2"><Loader2 className="h-4 w-4 animate-spin text-emerald-400" /></div>
          </div>
        )}
        {preChat.map((m, i) => (
          <div key={i} className={`flex items-start gap-2.5 ${m.role === "user" ? "flex-row-reverse" : ""}`}>
            {m.role === "assistant" && <AtlasAvatar size="sm" />}
            <div className={`max-w-[88%] rounded-xl text-xs px-3 py-2.5 leading-relaxed whitespace-pre-wrap ${
              m.role === "user" ? "bg-emerald-600 text-white rounded-tr-none" : "bg-muted/40 text-foreground rounded-tl-none"
            }`}>{m.content}</div>
          </div>
        ))}
        {preLoading && preChat.length > 0 && (
          <div className="flex items-start gap-2"><AtlasAvatar size="sm" />
            <div className="bg-muted/40 rounded-xl rounded-tl-none px-3 py-2"><Loader2 className="h-4 w-4 animate-spin text-emerald-400" /></div>
          </div>
        )}
        <div ref={preEndRef} />
      </div>

      <div className="flex gap-2 pt-3 border-t shrink-0">
        <Input className="text-xs h-10 flex-1" placeholder="Reply to Atlas…"
          value={preInput} onChange={e => setPreInput(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendPreMessage(); } }}
          disabled={preLoading} />
        <Button size="sm" className="h-10 w-10 p-0 bg-emerald-600 hover:bg-emerald-700 shrink-0" onClick={sendPreMessage} disabled={preLoading || !preInput.trim()}>
          <Send className="h-4 w-4" />
        </Button>
      </div>

      {preChat.length >= 2 && (
        <Button className="w-full mt-3 bg-emerald-600 hover:bg-emerald-700 shrink-0" onClick={handleGenerate} disabled={generating}>
          {generating ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Generating plan…</> : <><Brain className="h-4 w-4 mr-2" />Generate Full Rehab Plan from this discussion</>}
        </Button>
      )}
    </div>
  );

  // ── Plan View ──
  if (view === "plan" && plan) return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-4">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 shrink-0" onClick={() => { setActivePlan(null); setView("list"); loadRecent(); }}><ArrowLeft className="h-4 w-4" /></Button>
        <AtlasAvatar size="sm" />
        <div className="flex-1 min-w-0">
          <h1 className="text-sm font-semibold truncate">{activePlan.bodyPart} — {activePlan.chiefComplaint}</h1>
          <p className="text-[10px] text-muted-foreground">{activePlan.patientName || ""} · {ATLAS_NAME} · {new Date(activePlan.createdAt).toLocaleDateString("en-GB")}</p>
        </div>
        <Badge variant="outline" className="text-[9px] border-emerald-500/30 text-emerald-400 shrink-0">{activePlan.status}</Badge>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {[{l:"Diagnosis Hypothesis",v:plan.diagnosisHypothesis,c:"col-span-2"},{l:"Severity",v:plan.severity},{l:"Phase",v:plan.phase},{l:"Prognosis",v:plan.prognosis,c:"col-span-2"},{l:"Return to Activity",v:plan.returnToActivityTimeline,c:"col-span-2"}].map((item,i)=>(
          <div key={i} className={`${item.c||""} p-2.5 bg-emerald-500/5 border border-emerald-500/20 rounded-lg`}>
            <p className="text-[9px] font-semibold text-emerald-400 uppercase mb-0.5">{item.l}</p>
            <p className="text-xs leading-snug">{item.v}</p>
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
        {plan.phases?.map((phase:any,i:number)=>(
          <details key={i} className="border rounded-lg" open={i===0}>
            <summary className="p-3 text-xs font-medium cursor-pointer flex items-center justify-between list-none">
              <span className="flex items-center gap-2 min-w-0">
                <span className="w-5 h-5 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center text-[9px] font-bold shrink-0">{i+1}</span>
                <span className="truncate">{phase.phase}</span><span className="text-muted-foreground text-[10px] shrink-0">({phase.duration})</span>
              </span>
              <ChevronDown className="h-3 w-3 text-muted-foreground shrink-0 ml-2" />
            </summary>
            <div className="px-3 pb-3 space-y-2.5">
              <div><p className="text-[9px] font-semibold text-muted-foreground uppercase mb-1">Goals</p>
                <ul className="space-y-0.5">{phase.goals?.map((g:string,j:number)=><li key={j} className="text-[10px] flex gap-1"><CheckCircle2 className="h-2.5 w-2.5 text-emerald-400 shrink-0 mt-0.5"/><span>{g}</span></li>)}</ul></div>
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
                <ul className="space-y-0.5">{phase.precautions.map((p:string,j:number)=><li key={j} className="text-[10px] text-amber-300 flex gap-1"><span>⚠</span><span>{p}</span></li>)}</ul></div>)}
            </div>
          </details>
        ))}
      </div>

      {plan.references?.length>0&&(
        <details className="border rounded-lg">
          <summary className="p-3 text-xs font-medium cursor-pointer flex items-center gap-2 list-none">
            <BookOpen className="h-3.5 w-3.5 text-blue-400 shrink-0"/>References ({plan.references.length})
          </summary>
          <div className="px-3 pb-3"><ol className="space-y-1 list-decimal list-inside">{plan.references.map((ref:string,i:number)=><li key={i} className="text-[10px] text-muted-foreground">{ref}</li>)}</ol></div>
        </details>
      )}

      <div className="border rounded-lg">
        <div className="p-2.5 border-b flex items-center gap-2">
          <AtlasAvatar size="sm" />
          <div>
            <p className="text-xs font-semibold leading-tight">{ATLAS_NAME}</p>
            <p className="text-[9px] text-muted-foreground">Follow-up · Evidence-based answers</p>
          </div>
        </div>
        <div className="max-h-72 overflow-y-auto p-3 space-y-2">
          {(activePlan?.messages||[]).map((m:any,i:number)=>(
            <div key={i} className={`flex items-start gap-2 ${m.role==="user"?"flex-row-reverse":""}`}>
              {m.role==="assistant"&&<AtlasAvatar size="sm"/>}
              <div className={`max-w-[88%] rounded-xl px-3 py-2 text-xs leading-relaxed whitespace-pre-wrap ${m.role==="user"?"bg-emerald-600 text-white rounded-tr-none":"bg-muted/40 rounded-tl-none"}`}>{m.content}</div>
            </div>
          ))}
          {chatLoading&&<div className="flex items-start gap-2"><AtlasAvatar size="sm"/><div className="bg-muted/40 rounded-xl rounded-tl-none px-3 py-2"><Loader2 className="h-3 w-3 animate-spin"/></div></div>}
          <div ref={chatEndRef}/>
        </div>
        <div className="p-2 border-t flex gap-2">
          <Input className="text-xs h-9 flex-1" placeholder="Ask Atlas about this plan…" value={chatMsg}
            onChange={e=>setChatMsg(e.target.value)}
            onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();handleChat();}}}/>
          <Button size="sm" className="h-9 w-9 p-0 bg-emerald-600 hover:bg-emerald-700 shrink-0" onClick={handleChat} disabled={chatLoading||!chatMsg.trim()}>
            <Send className="h-4 w-4"/>
          </Button>
        </div>
      </div>
    </div>
  );

  return null;
}
