"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, ClipboardCheck, ChevronRight } from "lucide-react";
import { useLocale } from "@/hooks/use-locale";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { gbp } from "@/lib/lab-catalog";

/**
 * Os pedidos e a fila de liberação (081, T-2). A margem de cada linha é a
 * congelada na venda — o preço de hoje não reescreve o de ontem.
 */

interface Row {
  id: string; orderNumber: string; status: string;
  patient: { id: string; firstName: string; lastName: string } | null;
  products: string[]; total: number; cost: number; margin: number;
  paidAt: string | null; releasedToPatientAt: string | null; awaitingRelease: boolean; createdAt: string;
}
interface Totals { orders: number; sold: number; cost: number; margin: number; awaitingRelease: number }

const STATUS: Record<string, { en: string; pt: string }> = {
  BASKET: { en: "Basket", pt: "Carrinho" },
  CONFIRMED: { en: "Paid — kit being prepared", pt: "Pago — kit em preparo" },
  KIT_DISPATCHED: { en: "Kit on its way", pt: "Kit a caminho" },
  SAMPLE_RECEIVED: { en: "Sample received", pt: "Amostra recebida" },
  PROCESSING_LAB: { en: "At the laboratory", pt: "No laboratório" },
  RESULTS_READY: { en: "Result arrived", pt: "Resultado chegou" },
  CANCELLED_LAB: { en: "Cancelled", pt: "Cancelado" },
};

const UI = {
  "en-GB": {
    title: "Lab orders", back: "Catalogue",
    all: "All", released: "With results",
    sold: "Sold", cost: "Cost", margin: "Margin", orders: "orders",
    results: "Results in", resultsHint: "the patient already has them",
    order: "Order", patient: "Patient", tests: "Tests", status: "Status", paid: "Paid",
    empty: "No orders yet.", failed: "Could not load the orders.", retry: "Try again",
    releasedBadge: "Results with the patient", open: "Open",
  },
  "pt-BR": {
    title: "Pedidos de exame", back: "Catálogo",
    all: "Todos", released: "Com resultado",
    sold: "Vendido", cost: "Custo", margin: "Margem", orders: "pedidos",
    results: "Resultados", resultsHint: "o paciente já os tem",
    order: "Pedido", patient: "Paciente", tests: "Exames", status: "Estado", paid: "Pago",
    empty: "Nenhum pedido ainda.", failed: "Não foi possível carregar os pedidos.", retry: "Tentar de novo",
    releasedBadge: "Resultado com o paciente", open: "Abrir",
  },
} as const;

/** "waiting" saiu em 26/09/2026: o resultado vai direto e não há fila. */
type Filter = "all" | "released";

export default function LabOrdersPage() {
  const { locale } = useLocale();
  const pt = locale === "pt-BR";
  const ui = UI[pt ? "pt-BR" : "en-GB"];
  const [rows, setRows] = useState<Row[] | null>(null);
  const [totals, setTotals] = useState<Totals | null>(null);
  const [failed, setFailed] = useState(false);
  const [filter, setFilter] = useState<Filter>("all");

  const load = useCallback(async () => {
    setFailed(false);
    try {
      const r = await fetch("/api/admin/labs/orders");
      if (!r.ok) throw new Error(String(r.status));
      const d = await r.json();
      setRows(d.orders); setTotals(d.totals);
    } catch { setFailed(true); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  const shown = (rows ?? []).filter((r) =>
    filter === "all" ? true : r.status === "RESULTS_READY" || !!r.releasedToPatientAt
  );
  const fmt = (d: string | null) => (d ? new Date(d).toLocaleDateString(pt ? "pt-BR" : "en-GB", { day: "2-digit", month: "short" }) : "—");

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold flex items-center gap-2"><ClipboardCheck className="h-6 w-6" /> {ui.title}</h1>
        <Link href="/admin/labs"><Button variant="outline" size="sm">{ui.back}</Button></Link>
      </div>

      {totals && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            [ui.sold, gbp(totals.sold), `${totals.orders} ${ui.orders}`],
            [ui.cost, gbp(totals.cost), ""],
            [ui.margin, gbp(totals.margin), totals.sold > 0 ? `${Math.round((totals.margin / totals.sold) * 100)}%` : ""],
            [ui.results, String(rows?.filter((r) => r.status === "RESULTS_READY" || r.releasedToPatientAt).length ?? 0), ui.resultsHint],
          ].map(([label, value, hint]) => (
            <Card key={label}><CardContent className="pt-5">
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className="text-xl font-semibold tabular-nums" data-testid={`lab-total-${label}`}>{value}</p>
              {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
            </CardContent></Card>
          ))}
        </div>
      )}

      <div className="flex gap-2">
        {(["all", "released"] as Filter[]).map((f) => (
          <Button key={f} size="sm" variant={filter === f ? "default" : "outline"} onClick={() => setFilter(f)} data-testid={`lab-filter-${f}`}>
            {f === "all" ? ui.all : ui.released}
          </Button>
        ))}
      </div>

      <Card><CardContent className="pt-6">
        {failed ? (
          <div className="text-sm"><p className="text-ba1-bad">{ui.failed}</p><Button size="sm" variant="outline" className="mt-2" onClick={() => void load()}>{ui.retry}</Button></div>
        ) : rows === null ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> …</div>
        ) : shown.length === 0 ? (
          <p className="text-sm text-muted-foreground">{ui.empty}</p>
        ) : (
          <Table>
            <TableHeader><TableRow>
              <TableHead>{ui.order}</TableHead><TableHead>{ui.patient}</TableHead><TableHead>{ui.tests}</TableHead>
              <TableHead>{ui.status}</TableHead><TableHead>{ui.paid}</TableHead>
              <TableHead className="text-right">{ui.sold}</TableHead><TableHead className="text-right">{ui.cost}</TableHead><TableHead className="text-right">{ui.margin}</TableHead><TableHead />
            </TableRow></TableHeader>
            <TableBody>
              {shown.map((r) => (
                <TableRow key={r.id} data-testid={`lab-order-${r.orderNumber}`}>
                  <TableCell className="font-mono text-xs">{r.orderNumber}</TableCell>
                  <TableCell>{r.patient ? `${r.patient.firstName} ${r.patient.lastName}` : "—"}</TableCell>
                  <TableCell className="text-sm">{r.products.join(", ")}</TableCell>
                  <TableCell>
                    <span className="text-sm">{pt ? STATUS[r.status]?.pt : STATUS[r.status]?.en ?? r.status}</span>
                    {(r.status === "RESULTS_READY" || r.releasedToPatientAt) && (
                      <Badge className="ml-2 bg-green-500/20 text-green-700">{ui.releasedBadge}</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-sm">{fmt(r.paidAt)}</TableCell>
                  <TableCell className="text-right tabular-nums">{gbp(r.total)}</TableCell>
                  <TableCell className="text-right tabular-nums text-muted-foreground">{gbp(r.cost)}</TableCell>
                  <TableCell className="text-right tabular-nums">{gbp(r.margin)}</TableCell>
                  <TableCell>
                    <Link href={`/admin/labs/orders/${r.id}`}><Button size="sm" variant="ghost">{ui.open} <ChevronRight className="h-4 w-4" /></Button></Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent></Card>
    </div>
  );
}
