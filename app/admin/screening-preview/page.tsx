"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Save, Loader2, Eye, Pencil, Sparkles, ChevronDown, ChevronRight,
  GripVertical, ToggleLeft, ToggleRight, Plus, Trash2, Check, X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import AssessmentScreeningForm from "@/components/screening/medical-screening-form";

interface ScreeningConfig {
  formTitle: { en: string; pt: string };
  formSubtitle: { en: string; pt: string };
  sections: { id: string; title: { en: string; pt: string }; description: { en: string; pt: string }; enabled: boolean }[];
  redFlagQuestions: { key: string; en: string; pt: string; enabled: boolean }[];
  previousTreatmentQuestions: { key: string; en: string; pt: string; enabled: boolean }[];
  consentText: { en: string; pt: string };
}

export default function ScreeningPreviewPage() {
  const { toast } = useToast();
  const [config, setConfig] = useState<ScreeningConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState<"edit" | "preview">("edit");
  const [improvingField, setImprovingField] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(["red_flags"]));

  useEffect(() => {
    fetch("/api/admin/screening-config")
      .then((r) => r.json())
      .then((data) => { setConfig(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    if (!config) return;
    setSaving(true);
    try {
      const res = await fetch("/api/admin/screening-config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });
      if (res.ok) {
        toast({ title: "Saved", description: "Screening form configuration saved successfully." });
      } else {
        throw new Error("Failed to save");
      }
    } catch {
      toast({ title: "Error", description: "Failed to save configuration.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const improveWithAI = async (fieldId: string, text: string, lang: "en" | "pt", fieldType: string) => {
    setImprovingField(fieldId);
    try {
      const res = await fetch("/api/admin/screening-config/improve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, fieldType, language: lang }),
      });
      const data = await res.json();
      if (data.improved) {
        return data.improved;
      }
      toast({ title: "AI Error", description: data.error || "No suggestion", variant: "destructive" });
    } catch {
      toast({ title: "Error", description: "AI service unavailable", variant: "destructive" });
    } finally {
      setImprovingField(null);
    }
    return null;
  };

  const toggleSection = (id: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const updateRedFlag = (index: number, lang: "en" | "pt", value: string) => {
    if (!config) return;
    const q = [...config.redFlagQuestions];
    q[index] = { ...q[index], [lang]: value };
    setConfig({ ...config, redFlagQuestions: q });
  };

  const toggleRedFlag = (index: number) => {
    if (!config) return;
    const q = [...config.redFlagQuestions];
    q[index] = { ...q[index], enabled: !q[index].enabled };
    setConfig({ ...config, redFlagQuestions: q });
  };

  const addRedFlag = () => {
    if (!config) return;
    const newKey = `custom_${Date.now()}`;
    setConfig({
      ...config,
      redFlagQuestions: [
        ...config.redFlagQuestions,
        { key: newKey, en: "New question...", pt: "Nova pergunta...", enabled: true },
      ],
    });
  };

  const removeRedFlag = (index: number) => {
    if (!config) return;
    const q = config.redFlagQuestions.filter((_, i) => i !== index);
    setConfig({ ...config, redFlagQuestions: q });
  };

  const updatePrevTx = (index: number, lang: "en" | "pt", value: string) => {
    if (!config) return;
    const q = [...(config.previousTreatmentQuestions || [])];
    q[index] = { ...q[index], [lang]: value };
    setConfig({ ...config, previousTreatmentQuestions: q });
  };

  const togglePrevTx = (index: number) => {
    if (!config) return;
    const q = [...(config.previousTreatmentQuestions || [])];
    q[index] = { ...q[index], enabled: !q[index].enabled };
    setConfig({ ...config, previousTreatmentQuestions: q });
  };

  const updateSectionField = (sectionIndex: number, field: "title" | "description", lang: "en" | "pt", value: string) => {
    if (!config) return;
    const s = [...config.sections];
    s[sectionIndex] = { ...s[sectionIndex], [field]: { ...s[sectionIndex][field], [lang]: value } };
    setConfig({ ...config, sections: s });
  };

  const toggleSectionEnabled = (sectionIndex: number) => {
    if (!config) return;
    const s = [...config.sections];
    s[sectionIndex] = { ...s[sectionIndex], enabled: !s[sectionIndex].enabled };
    setConfig({ ...config, sections: s });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!config) return <div className="p-6 text-center text-muted-foreground">Failed to load configuration.</div>;

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-foreground">Assessment Screening Form</h1>
          <p className="text-sm text-muted-foreground mt-1">Edit questions, labels and sections. Use AI to improve wording for UK compliance.</p>
        </div>
        <div className="flex gap-2">
          <div className="flex rounded-lg border border-border overflow-hidden">
            <button onClick={() => setTab("edit")}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors ${tab === "edit" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}>
              <Pencil className="h-3 w-3" /> Edit
            </button>
            <button onClick={() => setTab("preview")}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors ${tab === "preview" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}>
              <Eye className="h-3 w-3" /> Preview
            </button>
          </div>
          <Button onClick={handleSave} disabled={saving} size="sm" className="gap-1.5">
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            Save
          </Button>
        </div>
      </div>

      {tab === "preview" ? (
        <div className="border border-dashed border-primary/30 rounded-xl p-4 bg-background">
          <AssessmentScreeningForm />
        </div>
      ) : (
        <div className="space-y-4">
          {/* Form Title & Subtitle */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Form Title & Subtitle</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <Label className="text-[10px] uppercase text-muted-foreground">Title (EN)</Label>
                  <div className="flex gap-1">
                    <Input value={config.formTitle.en} onChange={(e) => setConfig({ ...config, formTitle: { ...config.formTitle, en: e.target.value } })} className="text-sm" />
                    <AIButton fieldId="formTitle-en" text={config.formTitle.en} lang="en" type="title" improving={improvingField} onImprove={async () => {
                      const r = await improveWithAI("formTitle-en", config.formTitle.en, "en", "title");
                      if (r) setConfig({ ...config, formTitle: { ...config.formTitle, en: r } });
                    }} />
                  </div>
                </div>
                <div>
                  <Label className="text-[10px] uppercase text-muted-foreground">Title (PT)</Label>
                  <div className="flex gap-1">
                    <Input value={config.formTitle.pt} onChange={(e) => setConfig({ ...config, formTitle: { ...config.formTitle, pt: e.target.value } })} className="text-sm" />
                    <AIButton fieldId="formTitle-pt" text={config.formTitle.pt} lang="pt" type="title" improving={improvingField} onImprove={async () => {
                      const r = await improveWithAI("formTitle-pt", config.formTitle.pt, "pt", "title");
                      if (r) setConfig({ ...config, formTitle: { ...config.formTitle, pt: r } });
                    }} />
                  </div>
                </div>
              </div>
              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <Label className="text-[10px] uppercase text-muted-foreground">Subtitle (EN)</Label>
                  <div className="flex gap-1">
                    <Textarea rows={2} value={config.formSubtitle.en} onChange={(e) => setConfig({ ...config, formSubtitle: { ...config.formSubtitle, en: e.target.value } })} className="text-sm" />
                    <AIButton fieldId="formSubtitle-en" text={config.formSubtitle.en} lang="en" type="subtitle" improving={improvingField} onImprove={async () => {
                      const r = await improveWithAI("formSubtitle-en", config.formSubtitle.en, "en", "subtitle");
                      if (r) setConfig({ ...config, formSubtitle: { ...config.formSubtitle, en: r } });
                    }} />
                  </div>
                </div>
                <div>
                  <Label className="text-[10px] uppercase text-muted-foreground">Subtitle (PT)</Label>
                  <div className="flex gap-1">
                    <Textarea rows={2} value={config.formSubtitle.pt} onChange={(e) => setConfig({ ...config, formSubtitle: { ...config.formSubtitle, pt: e.target.value } })} className="text-sm" />
                    <AIButton fieldId="formSubtitle-pt" text={config.formSubtitle.pt} lang="pt" type="subtitle" improving={improvingField} onImprove={async () => {
                      const r = await improveWithAI("formSubtitle-pt", config.formSubtitle.pt, "pt", "subtitle");
                      if (r) setConfig({ ...config, formSubtitle: { ...config.formSubtitle, pt: r } });
                    }} />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Sections */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Sections</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {config.sections.map((section, si) => (
                <div key={section.id} className={`border rounded-lg ${section.enabled ? "border-border" : "border-border/40 opacity-60"}`}>
                  <div className="flex items-center justify-between p-3 cursor-pointer" onClick={() => toggleSection(section.id)}>
                    <div className="flex items-center gap-2">
                      {expandedSections.has(section.id) ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                      <span className="text-sm font-medium">{section.title.en}</span>
                      <span className="text-[10px] text-muted-foreground">({section.id})</span>
                    </div>
                    <button type="button" onClick={(e) => { e.stopPropagation(); toggleSectionEnabled(si); }}
                      className="text-muted-foreground hover:text-foreground">
                      {section.enabled ? <ToggleRight className="h-5 w-5 text-emerald-500" /> : <ToggleLeft className="h-5 w-5" />}
                    </button>
                  </div>
                  {expandedSections.has(section.id) && (
                    <div className="px-3 pb-3 space-y-2 border-t border-border/50 pt-2">
                      <div className="grid sm:grid-cols-2 gap-2">
                        <div>
                          <Label className="text-[10px] uppercase text-muted-foreground">Title (EN)</Label>
                          <div className="flex gap-1">
                            <Input value={section.title.en} onChange={(e) => updateSectionField(si, "title", "en", e.target.value)} className="text-xs h-8" />
                            <AIButton fieldId={`section-${si}-title-en`} text={section.title.en} lang="en" type="section title" improving={improvingField} onImprove={async () => {
                              const r = await improveWithAI(`section-${si}-title-en`, section.title.en, "en", "section title");
                              if (r) updateSectionField(si, "title", "en", r);
                            }} />
                          </div>
                        </div>
                        <div>
                          <Label className="text-[10px] uppercase text-muted-foreground">Title (PT)</Label>
                          <div className="flex gap-1">
                            <Input value={section.title.pt} onChange={(e) => updateSectionField(si, "title", "pt", e.target.value)} className="text-xs h-8" />
                            <AIButton fieldId={`section-${si}-title-pt`} text={section.title.pt} lang="pt" type="section title" improving={improvingField} onImprove={async () => {
                              const r = await improveWithAI(`section-${si}-title-pt`, section.title.pt, "pt", "section title");
                              if (r) updateSectionField(si, "title", "pt", r);
                            }} />
                          </div>
                        </div>
                      </div>
                      {section.description && (
                        <div className="grid sm:grid-cols-2 gap-2">
                          <div>
                            <Label className="text-[10px] uppercase text-muted-foreground">Description (EN)</Label>
                            <Input value={section.description.en} onChange={(e) => updateSectionField(si, "description", "en", e.target.value)} className="text-xs h-8" />
                          </div>
                          <div>
                            <Label className="text-[10px] uppercase text-muted-foreground">Description (PT)</Label>
                            <Input value={section.description.pt} onChange={(e) => updateSectionField(si, "description", "pt", e.target.value)} className="text-xs h-8" />
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Red Flag Questions */}
          <Card>
            <CardHeader className="pb-3 flex-row items-center justify-between">
              <CardTitle className="text-sm">Red Flag Questions ({config.redFlagQuestions.length})</CardTitle>
              <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={addRedFlag}>
                <Plus className="h-3 w-3" /> Add Question
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {config.redFlagQuestions.map((q, qi) => (
                <div key={q.key} className={`border rounded-lg p-3 space-y-2 ${q.enabled ? "border-border" : "border-border/40 opacity-60"}`}>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono text-muted-foreground">{q.key}</span>
                    <div className="flex items-center gap-2">
                      <button type="button" onClick={() => toggleRedFlag(qi)}>
                        {q.enabled ? <ToggleRight className="h-5 w-5 text-emerald-500" /> : <ToggleLeft className="h-5 w-5 text-muted-foreground" />}
                      </button>
                      {q.key.startsWith("custom_") && (
                        <button type="button" onClick={() => removeRedFlag(qi)} className="text-red-400 hover:text-red-300">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                  <div>
                    <Label className="text-[10px] uppercase text-muted-foreground">Question (EN)</Label>
                    <div className="flex gap-1">
                      <Textarea rows={2} value={q.en} onChange={(e) => updateRedFlag(qi, "en", e.target.value)} className="text-xs" />
                      <AIButton fieldId={`rf-${qi}-en`} text={q.en} lang="en" type="screening question for a UK rehabilitation clinic" improving={improvingField}
                        onImprove={async () => {
                          const r = await improveWithAI(`rf-${qi}-en`, q.en, "en", "screening question for a UK rehabilitation clinic");
                          if (r) updateRedFlag(qi, "en", r);
                        }} />
                    </div>
                  </div>
                  <div>
                    <Label className="text-[10px] uppercase text-muted-foreground">Question (PT)</Label>
                    <div className="flex gap-1">
                      <Textarea rows={2} value={q.pt} onChange={(e) => updateRedFlag(qi, "pt", e.target.value)} className="text-xs" />
                      <AIButton fieldId={`rf-${qi}-pt`} text={q.pt} lang="pt" type="screening question for a UK rehabilitation clinic" improving={improvingField}
                        onImprove={async () => {
                          const r = await improveWithAI(`rf-${qi}-pt`, q.pt, "pt", "screening question for a UK rehabilitation clinic");
                          if (r) updateRedFlag(qi, "pt", r);
                        }} />
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Previous Treatment Questions */}
          {config.previousTreatmentQuestions && config.previousTreatmentQuestions.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Previous Treatment Questions ({config.previousTreatmentQuestions.length})</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {config.previousTreatmentQuestions.map((q, qi) => (
                  <div key={q.key} className={`border rounded-lg p-3 space-y-2 ${q.enabled ? "border-border" : "border-border/40 opacity-60"}`}>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono text-muted-foreground">{q.key}</span>
                      <button type="button" onClick={() => togglePrevTx(qi)}>
                        {q.enabled ? <ToggleRight className="h-5 w-5 text-emerald-500" /> : <ToggleLeft className="h-5 w-5 text-muted-foreground" />}
                      </button>
                    </div>
                    <div>
                      <Label className="text-[10px] uppercase text-muted-foreground">Question (EN)</Label>
                      <div className="flex gap-1">
                        <Textarea rows={2} value={q.en} onChange={(e) => updatePrevTx(qi, "en", e.target.value)} className="text-xs" />
                        <AIButton fieldId={`ptx-${qi}-en`} text={q.en} lang="en" type="previous treatment question for a UK rehabilitation clinic" improving={improvingField}
                          onImprove={async () => {
                            const r = await improveWithAI(`ptx-${qi}-en`, q.en, "en", "previous treatment question for a UK rehabilitation clinic");
                            if (r) updatePrevTx(qi, "en", r);
                          }} />
                      </div>
                    </div>
                    <div>
                      <Label className="text-[10px] uppercase text-muted-foreground">Question (PT)</Label>
                      <div className="flex gap-1">
                        <Textarea rows={2} value={q.pt} onChange={(e) => updatePrevTx(qi, "pt", e.target.value)} className="text-xs" />
                        <AIButton fieldId={`ptx-${qi}-pt`} text={q.pt} lang="pt" type="previous treatment question for a UK rehabilitation clinic" improving={improvingField}
                          onImprove={async () => {
                            const r = await improveWithAI(`ptx-${qi}-pt`, q.pt, "pt", "previous treatment question for a UK rehabilitation clinic");
                            if (r) updatePrevTx(qi, "pt", r);
                          }} />
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Consent Text */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Consent Text</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label className="text-[10px] uppercase text-muted-foreground">Consent (EN)</Label>
                <div className="flex gap-1">
                  <Textarea rows={3} value={config.consentText.en} onChange={(e) => setConfig({ ...config, consentText: { ...config.consentText, en: e.target.value } })} className="text-xs" />
                  <AIButton fieldId="consent-en" text={config.consentText.en} lang="en" type="UK GDPR consent text for rehabilitation clinic" improving={improvingField}
                    onImprove={async () => {
                      const r = await improveWithAI("consent-en", config.consentText.en, "en", "UK GDPR consent text for rehabilitation clinic");
                      if (r) setConfig({ ...config, consentText: { ...config.consentText, en: r } });
                    }} />
                </div>
              </div>
              <div>
                <Label className="text-[10px] uppercase text-muted-foreground">Consent (PT)</Label>
                <div className="flex gap-1">
                  <Textarea rows={3} value={config.consentText.pt} onChange={(e) => setConfig({ ...config, consentText: { ...config.consentText, pt: e.target.value } })} className="text-xs" />
                  <AIButton fieldId="consent-pt" text={config.consentText.pt} lang="pt" type="UK GDPR consent text for rehabilitation clinic" improving={improvingField}
                    onImprove={async () => {
                      const r = await improveWithAI("consent-pt", config.consentText.pt, "pt", "UK GDPR consent text for rehabilitation clinic");
                      if (r) setConfig({ ...config, consentText: { ...config.consentText, pt: r } });
                    }} />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Save Button */}
          <Button onClick={handleSave} disabled={saving} size="lg" className="w-full gap-2">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save Configuration
          </Button>
        </div>
      )}
    </div>
  );
}

function AIButton({ fieldId, text, lang, type, improving, onImprove }: {
  fieldId: string; text: string; lang: string; type: string;
  improving: string | null; onImprove: () => void;
}) {
  const isImproving = improving === fieldId;
  return (
    <button
      type="button"
      onClick={onImprove}
      disabled={isImproving || !text}
      className="shrink-0 flex items-center justify-center w-8 h-8 rounded-md border border-violet-500/30 bg-violet-500/10 text-violet-400 hover:bg-violet-500/20 disabled:opacity-50 transition-colors"
      title="Improve with AI (UK compliance)"
    >
      {isImproving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
    </button>
  );
}
