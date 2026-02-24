"use client";

import { useState, useEffect } from "react";
import {
  XCircle, CheckCircle, Clock, AlertCircle, Loader2,
  RefreshCw, PoundSterling, Calendar, User, ChevronDown,
  ChevronUp, MessageSquare, CreditCard, Ban,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface CancellationRequest {
  id: string;
  status: "PENDING" | "APPROVED" | "REJECTED" | "REFUNDED";
  reason: string;
  refundAmount: number | null;
  stripeRefundId: string | null;
  adminNote: string | null;
  hoursBeforeAppt: number | null;
  isWithin48h: boolean;
  createdAt: string;
  processedAt: string | null;
  patient: { id: string; firstName: string; lastName: string; email: string };
  appointment: {
    id: string; dateTime: string; treatmentType: string; price: number;
    payment: { stripeSessionId: string | null; status: string; amount: number } | null;
  } | null;
  treatmentPlan: { id: string; name: string; totalPrice: number; stripePaymentIntentId: string | null } | null;
  processedBy: { firstName: string; lastName: string } | null;
}

const STATUS_CONFIG = {
  PENDING:  { label: "Pending Review", color: "bg-amber-100 text-amber-800 border-amber-200",  icon: Clock },
  APPROVED: { label: "Approved",       color: "bg-blue-100 text-blue-800 border-blue-200",     icon: CheckCircle },
  REJECTED: { label: "Rejected",       color: "bg-red-100 text-red-800 border-red-200",        icon: Ban },
  REFUNDED: { label: "Refunded",       color: "bg-green-100 text-green-800 border-green-200",  icon: CheckCircle },
};

export default function AdminCancellationsPage() {
  const { toast } = useToast();
  const [requests, setRequests] = useState<CancellationRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [processing, setProcessing] = useState<string | null>(null);
  const [adminNote, setAdminNote] = useState<Record<string, string>>({});
  const [refundAmount, setRefundAmount] = useState<Record<string, string>>({});

  useEffect(() => { fetchRequests(); }, [filterStatus]);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const url = filterStatus === "all"
        ? "/api/admin/cancellations"
        : `/api/admin/cancellations?status=${filterStatus}`;
      const res = await fetch(url);
      const data = await res.json();
      setRequests(data.requests || []);
    } catch {
      toast({ title: "Error loading cancellations", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (requestId: string, action: "approve" | "reject" | "refund") => {
    setProcessing(requestId);
    try {
      const res = await fetch("/api/admin/cancellations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestId,
          action,
          adminNote: adminNote[requestId] || undefined,
          refundAmount: refundAmount[requestId] ? parseFloat(refundAmount[requestId]) : undefined,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast({ title: data.message });
        fetchRequests();
      } else {
        toast({ title: "Error", description: data.error, variant: "destructive" });
      }
    } catch {
      toast({ title: "Error processing request", variant: "destructive" });
    } finally {
      setProcessing(null);
    }
  };

  const filtered = requests.filter(r => filterStatus === "all" || r.status === filterStatus);
  const counts = {
    all: requests.length,
    PENDING: requests.filter(r => r.status === "PENDING").length,
    APPROVED: requests.filter(r => r.status === "APPROVED").length,
    REJECTED: requests.filter(r => r.status === "REJECTED").length,
    REFUNDED: requests.filter(r => r.status === "REFUNDED").length,
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
            <XCircle className="h-5 w-5 sm:h-6 sm:w-6 text-red-500" />
            Cancellation Requests
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Review and process patient cancellation and refund requests.
          </p>
        </div>
        <button onClick={fetchRequests} className="flex items-center gap-1.5 px-3 py-2 rounded-lg border text-sm hover:bg-muted transition-colors self-start sm:self-auto">
          <RefreshCw className="h-3.5 w-3.5" /> Refresh
        </button>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 flex-wrap">
        {[
          { key: "all", label: "All" },
          { key: "PENDING", label: "Pending" },
          { key: "APPROVED", label: "Approved" },
          { key: "REJECTED", label: "Rejected" },
          { key: "REFUNDED", label: "Refunded" },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setFilterStatus(tab.key)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm font-medium transition-all ${
              filterStatus === tab.key
                ? "border-[#5dc9c0] bg-[#5dc9c0]/10 text-[#1a6b6b]"
                : "border-gray-200 text-muted-foreground hover:border-gray-300"
            }`}
          >
            {tab.label}
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
              filterStatus === tab.key ? "bg-[#5dc9c0] text-white" : "bg-muted text-muted-foreground"
            }`}>
              {counts[tab.key as keyof typeof counts] || 0}
            </span>
          </button>
        ))}
      </div>

      {/* Policy reminder */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex gap-3">
        <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
        <div className="text-xs text-amber-700 space-y-1">
          <p className="font-semibold">Cancellation Policy Reminder</p>
          <p>• <strong>Appointments &gt;48h:</strong> Full refund eligible — approve and process refund.</p>
          <p>• <strong>Appointments &lt;48h:</strong> No refund due — reject with explanation, or use discretion for exceptional circumstances.</p>
          <p>• <strong>Treatment Plans:</strong> Always requires manual review. Partial refunds based on sessions completed.</p>
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
          <span className="ml-2 text-sm text-muted-foreground">Loading...</span>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <XCircle className="h-12 w-12 mx-auto mb-3 opacity-20" />
          <p className="font-medium">No cancellation requests found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(req => {
            const cfg = STATUS_CONFIG[req.status];
            const StatusIcon = cfg.icon;
            const isExpanded = expandedId === req.id;
            const isAppt = !!req.appointment;
            const amount = isAppt ? req.appointment?.price : req.treatmentPlan?.totalPrice;
            const suggestedRefund = req.isWithin48h ? 0 : (amount || 0);

            return (
              <div key={req.id} className="border rounded-2xl overflow-hidden">
                {/* Card header */}
                <div
                  className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/20 transition-colors"
                  onClick={() => setExpandedId(isExpanded ? null : req.id)}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-medium shrink-0 ${cfg.color}`}>
                      <StatusIcon className="h-3 w-3" />
                      {cfg.label}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold truncate">
                        {req.patient.firstName} {req.patient.lastName}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {isAppt ? (
                          <>📅 {req.appointment?.treatmentType} — {new Date(req.appointment!.dateTime).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}</>
                        ) : (
                          <>📋 Treatment Plan: {req.treatmentPlan?.name}</>
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right hidden sm:block">
                      <p className="text-sm font-bold">£{(amount || 0).toFixed(2)}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {new Date(req.createdAt).toLocaleDateString("en-GB")}
                      </p>
                    </div>
                    {req.isWithin48h && (
                      <span className="text-[10px] bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-medium hidden sm:block">
                        &lt;48h
                      </span>
                    )}
                    {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                  </div>
                </div>

                {/* Expanded detail */}
                {isExpanded && (
                  <div className="border-t p-4 space-y-4 bg-muted/10">
                    {/* Info grid */}
                    <div className="grid sm:grid-cols-3 gap-3 text-sm">
                      <div className="space-y-1">
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wide flex items-center gap-1"><User className="h-3 w-3" /> Patient</p>
                        <p className="font-medium">{req.patient.firstName} {req.patient.lastName}</p>
                        <p className="text-xs text-muted-foreground">{req.patient.email}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                          {isAppt ? <Calendar className="h-3 w-3" /> : <CreditCard className="h-3 w-3" />}
                          {isAppt ? "Appointment" : "Treatment Plan"}
                        </p>
                        {isAppt ? (
                          <>
                            <p className="font-medium">{req.appointment?.treatmentType}</p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(req.appointment!.dateTime).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
                            </p>
                            {req.hoursBeforeAppt !== null && (
                              <p className={`text-xs font-medium ${req.isWithin48h ? "text-red-600" : "text-green-600"}`}>
                                {req.isWithin48h
                                  ? `⚠ Requested ${Math.round(req.hoursBeforeAppt)}h before (within 48h window)`
                                  : `✓ Requested ${Math.round(req.hoursBeforeAppt)}h before (eligible for refund)`}
                              </p>
                            )}
                          </>
                        ) : (
                          <>
                            <p className="font-medium">{req.treatmentPlan?.name}</p>
                            <p className="text-xs text-muted-foreground">Requires manual review</p>
                          </>
                        )}
                      </div>
                      <div className="space-y-1">
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wide flex items-center gap-1"><PoundSterling className="h-3 w-3" /> Amount</p>
                        <p className="text-lg font-bold">£{(amount || 0).toFixed(2)}</p>
                        {req.refundAmount !== null && (
                          <p className="text-xs text-green-600 font-medium">Refund: £{req.refundAmount.toFixed(2)}</p>
                        )}
                        {req.stripeRefundId && (
                          <p className="text-[10px] text-muted-foreground font-mono">{req.stripeRefundId}</p>
                        )}
                      </div>
                    </div>

                    {/* Reason */}
                    <div className="bg-white dark:bg-muted/30 rounded-xl p-3 space-y-1">
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wide flex items-center gap-1"><MessageSquare className="h-3 w-3" /> Patient's Reason</p>
                      <p className="text-sm">{req.reason}</p>
                    </div>

                    {/* Admin note if processed */}
                    {req.adminNote && req.status !== "PENDING" && (
                      <div className="bg-blue-50 dark:bg-blue-950/20 rounded-xl p-3 space-y-1">
                        <p className="text-[10px] text-blue-600 uppercase tracking-wide">Admin Note</p>
                        <p className="text-sm text-blue-800 dark:text-blue-200">{req.adminNote}</p>
                        {req.processedBy && (
                          <p className="text-[10px] text-blue-500">
                            By {req.processedBy.firstName} {req.processedBy.lastName} — {req.processedAt ? new Date(req.processedAt).toLocaleDateString("en-GB") : ""}
                          </p>
                        )}
                      </div>
                    )}

                    {/* Action panel — only for PENDING or APPROVED */}
                    {(req.status === "PENDING" || req.status === "APPROVED") && (
                      <div className="border rounded-xl p-4 space-y-3 bg-white dark:bg-muted/20">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Admin Action</p>

                        <div>
                          <label className="text-xs text-muted-foreground">Admin Note (optional)</label>
                          <textarea
                            value={adminNote[req.id] || ""}
                            onChange={e => setAdminNote(n => ({ ...n, [req.id]: e.target.value }))}
                            rows={2}
                            placeholder="Add a note for the patient or for your records..."
                            className="w-full mt-1 px-3 py-2 text-sm border rounded-lg resize-none focus:outline-none focus:ring-1 focus:ring-[#5dc9c0]"
                          />
                        </div>

                        {req.status === "APPROVED" && (
                          <div>
                            <label className="text-xs text-muted-foreground">
                              Refund Amount (£) — suggested: £{suggestedRefund.toFixed(2)}
                            </label>
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              max={amount || 0}
                              value={refundAmount[req.id] ?? suggestedRefund.toFixed(2)}
                              onChange={e => setRefundAmount(r => ({ ...r, [req.id]: e.target.value }))}
                              className="w-full mt-1 px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-1 focus:ring-[#5dc9c0]"
                            />
                          </div>
                        )}

                        <div className="flex gap-2 flex-wrap">
                          {req.status === "PENDING" && (
                            <>
                              <button
                                onClick={() => handleAction(req.id, "approve")}
                                disabled={processing === req.id}
                                className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 transition-colors"
                              >
                                {processing === req.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle className="h-3.5 w-3.5" />}
                                Approve (review refund next)
                              </button>
                              <button
                                onClick={() => handleAction(req.id, "reject")}
                                disabled={processing === req.id}
                                className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 transition-colors"
                              >
                                {processing === req.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Ban className="h-3.5 w-3.5" />}
                                Reject (no refund)
                              </button>
                            </>
                          )}
                          {req.status === "APPROVED" && (
                            <button
                              onClick={() => handleAction(req.id, "refund")}
                              disabled={processing === req.id}
                              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-50 transition-colors hover:opacity-90"
                              style={{ background: "linear-gradient(135deg,#5dc9c0,#1a6b6b)" }}
                            >
                              {processing === req.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <PoundSterling className="h-3.5 w-3.5" />}
                              Process Refund via Stripe
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
