"use client";

// Direct clinic ↔ patient message thread — admin side
import { useState, useEffect, useRef, useCallback } from "react";
import { Loader2, Send, Trash2, Megaphone, MessageSquare, BellRing, Paperclip, FileText, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

interface ClinicMsg {
  id: string;
  senderRole: "staff" | "patient";
  kind: "message" | "notice" | "broadcast";
  title: string | null;
  content: string;
  attachmentUrl?: string | null;
  attachmentName?: string | null;
  attachmentType?: string | null;
  readAt: string | null;
  createdAt: string;
  sender: { firstName: string; lastName: string; role: string };
}

export default function PatientMessagesTab({ patientId }: { patientId: string }) {
  const { toast } = useToast();
  const [messages, setMessages] = useState<ClinicMsg[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState("");
  const [draftTitle, setDraftTitle] = useState("");
  const [kind, setKind] = useState<"message" | "notice">("message");
  const [sending, setSending] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchMessages = useCallback(() => {
    fetch(`/api/admin/patients/${patientId}/messages`)
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => setMessages(Array.isArray(data) ? data : []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [patientId]);

  useEffect(() => { fetchMessages(); }, [fetchMessages]);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages.length]);

  const send = async () => {
    if (!draft.trim() && !file) return;
    setSending(true);
    try {
      let r: Response;
      if (file) {
        const fd = new FormData();
        fd.append("content", draft);
        if (kind === "notice" && draftTitle) fd.append("title", draftTitle);
        fd.append("kind", kind);
        fd.append("file", file);
        r = await fetch(`/api/admin/patients/${patientId}/messages`, { method: "POST", body: fd });
      } else {
        r = await fetch(`/api/admin/patients/${patientId}/messages`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content: draft, title: kind === "notice" ? draftTitle : undefined, kind }),
        });
      }
      if (!r.ok) throw new Error("Failed");
      const msg = await r.json();
      setMessages((m) => [...m, msg]);
      setDraft("");
      setDraftTitle("");
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      toast({ title: "Mensagem enviada", description: "O paciente foi notificado." });
    } catch {
      toast({ title: "Erro ao enviar", variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  const remove = async (messageId: string) => {
    if (!confirm("Eliminar esta mensagem? O paciente deixará de a ver.")) return;
    await fetch(`/api/admin/patients/${patientId}/messages`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messageId }),
    });
    setMessages((m) => m.filter((x) => x.id !== messageId));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Thread */}
      <div className="rounded-xl border border-border bg-card/50 p-4 max-h-[480px] overflow-y-auto space-y-3">
        {messages.length === 0 && (
          <div className="text-center py-12 space-y-2">
            <MessageSquare className="h-10 w-10 text-muted-foreground/20 mx-auto" />
            <p className="text-sm text-muted-foreground">Nenhuma mensagem trocada com este paciente ainda.</p>
          </div>
        )}
        {messages.map((m) => {
          const isStaff = m.senderRole === "staff";
          const isBroadcast = m.kind === "broadcast";
          return (
            <div key={m.id} className={`flex ${isStaff ? "justify-end" : "justify-start"}`}>
              <div className={`group relative max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${
                isBroadcast
                  ? "bg-amber-500/10 border border-amber-500/25"
                  : isStaff
                  ? "bg-primary/15 border border-primary/25"
                  : "bg-muted border border-border"
              }`}>
                <div className="flex items-center gap-1.5 mb-1">
                  {isBroadcast && <Megaphone className="h-3 w-3 text-amber-400" />}
                  {m.kind === "notice" && <BellRing className="h-3 w-3 text-primary" />}
                  <span className="text-[10px] font-semibold text-muted-foreground">
                    {isStaff ? `${m.sender.firstName} (clínica)` : `${m.sender.firstName} (paciente)`}
                  </span>
                  <span className="text-[9px] text-muted-foreground/60">
                    {new Date(m.createdAt).toLocaleString("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
                {m.title && <p className="text-xs font-bold mb-0.5">{m.title}</p>}
                <p className="whitespace-pre-wrap leading-relaxed">{m.content}</p>
                {m.attachmentUrl && (
                  m.attachmentType?.startsWith("image/") ? (
                    <a href={m.attachmentUrl} target="_blank" rel="noopener noreferrer" className="block mt-2">
                      <img src={m.attachmentUrl} alt={m.attachmentName || ""} className="max-h-40 rounded-xl border border-border/50 object-cover" />
                    </a>
                  ) : (
                    <a href={m.attachmentUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 mt-2 px-3 py-2 bg-muted/40 border border-border/60 rounded-xl text-xs font-medium hover:bg-muted/70 transition-colors">
                      <FileText className="h-4 w-4 text-primary shrink-0" />
                      <span className="truncate">{m.attachmentName || "Anexo"}</span>
                    </a>
                  )
                )}
                {isStaff && (
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`text-[9px] ${m.readAt ? "text-emerald-400" : "text-muted-foreground/50"}`}>
                      {m.readAt ? "✓✓ Lida" : "✓ Enviada"}
                    </span>
                    <button
                      className="opacity-0 group-hover:opacity-100 transition-opacity text-red-400/60 hover:text-red-400"
                      onClick={() => remove(m.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Composer */}
      <div className="rounded-xl border border-border bg-card p-4 space-y-3">
        <div className="flex items-center gap-2">
          <button
            className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
              kind === "message" ? "bg-primary/15 border-primary/40 text-primary font-semibold" : "border-border text-muted-foreground"
            }`}
            onClick={() => setKind("message")}
          >
            <MessageSquare className="h-3 w-3 inline mr-1" />Mensagem
          </button>
          <button
            className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
              kind === "notice" ? "bg-primary/15 border-primary/40 text-primary font-semibold" : "border-border text-muted-foreground"
            }`}
            onClick={() => setKind("notice")}
          >
            <BellRing className="h-3 w-3 inline mr-1" />Aviso
          </button>
        </div>
        {kind === "notice" && (
          <Input
            placeholder="Título do aviso (ex.: Alteração de horário)"
            value={draftTitle}
            onChange={(e) => setDraftTitle(e.target.value)}
            className="text-sm"
          />
        )}
        <Textarea
          placeholder={kind === "notice" ? "Texto do aviso para o paciente…" : "Escreva a sua mensagem ao paciente…"}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          className="text-sm min-h-[90px]"
        />
        {file && (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 border border-primary/25 rounded-xl text-xs">
            <Paperclip className="h-3.5 w-3.5 text-primary shrink-0" />
            <span className="truncate flex-1 font-medium">{file.name}</span>
            <span className="text-muted-foreground">{(file.size / 1024 / 1024).toFixed(1)}MB</span>
            <button onClick={() => { setFile(null); if (fileInputRef.current) fileInputRef.current.value = ""; }} className="p-0.5 hover:text-destructive"><X className="h-3.5 w-3.5" /></button>
          </div>
        )}
        <div className="flex items-center justify-between gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,.pdf,.doc,.docx,.txt,.csv"
            className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) setFile(f); }}
          />
          <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={() => fileInputRef.current?.click()}>
            <Paperclip className="h-3.5 w-3.5" /> Anexar ficheiro
          </Button>
          <Button onClick={send} disabled={sending || (!draft.trim() && !file)} className="gap-2">
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Enviar ao paciente
          </Button>
        </div>
        <p className="text-[10px] text-muted-foreground">
          O paciente é notificado (email/WhatsApp conforme preferência) e vê a mensagem na área &quot;Perguntas&quot; do portal. Tudo fica registado.
        </p>
      </div>
    </div>
  );
}
