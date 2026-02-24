"use client";

import { useState, useEffect, useCallback } from "react";
import {
  DollarSign, TrendingUp, TrendingDown, CreditCard, Plus, Trash2,
  RefreshCw, ArrowUpRight, ArrowDownRight, Clock, AlertTriangle,
  CheckCircle, XCircle, Search, FileText, Download, Edit, MoreVertical,
  Wallet, Receipt, PiggyBank, BarChart3, Calendar,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useLocale } from "@/hooks/use-locale";
import { t as i18nT } from "@/lib/i18n";

// ─── Types ───
interface FinancialEntry {
  id: string;
  type: "INCOME" | "EXPENSE";
  status: "PAID" | "PENDING" | "OVERDUE" | "CANCELLED";
  description: string;
  notes: string | null;
  amount: number;
  currency: string;
  incomeCategory: string | null;
  expenseCategory: string | null;
  dueDate: string | null;
  paidDate: string | null;
  paymentMethod: string | null;
  stripePaymentIntentId: string | null;
  stripeChargeId: string | null;
  patientId: string | null;
  patientName: string | null;
  supplierName: string | null;
  isRecurring: boolean;
  recurringDay: number | null;
  attachmentUrl: string | null;
  createdAt: string;
}

interface Summary {
  totalIncome: number;
  totalExpenses: number;
  netProfit: number;
  pendingIncome: number;
  pendingExpenses: number;
  overdueExpenses: number;
}

interface CategoryBreakdown {
  category: string | null;
  amount: number;
}

type Tab = "dashboard" | "stripe" | "income" | "expenses";

const INCOME_CATEGORIES = [
  "CONSULTATION", "TREATMENT_PACKAGE", "MEMBERSHIP", "FOOT_SCAN",
  "BODY_ASSESSMENT", "PRODUCT_SALE", "OTHER_INCOME",
];

const EXPENSE_CATEGORIES = [
  "RENT", "EQUIPMENT", "SALARIES", "MATERIALS", "SOFTWARE",
  "MARKETING", "INSURANCE", "UTILITIES", "TAXES", "PROFESSIONAL_FEES",
  "MAINTENANCE", "OTHER_EXPENSE",
];

const PAYMENT_METHODS = [
  "STRIPE", "CASH", "PIX", "BANK_TRANSFER", "CARD", "CHEQUE", "OTHER",
];

const STATUS_COLORS: Record<string, string> = {
  PAID: "bg-emerald-100 text-emerald-800",
  PENDING: "bg-amber-100 text-amber-800",
  OVERDUE: "bg-red-100 text-red-800",
  CANCELLED: "bg-slate-100 text-slate-600",
};

const STATUS_ICONS: Record<string, any> = {
  PAID: CheckCircle,
  PENDING: Clock,
  OVERDUE: AlertTriangle,
  CANCELLED: XCircle,
};

export default function FinancePage() {
  const { locale } = useLocale();
  const T = (key: string) => i18nT(key, locale);
  const { toast } = useToast();

  const [tab, setTab] = useState<Tab>("dashboard");
  const [period, setPeriod] = useState("thisMonth");
  const [entries, setEntries] = useState<FinancialEntry[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [incomeByCategory, setIncomeByCategory] = useState<CategoryBreakdown[]>([]);
  const [expenseByCategory, setExpenseByCategory] = useState<CategoryBreakdown[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // Stripe state
  const [stripeData, setStripeData] = useState<any>(null);
  const [stripeSyncing, setStripeSyncing] = useState(false);
  const [stripeLoading, setStripeLoading] = useState(false);

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [formType, setFormType] = useState<"INCOME" | "EXPENSE">("INCOME");
  const [editingEntry, setEditingEntry] = useState<FinancialEntry | null>(null);
  const [formData, setFormData] = useState({
    description: "", amount: "", currency: "GBP",
    incomeCategory: "CONSULTATION", expenseCategory: "RENT",
    dueDate: "", paidDate: "", paymentMethod: "",
    patientName: "", supplierName: "", notes: "",
    isRecurring: false, recurringDay: "", status: "PENDING",
  });

  const fetchEntries = useCallback(async (typeFilter?: string) => {
    setLoading(true);
    const params = new URLSearchParams({ period });
    if (typeFilter) params.set("type", typeFilter);
    if (search) params.set("search", search);
    const res = await fetch(`/api/admin/finance?${params}`);
    const data = await res.json();
    setEntries(data.entries || []);
    setSummary(data.summary || null);
    setIncomeByCategory(data.incomeByCategory || []);
    setExpenseByCategory(data.expenseByCategory || []);
    setTotal(data.total || 0);
    setLoading(false);
  }, [period, search]);

  useEffect(() => {
    if (tab === "income") fetchEntries("INCOME");
    else if (tab === "expenses") fetchEntries("EXPENSE");
    else fetchEntries();
  }, [tab, fetchEntries]);

  const fetchStripeData = async () => {
    setStripeLoading(true);
    try {
      const res = await fetch("/api/admin/finance/stripe");
      const data = await res.json();
      setStripeData(data);
    } catch {}
    setStripeLoading(false);
  };

  useEffect(() => {
    if (tab === "stripe") fetchStripeData();
  }, [tab]);

  const syncStripe = async () => {
    setStripeSyncing(true);
    try {
      const res = await fetch("/api/admin/finance/stripe", { method: "POST" });
      const data = await res.json();
      if (data.error) {
        toast({ title: "Error", description: data.error, variant: "destructive" });
      } else {
        toast({ title: T("finance.syncSuccess"), description: `${data.imported} imported, ${data.skipped} skipped` });
        fetchEntries();
        fetchStripeData();
      }
    } catch {
      toast({ title: "Error", description: "Stripe sync failed", variant: "destructive" });
    }
    setStripeSyncing(false);
  };

  const formatCurrency = (amount: number, currency = "GBP") => {
    return new Intl.NumberFormat(locale === "pt-BR" ? "pt-BR" : "en-GB", {
      style: "currency", currency,
    }).format(amount);
  };

  const formatDate = (date: string | null) => {
    if (!date) return "—";
    return new Date(date).toLocaleDateString(locale === "pt-BR" ? "pt-BR" : "en-GB", {
      day: "2-digit", month: "short", year: "numeric",
    });
  };

  const resetForm = () => {
    setFormData({
      description: "", amount: "", currency: "GBP",
      incomeCategory: "CONSULTATION", expenseCategory: "RENT",
      dueDate: "", paidDate: "", paymentMethod: "",
      patientName: "", supplierName: "", notes: "",
      isRecurring: false, recurringDay: "", status: "PENDING",
    });
    setEditingEntry(null);
  };

  const openAddForm = (type: "INCOME" | "EXPENSE") => {
    resetForm();
    setFormType(type);
    setShowForm(true);
  };

  const openEditForm = (entry: FinancialEntry) => {
    setEditingEntry(entry);
    setFormType(entry.type);
    setFormData({
      description: entry.description,
      amount: String(entry.amount),
      currency: entry.currency,
      incomeCategory: entry.incomeCategory || "CONSULTATION",
      expenseCategory: entry.expenseCategory || "RENT",
      dueDate: entry.dueDate ? entry.dueDate.slice(0, 10) : "",
      paidDate: entry.paidDate ? entry.paidDate.slice(0, 10) : "",
      paymentMethod: entry.paymentMethod || "",
      patientName: entry.patientName || "",
      supplierName: entry.supplierName || "",
      notes: entry.notes || "",
      isRecurring: entry.isRecurring,
      recurringDay: entry.recurringDay ? String(entry.recurringDay) : "",
      status: entry.status,
    });
    setShowForm(true);
  };

  const saveEntry = async () => {
    const payload: any = {
      type: formType,
      description: formData.description,
      amount: formData.amount,
      currency: formData.currency,
      incomeCategory: formType === "INCOME" ? formData.incomeCategory : null,
      expenseCategory: formType === "EXPENSE" ? formData.expenseCategory : null,
      dueDate: formData.dueDate || null,
      paidDate: formData.paidDate || null,
      paymentMethod: formData.paymentMethod || null,
      patientName: formData.patientName || null,
      supplierName: formData.supplierName || null,
      notes: formData.notes || null,
      isRecurring: formData.isRecurring,
      recurringDay: formData.recurringDay || null,
      status: formData.status,
    };

    if (editingEntry) {
      payload.id = editingEntry.id;
      await fetch("/api/admin/finance", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    } else {
      await fetch("/api/admin/finance", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    }

    setShowForm(false);
    resetForm();
    fetchEntries(tab === "income" ? "INCOME" : tab === "expenses" ? "EXPENSE" : undefined);
    toast({ title: T("common.success") });
  };

  const deleteEntry = async (id: string) => {
    if (!confirm(T("finance.deleteEntry") + "?")) return;
    await fetch(`/api/admin/finance?id=${id}`, { method: "DELETE" });
    fetchEntries(tab === "income" ? "INCOME" : tab === "expenses" ? "EXPENSE" : undefined);
    toast({ title: T("common.success") });
  };

  const markPaid = async (entry: FinancialEntry) => {
    await fetch("/api/admin/finance", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: entry.id, status: "PAID", paidDate: new Date().toISOString() }),
    });
    fetchEntries(tab === "income" ? "INCOME" : tab === "expenses" ? "EXPENSE" : undefined);
    toast({ title: T("finance.markPaid") });
  };

  const tabs: { key: Tab; label: string; icon: any }[] = [
    { key: "dashboard", label: T("finance.dashboard"), icon: BarChart3 },
    { key: "stripe", label: T("finance.stripe"), icon: CreditCard },
    { key: "income", label: T("finance.income"), icon: ArrowUpRight },
    { key: "expenses", label: T("finance.expenses"), icon: ArrowDownRight },
  ];

  const periodOptions = [
    { key: "thisMonth", label: T("finance.thisMonth") },
    { key: "lastMonth", label: T("finance.lastMonth") },
    { key: "thisYear", label: T("finance.thisYear") },
    { key: "allTime", label: T("finance.allTime") },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight flex items-center gap-2">
            <DollarSign className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
            {T("finance.title")}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">{T("finance.subtitle")}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {periodOptions.map((p) => (
            <Button key={p.key} variant={period === p.key ? "default" : "outline"} size="sm" onClick={() => setPeriod(p.key)} className="text-xs">
              {p.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-muted/50 rounded-lg p-1">
        {tabs.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-xs sm:text-sm font-medium transition-all ${
                tab === t.key ? "bg-background shadow text-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      {tab === "dashboard" && <DashboardTab summary={summary} incomeByCategory={incomeByCategory} expenseByCategory={expenseByCategory} entries={entries} loading={loading} formatCurrency={formatCurrency} formatDate={formatDate} T={T} />}
      {tab === "stripe" && <StripeTab stripeData={stripeData} stripeLoading={stripeLoading} stripeSyncing={stripeSyncing} syncStripe={syncStripe} formatCurrency={formatCurrency} T={T} />}
      {(tab === "income" || tab === "expenses") && (
        <EntriesTab
          entries={entries} loading={loading} total={total}
          type={tab === "income" ? "INCOME" : "EXPENSE"}
          search={search} setSearch={setSearch}
          formatCurrency={formatCurrency} formatDate={formatDate}
          openAddForm={openAddForm} openEditForm={openEditForm}
          deleteEntry={deleteEntry} markPaid={markPaid} T={T}
        />
      )}

      {/* Add/Edit Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setShowForm(false)}>
          <div className="bg-background rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 space-y-4">
              <h2 className="text-lg font-bold">
                {editingEntry ? T("finance.editEntry") : formType === "INCOME" ? T("finance.addIncome") : T("finance.addExpense")}
              </h2>

              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">{T("finance.description")} *</label>
                  <Input value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} placeholder="..." />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">{T("finance.amount")} *</label>
                    <Input type="number" step="0.01" value={formData.amount} onChange={(e) => setFormData({ ...formData, amount: e.target.value })} placeholder="0.00" />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">{T("finance.category")}</label>
                    <select
                      className="w-full h-10 rounded-md border bg-background px-3 text-sm"
                      value={formType === "INCOME" ? formData.incomeCategory : formData.expenseCategory}
                      onChange={(e) => formType === "INCOME"
                        ? setFormData({ ...formData, incomeCategory: e.target.value })
                        : setFormData({ ...formData, expenseCategory: e.target.value })
                      }
                    >
                      {(formType === "INCOME" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES).map((c) => (
                        <option key={c} value={c}>{T(`finance.cat.${c}`)}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">{T("finance.status")}</label>
                    <select className="w-full h-10 rounded-md border bg-background px-3 text-sm" value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value })}>
                      <option value="PENDING">{T("finance.pending")}</option>
                      <option value="PAID">{T("finance.paid")}</option>
                      <option value="OVERDUE">{T("finance.overdue")}</option>
                      <option value="CANCELLED">{T("finance.cancelled")}</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">{T("finance.paymentMethod")}</label>
                    <select className="w-full h-10 rounded-md border bg-background px-3 text-sm" value={formData.paymentMethod} onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })}>
                      <option value="">—</option>
                      {PAYMENT_METHODS.map((m) => (
                        <option key={m} value={m}>{T(`finance.method.${m}`)}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">{T("finance.dueDate")}</label>
                    <Input type="date" value={formData.dueDate} onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })} />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">{T("finance.paidDate")}</label>
                    <Input type="date" value={formData.paidDate} onChange={(e) => setFormData({ ...formData, paidDate: e.target.value })} />
                  </div>
                </div>

                {formType === "INCOME" ? (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">{T("finance.patient")}</label>
                    <Input value={formData.patientName} onChange={(e) => setFormData({ ...formData, patientName: e.target.value })} placeholder="..." />
                  </div>
                ) : (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">{T("finance.supplier")}</label>
                    <Input value={formData.supplierName} onChange={(e) => setFormData({ ...formData, supplierName: e.target.value })} placeholder="..." />
                  </div>
                )}

                <div>
                  <label className="text-sm font-medium text-muted-foreground">{T("finance.notes")}</label>
                  <textarea className="w-full min-h-[60px] rounded-md border bg-background px-3 py-2 text-sm" value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} />
                </div>

                <div className="flex items-center gap-2">
                  <input type="checkbox" id="recurring" checked={formData.isRecurring} onChange={(e) => setFormData({ ...formData, isRecurring: e.target.checked })} />
                  <label htmlFor="recurring" className="text-sm">{T("finance.recurring")}</label>
                  {formData.isRecurring && (
                    <Input type="number" min="1" max="31" className="w-20 ml-2" placeholder="Day" value={formData.recurringDay} onChange={(e) => setFormData({ ...formData, recurringDay: e.target.value })} />
                  )}
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <Button variant="outline" onClick={() => { setShowForm(false); resetForm(); }} className="flex-1">{T("common.cancel")}</Button>
                <Button onClick={saveEntry} disabled={!formData.description || !formData.amount} className="flex-1">{T("common.save")}</Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Dashboard Tab ───
function DashboardTab({ summary, incomeByCategory, expenseByCategory, entries, loading, formatCurrency, formatDate, T }: any) {
  if (loading) return <LoadingState />;
  if (!summary) return null;

  const recentEntries = entries.slice(0, 8);

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <SummaryCard icon={TrendingUp} label={T("finance.totalIncome")} value={formatCurrency(summary.totalIncome)} color="text-emerald-600" bgColor="bg-emerald-50" />
        <SummaryCard icon={TrendingDown} label={T("finance.totalExpenses")} value={formatCurrency(summary.totalExpenses)} color="text-red-600" bgColor="bg-red-50" />
        <SummaryCard icon={PiggyBank} label={T("finance.netProfit")} value={formatCurrency(summary.netProfit)} color={summary.netProfit >= 0 ? "text-emerald-600" : "text-red-600"} bgColor={summary.netProfit >= 0 ? "bg-emerald-50" : "bg-red-50"} />
        <SummaryCard icon={Clock} label={T("finance.pendingIncome")} value={formatCurrency(summary.pendingIncome)} color="text-amber-600" bgColor="bg-amber-50" sub={summary.overdueExpenses > 0 ? `${T("finance.overdueExpenses")}: ${formatCurrency(summary.overdueExpenses)}` : undefined} />
      </div>

      {/* Charts area */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Income by Category */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">{T("finance.incomeByCategory")}</CardTitle>
          </CardHeader>
          <CardContent>
            {incomeByCategory.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">{T("finance.noEntries")}</p>
            ) : (
              <div className="space-y-3">
                {incomeByCategory.map((c: any, i: number) => {
                  const maxAmount = Math.max(...incomeByCategory.map((x: any) => x.amount));
                  const pct = maxAmount > 0 ? (c.amount / maxAmount) * 100 : 0;
                  return (
                    <div key={i}>
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="text-muted-foreground">{T(`finance.cat.${c.category}`)}</span>
                        <span className="font-medium">{formatCurrency(c.amount)}</span>
                      </div>
                      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Expenses by Category */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">{T("finance.expenses")} — {T("finance.category")}</CardTitle>
          </CardHeader>
          <CardContent>
            {expenseByCategory.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">{T("finance.noEntries")}</p>
            ) : (
              <div className="space-y-3">
                {expenseByCategory.map((c: any, i: number) => {
                  const maxAmount = Math.max(...expenseByCategory.map((x: any) => x.amount));
                  const pct = maxAmount > 0 ? (c.amount / maxAmount) * 100 : 0;
                  return (
                    <div key={i}>
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="text-muted-foreground">{T(`finance.cat.${c.category}`)}</span>
                        <span className="font-medium">{formatCurrency(c.amount)}</span>
                      </div>
                      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-red-400 rounded-full transition-all" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Transactions */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">{T("finance.recentTransactions")}</CardTitle>
        </CardHeader>
        <CardContent>
          {recentEntries.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">{T("finance.noEntries")}</p>
          ) : (
            <div className="space-y-2">
              {recentEntries.map((entry: FinancialEntry) => (
                <TransactionRow key={entry.id} entry={entry} formatCurrency={formatCurrency} formatDate={formatDate} T={T} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Stripe Tab ───
function StripeTab({ stripeData, stripeLoading, stripeSyncing, syncStripe, formatCurrency, T }: any) {
  if (stripeLoading) return <LoadingState />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold">{T("finance.stripeTransactions")}</h2>
        <Button onClick={syncStripe} disabled={stripeSyncing} size="sm" className="gap-2">
          <RefreshCw className={`h-4 w-4 ${stripeSyncing ? "animate-spin" : ""}`} />
          {stripeSyncing ? T("finance.syncing") : T("finance.syncStripe")}
        </Button>
      </div>

      {/* Stripe Balance */}
      {stripeData?.balance && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Card className="border-emerald-200 bg-emerald-50/30">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground mb-1">Available Balance</p>
              {stripeData.balance.available.map((b: any, i: number) => (
                <p key={i} className="text-xl font-bold text-emerald-700">{formatCurrency(b.amount, b.currency)}</p>
              ))}
            </CardContent>
          </Card>
          <Card className="border-amber-200 bg-amber-50/30">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground mb-1">Pending Balance</p>
              {stripeData.balance.pending.map((b: any, i: number) => (
                <p key={i} className="text-xl font-bold text-amber-700">{formatCurrency(b.amount, b.currency)}</p>
              ))}
            </CardContent>
          </Card>
        </div>
      )}

      {stripeData?.error && (
        <Card className="border-red-200 bg-red-50/30">
          <CardContent className="p-4 text-sm text-red-700">
            Stripe Error: {stripeData.error}
          </CardContent>
        </Card>
      )}

      {/* Recent Stripe Charges */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">Recent Stripe Charges</CardTitle>
        </CardHeader>
        <CardContent>
          {!stripeData?.recentCharges?.length ? (
            <div className="text-center py-8">
              <CreditCard className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm font-medium text-muted-foreground">{T("finance.noStripeData")}</p>
              <p className="text-xs text-muted-foreground mt-1">{T("finance.noStripeDataDesc")}</p>
            </div>
          ) : (
            <div className="space-y-2">
              {stripeData.recentCharges.map((charge: any) => (
                <div key={charge.id} className="flex items-center justify-between p-3 rounded-lg border bg-background hover:bg-muted/30 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${charge.paid ? "bg-emerald-100" : "bg-amber-100"}`}>
                      {charge.paid ? <CheckCircle className="h-4 w-4 text-emerald-600" /> : <Clock className="h-4 w-4 text-amber-600" />}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{charge.description || charge.id.slice(-12)}</p>
                      <p className="text-xs text-muted-foreground">{charge.customerEmail || "—"} • {new Date(charge.created).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-emerald-700">{formatCurrency(charge.amount, charge.currency)}</p>
                    <Badge variant="outline" className="text-[10px]">{charge.status}</Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Entries Tab (Income / Expenses) ───
function EntriesTab({ entries, loading, total, type, search, setSearch, formatCurrency, formatDate, openAddForm, openEditForm, deleteEntry, markPaid, T }: any) {
  if (loading) return <LoadingState />;

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={T("common.search") + "..."} className="pl-10" />
        </div>
        <Button onClick={() => openAddForm(type)} className="gap-2">
          <Plus className="h-4 w-4" />
          {type === "INCOME" ? T("finance.addIncome") : T("finance.addExpense")}
        </Button>
      </div>

      {entries.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <Receipt className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <h3 className="text-sm font-semibold mb-1">{T("finance.noEntries")}</h3>
            <p className="text-xs text-muted-foreground">{T("finance.noEntriesDesc")}</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="divide-y">
              {entries.map((entry: FinancialEntry) => {
                const StatusIcon = STATUS_ICONS[entry.status] || Clock;
                const catKey = entry.type === "INCOME" ? entry.incomeCategory : entry.expenseCategory;
                return (
                  <div key={entry.id} className="flex items-center justify-between p-3 sm:p-4 hover:bg-muted/30 transition-colors">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${entry.type === "INCOME" ? "bg-emerald-100" : "bg-red-100"}`}>
                        {entry.type === "INCOME" ? <ArrowUpRight className="h-4 w-4 text-emerald-600" /> : <ArrowDownRight className="h-4 w-4 text-red-600" />}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{entry.description}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          {catKey && <span>{T(`finance.cat.${catKey}`)}</span>}
                          <span>•</span>
                          <span>{formatDate(entry.paidDate || entry.dueDate || entry.createdAt)}</span>
                          {entry.patientName && <><span>•</span><span>{entry.patientName}</span></>}
                          {entry.supplierName && <><span>•</span><span>{entry.supplierName}</span></>}
                          {entry.paymentMethod && <><span>•</span><span>{T(`finance.method.${entry.paymentMethod}`)}</span></>}
                          {entry.isRecurring && <Badge variant="outline" className="text-[9px] h-4">🔄</Badge>}
                          {entry.stripeChargeId && <Badge variant="outline" className="text-[9px] h-4">Stripe</Badge>}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <div className="text-right">
                        <p className={`text-sm font-bold ${entry.type === "INCOME" ? "text-emerald-700" : "text-red-600"}`}>
                          {entry.type === "INCOME" ? "+" : "−"}{formatCurrency(entry.amount, entry.currency)}
                        </p>
                        <Badge className={`text-[10px] ${STATUS_COLORS[entry.status]}`}>
                          <StatusIcon className="h-2.5 w-2.5 mr-0.5" />
                          {T(`finance.${entry.status.toLowerCase()}`)}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-1">
                        {entry.status === "PENDING" && (
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-emerald-600" onClick={() => markPaid(entry)} title={T("finance.markPaid")}>
                            <CheckCircle className="h-3.5 w-3.5" />
                          </Button>
                        )}
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => openEditForm(entry)}>
                          <Edit className="h-3.5 w-3.5" />
                        </Button>
                        {!entry.stripeChargeId && (
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-red-500" onClick={() => deleteEntry(entry.id)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      <p className="text-xs text-muted-foreground text-center">{total} {total === 1 ? "entry" : "entries"}</p>
    </div>
  );
}

// ─── Shared Components ───
function SummaryCard({ icon: Icon, label, value, color = "text-foreground", bgColor = "bg-muted/50", sub }: any) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-2">
          <div className={`w-8 h-8 rounded-lg ${bgColor} flex items-center justify-center`}>
            <Icon className={`h-4 w-4 ${color}`} />
          </div>
        </div>
        <p className="text-[11px] text-muted-foreground font-medium">{label}</p>
        <p className={`text-lg sm:text-xl font-bold ${color}`}>{value}</p>
        {sub && <p className="text-[10px] text-red-500 mt-0.5">{sub}</p>}
      </CardContent>
    </Card>
  );
}

function TransactionRow({ entry, formatCurrency, formatDate, T }: { entry: FinancialEntry; formatCurrency: any; formatDate: any; T: any }) {
  const catKey = entry.type === "INCOME" ? entry.incomeCategory : entry.expenseCategory;
  return (
    <div className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/30 transition-colors">
      <div className="flex items-center gap-3">
        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${entry.type === "INCOME" ? "bg-emerald-100" : "bg-red-100"}`}>
          {entry.type === "INCOME" ? <ArrowUpRight className="h-4 w-4 text-emerald-600" /> : <ArrowDownRight className="h-4 w-4 text-red-600" />}
        </div>
        <div>
          <p className="text-sm font-medium">{entry.description}</p>
          <p className="text-xs text-muted-foreground">
            {catKey && T(`finance.cat.${catKey}`)} • {formatDate(entry.paidDate || entry.createdAt)}
          </p>
        </div>
      </div>
      <p className={`text-sm font-bold ${entry.type === "INCOME" ? "text-emerald-700" : "text-red-600"}`}>
        {entry.type === "INCOME" ? "+" : "−"}{formatCurrency(entry.amount, entry.currency)}
      </p>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="flex items-center justify-center py-20">
      <RefreshCw className="h-5 w-5 animate-spin text-muted-foreground" />
    </div>
  );
}
