"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  ShoppingCart, Package, Loader2, Plus, Trash2, Edit2, Search,
  DollarSign, TrendingUp, BarChart3, ExternalLink, Tag, Star,
  Eye, EyeOff, Archive, Truck, Box, Globe, Percent, Calculator,
  ClipboardList, ChevronDown, ChevronUp, X, Save, ImageIcon,
  Link2, Hash, Weight, AlertTriangle, CheckCircle, Clock,
  PackageCheck, Ban, RefreshCw, Filter,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Tab = "products" | "orders";

const CATEGORIES = [
  { value: "physical_product", label: "Physical Product", icon: Package },
  { value: "digital_program", label: "Digital Program", icon: Globe },
  { value: "equipment", label: "Equipment", icon: Box },
  { value: "supplement", label: "Supplement", icon: Plus },
  { value: "special_session", label: "Special Session", icon: Star },
  { value: "subscription", label: "Subscription", icon: RefreshCw },
];

const ORDER_STATUSES: Record<string, { label: string; color: string; icon: any }> = {
  pending: { label: "Pending", color: "bg-amber-100 text-amber-700", icon: Clock },
  paid: { label: "Paid", color: "bg-blue-100 text-blue-700", icon: DollarSign },
  processing: { label: "Processing", color: "bg-violet-100 text-violet-700", icon: Package },
  shipped: { label: "Shipped", color: "bg-cyan-100 text-cyan-700", icon: Truck },
  delivered: { label: "Delivered", color: "bg-emerald-100 text-emerald-700", icon: CheckCircle },
  cancelled: { label: "Cancelled", color: "bg-red-100 text-red-700", icon: Ban },
  refunded: { label: "Refunded", color: "bg-slate-100 text-slate-600", icon: RefreshCw },
};

const emptyProduct = {
  name: "", description: "", shortDescription: "", category: "physical_product",
  price: "", costPrice: "", compareAtPrice: "", vatRate: "20", vatIncluded: true,
  imageUrl: "", sku: "", barcode: "", weight: "", stockQuantity: "",
  lowStockAlert: "5", trackStock: false, shippingCost: "0", freeShippingOver: "",
  isDigital: false, digitalFileUrl: "",
  isAffiliate: false, affiliateUrl: "", affiliateTag: "", affiliateCommission: "", amazonAsin: "",
  creditsCost: "0", creditsDiscount: "0", featured: false, isActive: true, sortOrder: "0",
};

export default function AdminMarketplacePage() {
  const [tab, setTab] = useState<Tab>("products");
  const [products, setProducts] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [orderStats, setOrderStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterCat, setFilterCat] = useState("all");
  const [filterType, setFilterType] = useState<"all" | "own" | "affiliate">("all");

  // Product form
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...emptyProduct });
  const [saving, setSaving] = useState(false);

  // Order detail
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
  const [orderStatusUpdate, setOrderStatusUpdate] = useState<any>({});

  const fetchProducts = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/journey/products");
      const data = await res.json();
      setProducts(data.products || []);
    } catch {}
  }, []);

  const fetchOrders = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/marketplace/orders");
      const data = await res.json();
      setOrders(data.orders || []);
      setOrderStats(data.stats || null);
    } catch {}
  }, []);

  useEffect(() => {
    Promise.all([fetchProducts(), fetchOrders()]).then(() => setLoading(false));
  }, [fetchProducts, fetchOrders]);

  const openCreate = () => {
    setForm({ ...emptyProduct });
    setEditingId(null);
    setShowForm(true);
  };

  const openEdit = (p: any) => {
    setForm({
      name: p.name || "",
      description: p.description || "",
      shortDescription: p.shortDescription || "",
      category: p.category || "physical_product",
      price: String(p.price ?? ""),
      costPrice: String(p.costPrice ?? ""),
      compareAtPrice: String(p.compareAtPrice ?? ""),
      vatRate: String(p.vatRate ?? "20"),
      vatIncluded: p.vatIncluded !== false,
      imageUrl: p.imageUrl || "",
      sku: p.sku || "",
      barcode: p.barcode || "",
      weight: String(p.weight ?? ""),
      stockQuantity: p.stockQuantity != null ? String(p.stockQuantity) : "",
      lowStockAlert: String(p.lowStockAlert ?? "5"),
      trackStock: p.trackStock === true,
      shippingCost: String(p.shippingCost ?? "0"),
      freeShippingOver: String(p.freeShippingOver ?? ""),
      isDigital: p.isDigital === true,
      digitalFileUrl: p.digitalFileUrl || "",
      isAffiliate: p.isAffiliate === true,
      affiliateUrl: p.affiliateUrl || "",
      affiliateTag: p.affiliateTag || "",
      affiliateCommission: String(p.affiliateCommission ?? ""),
      amazonAsin: p.amazonAsin || "",
      creditsCost: String(p.creditsCost ?? "0"),
      creditsDiscount: String(p.creditsDiscount ?? "0"),
      featured: p.featured === true,
      isActive: p.isActive !== false,
      sortOrder: String(p.sortOrder ?? "0"),
    });
    setEditingId(p.id);
    setShowForm(true);
  };

  const saveProduct = async () => {
    setSaving(true);
    try {
      const method = editingId ? "PATCH" : "POST";
      const body: any = { ...form };
      if (editingId) body.id = editingId;

      await fetch("/api/admin/journey/products", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      setShowForm(false);
      fetchProducts();
    } catch {}
    setSaving(false);
  };

  const deleteProduct = async (id: string) => {
    if (!confirm("Delete this product?")) return;
    await fetch("/api/admin/journey/products", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    fetchProducts();
  };

  const updateOrderStatus = async (orderId: string, status: string) => {
    try {
      await fetch("/api/admin/marketplace/orders", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: orderId, status, ...orderStatusUpdate[orderId] }),
      });
      fetchOrders();
    } catch {}
  };

  // Margin calculator
  const calcMargin = () => {
    const p = parseFloat(form.price || "0");
    const c = parseFloat(form.costPrice || "0");
    if (p > 0 && c > 0) return ((p - c) / p * 100).toFixed(1);
    return "—";
  };

  const calcVat = () => {
    const p = parseFloat(form.price || "0");
    const rate = parseFloat(form.vatRate || "20");
    if (form.vatIncluded) return (p - p / (1 + rate / 100)).toFixed(2);
    return (p * rate / 100).toFixed(2);
  };

  const calcNetPrice = () => {
    const p = parseFloat(form.price || "0");
    const rate = parseFloat(form.vatRate || "20");
    if (form.vatIncluded) return (p / (1 + rate / 100)).toFixed(2);
    return p.toFixed(2);
  };

  const calcProfit = () => {
    const net = parseFloat(calcNetPrice());
    const c = parseFloat(form.costPrice || "0");
    return (net - c).toFixed(2);
  };

  // Filter products
  const filtered = products.filter((p) => {
    if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterCat !== "all" && p.category !== filterCat) return false;
    if (filterType === "own" && p.isAffiliate) return false;
    if (filterType === "affiliate" && !p.isAffiliate) return false;
    return true;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-800 flex items-center gap-2">
            <ShoppingCart className="h-6 w-6 text-primary" /> Marketplace Manager
          </h1>
          <p className="text-sm text-slate-500 mt-1">Products, orders, pricing & affiliate management</p>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
        <Card>
          <CardContent className="p-3 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-blue-100 flex items-center justify-center">
              <Package className="h-4 w-4 text-blue-600" />
            </div>
            <div>
              <p className="text-lg font-bold text-slate-800">{products.length}</p>
              <p className="text-[10px] text-slate-500">Products</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-amber-100 flex items-center justify-center">
              <Globe className="h-4 w-4 text-amber-600" />
            </div>
            <div>
              <p className="text-lg font-bold text-slate-800">{products.filter((p) => p.isAffiliate).length}</p>
              <p className="text-[10px] text-slate-500">Affiliate</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-100 flex items-center justify-center">
              <DollarSign className="h-4 w-4 text-emerald-600" />
            </div>
            <div>
              <p className="text-lg font-bold text-slate-800">£{(orderStats?.totalRevenue || 0).toFixed(0)}</p>
              <p className="text-[10px] text-slate-500">Revenue</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-violet-100 flex items-center justify-center">
              <ClipboardList className="h-4 w-4 text-violet-600" />
            </div>
            <div>
              <p className="text-lg font-bold text-slate-800">{orders.length}</p>
              <p className="text-[10px] text-slate-500">Orders</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 rounded-lg p-1 w-fit">
        {([
          { key: "products" as Tab, label: "Products", icon: Package },
          { key: "orders" as Tab, label: "Orders", icon: ClipboardList },
        ]).map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              tab === t.key ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700"
            }`}
          >
            <t.icon className="h-4 w-4" />
            {t.label}
            {t.key === "orders" && orderStats?.pending > 0 && (
              <span className="ml-1 bg-red-500 text-white text-[10px] rounded-full px-1.5">{orderStats.pending}</span>
            )}
          </button>
        ))}
      </div>

      {/* ─── PRODUCTS TAB ─── */}
      {tab === "products" && (
        <div className="space-y-4">
          {/* Toolbar */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input placeholder="Search products..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
            </div>
            <Select value={filterCat} onValueChange={setFilterCat}>
              <SelectTrigger className="w-[160px]"><SelectValue placeholder="Category" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {CATEGORIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <div className="flex gap-1 bg-slate-100 rounded-lg p-0.5">
              {(["all", "own", "affiliate"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setFilterType(t)}
                  className={`px-3 py-1 rounded text-xs font-medium ${filterType === t ? "bg-white shadow-sm text-slate-800" : "text-slate-500"}`}
                >
                  {t === "all" ? "All" : t === "own" ? "Own Products" : "Affiliate"}
                </button>
              ))}
            </div>
            <Button onClick={openCreate} size="sm" className="gap-1 ml-auto">
              <Plus className="h-4 w-4" /> Add Product
            </Button>
          </div>

          {/* Product Form Modal */}
          {showForm && (
            <Card className="border-primary/30 bg-white shadow-lg">
              <CardHeader className="pb-3 flex flex-row items-center justify-between">
                <CardTitle className="text-base">{editingId ? "Edit Product" : "New Product"}</CardTitle>
                <Button variant="ghost" size="sm" onClick={() => setShowForm(false)}><X className="h-4 w-4" /></Button>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Product Type Toggle */}
                <div className="flex gap-2">
                  <Button
                    variant={form.isAffiliate ? "outline" : "default"}
                    size="sm"
                    onClick={() => setForm({ ...form, isAffiliate: false })}
                    className="gap-1"
                  >
                    <Package className="h-3.5 w-3.5" /> Own Product
                  </Button>
                  <Button
                    variant={form.isAffiliate ? "default" : "outline"}
                    size="sm"
                    onClick={() => setForm({ ...form, isAffiliate: true })}
                    className="gap-1"
                  >
                    <Globe className="h-3.5 w-3.5" /> Amazon Affiliate
                  </Button>
                </div>

                {/* Basic Info */}
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <label className="text-xs font-medium text-slate-600 mb-1 block">Product Name *</label>
                    <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Resistance Band Set" />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="text-xs font-medium text-slate-600 mb-1 block">Short Description</label>
                    <Input value={form.shortDescription} onChange={(e) => setForm({ ...form, shortDescription: e.target.value })} placeholder="Brief tagline for cards" />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="text-xs font-medium text-slate-600 mb-1 block">Full Description</label>
                    <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-600 mb-1 block">Category</label>
                    <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {CATEGORIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-600 mb-1 block">Image URL</label>
                    <Input value={form.imageUrl} onChange={(e) => setForm({ ...form, imageUrl: e.target.value })} placeholder="https://..." />
                  </div>
                </div>

                {/* Pricing Section */}
                <div>
                  <h3 className="text-sm font-bold text-slate-700 flex items-center gap-1.5 mb-3">
                    <Calculator className="h-4 w-4 text-emerald-500" /> Pricing & Margins
                  </h3>
                  <div className="grid gap-4 sm:grid-cols-3">
                    <div>
                      <label className="text-xs font-medium text-slate-600 mb-1 block">Selling Price (£) *</label>
                      <Input type="number" step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
                    </div>
                    {!form.isAffiliate && (
                      <div>
                        <label className="text-xs font-medium text-slate-600 mb-1 block">Cost Price (£)</label>
                        <Input type="number" step="0.01" value={form.costPrice} onChange={(e) => setForm({ ...form, costPrice: e.target.value })} />
                      </div>
                    )}
                    <div>
                      <label className="text-xs font-medium text-slate-600 mb-1 block">Compare at (£)</label>
                      <Input type="number" step="0.01" value={form.compareAtPrice} onChange={(e) => setForm({ ...form, compareAtPrice: e.target.value })} placeholder="Was price" />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-slate-600 mb-1 block">VAT Rate (%)</label>
                      <Input type="number" step="0.1" value={form.vatRate} onChange={(e) => setForm({ ...form, vatRate: e.target.value })} />
                    </div>
                    <div className="flex items-end">
                      <label className="flex items-center gap-2 text-xs">
                        <input type="checkbox" checked={form.vatIncluded} onChange={(e) => setForm({ ...form, vatIncluded: e.target.checked })} className="rounded" />
                        Price includes VAT
                      </label>
                    </div>
                  </div>

                  {/* Live Margin Calculator */}
                  {(form.price || form.costPrice) && (
                    <div className="mt-3 bg-slate-50 rounded-lg p-3 grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                      <div>
                        <p className="text-[10px] text-slate-500">Net Price</p>
                        <p className="text-sm font-bold text-slate-700">£{calcNetPrice()}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-500">VAT</p>
                        <p className="text-sm font-bold text-amber-600">£{calcVat()}</p>
                      </div>
                      {!form.isAffiliate && (
                        <>
                          <div>
                            <p className="text-[10px] text-slate-500">Margin</p>
                            <p className={`text-sm font-bold ${parseFloat(calcMargin()) > 30 ? "text-emerald-600" : parseFloat(calcMargin()) > 0 ? "text-amber-600" : "text-red-600"}`}>{calcMargin()}%</p>
                          </div>
                          <div>
                            <p className="text-[10px] text-slate-500">Profit</p>
                            <p className={`text-sm font-bold ${parseFloat(calcProfit()) > 0 ? "text-emerald-600" : "text-red-600"}`}>£{calcProfit()}</p>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>

                {/* Affiliate Section */}
                {form.isAffiliate && (
                  <div>
                    <h3 className="text-sm font-bold text-slate-700 flex items-center gap-1.5 mb-3">
                      <Globe className="h-4 w-4 text-amber-500" /> Amazon Affiliate Details
                    </h3>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="sm:col-span-2">
                        <label className="text-xs font-medium text-slate-600 mb-1 block">Affiliate URL *</label>
                        <Input value={form.affiliateUrl} onChange={(e) => setForm({ ...form, affiliateUrl: e.target.value })} placeholder="https://www.amazon.co.uk/dp/..." />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-slate-600 mb-1 block">Amazon ASIN</label>
                        <Input value={form.amazonAsin} onChange={(e) => setForm({ ...form, amazonAsin: e.target.value })} placeholder="B09XXXXX" />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-slate-600 mb-1 block">Associate Tag</label>
                        <Input value={form.affiliateTag} onChange={(e) => setForm({ ...form, affiliateTag: e.target.value })} placeholder="bpr-21" />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-slate-600 mb-1 block">Expected Commission (%)</label>
                        <Input type="number" step="0.1" value={form.affiliateCommission} onChange={(e) => setForm({ ...form, affiliateCommission: e.target.value })} />
                      </div>
                    </div>
                    {form.affiliateCommission && form.price && (
                      <div className="mt-3 bg-amber-50 rounded-lg p-3 text-center">
                        <p className="text-xs text-amber-600">
                          Estimated commission per sale: <span className="font-bold">£{(parseFloat(form.price) * parseFloat(form.affiliateCommission) / 100).toFixed(2)}</span>
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* Shipping & Stock (own products only) */}
                {!form.isAffiliate && (
                  <div>
                    <h3 className="text-sm font-bold text-slate-700 flex items-center gap-1.5 mb-3">
                      <Truck className="h-4 w-4 text-cyan-500" /> Shipping & Stock
                    </h3>
                    <div className="grid gap-4 sm:grid-cols-3">
                      <div className="flex items-end">
                        <label className="flex items-center gap-2 text-xs">
                          <input type="checkbox" checked={form.isDigital} onChange={(e) => setForm({ ...form, isDigital: e.target.checked })} className="rounded" />
                          Digital product (no shipping)
                        </label>
                      </div>
                      <div className="flex items-end">
                        <label className="flex items-center gap-2 text-xs">
                          <input type="checkbox" checked={form.trackStock} onChange={(e) => setForm({ ...form, trackStock: e.target.checked })} className="rounded" />
                          Track stock quantity
                        </label>
                      </div>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-3 mt-3">
                      <div>
                        <label className="text-xs font-medium text-slate-600 mb-1 block">SKU</label>
                        <Input value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} placeholder="BPR-001" />
                      </div>
                      {!form.isDigital && (
                        <>
                          <div>
                            <label className="text-xs font-medium text-slate-600 mb-1 block">Weight (kg)</label>
                            <Input type="number" step="0.01" value={form.weight} onChange={(e) => setForm({ ...form, weight: e.target.value })} />
                          </div>
                          <div>
                            <label className="text-xs font-medium text-slate-600 mb-1 block">Shipping Cost (£)</label>
                            <Input type="number" step="0.01" value={form.shippingCost} onChange={(e) => setForm({ ...form, shippingCost: e.target.value })} />
                          </div>
                          <div>
                            <label className="text-xs font-medium text-slate-600 mb-1 block">Free Shipping Over (£)</label>
                            <Input type="number" step="0.01" value={form.freeShippingOver} onChange={(e) => setForm({ ...form, freeShippingOver: e.target.value })} placeholder="Leave empty for none" />
                          </div>
                        </>
                      )}
                      {form.trackStock && (
                        <>
                          <div>
                            <label className="text-xs font-medium text-slate-600 mb-1 block">Stock Quantity</label>
                            <Input type="number" value={form.stockQuantity} onChange={(e) => setForm({ ...form, stockQuantity: e.target.value })} />
                          </div>
                          <div>
                            <label className="text-xs font-medium text-slate-600 mb-1 block">Low Stock Alert</label>
                            <Input type="number" value={form.lowStockAlert} onChange={(e) => setForm({ ...form, lowStockAlert: e.target.value })} />
                          </div>
                        </>
                      )}
                      {form.isDigital && (
                        <div className="sm:col-span-2">
                          <label className="text-xs font-medium text-slate-600 mb-1 block">Digital File URL</label>
                          <Input value={form.digitalFileUrl} onChange={(e) => setForm({ ...form, digitalFileUrl: e.target.value })} placeholder="https://..." />
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Credits & Display */}
                <div className="grid gap-4 sm:grid-cols-3">
                  <div>
                    <label className="text-xs font-medium text-slate-600 mb-1 block">BPR Credits Cost</label>
                    <Input type="number" value={form.creditsCost} onChange={(e) => setForm({ ...form, creditsCost: e.target.value })} />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-600 mb-1 block">Credits Discount</label>
                    <Input type="number" value={form.creditsDiscount} onChange={(e) => setForm({ ...form, creditsDiscount: e.target.value })} />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-600 mb-1 block">Sort Order</label>
                    <Input type="number" value={form.sortOrder} onChange={(e) => setForm({ ...form, sortOrder: e.target.value })} />
                  </div>
                  <div className="flex items-end gap-4">
                    <label className="flex items-center gap-2 text-xs">
                      <input type="checkbox" checked={form.featured} onChange={(e) => setForm({ ...form, featured: e.target.checked })} className="rounded" />
                      Featured
                    </label>
                    <label className="flex items-center gap-2 text-xs">
                      <input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} className="rounded" />
                      Active
                    </label>
                  </div>
                </div>

                {/* Save */}
                <div className="flex justify-end gap-2 pt-2 border-t">
                  <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
                  <Button onClick={saveProduct} disabled={saving || !form.name || !form.price} className="gap-1">
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    {editingId ? "Update Product" : "Create Product"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Products — Desktop Table */}
          <div className="hidden md:block">
            <Card>
              <CardContent className="p-0 overflow-x-auto">
                <table className="w-full text-sm min-w-[800px]">
                  <thead>
                    <tr className="text-left text-xs text-slate-500 border-b bg-slate-50">
                      <th className="p-3">Product</th>
                      <th className="p-3">Type</th>
                      <th className="p-3">Category</th>
                      <th className="p-3">Price</th>
                      <th className="p-3">Cost</th>
                      <th className="p-3">Margin</th>
                      <th className="p-3">Stock</th>
                      <th className="p-3">Status</th>
                      <th className="p-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((p) => {
                      const cat = CATEGORIES.find((c) => c.value === p.category);
                      const lowStock = p.trackStock && p.stockQuantity != null && p.stockQuantity <= p.lowStockAlert;
                      return (
                        <tr key={p.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                          <td className="p-3">
                            <div className="flex items-center gap-2">
                              {p.imageUrl ? (
                                <img src={p.imageUrl} alt="" className="w-8 h-8 rounded object-cover" />
                              ) : (
                                <div className="w-8 h-8 rounded bg-slate-100 flex items-center justify-center">
                                  <Package className="h-3.5 w-3.5 text-slate-400" />
                                </div>
                              )}
                              <div>
                                <p className="font-medium text-slate-800 text-xs">{p.name}</p>
                                {p.sku && <p className="text-[10px] text-slate-400">SKU: {p.sku}</p>}
                              </div>
                            </div>
                          </td>
                          <td className="p-3">
                            {p.isAffiliate ? (
                              <Badge className="bg-amber-100 text-amber-700 text-[10px]">
                                <Globe className="h-2.5 w-2.5 mr-0.5" /> Affiliate
                              </Badge>
                            ) : (
                              <Badge className="bg-blue-100 text-blue-700 text-[10px]">
                                <Package className="h-2.5 w-2.5 mr-0.5" /> Own
                              </Badge>
                            )}
                          </td>
                          <td className="p-3 text-xs text-slate-500">{cat?.label || p.category}</td>
                          <td className="p-3">
                            <span className="font-medium">£{p.price?.toFixed(2)}</span>
                            {p.compareAtPrice && (
                              <span className="text-[10px] text-slate-400 line-through ml-1">£{p.compareAtPrice.toFixed(2)}</span>
                            )}
                          </td>
                          <td className="p-3 text-xs text-slate-500">
                            {p.isAffiliate ? (
                              <span className="text-amber-600">{p.affiliateCommission ? `${p.affiliateCommission}% comm.` : "—"}</span>
                            ) : (
                              p.costPrice ? `£${p.costPrice.toFixed(2)}` : "—"
                            )}
                          </td>
                          <td className="p-3">
                            {p.marginPercent != null ? (
                              <span className={`text-xs font-medium ${p.marginPercent >= 30 ? "text-emerald-600" : p.marginPercent > 0 ? "text-amber-600" : "text-red-600"}`}>
                                {p.marginPercent.toFixed(1)}%
                              </span>
                            ) : "—"}
                          </td>
                          <td className="p-3">
                            {p.isDigital ? (
                              <Badge variant="outline" className="text-[10px]">Digital</Badge>
                            ) : p.trackStock ? (
                              <span className={`text-xs font-medium ${lowStock ? "text-red-600" : "text-slate-600"}`}>
                                {lowStock && <AlertTriangle className="h-3 w-3 inline mr-0.5" />}
                                {p.stockQuantity ?? "—"}
                              </span>
                            ) : (
                              <span className="text-[10px] text-slate-400">Unlimited</span>
                            )}
                          </td>
                          <td className="p-3">
                            {p.isActive ? (
                              <Badge className="bg-emerald-100 text-emerald-700 text-[10px]">Active</Badge>
                            ) : (
                              <Badge className="bg-slate-100 text-slate-500 text-[10px]">Inactive</Badge>
                            )}
                            {p.featured && <Star className="h-3 w-3 text-amber-400 inline ml-1" />}
                          </td>
                          <td className="p-3 text-right">
                            <div className="flex items-center justify-end gap-1">
                              {p.isAffiliate && p.affiliateUrl && (
                                <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => window.open(p.affiliateUrl, "_blank")}>
                                  <ExternalLink className="h-3 w-3" />
                                </Button>
                              )}
                              <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => openEdit(p)}>
                                <Edit2 className="h-3 w-3" />
                              </Button>
                              <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-red-500 hover:text-red-700" onClick={() => deleteProduct(p.id)}>
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    {filtered.length === 0 && (
                      <tr>
                        <td colSpan={9} className="p-8 text-center text-slate-400 text-sm">
                          No products found. Click "Add Product" to create one.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </div>

          {/* Products — Mobile Cards */}
          <div className="md:hidden space-y-3">
            {filtered.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center text-slate-400 text-sm">
                  No products found. Click "Add Product" to create one.
                </CardContent>
              </Card>
            ) : (
              filtered.map((p) => {
                const cat = CATEGORIES.find((c) => c.value === p.category);
                const lowStock = p.trackStock && p.stockQuantity != null && p.stockQuantity <= p.lowStockAlert;
                return (
                  <Card key={p.id} className="overflow-hidden">
                    <CardContent className="p-3">
                      <div className="flex gap-3">
                        {p.imageUrl ? (
                          <img src={p.imageUrl} alt="" className="w-16 h-16 rounded-lg object-cover shrink-0" />
                        ) : (
                          <div className="w-16 h-16 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                            <Package className="h-6 w-6 text-slate-300" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="font-medium text-slate-800 text-sm truncate">{p.name}</p>
                              {p.sku && <p className="text-[10px] text-slate-400">SKU: {p.sku}</p>}
                            </div>
                            <div className="flex gap-1 shrink-0">
                              <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => openEdit(p)}>
                                <Edit2 className="h-3.5 w-3.5" />
                              </Button>
                              <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-red-500" onClick={() => deleteProduct(p.id)}>
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </div>
                          <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                            {p.isAffiliate ? (
                              <Badge className="bg-amber-100 text-amber-700 text-[10px]"><Globe className="h-2.5 w-2.5 mr-0.5" /> Affiliate</Badge>
                            ) : (
                              <Badge className="bg-blue-100 text-blue-700 text-[10px]"><Package className="h-2.5 w-2.5 mr-0.5" /> Own</Badge>
                            )}
                            <Badge variant="outline" className="text-[10px]">{cat?.label || p.category}</Badge>
                            {p.isActive ? (
                              <Badge className="bg-emerald-100 text-emerald-700 text-[10px]">Active</Badge>
                            ) : (
                              <Badge className="bg-slate-100 text-slate-500 text-[10px]">Inactive</Badge>
                            )}
                            {p.featured && <Badge className="bg-amber-100 text-amber-700 text-[10px]"><Star className="h-2.5 w-2.5 mr-0.5" /> Featured</Badge>}
                          </div>
                          <div className="flex items-center gap-3 mt-2 text-xs">
                            <span className="font-bold text-slate-800">£{p.price?.toFixed(2)}</span>
                            {p.compareAtPrice && <span className="text-slate-400 line-through">£{p.compareAtPrice.toFixed(2)}</span>}
                            {p.isAffiliate ? (
                              p.affiliateCommission && <span className="text-amber-600">{p.affiliateCommission}% comm.</span>
                            ) : (
                              <>
                                {p.costPrice && <span className="text-slate-400">Cost: £{p.costPrice.toFixed(2)}</span>}
                                {p.marginPercent != null && (
                                  <span className={p.marginPercent >= 30 ? "text-emerald-600" : p.marginPercent > 0 ? "text-amber-600" : "text-red-600"}>
                                    {p.marginPercent.toFixed(1)}% margin
                                  </span>
                                )}
                              </>
                            )}
                            {p.isDigital ? (
                              <span className="text-slate-400">Digital</span>
                            ) : p.trackStock ? (
                              <span className={lowStock ? "text-red-600" : "text-slate-500"}>
                                {lowStock && "⚠ "}{p.stockQuantity} stock
                              </span>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* ─── ORDERS TAB ─── */}
      {tab === "orders" && (
        <div className="space-y-4">
          {/* Order status summary */}
          {orderStats && (
            <div className="flex flex-wrap gap-2">
              {Object.entries(ORDER_STATUSES).map(([key, cfg]) => {
                const count = (orderStats as any)[key] || 0;
                if (!count && !["pending", "paid", "processing", "shipped", "delivered"].includes(key)) return null;
                return (
                  <Badge key={key} variant="outline" className={`${cfg.color} text-xs gap-1`}>
                    <cfg.icon className="h-3 w-3" /> {cfg.label}: {count}
                  </Badge>
                );
              })}
            </div>
          )}

          {orders.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <ClipboardList className="h-10 w-10 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500 text-sm">No orders yet</p>
                <p className="text-xs text-slate-400 mt-1">Orders will appear here when patients make purchases</p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-0 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-slate-500 border-b bg-slate-50">
                      <th className="p-3">Order</th>
                      <th className="p-3">Patient</th>
                      <th className="p-3">Items</th>
                      <th className="p-3">Total</th>
                      <th className="p-3">Status</th>
                      <th className="p-3">Date</th>
                      <th className="p-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map((o: any) => {
                      const statusCfg = ORDER_STATUSES[o.status] || ORDER_STATUSES.pending;
                      const isExpanded = expandedOrder === o.id;
                      return (
                        <React.Fragment key={o.id}>
                          <tr className="border-b border-slate-50 hover:bg-slate-50/50 cursor-pointer" onClick={() => setExpandedOrder(isExpanded ? null : o.id)}>
                            <td className="p-3">
                              <span className="font-mono text-xs font-medium">{o.orderNumber}</span>
                            </td>
                            <td className="p-3">
                              <p className="text-xs font-medium">{o.patient?.firstName} {o.patient?.lastName}</p>
                              <p className="text-[10px] text-slate-400">{o.patient?.email}</p>
                            </td>
                            <td className="p-3 text-xs">{o.items?.length || 0} items</td>
                            <td className="p-3 font-medium">£{o.total?.toFixed(2)}</td>
                            <td className="p-3">
                              <Badge className={`text-[10px] ${statusCfg.color}`}>{statusCfg.label}</Badge>
                            </td>
                            <td className="p-3 text-xs text-slate-500">
                              {new Date(o.createdAt).toLocaleDateString("en-GB")}
                            </td>
                            <td className="p-3 text-right">
                              {isExpanded ? <ChevronUp className="h-4 w-4 inline" /> : <ChevronDown className="h-4 w-4 inline" />}
                            </td>
                          </tr>
                          {isExpanded && (
                            <tr>
                              <td colSpan={7} className="bg-slate-50 p-4">
                                <div className="grid gap-4 lg:grid-cols-2">
                                  {/* Items */}
                                  <div>
                                    <h4 className="text-xs font-bold text-slate-600 mb-2">Order Items</h4>
                                    <div className="space-y-2">
                                      {o.items?.map((item: any) => (
                                        <div key={item.id} className="flex items-center gap-2 bg-white rounded border p-2">
                                          {item.product?.imageUrl ? (
                                            <img src={item.product.imageUrl} alt="" className="w-8 h-8 rounded object-cover" />
                                          ) : (
                                            <div className="w-8 h-8 rounded bg-slate-100 flex items-center justify-center">
                                              <Package className="h-3 w-3 text-slate-400" />
                                            </div>
                                          )}
                                          <div className="flex-1">
                                            <p className="text-xs font-medium">{item.productName}</p>
                                            <p className="text-[10px] text-slate-400">Qty: {item.quantity} × £{item.unitPrice?.toFixed(2)}</p>
                                          </div>
                                          <span className="text-xs font-bold">£{item.totalPrice?.toFixed(2)}</span>
                                          {item.isAffiliate && <Badge className="bg-amber-100 text-amber-700 text-[10px]">Affiliate</Badge>}
                                        </div>
                                      ))}
                                    </div>
                                    {/* Totals */}
                                    <div className="mt-3 bg-white rounded border p-3 space-y-1 text-xs">
                                      <div className="flex justify-between"><span className="text-slate-500">Subtotal</span><span>£{o.subtotal?.toFixed(2)}</span></div>
                                      <div className="flex justify-between"><span className="text-slate-500">Shipping</span><span>£{o.shippingTotal?.toFixed(2)}</span></div>
                                      <div className="flex justify-between"><span className="text-slate-500">VAT</span><span>£{o.vatTotal?.toFixed(2)}</span></div>
                                      {o.creditsUsed > 0 && <div className="flex justify-between text-emerald-600"><span>Credits ({o.creditsUsed})</span><span>-£{o.creditsValue?.toFixed(2)}</span></div>}
                                      <div className="flex justify-between font-bold border-t pt-1"><span>Total</span><span>£{o.total?.toFixed(2)}</span></div>
                                    </div>
                                  </div>

                                  {/* Status & Shipping */}
                                  <div className="space-y-3">
                                    <h4 className="text-xs font-bold text-slate-600">Update Status</h4>
                                    <Select value={o.status} onValueChange={(v) => updateOrderStatus(o.id, v)}>
                                      <SelectTrigger><SelectValue /></SelectTrigger>
                                      <SelectContent>
                                        {Object.entries(ORDER_STATUSES).map(([k, v]) => (
                                          <SelectItem key={k} value={k}>{v.label}</SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>

                                    {o.shippingAddress && (
                                      <div className="bg-white rounded border p-3">
                                        <h4 className="text-xs font-bold text-slate-600 mb-1">Shipping Address</h4>
                                        <p className="text-xs text-slate-500">
                                          {o.shippingName}<br />
                                          {o.shippingAddress}<br />
                                          {o.shippingCity} {o.shippingPostcode}<br />
                                          {o.shippingCountry}
                                        </p>
                                      </div>
                                    )}

                                    {o.trackingNumber && (
                                      <div className="bg-white rounded border p-3">
                                        <h4 className="text-xs font-bold text-slate-600 mb-1">Tracking</h4>
                                        <p className="text-xs text-slate-500">{o.trackingNumber}</p>
                                      </div>
                                    )}

                                    {o.customerNotes && (
                                      <div className="bg-white rounded border p-3">
                                        <h4 className="text-xs font-bold text-slate-600 mb-1">Customer Notes</h4>
                                        <p className="text-xs text-slate-500">{o.customerNotes}</p>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
