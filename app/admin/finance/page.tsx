"use client";

import { useState, useEffect, useCallback } from "react";
import {
  DollarSign, TrendingUp, TrendingDown, CreditCard, Plus, Trash2,
  RefreshCw, ArrowUpRight, ArrowDownRight, Clock, AlertTriangle,
  CheckCircle, XCircle, Search, FileText, Download, Edit, MoreVertical,
  Wallet, Receipt, PiggyBank, BarChart3, Calendar, Upload, Key, Tag,
  Copy, Shield, ShieldCheck, Eye, EyeOff, Sparkles, Building2, Save,
  Wand2, Loader2, ExternalLink, SearchCheck,
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

type Tab = "dashboard" | "stripe" | "income" | "expenses" | "categories" | "apikeys" | "company";

interface FinancialCategory {
  id: string;
  type: "INCOME" | "EXPENSE";
  name: string;
  nameEn: string;
  namePt: string;
  hmrcCode: string | null;
  hmrcLabel: string | null;
  companiesHouseSection: string | null;
  ct600Box: string | null;
  isTaxDeductible: boolean;
  isDefault: boolean;
  isActive: boolean;
  sortOrder: number;
  description: string | null;
}

interface ApiKeyItem {
  id: string;
  name: string;
  keyPrefix: string;
  permissions: string;
  lastUsedAt: string | null;
  expiresAt: string | null;
  isActive: boolean;
  createdAt: string;
  key?: string; // Only on creation
}

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

  // Categories state
  const [categories, setCategories] = useState<FinancialCategory[]>([]);
  const [catLoading, setCatLoading] = useState(false);
  const [showCatForm, setShowCatForm] = useState(false);
  const [editingCat, setEditingCat] = useState<FinancialCategory | null>(null);
  const [catForm, setCatForm] = useState({ type: "EXPENSE" as string, name: "", nameEn: "", namePt: "", hmrcCode: "", hmrcLabel: "", companiesHouseSection: "", ct600Box: "", isTaxDeductible: true, description: "", sortOrder: "50" });

  // API Keys state
  const [apiKeys, setApiKeys] = useState<ApiKeyItem[]>([]);
  const [apiKeysLoading, setApiKeysLoading] = useState(false);
  const [showKeyForm, setShowKeyForm] = useState(false);
  const [newKeyData, setNewKeyData] = useState<ApiKeyItem | null>(null);
  const [keyForm, setKeyForm] = useState({ name: "", permissions: "finance:read", expiresAt: "" });

  // OCR state
  const [ocrProcessing, setOcrProcessing] = useState(false);
  const [ocrResult, setOcrResult] = useState<any>(null);

  // Company Profile state
  const [companyProfile, setCompanyProfile] = useState<any>({});
  const [companyLoading, setCompanyLoading] = useState(false);
  const [companySaving, setCompanySaving] = useState(false);

  // Companies House search state
  const [chSearchQuery, setChSearchQuery] = useState("");
  const [chSearchResults, setChSearchResults] = useState<any[]>([]);
  const [chSearching, setChSearching] = useState(false);
  const [chFetchingNumber, setChFetchingNumber] = useState<string | null>(null);
  const [showChSearch, setShowChSearch] = useState(false);

  // IAPA auto-fill state
  const [iapaLoading, setIapaLoading] = useState(false);

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

  // ─── Company Profile ───
  const fetchCompanyProfile = async () => {
    setCompanyLoading(true);
    try {
      const res = await fetch("/api/admin/finance/company");
      const data = await res.json();
      setCompanyProfile(data || {});
    } catch {}
    setCompanyLoading(false);
  };

  // ─── Companies House Search ───
  const searchCompaniesHouse = async () => {
    if (!chSearchQuery.trim()) return;
    setChSearching(true);
    setChSearchResults([]);
    try {
      const res = await fetch(`/api/admin/finance/company/search?q=${encodeURIComponent(chSearchQuery)}`);
      const data = await res.json();
      if (data.error) {
        toast({ title: "Companies House", description: data.error, variant: "destructive" });
      } else {
        setChSearchResults(data.results || []);
        if ((data.results || []).length === 0) {
          toast({ title: "Companies House", description: "No companies found." });
        }
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
    setChSearching(false);
  };

  const fetchFromCompaniesHouse = async (companyNumber: string) => {
    setChFetchingNumber(companyNumber);
    try {
      const res = await fetch(`/api/admin/finance/company/search?number=${encodeURIComponent(companyNumber)}`);
      const data = await res.json();
      if (data.error) {
        toast({ title: "Companies House", description: data.error, variant: "destructive" });
      } else if (data.profile) {
        // Only merge non-empty values to avoid overwriting existing data
        const filtered: Record<string, any> = {};
        for (const [k, v] of Object.entries(data.profile)) {
          if (v !== null && v !== undefined && v !== "") filtered[k] = v;
        }
        setCompanyProfile((prev: any) => ({ ...prev, ...filtered }));
        setShowChSearch(false);
        setChSearchResults([]);
        setChSearchQuery("");
        toast({ title: "Companies House", description: "Company data imported successfully! Review and Save." });
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
    setChFetchingNumber(null);
  };

  // ─── IAPA Auto-fill ───
  const iapaAutofill = async () => {
    setIapaLoading(true);
    try {
      const res = await fetch("/api/admin/finance/company/autofill", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentProfile: companyProfile }),
      });
      const data = await res.json();
      if (data.error) {
        toast({ title: "IAPA", description: data.error, variant: "destructive" });
      } else if (data.suggestions) {
        const count = Object.keys(data.suggestions).length;
        if (count > 0) {
          setCompanyProfile((prev: any) => ({ ...prev, ...data.suggestions }));
          toast({ title: "IAPA Auto-fill", description: `${count} fields suggested. Review and Save.` });
        } else {
          toast({ title: "IAPA", description: "All fields seem to be filled already." });
        }
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
    setIapaLoading(false);
  };

  const saveCompanyProfile = async () => {
    setCompanySaving(true);
    try {
      const res = await fetch("/api/admin/finance/company", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(companyProfile),
      });
      const data = await res.json();
      if (data.error) {
        toast({ title: "Error", description: data.error, variant: "destructive" });
      } else {
        setCompanyProfile(data);
        toast({ title: T("common.success"), description: "Company profile saved" });
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
    setCompanySaving(false);
  };

  useEffect(() => {
    if (tab === "stripe") fetchStripeData();
    if (tab === "categories") fetchCategories();
    if (tab === "apikeys") fetchApiKeys();
    if (tab === "company") fetchCompanyProfile();
  }, [tab]);

  // ─── Categories ───
  const fetchCategories = async () => {
    setCatLoading(true);
    try {
      const res = await fetch("/api/admin/finance/categories?activeOnly=false");
      setCategories(await res.json());
    } catch {}
    setCatLoading(false);
  };

  const saveCategory = async () => {
    const payload: any = { ...catForm, sortOrder: parseInt(catForm.sortOrder) || 50 };
    if (editingCat) payload.id = editingCat.id;
    const method = editingCat ? "PATCH" : "POST";
    await fetch("/api/admin/finance/categories", { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    setShowCatForm(false);
    setEditingCat(null);
    setCatForm({ type: "EXPENSE", name: "", nameEn: "", namePt: "", hmrcCode: "", hmrcLabel: "", companiesHouseSection: "", ct600Box: "", isTaxDeductible: true, description: "", sortOrder: "50" });
    fetchCategories();
    toast({ title: T("common.success") });
  };

  const toggleCategory = async (cat: FinancialCategory) => {
    await fetch("/api/admin/finance/categories", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: cat.id, isActive: !cat.isActive }) });
    fetchCategories();
  };

  const openEditCat = (cat: FinancialCategory) => {
    setEditingCat(cat);
    setCatForm({ type: cat.type, name: cat.name, nameEn: cat.nameEn, namePt: cat.namePt, hmrcCode: cat.hmrcCode || "", hmrcLabel: cat.hmrcLabel || "", companiesHouseSection: cat.companiesHouseSection || "", ct600Box: cat.ct600Box || "", isTaxDeductible: cat.isTaxDeductible, description: cat.description || "", sortOrder: String(cat.sortOrder) });
    setShowCatForm(true);
  };

  // ─── API Keys ───
  const fetchApiKeys = async () => {
    setApiKeysLoading(true);
    try {
      const res = await fetch("/api/admin/finance/api-keys");
      setApiKeys(await res.json());
    } catch {}
    setApiKeysLoading(false);
  };

  const createApiKey = async () => {
    const res = await fetch("/api/admin/finance/api-keys", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(keyForm) });
    const data = await res.json();
    setNewKeyData(data);
    setShowKeyForm(false);
    setKeyForm({ name: "", permissions: "finance:read", expiresAt: "" });
    fetchApiKeys();
  };

  const revokeApiKey = async (id: string) => {
    if (!confirm(T("finance.revokeKey") + "?")) return;
    await fetch(`/api/admin/finance/api-keys?id=${id}`, { method: "DELETE" });
    fetchApiKeys();
    toast({ title: T("common.success") });
  };

  // ─── OCR Upload ───
  const handleOcrUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setOcrProcessing(true);
    setOcrResult(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/admin/finance/ocr", { method: "POST", body: fd });
      const data = await res.json();
      if (data.error) {
        toast({ title: "Error", description: data.error, variant: "destructive" });
      } else {
        setOcrResult(data);
        // Pre-fill the form
        const ext = data.extracted;
        setFormType(ext.type || "EXPENSE");
        setFormData({
          ...formData,
          description: ext.description || "",
          amount: String(ext.amount || ""),
          currency: ext.currency || "GBP",
          supplierName: ext.supplierName || "",
          dueDate: ext.dueDate || "",
          paidDate: ext.invoiceDate || "",
          status: "PENDING",
          notes: ext.rawText ? `Invoice #${ext.invoiceNumber || "N/A"}\n${ext.categoryReason || ""}` : "",
          expenseCategory: "OTHER_EXPENSE",
          incomeCategory: "OTHER_INCOME",
          paymentMethod: "",
          patientName: "",
          isRecurring: false,
          recurringDay: "",
        });
        setShowForm(true);
        toast({ title: T("finance.aiExtracted"), description: `${T("finance.confidence")}: ${Math.round((ext.confidence || 0) * 100)}%` });
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
    setOcrProcessing(false);
    e.target.value = "";
  };

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
    { key: "categories", label: T("finance.categories"), icon: Tag },
    { key: "apikeys", label: T("finance.apiKeys"), icon: Key },
    { key: "company", label: "Company", icon: Building2 },
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
          <label className="cursor-pointer">
            <input type="file" accept=".pdf,.jpg,.jpeg,.png,.webp" className="hidden" onChange={handleOcrUpload} disabled={ocrProcessing} />
            <Button variant="outline" size="sm" className="gap-1.5" asChild disabled={ocrProcessing}>
              <span>{ocrProcessing ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}{ocrProcessing ? T("finance.processing") : T("finance.uploadInvoice")}</span>
            </Button>
          </label>
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

      {/* Categories Tab */}
      {tab === "categories" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold">{T("finance.manageCategories")}</h2>
            <Button size="sm" className="gap-1.5" onClick={() => { setEditingCat(null); setCatForm({ type: "EXPENSE", name: "", nameEn: "", namePt: "", hmrcCode: "", hmrcLabel: "", companiesHouseSection: "", ct600Box: "", isTaxDeductible: true, description: "", sortOrder: "50" }); setShowCatForm(true); }}>
              <Plus className="h-4 w-4" />{T("finance.addCategory")}
            </Button>
          </div>
          {catLoading ? <LoadingState /> : (
            <>
              {["INCOME", "EXPENSE"].map((catType) => {
                const filtered = categories.filter((c) => c.type === catType);
                if (!filtered.length) return null;
                return (
                  <div key={catType}>
                    <h3 className="text-sm font-semibold text-muted-foreground mb-2 flex items-center gap-2">
                      {catType === "INCOME" ? <ArrowUpRight className="h-4 w-4 text-emerald-600" /> : <ArrowDownRight className="h-4 w-4 text-red-600" />}
                      {catType === "INCOME" ? T("finance.income") : T("finance.expenses")} ({filtered.length})
                    </h3>
                    <Card><CardContent className="p-0"><div className="divide-y">
                      {filtered.map((cat) => (
                        <div key={cat.id} className={`flex items-center justify-between p-3 hover:bg-muted/30 transition-colors ${!cat.isActive ? "opacity-50" : ""}`}>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-medium">{locale === "pt-BR" ? cat.namePt : cat.nameEn}</p>
                              {cat.isDefault && <Badge variant="outline" className="text-[9px] h-4">{T("finance.defaultCategory")}</Badge>}
                              {cat.isTaxDeductible && <Badge variant="outline" className="text-[9px] h-4 text-emerald-600">{T("finance.taxDeductible")}</Badge>}
                              {!cat.isActive && <Badge variant="outline" className="text-[9px] h-4 text-red-500">Inactive</Badge>}
                            </div>
                            <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                              {cat.hmrcCode && <span>HMRC: {cat.hmrcCode}</span>}
                              {cat.ct600Box && <span>CT600: {cat.ct600Box}</span>}
                              {cat.companiesHouseSection && <span>CH: {cat.companiesHouseSection}</span>}
                            </div>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => openEditCat(cat)}><Edit className="h-3.5 w-3.5" /></Button>
                            <Button variant="ghost" size="sm" className={`h-7 w-7 p-0 ${cat.isActive ? "text-amber-500" : "text-emerald-500"}`} onClick={() => toggleCategory(cat)}>
                              {cat.isActive ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div></CardContent></Card>
                  </div>
                );
              })}
            </>
          )}
          {/* Category Form Modal */}
          {showCatForm && (
            <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setShowCatForm(false)}>
              <div className="bg-background rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                <div className="p-6 space-y-4">
                  <h2 className="text-lg font-bold">{editingCat ? T("finance.editCategory") : T("finance.addCategory")}</h2>
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Type</label>
                        <select className="w-full h-10 rounded-md border bg-background px-3 text-sm" value={catForm.type} onChange={(e) => setCatForm({ ...catForm, type: e.target.value })}>
                          <option value="INCOME">{T("finance.income")}</option>
                          <option value="EXPENSE">{T("finance.expenses")}</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Sort Order</label>
                        <Input type="number" value={catForm.sortOrder} onChange={(e) => setCatForm({ ...catForm, sortOrder: e.target.value })} />
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Name (Display)</label>
                      <Input value={catForm.name} onChange={(e) => setCatForm({ ...catForm, name: e.target.value })} />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div><label className="text-sm font-medium text-muted-foreground">English Name</label><Input value={catForm.nameEn} onChange={(e) => setCatForm({ ...catForm, nameEn: e.target.value })} /></div>
                      <div><label className="text-sm font-medium text-muted-foreground">Portuguese Name</label><Input value={catForm.namePt} onChange={(e) => setCatForm({ ...catForm, namePt: e.target.value })} /></div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div><label className="text-sm font-medium text-muted-foreground">{T("finance.hmrcCode")}</label><Input value={catForm.hmrcCode} onChange={(e) => setCatForm({ ...catForm, hmrcCode: e.target.value })} placeholder="e.g. STAFF" /></div>
                      <div><label className="text-sm font-medium text-muted-foreground">{T("finance.ct600Box")}</label><Input value={catForm.ct600Box} onChange={(e) => setCatForm({ ...catForm, ct600Box: e.target.value })} placeholder="e.g. Box 63" /></div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div><label className="text-sm font-medium text-muted-foreground">HMRC Label</label><Input value={catForm.hmrcLabel} onChange={(e) => setCatForm({ ...catForm, hmrcLabel: e.target.value })} /></div>
                      <div><label className="text-sm font-medium text-muted-foreground">{T("finance.companiesHouse")}</label><Input value={catForm.companiesHouseSection} onChange={(e) => setCatForm({ ...catForm, companiesHouseSection: e.target.value })} placeholder="e.g. PL/AdminExpenses" /></div>
                    </div>
                    <div><label className="text-sm font-medium text-muted-foreground">{T("finance.description")}</label><textarea className="w-full min-h-[50px] rounded-md border bg-background px-3 py-2 text-sm" value={catForm.description} onChange={(e) => setCatForm({ ...catForm, description: e.target.value })} /></div>
                    <div className="flex items-center gap-2">
                      <input type="checkbox" id="taxDeductible" checked={catForm.isTaxDeductible} onChange={(e) => setCatForm({ ...catForm, isTaxDeductible: e.target.checked })} />
                      <label htmlFor="taxDeductible" className="text-sm">{T("finance.taxDeductible")}</label>
                    </div>
                  </div>
                  <div className="flex gap-2 pt-2">
                    <Button variant="outline" onClick={() => setShowCatForm(false)} className="flex-1">{T("common.cancel")}</Button>
                    <Button onClick={saveCategory} disabled={!catForm.name || !catForm.nameEn || !catForm.namePt} className="flex-1">{T("common.save")}</Button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* API Keys Tab */}
      {tab === "apikeys" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold">{T("finance.apiKeys")}</h2>
              <p className="text-xs text-muted-foreground">{T("finance.apiKeysDesc")}</p>
            </div>
            <Button size="sm" className="gap-1.5" onClick={() => setShowKeyForm(true)}>
              <Plus className="h-4 w-4" />{T("finance.createKey")}
            </Button>
          </div>

          {/* New Key Display (shown once after creation) */}
          {newKeyData?.key && (
            <Card className="border-amber-300 bg-amber-50/50">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-bold text-amber-800">{T("finance.keyWarning")}</p>
                    <div className="mt-2 flex items-center gap-2 bg-white rounded-md border p-2">
                      <code className="text-xs flex-1 break-all font-mono">{newKeyData.key}</code>
                      <Button variant="ghost" size="sm" className="h-7 shrink-0" onClick={() => { navigator.clipboard.writeText(newKeyData.key!); toast({ title: T("finance.copyKey") }); }}>
                        <Copy className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                    <Button variant="ghost" size="sm" className="mt-2 text-xs" onClick={() => setNewKeyData(null)}>Dismiss</Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* API Documentation */}
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold flex items-center gap-2"><FileText className="h-4 w-4" />{T("finance.apiDocs")}</CardTitle></CardHeader>
            <CardContent className="text-xs space-y-2">
              <p className="text-muted-foreground">Base URL: <code className="bg-muted px-1.5 py-0.5 rounded">https://bpr.rehab/api/external/finance</code></p>
              <p className="text-muted-foreground">Auth Header: <code className="bg-muted px-1.5 py-0.5 rounded">X-API-Key: bpr_k_your_key_here</code></p>
              <div className="space-y-1 mt-2">
                <p className="font-medium">Endpoints:</p>
                <p className="text-muted-foreground">• <code className="bg-muted px-1 py-0.5 rounded">GET ?action=summary&period=thisMonth</code> — Financial summary</p>
                <p className="text-muted-foreground">• <code className="bg-muted px-1 py-0.5 rounded">GET ?action=entries&type=INCOME&page=1</code> — List entries</p>
                <p className="text-muted-foreground">• <code className="bg-muted px-1 py-0.5 rounded">GET ?action=categories</code> — List categories</p>
                <p className="text-muted-foreground">• <code className="bg-muted px-1 py-0.5 rounded">POST</code> — Create entry (requires finance:write)</p>
              </div>
            </CardContent>
          </Card>

          {/* Keys List */}
          {apiKeysLoading ? <LoadingState /> : apiKeys.length === 0 ? (
            <Card className="border-dashed"><CardContent className="py-8 text-center">
              <Key className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No API keys yet</p>
            </CardContent></Card>
          ) : (
            <Card><CardContent className="p-0"><div className="divide-y">
              {apiKeys.map((k) => (
                <div key={k.id} className="flex items-center justify-between p-3 hover:bg-muted/30">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${k.isActive ? "bg-emerald-100" : "bg-red-100"}`}>
                      {k.isActive ? <ShieldCheck className="h-4 w-4 text-emerald-600" /> : <Shield className="h-4 w-4 text-red-500" />}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{k.name}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <code className="bg-muted px-1 rounded">{k.keyPrefix}</code>
                        <Badge variant="outline" className="text-[9px] h-4">{k.permissions.includes("write") ? T("finance.readWrite") : T("finance.readOnly")}</Badge>
                        {k.lastUsedAt && <span>{T("finance.lastUsed")}: {formatDate(k.lastUsedAt)}</span>}
                        {k.expiresAt && <span>{T("finance.expires")}: {formatDate(k.expiresAt)}</span>}
                      </div>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" className="text-red-500 text-xs" onClick={() => revokeApiKey(k.id)}>
                    <Trash2 className="h-3.5 w-3.5 mr-1" />{T("finance.revokeKey")}
                  </Button>
                </div>
              ))}
            </div></CardContent></Card>
          )}

          {/* Create Key Modal */}
          {showKeyForm && (
            <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setShowKeyForm(false)}>
              <div className="bg-background rounded-xl shadow-xl w-full max-w-md" onClick={(e) => e.stopPropagation()}>
                <div className="p-6 space-y-4">
                  <h2 className="text-lg font-bold">{T("finance.createKey")}</h2>
                  <div className="space-y-3">
                    <div><label className="text-sm font-medium text-muted-foreground">{T("finance.keyName")}</label><Input value={keyForm.name} onChange={(e) => setKeyForm({ ...keyForm, name: e.target.value })} placeholder="e.g. Xero Integration" /></div>
                    <div><label className="text-sm font-medium text-muted-foreground">{T("finance.permissions")}</label>
                      <select className="w-full h-10 rounded-md border bg-background px-3 text-sm" value={keyForm.permissions} onChange={(e) => setKeyForm({ ...keyForm, permissions: e.target.value })}>
                        <option value="finance:read">{T("finance.readOnly")}</option>
                        <option value="finance:read,finance:write">{T("finance.readWrite")}</option>
                      </select>
                    </div>
                    <div><label className="text-sm font-medium text-muted-foreground">{T("finance.expires")} (optional)</label><Input type="date" value={keyForm.expiresAt} onChange={(e) => setKeyForm({ ...keyForm, expiresAt: e.target.value })} /></div>
                  </div>
                  <div className="flex gap-2 pt-2">
                    <Button variant="outline" onClick={() => setShowKeyForm(false)} className="flex-1">{T("common.cancel")}</Button>
                    <Button onClick={createApiKey} disabled={!keyForm.name} className="flex-1">{T("finance.createKey")}</Button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Company Profile Tab */}
      {tab === "company" && (
        <div className="space-y-6">
          {companyLoading ? <LoadingState /> : (
            <>
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                  <h2 className="text-base font-semibold flex items-center gap-2"><Building2 className="h-4 w-4" /> Company Profile</h2>
                  <p className="text-xs text-muted-foreground">Companies House registration, HMRC details, and fiscal year information for accounting exports.</p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <Button variant="outline" onClick={() => setShowChSearch(!showChSearch)} className="gap-1.5 text-xs" disabled={!!chFetchingNumber}>
                    {chFetchingNumber ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <SearchCheck className="h-3.5 w-3.5" />}
                    Search Companies House
                  </Button>
                  <Button variant="outline" onClick={iapaAutofill} disabled={iapaLoading} className="gap-1.5 text-xs">
                    {iapaLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Wand2 className="h-3.5 w-3.5" />}
                    {iapaLoading ? "IAPA thinking..." : "IAPA Auto-fill"}
                  </Button>
                  <Button onClick={saveCompanyProfile} disabled={companySaving} className="gap-1.5">
                    {companySaving ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                    {companySaving ? "Saving..." : "Save Profile"}
                  </Button>
                </div>
              </div>

              {/* Companies House Search Panel */}
              {showChSearch && (
                <Card className="border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/20">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                      <SearchCheck className="h-4 w-4 text-emerald-600" /> Search Companies House
                    </CardTitle>
                    <p className="text-xs text-muted-foreground">Search by company name or number. Data will be imported automatically.</p>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex gap-2">
                      <Input
                        value={chSearchQuery}
                        onChange={(e) => setChSearchQuery(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && searchCompaniesHouse()}
                        placeholder="Company name or number..."
                        className="flex-1"
                      />
                      <Button onClick={searchCompaniesHouse} disabled={chSearching || !chSearchQuery.trim()} className="gap-1.5">
                        {chSearching ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Search className="h-3.5 w-3.5" />}
                        Search
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => { setShowChSearch(false); setChSearchResults([]); setChSearchQuery(""); }}>
                        <XCircle className="h-4 w-4" />
                      </Button>
                    </div>

                    {/* Search Results */}
                    {chSearchResults.length > 0 && (
                      <div className="space-y-2 max-h-[300px] overflow-y-auto">
                        {chSearchResults.map((r: any, i: number) => (
                          <div
                            key={i}
                            className="flex items-center justify-between p-3 rounded-lg border bg-background hover:border-emerald-300 transition cursor-pointer"
                            onClick={() => fetchFromCompaniesHouse(r.companyNumber)}
                          >
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{r.companyName}</p>
                              <p className="text-xs text-muted-foreground">
                                {r.companyNumber} &bull; {r.companyStatus} &bull; {r.companyType}
                              </p>
                              {r.address && <p className="text-[10px] text-muted-foreground truncate mt-0.5">{r.address}</p>}
                            </div>
                            <div className="flex items-center gap-1.5 ml-3 flex-shrink-0">
                              {chFetchingNumber === r.companyNumber ? (
                                <Loader2 className="h-4 w-4 animate-spin text-emerald-500" />
                              ) : (
                                <Badge variant="outline" className="text-[10px] gap-1 cursor-pointer hover:bg-emerald-50">
                                  <ExternalLink className="h-3 w-3" /> Import
                                </Badge>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Quick fetch by number */}
                    {companyProfile.companyNumber && !chSearchResults.length && (
                      <div className="flex items-center gap-2 pt-1">
                        <p className="text-xs text-muted-foreground">Current CRN: <strong>{companyProfile.companyNumber}</strong></p>
                        <Button variant="link" size="sm" className="text-xs h-auto p-0" disabled={!!chFetchingNumber} onClick={() => fetchFromCompaniesHouse(companyProfile.companyNumber)}>
                          Refresh from Companies House
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Companies House Registration */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold">Companies House Registration</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div><label className="text-xs font-medium text-muted-foreground">Registered Company Name *</label><Input value={companyProfile.companyName || ""} onChange={(e) => setCompanyProfile({ ...companyProfile, companyName: e.target.value })} placeholder="e.g. Acme Healthcare Ltd" /></div>
                    <div><label className="text-xs font-medium text-muted-foreground">Trading Name</label><Input value={companyProfile.tradingName || ""} onChange={(e) => setCompanyProfile({ ...companyProfile, tradingName: e.target.value })} placeholder="e.g. Your Trading Name" /></div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div><label className="text-xs font-medium text-muted-foreground">Company Number (CRN)</label><Input value={companyProfile.companyNumber || ""} onChange={(e) => setCompanyProfile({ ...companyProfile, companyNumber: e.target.value })} placeholder="e.g. 00000000" /></div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground">Company Type</label>
                      <select className="w-full h-10 rounded-md border bg-background px-3 text-sm" value={companyProfile.companyType || ""} onChange={(e) => setCompanyProfile({ ...companyProfile, companyType: e.target.value })}>
                        <option value="">Select...</option>
                        <option value="Private Limited Company">Private Limited Company (Ltd)</option>
                        <option value="Public Limited Company">Public Limited Company (PLC)</option>
                        <option value="Limited Liability Partnership">Limited Liability Partnership (LLP)</option>
                        <option value="Sole Trader">Sole Trader</option>
                        <option value="Partnership">Partnership</option>
                        <option value="Community Interest Company">Community Interest Company (CIC)</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground">Company Status</label>
                      <select className="w-full h-10 rounded-md border bg-background px-3 text-sm" value={companyProfile.companyStatus || ""} onChange={(e) => setCompanyProfile({ ...companyProfile, companyStatus: e.target.value })}>
                        <option value="">Select...</option>
                        <option value="Active">Active</option>
                        <option value="Dormant">Dormant</option>
                        <option value="Dissolved">Dissolved</option>
                        <option value="Liquidation">In Liquidation</option>
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div><label className="text-xs font-medium text-muted-foreground">Date of Incorporation</label><Input type="date" value={companyProfile.dateOfIncorporation?.slice(0, 10) || ""} onChange={(e) => setCompanyProfile({ ...companyProfile, dateOfIncorporation: e.target.value })} /></div>
                    <div><label className="text-xs font-medium text-muted-foreground">Country of Origin</label><Input value={companyProfile.countryOfOrigin || ""} onChange={(e) => setCompanyProfile({ ...companyProfile, countryOfOrigin: e.target.value })} placeholder="United Kingdom" /></div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div><label className="text-xs font-medium text-muted-foreground">SIC Codes (comma separated)</label><Input value={companyProfile.sicCodes || ""} onChange={(e) => setCompanyProfile({ ...companyProfile, sicCodes: e.target.value })} placeholder='86900, 96040' /><p className="text-[10px] text-muted-foreground mt-0.5">86900 = Other human health activities, 96040 = Physical well-being activities</p></div>
                    <div><label className="text-xs font-medium text-muted-foreground">SIC Descriptions</label><Input value={companyProfile.sicDescriptions || ""} onChange={(e) => setCompanyProfile({ ...companyProfile, sicDescriptions: e.target.value })} placeholder="Other human health activities" /></div>
                  </div>
                </CardContent>
              </Card>

              {/* Registered Office Address */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold">Registered Office Address</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div><label className="text-xs font-medium text-muted-foreground">Address Line 1</label><Input value={companyProfile.regAddressLine1 || ""} onChange={(e) => setCompanyProfile({ ...companyProfile, regAddressLine1: e.target.value })} placeholder="e.g. 10 Downing Street" /></div>
                    <div><label className="text-xs font-medium text-muted-foreground">Address Line 2</label><Input value={companyProfile.regAddressLine2 || ""} onChange={(e) => setCompanyProfile({ ...companyProfile, regAddressLine2: e.target.value })} placeholder="e.g. Unit 2" /></div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                    <div><label className="text-xs font-medium text-muted-foreground">City</label><Input value={companyProfile.regAddressCity || ""} onChange={(e) => setCompanyProfile({ ...companyProfile, regAddressCity: e.target.value })} placeholder="e.g. London" /></div>
                    <div><label className="text-xs font-medium text-muted-foreground">County</label><Input value={companyProfile.regAddressCounty || ""} onChange={(e) => setCompanyProfile({ ...companyProfile, regAddressCounty: e.target.value })} placeholder="e.g. Greater London" /></div>
                    <div><label className="text-xs font-medium text-muted-foreground">Postcode</label><Input value={companyProfile.regAddressPostcode || ""} onChange={(e) => setCompanyProfile({ ...companyProfile, regAddressPostcode: e.target.value })} placeholder="e.g. SW1A 1AA" /></div>
                    <div><label className="text-xs font-medium text-muted-foreground">Country</label><Input value={companyProfile.regAddressCountry || ""} onChange={(e) => setCompanyProfile({ ...companyProfile, regAddressCountry: e.target.value })} placeholder="England and Wales" /></div>
                  </div>
                </CardContent>
              </Card>

              {/* Trading Address */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold">Trading / Correspondence Address</CardTitle>
                  <p className="text-xs text-muted-foreground">Leave blank if same as registered address</p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div><label className="text-xs font-medium text-muted-foreground">Address Line 1</label><Input value={companyProfile.tradAddressLine1 || ""} onChange={(e) => setCompanyProfile({ ...companyProfile, tradAddressLine1: e.target.value })} /></div>
                    <div><label className="text-xs font-medium text-muted-foreground">Address Line 2</label><Input value={companyProfile.tradAddressLine2 || ""} onChange={(e) => setCompanyProfile({ ...companyProfile, tradAddressLine2: e.target.value })} /></div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                    <div><label className="text-xs font-medium text-muted-foreground">City</label><Input value={companyProfile.tradAddressCity || ""} onChange={(e) => setCompanyProfile({ ...companyProfile, tradAddressCity: e.target.value })} /></div>
                    <div><label className="text-xs font-medium text-muted-foreground">County</label><Input value={companyProfile.tradAddressCounty || ""} onChange={(e) => setCompanyProfile({ ...companyProfile, tradAddressCounty: e.target.value })} /></div>
                    <div><label className="text-xs font-medium text-muted-foreground">Postcode</label><Input value={companyProfile.tradAddressPostcode || ""} onChange={(e) => setCompanyProfile({ ...companyProfile, tradAddressPostcode: e.target.value })} /></div>
                    <div><label className="text-xs font-medium text-muted-foreground">Country</label><Input value={companyProfile.tradAddressCountry || ""} onChange={(e) => setCompanyProfile({ ...companyProfile, tradAddressCountry: e.target.value })} /></div>
                  </div>
                </CardContent>
              </Card>

              {/* Tax & HMRC */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold">Tax & HMRC</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div><label className="text-xs font-medium text-muted-foreground">VAT Number</label><Input value={companyProfile.vatNumber || ""} onChange={(e) => setCompanyProfile({ ...companyProfile, vatNumber: e.target.value })} placeholder="e.g. GB 000 0000 00" /></div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground">VAT Scheme</label>
                      <select className="w-full h-10 rounded-md border bg-background px-3 text-sm" value={companyProfile.vatScheme || ""} onChange={(e) => setCompanyProfile({ ...companyProfile, vatScheme: e.target.value })}>
                        <option value="">Not VAT Registered</option>
                        <option value="Standard">Standard (20%)</option>
                        <option value="Flat Rate">Flat Rate</option>
                        <option value="Cash Accounting">Cash Accounting</option>
                        <option value="Annual Accounting">Annual Accounting</option>
                      </select>
                    </div>
                    <div><label className="text-xs font-medium text-muted-foreground">VAT Registration Date</label><Input type="date" value={companyProfile.vatRegisteredDate?.slice(0, 10) || ""} onChange={(e) => setCompanyProfile({ ...companyProfile, vatRegisteredDate: e.target.value })} /></div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div><label className="text-xs font-medium text-muted-foreground">UTR (Unique Taxpayer Ref)</label><Input value={companyProfile.utr || ""} onChange={(e) => setCompanyProfile({ ...companyProfile, utr: e.target.value })} placeholder="e.g. 0000000000" /><p className="text-[10px] text-muted-foreground mt-0.5">10-digit HMRC reference for Corporation Tax</p></div>
                    <div><label className="text-xs font-medium text-muted-foreground">Corporation Tax Reference</label><Input value={companyProfile.corporationTaxRef || ""} onChange={(e) => setCompanyProfile({ ...companyProfile, corporationTaxRef: e.target.value })} placeholder="" /></div>
                    <div><label className="text-xs font-medium text-muted-foreground">PAYE Employer Reference</label><Input value={companyProfile.payeReference || ""} onChange={(e) => setCompanyProfile({ ...companyProfile, payeReference: e.target.value })} placeholder="e.g. 000/AA00000" /></div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div><label className="text-xs font-medium text-muted-foreground">National Insurance Number</label><Input value={companyProfile.niNumber || ""} onChange={(e) => setCompanyProfile({ ...companyProfile, niNumber: e.target.value })} placeholder="e.g. AA 00 00 00 A" /><p className="text-[10px] text-muted-foreground mt-0.5">For sole traders only</p></div>
                    <div><label className="text-xs font-medium text-muted-foreground">Tax Year End (ARD)</label><Input value={companyProfile.taxYearEnd || ""} onChange={(e) => setCompanyProfile({ ...companyProfile, taxYearEnd: e.target.value })} placeholder="31 March" /><p className="text-[10px] text-muted-foreground mt-0.5">Accounting Reference Date</p></div>
                    <div />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div><label className="text-xs font-medium text-muted-foreground">Accounting Period Start</label><Input type="date" value={companyProfile.accountingPeriodStart?.slice(0, 10) || ""} onChange={(e) => setCompanyProfile({ ...companyProfile, accountingPeriodStart: e.target.value })} /></div>
                    <div><label className="text-xs font-medium text-muted-foreground">Accounting Period End</label><Input type="date" value={companyProfile.accountingPeriodEnd?.slice(0, 10) || ""} onChange={(e) => setCompanyProfile({ ...companyProfile, accountingPeriodEnd: e.target.value })} /></div>
                  </div>
                </CardContent>
              </Card>

              {/* Filing Dates */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold">Filing Dates</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div><label className="text-xs font-medium text-muted-foreground">Next Accounts Due</label><Input type="date" value={companyProfile.nextAccountsDue?.slice(0, 10) || ""} onChange={(e) => setCompanyProfile({ ...companyProfile, nextAccountsDue: e.target.value })} /></div>
                    <div><label className="text-xs font-medium text-muted-foreground">Next Confirmation Statement Due</label><Input type="date" value={companyProfile.nextConfirmationDue?.slice(0, 10) || ""} onChange={(e) => setCompanyProfile({ ...companyProfile, nextConfirmationDue: e.target.value })} /></div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div><label className="text-xs font-medium text-muted-foreground">Last Accounts Filed</label><Input type="date" value={companyProfile.lastAccountsFiled?.slice(0, 10) || ""} onChange={(e) => setCompanyProfile({ ...companyProfile, lastAccountsFiled: e.target.value })} /></div>
                    <div><label className="text-xs font-medium text-muted-foreground">Last Confirmation Statement Filed</label><Input type="date" value={companyProfile.lastConfirmationFiled?.slice(0, 10) || ""} onChange={(e) => setCompanyProfile({ ...companyProfile, lastConfirmationFiled: e.target.value })} /></div>
                  </div>
                </CardContent>
              </Card>

              {/* Directors */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold">Directors & Officers</CardTitle>
                  <p className="text-xs text-muted-foreground">JSON format: [&#123;"name":"John Smith","role":"Director","appointedDate":"2024-01-01","nationality":"British"&#125;]</p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div><label className="text-xs font-medium text-muted-foreground">Directors (JSON)</label><textarea className="w-full min-h-[80px] rounded-md border bg-background px-3 py-2 text-xs font-mono" value={companyProfile.directorsJson || ""} onChange={(e) => setCompanyProfile({ ...companyProfile, directorsJson: e.target.value })} placeholder='[{"name":"Jane Smith","role":"Director","appointedDate":"2024-01-01","nationality":"British"}]' /></div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div><label className="text-xs font-medium text-muted-foreground">Company Secretary Name</label><Input value={companyProfile.secretaryName || ""} onChange={(e) => setCompanyProfile({ ...companyProfile, secretaryName: e.target.value })} placeholder="Optional" /></div>
                    <div><label className="text-xs font-medium text-muted-foreground">Secretary Address</label><Input value={companyProfile.secretaryAddress || ""} onChange={(e) => setCompanyProfile({ ...companyProfile, secretaryAddress: e.target.value })} /></div>
                  </div>
                </CardContent>
              </Card>

              {/* Banking */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold">Banking Details</CardTitle>
                  <p className="text-xs text-muted-foreground">Used for accounting exports and BACS payments. Data is stored securely.</p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div><label className="text-xs font-medium text-muted-foreground">Bank Name</label><Input value={companyProfile.bankName || ""} onChange={(e) => setCompanyProfile({ ...companyProfile, bankName: e.target.value })} placeholder="Barclays, HSBC, Starling..." /></div>
                    <div><label className="text-xs font-medium text-muted-foreground">Account Holder Name</label><Input value={companyProfile.bankAccountName || ""} onChange={(e) => setCompanyProfile({ ...companyProfile, bankAccountName: e.target.value })} placeholder="e.g. Company Name Ltd" /></div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div><label className="text-xs font-medium text-muted-foreground">Sort Code</label><Input value={companyProfile.bankSortCode || ""} onChange={(e) => setCompanyProfile({ ...companyProfile, bankSortCode: e.target.value })} placeholder="e.g. 00-00-00" /></div>
                    <div><label className="text-xs font-medium text-muted-foreground">Account Number</label><Input value={companyProfile.bankAccountNumber || ""} onChange={(e) => setCompanyProfile({ ...companyProfile, bankAccountNumber: e.target.value })} placeholder="e.g. 00000000" /></div>
                    <div><label className="text-xs font-medium text-muted-foreground">IBAN (optional)</label><Input value={companyProfile.bankIban || ""} onChange={(e) => setCompanyProfile({ ...companyProfile, bankIban: e.target.value })} placeholder="e.g. GB00 XXXX 0000 0000 0000 00" /></div>
                  </div>
                </CardContent>
              </Card>

              {/* Insurance & Compliance */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold">Insurance & Regulatory Compliance</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div><label className="text-xs font-medium text-muted-foreground">Insurance Provider</label><Input value={companyProfile.insuranceProvider || ""} onChange={(e) => setCompanyProfile({ ...companyProfile, insuranceProvider: e.target.value })} placeholder="Hiscox, AXA..." /></div>
                    <div><label className="text-xs font-medium text-muted-foreground">Policy Number</label><Input value={companyProfile.insurancePolicyNumber || ""} onChange={(e) => setCompanyProfile({ ...companyProfile, insurancePolicyNumber: e.target.value })} /></div>
                    <div><label className="text-xs font-medium text-muted-foreground">Expiry Date</label><Input type="date" value={companyProfile.insuranceExpiryDate?.slice(0, 10) || ""} onChange={(e) => setCompanyProfile({ ...companyProfile, insuranceExpiryDate: e.target.value })} /></div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div><label className="text-xs font-medium text-muted-foreground">ICO Registration Number</label><Input value={companyProfile.icoRegistrationNumber || ""} onChange={(e) => setCompanyProfile({ ...companyProfile, icoRegistrationNumber: e.target.value })} placeholder="Data Protection Registration" /></div>
                    <div><label className="text-xs font-medium text-muted-foreground">HCPC Registration Number</label><Input value={companyProfile.hcpcRegistrationNumber || ""} onChange={(e) => setCompanyProfile({ ...companyProfile, hcpcRegistrationNumber: e.target.value })} placeholder="Health & Care Professions Council" /></div>
                  </div>
                </CardContent>
              </Card>

              {/* Contact & Notes */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold">Company Contact</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div><label className="text-xs font-medium text-muted-foreground">Company Email</label><Input value={companyProfile.companyEmail || ""} onChange={(e) => setCompanyProfile({ ...companyProfile, companyEmail: e.target.value })} placeholder="e.g. info@yourcompany.co.uk" /></div>
                    <div><label className="text-xs font-medium text-muted-foreground">Company Phone</label><Input value={companyProfile.companyPhone || ""} onChange={(e) => setCompanyProfile({ ...companyProfile, companyPhone: e.target.value })} placeholder="e.g. +44 20 0000 0000" /></div>
                    <div><label className="text-xs font-medium text-muted-foreground">Website</label><Input value={companyProfile.companyWebsite || ""} onChange={(e) => setCompanyProfile({ ...companyProfile, companyWebsite: e.target.value })} placeholder="e.g. https://yourcompany.co.uk" /></div>
                  </div>
                  <div><label className="text-xs font-medium text-muted-foreground">Notes</label><textarea className="w-full min-h-[60px] rounded-md border bg-background px-3 py-2 text-sm" value={companyProfile.notes || ""} onChange={(e) => setCompanyProfile({ ...companyProfile, notes: e.target.value })} placeholder="Any additional notes about the company..." /></div>
                </CardContent>
              </Card>

              {/* Companies House Filing Info */}
              <Card className="border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-amber-500" /> Companies House Direct Filing</CardTitle>
                </CardHeader>
                <CardContent className="text-xs space-y-1.5">
                  <p className="text-muted-foreground">The Companies House <strong>Filing API</strong> allows software to submit changes (address, confirmation statements, accounts) directly. To enable this:</p>
                  <p className="text-muted-foreground">1. Register as a <strong>Software Filing Provider</strong> at <a href="https://developer.company-information.service.gov.uk/" target="_blank" rel="noopener" className="text-emerald-600 underline">developer.company-information.service.gov.uk</a></p>
                  <p className="text-muted-foreground">2. Implement <strong>OAuth2 authentication</strong> for company authorization</p>
                  <p className="text-muted-foreground">3. Use the Filing API endpoints for: Change of Registered Office, Annual Confirmation Statement, Annual Accounts filing</p>
                  <p className="text-muted-foreground italic">This feature can be added to BPR in a future update once the software provider registration is approved.</p>
                </CardContent>
              </Card>

              {/* API Documentation for external system */}
              <Card className="border-dashed">
                <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold flex items-center gap-2"><Key className="h-4 w-4" /> External Finance API</CardTitle></CardHeader>
                <CardContent className="text-xs space-y-2">
                  <p className="text-muted-foreground font-medium">Your external financial system can pull ALL data via these endpoints:</p>
                  <div className="bg-muted/50 rounded-lg p-3 space-y-1.5 font-mono">
                    <p className="text-muted-foreground"><span className="text-emerald-600 font-semibold">GET</span> ?action=<strong>all</strong> — Complete sync (clinic + company + summary + breakdown + categories + entries)</p>
                    <p className="text-muted-foreground"><span className="text-emerald-600 font-semibold">GET</span> ?action=<strong>clinic</strong> — Clinic info (name, address, contact, currency)</p>
                    <p className="text-muted-foreground"><span className="text-emerald-600 font-semibold">GET</span> ?action=<strong>company</strong> — Full company profile (CH, HMRC, banking, insurance)</p>
                    <p className="text-muted-foreground"><span className="text-emerald-600 font-semibold">GET</span> ?action=<strong>summary</strong>&period=thisYear — Financial totals</p>
                    <p className="text-muted-foreground"><span className="text-emerald-600 font-semibold">GET</span> ?action=<strong>breakdown</strong>&period=thisYear — Income/expense by category + HMRC codes</p>
                    <p className="text-muted-foreground"><span className="text-emerald-600 font-semibold">GET</span> ?action=<strong>entries</strong>&dateBy=paidDate&type=INCOME — Paginated entries with category details</p>
                    <p className="text-muted-foreground"><span className="text-emerald-600 font-semibold">GET</span> ?action=<strong>categories</strong> — Categories with HMRC/CT600 mapping</p>
                    <p className="text-muted-foreground"><span className="text-blue-600 font-semibold">POST</span> — Create entries (requires finance:write permission)</p>
                  </div>
                  <p className="text-muted-foreground">Base: <code className="bg-muted px-1.5 py-0.5 rounded">/api/external/finance</code> &bull; Auth: <code className="bg-muted px-1.5 py-0.5 rounded">X-API-Key: bpr_k_your_key</code></p>
                  <p className="text-muted-foreground">Periods: <code className="bg-muted px-1 py-0.5 rounded">thisMonth</code> <code className="bg-muted px-1 py-0.5 rounded">lastMonth</code> <code className="bg-muted px-1 py-0.5 rounded">thisYear</code> <code className="bg-muted px-1 py-0.5 rounded">lastYear</code> <code className="bg-muted px-1 py-0.5 rounded">all</code> or custom: <code className="bg-muted px-1 py-0.5 rounded">from=2025-01-01&to=2025-12-31</code></p>
                </CardContent>
              </Card>

              {/* Bottom Save */}
              <div className="flex justify-end pb-6">
                <Button onClick={saveCompanyProfile} disabled={companySaving} className="gap-1.5">
                  {companySaving ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                  {companySaving ? "Saving..." : "Save Company Profile"}
                </Button>
              </div>
            </>
          )}
        </div>
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
