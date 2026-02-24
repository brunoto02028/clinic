"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import {
  ClipboardList, User, AlertTriangle, Activity, Ruler,
  Brain, Target, Shield, Loader2, CheckCircle, ChevronRight,
  ChevronDown, Save, FileText, Stethoscope, Footprints,
  Search, Eye, Move, Dumbbell, Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/components/ui/use-toast";

// ─── UK Red Flags (CSP / NICE) ──────────────────────────────────
const RED_FLAGS = [
  { id: "cauda_equina", label: "Cauda equina signs (saddle anaesthesia, bladder/bowel dysfunction, bilateral leg symptoms)" },
  { id: "progressive_neuro", label: "Progressive neurological deficit (worsening weakness/numbness)" },
  { id: "unexplained_weight_loss", label: "Unexplained weight loss" },
  { id: "fever_night_sweats", label: "Fever / night sweats / feeling systemically unwell" },
  { id: "severe_night_pain", label: "Severe unrelenting night pain not eased by position" },
  { id: "constant_progressive", label: "Constant progressive pain unrelated to movement" },
  { id: "cancer_history_new_pain", label: "History of cancer with new bone/spinal pain" },
  { id: "recent_trauma", label: "Significant recent trauma (risk of fracture)" },
  { id: "osteoporosis_risk", label: "Age >55 with osteoporosis risk and new onset pain" },
  { id: "steroid_use", label: "Prolonged corticosteroid use" },
  { id: "iv_drug_use", label: "IV drug use / immunosuppression (infection risk)" },
  { id: "anticoagulant", label: "On anticoagulants with new symptoms" },
];

// ─── Yellow Flags (Psychosocial) ─────────────────────────────────
const YELLOW_FLAGS = [
  { id: "fear_avoidance", label: "Fear-avoidance behaviour / kinesiophobia" },
  { id: "catastrophising", label: "Catastrophising / negative beliefs about pain" },
  { id: "low_mood", label: "Low mood / anxiety / depression" },
  { id: "passive_coping", label: "Passive coping strategies / dependence on treatments" },
  { id: "work_issues", label: "Work-related issues / dissatisfaction / pending litigation" },
  { id: "social_isolation", label: "Social isolation / lack of support" },
  { id: "sleep_disturbance", label: "Significant sleep disturbance due to pain" },
  { id: "high_disability", label: "High perceived disability disproportionate to pathology" },
];

// ─── Oxford Muscle Strength Scale ────────────────────────────────
const OXFORD_SCALE = [
  { value: "0", label: "0 - No contraction" },
  { value: "1", label: "1 - Flicker/trace" },
  { value: "2", label: "2 - Active movement, gravity eliminated" },
  { value: "3", label: "3 - Active movement against gravity" },
  { value: "4", label: "4 - Active movement against resistance" },
  { value: "5", label: "5 - Normal strength" },
];

// ─── Postural Deviations ─────────────────────────────────────────
const POSTURAL_CHECKS = {
  anterior: [
    "Head tilt", "Shoulder level asymmetry", "Trunk lateral shift",
    "ASIS level asymmetry", "Knee valgus/varus", "Foot pronation/supination",
    "Rib flare asymmetry",
  ],
  posterior: [
    "Head position", "Scapular winging", "Scapular asymmetry",
    "Spinal alignment (scoliosis)", "Paraspinal muscle bulk asymmetry",
    "Gluteal fold asymmetry", "Popliteal crease level", "Calcaneal alignment",
  ],
  lateral: [
    "Forward head posture", "Cervical lordosis (increased/decreased)",
    "Thoracic kyphosis (increased/decreased)", "Lumbar lordosis (increased/decreased)",
    "Anterior pelvic tilt", "Posterior pelvic tilt", "Knee hyperextension",
    "Genu recurvatum",
  ],
};

// ─── Body Regions for ROM ────────────────────────────────────────
const BODY_REGIONS = [
  "Cervical Spine", "Thoracic Spine", "Lumbar Spine",
  "Shoulder (L)", "Shoulder (R)", "Elbow (L)", "Elbow (R)",
  "Wrist/Hand (L)", "Wrist/Hand (R)",
  "Hip (L)", "Hip (R)", "Knee (L)", "Knee (R)",
  "Ankle/Foot (L)", "Ankle/Foot (R)",
];

// ─── Special Tests by Region ─────────────────────────────────────
const SPECIAL_TESTS: Record<string, string[]> = {
  "Cervical Spine": ["Upper Limb Tension Test (ULTT)", "Spurling's Test", "Distraction Test", "Vertebral Artery Test", "Sharp-Purser Test"],
  "Lumbar Spine": ["Straight Leg Raise (SLR)", "Slump Test", "Femoral Nerve Stretch", "Prone Knee Bend", "Sacroiliac Joint Tests (Gaenslen's, FABER)"],
  "Shoulder": ["Neer's Test", "Hawkins-Kennedy", "Empty Can Test", "Apprehension Test", "Speed's Test", "O'Brien's Test", "Drop Arm Test"],
  "Knee": ["Anterior Drawer", "Lachman's Test", "Posterior Drawer", "McMurray's Test", "Thessaly Test", "Valgus/Varus Stress", "Patellar Apprehension"],
  "Hip": ["FABER/Patrick's Test", "FADIR Test", "Thomas Test", "Trendelenburg Test", "Ober's Test", "Log Roll Test"],
  "Ankle/Foot": ["Anterior Drawer (Ankle)", "Talar Tilt", "Thompson's Test", "Windlass Test", "Navicular Drop Test"],
};

// ─── Clinic Modalities ──────────────────────────────────────────
const CLINIC_MODALITIES = [
  "Kinesiotherapy", "Microcurrent (MENS)", "EMS (incl. Aussie/Russian)",
  "Therapeutic Ultrasound (1MHz)", "Therapeutic Ultrasound (3MHz)",
  "Laser Therapy / Photobiomodulation", "Manual Therapy - Soft Tissue",
  "Manual Therapy - Joint Mobilisation", "Exercise Therapy - Strengthening",
  "Exercise Therapy - Motor Control", "Postural Re-education",
  "Neuromuscular Re-education", "Infrared Thermography",
];

interface Patient {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

interface FormSection {
  id: string;
  title: string;
  icon: any;
  complete: boolean;
}

export default function ComprehensiveAssessment() {
  const { data: session } = useSession() || {};
  const { toast } = useToast();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [patientSearch, setPatientSearch] = useState("");
  const [activeTab, setActiveTab] = useState("subjective");
  const [saving, setSaving] = useState(false);
  const [mounted, setMounted] = useState(false);

  // ─── Form State ────────────────────────────────────────────────
  const [form, setForm] = useState({
    // Patient & Consent
    patientId: "",
    assessmentDate: new Date().toISOString().split("T")[0],
    consentObtained: false,
    consentDetails: "Verbal consent obtained. Assessment procedure, risks, and data handling explained. Patient confirmed understanding.",

    // Subjective
    presentingComplaint: "",
    bodyRegion: [] as string[],
    onsetDate: "",
    mechanism: "",
    symptomBehaviour24h: "",
    aggravatingFactors: "",
    easingFactors: "",
    painScoreNow: "",
    painScoreWorst: "",
    painScoreBest: "",
    nightPain: "no",
    pmh: "",
    drugHistory: "",
    socialHistory: "",
    patientGoals: "",

    // Red & Yellow Flags
    redFlags: [] as string[],
    redFlagNotes: "",
    yellowFlags: [] as string[],
    yellowFlagNotes: "",

    // Objective - Observation
    generalObservation: "",
    posturalFindings: {
      anterior: [] as string[],
      posterior: [] as string[],
      lateral: [] as string[],
      notes: "",
    },

    // Objective - ROM
    romFindings: [] as { region: string; movement: string; active: string; passive: string; pain: string; endFeel: string }[],

    // Objective - Strength
    strengthFindings: [] as { muscle: string; left: string; right: string; notes: string }[],

    // Neurological
    neuroSensation: "",
    neuroReflexes: "",
    neuroPower: "",
    neuroNotes: "",

    // Palpation
    palpationFindings: "",

    // Special Tests
    specialTests: [] as { test: string; result: string; notes: string }[],

    // Gait & Functional
    gaitAnalysis: "",
    functionalAssessment: "",
    balanceAssessment: "",

    // Biomechanical
    staticAlignment: "",
    dynamicMovement: "",
    biomechanicalNotes: "",

    // Assessment / Clinical Reasoning
    workingDiagnosis: "",
    differentialDiagnoses: "",
    problemList: "",
    icfBodyFunction: "",
    icfActivity: "",
    icfParticipation: "",
    contraindications: "",
    precautions: "",
    prognosis: "",

    // Plan
    shortTermGoals: "",
    longTermGoals: "",
    treatmentPlan: "",
    modalitiesPlanned: [] as string[],
    homeExerciseProgramme: "",
    frequencyDuration: "",
    outcomeMeasures: "",
    referralNeeds: "",
    dischargeCriteria: "",
    nextReview: "",
  });

  useEffect(() => {
    setMounted(true);
    fetchPatients();
  }, []);

  const fetchPatients = async () => {
    try {
      const res = await fetch("/api/patients");
      const data = await res.json();
      setPatients(data?.patients ?? []);
    } catch (e) {
      console.error("Failed to fetch patients:", e);
    }
  };

  // ─── Progress Tracking ─────────────────────────────────────────
  const sections: FormSection[] = [
    { id: "subjective", title: "Subjective", icon: User, complete: !!form.presentingComplaint && !!form.patientId },
    { id: "flags", title: "Red/Yellow Flags", icon: AlertTriangle, complete: true },
    { id: "observation", title: "Observation & Posture", icon: Eye, complete: !!form.generalObservation || form.posturalFindings.anterior.length > 0 },
    { id: "rom", title: "ROM & Strength", icon: Move, complete: form.romFindings.length > 0 || form.strengthFindings.length > 0 },
    { id: "neuro", title: "Neuro & Palpation", icon: Zap, complete: !!form.neuroNotes || !!form.palpationFindings },
    { id: "special", title: "Special Tests & Gait", icon: Stethoscope, complete: form.specialTests.length > 0 || !!form.gaitAnalysis },
    { id: "biomechanical", title: "Biomechanical", icon: Footprints, complete: !!form.staticAlignment || !!form.dynamicMovement },
    { id: "reasoning", title: "Clinical Reasoning", icon: Brain, complete: !!form.workingDiagnosis },
    { id: "plan", title: "Treatment Plan", icon: Target, complete: !!form.treatmentPlan && !!form.shortTermGoals },
    { id: "consent", title: "Consent & Sign-off", icon: Shield, complete: form.consentObtained },
  ];

  const completedCount = sections.filter(s => s.complete).length;
  const progressPercent = Math.round((completedCount / sections.length) * 100);

  const handleSave = async () => {
    if (!form.patientId) {
      toast({ title: "Error", description: "Please select a patient", variant: "destructive" });
      return;
    }
    if (!form.consentObtained) {
      toast({ title: "Error", description: "Consent must be obtained before saving", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      // Compile into SOAP format for storage while preserving full assessment
      const subjective = [
        `PRESENTING COMPLAINT: ${form.presentingComplaint}`,
        `BODY REGION: ${form.bodyRegion.join(", ")}`,
        `ONSET: ${form.onsetDate} | MECHANISM: ${form.mechanism}`,
        `24H PATTERN: ${form.symptomBehaviour24h}`,
        `AGGRAVATING: ${form.aggravatingFactors}`,
        `EASING: ${form.easingFactors}`,
        `PAIN (VAS): Now ${form.painScoreNow}/10 | Worst ${form.painScoreWorst}/10 | Best ${form.painScoreBest}/10 | Night pain: ${form.nightPain}`,
        `PMH: ${form.pmh}`,
        `DRUG HISTORY: ${form.drugHistory}`,
        `SOCIAL HISTORY: ${form.socialHistory}`,
        `PATIENT GOALS: ${form.patientGoals}`,
        form.redFlags.length > 0 ? `RED FLAGS: ${form.redFlags.join(", ")} — ${form.redFlagNotes}` : "RED FLAGS: None identified",
        form.yellowFlags.length > 0 ? `YELLOW FLAGS: ${form.yellowFlags.join(", ")} — ${form.yellowFlagNotes}` : "YELLOW FLAGS: None identified",
      ].filter(Boolean).join("\n\n");

      const objective = [
        `OBSERVATION: ${form.generalObservation}`,
        `POSTURE (Anterior): ${form.posturalFindings.anterior.join(", ") || "NAD"}`,
        `POSTURE (Posterior): ${form.posturalFindings.posterior.join(", ") || "NAD"}`,
        `POSTURE (Lateral): ${form.posturalFindings.lateral.join(", ") || "NAD"}`,
        form.posturalFindings.notes ? `POSTURE NOTES: ${form.posturalFindings.notes}` : "",
        form.romFindings.length > 0 ? `ROM:\n${form.romFindings.map(r => `  ${r.region} ${r.movement}: AROM ${r.active}° | PROM ${r.passive}° | Pain: ${r.pain} | End-feel: ${r.endFeel}`).join("\n")}` : "",
        form.strengthFindings.length > 0 ? `STRENGTH (Oxford Scale):\n${form.strengthFindings.map(s => `  ${s.muscle}: L=${s.left}/5 R=${s.right}/5 ${s.notes}`).join("\n")}` : "",
        `NEUROLOGICAL: Sensation: ${form.neuroSensation} | Reflexes: ${form.neuroReflexes} | Power: ${form.neuroPower}`,
        form.neuroNotes ? `NEURO NOTES: ${form.neuroNotes}` : "",
        `PALPATION: ${form.palpationFindings}`,
        form.specialTests.length > 0 ? `SPECIAL TESTS:\n${form.specialTests.map(t => `  ${t.test}: ${t.result} — ${t.notes}`).join("\n")}` : "",
        `GAIT: ${form.gaitAnalysis}`,
        `FUNCTIONAL: ${form.functionalAssessment}`,
        `BALANCE: ${form.balanceAssessment}`,
        `BIOMECHANICAL:\n  Static: ${form.staticAlignment}\n  Dynamic: ${form.dynamicMovement}\n  Notes: ${form.biomechanicalNotes}`,
      ].filter(Boolean).join("\n\n");

      const assessment = [
        `WORKING DIAGNOSIS: ${form.workingDiagnosis}`,
        `DIFFERENTIAL: ${form.differentialDiagnoses}`,
        `PROBLEM LIST: ${form.problemList}`,
        `ICF — Body Function: ${form.icfBodyFunction}`,
        `ICF — Activity: ${form.icfActivity}`,
        `ICF — Participation: ${form.icfParticipation}`,
        `CONTRAINDICATIONS: ${form.contraindications || "None identified"}`,
        `PRECAUTIONS: ${form.precautions || "None identified"}`,
        `PROGNOSIS: ${form.prognosis}`,
      ].filter(Boolean).join("\n\n");

      const plan = [
        `SHORT-TERM GOALS: ${form.shortTermGoals}`,
        `LONG-TERM GOALS: ${form.longTermGoals}`,
        `TREATMENT PLAN: ${form.treatmentPlan}`,
        `MODALITIES: ${form.modalitiesPlanned.join(", ")}`,
        `HOME EXERCISE PROGRAMME: ${form.homeExerciseProgramme}`,
        `FREQUENCY: ${form.frequencyDuration}`,
        `OUTCOME MEASURES: ${form.outcomeMeasures}`,
        `REFERRALS: ${form.referralNeeds || "None required"}`,
        `DISCHARGE CRITERIA: ${form.dischargeCriteria}`,
        `NEXT REVIEW: ${form.nextReview}`,
        `\nCONSENT: ${form.consentDetails}`,
        `Assessment date: ${form.assessmentDate}`,
      ].filter(Boolean).join("\n\n");

      const res = await fetch("/api/soap-notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ patientId: form.patientId, subjective, objective, assessment, plan }),
      });

      if (res.ok) {
        toast({ title: "Assessment Saved", description: "Comprehensive assessment has been documented successfully." });
      } else {
        const data = await res.json();
        toast({ title: "Error", description: data.error || "Failed to save assessment", variant: "destructive" });
      }
    } catch (e) {
      toast({ title: "Error", description: "Failed to save assessment", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  // Helper to add ROM entry
  const addRomEntry = () => {
    setForm(f => ({
      ...f,
      romFindings: [...f.romFindings, { region: "", movement: "", active: "", passive: "", pain: "None", endFeel: "" }],
    }));
  };

  // Helper to add strength entry
  const addStrengthEntry = () => {
    setForm(f => ({
      ...f,
      strengthFindings: [...f.strengthFindings, { muscle: "", left: "5", right: "5", notes: "" }],
    }));
  };

  // Helper to add special test
  const addSpecialTest = () => {
    setForm(f => ({
      ...f,
      specialTests: [...f.specialTests, { test: "", result: "Negative", notes: "" }],
    }));
  };

  return (
    <div className="space-y-6">
      {/* Header & Progress */}
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
            <ClipboardList className="h-6 w-6 text-primary" />
            Comprehensive Clinical Assessment
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            UK Standards — CSP / HCPC / NICE Compliant
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-sm font-medium">{completedCount}/{sections.length} sections</p>
            <Progress value={progressPercent} className="w-40 h-2" />
          </div>
          <Button onClick={handleSave} disabled={saving} className="gap-2">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save Assessment
          </Button>
        </div>
      </div>

      {/* Patient Selection */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Patient *</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search patient..." value={patientSearch} onChange={e => setPatientSearch(e.target.value)} className="pl-10" />
              </div>
              <Select value={form.patientId} onValueChange={v => setForm(f => ({ ...f, patientId: v }))}>
                <SelectTrigger><SelectValue placeholder="Select patient" /></SelectTrigger>
                <SelectContent className="max-h-[250px]">
                  {patients.filter(p => {
                    if (!patientSearch) return true;
                    const s = patientSearch.toLowerCase();
                    return `${p.firstName} ${p.lastName}`.toLowerCase().includes(s) || p.email.toLowerCase().includes(s);
                  }).map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.firstName} {p.lastName} ({p.email})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Assessment Date</Label>
              <Input type="date" value={form.assessmentDate} onChange={e => setForm(f => ({ ...f, assessmentDate: e.target.value }))} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Section Navigation */}
      <div className="flex flex-wrap gap-1">
        {sections.map(s => (
          <Button
            key={s.id}
            variant={activeTab === s.id ? "default" : "outline"}
            size="sm"
            className="gap-1.5 text-xs"
            onClick={() => setActiveTab(s.id)}
          >
            <s.icon className="h-3.5 w-3.5" />
            {s.title}
            {s.complete && <CheckCircle className="h-3 w-3 text-emerald-400" />}
          </Button>
        ))}
      </div>

      {/* ═══ SUBJECTIVE ═══ */}
      {activeTab === "subjective" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg text-primary flex items-center gap-2"><User className="h-5 w-5" /> Subjective Assessment</CardTitle>
            <CardDescription>Patient history, presenting complaint, symptom behaviour</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Presenting Complaint / Chief Complaint *</Label>
              <Textarea value={form.presentingComplaint} onChange={e => setForm(f => ({ ...f, presentingComplaint: e.target.value }))} placeholder="Patient reports..." rows={3} className="mt-1" />
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <Label>Body Region(s)</Label>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {["Cervical", "Thoracic", "Lumbar", "Shoulder", "Elbow", "Wrist/Hand", "Hip", "Knee", "Ankle/Foot", "Other"].map(r => (
                    <Badge key={r} variant={form.bodyRegion.includes(r) ? "default" : "outline"} className="cursor-pointer" onClick={() => {
                      setForm(f => ({
                        ...f,
                        bodyRegion: f.bodyRegion.includes(r) ? f.bodyRegion.filter(x => x !== r) : [...f.bodyRegion, r],
                      }));
                    }}>{r}</Badge>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Onset Date</Label>
                  <Input type="date" value={form.onsetDate} onChange={e => setForm(f => ({ ...f, onsetDate: e.target.value }))} className="mt-1" />
                </div>
                <div>
                  <Label>Mechanism</Label>
                  <Select value={form.mechanism} onValueChange={v => setForm(f => ({ ...f, mechanism: v }))}>
                    <SelectTrigger className="mt-1"><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sudden">Sudden onset</SelectItem>
                      <SelectItem value="gradual">Gradual onset</SelectItem>
                      <SelectItem value="trauma">Trauma / Injury</SelectItem>
                      <SelectItem value="overuse">Overuse / Repetitive</SelectItem>
                      <SelectItem value="post-surgical">Post-surgical</SelectItem>
                      <SelectItem value="unknown">Unknown</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            <div>
              <Label>24-Hour Symptom Behaviour</Label>
              <Textarea value={form.symptomBehaviour24h} onChange={e => setForm(f => ({ ...f, symptomBehaviour24h: e.target.value }))} placeholder="Morning stiffness duration, pattern throughout day, evening/night symptoms..." rows={2} className="mt-1" />
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <Label>Aggravating Factors</Label>
                <Textarea value={form.aggravatingFactors} onChange={e => setForm(f => ({ ...f, aggravatingFactors: e.target.value }))} placeholder="Activities/positions that worsen symptoms..." rows={2} className="mt-1" />
              </div>
              <div>
                <Label>Easing Factors</Label>
                <Textarea value={form.easingFactors} onChange={e => setForm(f => ({ ...f, easingFactors: e.target.value }))} placeholder="Activities/positions that relieve symptoms..." rows={2} className="mt-1" />
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <Label>Pain Now (VAS 0-10)</Label>
                <Input type="number" min="0" max="10" value={form.painScoreNow} onChange={e => setForm(f => ({ ...f, painScoreNow: e.target.value }))} className="mt-1" />
              </div>
              <div>
                <Label>Worst Pain</Label>
                <Input type="number" min="0" max="10" value={form.painScoreWorst} onChange={e => setForm(f => ({ ...f, painScoreWorst: e.target.value }))} className="mt-1" />
              </div>
              <div>
                <Label>Best Pain</Label>
                <Input type="number" min="0" max="10" value={form.painScoreBest} onChange={e => setForm(f => ({ ...f, painScoreBest: e.target.value }))} className="mt-1" />
              </div>
              <div>
                <Label>Night Pain</Label>
                <Select value={form.nightPain} onValueChange={v => setForm(f => ({ ...f, nightPain: v }))}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="no">No</SelectItem>
                    <SelectItem value="yes_wakes">Yes - wakes patient</SelectItem>
                    <SelectItem value="yes_difficulty">Yes - difficulty sleeping</SelectItem>
                    <SelectItem value="yes_constant">Yes - constant</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid sm:grid-cols-3 gap-4">
              <div>
                <Label>Past Medical History</Label>
                <Textarea value={form.pmh} onChange={e => setForm(f => ({ ...f, pmh: e.target.value }))} placeholder="Previous conditions, surgeries, injuries..." rows={3} className="mt-1" />
              </div>
              <div>
                <Label>Drug History / Medications</Label>
                <Textarea value={form.drugHistory} onChange={e => setForm(f => ({ ...f, drugHistory: e.target.value }))} placeholder="Current medications, doses..." rows={3} className="mt-1" />
              </div>
              <div>
                <Label>Social History</Label>
                <Textarea value={form.socialHistory} onChange={e => setForm(f => ({ ...f, socialHistory: e.target.value }))} placeholder="Occupation, activity level, hobbies, home setup..." rows={3} className="mt-1" />
              </div>
            </div>
            <div>
              <Label>Patient Goals</Label>
              <Textarea value={form.patientGoals} onChange={e => setForm(f => ({ ...f, patientGoals: e.target.value }))} placeholder="What does the patient want to achieve from treatment?" rows={2} className="mt-1" />
            </div>
          </CardContent>
        </Card>
      )}

      {/* ═══ RED & YELLOW FLAGS ═══ */}
      {activeTab === "flags" && (
        <div className="space-y-4">
          <Card className="border-red-200">
            <CardHeader>
              <CardTitle className="text-lg text-red-700 flex items-center gap-2"><AlertTriangle className="h-5 w-5" /> Red Flags Screening</CardTitle>
              <CardDescription>Urgent clinical indicators requiring immediate attention or referral</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {RED_FLAGS.map(flag => (
                <div key={flag.id} className="flex items-start gap-3">
                  <Checkbox
                    id={flag.id}
                    checked={form.redFlags.includes(flag.id)}
                    onCheckedChange={(checked) => {
                      setForm(f => ({
                        ...f,
                        redFlags: checked ? [...f.redFlags, flag.id] : f.redFlags.filter(x => x !== flag.id),
                      }));
                    }}
                  />
                  <Label htmlFor={flag.id} className="text-sm leading-tight cursor-pointer">{flag.label}</Label>
                </div>
              ))}
              {form.redFlags.length > 0 && (
                <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <Label className="text-red-700 font-semibold">Red Flag Notes / Actions Taken *</Label>
                  <Textarea value={form.redFlagNotes} onChange={e => setForm(f => ({ ...f, redFlagNotes: e.target.value }))} placeholder="Document actions: GP referral, urgent pathway, safety netting advice..." rows={2} className="mt-1" />
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-amber-200">
            <CardHeader>
              <CardTitle className="text-lg text-amber-700 flex items-center gap-2"><AlertTriangle className="h-5 w-5" /> Yellow Flags (Psychosocial)</CardTitle>
              <CardDescription>Psychosocial factors that may influence recovery</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {YELLOW_FLAGS.map(flag => (
                <div key={flag.id} className="flex items-start gap-3">
                  <Checkbox
                    id={flag.id}
                    checked={form.yellowFlags.includes(flag.id)}
                    onCheckedChange={(checked) => {
                      setForm(f => ({
                        ...f,
                        yellowFlags: checked ? [...f.yellowFlags, flag.id] : f.yellowFlags.filter(x => x !== flag.id),
                      }));
                    }}
                  />
                  <Label htmlFor={flag.id} className="text-sm leading-tight cursor-pointer">{flag.label}</Label>
                </div>
              ))}
              {form.yellowFlags.length > 0 && (
                <div className="mt-3">
                  <Label>Management Approach for Psychosocial Factors</Label>
                  <Textarea value={form.yellowFlagNotes} onChange={e => setForm(f => ({ ...f, yellowFlagNotes: e.target.value }))} placeholder="Graded exposure, education, goal setting, onward referral if needed..." rows={2} className="mt-1" />
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ═══ OBSERVATION & POSTURE ═══ */}
      {activeTab === "observation" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg text-primary flex items-center gap-2"><Eye className="h-5 w-5" /> Observation & Postural Assessment</CardTitle>
            <CardDescription>Static posture analysis from anterior, posterior, and lateral views</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>General Observation</Label>
              <Textarea value={form.generalObservation} onChange={e => setForm(f => ({ ...f, generalObservation: e.target.value }))} placeholder="Build, BMI estimation, skin condition, swelling, bruising, deformity, use of aids, demeanour..." rows={3} className="mt-1" />
            </div>
            {(["anterior", "posterior", "lateral"] as const).map(view => (
              <div key={view} className="space-y-2">
                <Label className="capitalize font-semibold">{view} View</Label>
                <div className="flex flex-wrap gap-1.5">
                  {POSTURAL_CHECKS[view].map(item => (
                    <Badge
                      key={item}
                      variant={form.posturalFindings[view].includes(item) ? "destructive" : "outline"}
                      className="cursor-pointer text-xs"
                      onClick={() => {
                        setForm(f => ({
                          ...f,
                          posturalFindings: {
                            ...f.posturalFindings,
                            [view]: f.posturalFindings[view].includes(item)
                              ? f.posturalFindings[view].filter(x => x !== item)
                              : [...f.posturalFindings[view], item],
                          },
                        }));
                      }}
                    >{item}</Badge>
                  ))}
                </div>
              </div>
            ))}
            <div>
              <Label>Postural Assessment Notes</Label>
              <Textarea value={form.posturalFindings.notes} onChange={e => setForm(f => ({ ...f, posturalFindings: { ...f.posturalFindings, notes: e.target.value } }))} placeholder="Additional postural observations, compensatory patterns..." rows={2} className="mt-1" />
            </div>
          </CardContent>
        </Card>
      )}

      {/* ═══ ROM & STRENGTH ═══ */}
      {activeTab === "rom" && (
        <div className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg text-primary flex items-center gap-2"><Move className="h-5 w-5" /> Range of Motion</CardTitle>
                <CardDescription>Active & passive ROM with pain and end-feel</CardDescription>
              </div>
              <Button size="sm" onClick={addRomEntry} className="gap-1"><span className="text-lg leading-none">+</span> Add</Button>
            </CardHeader>
            <CardContent>
              {form.romFindings.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No ROM entries yet. Click &quot;Add&quot; to begin.</p>
              ) : (
                <div className="space-y-3">
                  {form.romFindings.map((entry, i) => (
                    <div key={i} className="grid grid-cols-6 gap-2 items-end p-3 bg-muted/50 rounded-lg">
                      <div>
                        <Label className="text-xs">Region</Label>
                        <Select value={entry.region} onValueChange={v => { const arr = [...form.romFindings]; arr[i].region = v; setForm(f => ({ ...f, romFindings: arr })); }}>
                          <SelectTrigger className="text-xs h-8"><SelectValue placeholder="Region" /></SelectTrigger>
                          <SelectContent>{BODY_REGIONS.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-xs">Movement</Label>
                        <Input className="h-8 text-xs" placeholder="e.g. Flexion" value={entry.movement} onChange={e => { const arr = [...form.romFindings]; arr[i].movement = e.target.value; setForm(f => ({ ...f, romFindings: arr })); }} />
                      </div>
                      <div>
                        <Label className="text-xs">AROM (°)</Label>
                        <Input className="h-8 text-xs" placeholder="e.g. 120" value={entry.active} onChange={e => { const arr = [...form.romFindings]; arr[i].active = e.target.value; setForm(f => ({ ...f, romFindings: arr })); }} />
                      </div>
                      <div>
                        <Label className="text-xs">PROM (°)</Label>
                        <Input className="h-8 text-xs" placeholder="e.g. 130" value={entry.passive} onChange={e => { const arr = [...form.romFindings]; arr[i].passive = e.target.value; setForm(f => ({ ...f, romFindings: arr })); }} />
                      </div>
                      <div>
                        <Label className="text-xs">Pain</Label>
                        <Select value={entry.pain} onValueChange={v => { const arr = [...form.romFindings]; arr[i].pain = v; setForm(f => ({ ...f, romFindings: arr })); }}>
                          <SelectTrigger className="text-xs h-8"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="None">None</SelectItem>
                            <SelectItem value="Mild">Mild</SelectItem>
                            <SelectItem value="Moderate">Moderate</SelectItem>
                            <SelectItem value="Severe">Severe</SelectItem>
                            <SelectItem value="Arc">Painful arc</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-xs">End-feel</Label>
                        <Select value={entry.endFeel} onValueChange={v => { const arr = [...form.romFindings]; arr[i].endFeel = v; setForm(f => ({ ...f, romFindings: arr })); }}>
                          <SelectTrigger className="text-xs h-8"><SelectValue placeholder="Select" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Firm">Firm (capsular)</SelectItem>
                            <SelectItem value="Hard">Hard (bone)</SelectItem>
                            <SelectItem value="Soft">Soft (tissue)</SelectItem>
                            <SelectItem value="Empty">Empty (pain)</SelectItem>
                            <SelectItem value="Springy">Springy block</SelectItem>
                            <SelectItem value="Spasm">Muscle spasm</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg text-primary flex items-center gap-2"><Dumbbell className="h-5 w-5" /> Muscle Strength (Oxford Scale)</CardTitle>
                <CardDescription>Manual muscle testing 0-5</CardDescription>
              </div>
              <Button size="sm" onClick={addStrengthEntry} className="gap-1"><span className="text-lg leading-none">+</span> Add</Button>
            </CardHeader>
            <CardContent>
              {form.strengthFindings.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No strength entries yet. Click &quot;Add&quot; to begin.</p>
              ) : (
                <div className="space-y-2">
                  {form.strengthFindings.map((entry, i) => (
                    <div key={i} className="grid grid-cols-4 gap-2 items-end p-3 bg-muted/50 rounded-lg">
                      <div>
                        <Label className="text-xs">Muscle/Group</Label>
                        <Input className="h-8 text-xs" placeholder="e.g. Quadriceps" value={entry.muscle} onChange={e => { const arr = [...form.strengthFindings]; arr[i].muscle = e.target.value; setForm(f => ({ ...f, strengthFindings: arr })); }} />
                      </div>
                      <div>
                        <Label className="text-xs">Left</Label>
                        <Select value={entry.left} onValueChange={v => { const arr = [...form.strengthFindings]; arr[i].left = v; setForm(f => ({ ...f, strengthFindings: arr })); }}>
                          <SelectTrigger className="text-xs h-8"><SelectValue /></SelectTrigger>
                          <SelectContent>{OXFORD_SCALE.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-xs">Right</Label>
                        <Select value={entry.right} onValueChange={v => { const arr = [...form.strengthFindings]; arr[i].right = v; setForm(f => ({ ...f, strengthFindings: arr })); }}>
                          <SelectTrigger className="text-xs h-8"><SelectValue /></SelectTrigger>
                          <SelectContent>{OXFORD_SCALE.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-xs">Notes</Label>
                        <Input className="h-8 text-xs" placeholder="Pain, fatigue..." value={entry.notes} onChange={e => { const arr = [...form.strengthFindings]; arr[i].notes = e.target.value; setForm(f => ({ ...f, strengthFindings: arr })); }} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ═══ NEURO & PALPATION ═══ */}
      {activeTab === "neuro" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg text-primary flex items-center gap-2"><Zap className="h-5 w-5" /> Neurological Screening & Palpation</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid sm:grid-cols-3 gap-4">
              <div>
                <Label>Sensation</Label>
                <Textarea value={form.neuroSensation} onChange={e => setForm(f => ({ ...f, neuroSensation: e.target.value }))} placeholder="Light touch, pin prick, dermatome testing..." rows={3} className="mt-1" />
              </div>
              <div>
                <Label>Reflexes</Label>
                <Textarea value={form.neuroReflexes} onChange={e => setForm(f => ({ ...f, neuroReflexes: e.target.value }))} placeholder="Biceps, triceps, patellar, achilles — normal/brisk/absent..." rows={3} className="mt-1" />
              </div>
              <div>
                <Label>Power (Myotomes)</Label>
                <Textarea value={form.neuroPower} onChange={e => setForm(f => ({ ...f, neuroPower: e.target.value }))} placeholder="C5-T1, L2-S1 myotome testing..." rows={3} className="mt-1" />
              </div>
            </div>
            <div>
              <Label>Neurological Notes</Label>
              <Textarea value={form.neuroNotes} onChange={e => setForm(f => ({ ...f, neuroNotes: e.target.value }))} placeholder="Upper/lower motor neuron signs, coordination, proprioception..." rows={2} className="mt-1" />
            </div>
            <div>
              <Label>Palpation Findings</Label>
              <Textarea value={form.palpationFindings} onChange={e => setForm(f => ({ ...f, palpationFindings: e.target.value }))} placeholder="Tenderness location, muscle tone/spasm, tissue texture, temperature, swelling, trigger points..." rows={4} className="mt-1" />
            </div>
          </CardContent>
        </Card>
      )}

      {/* ═══ SPECIAL TESTS & GAIT ═══ */}
      {activeTab === "special" && (
        <div className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg text-primary flex items-center gap-2"><Stethoscope className="h-5 w-5" /> Special Tests</CardTitle>
                <CardDescription>Orthopaedic and clinical special tests</CardDescription>
              </div>
              <Button size="sm" onClick={addSpecialTest} className="gap-1"><span className="text-lg leading-none">+</span> Add</Button>
            </CardHeader>
            <CardContent>
              <div className="mb-3 text-xs text-muted-foreground">
                <strong>Common tests by region:</strong>{" "}
                {Object.entries(SPECIAL_TESTS).map(([region, tests]) => (
                  <span key={region}><strong>{region}:</strong> {tests.join(", ")}. </span>
                ))}
              </div>
              {form.specialTests.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No special tests recorded. Click &quot;Add&quot; to begin.</p>
              ) : (
                <div className="space-y-2">
                  {form.specialTests.map((test, i) => (
                    <div key={i} className="grid grid-cols-3 gap-2 items-end p-3 bg-muted/50 rounded-lg">
                      <div>
                        <Label className="text-xs">Test Name</Label>
                        <Input className="h-8 text-xs" placeholder="e.g. Lachman's Test" value={test.test} onChange={e => { const arr = [...form.specialTests]; arr[i].test = e.target.value; setForm(f => ({ ...f, specialTests: arr })); }} />
                      </div>
                      <div>
                        <Label className="text-xs">Result</Label>
                        <Select value={test.result} onValueChange={v => { const arr = [...form.specialTests]; arr[i].result = v; setForm(f => ({ ...f, specialTests: arr })); }}>
                          <SelectTrigger className="text-xs h-8"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Positive">Positive (+)</SelectItem>
                            <SelectItem value="Negative">Negative (−)</SelectItem>
                            <SelectItem value="Equivocal">Equivocal (?)</SelectItem>
                            <SelectItem value="Not tested">Not tested</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-xs">Notes</Label>
                        <Input className="h-8 text-xs" placeholder="Pain reproduction, apprehension..." value={test.notes} onChange={e => { const arr = [...form.specialTests]; arr[i].notes = e.target.value; setForm(f => ({ ...f, specialTests: arr })); }} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg text-primary flex items-center gap-2"><Activity className="h-5 w-5" /> Gait & Functional Assessment</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Gait Analysis</Label>
                <Textarea value={form.gaitAnalysis} onChange={e => setForm(f => ({ ...f, gaitAnalysis: e.target.value }))} placeholder="Gait pattern, cadence, stride length, arm swing, Trendelenburg sign, antalgic gait, use of aids..." rows={3} className="mt-1" />
              </div>
              <div>
                <Label>Functional Assessment</Label>
                <Textarea value={form.functionalAssessment} onChange={e => setForm(f => ({ ...f, functionalAssessment: e.target.value }))} placeholder="Sit-to-stand, stairs, reaching, lifting, sport-specific tasks..." rows={3} className="mt-1" />
              </div>
              <div>
                <Label>Balance & Proprioception</Label>
                <Textarea value={form.balanceAssessment} onChange={e => setForm(f => ({ ...f, balanceAssessment: e.target.value }))} placeholder="Single leg stance (eyes open/closed), tandem walk, star excursion, Berg Balance Scale..." rows={2} className="mt-1" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ═══ BIOMECHANICAL ═══ */}
      {activeTab === "biomechanical" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg text-primary flex items-center gap-2"><Footprints className="h-5 w-5" /> Biomechanical Assessment</CardTitle>
            <CardDescription>Static alignment, dynamic movement patterns, kinetic chain analysis</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Static Alignment</Label>
              <Textarea value={form.staticAlignment} onChange={e => setForm(f => ({ ...f, staticAlignment: e.target.value }))} placeholder="Lower limb alignment (Q-angle, tibial torsion, foot posture index), pelvic alignment, spinal curves..." rows={3} className="mt-1" />
            </div>
            <div>
              <Label>Dynamic Movement Patterns</Label>
              <Textarea value={form.dynamicMovement} onChange={e => setForm(f => ({ ...f, dynamicMovement: e.target.value }))} placeholder="Squat pattern, lunge, single-leg squat, overhead reach, functional movement screen findings..." rows={3} className="mt-1" />
            </div>
            <div>
              <Label>Biomechanical Notes</Label>
              <Textarea value={form.biomechanicalNotes} onChange={e => setForm(f => ({ ...f, biomechanicalNotes: e.target.value }))} placeholder="Kinetic chain relationships, compensatory patterns, load transfer issues, footwear assessment..." rows={3} className="mt-1" />
            </div>
          </CardContent>
        </Card>
      )}

      {/* ═══ CLINICAL REASONING ═══ */}
      {activeTab === "reasoning" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg text-primary flex items-center gap-2"><Brain className="h-5 w-5" /> Clinical Reasoning & Assessment</CardTitle>
            <CardDescription>ICF framework, working diagnosis, contraindications</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <Label>Working Diagnosis / Clinical Impression *</Label>
                <Textarea value={form.workingDiagnosis} onChange={e => setForm(f => ({ ...f, workingDiagnosis: e.target.value }))} placeholder="Primary clinical hypothesis..." rows={2} className="mt-1" />
              </div>
              <div>
                <Label>Differential Diagnoses</Label>
                <Textarea value={form.differentialDiagnoses} onChange={e => setForm(f => ({ ...f, differentialDiagnoses: e.target.value }))} placeholder="Alternative diagnoses to consider..." rows={2} className="mt-1" />
              </div>
            </div>
            <div>
              <Label>Problem List</Label>
              <Textarea value={form.problemList} onChange={e => setForm(f => ({ ...f, problemList: e.target.value }))} placeholder="1. Pain\n2. Reduced ROM\n3. Muscle weakness\n4. Functional limitation" rows={3} className="mt-1" />
            </div>
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg space-y-3">
              <p className="text-sm font-semibold text-blue-800">ICF Framework (WHO)</p>
              <div>
                <Label className="text-blue-700 text-xs">Body Structure & Function</Label>
                <Textarea value={form.icfBodyFunction} onChange={e => setForm(f => ({ ...f, icfBodyFunction: e.target.value }))} placeholder="Impairments: pain, ROM restriction, weakness, inflammation..." rows={2} className="mt-1" />
              </div>
              <div>
                <Label className="text-blue-700 text-xs">Activity Limitations</Label>
                <Textarea value={form.icfActivity} onChange={e => setForm(f => ({ ...f, icfActivity: e.target.value }))} placeholder="Difficulty with: walking, stairs, lifting, dressing..." rows={2} className="mt-1" />
              </div>
              <div>
                <Label className="text-blue-700 text-xs">Participation Restrictions</Label>
                <Textarea value={form.icfParticipation} onChange={e => setForm(f => ({ ...f, icfParticipation: e.target.value }))} placeholder="Impact on: work, sport, social life, hobbies, sleep..." rows={2} className="mt-1" />
              </div>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <Label>Contraindications</Label>
                <Textarea value={form.contraindications} onChange={e => setForm(f => ({ ...f, contraindications: e.target.value }))} placeholder="Absolute or relative contraindications to treatment..." rows={2} className="mt-1" />
              </div>
              <div>
                <Label>Precautions</Label>
                <Textarea value={form.precautions} onChange={e => setForm(f => ({ ...f, precautions: e.target.value }))} placeholder="Treatment modifications required..." rows={2} className="mt-1" />
              </div>
            </div>
            <div>
              <Label>Prognosis</Label>
              <Textarea value={form.prognosis} onChange={e => setForm(f => ({ ...f, prognosis: e.target.value }))} placeholder="Expected recovery timeline, factors influencing prognosis..." rows={2} className="mt-1" />
            </div>
          </CardContent>
        </Card>
      )}

      {/* ═══ TREATMENT PLAN ═══ */}
      {activeTab === "plan" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg text-primary flex items-center gap-2"><Target className="h-5 w-5" /> Treatment Plan</CardTitle>
            <CardDescription>SMART goals, modalities, HEP, outcome measures</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <Label>Short-Term Goals (2-4 weeks) *</Label>
                <Textarea value={form.shortTermGoals} onChange={e => setForm(f => ({ ...f, shortTermGoals: e.target.value }))} placeholder="SMART goals: Specific, Measurable, Achievable, Relevant, Time-bound..." rows={3} className="mt-1" />
              </div>
              <div>
                <Label>Long-Term Goals (6-12 weeks)</Label>
                <Textarea value={form.longTermGoals} onChange={e => setForm(f => ({ ...f, longTermGoals: e.target.value }))} placeholder="Functional outcome goals, return to activity/work/sport..." rows={3} className="mt-1" />
              </div>
            </div>
            <div>
              <Label>Treatment Plan *</Label>
              <Textarea value={form.treatmentPlan} onChange={e => setForm(f => ({ ...f, treatmentPlan: e.target.value }))} placeholder="Detailed treatment approach, techniques to be used, progression criteria..." rows={3} className="mt-1" />
            </div>
            <div>
              <Label>Modalities Planned</Label>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {CLINIC_MODALITIES.map(m => (
                  <Badge
                    key={m}
                    variant={form.modalitiesPlanned.includes(m) ? "default" : "outline"}
                    className="cursor-pointer text-xs"
                    onClick={() => {
                      setForm(f => ({
                        ...f,
                        modalitiesPlanned: f.modalitiesPlanned.includes(m) ? f.modalitiesPlanned.filter(x => x !== m) : [...f.modalitiesPlanned, m],
                      }));
                    }}
                  >{m}</Badge>
                ))}
              </div>
            </div>
            <div>
              <Label>Home Exercise Programme (HEP)</Label>
              <Textarea value={form.homeExerciseProgramme} onChange={e => setForm(f => ({ ...f, homeExerciseProgramme: e.target.value }))} placeholder="Exercises, sets, reps, frequency, progressions, precautions..." rows={3} className="mt-1" />
            </div>
            <div className="grid sm:grid-cols-3 gap-4">
              <div>
                <Label>Frequency & Duration</Label>
                <Input value={form.frequencyDuration} onChange={e => setForm(f => ({ ...f, frequencyDuration: e.target.value }))} placeholder="e.g. 2x/week for 6 weeks" className="mt-1" />
              </div>
              <div>
                <Label>Outcome Measures</Label>
                <Input value={form.outcomeMeasures} onChange={e => setForm(f => ({ ...f, outcomeMeasures: e.target.value }))} placeholder="e.g. VAS, DASH, KOOS, ODI" className="mt-1" />
              </div>
              <div>
                <Label>Next Review Date</Label>
                <Input type="date" value={form.nextReview} onChange={e => setForm(f => ({ ...f, nextReview: e.target.value }))} className="mt-1" />
              </div>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <Label>Referral Needs</Label>
                <Textarea value={form.referralNeeds} onChange={e => setForm(f => ({ ...f, referralNeeds: e.target.value }))} placeholder="GP, consultant, imaging, psychology, other..." rows={2} className="mt-1" />
              </div>
              <div>
                <Label>Discharge Criteria</Label>
                <Textarea value={form.dischargeCriteria} onChange={e => setForm(f => ({ ...f, dischargeCriteria: e.target.value }))} placeholder="Goals met, functional benchmarks, self-management achieved..." rows={2} className="mt-1" />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ═══ CONSENT & SIGN-OFF ═══ */}
      {activeTab === "consent" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg text-primary flex items-center gap-2"><Shield className="h-5 w-5" /> Informed Consent & Sign-off</CardTitle>
            <CardDescription>HCPC requirement — documented informed consent</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-muted/50 rounded-lg space-y-3">
              <div className="flex items-start gap-3">
                <Checkbox
                  id="consent"
                  checked={form.consentObtained}
                  onCheckedChange={(checked) => setForm(f => ({ ...f, consentObtained: !!checked }))}
                />
                <Label htmlFor="consent" className="font-semibold cursor-pointer">
                  I confirm that informed consent has been obtained from the patient for this assessment and any proposed treatment.
                </Label>
              </div>
              <div className="text-xs text-muted-foreground space-y-1 ml-7">
                <p>The following must have been explained to the patient:</p>
                <ul className="list-disc ml-4 space-y-0.5">
                  <li>Nature and purpose of the assessment</li>
                  <li>Proposed treatment options and alternatives</li>
                  <li>Expected benefits and potential risks</li>
                  <li>Right to withdraw consent at any time</li>
                  <li>How their data will be stored and used (UK GDPR)</li>
                </ul>
              </div>
            </div>
            <div>
              <Label>Consent Details / Notes</Label>
              <Textarea value={form.consentDetails} onChange={e => setForm(f => ({ ...f, consentDetails: e.target.value }))} rows={3} className="mt-1" />
            </div>
            <div className="p-3 border rounded-lg text-sm text-muted-foreground">
              <p><strong>Assessor:</strong> {(session?.user as any)?.firstName} {(session?.user as any)?.lastName}</p>
              <p><strong>Date:</strong> {form.assessmentDate}</p>
              <p><strong>Role:</strong> {(session?.user as any)?.role}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Save Button (bottom) */}
      <div className="flex justify-end gap-3 pt-4 border-t">
        <Button variant="outline" onClick={() => setActiveTab(sections[Math.max(0, sections.findIndex(s => s.id === activeTab) - 1)]?.id || "subjective")}>
          Previous Section
        </Button>
        {activeTab !== "consent" ? (
          <Button onClick={() => setActiveTab(sections[Math.min(sections.length - 1, sections.findIndex(s => s.id === activeTab) + 1)]?.id || "consent")}>
            Next Section <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        ) : (
          <Button onClick={handleSave} disabled={saving} className="gap-2">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
            Save Complete Assessment
          </Button>
        )}
      </div>
    </div>
  );
}
