"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Loader2,
  Save,
  Eye,
  Settings,
  GripVertical,
  Calendar,
  FileText,
  Shield,
  Footprints,
  LayoutDashboard,
  Clock,
  CheckCircle,
  AlertCircle,
  ArrowRight,
  ChevronRight,
  Bell,
  Pencil,
  Monitor,
  Smartphone,
  Tablet,
  LogOut,
  Menu,
  X,
  User,
  Search,
  Home,
  Star,
  Activity,
  ClipboardList,
  Heart,
  Dumbbell,
  FileUp,
  HeartPulse,
  GraduationCap,
  CreditCard,
  Scale,
  MessageSquare,
  Map,
  ShoppingCart,
  Trophy,
  BookOpen,
  Send as SendIcon,
  Plus,
  Trash2,
  Bot,
  Sparkles,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
import { useLocale } from "@/hooks/use-locale";
import { t as i18nT } from "@/lib/i18n";

// Icon map for rendering
const ICON_MAP: Record<string, any> = {
  LayoutDashboard,
  Calendar,
  Footprints,
  FileText,
  Shield,
  Clock,
  CheckCircle,
  AlertCircle,
  ArrowRight,
  Bell,
  Heart,
  Activity,
  Dumbbell,
  FileUp,
  HeartPulse,
  GraduationCap,
  ClipboardList,
  CreditCard,
  Scale,
  User,
  Map,
  ShoppingCart,
  Trophy,
  BookOpen,
};

interface ModuleConfig {
  id: string;
  label: string;
  description: string;
  icon: string;
  href: string;
  enabled: boolean;
  order: number;
}

interface QuickAction {
  id: string;
  title: string;
  description: string;
  buttonText: string;
  buttonLink: string;
  icon: string;
  enabled: boolean;
}

interface StatCard {
  id: string;
  label: string;
  sublabel: string;
  field: string;
  icon: string;
  color: string;
  enabled: boolean;
}

interface PortalConfig {
  welcomeTitle: string;
  welcomeSubtitle: string;
  modules: ModuleConfig[];
  quickActions: QuickAction[];
  statsCards: StatCard[];
  showScreeningAlert: boolean;
  screeningAlertTitle: string;
  screeningAlertText: string;
}

const COLOR_MAP: Record<string, { bg: string; text: string }> = {
  primary: { bg: "bg-primary/10", text: "text-primary" },
  emerald: { bg: "bg-emerald-100", text: "text-emerald-600" },
  violet: { bg: "bg-violet-100", text: "text-violet-600" },
  blue: { bg: "bg-blue-100", text: "text-blue-600" },
  amber: { bg: "bg-amber-100", text: "text-amber-600" },
  rose: { bg: "bg-rose-100", text: "text-rose-600" },
};

export default function PatientPortalPage() {
  const { locale } = useLocale();
  const T = (key: string) => i18nT(key, locale);
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState<PortalConfig | null>(null);
  const [editingModule, setEditingModule] = useState<string | null>(null);
  const [editingAction, setEditingAction] = useState<string | null>(null);
  const [editingStatId, setEditingStatId] = useState<string | null>(null);
  const [patients, setPatients] = useState<{ id: string; firstName: string; lastName: string; email: string }[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState<string>("");
  const [selectedPatientName, setSelectedPatientName] = useState<string>("");
  const [previewKey, setPreviewKey] = useState(0);
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);

  // Legal / Consent texts state
  const [consentTexts, setConsentTexts] = useState<any>(null);
  const [consentLoading, setConsentLoading] = useState(true);
  const [consentSaving, setConsentSaving] = useState(false);
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  // AI chat state
  const [aiMessages, setAiMessages] = useState<{ role: "user" | "assistant"; content: string }[]>([]);
  const [aiInput, setAiInput] = useState("");
  const [aiLoading, setAiLoading] = useState(false);

  const fetchConfig = useCallback(async () => {
    try {
      const res = await fetch("/api/patient-portal-config");
      const data = await res.json();
      setConfig(data);
    } catch (error) {
      console.error("Error fetching config:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConfig();
    // Fetch consent texts
    fetch("/api/admin/consent-texts")
      .then((r) => r.json())
      .then((data) => setConsentTexts(data))
      .catch(() => {})
      .finally(() => setConsentLoading(false));
    // Fetch patients for preview selector
    fetch("/api/patients")
      .then((r) => r.json())
      .then((data) => {
        const list = (Array.isArray(data) ? data : data.patients || []).map((u: any) => ({
          id: u.id,
          firstName: u.firstName || "",
          lastName: u.lastName || "",
          email: u.email || "",
        }));
        setPatients(list);
        if (list.length > 0) {
          setSelectedPatientId(list[0].id);
          setSelectedPatientName(`${list[0].firstName} ${list[0].lastName}`);
        }
      })
      .catch(() => {});
  }, [fetchConfig]);

  const handleSave = async () => {
    if (!config) return;
    setSaving(true);
    try {
      const res = await fetch("/api/patient-portal-config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });
      if (res.ok) {
        toast({ title: "Saved", description: "Patient portal configuration saved successfully" });
        setPreviewKey((k) => k + 1);
      } else {
        throw new Error("Failed to save");
      }
    } catch {
      toast({ title: "Error", description: "Failed to save configuration", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const toggleModule = (id: string) => {
    if (!config) return;
    setConfig({
      ...config,
      modules: config.modules.map((m) =>
        m.id === id ? { ...m, enabled: !m.enabled } : m
      ),
    });
  };

  const updateModule = (id: string, field: keyof ModuleConfig, value: string) => {
    if (!config) return;
    setConfig({
      ...config,
      modules: config.modules.map((m) =>
        m.id === id ? { ...m, [field]: value } : m
      ),
    });
  };

  const moveModule = (id: string, direction: "up" | "down") => {
    if (!config) return;
    const sorted = [...config.modules].sort((a, b) => a.order - b.order);
    const idx = sorted.findIndex((m) => m.id === id);
    if (direction === "up" && idx > 0) {
      const temp = sorted[idx].order;
      sorted[idx].order = sorted[idx - 1].order;
      sorted[idx - 1].order = temp;
    } else if (direction === "down" && idx < sorted.length - 1) {
      const temp = sorted[idx].order;
      sorted[idx].order = sorted[idx + 1].order;
      sorted[idx + 1].order = temp;
    }
    setConfig({ ...config, modules: sorted });
  };

  // ── Drag-and-drop reorder ──
  const handleDragDrop = (fromIdx: number, toIdx: number) => {
    if (!config || fromIdx === toIdx) return;
    const sorted = [...config.modules].sort((a, b) => a.order - b.order);
    const [moved] = sorted.splice(fromIdx, 1);
    sorted.splice(toIdx, 0, moved);
    sorted.forEach((m, i) => { m.order = i; });
    setConfig({ ...config, modules: sorted });
  };

  const toggleQuickAction = (id: string) => {
    if (!config) return;
    setConfig({
      ...config,
      quickActions: config.quickActions.map((a) =>
        a.id === id ? { ...a, enabled: !a.enabled } : a
      ),
    });
  };

  const updateQuickAction = (id: string, field: keyof QuickAction, value: string) => {
    if (!config) return;
    setConfig({
      ...config,
      quickActions: config.quickActions.map((a) =>
        a.id === id ? { ...a, [field]: value } : a
      ),
    });
  };

  const toggleStatCard = (id: string) => {
    if (!config) return;
    setConfig({
      ...config,
      statsCards: config.statsCards.map((s) =>
        s.id === id ? { ...s, enabled: !s.enabled } : s
      ),
    });
  };

  const updateStatCard = (id: string, field: keyof StatCard, value: string) => {
    if (!config) return;
    setConfig({
      ...config,
      statsCards: config.statsCards.map((s) =>
        s.id === id ? { ...s, [field]: value } : s
      ),
    });
  };

  // ── Consent texts helpers ──
  const handleSaveConsent = async () => {
    if (!consentTexts) return;
    setConsentSaving(true);
    try {
      const res = await fetch("/api/admin/consent-texts", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(consentTexts),
      });
      if (res.ok) {
        toast({ title: "Saved", description: "Legal texts saved successfully" });
      } else throw new Error("Failed to save");
    } catch {
      toast({ title: "Error", description: "Failed to save legal texts", variant: "destructive" });
    } finally {
      setConsentSaving(false);
    }
  };

  const updateConsentSection = (group: "termsSections" | "privacySections" | "liabilitySections", idx: number, field: "title" | "body", value: string) => {
    if (!consentTexts) return;
    const sections = [...consentTexts[group]];
    sections[idx] = { ...sections[idx], [field]: value };
    setConsentTexts({ ...consentTexts, [group]: sections });
  };

  const addConsentSection = (group: "termsSections" | "privacySections" | "liabilitySections") => {
    if (!consentTexts) return;
    const sections = [...consentTexts[group]];
    const maxNum = Math.max(0, ...sections.map((s: any) => s.number));
    sections.push({ number: maxNum + 1, title: "New Section", body: "" });
    setConsentTexts({ ...consentTexts, [group]: sections });
  };

  const removeConsentSection = (group: "termsSections" | "privacySections" | "liabilitySections", idx: number) => {
    if (!consentTexts) return;
    const sections = [...consentTexts[group]];
    sections.splice(idx, 1);
    setConsentTexts({ ...consentTexts, [group]: sections });
  };

  // ── AI Chat helper ──
  const handleAiSend = async () => {
    if (!aiInput.trim() || aiLoading) return;
    const userMsg = aiInput.trim();
    setAiInput("");
    const newMessages = [...aiMessages, { role: "user" as const, content: userMsg }];
    setAiMessages(newMessages);
    setAiLoading(true);
    try {
      const context = consentTexts || "";
      const res = await fetch("/api/admin/ai-text-review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: newMessages, context }),
      });
      const data = await res.json();
      if (data.reply) {
        setAiMessages([...newMessages, { role: "assistant", content: data.reply }]);
      } else {
        setAiMessages([...newMessages, { role: "assistant", content: `Error: ${data.error || "No response"}` }]);
      }
    } catch (err: any) {
      setAiMessages([...newMessages, { role: "assistant", content: `Error: ${err.message}` }]);
    } finally {
      setAiLoading(false);
    }
  };

  if (loading || !config) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const sortedModules = [...config.modules].sort((a, b) => a.order - b.order);
  const enabledModules = sortedModules.filter((m) => m.enabled);
  const enabledStats = config.statsCards.filter((s) => s.enabled);
  const enabledActions = config.quickActions.filter((a) => a.enabled);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{T("admin.portalConfig")}</h1>
          <p className="text-muted-foreground mt-1">
            {T("admin.portalConfigDesc")}
          </p>
        </div>
        <Button onClick={handleSave} disabled={saving} className="gap-2">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {T("admin.saveChanges")}
        </Button>
      </div>

      <Tabs defaultValue="modules" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="modules" className="gap-2">
            <Settings className="h-4 w-4" />
            {T("admin.modules")}
          </TabsTrigger>
          <TabsTrigger value="dashboard" className="gap-2">
            <LayoutDashboard className="h-4 w-4" />
            {T("patient.dashboard")}
          </TabsTrigger>
          <TabsTrigger value="content" className="gap-2">
            <Pencil className="h-4 w-4" />
            {T("admin.content")}
          </TabsTrigger>
          <TabsTrigger value="legal" className="gap-2">
            <Scale className="h-4 w-4" />
            Legal
          </TabsTrigger>
          <TabsTrigger value="preview" className="gap-2">
            <Eye className="h-4 w-4" />
            {T("admin.preview")}
          </TabsTrigger>
        </TabsList>

        {/* ============ MODULES TAB ============ */}
        <TabsContent value="modules" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Navigation Modules</CardTitle>
              <CardDescription>
                Enable/disable and reorder the modules visible in the patient sidebar navigation.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {sortedModules.map((mod, idx) => {
                const IconComponent = ICON_MAP[mod.icon] || LayoutDashboard;
                const isEditing = editingModule === mod.id;
                const isDragging = dragIdx === idx;
                const isDragOver = dragOverIdx === idx;
                return (
                  <div
                    key={mod.id}
                    draggable
                    onDragStart={(e) => {
                      setDragIdx(idx);
                      e.dataTransfer.effectAllowed = "move";
                      if (e.currentTarget instanceof HTMLElement) {
                        e.currentTarget.style.opacity = "0.5";
                      }
                    }}
                    onDragEnd={(e) => {
                      if (e.currentTarget instanceof HTMLElement) {
                        e.currentTarget.style.opacity = "1";
                      }
                      if (dragIdx !== null && dragOverIdx !== null && dragIdx !== dragOverIdx) {
                        handleDragDrop(dragIdx, dragOverIdx);
                      }
                      setDragIdx(null);
                      setDragOverIdx(null);
                    }}
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.dataTransfer.dropEffect = "move";
                      setDragOverIdx(idx);
                    }}
                    onDragLeave={() => {
                      if (dragOverIdx === idx) setDragOverIdx(null);
                    }}
                    className={`border rounded-lg p-4 transition-all cursor-grab active:cursor-grabbing ${
                      mod.enabled ? "bg-background" : "bg-muted/50 opacity-60"
                    } ${isDragOver && dragIdx !== idx ? "border-primary border-2 bg-primary/5" : ""} ${isDragging ? "opacity-50" : ""}`}
                  >
                    <div className="flex items-center gap-4">
                      <GripVertical className="h-5 w-5 text-muted-foreground" />
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <IconComponent className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium">{mod.label}</p>
                        <p className="text-sm text-muted-foreground truncate">{mod.description}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => moveModule(mod.id, "up")}
                          className="h-8 w-8 p-0"
                        >
                          ↑
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => moveModule(mod.id, "down")}
                          className="h-8 w-8 p-0"
                        >
                          ↓
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditingModule(isEditing ? null : mod.id)}
                          className="h-8 w-8 p-0"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Switch
                          checked={mod.enabled}
                          onCheckedChange={() => toggleModule(mod.id)}
                        />
                      </div>
                    </div>
                    {isEditing && (
                      <div className="mt-4 grid grid-cols-2 gap-3 border-t pt-4">
                        <div className="space-y-1">
                          <Label className="text-xs">Label</Label>
                          <Input
                            value={mod.label}
                            onChange={(e) => updateModule(mod.id, "label", e.target.value)}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Icon</Label>
                          <Input
                            value={mod.icon}
                            onChange={(e) => updateModule(mod.id, "icon", e.target.value)}
                            placeholder="e.g. Calendar, FileText"
                          />
                        </div>
                        <div className="col-span-2 space-y-1">
                          <Label className="text-xs">Description</Label>
                          <Input
                            value={mod.description}
                            onChange={(e) => updateModule(mod.id, "description", e.target.value)}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ============ DASHBOARD TAB ============ */}
        <TabsContent value="dashboard" className="space-y-4">
          {/* Stats Cards */}
          <Card>
            <CardHeader>
              <CardTitle>Stats Cards</CardTitle>
              <CardDescription>Configure the statistics cards shown on the patient dashboard.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {config.statsCards.map((stat) => {
                const IconComponent = ICON_MAP[stat.icon] || Clock;
                const colors = COLOR_MAP[stat.color] || COLOR_MAP.primary;
                const isEditing = editingStatId === stat.id;
                return (
                  <div
                    key={stat.id}
                    className={`border rounded-lg p-4 transition-colors ${
                      stat.enabled ? "bg-background" : "bg-muted/50 opacity-60"
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-lg ${colors.bg} flex items-center justify-center`}>
                        <IconComponent className={`h-5 w-5 ${colors.text}`} />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">{stat.label}</p>
                        <p className="text-sm text-muted-foreground">{stat.sublabel}</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditingStatId(isEditing ? null : stat.id)}
                        className="h-8 w-8 p-0"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Switch
                        checked={stat.enabled}
                        onCheckedChange={() => toggleStatCard(stat.id)}
                      />
                    </div>
                    {isEditing && (
                      <div className="mt-4 grid grid-cols-3 gap-3 border-t pt-4">
                        <div className="space-y-1">
                          <Label className="text-xs">Label</Label>
                          <Input
                            value={stat.label}
                            onChange={(e) => updateStatCard(stat.id, "label", e.target.value)}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Sublabel</Label>
                          <Input
                            value={stat.sublabel}
                            onChange={(e) => updateStatCard(stat.id, "sublabel", e.target.value)}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Color</Label>
                          <Input
                            value={stat.color}
                            onChange={(e) => updateStatCard(stat.id, "color", e.target.value)}
                            placeholder="primary, emerald, violet"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>Configure the quick action cards on the patient dashboard.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {config.quickActions.map((action) => {
                const IconComponent = ICON_MAP[action.icon] || Calendar;
                const isEditing = editingAction === action.id;
                return (
                  <div
                    key={action.id}
                    className={`border rounded-lg p-4 transition-colors ${
                      action.enabled ? "bg-background" : "bg-muted/50 opacity-60"
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <IconComponent className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">{action.title}</p>
                        <p className="text-sm text-muted-foreground truncate">{action.description}</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditingAction(isEditing ? null : action.id)}
                        className="h-8 w-8 p-0"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Switch
                        checked={action.enabled}
                        onCheckedChange={() => toggleQuickAction(action.id)}
                      />
                    </div>
                    {isEditing && (
                      <div className="mt-4 grid grid-cols-2 gap-3 border-t pt-4">
                        <div className="space-y-1">
                          <Label className="text-xs">Title</Label>
                          <Input
                            value={action.title}
                            onChange={(e) => updateQuickAction(action.id, "title", e.target.value)}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Button Text</Label>
                          <Input
                            value={action.buttonText}
                            onChange={(e) => updateQuickAction(action.id, "buttonText", e.target.value)}
                          />
                        </div>
                        <div className="col-span-2 space-y-1">
                          <Label className="text-xs">Description</Label>
                          <Textarea
                            value={action.description}
                            onChange={(e) => updateQuickAction(action.id, "description", e.target.value)}
                            rows={2}
                          />
                        </div>
                        <div className="col-span-2 space-y-1">
                          <Label className="text-xs">Button Link</Label>
                          <Input
                            value={action.buttonLink}
                            onChange={(e) => updateQuickAction(action.id, "buttonLink", e.target.value)}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ============ CONTENT TAB ============ */}
        <TabsContent value="content" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Welcome Section</CardTitle>
              <CardDescription>Customize the welcome message patients see when they log in.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Welcome Title</Label>
                <Input
                  value={config.welcomeTitle}
                  onChange={(e) => setConfig({ ...config, welcomeTitle: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Welcome Subtitle</Label>
                <Textarea
                  value={config.welcomeSubtitle}
                  onChange={(e) => setConfig({ ...config, welcomeSubtitle: e.target.value })}
                  rows={2}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Screening Alert</CardTitle>
              <CardDescription>Configure the medical screening alert shown to new patients.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Show Screening Alert</Label>
                <Switch
                  checked={config.showScreeningAlert}
                  onCheckedChange={(v) => setConfig({ ...config, showScreeningAlert: v })}
                />
              </div>
              {config.showScreeningAlert && (
                <>
                  <div className="space-y-2">
                    <Label>Alert Title</Label>
                    <Input
                      value={config.screeningAlertTitle}
                      onChange={(e) => setConfig({ ...config, screeningAlertTitle: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Alert Text</Label>
                    <Textarea
                      value={config.screeningAlertText}
                      onChange={(e) => setConfig({ ...config, screeningAlertText: e.target.value })}
                      rows={3}
                    />
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ============ LEGAL TAB ============ */}
        <TabsContent value="legal" className="space-y-4">
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Left: Section editors (2/3 width) */}
            <div className="lg:col-span-2 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold">Terms, Privacy & Consent Texts</h3>
                  <p className="text-sm text-muted-foreground">Edit the legal texts patients must accept before using the platform.</p>
                </div>
                <Button onClick={handleSaveConsent} disabled={consentSaving || !consentTexts} className="gap-2">
                  {consentSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Save Legal Texts
                </Button>
              </div>

              {consentLoading || !consentTexts ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : (
                <>
                  {/* Consent Checkbox Text */}
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm">Consent Checkbox Text</CardTitle>
                      <CardDescription>The text next to the checkbox patients must tick to accept.</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Textarea
                        value={consentTexts.consentCheckboxText || ""}
                        onChange={(e) => setConsentTexts({ ...consentTexts, consentCheckboxText: e.target.value })}
                        rows={3}
                      />
                    </CardContent>
                  </Card>

                  {/* Terms Sections */}
                  {(["termsSections", "privacySections", "liabilitySections"] as const).map((group) => {
                    const titleKey = group === "termsSections" ? "termsTitle" : group === "privacySections" ? "privacyTitle" : "liabilityTitle";
                    const groupLabel = group === "termsSections" ? "Terms & Conditions" : group === "privacySections" ? "Data Protection & Privacy" : "Liability & General";
                    const isExpanded = expandedSection === group;
                    return (
                      <Card key={group}>
                        <CardHeader className="pb-3 cursor-pointer" onClick={() => setExpandedSection(isExpanded ? null : group)}>
                          <div className="flex items-center justify-between">
                            <div>
                              <CardTitle className="text-sm flex items-center gap-2">
                                <Scale className="h-4 w-4" />
                                {groupLabel}
                                <Badge variant="outline" className="ml-2">{consentTexts[group]?.length || 0} sections</Badge>
                              </CardTitle>
                            </div>
                            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                          </div>
                        </CardHeader>
                        {isExpanded && (
                          <CardContent className="space-y-4">
                            <div className="space-y-1">
                              <Label className="text-xs">Section Title</Label>
                              <Input
                                value={consentTexts[titleKey] || ""}
                                onChange={(e) => setConsentTexts({ ...consentTexts, [titleKey]: e.target.value })}
                              />
                            </div>
                            {(consentTexts[group] || []).map((section: any, idx: number) => (
                              <div key={idx} className="border rounded-lg p-3 space-y-2 bg-muted/20">
                                <div className="flex items-center justify-between">
                                  <Badge variant="outline">{section.number}</Badge>
                                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive" onClick={() => removeConsentSection(group, idx)}>
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                </div>
                                <Input
                                  value={section.title}
                                  onChange={(e) => updateConsentSection(group, idx, "title", e.target.value)}
                                  placeholder="Section title"
                                  className="font-medium"
                                />
                                <Textarea
                                  value={section.body}
                                  onChange={(e) => updateConsentSection(group, idx, "body", e.target.value)}
                                  rows={4}
                                  placeholder="Section body text..."
                                />
                              </div>
                            ))}
                            <Button variant="outline" size="sm" className="gap-1" onClick={() => addConsentSection(group)}>
                              <Plus className="h-3.5 w-3.5" /> Add Section
                            </Button>
                          </CardContent>
                        )}
                      </Card>
                    );
                  })}
                </>
              )}
            </div>

            {/* Right: AI Chat Assistant (1/3 width) */}
            <div className="lg:col-span-1">
              <Card className="sticky top-20">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-amber-500" />
                    AI Text Assistant
                  </CardTitle>
                  <CardDescription>
                    Ask AI to review, correct grammar, improve tone, translate, or rewrite your legal texts.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {/* Chat messages */}
                  <div className="h-[400px] overflow-y-auto space-y-3 border rounded-lg p-3 bg-muted/10">
                    {aiMessages.length === 0 && (
                      <div className="text-center text-muted-foreground text-xs py-8 space-y-2">
                        <Bot className="h-8 w-8 mx-auto opacity-30" />
                        <p>Ask me to review your texts, fix grammar, translate to Portuguese, or suggest improvements.</p>
                        <div className="flex flex-wrap gap-1 justify-center pt-2">
                          {["Review section 1 for grammar", "Translate to Portuguese", "Make it more patient-friendly", "Check GDPR compliance"].map((s) => (
                            <button
                              key={s}
                              className="text-[10px] px-2 py-1 rounded-full border hover:bg-primary/10 hover:border-primary/30 transition-colors"
                              onClick={() => { setAiInput(s); }}
                            >
                              {s}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                    {aiMessages.map((msg, i) => {
                      // Parse apply blocks from assistant messages
                      const applyBlocks: { json: any; raw: string }[] = [];
                      let displayText = msg.content;
                      if (msg.role === "assistant") {
                        const applyRegex = /```apply\s*\n?([\s\S]*?)```/g;
                        let match;
                        while ((match = applyRegex.exec(msg.content)) !== null) {
                          try {
                            const parsed = JSON.parse(match[1].trim());
                            applyBlocks.push({ json: parsed, raw: match[0] });
                          } catch { /* skip invalid JSON */ }
                        }
                        displayText = msg.content.replace(/```apply\s*\n?[\s\S]*?```/g, "").trim();
                      }

                      const handleApply = (block: any) => {
                        if (!consentTexts) return;
                        if (block.field === "consentCheckboxText" && block.value) {
                          setConsentTexts({ ...consentTexts, consentCheckboxText: block.value });
                          toast({ title: "Applied", description: "Consent checkbox text updated" });
                        } else if (block.group && block.index !== undefined) {
                          const sections = [...(consentTexts[block.group] || [])];
                          if (sections[block.index]) {
                            if (block.title) sections[block.index] = { ...sections[block.index], title: block.title };
                            if (block.body) sections[block.index] = { ...sections[block.index], body: block.body };
                            setConsentTexts({ ...consentTexts, [block.group]: sections });
                            const groupLabels: Record<string, string> = { termsSections: "Terms", privacySections: "Privacy", liabilitySections: "Liability" };
                            toast({ title: "Applied", description: `${groupLabels[block.group] || block.group} section ${block.index + 1} updated` });
                          }
                        }
                      };

                      return (
                        <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                          <div className={`max-w-[90%] rounded-lg px-3 py-2 text-sm ${
                            msg.role === "user"
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted border"
                          }`}>
                            <p className="whitespace-pre-wrap text-xs">{displayText}</p>
                            {applyBlocks.length > 0 && (
                              <div className="mt-2 space-y-1 border-t pt-2">
                                {applyBlocks.map((ab, j) => (
                                  <Button
                                    key={j}
                                    size="sm"
                                    variant="outline"
                                    className="w-full text-[10px] h-7 gap-1 bg-emerald-50 hover:bg-emerald-100 border-emerald-200 text-emerald-700"
                                    onClick={() => handleApply(ab.json)}
                                  >
                                    <Sparkles className="h-3 w-3" />
                                    Apply {ab.json.field ? "checkbox text" : `to ${ab.json.group} #${(ab.json.index || 0) + 1}`}
                                  </Button>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                    {aiLoading && (
                      <div className="flex justify-start">
                        <div className="bg-muted border rounded-lg px-3 py-2">
                          <Loader2 className="h-4 w-4 animate-spin" />
                        </div>
                      </div>
                    )}
                  </div>
                  {/* Input */}
                  <div className="flex gap-2">
                    <Textarea
                      value={aiInput}
                      onChange={(e) => setAiInput(e.target.value)}
                      placeholder="Ask AI to review or edit..."
                      rows={2}
                      className="text-sm"
                      onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleAiSend(); } }}
                    />
                    <Button
                      onClick={handleAiSend}
                      disabled={!aiInput.trim() || aiLoading}
                      size="sm"
                      className="self-end h-9 w-9 p-0"
                    >
                      <SendIcon className="h-4 w-4" />
                    </Button>
                  </div>
                  {aiMessages.length > 0 && (
                    <Button variant="ghost" size="sm" className="w-full text-xs" onClick={() => setAiMessages([])}>
                      Clear Chat
                    </Button>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* ============ PREVIEW TAB ============ */}
        <TabsContent value="preview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5" />
                Live Patient Dashboard
              </CardTitle>
              <CardDescription>
                Select a patient below, then navigate the portal exactly as they would see it — with their real data.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Patient Selector */}
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2">
                  <Label className="whitespace-nowrap font-semibold">Patient:</Label>
                  <select
                    className="h-9 rounded-md border border-input bg-background px-3 text-sm min-w-[250px]"
                    value={selectedPatientId}
                    onChange={(e) => {
                      const p = patients.find((pt) => pt.id === e.target.value);
                      setSelectedPatientId(e.target.value);
                      setSelectedPatientName(p ? `${p.firstName} ${p.lastName}` : "");
                    }}
                  >
                    <option value="">— Select patient —</option>
                    {patients.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.firstName} {p.lastName} ({p.email})
                      </option>
                    ))}
                  </select>
                </div>
                {selectedPatientId && (
                  <Badge variant="outline" className="text-xs">
                    Viewing as: {selectedPatientName}
                  </Badge>
                )}
              </div>
              <div className="border-2 border-primary/20 rounded-xl overflow-hidden bg-white" style={{ height: "75vh", minHeight: 600 }}>
                {selectedPatientId ? (
                  <iframe
                    key={`${selectedPatientId}-${previewKey}`}
                    src={`/patient-preview?pid=${selectedPatientId}&pname=${encodeURIComponent(selectedPatientName)}`}
                    className="w-full h-full border-0"
                    title="Patient Dashboard Preview"
                  />
                ) : (
                  <div className="flex items-center justify-center h-full text-muted-foreground">
                    <p>Select a patient above to preview their portal</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Quick Module Links */}
          <Card>
            <CardHeader>
              <CardTitle>All Patient Pages</CardTitle>
              <CardDescription>Click to open any patient page in a new tab and test the experience.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {enabledModules.map((mod) => {
                  const Icon = ICON_MAP[mod.icon] || LayoutDashboard;
                  return (
                    <a key={mod.id} href={mod.href} target="_blank" rel="noopener noreferrer" className="border rounded-lg p-4 flex items-start gap-3 hover:border-primary/50 hover:shadow-sm transition-all cursor-pointer group">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 group-hover:bg-primary/20 transition-colors">
                        <Icon className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium text-sm group-hover:text-primary transition-colors">{mod.label}</p>
                        <p className="text-xs text-muted-foreground mt-1">{mod.description}</p>
                        <Badge variant="outline" className="mt-2 text-xs">{mod.href}</Badge>
                      </div>
                    </a>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
