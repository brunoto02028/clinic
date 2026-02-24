"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, Save, Loader2, Sparkles, Send, ExternalLink, Eye, EyeOff,
  Zap, Dumbbell, Footprints, ScanLine, Waves, CircleDot, Activity, Heart,
  Syringe, Users, Brain, Flame, Shield, Target, Stethoscope, HeartPulse, Bone,
  Plus, Trash2, X, Menu,
  Hand, Ear, Sparkles as SparklesIcon, Sun, Wind, Droplets, Thermometer, Timer,
  Clock, Gauge, TrendingUp, ArrowUpCircle, CheckCircle, Star, Award, Crown,
  Gem, Lightbulb, Puzzle, Layers, Move, RotateCcw, RefreshCw, Crosshair,
  Focus, ZoomIn, Magnet, Battery, BatteryCharging, Vibrate,
  Microscope, FlaskConical, Leaf, Mountain, Sunrise,
  Pill, Ambulance, Baby, PersonStanding, Accessibility, Bike, Trophy,
  Scan, Radar, Radio, Grip, Hammer, Wrench, Settings, Cog,
  Orbit, Atom, TreePine, Flower2, Snowflake, CloudSun, Umbrella,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { AIImageGenerator } from "@/components/admin/ai-image-generator";
import { ImagePicker } from "@/components/ui/image-picker";

const ICON_OPTIONS = [
  // Body & Movement
  "Dumbbell", "Activity", "HeartPulse", "Heart", "Bone", "Brain", "Hand",
  "Footprints", "PersonStanding", "Accessibility", "Bike", "Move", "RotateCcw",
  // Medical & Clinical
  "Stethoscope", "Syringe", "Pill", "Ambulance", "Thermometer", "Microscope",
  "FlaskConical", "Baby", "Scan", "ScanLine",
  // Energy & Therapy
  "Zap", "Waves", "CircleDot", "Flame", "Vibrate", "Magnet", "Battery",
  "BatteryCharging", "Radio", "Radar", "Orbit", "Atom",
  // Targets & Goals
  "Target", "Crosshair", "Focus", "ZoomIn", "Shield", "Trophy", "Award",
  "Star", "Crown", "Gem", "TrendingUp", "ArrowUpCircle", "CheckCircle",
  // Nature & Wellness
  "Leaf", "TreePine", "Flower2", "Sunrise", "Sun", "Wind", "Droplets",
  "Mountain", "CloudSun", "Snowflake", "Umbrella",
  // Concepts
  "Lightbulb", "Sparkles", "Puzzle", "Layers", "RefreshCw", "Timer", "Clock",
  "Gauge", "Users", "Hammer", "Wrench", "Settings", "Cog", "Grip",
];

const ICON_MAP: Record<string, any> = {
  Zap, Dumbbell, Footprints, ScanLine, Waves, CircleDot, Activity, Heart,
  Syringe, Users, Brain, Flame, Shield, Target, Stethoscope, HeartPulse, Bone,
  Hand, Ear, Sparkles, Sun, Wind, Droplets, Thermometer, Timer,
  Clock, Gauge, TrendingUp, ArrowUpCircle, CheckCircle, Star, Award, Crown,
  Gem, Lightbulb, Puzzle, Layers, Move, RotateCcw, RefreshCw, Crosshair,
  Focus, ZoomIn, Magnet, Battery, BatteryCharging, Vibrate,
  Microscope, FlaskConical, Leaf, Mountain, Sunrise,
  Pill, Ambulance, Baby, PersonStanding, Accessibility, Bike, Trophy,
  Scan, Radar, Radio, Grip, Hammer, Wrench, Settings, Cog,
  Orbit, Atom, TreePine, Flower2, Snowflake, CloudSun, Umbrella,
};

// AI-suggested icons per therapy type keyword
const THERAPY_ICON_SUGGESTIONS: Record<string, string[]> = {
  kinesiotherapy: ["Dumbbell", "Activity", "Move", "RotateCcw", "PersonStanding", "Bike", "TrendingUp", "RefreshCw"],
  kinesioterapia: ["Dumbbell", "Activity", "Move", "RotateCcw", "PersonStanding", "Bike", "TrendingUp", "RefreshCw"],
  exercise: ["Dumbbell", "Activity", "Bike", "PersonStanding", "Move", "Trophy", "TrendingUp"],
  microcurrent: ["Zap", "BatteryCharging", "Vibrate", "Atom", "CircleDot", "Radar", "Waves"],
  mens: ["Zap", "BatteryCharging", "Vibrate", "Atom", "CircleDot", "Radar", "Waves"],
  laser: ["Zap", "Focus", "Target", "Crosshair", "Sun", "Sparkles", "Radar"],
  shockwave: ["Zap", "Waves", "Vibrate", "Radio", "Target", "Flame"],
  ultrasound: ["Waves", "Radio", "Radar", "CircleDot", "Vibrate", "Scan"],
  ems: ["Zap", "BatteryCharging", "Activity", "Vibrate", "Magnet", "Dumbbell"],
  electrical: ["Zap", "BatteryCharging", "Battery", "Vibrate", "Magnet", "Activity"],
  sport: ["Trophy", "Bike", "Dumbbell", "Activity", "PersonStanding", "Shield", "Award", "TrendingUp"],
  chronic: ["Shield", "Heart", "HeartPulse", "Leaf", "Sunrise", "RefreshCw", "Thermometer"],
  pain: ["Shield", "Heart", "HeartPulse", "Flame", "Target", "Thermometer"],
  surgery: ["Stethoscope", "Syringe", "Shield", "HeartPulse", "RefreshCw", "TrendingUp", "CheckCircle"],
  rehabilitation: ["RefreshCw", "TrendingUp", "Activity", "PersonStanding", "Dumbbell", "Shield"],
  foot: ["Footprints", "ScanLine", "Scan", "Bone", "Accessibility", "Move"],
  biomechanical: ["ScanLine", "Scan", "Bone", "Footprints", "Microscope", "Gauge"],
  therapeutic: ["Heart", "HeartPulse", "Leaf", "Sparkles", "Shield", "Stethoscope"],
  post: ["RefreshCw", "TrendingUp", "Shield", "CheckCircle", "Stethoscope", "HeartPulse"],
  pre: ["Shield", "Stethoscope", "CheckCircle", "Target", "Lightbulb"],
};

function getSuggestedIcons(title: string): string[] {
  const lower = title.toLowerCase();
  const suggested = new Set<string>();
  for (const [keyword, icons] of Object.entries(THERAPY_ICON_SUGGESTIONS)) {
    if (lower.includes(keyword)) {
      icons.forEach(ic => suggested.add(ic));
    }
  }
  return Array.from(suggested).slice(0, 12);
}

const COLOR_OPTIONS = [
  { label: "Amber", value: "bg-amber-100 text-amber-700" },
  { label: "Green", value: "bg-green-100 text-green-700" },
  { label: "Blue", value: "bg-blue-100 text-blue-700" },
  { label: "Purple", value: "bg-purple-100 text-purple-700" },
  { label: "Cyan", value: "bg-cyan-100 text-cyan-700" },
  { label: "Rose", value: "bg-rose-100 text-rose-700" },
  { label: "Orange", value: "bg-orange-100 text-orange-700" },
  { label: "Red", value: "bg-red-100 text-red-700" },
  { label: "Teal", value: "bg-teal-100 text-teal-700" },
  { label: "Indigo", value: "bg-indigo-100 text-indigo-700" },
  { label: "Yellow", value: "bg-yellow-100 text-yellow-700" },
  { label: "Primary", value: "bg-primary/10 text-primary" },
];

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface ServicePageData {
  id: string;
  slug: string;
  icon: string;
  color: string;
  titleEn: string;
  titlePt: string;
  descriptionEn: string;
  descriptionPt: string;
  heroImageUrl: string;
  heroImagePath: string;
  benefitsEn: string;
  benefitsPt: string;
  whoIsItForEn: string;
  whoIsItForPt: string;
  howItWorksEn: string;
  howItWorksPt: string;
  sessionInfoEn: string;
  sessionInfoPt: string;
  extraContentEn: string;
  extraContentPt: string;
  galleryJson: string;
  faqJson: string;
  published: boolean;
  showInMenu: boolean;
  sortOrder: number;
}

const EMPTY: ServicePageData = {
  id: "", slug: "", icon: "Zap", color: "bg-primary/10 text-primary",
  titleEn: "", titlePt: "", descriptionEn: "", descriptionPt: "",
  heroImageUrl: "", heroImagePath: "",
  benefitsEn: "", benefitsPt: "",
  whoIsItForEn: "", whoIsItForPt: "",
  howItWorksEn: "", howItWorksPt: "",
  sessionInfoEn: "", sessionInfoPt: "",
  extraContentEn: "", extraContentPt: "",
  galleryJson: "", faqJson: "",
  published: true, showInMenu: true, sortOrder: 0,
};

export default function ServicePageEditorPage() {
  const router = useRouter();
  const { id } = useParams() as { id: string };
  const { toast } = useToast();

  const [data, setData] = useState<ServicePageData>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const [heroImagePickerOpen, setHeroImagePickerOpen] = useState(false);

  // Benefits as arrays
  const [benefitsEn, setBenefitsEn] = useState<string[]>([]);
  const [benefitsPt, setBenefitsPt] = useState<string[]>([]);

  useEffect(() => {
    fetch(`/api/admin/service-pages/${id}`)
      .then((r) => r.ok ? r.json() : null)
      .then((d) => {
        if (d) {
          setData({ ...EMPTY, ...d, icon: d.icon || "Zap", color: d.color || "bg-primary/10 text-primary" });
          try { setBenefitsEn(d.benefitsEn ? JSON.parse(d.benefitsEn) : []); } catch { setBenefitsEn([]); }
          try { setBenefitsPt(d.benefitsPt ? JSON.parse(d.benefitsPt) : []); } catch { setBenefitsPt([]); }
        }
      })
      .catch(() => toast({ title: "Error", description: "Failed to load", variant: "destructive" }))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  const set = (field: keyof ServicePageData, value: any) => setData((d) => ({ ...d, [field]: value }));

  const save = async () => {
    setSaving(true);
    try {
      const payload = {
        ...data,
        benefitsEn: JSON.stringify(benefitsEn),
        benefitsPt: JSON.stringify(benefitsPt),
      };
      delete (payload as any).id;
      delete (payload as any).createdAt;
      delete (payload as any).updatedAt;
      delete (payload as any).clinicId;

      const res = await fetch(`/api/admin/service-pages/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const updated = await res.json();
        setData({ ...EMPTY, ...updated });
        toast({ title: "Saved", description: "Service page updated successfully" });
      } else {
        const err = await res.json();
        toast({ title: "Error", description: err.error, variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Failed to save", variant: "destructive" });
    }
    setSaving(false);
  };

  // Core chat function — called by both sendChat and quick actions
  const triggerChat = async (msg: string) => {
    if (!msg.trim() || chatLoading) return;
    setChatLoading(true);

    try {
      const context = {
        titleEn: data.titleEn, titlePt: data.titlePt,
        descriptionEn: data.descriptionEn, descriptionPt: data.descriptionPt,
        benefitsEn, benefitsPt,
        whoIsItForEn: data.whoIsItForEn, whoIsItForPt: data.whoIsItForPt,
        howItWorksEn: data.howItWorksEn, howItWorksPt: data.howItWorksPt,
        sessionInfoEn: data.sessionInfoEn, sessionInfoPt: data.sessionInfoPt,
      };

      const res = await fetch(`/api/admin/service-pages/${id}/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: msg, context, chatHistory: chatMessages.slice(-6) }),
      });

      if (res.ok) {
        const { response } = await res.json();

        // Try to parse JSON and auto-fill fields
        let applied = false;
        let summary = "";
        try {
          const jsonMatch = response.match(/```json\n?([\s\S]*?)\n?```/) || response.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const raw = jsonMatch[1] || jsonMatch[0];
            const parsed = JSON.parse(raw);
            if (parsed.titleEn) set("titleEn", parsed.titleEn);
            if (parsed.titlePt) set("titlePt", parsed.titlePt);
            if (parsed.descriptionEn) set("descriptionEn", parsed.descriptionEn);
            if (parsed.descriptionPt) set("descriptionPt", parsed.descriptionPt);
            if (parsed.benefitsEn && Array.isArray(parsed.benefitsEn)) setBenefitsEn(parsed.benefitsEn);
            if (parsed.benefitsPt && Array.isArray(parsed.benefitsPt)) setBenefitsPt(parsed.benefitsPt);
            if (parsed.whoIsItForEn) set("whoIsItForEn", parsed.whoIsItForEn);
            if (parsed.whoIsItForPt) set("whoIsItForPt", parsed.whoIsItForPt);
            if (parsed.howItWorksEn) set("howItWorksEn", parsed.howItWorksEn);
            if (parsed.howItWorksPt) set("howItWorksPt", parsed.howItWorksPt);
            if (parsed.sessionInfoEn) set("sessionInfoEn", parsed.sessionInfoEn);
            if (parsed.sessionInfoPt) set("sessionInfoPt", parsed.sessionInfoPt);
            if (parsed.icon) set("icon", parsed.icon);
            if (parsed.color) set("color", parsed.color);
            if (parsed.extraContentEn) set("extraContentEn", parsed.extraContentEn);
            if (parsed.extraContentPt) set("extraContentPt", parsed.extraContentPt);
            if (parsed.faqJson) set("faqJson", typeof parsed.faqJson === "string" ? parsed.faqJson : JSON.stringify(parsed.faqJson));
            summary = parsed._summary || "";
            applied = true;

            // Count what was generated
            const fields = [];
            if (parsed.titleEn) fields.push("title");
            if (parsed.descriptionEn) fields.push("description");
            if (parsed.benefitsEn) fields.push(`${parsed.benefitsEn.length} benefits`);
            if (parsed.whoIsItForEn) fields.push("who is it for");
            if (parsed.howItWorksEn) fields.push("how it works");
            if (parsed.sessionInfoEn) fields.push("session info");
            if (parsed.faqJson) fields.push("FAQ");

            const appliedMsg = summary || `✅ Content applied: ${fields.join(", ")}. EN + PT generated. Review the fields and save.`;
            setChatMessages((prev) => [...prev, { role: "assistant", content: appliedMsg }]);

            // Auto-generate hero image from AI prompt
            if (parsed.imagePrompt && !data.heroImageUrl) {
              setChatMessages((prev) => [...prev, { role: "assistant", content: "🎨 Generating hero image..." }]);
              try {
                const imgRes = await fetch("/api/admin/settings/generate-image", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ prompt: parsed.imagePrompt, aspectRatio: "16:9", section: data.titleEn || "service" }),
                });
                if (imgRes.ok) {
                  const imgData = await imgRes.json();
                  if (imgData.imageUrl) {
                    set("heroImageUrl", imgData.imageUrl);
                    setChatMessages((prev) => [...prev, { role: "assistant", content: "✅ Hero image generated and applied!" }]);
                  }
                } else {
                  setChatMessages((prev) => [...prev, { role: "assistant", content: "Image generation not available. Upload manually or use the AI Image Generator." }]);
                }
              } catch {}
            }
            toast({ title: "AI Content Applied", description: fields.length > 0 ? `Updated: ${fields.join(", ")}` : "Content updated from AI." });
          }
        } catch {}

        // If no JSON was parsed, show the raw response (it's a conversational reply)
        if (!applied) {
          setChatMessages((prev) => [...prev, { role: "assistant", content: response }]);
        }
      } else {
        const err = await res.json();
        setChatMessages((prev) => [...prev, { role: "assistant", content: `Error: ${err.error}` }]);
      }
    } catch (e: any) {
      setChatMessages((prev) => [...prev, { role: "assistant", content: `Error: ${e.message}` }]);
    }
    setChatLoading(false);
  };

  const sendChat = async () => {
    if (!chatInput.trim() || chatLoading) return;
    const msg = chatInput.trim();
    setChatInput("");
    setChatMessages((prev) => [...prev, { role: "user", content: msg }]);
    await triggerChat(msg);
  };

  if (loading) {
    return <div className="flex items-center justify-center min-h-[400px]"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  const IconComp = ICON_MAP[data.icon] || Zap;

  return (
    <div className="flex h-[calc(100vh-4rem)]">
      {/* Main Editor */}
      <div className={`flex-1 overflow-y-auto p-6 space-y-6 ${chatOpen ? "mr-[400px]" : ""}`}>
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/admin/service-pages">
              <Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
            </Link>
            <div>
              <h1 className="text-xl font-bold">Edit Service Page</h1>
              <p className="text-xs text-muted-foreground">/services/{data.slug}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <a href={`/services/${data.slug}`} target="_blank" rel="noopener noreferrer">
              <Button variant="outline" size="sm" className="gap-1.5">
                <ExternalLink className="h-3.5 w-3.5" /> Preview
              </Button>
            </a>
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setChatOpen(!chatOpen)}>
              <Sparkles className="h-3.5 w-3.5" /> AI Assistant
            </Button>
            <Button onClick={save} disabled={saving} className="gap-1.5">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save
            </Button>
          </div>
        </div>

        <Tabs defaultValue="content" className="space-y-4">
          <TabsList>
            <TabsTrigger value="content">Content</TabsTrigger>
            <TabsTrigger value="appearance">Appearance</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          {/* Content Tab */}
          <TabsContent value="content" className="space-y-6">
            {/* Titles */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Title & Description</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Title (English)</Label>
                    <Input value={data.titleEn} onChange={(e) => set("titleEn", e.target.value)} placeholder="e.g. Electrotherapy" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Title (Português)</Label>
                    <Input value={data.titlePt} onChange={(e) => set("titlePt", e.target.value)} placeholder="e.g. Eletroterapia" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Description (English)</Label>
                    <Textarea value={data.descriptionEn} onChange={(e) => set("descriptionEn", e.target.value)} rows={3} placeholder="Short description..." />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Description (Português)</Label>
                    <Textarea value={data.descriptionPt} onChange={(e) => set("descriptionPt", e.target.value)} rows={3} placeholder="Descrição curta..." />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Benefits */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Benefits</CardTitle>
                  <Button variant="outline" size="sm" className="gap-1" onClick={() => { setBenefitsEn([...benefitsEn, ""]); setBenefitsPt([...benefitsPt, ""]); }}>
                    <Plus className="h-3 w-3" /> Add Benefit
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {benefitsEn.map((_, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <Badge variant="outline" className="mt-2 shrink-0">{i + 1}</Badge>
                    <div className="flex-1 grid grid-cols-2 gap-2">
                      <Input
                        value={benefitsEn[i] || ""}
                        onChange={(e) => { const n = [...benefitsEn]; n[i] = e.target.value; setBenefitsEn(n); }}
                        placeholder="Benefit (EN)"
                        className="text-sm"
                      />
                      <Input
                        value={benefitsPt[i] || ""}
                        onChange={(e) => { const n = [...benefitsPt]; n[i] = e.target.value; setBenefitsPt(n); }}
                        placeholder="Benefício (PT)"
                        className="text-sm"
                      />
                    </div>
                    <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 text-destructive" onClick={() => {
                      setBenefitsEn(benefitsEn.filter((_, j) => j !== i));
                      setBenefitsPt(benefitsPt.filter((_, j) => j !== i));
                    }}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
                {benefitsEn.length === 0 && <p className="text-xs text-muted-foreground text-center py-2">No benefits added yet</p>}
              </CardContent>
            </Card>

            {/* Who Is It For + How It Works */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Who Is It For?</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs">English</Label>
                    <Textarea value={data.whoIsItForEn} onChange={(e) => set("whoIsItForEn", e.target.value)} rows={4} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Português</Label>
                    <Textarea value={data.whoIsItForPt} onChange={(e) => set("whoIsItForPt", e.target.value)} rows={4} />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">How Does It Work?</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs">English</Label>
                    <Textarea value={data.howItWorksEn} onChange={(e) => set("howItWorksEn", e.target.value)} rows={4} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Português</Label>
                    <Textarea value={data.howItWorksPt} onChange={(e) => set("howItWorksPt", e.target.value)} rows={4} />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Session Info */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Session Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs">English</Label>
                    <Input value={data.sessionInfoEn} onChange={(e) => set("sessionInfoEn", e.target.value)} placeholder="e.g. Sessions: 15-30 min | 2-3x/week" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Português</Label>
                    <Input value={data.sessionInfoPt} onChange={(e) => set("sessionInfoPt", e.target.value)} placeholder="e.g. Sessões: 15-30 min | 2-3x/semana" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Extra Content */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Extra Content (Optional HTML)</CardTitle>
                <CardDescription>Additional rich content shown below the main sections</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs">English</Label>
                    <Textarea value={data.extraContentEn} onChange={(e) => set("extraContentEn", e.target.value)} rows={6} className="font-mono text-xs" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Português</Label>
                    <Textarea value={data.extraContentPt} onChange={(e) => set("extraContentPt", e.target.value)} rows={6} className="font-mono text-xs" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Appearance Tab */}
          <TabsContent value="appearance" className="space-y-6">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Icon & Colour</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <Label className="text-xs">Icon</Label>
                  {(() => {
                    const suggested = getSuggestedIcons(data.titleEn || data.titlePt || "");
                    const otherIcons = ICON_OPTIONS.filter(ic => !suggested.includes(ic));
                    return (
                      <>
                        {suggested.length > 0 && (
                          <div className="space-y-1.5">
                            <p className="text-[10px] text-primary font-semibold uppercase tracking-wider flex items-center gap-1">
                              <Sparkles className="h-3 w-3" /> Recommended for {data.titleEn || "this service"}
                            </p>
                            <div className="flex flex-wrap gap-2 p-2 bg-primary/5 rounded-lg border border-primary/20">
                              {suggested.map((name) => {
                                const IC = ICON_MAP[name];
                                if (!IC) return null;
                                return (
                                  <button
                                    key={`sug-${name}`}
                                    onClick={() => set("icon", name)}
                                    className={`w-10 h-10 rounded-lg border-2 flex items-center justify-center transition-all ${
                                      data.icon === name ? "border-primary bg-primary/20 shadow-md scale-110" : "border-primary/30 hover:border-primary bg-white dark:bg-card"
                                    }`}
                                    title={name}
                                  >
                                    <IC className="h-5 w-5" />
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )}
                        <div className="space-y-1.5">
                          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">All Icons</p>
                          <div className="flex flex-wrap gap-1.5">
                            {otherIcons.map((name) => {
                              const IC = ICON_MAP[name];
                              if (!IC) return null;
                              return (
                                <button
                                  key={name}
                                  onClick={() => set("icon", name)}
                                  className={`w-9 h-9 rounded-lg border flex items-center justify-center transition-colors ${
                                    data.icon === name ? "border-primary bg-primary/10" : "border-border hover:border-primary/50"
                                  }`}
                                  title={name}
                                >
                                  <IC className="h-4 w-4" />
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </>
                    );
                  })()}
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Colour Theme</Label>
                  <div className="flex flex-wrap gap-2">
                    {COLOR_OPTIONS.map((c) => (
                      <button
                        key={c.value}
                        onClick={() => set("color", c.value)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${c.value} ${
                          data.color === c.value ? "ring-2 ring-primary ring-offset-2" : ""
                        }`}
                      >
                        {c.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="pt-2">
                  <Label className="text-xs mb-2 block">Preview</Label>
                  <div className="flex items-center gap-3 p-4 bg-muted/30 rounded-lg">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${data.color}`}>
                      <IconComp className="h-6 w-6" />
                    </div>
                    <div>
                      <p className="font-semibold text-sm">{data.titleEn || "Service Title"}</p>
                      <p className="text-xs text-muted-foreground">{data.descriptionEn || "Service description..."}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Hero Image</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {data.heroImageUrl ? (
                  <div className="relative group">
                    <img src={data.heroImageUrl} alt="Hero" className="w-full max-h-48 rounded-lg object-cover" />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center gap-2">
                      <Button variant="secondary" size="sm" onClick={() => setHeroImagePickerOpen(true)}>
                        Change Image
                      </Button>
                      <Button variant="destructive" size="sm" onClick={() => { set("heroImageUrl", ""); set("heroImagePath", ""); }}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="border-2 border-dashed rounded-lg p-8 text-center space-y-3">
                    <div className="text-muted-foreground text-sm">No hero image set</div>
                    <div className="flex items-center justify-center gap-2 flex-wrap">
                      <Button variant="outline" size="sm" onClick={() => setHeroImagePickerOpen(true)}>
                        Pick from Library
                      </Button>
                      <AIImageGenerator
                        section={data.titleEn || "Service"}
                        defaultPrompt={`Professional photograph for ${data.titleEn || "physiotherapy service"} page. Modern clinic, patient-focused, warm lighting.`}
                        aspectRatio="16:9"
                        onApply={(url) => set("heroImageUrl", url)}
                      />
                    </div>
                  </div>
                )}
                <div className="space-y-1.5">
                  <Label className="text-xs">Image URL (or paste manually)</Label>
                  <Input value={data.heroImageUrl} onChange={(e) => set("heroImageUrl", e.target.value)} placeholder="https://..." className="text-xs" />
                </div>
              </CardContent>
            </Card>
            <ImagePicker
              open={heroImagePickerOpen}
              onClose={() => setHeroImagePickerOpen(false)}
              onSelect={(url) => { set("heroImageUrl", url); setHeroImagePickerOpen(false); }}
              category="services"
              title="Pick Hero Image"
            />
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings" className="space-y-6">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">URL & Visibility</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-xs">URL Slug</Label>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">/services/</span>
                    <Input value={data.slug} onChange={(e) => set("slug", e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"))} className="flex-1" />
                  </div>
                </div>
                <div className="flex items-center justify-between py-2">
                  <div>
                    <p className="text-sm font-medium">Published</p>
                    <p className="text-xs text-muted-foreground">Page is visible on the website</p>
                  </div>
                  <Switch checked={data.published} onCheckedChange={(v) => set("published", v)} />
                </div>
                <div className="flex items-center justify-between py-2">
                  <div>
                    <p className="text-sm font-medium">Show in Navigation Menu</p>
                    <p className="text-xs text-muted-foreground">Listed under Services in the main menu</p>
                  </div>
                  <Switch checked={data.showInMenu} onCheckedChange={(v) => set("showInMenu", v)} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Sort Order</Label>
                  <Input type="number" value={data.sortOrder} onChange={(e) => set("sortOrder", parseInt(e.target.value) || 0)} className="w-24" />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* AI Chat Sidebar */}
      {chatOpen && (
        <div className="fixed right-0 top-0 bottom-0 w-[400px] bg-card border-l border-border flex flex-col z-50">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/30">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <h3 className="font-semibold text-sm">AI Content Assistant</h3>
            </div>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setChatOpen(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Quick prompts */}
          <div className="px-3 py-2 border-b border-border space-y-1">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Quick Actions</p>
            <div className="flex flex-wrap gap-1">
              {[
                "Generate all content for this service",
                "Write 6 benefits",
                "Write Who Is It For section",
                "Write How It Works section",
                "Translate everything to Portuguese",
                "Improve existing content",
                "Generate a hero image prompt for this service",
                "Generate FAQ questions and answers",
              ].map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => { setChatInput(prompt); setTimeout(() => { setChatInput(""); setChatMessages((prev) => [...prev, { role: "user", content: prompt }]); triggerChat(prompt); }, 0); }}
                  disabled={chatLoading}
                  className="text-[11px] px-2 py-1 rounded-md bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground transition-colors disabled:opacity-40"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {chatMessages.length === 0 && (
              <div className="text-center py-8">
                <Sparkles className="h-8 w-8 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">Ask the AI to generate content for this service page</p>
                <p className="text-xs text-muted-foreground mt-1">e.g. &quot;Generate all content for Kinesiotherapy&quot;</p>
              </div>
            )}
            {chatMessages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[85%] rounded-lg px-3 py-2 text-xs leading-relaxed ${
                  msg.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-foreground"
                }`}>
                  <pre className="whitespace-pre-wrap font-sans">{msg.content}</pre>
                </div>
              </div>
            ))}
            {chatLoading && (
              <div className="flex justify-start">
                <div className="bg-muted rounded-lg px-3 py-2">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Input */}
          <div className="p-3 border-t border-border">
            <div className="flex gap-2">
              <Input
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendChat()}
                placeholder="Ask AI to generate content..."
                className="text-sm"
              />
              <Button size="icon" onClick={sendChat} disabled={chatLoading || !chatInput.trim()}>
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
