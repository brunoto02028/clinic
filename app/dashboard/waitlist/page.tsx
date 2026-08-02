"use client";

import { useState, useEffect } from "react";
import { ListChecks, Clock, Bell, CheckCircle2, Loader2, Trash2, Calendar } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useLocale } from "@/hooks/use-locale";

interface TreatmentType {
  id: string;
  name: string;
  namePt: string | null;
  duration: number;
}

interface WaitlistEntry {
  id: string;
  treatmentType: string;
  preferredFrom: string | null;
  preferredTo: string | null;
  status: "ACTIVE" | "NOTIFIED" | "BOOKED" | "CANCELLED" | "EXPIRED";
  notifiedAt: string | null;
  createdAt: string;
  therapist: { id: string; firstName: string; lastName: string } | null;
}

const STATUS_LABEL: Record<string, { en: string; pt: string; color: string; icon: any }> = {
  ACTIVE: { en: "Waiting for a slot", pt: "Aguardando vaga", color: "bg-amber-100 text-amber-800 border-amber-200", icon: Clock },
  NOTIFIED: { en: "Slot available — book now!", pt: "Vaga disponível — reserve agora!", color: "bg-blue-100 text-blue-800 border-blue-200", icon: Bell },
  BOOKED: { en: "Booked", pt: "Reservado", color: "bg-green-100 text-green-800 border-green-200", icon: CheckCircle2 },
};

export default function PatientWaitlistPage() {
  const { toast } = useToast();
  const { locale } = useLocale();
  const isPt = locale?.startsWith("pt");
  const [entries, setEntries] = useState<WaitlistEntry[]>([]);
  const [treatmentTypes, setTreatmentTypes] = useState<TreatmentType[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [removing, setRemoving] = useState<string | null>(null);

  const [selectedTreatment, setSelectedTreatment] = useState("");
  const [preferredFrom, setPreferredFrom] = useState("");
  const [preferredTo, setPreferredTo] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [entriesRes, typesRes] = await Promise.all([
        fetch("/api/patient/waitlist").then(r => r.json()),
        fetch("/api/patient/treatment-types").then(r => r.json()),
      ]);
      setEntries(entriesRes.entries || []);
      const types = Array.isArray(typesRes) ? typesRes : [];
      setTreatmentTypes(types);
      if (types.length && !selectedTreatment) setSelectedTreatment(types[0].name);
    } catch {
      toast({ title: isPt ? "Erro ao carregar" : "Error loading", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async () => {
    if (!selectedTreatment) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/patient/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          treatmentType: selectedTreatment,
          preferredFrom: preferredFrom || undefined,
          preferredTo: preferredTo || undefined,
          notes: notes || undefined,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast({ title: isPt ? "Você entrou na lista de espera!" : "You're on the waitlist!" });
        setPreferredFrom(""); setPreferredTo(""); setNotes("");
        fetchAll();
      } else {
        toast({ title: isPt ? "Erro" : "Error", description: data.error, variant: "destructive" });
      }
    } catch {
      toast({ title: isPt ? "Erro ao entrar na lista" : "Error joining waitlist", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleLeave = async (id: string) => {
    setRemoving(id);
    try {
      const res = await fetch(`/api/patient/waitlist?id=${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        toast({ title: isPt ? "Removido da lista" : "Removed from waitlist" });
        fetchAll();
      }
    } catch {
      toast({ title: isPt ? "Erro" : "Error", variant: "destructive" });
    } finally {
      setRemoving(null);
    }
  };

  const formatDate = (d: string | null) => d ? new Date(d).toLocaleDateString(isPt ? "pt-BR" : "en-GB", { day: "2-digit", month: "short", year: "numeric" }) : (isPt ? "Qualquer data" : "Any date");

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
          <ListChecks className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
          {isPt ? "Lista de Espera" : "Waitlist"}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {isPt
            ? "Entre na lista de espera e seja avisado automaticamente assim que uma vaga for cancelada."
            : "Join the waitlist and get notified automatically as soon as a slot is cancelled."}
        </p>
      </div>

      {/* Join form */}
      <div className="border rounded-xl p-4 sm:p-5 bg-card space-y-4">
        <h2 className="font-semibold text-sm">{isPt ? "Entrar na lista de espera" : "Join the waitlist"}</h2>

        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">{isPt ? "Tratamento" : "Treatment"}</label>
          <select
            value={selectedTreatment}
            onChange={(e) => setSelectedTreatment(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border bg-background text-sm"
          >
            {treatmentTypes.length === 0 && <option value="">{isPt ? "Nenhum tratamento disponível" : "No treatments available"}</option>}
            {treatmentTypes.map(t => (
              <option key={t.id} value={t.name}>{isPt && t.namePt ? t.namePt : t.name}</option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">{isPt ? "A partir de (opcional)" : "From (optional)"}</label>
            <input type="date" value={preferredFrom} onChange={(e) => setPreferredFrom(e.target.value)} className="w-full px-3 py-2 rounded-lg border bg-background text-sm" />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">{isPt ? "Até (opcional)" : "Until (optional)"}</label>
            <input type="date" value={preferredTo} onChange={(e) => setPreferredTo(e.target.value)} className="w-full px-3 py-2 rounded-lg border bg-background text-sm" />
          </div>
        </div>

        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">{isPt ? "Observações (opcional)" : "Notes (optional)"}</label>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className="w-full px-3 py-2 rounded-lg border bg-background text-sm" placeholder={isPt ? "Ex: prefiro período da manhã" : "e.g. I prefer mornings"} />
        </div>

        <button
          onClick={handleJoin}
          disabled={submitting || !selectedTreatment}
          className="w-full px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <ListChecks className="h-4 w-4" />}
          {isPt ? "Entrar na lista de espera" : "Join waitlist"}
        </button>
      </div>

      {/* Current entries */}
      <div className="space-y-3">
        <h2 className="font-semibold text-sm">{isPt ? "Suas entradas na lista" : "Your waitlist entries"}</h2>
        {loading ? (
          <div className="flex items-center justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
        ) : entries.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">{isPt ? "Você não está em nenhuma lista de espera." : "You're not on any waitlist yet."}</p>
        ) : (
          entries.map(entry => {
            const cfg = STATUS_LABEL[entry.status] || STATUS_LABEL.ACTIVE;
            const Icon = cfg.icon;
            return (
              <div key={entry.id} className="border rounded-xl p-4 bg-card flex items-center justify-between gap-3">
                <div>
                  <p className="font-medium text-sm">{entry.treatmentType}</p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                    <Calendar className="h-3 w-3" /> {formatDate(entry.preferredFrom)} — {formatDate(entry.preferredTo)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-semibold border ${cfg.color}`}>
                    <Icon className="h-3 w-3" /> {isPt ? cfg.pt : cfg.en}
                  </span>
                  <button
                    onClick={() => handleLeave(entry.id)}
                    disabled={removing === entry.id}
                    className="p-1.5 rounded-lg hover:bg-destructive/10 text-destructive transition-colors"
                    title={isPt ? "Sair da lista" : "Leave waitlist"}
                  >
                    {removing === entry.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
