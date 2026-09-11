"use client";

// Billing panel on the student's detail page (personal-trainer product, act.28).
// If the studio hasn't connected Stripe, shows a "Connect payouts" CTA. Once
// connected, the trainer creates billing plans and sees the student's payment
// status. All money flows to the trainer's own connected Stripe account.
import { useEffect, useState, useCallback } from "react";
import { Loader2, Plus, Trash2, CreditCard, ExternalLink, CheckCircle2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useVocab } from "@/hooks/use-vocab";

interface Plan {
  id: string;
  name: string;
  description: string | null;
  amountCents: number;
  currency: string;
  interval: "ONE_TIME" | "WEEKLY" | "MONTHLY" | "YEARLY";
  status: string;
}
interface Sub {
  id: string;
  billingPlanId: string;
  status: string;
  currentPeriodEnd: string | null;
}
interface ConnectStatus {
  connected: boolean;
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  actionNeeded: boolean;
}

const INTERVAL_LABEL: Record<string, string> = {
  ONE_TIME: "one-off", WEEKLY: "/week", MONTHLY: "/month", YEARLY: "/year",
};
const money = (cents: number) => `£${(cents / 100).toFixed(2)}`;

export default function BillingPanel({ studentId }: { studentId: string }) {
  const { relabel } = useVocab();
  const [status, setStatus] = useState<ConnectStatus | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [subs, setSubs] = useState<Sub[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [connecting, setConnecting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ name: "", description: "", amount: "", interval: "MONTHLY" as Plan["interval"] });

  const load = useCallback(async () => {
    setError("");
    try {
      const [s, p] = await Promise.all([
        fetch("/api/admin/connect/status").then((r) => (r.ok ? r.json() : null)),
        fetch(`/api/admin/billing-plans?studentId=${encodeURIComponent(studentId)}`).then((r) => (r.ok ? r.json() : { plans: [], subscriptions: [] })),
      ]);
      setStatus(s);
      setPlans(p.plans || []);
      setSubs(p.subscriptions || []);
    } catch {
      setError("Could not load billing.");
    } finally {
      setLoading(false);
    }
  }, [studentId]);

  useEffect(() => { load(); }, [load]);

  async function connect() {
    setConnecting(true);
    try {
      const r = await fetch("/api/admin/connect/onboard", { method: "POST" });
      const d = await r.json();
      if (r.ok && d.url) window.location.href = d.url;
      else setError(d.error || "Could not start Stripe onboarding.");
    } catch {
      setError("Could not start Stripe onboarding.");
    } finally {
      setConnecting(false);
    }
  }

  async function createPlan() {
    setSaving(true); setError("");
    try {
      const amountCents = Math.round(parseFloat(form.amount) * 100);
      const r = await fetch("/api/admin/billing-plans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: form.name.trim(), description: form.description.trim() || null, amountCents, interval: form.interval }),
      });
      if (!r.ok) { const d = await r.json().catch(() => ({})); throw new Error(d?.error || String(r.status)); }
      setCreating(false);
      setForm({ name: "", description: "", amount: "", interval: "MONTHLY" });
      await load();
    } catch (e: any) {
      setError(e?.message || "Could not create the plan.");
    } finally {
      setSaving(false);
    }
  }

  async function archive(id: string) {
    if (!confirm("Archive this plan? Students can no longer subscribe to it (existing subscriptions keep running).")) return;
    const r = await fetch(`/api/admin/billing-plans/${id}`, { method: "DELETE" }).catch(() => null);
    if (!r || !r.ok) { setError("Could not archive."); return; }
    await load();
  }

  if (loading) return <div className="flex items-center gap-2 p-4 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading billing…</div>;

  // Not connected (or can't charge yet) → Connect CTA.
  if (!status?.chargesEnabled) {
    return (
      <div className="space-y-3">
        {error && <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
        <div className="rounded-lg border p-5 text-center space-y-3">
          <CreditCard className="mx-auto h-8 w-8 text-primary/60" />
          <div>
            <p className="font-medium">{status?.connected ? "Finish your Stripe setup" : "Get paid by your students"}</p>
            <p className="text-sm text-muted-foreground mt-1">
              {status?.actionNeeded
                ? "Stripe needs more details before you can charge. Continue your setup."
                : "Connect your own Stripe account to charge students. Money goes straight to you."}
            </p>
          </div>
          <Button onClick={connect} disabled={connecting} className="gap-2">
            {connecting ? <Loader2 className="h-4 w-4 animate-spin" /> : <ExternalLink className="h-4 w-4" />}
            {status?.connected ? "Continue setup" : "Connect Stripe"}
          </Button>
        </div>
      </div>
    );
  }

  const activePlans = plans.filter((p) => p.status === "ACTIVE");

  return (
    <div className="space-y-4" data-testid="billing-panel">
      {error && <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      {/* Connect status strip */}
      <div className="flex items-center gap-2 text-xs">
        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
        <span className="text-muted-foreground">Stripe connected</span>
        {!status.payoutsEnabled && (
          <span className="flex items-center gap-1 text-amber-600"><AlertTriangle className="h-3 w-3" /> payouts pending</span>
        )}
        {status.actionNeeded && (
          <button onClick={connect} className="flex items-center gap-1 text-amber-600 underline"><AlertTriangle className="h-3 w-3" /> action needed</button>
        )}
      </div>

      {!creating && <Button onClick={() => setCreating(true)} className="gap-2" data-testid="billing-new"><Plus className="h-4 w-4" /> New plan</Button>}

      {creating && (
        <div className="rounded-md border p-3 space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <div className="col-span-2">
              <Label className="text-[10px] text-muted-foreground">Plan name *</Label>
              <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="e.g. Monthly coaching" className="h-8" data-testid="bp-name" />
            </div>
            <div>
              <Label className="text-[10px] text-muted-foreground">Amount (£) *</Label>
              <Input type="number" min={0.3} step="0.01" value={form.amount} onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))} className="h-8" data-testid="bp-amount" />
            </div>
            <div>
              <Label className="text-[10px] text-muted-foreground">Billing</Label>
              <select
                value={form.interval}
                onChange={(e) => setForm((f) => ({ ...f, interval: e.target.value as Plan["interval"] }))}
                className="h-8 w-full rounded border bg-background px-2 text-sm"
                data-testid="bp-interval"
              >
                <option value="ONE_TIME">One-off</option>
                <option value="WEEKLY">Weekly</option>
                <option value="MONTHLY">Monthly</option>
                <option value="YEARLY">Yearly</option>
              </select>
            </div>
            <div className="col-span-2">
              <Label className="text-[10px] text-muted-foreground">Description</Label>
              <Input value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} className="h-8" />
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={createPlan} disabled={saving || !form.name.trim() || !form.amount} className="gap-2" data-testid="bp-save">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Create
            </Button>
            <Button variant="outline" onClick={() => setCreating(false)}>Cancel</Button>
          </div>
        </div>
      )}

      {activePlans.length === 0 && !creating && (
        <p className="text-sm text-muted-foreground">No billing plans yet. Create one to charge {relabel("this student")}.</p>
      )}

      <div className="space-y-2">
        {activePlans.map((p) => {
          const sub = subs.find((s) => s.billingPlanId === p.id);
          return (
            <div key={p.id} className="rounded-md border p-3 flex items-start justify-between gap-2" data-testid="billing-plan-row">
              <div>
                <p className="text-sm font-medium">{p.name} <span className="text-muted-foreground font-normal">{money(p.amountCents)} {INTERVAL_LABEL[p.interval]}</span></p>
                {p.description && <p className="text-[11px] text-muted-foreground">{p.description}</p>}
                {sub && (
                  <p className="text-[11px] mt-0.5">
                    <span className={`rounded px-1.5 ${sub.status === "ACTIVE" || sub.status === "PAID" ? "bg-emerald-500/20 text-emerald-500" : sub.status === "PAST_DUE" ? "bg-amber-500/20 text-amber-500" : "bg-muted text-muted-foreground"}`}>
                      {relabel("student")}: {sub.status}
                    </span>
                    {sub.currentPeriodEnd && <span className="text-muted-foreground ml-1">· renews {new Date(sub.currentPeriodEnd).toLocaleDateString("en-GB")}</span>}
                  </p>
                )}
              </div>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => archive(p.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
