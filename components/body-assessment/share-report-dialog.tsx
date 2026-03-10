"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Send,
  Eye,
  Loader2,
  Download,
  MessageCircle,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ShareReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assessment: any;
  locale: string;
  therapistNotes: string;
  onShared: (updated: any) => void;
  onRefresh: () => void;
}

export function ShareReportDialog({
  open,
  onOpenChange,
  assessment: a,
  locale,
  therapistNotes,
  onShared,
  onRefresh,
}: ShareReportDialogProps) {
  const { toast } = useToast();
  const [isSending, setIsSending] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  const handleSendToPortal = async () => {
    setIsSending(true);
    try {
      const res = await fetch(`/api/admin/body-assessments/${a.id}/send-to-patient`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ language: locale }),
      });
      if (res.ok) {
        const updated = await res.json();
        onShared({ ...a, ...updated, sentToPatientAt: updated.sentToPatientAt, status: updated.status });
        onRefresh();
        onOpenChange(false);
        toast({ title: locale === "pt-BR" ? "Relatório enviado!" : "Report sent!", description: locale === "pt-BR" ? "Disponível no portal do paciente + email de notificação enviado." : "Available in patient portal + notification email sent." });
      } else {
        const err = await res.json();
        toast({ title: "Error", description: err.error, variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", variant: "destructive" });
    } finally {
      setIsSending(false);
    }
  };

  const handleWhatsApp = () => {
    const url = `${window.location.origin}/dashboard/body-assessments`;
    const msg = locale === "pt-BR"
      ? `Olá ${a.patient?.firstName}! Sua avaliação biomecânica (${a.assessmentNumber}) está pronta. Acesse seu portal para ver o relatório completo: ${url}`
      : `Hello ${a.patient?.firstName}! Your biomechanical assessment (${a.assessmentNumber}) is ready. Access your portal to see the full report: ${url}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, "_blank");
  };

  const handleDownloadPdf = async () => {
    setIsDownloading(true);
    try {
      const res = await fetch(`/api/body-assessments/${a.id}/report-pdf`);
      if (!res.ok) {
        toast({ title: locale === "pt-BR" ? "Erro no PDF" : "PDF Error", description: locale === "pt-BR" ? "Falha ao gerar PDF." : "Failed to generate PDF.", variant: "destructive" });
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `body-assessment-${a.assessmentNumber}.pdf`;
      link.click();
      URL.revokeObjectURL(url);
      toast({ title: locale === "pt-BR" ? "PDF baixado!" : "PDF downloaded!" });
    } catch {
      toast({ title: locale === "pt-BR" ? "Erro no PDF" : "PDF Error", variant: "destructive" });
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="h-5 w-5 text-purple-500" />
            {locale === "pt-BR" ? "Compartilhar Relatório" : "Share Report"}
          </DialogTitle>
          <DialogDescription>
            {locale === "pt-BR"
              ? "Escolha como deseja compartilhar o relatório com o paciente. Verifique o preview antes de enviar."
              : "Choose how you want to share the report with the patient. Check the preview before sending."}
          </DialogDescription>
        </DialogHeader>

        {/* Patient info */}
        <div className="rounded-lg border p-3 bg-muted/30">
          <p className="text-xs text-muted-foreground mb-1">{locale === "pt-BR" ? "Paciente" : "Patient"}</p>
          <p className="text-sm font-semibold">{a.patient?.firstName} {a.patient?.lastName}</p>
          <p className="text-xs text-muted-foreground">{a.patient?.email}</p>
        </div>

        {/* Report Preview */}
        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
            <Eye className="h-3.5 w-3.5" />
            {locale === "pt-BR" ? "Preview do Relatório" : "Report Preview"}
          </p>
          <div className="rounded-lg border p-4 bg-card max-h-60 overflow-y-auto space-y-2">
            {a.overallScore != null && (
              <div className="flex items-center gap-3 pb-2 border-b">
                <div className="text-center">
                  <p className="text-2xl font-bold" style={{ color: a.overallScore >= 80 ? "#22c55e" : a.overallScore >= 60 ? "#f59e0b" : "#ef4444" }}>{Math.round(a.overallScore)}</p>
                  <p className="text-[9px] text-muted-foreground">Score</p>
                </div>
                {a.postureScore != null && <div className="text-center border-l pl-3"><p className="text-sm font-bold">{Math.round(a.postureScore)}</p><p className="text-[9px] text-muted-foreground">{locale === "pt-BR" ? "Postura" : "Posture"}</p></div>}
                {a.symmetryScore != null && <div className="text-center border-l pl-3"><p className="text-sm font-bold">{Math.round(a.symmetryScore)}</p><p className="text-[9px] text-muted-foreground">{locale === "pt-BR" ? "Simetria" : "Symmetry"}</p></div>}
              </div>
            )}
            {a.aiSummary && (
              <div>
                <p className="text-[10px] font-semibold text-muted-foreground mb-0.5">{locale === "pt-BR" ? "Resumo da IA" : "AI Summary"}</p>
                <p className="text-xs text-muted-foreground line-clamp-4">{a.aiSummary}</p>
              </div>
            )}
            {therapistNotes && (
              <div>
                <p className="text-[10px] font-semibold text-muted-foreground mb-0.5">{locale === "pt-BR" ? "Notas do Terapeuta" : "Therapist Notes"}</p>
                <p className="text-xs text-muted-foreground line-clamp-4 whitespace-pre-wrap">{therapistNotes}</p>
              </div>
            )}
            {(a.correctiveExercises?.length ?? 0) > 0 && (
              <p className="text-xs text-muted-foreground">
                📋 {a.correctiveExercises.length} {locale === "pt-BR" ? "exercícios corretivos incluídos" : "corrective exercises included"}
              </p>
            )}
          </div>
        </div>

        {/* Share Options */}
        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            {locale === "pt-BR" ? "Escolha o destino" : "Choose destination"}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {/* Portal + Email */}
            <button
              className="flex flex-col items-center gap-2 p-4 rounded-lg border-2 border-purple-500/30 bg-purple-500/5 hover:bg-purple-500/10 transition-all text-center"
              disabled={isSending}
              onClick={handleSendToPortal}
            >
              {isSending ? <Loader2 className="h-6 w-6 animate-spin text-purple-500" /> : <Send className="h-6 w-6 text-purple-500" />}
              <span className="text-xs font-semibold">{locale === "pt-BR" ? "Portal do Paciente" : "Patient Portal"}</span>
              <span className="text-[10px] text-muted-foreground">
                {locale === "pt-BR" ? "Paciente verá no portal + recebe email" : "Patient sees in portal + gets email"}
              </span>
            </button>

            {/* WhatsApp */}
            <button
              className="flex flex-col items-center gap-2 p-4 rounded-lg border-2 border-green-500/30 bg-green-500/5 hover:bg-green-500/10 transition-all text-center"
              onClick={handleWhatsApp}
            >
              <MessageCircle className="h-6 w-6 text-green-500" />
              <span className="text-xs font-semibold">WhatsApp</span>
              <span className="text-[10px] text-muted-foreground">
                {locale === "pt-BR" ? "Abre WhatsApp com link do portal" : "Opens WhatsApp with portal link"}
              </span>
            </button>

            {/* Download PDF */}
            <button
              className="flex flex-col items-center gap-2 p-4 rounded-lg border-2 border-blue-500/30 bg-blue-500/5 hover:bg-blue-500/10 transition-all text-center"
              disabled={isDownloading}
              onClick={handleDownloadPdf}
            >
              {isDownloading ? <Loader2 className="h-6 w-6 animate-spin text-blue-500" /> : <Download className="h-6 w-6 text-blue-500" />}
              <span className="text-xs font-semibold">{locale === "pt-BR" ? "Baixar PDF" : "Download PDF"}</span>
              <span className="text-[10px] text-muted-foreground">
                {locale === "pt-BR" ? "PDF completo para imprimir/enviar" : "Full PDF to print/send"}
              </span>
            </button>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {locale === "pt-BR" ? "Fechar" : "Close"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
