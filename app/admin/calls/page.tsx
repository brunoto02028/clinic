"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Phone,
  PhoneIncoming,
  PhoneOff,
  PhoneMissed,
  Clock,
  User,
  Calendar,
  FileText,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Mic,
  DollarSign,
  ExternalLink,
  Bot,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCallDuration } from "@/lib/vapi";

interface VapiCall {
  id: string;
  vapiCallId: string;
  phoneNumber?: string;
  callerName?: string;
  callerEmail?: string;
  callerNotes?: string;
  startedAt?: string;
  endedAt?: string;
  durationSec?: number;
  status: string;
  endedReason?: string;
  direction: string;
  transcript?: string;
  summary?: string;
  recordingUrl?: string;
  appointmentId?: string;
  costUsd?: number;
  createdAt: string;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  "in-progress": { label: "In Progress", color: "bg-yellow-500/20 text-yellow-500", icon: Mic },
  ended: { label: "Ended", color: "bg-green-500/20 text-green-500", icon: CheckCircle2 },
  missed: { label: "Missed", color: "bg-red-500/20 text-red-500", icon: PhoneMissed },
};

const ENDED_REASON_LABELS: Record<string, string> = {
  "customer-ended-call": "Patient ended",
  "assistant-ended-call": "Assistant ended",
  "silence-timed-out": "Silence timeout",
  "max-duration-exceeded": "Max duration",
  "call-error": "Error",
  "assistant-error": "Assistant error",
};

export default function CallsPage() {
  const [calls, setCalls] = useState<VapiCall[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [selectedCall, setSelectedCall] = useState<VapiCall | null>(null);
  const [statusFilter, setStatusFilter] = useState("");
  const limit = 20;

  const fetchCalls = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
        ...(statusFilter ? { status: statusFilter } : {}),
      });
      const res = await fetch(`/api/vapi/calls?${params}`);
      const data = await res.json();
      setCalls(data.calls ?? []);
      setTotal(data.total ?? 0);
    } catch (err) {
      console.error("Failed to fetch calls:", err);
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter]);

  useEffect(() => {
    fetchCalls();
  }, [fetchCalls]);

  const totalPages = Math.ceil(total / limit);
  const bookedCount = calls.filter((c) => c.appointmentId).length;
  const avgDuration = calls.length
    ? Math.round(calls.reduce((sum, c) => sum + (c.durationSec ?? 0), 0) / calls.length)
    : 0;
  const totalCost = calls.reduce((sum, c) => sum + (c.costUsd ?? 0), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Phone className="h-6 w-6 text-primary" />
            AI Phone Receptionist
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            All inbound calls handled by the BPR AI voice assistant
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchCalls} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
                <Phone className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Calls</p>
                <p className="text-xl font-bold">{total}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-green-500/10 flex items-center justify-center">
                <Calendar className="h-4 w-4 text-green-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Bookings Made</p>
                <p className="text-xl font-bold">{bookedCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <Clock className="h-4 w-4 text-blue-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Avg Duration</p>
                <p className="text-xl font-bold">{formatCallDuration(avgDuration)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-yellow-500/10 flex items-center justify-center">
                <DollarSign className="h-4 w-4 text-yellow-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Cost</p>
                <p className="text-xl font-bold">${totalCost.toFixed(2)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Call list */}
        <div className="lg:col-span-2 space-y-3">
          {/* Filter */}
          <div className="flex items-center gap-2">
            {["", "ended", "in-progress"].map((s) => (
              <Button
                key={s}
                size="sm"
                variant={statusFilter === s ? "default" : "outline"}
                onClick={() => { setStatusFilter(s); setPage(1); }}
              >
                {s === "" ? "All" : s === "ended" ? "Ended" : "Active"}
              </Button>
            ))}
          </div>

          {loading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-20 rounded-lg bg-muted/30 animate-pulse" />
              ))}
            </div>
          ) : calls.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Phone className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
                <p className="text-muted-foreground">No calls yet.</p>
                <p className="text-sm text-muted-foreground/70 mt-1">
                  Calls handled by the AI receptionist will appear here.
                </p>
              </CardContent>
            </Card>
          ) : (
            calls.map((call) => {
              const statusCfg = STATUS_CONFIG[call.status] ?? STATUS_CONFIG["ended"];
              const StatusIcon = statusCfg.icon;
              const isSelected = selectedCall?.id === call.id;

              return (
                <button
                  key={call.id}
                  onClick={() => setSelectedCall(isSelected ? null : call)}
                  className={`w-full text-left rounded-lg border p-4 transition-all hover:border-primary/50 ${
                    isSelected ? "border-primary bg-primary/5" : "border-border bg-card"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        {call.direction === "inbound" ? (
                          <PhoneIncoming className="h-4 w-4 text-primary" />
                        ) : (
                          <Phone className="h-4 w-4 text-primary" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-sm">
                          {call.callerName || call.phoneNumber || "Unknown caller"}
                        </p>
                        {call.phoneNumber && call.callerName && (
                          <p className="text-xs text-muted-foreground">{call.phoneNumber}</p>
                        )}
                        {call.callerNotes && (
                          <p className="text-xs text-muted-foreground truncate max-w-xs">
                            {call.callerNotes}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <Badge className={`text-[10px] px-1.5 py-0 ${statusCfg.color}`}>
                        <StatusIcon className="h-3 w-3 mr-1" />
                        {statusCfg.label}
                      </Badge>
                      {call.durationSec !== undefined && call.durationSec !== null && (
                        <span className="text-xs text-muted-foreground">
                          {formatCallDuration(call.durationSec)}
                        </span>
                      )}
                      {call.appointmentId && (
                        <Badge className="text-[10px] px-1.5 py-0 bg-green-500/20 text-green-500">
                          <Calendar className="h-3 w-3 mr-1" />
                          Booked
                        </Badge>
                      )}
                      <span className="text-[10px] text-muted-foreground/60">
                        {new Date(call.createdAt).toLocaleDateString("en-GB", {
                          day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
                        })}
                      </span>
                    </div>
                  </div>

                  {isSelected && call.summary && (
                    <div className="mt-3 pt-3 border-t border-border/50">
                      <p className="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1">
                        <Bot className="h-3 w-3" /> AI Summary
                      </p>
                      <p className="text-xs text-foreground/80">{call.summary}</p>
                    </div>
                  )}
                </button>
              );
            })
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-2">
              <p className="text-sm text-muted-foreground">
                Showing {(page - 1) * limit + 1}–{Math.min(page * limit, total)} of {total}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline" size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline" size="sm"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Detail panel */}
        <div className="space-y-4">
          {selectedCall ? (
            <>
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <User className="h-4 w-4 text-primary" />
                    Caller Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  {selectedCall.callerName && (
                    <div>
                      <p className="text-xs text-muted-foreground">Name</p>
                      <p className="font-medium">{selectedCall.callerName}</p>
                    </div>
                  )}
                  {selectedCall.phoneNumber && (
                    <div>
                      <p className="text-xs text-muted-foreground">Phone</p>
                      <p className="font-medium">{selectedCall.phoneNumber}</p>
                    </div>
                  )}
                  {selectedCall.callerEmail && (
                    <div>
                      <p className="text-xs text-muted-foreground">Email</p>
                      <p className="font-medium">{selectedCall.callerEmail}</p>
                    </div>
                  )}
                  {selectedCall.callerNotes && (
                    <div>
                      <p className="text-xs text-muted-foreground">Chief Complaint</p>
                      <p className="text-foreground/80">{selectedCall.callerNotes}</p>
                    </div>
                  )}
                  {selectedCall.endedReason && (
                    <div>
                      <p className="text-xs text-muted-foreground">End Reason</p>
                      <p>{ENDED_REASON_LABELS[selectedCall.endedReason] ?? selectedCall.endedReason}</p>
                    </div>
                  )}
                  {selectedCall.costUsd !== undefined && selectedCall.costUsd !== null && (
                    <div>
                      <p className="text-xs text-muted-foreground">Cost</p>
                      <p>${Number(selectedCall.costUsd).toFixed(4)}</p>
                    </div>
                  )}
                  {selectedCall.appointmentId && (
                    <div className="pt-2">
                      <a
                        href={`/admin/appointments`}
                        className="flex items-center gap-1 text-primary text-xs hover:underline"
                      >
                        <Calendar className="h-3 w-3" />
                        View appointment
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  )}
                </CardContent>
              </Card>

              {selectedCall.transcript && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <FileText className="h-4 w-4 text-primary" />
                      Transcript
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="max-h-64 overflow-y-auto text-xs leading-relaxed text-foreground/80 whitespace-pre-wrap">
                      {selectedCall.transcript}
                    </div>
                  </CardContent>
                </Card>
              )}

              {selectedCall.recordingUrl && (
                <Card>
                  <CardContent className="pt-4">
                    <p className="text-xs text-muted-foreground mb-2">Recording</p>
                    <audio controls className="w-full" src={selectedCall.recordingUrl}>
                      Your browser does not support audio.
                    </audio>
                  </CardContent>
                </Card>
              )}
            </>
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <Phone className="h-10 w-10 mx-auto text-muted-foreground/20 mb-3" />
                <p className="text-sm text-muted-foreground">Select a call to view details</p>
              </CardContent>
            </Card>
          )}

          {/* Setup info */}
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="pt-4 pb-4">
              <p className="text-xs font-semibold text-primary mb-2 flex items-center gap-1">
                <Bot className="h-3.5 w-3.5" />
                AI Receptionist Setup
              </p>
              <p className="text-xs text-muted-foreground mb-3">
                Configure your Vapi phone number and assistant to start receiving AI-handled calls.
              </p>
              <a
                href="https://dashboard.vapi.ai"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-xs text-primary hover:underline"
              >
                Open Vapi Dashboard
                <ExternalLink className="h-3 w-3" />
              </a>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
