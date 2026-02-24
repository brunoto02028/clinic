"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Mail, Plus, Trash2, Play, Pause, Check, X, Settings, Loader2 } from "lucide-react";

export interface EmailCampaign {
  id: string; name: string; subject: string; status: string;
  totalRecipients: number; sentCount: number; failedCount: number;
  batchSize: number; batchIntervalMs: number;
  groupId?: string; sendToAll: boolean; templateSlug?: string; createdAt: string;
}
export interface EmailGroup { id: string; name: string; _count: { members: number }; }
export interface EmailTemplate { id: string; slug: string; name: string; }

const STATUS_COLORS: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-700",
  SENDING: "bg-yellow-100 text-yellow-700",
  PAUSED: "bg-orange-100 text-orange-700",
  COMPLETED: "bg-green-100 text-green-700",
  CANCELLED: "bg-red-100 text-red-700",
};

interface Props {
  campaigns: EmailCampaign[];
  groups: EmailGroup[];
  templates: EmailTemplate[];
  contactTotal: number;
  loading: boolean;
  onRefresh: () => void;
}

export default function CampaignsTab({ campaigns, groups, templates, contactTotal, loading, onRefresh }: Props) {
  const { toast } = useToast();
  const [showNew, setShowNew] = useState(false);
  const [activeCampaignId, setActiveCampaignId] = useState<string | null>(null);
  const [dispatching, setDispatching] = useState(false);
  const [dispatchLog, setDispatchLog] = useState<string[]>([]);
  const [form, setForm] = useState({
    name: "", subject: "", templateSlug: "", preheader: "",
    groupId: "", sendToAll: false, batchSize: 10, batchIntervalMs: 300000,
  });

  const createCampaign = async () => {
    if (!form.name || !form.subject) return;
    const r = await fetch("/api/admin/email-campaigns", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form),
    });
    if (r.ok) {
      toast({ title: "Campaign created" });
      setShowNew(false);
      setForm({ name: "", subject: "", templateSlug: "", preheader: "", groupId: "", sendToAll: false, batchSize: 10, batchIntervalMs: 300000 });
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

    const dispatchBatch = async (): Promise<void> => {
      const res = await fetch(`/api/admin/email-campaigns/${campaign.id}/send`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "dispatch" }),
      });
      const data = await res.json();
      if (!res.ok) {
        setDispatchLog(prev => [...prev, `❌ Error: ${data.error}`]);
        setDispatching(false);
        return;
      }
      if (data.done) {
        setDispatchLog(prev => [...prev, `🎉 Campaign completed! All emails sent.`]);
        setDispatching(false);
        onRefresh();
        return;
      }
      setDispatchLog(prev => [...prev, `📤 Batch ${data.batchNumber + 1}: ${data.sent} sent, ${data.failed} failed — ${data.remaining} remaining`]);
      const ms = data.nextDispatchMs || campaign.batchIntervalMs;
      setDispatchLog(prev => [...prev, `⏳ Waiting ${Math.round(ms / 1000)}s before next batch...`]);
      setTimeout(dispatchBatch, ms);
    };

    await dispatchBatch();
  };

  const estimatedMin = Math.ceil(contactTotal / form.batchSize) * (form.batchIntervalMs / 60000);

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
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Campaign Name</Label>
                <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="January Newsletter" />
              </div>
              <div className="space-y-1.5">
                <Label>Email Subject</Label>
                <Input value={form.subject} onChange={e => setForm({ ...form, subject: e.target.value })} placeholder="Health tips from BPR" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Template</Label>
                <select className="w-full border rounded-md px-3 py-2 text-sm bg-background" value={form.templateSlug} onChange={e => setForm({ ...form, templateSlug: e.target.value })}>
                  <option value="">— Select template —</option>
                  {templates.map(t => <option key={t.slug} value={t.slug}>{t.name}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label>Preheader</Label>
                <Input value={form.preheader} onChange={e => setForm({ ...form, preheader: e.target.value })} placeholder="Short preview text..." />
              </div>
            </div>

            <div className="p-3 bg-muted/40 rounded-lg space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wide">Recipients</p>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={form.sendToAll} onChange={e => setForm({ ...form, sendToAll: e.target.checked, groupId: "" })} className="rounded" />
                Send to ALL subscribed contacts ({contactTotal})
              </label>
              {!form.sendToAll && (
                <select className="w-full border rounded-md px-3 py-2 text-sm bg-background" value={form.groupId} onChange={e => setForm({ ...form, groupId: e.target.value })}>
                  <option value="">— Select group —</option>
                  {groups.map(g => <option key={g.id} value={g.id}>{g.name} ({g._count.members})</option>)}
                </select>
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
                Estimated: ~{estimatedMin} min for {contactTotal} contacts
              </p>
            </div>

            <div className="flex gap-2">
              <Button onClick={createCampaign} disabled={!form.name || !form.subject}><Check className="h-4 w-4 mr-1.5" />Create Campaign</Button>
              <Button variant="outline" onClick={() => setShowNew(false)}><X className="h-4 w-4 mr-1.5" />Cancel</Button>
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
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[c.status] || "bg-gray-100 text-gray-600"}`}>{c.status}</span>
                    </div>
                    <p className="text-xs text-muted-foreground truncate mb-2">{c.subject}</p>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
                      <span>👥 {c.sendToAll ? "All contacts" : groups.find(g => g.id === c.groupId)?.name || "No group"}</span>
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
