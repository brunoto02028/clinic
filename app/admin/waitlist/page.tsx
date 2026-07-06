"use client";

import { useState, useEffect } from "react";
import {
  ListChecks, Clock, Bell, CheckCircle2, Ban, Loader2,
  RefreshCw, Calendar, User, Trash2, UserPlus, Mail, Phone,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface WaitlistEntry {
  id: string;
  treatmentType: string;
  preferredFrom: string | null;
  preferredTo: string | null;
  notes: string | null;
  status: "ACTIVE" | "NOTIFIED" | "BOOKED" | "CANCELLED" | "EXPIRED";
  notifiedAt: string | null;
  notifiedForSlot: string | null;
  createdAt: string;
  patient: { id: string; firstName: string; lastName: string; email: string; phone: string | null };
  therapist: { id: string; firstName: string; lastName: string } | null;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  ACTIVE: { label: "Waiting", color: "bg-amber-100 text-amber-800 border-amber-200", icon: Clock },
  NOTIFIED: { label: "Notified", color: "bg-blue-100 text-blue-800 border-blue-200", icon: Bell },
  BOOKED: { label: "Booked", color: "bg-green-100 text-green-800 border-green-200", icon: CheckCircle2 },
  CANCELLED: { label: "Cancelled", color: "bg-gray-100 text-gray-700 border-gray-200", icon: Ban },
  EXPIRED: { label: "Expired", color: "bg-gray-100 text-gray-500 border-gray-200", icon: Ban },
};

function formatDate(d: string | null) {
  if (!d) return "Any date";
  return new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

export default function AdminWaitlistPage() {
  const { toast } = useToast();
  const [entries, setEntries] = useState<WaitlistEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>("ACTIVE");
  const [removing, setRemoving] = useState<string | null>(null);

  useEffect(() => { fetchEntries(); }, [filterStatus]);

  const fetchEntries = async () => {
    setLoading(true);
    try {
      const url = filterStatus === "all" ? "/api/admin/waitlist" : `/api/admin/waitlist?status=${filterStatus}`;
      const res = await fetch(url);
      const data = await res.json();
      setEntries(data.entries || []);
    } catch {
      toast({ title: "Error loading waitlist", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async (id: string) => {
    setRemoving(id);
    try {
      const res = await fetch(`/api/admin/waitlist?id=${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        toast({ title: "Removed from waitlist" });
        fetchEntries();
      } else {
        toast({ title: "Error", description: data.error, variant: "destructive" });
      }
    } catch {
      toast({ title: "Error removing entry", variant: "destructive" });
    } finally {
      setRemoving(null);
    }
  };

  const counts = {
    all: entries.length,
    ACTIVE: entries.filter(e => e.status === "ACTIVE").length,
    NOTIFIED: entries.filter(e => e.status === "NOTIFIED").length,
    BOOKED: entries.filter(e => e.status === "BOOKED").length,
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
            <ListChecks className="h-5 w-5 sm:h-6 sm:w-6 text-blue-500" />
            Waitlist
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Patients waiting for a slot. When a matching appointment is cancelled, they're notified automatically.
          </p>
        </div>
        <button onClick={fetchEntries} className="flex items-center gap-1.5 px-3 py-2 rounded-lg border text-sm hover:bg-muted transition-colors self-start sm:self-auto">
          <RefreshCw className="h-3.5 w-3.5" /> Refresh
        </button>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {[
          { key: "ACTIVE", label: `Waiting (${counts.ACTIVE})` },
          { key: "NOTIFIED", label: `Notified (${counts.NOTIFIED})` },
          { key: "BOOKED", label: `Booked (${counts.BOOKED})` },
          { key: "all", label: `All` },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setFilterStatus(tab.key)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap border transition-colors ${
              filterStatus === tab.key ? "bg-primary text-primary-foreground border-primary" : "bg-background hover:bg-muted border-border"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : entries.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <ListChecks className="h-10 w-10 mx-auto mb-3 opacity-40" />
          <p>No waitlist entries here.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {entries.map(entry => {
            const cfg = STATUS_CONFIG[entry.status] || STATUS_CONFIG.ACTIVE;
            const StatusIcon = cfg.icon;
            return (
              <div key={entry.id} className="border rounded-xl p-4 bg-card">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <User className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-semibold text-sm">{entry.patient.firstName} {entry.patient.lastName}</p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                        <Mail className="h-3 w-3" /> {entry.patient.email}
                        {entry.patient.phone && <><Phone className="h-3 w-3 ml-2" /> {entry.patient.phone}</>}
                      </p>
                      <p className="text-sm mt-1.5"><span className="font-medium">{entry.treatmentType}</span>{entry.therapist && <span className="text-muted-foreground"> · with {entry.therapist.firstName} {entry.therapist.lastName}</span>}</p>
                      <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                        <Calendar className="h-3 w-3" /> {formatDate(entry.preferredFrom)} — {formatDate(entry.preferredTo)}
                      </p>
                      {entry.notes && <p className="text-xs text-muted-foreground mt-1 italic">"{entry.notes}"</p>}
                      {entry.notifiedAt && (
                        <p className="text-xs text-blue-600 mt-1">
                          Notified {new Date(entry.notifiedAt).toLocaleString("en-GB")} about slot on {formatDate(entry.notifiedForSlot)}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-semibold border ${cfg.color}`}>
                      <StatusIcon className="h-3 w-3" /> {cfg.label}
                    </span>
                    {(entry.status === "ACTIVE" || entry.status === "NOTIFIED") && (
                      <button
                        onClick={() => handleRemove(entry.id)}
                        disabled={removing === entry.id}
                        className="p-1.5 rounded-lg hover:bg-destructive/10 text-destructive transition-colors"
                        title="Remove from waitlist"
                      >
                        {removing === entry.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
