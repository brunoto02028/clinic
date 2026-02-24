"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Mail, Save, Eye, Send, Loader2, CheckCircle, AlertCircle,
  X, ToggleLeft, ToggleRight, Pencil, Code, Globe, RefreshCw,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface EmailTemplate {
  id: string;
  slug: string;
  name: string;
  subject: string;
  htmlBody: string;
  variables: string[];
  description: string | null;
  isActive: boolean;
  updatedAt: string;
}

const SLUG_ICONS: Record<string, string> = {
  WELCOME: "👋", APPOINTMENT_CONFIRMATION: "✅", APPOINTMENT_REMINDER: "⏰",
  APPOINTMENT_CANCELLED: "❌", PAYMENT_CONFIRMATION: "💳", TREATMENT_PROTOCOL: "📋",
  ASSESSMENT_COMPLETED: "📊", PASSWORD_RESET: "🔑", SCREENING_RECEIVED: "🩺",
  DOCUMENT_RECEIVED: "📄", BODY_ASSESSMENT_SUBMITTED: "🏃", FOOT_SCAN_SUBMITTED: "👣",
  CONSENT_CONFIRMED: "✍️", BP_HIGH_ALERT: "🚨", CUSTOM: "✉️", ARTICLE_NEWSLETTER: "📰",
};

export default function EmailTemplatesPage() {
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editSubject, setEditSubject] = useState("");
  const [editBody, setEditBody] = useState("");
  const [editName, setEditName] = useState("");
  const [saving, setSaving] = useState(false);
  const [sendingTest, setSendingTest] = useState(false);
  const [testEmail, setTestEmail] = useState("brunotoaz@gmail.com");
  const [previewHtml, setPreviewHtml] = useState("");
  const [previewLocale, setPreviewLocale] = useState<"en-GB" | "pt-BR">("en-GB");
  const [activeTab, setActiveTab] = useState<"edit" | "preview">("edit");
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  const fetchTemplates = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/email-templates");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load templates");
      setTemplates(data.templates || []);
    } catch (err: any) {
      setError(err.message || "Failed to load templates");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchTemplates(); }, [fetchTemplates]);

  const selected = templates.find((t) => t.id === selectedId);

  const selectTemplate = (t: EmailTemplate) => {
    setSelectedId(t.id);
    setEditSubject(t.subject);
    setEditBody(t.htmlBody);
    setEditName(t.name);
    setPreviewHtml("");
    setActiveTab("edit");
    setError("");
    setSuccess("");
  };

  const handleSave = async () => {
    if (!selectedId) return;
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/admin/email-templates", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: selectedId, name: editName, subject: editSubject, htmlBody: editBody }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSuccess("Template saved!");
      setTimeout(() => setSuccess(""), 3000);
      fetchTemplates();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (t: EmailTemplate) => {
    try {
      await fetch("/api/admin/email-templates", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: t.id, isActive: !t.isActive }),
      });
      fetchTemplates();
    } catch {}
  };

  const loadPreview = async (locale: "en-GB" | "pt-BR") => {
    if (!selected) return;
    setLoadingPreview(true);
    setPreviewLocale(locale);
    try {
      const res = await fetch("/api/admin/email-templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "preview", slug: selected.slug, locale }),
      });
      const data = await res.json();
      if (data.html) { setPreviewHtml(data.html); setActiveTab("preview"); }
      else setError("Preview failed");
    } catch { setError("Preview failed"); }
    finally { setLoadingPreview(false); }
  };

  const handleSendTest = async () => {
    if (!selected || !testEmail) return;
    setSendingTest(true);
    setError("");
    try {
      const res = await fetch("/api/admin/email-templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "sendTest", slug: selected.slug, testEmail }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSuccess(`Test sent to ${testEmail}!`);
      setTimeout(() => setSuccess(""), 4000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSendingTest(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-[#5dc9c0]" />
        <span className="ml-2 text-muted-foreground">Loading templates...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight flex items-center gap-2">
            <Mail className="h-5 w-5 sm:h-6 sm:w-6 text-[#5dc9c0]" />
            Email Templates
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {templates.length} templates · bilingual EN / PT-BR · logo & footer from Site Settings
          </p>
        </div>
        <button
          onClick={fetchTemplates}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground px-3 py-1.5 rounded-lg border hover:bg-muted/30 transition-colors self-start sm:self-auto"
        >
          <RefreshCw className="h-3.5 w-3.5" /> Refresh
        </button>
      </div>

      {/* Alerts */}
      {error && (
        <div className="bg-red-50 text-red-700 text-sm p-3 rounded-lg flex items-center gap-2 border border-red-200">
          <AlertCircle className="h-4 w-4 shrink-0" /> {error}
          <button className="ml-auto" onClick={() => setError("")}><X className="h-3.5 w-3.5" /></button>
        </div>
      )}
      {success && (
        <div className="bg-green-50 text-green-700 text-sm p-3 rounded-lg flex items-center gap-2 border border-green-200">
          <CheckCircle className="h-4 w-4" /> {success}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6">
        {/* Template List */}
        <div className="space-y-1.5">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide px-1 mb-2">
            Templates ({templates.length})
          </p>
          {templates.map((t) => (
            <button
              key={t.id}
              onClick={() => selectTemplate(t)}
              className={`w-full text-left border rounded-xl p-3 transition-all ${
                selectedId === t.id
                  ? "border-[#5dc9c0] bg-[#5dc9c0]/5 shadow-sm"
                  : "hover:border-[#5dc9c0]/40 hover:bg-muted/30"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-base shrink-0">{SLUG_ICONS[t.slug] || "✉️"}</span>
                  <div className="min-w-0">
                    <p className="font-medium text-sm truncate leading-tight">{t.name}</p>
                    <p className="text-[10px] text-muted-foreground font-mono truncate">{t.slug}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium ${
                    t.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
                  }`}>{t.isActive ? "ON" : "OFF"}</span>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleToggle(t); }}
                    className="p-0.5 hover:bg-muted rounded"
                  >
                    {t.isActive
                      ? <ToggleRight className="h-4 w-4 text-[#5dc9c0]" />
                      : <ToggleLeft className="h-4 w-4 text-muted-foreground" />}
                  </button>
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* Editor Panel */}
        <div className="space-y-4">
          {selected ? (
            <>
              {/* Tab bar + actions */}
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex gap-1 bg-muted/50 p-1 rounded-lg">
                  <button
                    onClick={() => setActiveTab("edit")}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                      activeTab === "edit" ? "bg-white shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <Pencil className="h-3.5 w-3.5" /> Edit
                  </button>
                  <button
                    onClick={() => loadPreview(previewLocale)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                      activeTab === "preview" ? "bg-white shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {loadingPreview ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Eye className="h-3.5 w-3.5" />}
                    Preview
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => loadPreview("en-GB")}
                    className={`px-2 py-1 rounded-md border text-xs font-medium transition-all ${
                      previewLocale === "en-GB" && activeTab === "preview"
                        ? "border-[#5dc9c0] bg-[#5dc9c0]/10 text-[#1a6b6b]"
                        : "border-gray-200 text-muted-foreground hover:border-[#5dc9c0]/40"
                    }`}
                  >🇬🇧 EN</button>
                  <button
                    onClick={() => loadPreview("pt-BR")}
                    className={`px-2 py-1 rounded-md border text-xs font-medium transition-all ${
                      previewLocale === "pt-BR" && activeTab === "preview"
                        ? "border-[#5dc9c0] bg-[#5dc9c0]/10 text-[#1a6b6b]"
                        : "border-gray-200 text-muted-foreground hover:border-[#5dc9c0]/40"
                    }`}
                  >🇧🇷 PT</button>

                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-semibold text-white disabled:opacity-60"
                    style={{ background: "linear-gradient(135deg,#5dc9c0 0%,#1a6b6b 100%)" }}
                  >
                    {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                    Save
                  </button>
                </div>
              </div>

              {/* Edit tab */}
              {activeTab === "edit" && (
                <Card>
                  <CardContent className="pt-5 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold">Template Name</Label>
                        <Input value={editName} onChange={(e) => setEditName(e.target.value)} />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold">Subject Line</Label>
                        <Input value={editSubject} onChange={(e) => setEditSubject(e.target.value)} />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs font-semibold flex items-center gap-1.5">
                          <Code className="h-3 w-3" /> HTML Body
                        </Label>
                        <span className="text-[10px] text-muted-foreground italic">
                          Bilingual content (EN/PT) is auto-applied — edit only to override
                        </span>
                      </div>
                      <Textarea
                        value={editBody}
                        onChange={(e) => setEditBody(e.target.value)}
                        rows={18}
                        className="font-mono text-xs resize-y"
                        placeholder="Leave empty to use bilingual default from email-i18n.ts"
                      />
                    </div>

                    {selected.variables.length > 0 && (
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold">Click to insert variable</Label>
                        <div className="flex gap-1.5 flex-wrap">
                          {selected.variables.map((v) => (
                            <button
                              key={v}
                              onClick={() => setEditBody((prev) => prev + `{{${v}}}`)}
                              className="text-xs bg-violet-50 text-violet-700 border border-violet-200 px-2 py-1 rounded-md hover:bg-violet-100 transition-colors font-mono"
                            >
                              {`{{${v}}}`}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Send test */}
                    <div className="border-t pt-4 flex items-end gap-3">
                      <div className="flex-1 space-y-1.5">
                        <Label className="text-xs font-semibold flex items-center gap-1.5">
                          <Send className="h-3 w-3" /> Send Test Email
                        </Label>
                        <Input
                          type="email"
                          value={testEmail}
                          onChange={(e) => setTestEmail(e.target.value)}
                          placeholder="email@example.com"
                        />
                      </div>
                      <button
                        onClick={handleSendTest}
                        disabled={sendingTest || !testEmail}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold text-white disabled:opacity-60"
                        style={{ background: "linear-gradient(135deg,#5dc9c0 0%,#1a6b6b 100%)" }}
                      >
                        {sendingTest ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                        Send Test
                      </button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Preview tab */}
              {activeTab === "preview" && previewHtml && (
                <Card>
                  <CardHeader className="pb-2 pt-4 px-4">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Globe className="h-4 w-4 text-[#5dc9c0]" />
                        Preview — {previewLocale === "en-GB" ? "🇬🇧 English" : "🇧🇷 Português"}
                      </CardTitle>
                      <button onClick={() => setActiveTab("edit")} className="text-muted-foreground hover:text-foreground">
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </CardHeader>
                  <CardContent className="px-4 pb-4">
                    <div className="border rounded-xl overflow-hidden bg-[#f4f7fa]">
                      <iframe
                        srcDoc={previewHtml}
                        className="w-full h-[640px] border-0"
                        title="Email Preview"
                      />
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          ) : (
            <Card>
              <CardContent className="py-24 text-center">
                <Mail className="h-14 w-14 text-muted-foreground/20 mx-auto mb-4" />
                <p className="text-muted-foreground font-medium">Select a template to edit</p>
                <p className="text-xs text-muted-foreground mt-1">Click any template on the left</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
