"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, FlaskConical, RefreshCw, ClipboardCheck } from "lucide-react";
import { useLocale } from "@/hooks/use-locale";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { gbp } from "@/lib/lab-catalog";

/**
 * O catálogo de exames como a clínica o decide (081, T-2): o custo vem do
 * laboratório; o preço de venda e o interruptor são do Bruno, pela tela — não
 * por seed nem por script meu.
 */

interface Product {
  id: string; code: string; name: string; category: string | null; biomarkers: string[];
  sampleType: string | null; turnaroundDays: number | null;
  costPrice: number | null; retailPrice: number; margin: { gbp: number; pct: number }; isActive: boolean;
  lastSyncedAt: string | null;
}

const UI = {
  "en-GB": {
    title: "Lab tests", subtitle: "Home kits from the laboratory. You set the sale price; the margin is yours.",
    orders: "Orders", awaiting: (n: number) => `${n} result${n === 1 ? "" : "s"} waiting for your review`,
    reviewDays: "Review window", reviewHint: "Working days you promise the patient between the result arriving and your release. The app shows this number.",
    visible: "Show in the patient app", visibleHint: "Off, the Laboratory area disappears from every patient's app the next time it asks — no new build, no update.",
    visibleOn: "Patients can see the Laboratory area.", visibleOff: "Hidden. Nobody sees the Laboratory area in the app.",
    sync: "Refresh from the laboratory", syncHint: "Needs the laboratory's API token — not connected yet.",
    test: "Test", cost: "Cost", sale: "Sale price", margin: "Margin", active: "On sale",
    days: (n: number | null) => (n ? `${n} working day${n === 1 ? "" : "s"}` : "—"),
    empty: "No products yet. The catalogue is seeded on deploy.",
    failed: "Could not load the catalogue.", saved: "Saved.", notSaved: "That did not save.",
    readOnly: "Only the clinic owner changes prices.",
    belowTitle: "Selling at or below cost", belowBody: (cost: number, sale: number) =>
      `The laboratory charges ${gbp(cost)} for this test and you are about to sell it for ${gbp(sale)}. Keep it anyway?`,
    keep: "Keep it", cancel: "Cancel",
    inactiveHint: "Off. Patients cannot see it.",
  },
  "pt-BR": {
    title: "Exames", subtitle: "Kits de casa do laboratório. Você define o preço de venda; a margem é sua.",
    orders: "Pedidos", awaiting: (n: number) => `${n} resultado${n === 1 ? "" : "s"} esperando a sua revisão`,
    reviewDays: "Prazo de revisão", reviewHint: "Dias úteis que você promete ao paciente entre o resultado chegar e a sua liberação. O app mostra este número.",
    visible: "Mostrar no app do paciente", visibleHint: "Desligado, a área Laboratório some do app de todos os pacientes na próxima vez que ele pergunta — sem build novo, sem update.",
    visibleOn: "Os pacientes veem a área Laboratório.", visibleOff: "Escondido. Ninguém vê a área Laboratório no app.",
    sync: "Atualizar do laboratório", syncHint: "Precisa do token da API do laboratório — ainda não conectado.",
    test: "Exame", cost: "Custo", sale: "Preço de venda", margin: "Margem", active: "À venda",
    days: (n: number | null) => (n ? `${n} dia${n === 1 ? "" : "s"} útil${n === 1 ? "" : "eis"}` : "—"),
    empty: "Nenhum produto ainda. O catálogo é semeado no deploy.",
    failed: "Não foi possível carregar o catálogo.", saved: "Salvo.", notSaved: "Não salvou.",
    readOnly: "Só o dono da clínica muda preços.",
    belowTitle: "Vendendo igual ou abaixo do custo", belowBody: (cost: number, sale: number) =>
      `O laboratório cobra ${gbp(cost)} por este exame e você está prestes a vendê-lo por ${gbp(sale)}. Manter assim mesmo?`,
    keep: "Manter", cancel: "Cancelar",
    inactiveHint: "Desligado. O paciente não vê.",
  },
} as const;

export default function LabCatalogPage() {
  const { locale } = useLocale();
  const ui = UI[locale === "pt-BR" ? "pt-BR" : "en-GB"];
  const { toast } = useToast();

  const [products, setProducts] = useState<Product[] | null>(null);
  const [canSetPrices, setCanSetPrices] = useState(false);
  const [failed, setFailed] = useState(false);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [awaiting, setAwaiting] = useState(0);
  const [reviewDays, setReviewDays] = useState<number | null>(null);
  const [visible, setVisible] = useState<boolean | null>(null);
  const [confirm, setConfirm] = useState<{ id: string; patch: Record<string, unknown>; cost: number; sale: number } | null>(null);

  const load = useCallback(async () => {
    try {
      const [p, o, s] = await Promise.all([
        fetch("/api/admin/labs/products").then((r) => (r.ok ? r.json() : Promise.reject(r.status))),
        fetch("/api/admin/labs/orders").then((r) => (r.ok ? r.json() : null)).catch(() => null),
        fetch("/api/admin/labs/settings").then((r) => (r.ok ? r.json() : null)).catch(() => null),
      ]);
      setProducts(p.products);
      setCanSetPrices(!!p.canSetPrices);
      setAwaiting(o?.totals?.awaitingRelease ?? 0);
      setReviewDays(s?.labReviewDays ?? null);
      setVisible(typeof s?.labVisibleInApp === "boolean" ? s.labVisibleInApp : null);
      setFailed(false);
    } catch {
      setFailed(true);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const patch = async (id: string, body: Record<string, unknown>) => {
    setSaving(id);
    try {
      const r = await fetch(`/api/admin/labs/products/${id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
      });
      const data = await r.json().catch(() => ({}));
      if (r.status === 409 && data.code === "below_cost") {
        setConfirm({ id, patch: body, cost: data.costPrice, sale: data.retailPrice });
        return;
      }
      if (!r.ok) {
        toast({ title: ui.notSaved, description: locale === "pt-BR" ? data.errorPt || data.error : data.error, variant: "destructive" });
        return;
      }
      setProducts((prev) => prev?.map((p) => (p.id === id ? { ...p, retailPrice: data.retailPrice, isActive: data.isActive, margin: data.margin } : p)) ?? prev);
      setDraft((d) => { const n = { ...d }; delete n[id]; return n; });
      toast({ title: ui.saved });
    } finally {
      setSaving(null);
    }
  };

  const savePrice = (p: Product) => {
    const raw = draft[p.id];
    if (raw === undefined) return;
    const n = Number(raw.replace(",", "."));
    if (!Number.isFinite(n) || n === p.retailPrice) { setDraft((d) => { const c = { ...d }; delete c[p.id]; return c; }); return; }
    void patch(p.id, { retailPrice: n });
  };

  const saveSettings = async (body: Record<string, unknown>) => {
    const r = await fetch("/api/admin/labs/settings", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const data = await r.json().catch(() => ({}));
    if (r.ok) {
      if (typeof data.labReviewDays === "number") setReviewDays(data.labReviewDays);
      if (typeof data.labVisibleInApp === "boolean") setVisible(data.labVisibleInApp);
      toast({ title: ui.saved });
    } else {
      toast({ title: ui.notSaved, description: locale === "pt-BR" ? data.errorPt || data.error : data.error, variant: "destructive" });
      void load();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-2"><FlaskConical className="h-6 w-6" /> {ui.title}</h1>
          <p className="text-sm text-muted-foreground mt-1">{ui.subtitle}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" disabled title={ui.syncHint}>
            <RefreshCw className="h-4 w-4 mr-1.5" /> {ui.sync}
          </Button>
          <Link href="/admin/labs/orders">
            <Button size="sm" variant={awaiting > 0 ? "default" : "outline"}>
              <ClipboardCheck className="h-4 w-4 mr-1.5" /> {awaiting > 0 ? ui.awaiting(awaiting) : ui.orders}
            </Button>
          </Link>
        </div>
      </div>

      <Card>
        <CardContent className="pt-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium">{ui.visible}</p>
            <p className="text-xs text-muted-foreground max-w-xl">{ui.visibleHint}</p>
            {visible !== null && (
              <p className={`text-xs mt-1 ${visible ? "text-ba1-ok" : "text-muted-foreground"}`} data-testid="lab-visible-state">
                {visible ? ui.visibleOn : ui.visibleOff}
              </p>
            )}
          </div>
          <Switch
            checked={!!visible} disabled={!canSetPrices || visible === null} data-testid="lab-visible-toggle"
            onCheckedChange={(v) => { setVisible(v); void saveSettings({ labVisibleInApp: v }); }}
          />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6 flex flex-wrap items-center gap-4">
          <div>
            <p className="text-sm font-medium">{ui.reviewDays}</p>
            <p className="text-xs text-muted-foreground max-w-xl">{ui.reviewHint}</p>
          </div>
          <Input
            type="number" min={1} max={14} className="w-24" data-testid="lab-review-days"
            value={reviewDays ?? ""} disabled={!canSetPrices || reviewDays === null}
            onChange={(e) => setReviewDays(Number(e.target.value))}
            onBlur={(e) => { const n = Number(e.target.value); if (Number.isInteger(n) && n >= 1 && n <= 14) void saveSettings({ labReviewDays: n }); }}
          />
        </CardContent>
      </Card>

      {!canSetPrices && products && <p className="text-xs text-muted-foreground">{ui.readOnly}</p>}

      <Card>
        <CardHeader><CardTitle className="text-base">{ui.title}</CardTitle></CardHeader>
        <CardContent>
          {failed ? (
            <p className="text-sm text-ba1-bad">{ui.failed}</p>
          ) : products === null ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> …</div>
          ) : products.length === 0 ? (
            <p className="text-sm text-muted-foreground">{ui.empty}</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{ui.test}</TableHead>
                  <TableHead className="text-right">{ui.cost}</TableHead>
                  <TableHead className="text-right">{ui.sale}</TableHead>
                  <TableHead className="text-right">{ui.margin}</TableHead>
                  <TableHead className="text-center">{ui.active}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.map((p) => (
                  <TableRow key={p.id} data-testid={`lab-product-${p.code}`} className={p.isActive ? "" : "opacity-70"}>
                    <TableCell>
                      <div className="font-medium">{p.name} <span className="text-xs text-muted-foreground font-mono ml-1">{p.code}</span></div>
                      <div className="text-xs text-muted-foreground">
                        {p.category ? <Badge variant="outline" className="mr-2">{p.category}</Badge> : null}
                        {p.biomarkers.length} {locale === "pt-BR" ? "biomarcador(es)" : "biomarker(s)"} · {ui.days(p.turnaroundDays)}
                      </div>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{p.costPrice != null ? gbp(p.costPrice) : "—"}</TableCell>
                    <TableCell className="text-right">
                      {canSetPrices ? (
                        <Input
                          className="w-28 ml-auto text-right tabular-nums" inputMode="decimal" data-testid={`lab-price-${p.code}`}
                          value={draft[p.id] ?? String(p.retailPrice)}
                          disabled={saving === p.id}
                          onChange={(e) => setDraft((d) => ({ ...d, [p.id]: e.target.value }))}
                          onBlur={() => savePrice(p)}
                          onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
                        />
                      ) : (
                        <span className="tabular-nums">{gbp(p.retailPrice)}</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      <span className={p.margin.gbp <= 0 ? "text-amber-600" : ""}>{gbp(p.margin.gbp)}</span>
                      <span className="text-xs text-muted-foreground ml-1">({Math.round(p.margin.pct * 100)}%)</span>
                    </TableCell>
                    <TableCell className="text-center">
                      <Switch
                        checked={p.isActive} disabled={!canSetPrices || saving === p.id} data-testid={`lab-active-${p.code}`}
                        onCheckedChange={(v) => void patch(p.id, { isActive: v })}
                        title={p.isActive ? undefined : ui.inactiveHint}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={!!confirm} onOpenChange={(o) => { if (!o) setConfirm(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{ui.belowTitle}</AlertDialogTitle>
            <AlertDialogDescription>{confirm ? ui.belowBody(confirm.cost, confirm.sale) : ""}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => { if (confirm) setDraft((d) => { const c = { ...d }; delete c[confirm.id]; return c; }); setConfirm(null); }}>{ui.cancel}</AlertDialogCancel>
            <AlertDialogAction data-testid="lab-confirm-below-cost" onClick={() => { if (confirm) { const c = confirm; setConfirm(null); void patch(c.id, { ...c.patch, confirmBelowCost: true }); } }}>{ui.keep}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
