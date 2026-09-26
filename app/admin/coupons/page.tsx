"use client";

import { useCallback, useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Loader2, Plus, Ticket, Trash2, Pencil, Users, X, FlaskConical, BarChart3,
} from "lucide-react";

/**
 * Cupons de desconto (084, T-2).
 *
 * A pergunta da tela é a mesma da exceção de preço da 082 — *para quem isto
 * vale?* — só que aqui a resposta tem prazo e limite, e a pessoa participa
 * digitando um código.
 *
 * Exame de laboratório não está entre os alcances, e a tela **diz isso**: uma
 * ausência sem explicação parece esquecimento, e alguém iria procurar o campo.
 */

const ESCOPOS = [
  { key: "CONSULTATION", label: "Consultation", hint: "A booking the patient makes themselves" },
  { key: "TREATMENT_SESSION", label: "Treatment session", hint: "A single in-person session" },
  { key: "PACKAGE", label: "Session package", hint: "A block of sessions bought up front" },
  { key: "TREATMENT_PLAN", label: "Treatment plan", hint: "A plan priced as a whole" },
  { key: "MEMBERSHIP", label: "Membership", hint: "Signing up to a subscription" },
] as const;

interface Coupon {
  id: string;
  code: string;
  description: string | null;
  discountPercent: number | null;
  discountAmount: number | null;
  currency: string;
  appliesTo: string[];
  patientId: string | null;
  patient: { id: string; firstName: string; lastName: string; email: string } | null;
  startsAt: string | null;
  endsAt: string | null;
  maxRedemptions: number | null;
  maxPerPatient: number;
  isActive: boolean;
  redemptions: { confirmed: number; started: number };
}

interface PatientRow {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

const VAZIO = {
  code: "",
  description: "",
  tipo: "percent" as "percent" | "amount",
  valor: "",
  appliesTo: [] as string[],
  patientId: "" as string,
  startsAt: "",
  endsAt: "",
  maxRedemptions: "",
  maxPerPatient: "1",
};

function janela(c: Coupon) {
  /**
   * Formatado em **UTC**, que é como a data foi guardada.
   *
   * O fim de uma janela é 23:59:59.999Z; no horário de verão britânico isso é
   * 00:59 do dia seguinte, e a lista mostrava `until 27/09` para um cupom que a
   * clínica pediu até 26/09 — enquanto o diálogo de edição mostrava 26 (N-2 do
   * review e do reteste). Duas telas discordando sobre a mesma linha.
   */
  const f = (s: string | null) =>
    s ? new Date(s).toLocaleDateString("en-GB", { timeZone: "UTC" }) : null;
  const i = f(c.startsAt);
  const t = f(c.endsAt);
  if (i && t) return `${i} → ${t}`;
  if (t) return `until ${t}`;
  if (i) return `from ${i}`;
  return "no end date";
}

export default function CouponsPage() {
  const { toast } = useToast();
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  // Sem isto o `catch` deixava a lista em `[]` e a tela escrevia "No coupons yet"
  // enquanto a clínica tinha três — um estado vazio que mente é pior que um erro
  // (F2 do QA da T-2).
  const [erro, setErro] = useState<string | null>(null);
  const [form, setForm] = useState({ ...VAZIO });
  const [editando, setEditando] = useState<Coupon | null>(null);
  const [aberto, setAberto] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [paraApagar, setParaApagar] = useState<Coupon | null>(null);
  const [busca, setBusca] = useState("");
  const [achados, setAchados] = useState<PatientRow[]>([]);
  const [alvo, setAlvo] = useState<PatientRow | null>(null);
  const [resgatesDe, setResgatesDe] = useState<Coupon | null>(null);
  const [resgates, setResgates] = useState<any | null>(null);

  const carregar = useCallback(async () => {
    setLoading(true);
    setErro(null);
    try {
      const r = await fetch("/api/admin/coupons");
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "Could not load coupons");
      setCoupons(j.coupons ?? []);
    } catch (e: any) {
      setErro(e.message);
      toast({ title: "Could not load coupons", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  // Busca de paciente para a mira — o mesmo padrão da tela de preços.
  useEffect(() => {
    if (busca.trim().length < 2) {
      setAchados([]);
      return;
    }
    const id = setTimeout(async () => {
      const r = await fetch(`/api/admin/patients?search=${encodeURIComponent(busca)}&limit=10`);
      if (r.ok) setAchados(await r.json());
    }, 300);
    return () => clearTimeout(id);
  }, [busca]);

  const abrirNovo = () => {
    setEditando(null);
    setForm({ ...VAZIO });
    setAlvo(null);
    setBusca("");
    setAberto(true);
  };

  const abrirEdicao = (c: Coupon) => {
    setEditando(c);
    setForm({
      code: c.code,
      description: c.description ?? "",
      tipo: c.discountPercent !== null ? "percent" : "amount",
      valor: String(c.discountPercent ?? c.discountAmount ?? ""),
      appliesTo: [...c.appliesTo],
      patientId: c.patientId ?? "",
      startsAt: c.startsAt ? c.startsAt.slice(0, 10) : "",
      endsAt: c.endsAt ? c.endsAt.slice(0, 10) : "",
      maxRedemptions: c.maxRedemptions === null ? "" : String(c.maxRedemptions),
      maxPerPatient: String(c.maxPerPatient),
    });
    setAlvo(c.patient);
    setBusca("");
    setAberto(true);
  };

  const salvar = async () => {
    setSalvando(true);
    try {
      const corpo = {
        code: form.code,
        description: form.description,
        discountPercent: form.tipo === "percent" ? Number(form.valor) : null,
        discountAmount: form.tipo === "amount" ? Number(form.valor) : null,
        appliesTo: form.appliesTo,
        patientId: alvo?.id ?? null,
        startsAt: form.startsAt || null,
        endsAt: form.endsAt || null,
        maxRedemptions: form.maxRedemptions === "" ? null : Number(form.maxRedemptions),
        maxPerPatient: Number(form.maxPerPatient || 1),
      };
      const r = await fetch(editando ? `/api/admin/coupons/${editando.id}` : "/api/admin/coupons", {
        method: editando ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(corpo),
      });
      const j = await r.json();
      // A frase vem do servidor: ele é quem sabe se o código colidiu, se o
      // percentual passou de 100, se o fim vem antes do início.
      if (!r.ok) throw new Error(j.error || "That did not save");
      toast({ title: editando ? "Coupon updated" : "Coupon created", description: corpo.code });
      setAberto(false);
      carregar();
    } catch (e: any) {
      toast({ title: "Not saved", description: e.message, variant: "destructive" });
    } finally {
      setSalvando(false);
    }
  };

  /**
   * O interruptor salva **na hora**.
   *
   * Na tela de preços ele só mudava o estado local e esperava um Save separado:
   * o Bruno desligou um preço, saiu, e o preço continuava ligado. Aqui a linha
   * volta ao que o servidor respondeu, e nunca ao que a tela supôs.
   */
  const alternar = async (c: Coupon, isActive: boolean) => {
    setCoupons((prev) => prev.map((x) => (x.id === c.id ? { ...x, isActive } : x)));
    const r = await fetch(`/api/admin/coupons/${c.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive }),
    });
    if (!r.ok) {
      setCoupons((prev) => prev.map((x) => (x.id === c.id ? { ...x, isActive: !isActive } : x)));
      const j = await r.json().catch(() => ({}));
      toast({ title: "Not changed", description: j.error ?? "Try again", variant: "destructive" });
      return;
    }
    const j = await r.json();
    setCoupons((prev) => prev.map((x) => (x.id === c.id ? { ...x, isActive: j.coupon.isActive } : x)));
  };

  const apagar = async () => {
    if (!paraApagar) return;
    const r = await fetch(`/api/admin/coupons/${paraApagar.id}`, { method: "DELETE" });
    const j = await r.json().catch(() => ({}));
    setParaApagar(null);
    if (!r.ok) {
      toast({ title: "Not deleted", description: j.error ?? "Try again", variant: "destructive" });
      return;
    }
    // Cupom já cobrado é desativado, não apagado — e a tela diz por quê em vez
    // de sumir com a linha e deixar o Bruno adivinhando.
    toast({
      title: j.deactivated ? "Switched off instead of deleted" : "Coupon deleted",
      description: j.message ?? undefined,
    });
    carregar();
  };

  const verResgates = async (c: Coupon) => {
    setResgatesDe(c);
    setResgates(null);
    const r = await fetch(`/api/admin/coupons/${c.id}/redemptions`);
    if (r.ok) setResgates(await r.json());
  };

  const desconto = (c: Coupon) =>
    c.discountPercent !== null ? `${c.discountPercent}% off` : `${c.currency} ${c.discountAmount?.toFixed(2)} off`;

  return (
    <div className="space-y-6 p-6" data-testid="coupons-page">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-2">
            <Ticket className="h-6 w-6" /> Discount coupons
          </h1>
          <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
            A code with a window and a limit. Different from a patient&apos;s own price, which has no end date:
            a coupon is a campaign, and the patient joins it by typing something.
          </p>
        </div>
        <Button onClick={abrirNovo} data-testid="new-coupon">
          <Plus className="h-4 w-4 mr-2" /> New coupon
        </Button>
      </div>

      {/* A ausência do exame é uma decisão, e uma decisão se explica — senão
          alguém procura o campo e conclui que a tela está quebrada. */}
      <Card className="border-dashed">
        <CardContent className="pt-6 flex gap-3 items-start">
          <FlaskConical className="h-5 w-5 mt-0.5 text-muted-foreground shrink-0" />
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">Lab tests are not on this list, on purpose.</span>{" "}
            We resell those: the laboratory charges us a cost and we sell at the market price, so a discount
            there comes out of our own margin rather than the test. Blood tests are always sold at their
            catalogue price.
          </p>
        </CardContent>
      </Card>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      ) : erro ? (
        <Card>
          <CardContent className="pt-6 space-y-3" data-testid="coupons-error">
            <p className="text-sm">
              <span className="font-medium">We could not load the coupons.</span>{" "}
              <span className="text-muted-foreground">{erro}</span>
            </p>
            <p className="text-xs text-muted-foreground">
              If this says no clinic is selected, pick one in the sidebar first — a coupon belongs to a
              clinic, and the same code can exist in two of them.
            </p>
            <Button variant="outline" size="sm" onClick={carregar}>
              Try again
            </Button>
          </CardContent>
        </Card>
      ) : coupons.length === 0 ? (
        <Card>
          <CardContent className="pt-6 text-sm text-muted-foreground" data-testid="coupons-empty">
            No coupons yet. A patient who types a code will simply be told we do not recognise it.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {coupons.map((c) => (
            <Card key={c.id} data-testid={`coupon-${c.code}`} className={c.isActive ? "" : "opacity-60"}>
              <CardContent className="pt-6">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-lg font-semibold">{c.code}</span>
                      <Badge variant="secondary">{desconto(c)}</Badge>
                      {c.patient ? (
                        <Badge variant="outline" className="gap-1">
                          <Users className="h-3 w-3" /> {c.patient.firstName} {c.patient.lastName}
                        </Badge>
                      ) : (
                        <Badge variant="outline">everyone</Badge>
                      )}
                      {!c.isActive && <Badge variant="destructive">off</Badge>}
                    </div>
                    {c.description && <p className="text-sm">{c.description}</p>}
                    <p className="text-xs text-muted-foreground">
                      {c.appliesTo.map((s) => ESCOPOS.find((e) => e.key === s)?.label ?? s).join(" · ")}
                      {" — "}
                      {janela(c)}
                      {" — "}
                      <span data-testid={`coupon-uses-${c.code}`}>
                        {c.redemptions.confirmed}
                        {c.maxRedemptions !== null ? `/${c.maxRedemptions}` : ""} used
                      </span>
                      {c.redemptions.started > c.redemptions.confirmed &&
                        `, ${c.redemptions.started - c.redemptions.confirmed} abandoned`}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-2 mr-2">
                      <Label htmlFor={`sw-${c.id}`} className="text-xs text-muted-foreground">
                        Active
                      </Label>
                      <Switch
                        id={`sw-${c.id}`}
                        checked={c.isActive}
                        onCheckedChange={(v) => alternar(c, v)}
                        data-testid={`coupon-toggle-${c.code}`}
                      />
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => verResgates(c)} title="Who used it">
                      <BarChart3 className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => abrirEdicao(c)} title="Edit">
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setParaApagar(c)}
                      title="Delete"
                      data-testid={`coupon-delete-${c.code}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={aberto} onOpenChange={setAberto}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editando ? `Edit ${editando.code}` : "New coupon"}</DialogTitle>
            <DialogDescription>
              The patient types this code and sees the price change before paying.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="code">Code</Label>
                <Input
                  id="code"
                  value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                  placeholder="SPRING20"
                  className="font-mono"
                  data-testid="coupon-code"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Letters, numbers and hyphens — it gets typed by hand. Case does not matter.
                </p>
              </div>
              <div>
                <Label htmlFor="desc">Campaign name</Label>
                <Input
                  id="desc"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Spring campaign"
                  data-testid="coupon-description"
                />
                <p className="text-xs text-muted-foreground mt-1">The patient sees this when the code applies.</p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 items-end">
              <div className="col-span-1">
                <Label>Discount</Label>
                <div className="flex gap-1 mt-2">
                  <Button
                    type="button"
                    variant={form.tipo === "percent" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setForm({ ...form, tipo: "percent" })}
                    data-testid="coupon-type-percent"
                  >
                    %
                  </Button>
                  <Button
                    type="button"
                    variant={form.tipo === "amount" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setForm({ ...form, tipo: "amount" })}
                    data-testid="coupon-type-amount"
                  >
                    £
                  </Button>
                </div>
              </div>
              <div className="col-span-2">
                <Label htmlFor="valor">{form.tipo === "percent" ? "Percentage off" : "Amount off"}</Label>
                <Input
                  id="valor"
                  type="number"
                  value={form.valor}
                  onChange={(e) => setForm({ ...form, valor: e.target.value })}
                  placeholder={form.tipo === "percent" ? "20" : "15.00"}
                  data-testid="coupon-value"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {form.tipo === "percent"
                    ? "1 to 100. A hundred makes a consultation free; on a package or a treatment plan it is refused, because those have no free path — arrange a courtesy with the patient instead."
                    : "Never more than the price. A code that leaves less than £0.30 is refused: that is below what the card processor will charge."}
                </p>
              </div>
            </div>

            <div>
              <Label>Where it applies</Label>
              <div className="grid grid-cols-2 gap-2 mt-2">
                {ESCOPOS.map((e) => (
                  <label
                    key={e.key}
                    className="flex items-start gap-2 rounded-md border p-2 cursor-pointer hover:bg-muted/50"
                  >
                    <Checkbox
                      checked={form.appliesTo.includes(e.key)}
                      onCheckedChange={(v) =>
                        setForm({
                          ...form,
                          appliesTo: v
                            ? [...form.appliesTo, e.key]
                            : form.appliesTo.filter((x) => x !== e.key),
                        })
                      }
                      data-testid={`coupon-scope-${e.key}`}
                    />
                    <span className="text-sm leading-tight">
                      {e.label}
                      <span className="block text-xs text-muted-foreground">{e.hint}</span>
                    </span>
                  </label>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Nothing ticked means it applies to nothing, so it will not save. Lab tests are deliberately absent.
              </p>
            </div>

            <div>
              <Label>Who it is for</Label>
              {alvo ? (
                <div className="flex items-center justify-between rounded-md border p-2 mt-2">
                  <span className="text-sm">
                    {alvo.firstName} {alvo.lastName}{" "}
                    <span className="text-muted-foreground">({alvo.email})</span>
                  </span>
                  <Button variant="ghost" size="icon" onClick={() => setAlvo(null)} data-testid="coupon-clear-target">
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <>
                  <Input
                    value={busca}
                    onChange={(e) => setBusca(e.target.value)}
                    placeholder="Leave empty for every patient, or search for one"
                    className="mt-2"
                    data-testid="coupon-patient-search"
                  />
                  {achados.length > 0 && (
                    <div className="border rounded-md mt-1 divide-y max-h-40 overflow-y-auto">
                      {achados.map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          className="w-full text-left p-2 text-sm hover:bg-muted"
                          onClick={() => {
                            setAlvo(p);
                            setBusca("");
                          }}
                        >
                          {p.firstName} {p.lastName}{" "}
                          <span className="text-muted-foreground">({p.email})</span>
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="ini">Starts</Label>
                <Input
                  id="ini"
                  type="date"
                  value={form.startsAt}
                  onChange={(e) => setForm({ ...form, startsAt: e.target.value })}
                  data-testid="coupon-starts"
                />
              </div>
              <div>
                <Label htmlFor="fim">Ends</Label>
                <Input
                  id="fim"
                  type="date"
                  value={form.endsAt}
                  onChange={(e) => setForm({ ...form, endsAt: e.target.value })}
                  data-testid="coupon-ends"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="mx">Total uses</Label>
                <Input
                  id="mx"
                  type="number"
                  value={form.maxRedemptions}
                  onChange={(e) => setForm({ ...form, maxRedemptions: e.target.value })}
                  placeholder="no limit"
                  data-testid="coupon-max"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Counts paid uses plus anyone paying right now, so two people cannot spend the last
                  one at the same time. An abandoned checkout frees its place again.
                </p>
              </div>
              <div>
                <Label htmlFor="mpp">Uses per patient</Label>
                <Input
                  id="mpp"
                  type="number"
                  value={form.maxPerPatient}
                  onChange={(e) => setForm({ ...form, maxPerPatient: e.target.value })}
                  data-testid="coupon-max-per-patient"
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setAberto(false)}>
              Cancel
            </Button>
            <Button onClick={salvar} disabled={salvando} data-testid="coupon-save">
              {salvando && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editando ? "Save changes" : "Create coupon"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!resgatesDe} onOpenChange={(v) => !v && setResgatesDe(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Who used {resgatesDe?.code}</DialogTitle>
          </DialogHeader>
          {!resgates ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex gap-6 text-sm">
                <span>
                  <strong>{resgates.totals.confirmed}</strong> paid
                </span>
                <span className="text-muted-foreground">
                  <strong>{resgates.totals.abandoned}</strong> abandoned
                </span>
                <span>
                  <strong>
                    {resgatesDe?.currency} {resgates.totals.discountGiven.toFixed(2)}
                  </strong>{" "}
                  given away
                </span>
              </div>
              {resgates.redemptions.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nobody has used it yet.</p>
              ) : (
                <div className="divide-y border rounded-md max-h-80 overflow-y-auto">
                  {resgates.redemptions.map((r: any) => (
                    <div key={r.id} className="p-2 text-sm flex justify-between gap-4">
                      <span>
                        {r.patient.firstName} {r.patient.lastName}
                        <span className="block text-xs text-muted-foreground">
                          {new Date(r.createdAt).toLocaleString("en-GB")} · {r.scope}
                          {!r.confirmedAt && " · not paid"}
                        </span>
                      </span>
                      <span className="whitespace-nowrap">
                        −{resgatesDe?.currency} {r.discountAmount.toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!paraApagar} onOpenChange={(v) => !v && setParaApagar(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {paraApagar?.code}?</AlertDialogTitle>
            <AlertDialogDescription>
              {paraApagar && paraApagar.redemptions.confirmed > 0
                ? `This code has been used ${paraApagar.redemptions.confirmed} time${
                    paraApagar.redemptions.confirmed === 1 ? "" : "s"
                  }, so it will be switched off instead of deleted — the record of why those people paid less stays.`
                : "It has never been used, so it will be removed completely."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep it</AlertDialogCancel>
            <AlertDialogAction onClick={apagar} data-testid="coupon-delete-confirm">
              {paraApagar && paraApagar.redemptions.confirmed > 0 ? "Switch it off" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
