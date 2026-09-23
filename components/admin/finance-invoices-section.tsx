"use client";

// Structured, organised patient invoices (activity 072) — lives inside the
// finance page as its own tab ("Pode ser tudo junto"). Distinct from the
// "Send Invoice" quick-dialog already on this page (that one still just
// generates and queues one via POST /api/admin/patients/[id]/invoice,
// unchanged UX-wise — it now happens to create a PatientInvoice under the
// hood, activity 072 T-2). This tab is where staff comes back to FIND and
// manage what's already been created.

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  Search, Download, Loader2, CheckCircle2, XCircle, Trash2, Plus, X, FileText,
} from "lucide-react";

type InvoiceStatus = "DRAFT" | "SENT" | "PAID" | "OVERDUE" | "VOID" | "PARTIALLY_PAID";

interface InvoiceListRow {
  id: string;
  invoiceNumber: string;
  status: InvoiceStatus;
  total: number;
  currency: string;
  issueDate: string;
  dueDate: string | null;
  paidAt: string | null;
  paidMethod: string | null;
  patient: { id: string; firstName: string; lastName: string };
}

interface InvoiceItem { id?: string; description: string; quantity: number; unitPrice: number; total?: number }

interface InvoiceDetail extends InvoiceListRow {
  items: InvoiceItem[];
  notes: string | null;
  createdBy: { firstName: string; lastName: string } | null;
  paidBy: { firstName: string; lastName: string } | null;
  emails: { id: string; folder: string; sentAt: string | null; toAddress: string; subject: string }[];
}

const STATUS_STYLE: Record<InvoiceStatus, string> = {
  DRAFT: "bg-muted text-muted-foreground",
  SENT: "bg-blue-100 text-blue-700",
  PAID: "bg-ba1-ok/15 text-ba1-ok",
  OVERDUE: "bg-ba1-bad/15 text-ba1-bad",
  VOID: "bg-muted text-muted-foreground line-through",
  PARTIALLY_PAID: "bg-amber-100 text-amber-700",
};

function fmtMoney(n: number, currency: string) {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency }).format(n);
}
function fmtDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}
// Computed, not persisted (activity 072 decision — no cron needed).
function effectiveStatus(row: { status: InvoiceStatus; dueDate: string | null }): InvoiceStatus {
  if (row.status === "SENT" && row.dueDate && new Date(row.dueDate) < new Date()) return "OVERDUE";
  return row.status;
}

export default function FinanceInvoicesSection() {
  const [rows, setRows] = useState<InvoiceListRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<string>("ALL");
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);
  const [openId, setOpenId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: "30" });
      if (status !== "ALL") params.set("status", status);
      if (search.trim()) params.set("search", search.trim());
      if (dateFrom) params.set("dateFrom", dateFrom);
      if (dateTo) params.set("dateTo", dateTo);
      const res = await fetch(`/api/admin/invoices?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setRows(data.invoices || []);
        setTotal(data.total || 0);
      }
    } finally {
      setLoading(false);
    }
  }, [page, status, search, dateFrom, dateTo]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3 flex-row items-center justify-between space-y-0">
          <CardTitle className="text-sm font-semibold flex items-center gap-2"><FileText className="h-4 w-4" /> Invoices</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filters */}
          <div className="flex flex-wrap gap-2 items-center">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by invoice number or patient name"
                value={search}
                onChange={(e) => { setPage(1); setSearch(e.target.value); }}
                className="pl-8"
              />
            </div>
            <Select value={status} onValueChange={(v) => { setPage(1); setStatus(v); }}>
              <SelectTrigger className="w-[160px]"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All statuses</SelectItem>
                <SelectItem value="DRAFT">Draft</SelectItem>
                <SelectItem value="SENT">Sent</SelectItem>
                <SelectItem value="PAID">Paid</SelectItem>
                <SelectItem value="OVERDUE">Overdue</SelectItem>
                <SelectItem value="VOID">Void</SelectItem>
                <SelectItem value="PARTIALLY_PAID">Partially paid</SelectItem>
              </SelectContent>
            </Select>
            <Input type="date" value={dateFrom} onChange={(e) => { setPage(1); setDateFrom(e.target.value); }} className="w-[150px]" />
            <span className="text-muted-foreground text-sm">to</span>
            <Input type="date" value={dateTo} onChange={(e) => { setPage(1); setDateTo(e.target.value); }} className="w-[150px]" />
          </div>

          {/* List */}
          {loading ? (
            <div className="py-8 flex justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
          ) : rows.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No invoices match these filters.</p>
          ) : (
            <div className="space-y-1.5">
              {rows.map((row) => {
                const eff = effectiveStatus(row);
                return (
                  <button
                    key={row.id}
                    onClick={() => setOpenId(row.id)}
                    className="w-full text-left flex items-center justify-between gap-3 p-2.5 rounded-md border border-border/50 hover:bg-muted/40 transition-colors"
                  >
                    <div className="min-w-0 flex-1 flex items-center gap-3">
                      <span className="font-mono text-xs text-muted-foreground shrink-0">{row.invoiceNumber}</span>
                      <span className="truncate text-sm">{row.patient.firstName} {row.patient.lastName}</span>
                    </div>
                    <span className="text-xs text-muted-foreground shrink-0">{fmtDate(row.issueDate)}</span>
                    <Badge className={`text-[10px] shrink-0 ${STATUS_STYLE[eff]}`}>{eff}</Badge>
                    <span className="text-sm font-medium shrink-0 w-20 text-right">{fmtMoney(row.total, row.currency)}</span>
                  </button>
                );
              })}
            </div>
          )}

          {total > 30 && (
            <div className="flex items-center justify-between text-xs text-muted-foreground pt-2">
              <span>{total} invoice{total === 1 ? "" : "s"} total</span>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
                <Button size="sm" variant="outline" disabled={page * 30 >= total} onClick={() => setPage((p) => p + 1)}>Next</Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {openId && (
        <InvoiceDetailDialog
          id={openId}
          onClose={() => setOpenId(null)}
          onChanged={() => { load(); }}
        />
      )}
    </div>
  );
}

function InvoiceDetailDialog({ id, onClose, onChanged }: { id: string; onClose: () => void; onChanged: () => void }) {
  const { toast } = useToast();
  const [invoice, setInvoice] = useState<InvoiceDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [items, setItems] = useState<InvoiceItem[]>([]);
  const [notes, setNotes] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/invoices/${id}`);
      if (res.ok) {
        const data = await res.json();
        setInvoice(data.invoice);
        setItems(data.invoice.items.map((it: InvoiceItem) => ({ description: it.description, quantity: it.quantity, unitPrice: it.unitPrice })));
        setNotes(data.invoice.notes || "");
      }
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const isDraft = invoice?.status === "DRAFT";
  const total = items.reduce((sum, it) => sum + (it.quantity || 1) * (it.unitPrice || 0), 0);

  const saveItems = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/invoices/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items, notes }),
      });
      const data = await res.json();
      if (res.ok) {
        toast({ title: "Invoice updated" });
        setEditing(false);
        await load();
        onChanged();
      } else {
        toast({ title: "Error", description: data.error, variant: "destructive" });
      }
    } finally {
      setSaving(false);
    }
  };

  const markPaid = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/invoices/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markPaid: true }),
      });
      const data = await res.json();
      if (res.ok) { toast({ title: "Marked as paid" }); await load(); onChanged(); }
      else toast({ title: "Error", description: data.error, variant: "destructive" });
    } finally { setSaving(false); }
  };

  const markVoid = async () => {
    if (!confirm("Void this invoice? This can't be undone.")) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/invoices/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markVoid: true }),
      });
      const data = await res.json();
      if (res.ok) { toast({ title: "Invoice voided" }); await load(); onChanged(); }
      else toast({ title: "Error", description: data.error, variant: "destructive" });
    } finally { setSaving(false); }
  };

  const deleteDraft = async () => {
    if (!confirm("Delete this draft invoice? This can't be undone.")) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/invoices/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (res.ok) { toast({ title: "Draft deleted" }); onChanged(); onClose(); }
      else toast({ title: "Error", description: data.error, variant: "destructive" });
    } finally { setSaving(false); }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-mono text-base">
            {invoice?.invoiceNumber || "…"}
            {invoice && <Badge className={`text-[10px] ${STATUS_STYLE[effectiveStatus(invoice)]}`}>{effectiveStatus(invoice)}</Badge>}
          </DialogTitle>
        </DialogHeader>

        {loading || !invoice ? (
          <div className="py-8 flex justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
        ) : (
          <div className="space-y-4">
            <div className="text-sm">
              <Link href={`/admin/patients/${invoice.patient.id}`} className="text-primary hover:underline font-medium">
                {invoice.patient.firstName} {invoice.patient.lastName}
              </Link>
              <div className="text-xs text-muted-foreground mt-0.5">
                Issued {fmtDate(invoice.issueDate)}{invoice.dueDate ? ` · Due ${fmtDate(invoice.dueDate)}` : ""}
                {invoice.createdBy && ` · by ${invoice.createdBy.firstName} ${invoice.createdBy.lastName}`}
              </div>
            </div>

            {/* Items */}
            <div className="space-y-2">
              {editing ? (
                <>
                  {items.map((it, i) => (
                    <div key={i} className="flex gap-2 items-center">
                      <Input
                        placeholder="Description"
                        value={it.description}
                        onChange={(e) => setItems((prev) => prev.map((p, j) => (j === i ? { ...p, description: e.target.value } : p)))}
                        className="flex-1"
                      />
                      <Input
                        type="number"
                        placeholder="Qty"
                        value={it.quantity}
                        onChange={(e) => setItems((prev) => prev.map((p, j) => (j === i ? { ...p, quantity: parseFloat(e.target.value) || 1 } : p)))}
                        className="w-16"
                      />
                      <Input
                        type="number"
                        placeholder="Unit price"
                        value={it.unitPrice}
                        onChange={(e) => setItems((prev) => prev.map((p, j) => (j === i ? { ...p, unitPrice: parseFloat(e.target.value) || 0 } : p)))}
                        className="w-24"
                      />
                      <Button size="icon" variant="ghost" onClick={() => setItems((prev) => prev.filter((_, j) => j !== i))} disabled={items.length <= 1}>
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}
                  <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setItems((prev) => [...prev, { description: "", quantity: 1, unitPrice: 0 }])}>
                    <Plus className="h-3.5 w-3.5" /> Add item
                  </Button>
                  <Textarea placeholder="Notes (optional)" value={notes} onChange={(e) => setNotes(e.target.value)} className="text-sm" />
                  <div className="flex justify-between items-center pt-1">
                    <span className="font-medium">Total: {fmtMoney(total, invoice.currency)}</span>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => setEditing(false)}>Cancel</Button>
                      <Button size="sm" onClick={saveItems} disabled={saving}>{saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Save"}</Button>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <ul className="text-sm space-y-1">
                    {invoice.items.map((it, i) => (
                      <li key={it.id || i} className="flex justify-between">
                        <span className="text-muted-foreground">{it.description} {it.quantity !== 1 && `× ${it.quantity}`}</span>
                        <span>{fmtMoney((it.total ?? it.quantity * it.unitPrice), invoice.currency)}</span>
                      </li>
                    ))}
                  </ul>
                  {invoice.notes && <p className="text-xs text-muted-foreground italic">{invoice.notes}</p>}
                  <div className="flex justify-between items-center font-medium pt-1 border-t">
                    <span>Total</span>
                    <span>{fmtMoney(invoice.total, invoice.currency)}</span>
                  </div>
                </>
              )}
            </div>

            {invoice.paidAt && (
              <p className="text-xs text-ba1-ok flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Paid {fmtDate(invoice.paidAt)}{invoice.paidMethod === "stripe" ? " automatically via Stripe" : invoice.paidBy ? ` by ${invoice.paidBy.firstName} ${invoice.paidBy.lastName}` : ""}
              </p>
            )}

            {invoice.emails.length > 0 && (
              <div className="text-xs text-muted-foreground space-y-1">
                <p className="font-medium">Delivery history</p>
                {invoice.emails.map((e) => (
                  <p key={e.id}>{e.folder === "SENT" ? "Sent" : e.folder === "PENDING_APPROVAL" ? "Pending approval" : e.folder} to {e.toAddress}{e.sentAt ? ` — ${fmtDate(e.sentAt)}` : ""}</p>
                ))}
              </div>
            )}

            {/* Actions */}
            {!editing && (
              <div className="flex flex-wrap gap-2 pt-2 border-t">
                <Button size="sm" variant="outline" className="gap-1.5" asChild>
                  <a href={`/api/admin/invoices/${invoice.id}/pdf`} target="_blank" rel="noopener noreferrer">
                    <Download className="h-3.5 w-3.5" /> PDF
                  </a>
                </Button>
                {isDraft && (
                  <>
                    <Button size="sm" variant="outline" onClick={() => setEditing(true)}>Edit items</Button>
                    <Button size="sm" variant="outline" className="text-ba1-bad gap-1.5" onClick={deleteDraft} disabled={saving}>
                      <Trash2 className="h-3.5 w-3.5" /> Delete
                    </Button>
                  </>
                )}
                {(invoice.status === "SENT" || invoice.status === "OVERDUE") && invoice.paidMethod !== "stripe" && (
                  <Button size="sm" className="gap-1.5" onClick={markPaid} disabled={saving}>
                    <CheckCircle2 className="h-3.5 w-3.5" /> Mark as paid
                  </Button>
                )}
                {invoice.status !== "VOID" && invoice.status !== "PAID" && (
                  <Button size="sm" variant="outline" className="text-ba1-bad gap-1.5" onClick={markVoid} disabled={saving}>
                    <XCircle className="h-3.5 w-3.5" /> Void
                  </Button>
                )}
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
