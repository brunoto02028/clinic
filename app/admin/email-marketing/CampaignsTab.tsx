"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Mail, Plus, Trash2, Play, Pause, Check, X, Settings, Loader2, Newspaper, FileText, Eye, Send } from "lucide-react";

export interface EmailCampaign {
  id: string; name: string; subject: string; status: string;
  totalRecipients: number; sentCount: number; failedCount: number;
  batchSize: number; batchIntervalMs: number;
  groupId?: string; sendToAll: boolean; contactIds?: string[]; templateSlug?: string; articleId?: string; createdAt: string;
}
interface ContactOption { id: string; email: string; firstName?: string | null; lastName?: string | null; }
export interface EmailGroup { id: string; name: string; _count: { members: number }; }
export interface EmailTemplate { id: string; slug: string; name: string; }
interface ArticleOption { id: string; title: string; titleEn?: string | null; titlePt?: string | null; slug: string; }

const STATUS_COLORS: Record<string, string> = {
  DRAFT: "bg-gray-100 dark:bg-muted text-gray-700 dark:text-gray-300",
  SENDING: "bg-yellow-100 dark:bg-yellow-500/20 text-yellow-700 dark:text-yellow-300",
  PAUSED: "bg-orange-100 dark:bg-orange-500/20 text-orange-700 dark:text-orange-300",
  COMPLETED: "bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-300",
  CANCELLED: "bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-300",
};

interface Props {
  campaigns: EmailCampaign[];
  groups: EmailGroup[];
  templates: EmailTemplate[];
  contactTotal: number;
  loading: boolean;
  onRefresh: () => void;
}

const emptyForm = {
  name: "", subject: "", templateSlug: "", preheader: "",
  groupId: "", sendToAll: false, batchSize: 10, batchIntervalMs: 300000,
  articleId: "",
};
type RecipientMode = "all" | "group" | "contacts";

export default function CampaignsTab({ campaigns, groups, templates, contactTotal, loading, onRefresh }: Props) {
  const { toast } = useToast();
  const [showNew, setShowNew] = useState(false);
  const [activeCampaignId, setActiveCampaignId] = useState<string | null>(null);
  const [dispatching, setDispatching] = useState(false);
  const [dispatchLog, setDispatchLog] = useState<string[]>([]);
  const [source, setSource] = useState<"template" | "article">("template");
  const [articles, setArticles] = useState<ArticleOption[]>([]);
  const [articlesLoading, setArticlesLoading] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [articlePreview, setArticlePreview] = useState<{ subject: string; html: string } | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewLocale, setPreviewLocale] = useState<"en" | "pt">("en");
  const [testEmail, setTestEmail] = useState("");
  const [sendingTest, setSendingTest] = useState(false);
  const [testSentMsg, setTestSentMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [recipientMode, setRecipientMode] = useState<RecipientMode>("all");
  const [selectedContacts, setSelectedContacts] = useState<ContactOption[]>([]);
  const [contactSearch, setContactSearch] = useState("");
  const [contactResults, setContactResults] = useState<ContactOption[]>([]);
  const [contactSearchLoading, setContactSearchLoading] = useState(false);

  useEffect(() => {
    if (source === "article" && articles.length === 0 && !articlesLoading) {
      setArticlesLoading(true);
      fetch("/api/articles?published=true")
        .then(r => r.ok ? r.json() : [])
        .then(setArticles)
        .finally(() => setArticlesLoading(false));
    }
  }, [source, articles.length, articlesLoading]);

  const pickArticle = (id: string) => {
    const article = articles.find(a => a.id === id);
    setForm(f => ({
      ...f,
      articleId: id,
      templateSlug: "",
      name: f.name || (article ? `Newsletter — ${article.titleEn || article.title}` : f.name),
      subject: article ? (article.titleEn || article.title) + " — BPR Health News" : f.subject,
    }));
    setArticlePreview(null);
    setTestSentMsg(null);
    if (id) fetchArticlePreview(id, previewLocale);
  };

  const fetchArticlePreview = async (articleId: string, locale: "en" | "pt") => {
    setPreviewLoading(true);
    try {
      const res = await fetch(`/api/admin/articles/${articleId}/notify-preview?locale=${locale}`);
      if (res.ok) setArticlePreview(await res.json());
    } catch {
      // preview is best-effort
    } finally {
      setPreviewLoading(false);
    }
  };

  const changePreviewLocale = (locale: "en" | "pt") => {
    setPreviewLocale(locale);
    if (form.articleId) fetchArticlePreview(form.articleId, locale);
  };

  const sendArticleTestEmail = async () => {
    if (!form.articleId || !testEmail.trim()) return;
    setSendingTest(true);
    setTestSentMsg(null);
    try {
      const res = await fetch(`/api/admin/articles/${form.articleId}/notify-test`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locale: previewLocale, email: testEmail.trim() }),
      });
      const d = await res.json();
      if (res.ok) {
        setTestSentMsg({ ok: true, text: `✓ Test email sent to ${d.sentTo}. Check your inbox.` });
      } else {
        setTestSentMsg({ ok: false, text: d.error || "Failed to send test email." });
      }
    } catch {
      setTestSentMsg({ ok: false, text: "Failed to send test email." });
    } finally {
      setSendingTest(false);
    }
  };

  // Live search-as-you-type for the "selected contacts" recipient picker.
  useEffect(() => {
    if (recipientMode !== "contacts") return;
    const handle = setTimeout(async () => {
      setContactSearchLoading(true);
      try {
        const r = await fetch(`/api/admin/email-contacts?search=${encodeURIComponent(contactSearch)}&limit=20`);
        if (r.ok) { const d = await r.json(); setContactResults(d.contacts || []); }
      } finally {
        setContactSearchLoading(false);
      }
    }, 300);
    return () => clearTimeout(handle);
  }, [contactSearch, recipientMode]);

  const toggleContact = (c: ContactOption) => {
    setSelectedContacts(prev =>
      prev.some(x => x.id === c.id) ? prev.filter(x => x.id !== c.id) : [...prev, c]
    );
  };

  const createCampaign = async () => {
    if (!form.name || !form.subject) return;
    if (recipientMode === "group" && !form.groupId) return;
    if (recipientMode === "contacts" && selectedContacts.length === 0) return;
    const recipients = {
      sendToAll: recipientMode === "all",
      groupId: recipientMode === "group" ? form.groupId : "",
      contactIds: recipientMode === "contacts" ? selectedContacts.map(c => c.id) : [],
    };
    const body = source === "article"
      ? { ...form, ...recipients, templateSlug: "" }
      : { ...form, ...recipients, articleId: "" };
    const r = await fetch("/api/admin/email-campaigns", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
    });
    if (r.ok) {
      toast({ title: "Campaign created" });
      setShowNew(false);
      setForm(emptyForm);
      setSource("template");
      setArticlePreview(null);
      setTestSentMsg(null);
      setRecipientMode("all");
      setSelectedContacts([]);
      setContactSearch("");
      onRefresh();
    } else {
      const d = await r.json();
      toast({ title: "Error", description: d.error, variant: "destructive" });
    }
  };

  const deleteCampaign = async (id: string) => {
    await fetch("/api/admin/email-campaigns", {
      method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }),
    });
    onRefresh();
  };

  const pauseCampaign = async (id: string) => {
    await fetch(`/api/admin/email-campaigns/${id}/send`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "pause" }),
    });
    setDispatching(false);
    onRefresh();
  };

  // Prepares the job queue and fires the first batch immediately for instant
  // feedback. Every batch after that is picked up automatically by the
  // server-side scheduler (lib/background-jobs.ts) roughly once a minute —
  // this tab (and this browser) can be closed right after this call returns
  // and the remaining batches still go out on schedule.
  const startCampaign = async (campaign: EmailCampaign) => {
    setActiveCampaignId(campaign.id);
    setDispatchLog([]);
    setDispatching(true);

    const prepRes = await fetch(`/api/admin/email-campaigns/${campaign.id}/send`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "prepare" }),
    });
    const prepData = await prepRes.json();
    if (!prepRes.ok) {
      toast({ title: "Error", description: prepData.error, variant: "destructive" });
      setDispatching(false);
      return;
    }
    setDispatchLog(prev => [...prev, `✅ Prepared ${prepData.prepared} recipients in ${prepData.batches} batches`]);

    const res = await fetch(`/api/admin/email-campaigns/${campaign.id}/send`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "dispatch" }),
    });
    const data = await res.json();
    if (!res.ok) {
      setDispatchLog(prev => [...prev, `❌ Error: ${data.error}`]);
    } else if (data.done) {
      setDispatchLog(prev => [...prev, `🎉 Campaign completed! All emails sent.`]);
    } else {
      setDispatchLog(prev => [...prev, `📤 Batch ${data.batchNumber + 1}: ${data.sent} sent, ${data.failed} failed — ${data.remaining} remaining`]);
      setDispatchLog(prev => [...prev, `✅ Remaining batches continue automatically on the server — you can close this tab.`]);
    }
    setDispatching(false);
    onRefresh();
  };

  const recipientCount = recipientMode === "all" ? contactTotal
    : recipientMode === "group" ? (groups.find(g => g.id === form.groupId)?._count.members ?? 0)
    : selectedContacts.length;
  const estimatedMin = Math.ceil(recipientCount / form.batchSize) * (form.batchIntervalMs / 60000);

  return (
    <div className="space-y-4 mt-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">{campaigns.length} campaign(s)</p>
        <Button size="sm" onClick={() => setShowNew(true)}><Plus className="h-4 w-4 mr-1.5" />New Campaign</Button>
      </div>

      {showNew && (
        <Card className="border-primary/30">
          <CardHeader className="pb-3"><CardTitle className="text-base">New Campaign</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {/* Content source */}
            <div className="space-y-1.5">
              <Label>What are you sending?</Label>
              <div className="flex rounded-lg border overflow-hidden w-fit">
                <button
                  type="button"
                  onClick={() => setSource("template")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors ${source === "template" ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground hover:bg-muted/50"}`}
                >
                  <FileText className="h-3.5 w-3.5" />Custom Template
                </button>
                <button
                  type="button"
                  onClick={() => setSource("article")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors border-l ${source === "article" ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground hover:bg-muted/50"}`}
                >
                  <Newspaper className="h-3.5 w-3.5" />Article Newsletter
                </button>
              </div>
              <p className="text-[11px] text-muted-foreground">
                {source === "template"
                  ? "Uses one of your saved email templates. You can also send article newsletters directly from an article's \"Notify\" button."
                  : "Sends a bilingual copy of a published article (EN/PT, matching each contact's language) — same content your subscribers get when notified from the Articles page."}
              </p>
            </div>

            {source === "article" ? (
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label>Article</Label>
                  <select
                    className="w-full border rounded-md px-3 py-2 text-sm bg-background"
                    value={form.articleId}
                    onChange={e => pickArticle(e.target.value)}
                    disabled={articlesLoading}
                  >
                    <option value="">{articlesLoading ? "Loading articles…" : "— Select a published article —"}</option>
                    {articles.map(a => <option key={a.id} value={a.id}>{a.titleEn || a.title}</option>)}
                  </select>
                </div>

                {form.articleId && (
                  <div className="border rounded-xl overflow-hidden bg-muted/20">
                    <div className="flex items-center justify-between px-3 py-2 border-b bg-background">
                      <span className="text-xs font-medium flex items-center gap-1.5"><Eye className="h-3.5 w-3.5" />Preview</span>
                      <div className="flex rounded-lg border overflow-hidden">
                        <button type="button" onClick={() => changePreviewLocale("en")} className={`px-2.5 py-1 text-xs font-medium ${previewLocale === "en" ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground"}`}>EN</button>
                        <button type="button" onClick={() => changePreviewLocale("pt")} className={`px-2.5 py-1 text-xs font-medium border-l ${previewLocale === "pt" ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground"}`}>PT-BR</button>
                      </div>
                    </div>
                    {previewLoading ? (
                      <div className="h-64 flex items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
                    ) : articlePreview ? (
                      <>
                        <div className="px-3 py-2 text-xs border-b bg-background">
                          <span className="font-medium text-foreground">Subject: </span>{articlePreview.subject}
                        </div>
                        <iframe title="Article email preview" srcDoc={articlePreview.html} className="w-full h-64 bg-white" />
                      </>
                    ) : (
                      <div className="h-24 flex items-center justify-center text-xs text-muted-foreground">Preview unavailable</div>
                    )}
                    <div className="flex items-center gap-2 p-3 border-t bg-background">
                      <Input type="email" placeholder="you@example.com" value={testEmail} onChange={e => setTestEmail(e.target.value)} className="flex-1 h-8 text-sm" />
                      <Button variant="outline" size="sm" disabled={sendingTest || !testEmail.trim()} onClick={sendArticleTestEmail} className="gap-1.5 whitespace-nowrap">
                        {sendingTest ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                        Send test email
                      </Button>
                    </div>
                    {testSentMsg && (
                      <p className={`text-xs font-medium px-3 pb-3 ${testSentMsg.ok ? "text-emerald-600" : "text-destructive"}`}>{testSentMsg.text}</p>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label>Template</Label>
                  <Link href="/admin/email-templates" target="_blank" className="text-xs text-primary hover:underline">
                    Manage templates →
                  </Link>
                </div>
                <select className="w-full border rounded-md px-3 py-2 text-sm bg-background" value={form.templateSlug} onChange={e => setForm({ ...form, templateSlug: e.target.value })}>
                  <option value="">— Select template —</option>
                  {templates.map(t => <option key={t.slug} value={t.slug}>{t.name}</option>)}
                </select>
                {templates.length === 0 && (
                  <p className="text-[11px] text-amber-600">No templates yet — click "Manage templates" above to create one.</p>
                )}
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Campaign Name <span className="text-muted-foreground font-normal">(internal only)</span></Label>
                <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="January Newsletter" />
              </div>
              <div className="space-y-1.5">
                <Label>Email Subject <span className="text-muted-foreground font-normal">{source === "article" ? "(shown in the list below only)" : "(what recipients see)"}</span></Label>
                <Input value={form.subject} onChange={e => setForm({ ...form, subject: e.target.value })} placeholder="Health tips from BPR" />
                {source === "article" && (
                  <p className="text-[11px] text-muted-foreground">Each recipient actually gets the article's own EN or PT title as the subject, matching their language.</p>
                )}
              </div>
            </div>
            {source === "template" && (
              <div className="space-y-1.5">
                <Label>Preheader <span className="text-muted-foreground font-normal">(optional preview text)</span></Label>
                <Input value={form.preheader} onChange={e => setForm({ ...form, preheader: e.target.value })} placeholder="Short preview text..." />
              </div>
            )}

            <div className="p-3 bg-muted/40 rounded-lg space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wide">Recipients</p>
              <div className="flex flex-col gap-2">
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="radio" name="recipientMode" checked={recipientMode === "all"} onChange={() => setRecipientMode("all")} className="rounded" />
                  Send to ALL subscribed contacts ({contactTotal})
                </label>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="radio" name="recipientMode" checked={recipientMode === "group"} onChange={() => setRecipientMode("group")} className="rounded" />
                  Send to a group
                </label>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="radio" name="recipientMode" checked={recipientMode === "contacts"} onChange={() => setRecipientMode("contacts")} className="rounded" />
                  Pick specific contacts / patients
                </label>
              </div>

              {recipientMode === "group" && (
                <select className="w-full border rounded-md px-3 py-2 text-sm bg-background" value={form.groupId} onChange={e => setForm({ ...form, groupId: e.target.value })}>
                  <option value="">— Select group —</option>
                  {groups.map(g => <option key={g.id} value={g.id}>{g.name} ({g._count.members})</option>)}
                </select>
              )}

              {recipientMode === "contacts" && (
                <div className="space-y-2">
                  {selectedContacts.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {selectedContacts.map(c => (
                        <span key={c.id} className="inline-flex items-center gap-1 text-xs bg-primary/10 text-primary rounded-full px-2.5 py-1">
                          {[c.firstName, c.lastName].filter(Boolean).join(" ") || c.email}
                          <button type="button" onClick={() => toggleContact(c)} className="hover:text-destructive"><X className="h-3 w-3" /></button>
                        </span>
                      ))}
                    </div>
                  )}
                  <Input
                    placeholder="Search contacts by name or email..."
                    value={contactSearch}
                    onChange={e => setContactSearch(e.target.value)}
                    className="text-sm"
                  />
                  <div className="border rounded-md max-h-48 overflow-y-auto bg-background">
                    {contactSearchLoading ? (
                      <div className="p-3 flex justify-center"><Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /></div>
                    ) : contactResults.length === 0 ? (
                      <p className="p-3 text-xs text-muted-foreground text-center">{contactSearch ? "No contacts found." : "Type to search contacts."}</p>
                    ) : (
                      contactResults.map(c => {
                        const checked = selectedContacts.some(x => x.id === c.id);
                        return (
                          <label key={c.id} className="flex items-center gap-2 px-3 py-2 text-sm cursor-pointer hover:bg-muted/50 border-b last:border-b-0">
                            <input type="checkbox" checked={checked} onChange={() => toggleContact(c)} className="rounded" />
                            <span className="truncate">{[c.firstName, c.lastName].filter(Boolean).join(" ") || "—"} <span className="text-muted-foreground">({c.email})</span></span>
                          </label>
                        );
                      })
                    )}
                  </div>
                  <p className="text-[11px] text-muted-foreground">{selectedContacts.length} selected</p>
                </div>
              )}
            </div>

            <div className="p-3 bg-amber-50 rounded-lg border border-amber-200 space-y-3">
              <p className="text-xs font-semibold text-amber-800 uppercase tracking-wide flex items-center gap-1.5">
                <Settings className="h-3.5 w-3.5" />Throttle Settings (Hostinger protection)
              </p>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs">Emails per batch</Label>
                  <Input type="number" min={1} max={50} value={form.batchSize} onChange={e => setForm({ ...form, batchSize: parseInt(e.target.value) || 10 })} />
                  <p className="text-[10px] text-muted-foreground">Recommended: 5–15 per batch</p>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Interval between batches</Label>
                  <select className="w-full border rounded-md px-3 py-2 text-sm bg-background" value={form.batchIntervalMs} onChange={e => setForm({ ...form, batchIntervalMs: parseInt(e.target.value) })}>
                    <option value={60000}>1 minute</option>
                    <option value={120000}>2 minutes</option>
                    <option value={300000}>5 minutes</option>
                    <option value={600000}>10 minutes</option>
                    <option value={900000}>15 minutes</option>
                    <option value={1800000}>30 minutes</option>
                  </select>
                </div>
              </div>
              <p className="text-[10px] text-amber-700">
                Estimated: ~{estimatedMin} min for {recipientCount} contacts
              </p>
            </div>

            <div className="flex gap-2">
              <Button
                onClick={createCampaign}
                disabled={!form.name || !form.subject || (source === "article" && !form.articleId) || (recipientMode === "group" && !form.groupId) || (recipientMode === "contacts" && selectedContacts.length === 0)}
              ><Check className="h-4 w-4 mr-1.5" />Create Campaign</Button>
              <Button variant="outline" onClick={() => { setShowNew(false); setSource("template"); setForm(emptyForm); setArticlePreview(null); setTestSentMsg(null); setRecipientMode("all"); setSelectedContacts([]); setContactSearch(""); }}><X className="h-4 w-4 mr-1.5" />Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : campaigns.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Mail className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">No campaigns yet. Create your first campaign above.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {campaigns.map(c => (
            <Card key={c.id} className={activeCampaignId === c.id ? "border-primary" : ""}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-semibold text-sm truncate">{c.name}</p>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[c.status] || "bg-muted text-muted-foreground"}`}>{c.status}</span>
                      {c.articleId && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-primary/10 text-primary flex items-center gap-1">
                          <Newspaper className="h-2.5 w-2.5" />Article
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground truncate mb-2">{c.subject}</p>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
                      <span>👥 {c.sendToAll ? "All contacts" : c.groupId ? (groups.find(g => g.id === c.groupId)?.name || "Group") : `${c.contactIds?.length || 0} selected contact(s)`}</span>
                      <span>📦 {c.batchSize}/batch · {c.batchIntervalMs / 60000}min interval</span>
                      {c.totalRecipients > 0 && <span>📤 {c.sentCount}/{c.totalRecipients} sent</span>}
                      {c.failedCount > 0 && <span className="text-red-500">❌ {c.failedCount} failed</span>}
                    </div>
                    {c.totalRecipients > 0 && (
                      <div className="mt-2 h-1.5 bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${Math.round((c.sentCount / c.totalRecipients) * 100)}%` }} />
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {["DRAFT", "PAUSED"].includes(c.status) && (
                      <Button size="sm" className="gap-1.5 bg-green-600 hover:bg-green-700 text-white" onClick={() => startCampaign(c)} disabled={dispatching}>
                        <Play className="h-3.5 w-3.5" />{c.status === "PAUSED" ? "Resume" : "Send"}
                      </Button>
                    )}
                    {c.status === "SENDING" && (
                      <Button size="sm" variant="outline" className="gap-1.5" onClick={() => pauseCampaign(c.id)}>
                        <Pause className="h-3.5 w-3.5" />Pause
                      </Button>
                    )}
                    {["DRAFT", "PAUSED", "CANCELLED"].includes(c.status) && (
                      <Button size="sm" variant="ghost" className="text-destructive h-8 w-8 p-0" onClick={() => deleteCampaign(c.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
                {activeCampaignId === c.id && dispatchLog.length > 0 && (
                  <div className="mt-3 bg-muted/50 rounded-md p-3 space-y-1 max-h-40 overflow-y-auto">
                    {dispatchLog.map((line, i) => <p key={i} className="text-xs font-mono">{line}</p>)}
                    {dispatching && <p className="text-xs font-mono text-primary animate-pulse">● Sending in progress...</p>}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
