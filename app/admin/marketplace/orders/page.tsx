"use client";

import { useState, useEffect } from "react";
import {
  Package, Truck, CheckCircle, Clock, XCircle, ShoppingCart,
  Search, RefreshCw, ChevronDown, ExternalLink, Edit2, Save, X,
  BarChart2, TrendingUp, AlertCircle,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { CARRIERS, buildTrackingUrl, carrierName } from "@/lib/shipping-carriers";

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: any }> = {
  pending:    { label: "Pending",    color: "text-amber-400",   bg: "bg-amber-500/10 border-amber-500/20",    icon: Clock },
  paid:       { label: "Paid",       color: "text-blue-400",    bg: "bg-blue-500/10 border-blue-500/20",      icon: CheckCircle },
  processing: { label: "Processing", color: "text-violet-400",  bg: "bg-violet-500/10 border-violet-500/20",  icon: RefreshCw },
  shipped:    { label: "Shipped",    color: "text-cyan-400",    bg: "bg-cyan-500/10 border-cyan-500/20",      icon: Truck },
  delivered:  { label: "Delivered",  color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20",icon: CheckCircle },
  cancelled:  { label: "Cancelled",  color: "text-red-400",     bg: "bg-red-500/10 border-red-500/20",        icon: XCircle },
  affiliate:  { label: "Affiliate",  color: "text-orange-400",  bg: "bg-orange-500/10 border-orange-500/20",  icon: ExternalLink },
};

export default function OrdersAdminPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [stats, setStats] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<any>({});
  const [saving, setSaving] = useState(false);

  const loadOrders = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/marketplace/orders");
      const data = await res.json();
      setOrders(data.orders || []);
      setStats(data.stats || {});
    } catch {}
    setLoading(false);
  };

  useEffect(() => { loadOrders(); }, []);

  const saveOrder = async (id: string) => {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/marketplace/orders", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, ...editForm }),
      });
      const data = await res.json();
      if (res.ok) {
        setOrders((prev) => prev.map((o) => o.id === id ? { ...o, ...data.order } : o));
        setEditingId(null);
      }
    } catch {}
    setSaving(false);
  };

  const filtered = orders.filter((o) => {
    const matchStatus = filterStatus === "all" || o.status === filterStatus;
    const q = search.toLowerCase();
    const matchSearch = !q || o.orderNumber?.toLowerCase().includes(q)
      || o.patient?.firstName?.toLowerCase().includes(q)
      || o.patient?.lastName?.toLowerCase().includes(q)
      || o.patient?.email?.toLowerCase().includes(q)
      || o.customerName?.toLowerCase().includes(q)
      || o.customerEmail?.toLowerCase().includes(q);
    return matchStatus && matchSearch;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-black text-foreground flex items-center gap-2">
            <ShoppingCart className="h-5 w-5 text-primary" /> Marketplace Orders
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">Manage all shop and patient orders</p>
        </div>
        <Button variant="outline" size="sm" onClick={loadOrders} className="gap-1.5">
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        {[
          { label: "Total", value: stats.total || 0, color: "text-foreground", bg: "bg-muted/30" },
          { label: "Pending", value: stats.pending || 0, color: "text-amber-400", bg: "bg-amber-500/10" },
          { label: "Paid", value: stats.paid || 0, color: "text-blue-400", bg: "bg-blue-500/10" },
          { label: "Processing", value: stats.processing || 0, color: "text-violet-400", bg: "bg-violet-500/10" },
          { label: "Shipped", value: stats.shipped || 0, color: "text-cyan-400", bg: "bg-cyan-500/10" },
          { label: "Delivered", value: stats.delivered || 0, color: "text-emerald-400", bg: "bg-emerald-500/10" },
          { label: "Revenue", value: `£${(stats.totalRevenue || 0).toFixed(2)}`, color: "text-primary", bg: "bg-primary/10" },
        ].map(({ label, value, color, bg }) => (
          <Card key={label} className={`${bg} border-white/5`}>
            <CardContent className="p-3 text-center">
              <p className={`text-lg font-black ${color}`}>{value}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">{label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search order, customer..." className="pl-8 h-8 text-xs" />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {["all", "pending", "paid", "processing", "shipped", "delivered", "cancelled"].map((s) => (
            <button key={s}
              onClick={() => setFilterStatus(s)}
              className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-all border ${
                filterStatus === s
                  ? "bg-primary text-white border-primary"
                  : "border-border text-muted-foreground hover:border-primary/40"
              }`}>
              {s === "all" ? "All" : STATUS_CONFIG[s]?.label || s}
            </button>
          ))}
        </div>
      </div>

      {/* Orders list */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => <div key={i} className="h-16 rounded-xl bg-muted/30 animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Package className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">No orders found</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((order) => {
            const sc = STATUS_CONFIG[order.status] || STATUS_CONFIG.pending;
            const StatusIcon = sc.icon;
            const isExpanded = expandedId === order.id;
            const isEditing = editingId === order.id;
            const hasAffiliate = order.items?.some((i: any) => i.isAffiliate);

            return (
              <Card key={order.id} className="border-white/5 overflow-hidden">
                {/* Order header row */}
                <div
                  className="flex items-center gap-3 p-3 cursor-pointer hover:bg-muted/20 transition-colors"
                  onClick={() => setExpandedId(isExpanded ? null : order.id)}>

                  <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-semibold ${sc.bg} ${sc.color} shrink-0`}>
                    <StatusIcon className="h-3 w-3" />
                    {sc.label}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-bold text-foreground">{order.orderNumber}</span>
                      {hasAffiliate && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-orange-500/10 text-orange-400 border border-orange-500/20">Amazon affiliate</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-muted-foreground mt-0.5 flex-wrap">
                      {order.patient ? (
                        <span>{order.patient.firstName} {order.patient.lastName} · {order.patient.email}</span>
                      ) : (
                        <span>
                          {order.customerName || "Guest"}
                          {order.customerEmail && ` · ${order.customerEmail}`}
                        </span>
                      )}
                      <span>·</span>
                      <span>{new Date(order.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</span>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <p className="text-sm font-black text-foreground">£{Number(order.total).toFixed(2)}</p>
                    <p className="text-[10px] text-muted-foreground">{order.items?.length || 0} item{order.items?.length !== 1 ? "s" : ""}</p>
                  </div>

                  <ChevronDown className={`h-4 w-4 text-muted-foreground shrink-0 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                </div>

                {/* Expanded detail */}
                {isExpanded && (
                  <div className="border-t border-white/5 p-4 space-y-4">
                    {/* Items */}
                    <div>
                      <p className="text-xs font-bold text-muted-foreground mb-2">ORDER ITEMS</p>
                      <div className="space-y-2">
                        {order.items?.map((item: any) => (
                          <div key={item.id} className="flex items-center gap-3 p-2 rounded-lg bg-muted/20">
                            {item.product?.imageUrl ? (
                              <img src={item.product.imageUrl} alt="" className="w-10 h-10 rounded-lg object-contain bg-muted" />
                            ) : (
                              <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                                <Package className="h-4 w-4 text-muted-foreground" />
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-semibold text-foreground truncate">{item.productName}</p>
                              <p className="text-[10px] text-muted-foreground">Qty: {item.quantity} · £{Number(item.unitPrice).toFixed(2)} each</p>
                            </div>
                            <div className="text-right">
                              <p className="text-xs font-bold text-foreground">£{Number(item.totalPrice).toFixed(2)}</p>
                              {item.isAffiliate && item.affiliateUrl && (
                                <a href={item.affiliateUrl} target="_blank" rel="noopener noreferrer"
                                  className="text-[10px] text-orange-400 hover:underline flex items-center gap-0.5 justify-end">
                                  Amazon <ExternalLink className="h-2.5 w-2.5" />
                                </a>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Shipping address */}
                    {order.shippingName && (
                      <div>
                        <p className="text-xs font-bold text-muted-foreground mb-1">SHIPPING ADDRESS</p>
                        <p className="text-xs text-foreground">{order.shippingName}</p>
                        <p className="text-xs text-muted-foreground">{order.shippingAddress}, {order.shippingCity}, {order.shippingPostcode}</p>
                        <p className="text-xs text-muted-foreground">{order.shippingPhone}</p>
                      </div>
                    )}

                    {/* Totals */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                      {[
                        { label: "Subtotal", value: `£${Number(order.subtotal).toFixed(2)}` },
                        { label: "Shipping", value: `£${Number(order.shippingTotal).toFixed(2)}` },
                        { label: "VAT", value: `£${Number(order.vatTotal).toFixed(2)}` },
                        { label: "Total", value: `£${Number(order.total).toFixed(2)}`, bold: true },
                      ].map(({ label, value, bold }) => (
                        <div key={label} className="p-2 rounded-lg bg-muted/20">
                          <p className="text-[10px] text-muted-foreground">{label}</p>
                          <p className={`text-sm ${bold ? "font-black text-foreground" : "font-semibold text-muted-foreground"}`}>{value}</p>
                        </div>
                      ))}
                    </div>

                    {/* Edit / Update */}
                    {!isEditing ? (
                      <div className="flex items-center gap-2">
                        <Button size="sm" variant="outline" className="gap-1.5 text-xs"
                          onClick={(e) => { e.stopPropagation(); setEditingId(order.id); setEditForm({ status: order.status, carrier: order.carrier || "", trackingNumber: order.trackingNumber || "", trackingUrl: order.trackingUrl || "", adminNotes: order.adminNotes || "" }); }}>
                          <Edit2 className="h-3.5 w-3.5" /> Update Order
                        </Button>
                        {(() => {
                          const url = buildTrackingUrl(order.carrier, order.trackingNumber, order.trackingUrl);
                          if (!order.trackingNumber) return null;
                          const label = `${carrierName(order.carrier) || "Track"} ${order.trackingNumber}`;
                          return url ? (
                            <a href={url} target="_blank" rel="noopener noreferrer">
                              <Button size="sm" variant="outline" className="gap-1.5 text-xs text-cyan-400 border-cyan-500/30">
                                <Truck className="h-3.5 w-3.5" /> {label}
                              </Button>
                            </a>
                          ) : (
                            <span className="text-xs text-muted-foreground inline-flex items-center gap-1.5">
                              <Truck className="h-3.5 w-3.5" /> {label}
                            </span>
                          );
                        })()}
                        {order.shippingNotifyError ? (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-500/10 text-red-400 border border-red-500/20"
                            title={order.shippingNotifyError}>
                            Dispatch email failed
                          </span>
                        ) : order.shippingNotifiedAt ? (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            Customer notified
                          </span>
                        ) : null}
                      </div>
                    ) : (
                      <div className="space-y-3 p-3 rounded-xl bg-muted/20 border border-white/5">
                        <p className="text-xs font-bold text-foreground">Update Order</p>
                        <div className="grid sm:grid-cols-2 gap-2">
                          <div>
                            <label className="text-[10px] text-muted-foreground">Status</label>
                            <select value={editForm.status}
                              onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                              className="w-full mt-0.5 h-8 text-xs rounded-lg border border-border bg-background px-2 text-foreground">
                              {Object.keys(STATUS_CONFIG).map((s) => (
                                <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="text-[10px] text-muted-foreground">Carrier</label>
                            <select value={editForm.carrier}
                              onChange={(e) => setEditForm({ ...editForm, carrier: e.target.value })}
                              className="w-full mt-0.5 h-8 text-xs rounded-lg border border-border bg-background px-2 text-foreground">
                              <option value="">— not set —</option>
                              {CARRIERS.map((c) => (
                                <option key={c.key} value={c.key}>{c.name}</option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="text-[10px] text-muted-foreground">Tracking Number</label>
                            <Input value={editForm.trackingNumber} onChange={(e) => setEditForm({ ...editForm, trackingNumber: e.target.value })}
                              placeholder="e.g. AB123456789GB" className="h-8 text-xs mt-0.5" />
                          </div>
                          <div className="sm:col-span-2">
                            <label className="text-[10px] text-muted-foreground">Tracking URL (only to override the carrier's link)</label>
                            <Input value={editForm.trackingUrl} onChange={(e) => setEditForm({ ...editForm, trackingUrl: e.target.value })}
                              placeholder="https://..." className="h-8 text-xs mt-0.5" />
                          </div>
                          <div className="sm:col-span-2">
                            <label className="text-[10px] text-muted-foreground">Admin Notes</label>
                            <Input value={editForm.adminNotes} onChange={(e) => setEditForm({ ...editForm, adminNotes: e.target.value })}
                              placeholder="Internal notes..." className="h-8 text-xs mt-0.5" />
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" className="gap-1.5 text-xs" disabled={saving} onClick={() => saveOrder(order.id)}>
                            {saving ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />} Save
                          </Button>
                          <Button size="sm" variant="ghost" className="text-xs" onClick={() => setEditingId(null)}>
                            <X className="h-3.5 w-3.5" /> Cancel
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
