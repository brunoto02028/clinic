"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Loader2, Eye, Send, CheckCircle2, Clock } from "lucide-react";
import { useLocale } from "@/hooks/use-locale";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { gbp } from "@/lib/lab-catalog";

/**
 * A tela de liberação (081, T-2).
 *
 * O Bruno vê primeiro, escreve uma linha, olha **exatamente** o que o
 * paciente vai ver, e só então libera. O fora-da-faixa é destacado sem
 * alarme: âmbar, nunca vermelho — um valor fora da referência é um assunto
 * para a consulta, não uma emergência na tela.
 */

interface Value { id: string; biomarker: string; value: number | null; valueText: string | null; unit: string | null; minRange: number | null; maxRange: number | null; outOfRange: boolean; measuredAt: string | null }
interface Registration { id: string; status: string; resultsReady: boolean; resultsPdfPath: string | null; values: Value[] }
interface Event { id: string; status: string; note: string | null; createdAt: string }
interface Order {
  id: string; orderNumber: string; status: string; total: number; cost: number; margin: number; paidAt: string | null;
  releasedToPatientAt: string | null; releaseNote: string | null; releaseNotePt: string | null;
  awaitingRelease: boolean; hasValues: boolean;
  patient: { id: string; firstName: string; lastName: string; email: string; preferredLocale: string | null };
  items: { productName: string; quantity: number; unitPrice: number; unitCost: number }[];
  registrations: Registration[]; events: Event[];
}
interface Previous { biomarker: string; value: number | null; valueText: string | null; unit: string | null; outOfRange: boolean; measuredAt: string | null; createdAt: string; registration: { order: { orderNumber: string; releasedToPatientAt: string | null } } }

const STATUS: Record<string, { en: string; pt: string }> = {
  BASKET: { en: "Basket", pt: "Carrinho" },
  CONFIRMED: { en: "Paid — kit being prepared", pt: "Pago — kit em preparo" },
  KIT_DISPATCHED: { en: "Kit on its way", pt: "Kit a caminho" },
  SAMPLE_RECEIVED: { en: "Sample received", pt: "Amostra recebida" },
  PROCESSING_LAB: { en: "At the laboratory", pt: "No laboratório" },
  RESULTS_READY: { en: "Result arrived", pt: "Resultado chegou" },
  CANCELLED_LAB: { en: "Cancelled", pt: "Cancelado" },
  RELEASED: { en: "Released to the patient", pt: "Liberado ao paciente" },
};

const UI = {
  "en-GB": {
    back: "Orders", patient: "Patient", tests: "Tests", sold: "Sold", cost: "Cost", margin: "Margin",
    waitingLab: "Waiting for the laboratory. Nothing to review yet.",
    released: (d: string) => `Released to the patient on ${d}.`,
    result: "Result", biomarker: "Biomarker", value: "Value", range: "Reference range", outOfRange: "outside range",
    previous: "Earlier results", none: "First time this is measured.",
    note: "Your note to the patient", noteHint: "Written in English first. Portuguese below is optional; if empty, the patient reads the English.",
    notePt: "The same, in Portuguese (optional)",
    preview: "See what the patient will see", release: "Release to patient", releasing: "Releasing…",
    previewTitle: "This is the patient's screen", nonDiag: "These results are for information and do not replace a consultation. Your therapist has reviewed them.",
    releasedOk: "Released. The patient has been told there is something new in their record.", failed: "That did not go through.",
    loadFailed: "Could not load this order.", history: "History",
    yourNote: "Your therapist's note",
  },
  "pt-BR": {
    back: "Pedidos", patient: "Paciente", tests: "Exames", sold: "Vendido", cost: "Custo", margin: "Margem",
    waitingLab: "Esperando o laboratório. Nada para revisar ainda.",
    released: (d: string) => `Liberado ao paciente em ${d}.`,
    result: "Resultado", biomarker: "Biomarcador", value: "Valor", range: "Faixa de referência", outOfRange: "fora da faixa",
    previous: "Resultados anteriores", none: "Primeira vez que isto é medido.",
    note: "Sua nota para o paciente", noteHint: "Escrita em inglês primeiro. O português abaixo é opcional; vazio, o paciente lê o inglês.",
    notePt: "A mesma, em português (opcional)",
    preview: "Ver o que o paciente vai ver", release: "Liberar ao paciente", releasing: "Liberando…",
    previewTitle: "Esta é a tela do paciente", nonDiag: "Estes resultados são informativos e não substituem uma consulta. Seu terapeuta os revisou.",
    releasedOk: "Liberado. O paciente foi avisado de que há algo novo no prontuário.", failed: "Não deu certo.",
    loadFailed: "Não foi possível carregar este pedido.", history: "Histórico",
    yourNote: "Nota do seu terapeuta",
  },
} as const;

function fmtValue(v: { value: number | null; valueText: string | null; unit: string | null }) {
  if (v.value === null || v.value === undefined) return v.valueText ?? "—";
  return `${v.value}${v.unit ? ` ${v.unit}` : ""}`;
}
function fmtRange(v: { minRange: number | null; maxRange: number | null; unit: string | null }) {
  if (v.minRange === null && v.maxRange === null) return "—";
  if (v.minRange !== null && v.maxRange !== null) return `${v.minRange}–${v.maxRange}${v.unit ? ` ${v.unit}` : ""}`;
  if (v.minRange !== null) return `≥ ${v.minRange}${v.unit ? ` ${v.unit}` : ""}`;
  return `≤ ${v.maxRange}${v.unit ? ` ${v.unit}` : ""}`;
}

export default function LabOrderReleasePage() {
  const { id } = useParams<{ id: string }>();
  const { locale } = useLocale();
  const pt = locale === "pt-BR";
  const ui = UI[pt ? "pt-BR" : "en-GB"];
  const { toast } = useToast();

  const [order, setOrder] = useState<Order | null>(null);
  const [previous, setPrevious] = useState<Previous[]>([]);
  const [reviewDays, setReviewDays] = useState(2);
  const [failed, setFailed] = useState(false);
  const [noteEn, setNoteEn] = useState("");
  const [notePt, setNotePt] = useState("");
  const [previewOpen, setPreviewOpen] = useState(false);
  const [releasing, setReleasing] = useState(false);

  const load = useCallback(async () => {
    try {
      const r = await fetch(`/api/admin/labs/orders/${id}`);
      if (!r.ok) throw new Error(String(r.status));
      const d = await r.json();
      setOrder(d.order); setPrevious(d.previous ?? []); setReviewDays(d.labReviewDays ?? 2);
      setNoteEn(d.order.releaseNote ?? ""); setNotePt(d.order.releaseNotePt ?? "");
    } catch { setFailed(true); }
  }, [id]);
  useEffect(() => { void load(); }, [load]);

  const release = async () => {
    setReleasing(true);
    try {
      const r = await fetch(`/api/admin/labs/orders/${id}/release`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ noteEn, notePt }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) { toast({ title: ui.failed, description: pt ? d.errorPt || d.error : d.error, variant: "destructive" }); return; }
      setPreviewOpen(false);
      toast({ title: ui.releasedOk });
      await load();
    } finally { setReleasing(false); }
  };

  const fmtDate = (d: string | null) => (d ? new Date(d).toLocaleDateString(pt ? "pt-BR" : "en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "—");

  if (failed) return <p className="text-sm text-ba1-bad">{ui.loadFailed}</p>;
  if (!order) return <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> …</div>;

  const patientPt = (order.patient.preferredLocale ?? "").startsWith("pt");
  const noteForPatient = patientPt && notePt.trim() ? notePt : noteEn;
  const values = order.registrations.flatMap((r) => r.values);
  const prevBy = (b: string) => previous.filter((p) => p.biomarker === b);

  const ResultTable = ({ patientView }: { patientView?: boolean }) => (
    <table className="w-full text-sm">
      <thead><tr className="text-left text-xs text-muted-foreground">
        <th className="py-1.5">{ui.biomarker}</th><th className="py-1.5 text-right">{ui.value}</th><th className="py-1.5 text-right">{ui.range}</th>
      </tr></thead>
      <tbody>
        {values.map((v) => (
          <tr key={v.id} className="border-t" data-testid={`lab-value-${v.biomarker}`}>
            <td className="py-2">
              {v.biomarker}
              {!patientView && prevBy(v.biomarker).length > 0 && (
                <div className="text-xs text-muted-foreground mt-0.5">
                  {ui.previous}: {prevBy(v.biomarker).slice(0, 3).map((p) => `${fmtValue(p)} (${fmtDate(p.measuredAt ?? p.createdAt)})`).join(" · ")}
                </div>
              )}
            </td>
            <td className={`py-2 text-right tabular-nums ${v.outOfRange ? "text-amber-700 font-medium" : ""}`}>
              {fmtValue(v)}
              {v.outOfRange && <span className="block text-[11px] font-normal text-amber-700">{ui.outOfRange}</span>}
            </td>
            <td className="py-2 text-right tabular-nums text-muted-foreground">{fmtRange(v)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold font-mono">{order.orderNumber}</h1>
          <p className="text-sm text-muted-foreground">{pt ? STATUS[order.status]?.pt : STATUS[order.status]?.en ?? order.status}</p>
        </div>
        <Link href="/admin/labs/orders"><Button variant="outline" size="sm">{ui.back}</Button></Link>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <Card><CardContent className="pt-5 space-y-1 text-sm">
          <p className="text-xs text-muted-foreground">{ui.patient}</p>
          <p className="font-medium">{order.patient.firstName} {order.patient.lastName}</p>
          <p className="text-muted-foreground">{order.patient.email}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-5 space-y-1 text-sm">
          <p className="text-xs text-muted-foreground">{ui.tests}</p>
          {order.items.map((i, k) => <p key={k} className="font-medium">{i.quantity > 1 ? `${i.quantity} × ` : ""}{i.productName}</p>)}
          <p className="text-muted-foreground tabular-nums pt-1">{ui.sold} {gbp(order.total)} · {ui.cost} {gbp(order.cost)} · {ui.margin} <strong>{gbp(order.margin)}</strong></p>
        </CardContent></Card>
      </div>

      {order.releasedToPatientAt ? (
        <Card className="border-green-500/40"><CardContent className="pt-5 text-sm flex items-start gap-2">
          <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5" />
          <div>
            <p data-testid="lab-released-at">{ui.released(fmtDate(order.releasedToPatientAt))}</p>
            {order.releaseNote && <p className="mt-2 text-muted-foreground whitespace-pre-wrap">{order.releaseNote}</p>}
            {order.releaseNotePt && <p className="mt-1 text-muted-foreground whitespace-pre-wrap">{order.releaseNotePt}</p>}
          </div>
        </CardContent></Card>
      ) : !order.awaitingRelease || !order.hasValues ? (
        <Card><CardContent className="pt-5 text-sm flex items-center gap-2 text-muted-foreground" data-testid="lab-waiting-lab">
          <Clock className="h-4 w-4" /> {ui.waitingLab}
        </CardContent></Card>
      ) : null}

      {values.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">{ui.result}</CardTitle></CardHeader>
          <CardContent><ResultTable /></CardContent>
        </Card>
      )}

      {order.awaitingRelease && order.hasValues && (
        <Card>
          <CardContent className="pt-5 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="note-en">{ui.note}</Label>
              <p className="text-xs text-muted-foreground">{ui.noteHint}</p>
              <Textarea id="note-en" rows={4} value={noteEn} onChange={(e) => setNoteEn(e.target.value)} data-testid="lab-note-en" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="note-pt">{ui.notePt}</Label>
              <Textarea id="note-pt" rows={4} value={notePt} onChange={(e) => setNotePt(e.target.value)} data-testid="lab-note-pt" />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setPreviewOpen(true)} data-testid="lab-preview"><Eye className="h-4 w-4 mr-1.5" /> {ui.preview}</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {order.events.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">{ui.history}</CardTitle></CardHeader>
          <CardContent>
            <ul className="text-sm space-y-1.5">
              {order.events.map((e) => (
                <li key={e.id} className="flex items-center gap-2">
                  <Badge variant="outline" className="font-mono text-[10px]">{fmtDate(e.createdAt)}</Badge>
                  <span>{pt ? STATUS[e.status]?.pt : STATUS[e.status]?.en ?? e.status}</span>
                  {e.note && <span className="text-muted-foreground">— {e.note}</span>}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* A prévia é a tela do paciente, não um resumo dela: mesma nota, mesma
          tabela, mesma frase de não-diagnóstico. O que ele lê é o que você viu. */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{ui.previewTitle}</DialogTitle><DialogDescription>{pt ? "Exatamente o que o paciente lê ao abrir o resultado." : "Exactly what the patient reads when they open the result."}</DialogDescription></DialogHeader>
          <div className="rounded-xl border bg-[#F5F4F1] p-4 space-y-3 text-[#20242D]" data-testid="lab-patient-preview">
            <p className="text-xs uppercase tracking-wide text-[#5B616C]">{patientPt ? "Nota do seu terapeuta" : "Your therapist's note"}</p>
            <p className="text-sm whitespace-pre-wrap">{noteForPatient.trim() || (patientPt ? "(sem nota)" : "(no note)")}</p>
            <ResultTable patientView />
            <p className="text-xs text-[#5B616C]">{patientPt ? UI["pt-BR"].nonDiag : UI["en-GB"].nonDiag}</p>
          </div>
          <DialogFooter>
            <Button onClick={() => void release()} disabled={releasing} data-testid="lab-release">
              {releasing ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Send className="h-4 w-4 mr-1.5" />}
              {releasing ? ui.releasing : ui.release}
            </Button>
          </DialogFooter>
          <p className="text-[11px] text-muted-foreground">{pt ? `Prazo prometido: ${reviewDays} dia(s) útil(eis).` : `Promised window: ${reviewDays} working day(s).`}</p>
        </DialogContent>
      </Dialog>
    </div>
  );
}
