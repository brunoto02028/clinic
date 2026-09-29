"use client";

import { useState } from "react";
import { AlertTriangle, BellRing, Loader2, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

/**
 * Avisar que há material novo — com a prévia antes do botão (29/09/2026).
 *
 * O Bruno: *"quero poder dar aviso em massa e individual"*. A diferença entre
 * os dois acontece na **atribuição**; aqui é sempre a mesma pergunta — *quem
 * ainda não foi avisado deste material?* — e sempre a mesma prévia.
 *
 * ## Por que a prévia não é opcional
 *
 * O botão que dispara **só existe depois** de a conta voltar do servidor, com a
 * contagem e os nomes. Um envio em massa é a coisa mais fácil de errar por um
 * dígito, e o incidente de 11/09/2026 foi exatamente uma contagem que ninguém
 * tinha conferido antes de disparar.
 *
 * E a prévia mostra **a frase que vai aparecer na tela bloqueada**, que não diz
 * qual é o material: "material novo sobre incontinência" à vista de quem estiver
 * por perto é o tratamento de alguém exposto.
 */
export function AvisarMaterial({
  contentId,
  contentTitle,
}: {
  contentId: string;
  contentTitle: string;
}) {
  const { toast } = useToast();
  const [aberto, setAberto] = useState(false);
  const [previa, setPrevia] = useState<any>(null);
  const [ocupado, setOcupado] = useState(false);

  const abrir = async () => {
    setAberto(true);
    setPrevia(null);
    setOcupado(true);
    try {
      const res = await fetch("/api/admin/education/notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contentId, dryRun: true }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast({
          title: "Could not check",
          description: d.errorPt || d.error || `HTTP ${res.status}`,
          variant: "destructive",
        });
        setAberto(false);
        return;
      }
      setPrevia(d);
    } finally {
      setOcupado(false);
    }
  };

  const enviar = async () => {
    setOcupado(true);
    try {
      const res = await fetch("/api/admin/education/notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contentId }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast({
          title: "Nobody was notified",
          description: d.errorPt || d.error || `HTTP ${res.status}`,
          variant: "destructive",
        });
        return;
      }
      toast({
        title: `${d.notified} notified`,
        description:
          d.delivered === d.notified
            ? "Their phones were told there is new material."
            : `${d.delivered} phones were reached — the rest have no device registered.`,
      });
      setAberto(false);
      setPrevia(null);
    } finally {
      setOcupado(false);
    }
  };

  const quantos = previa?.count ?? 0;
  const emMassa = quantos > 5;

  return (
    <>
      <Button variant="ghost" size="sm" className="h-7 gap-1.5 px-2 text-xs" onClick={abrir}>
        <BellRing className="h-3.5 w-3.5" /> Notify
      </Button>

      <Dialog open={aberto} onOpenChange={(v) => !ocupado && setAberto(v)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Tell them there is new material</DialogTitle>
            <DialogDescription>{contentTitle}</DialogDescription>
          </DialogHeader>

          {!previa ? (
            <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Counting who has not been told…
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span>
                  <strong>{quantos}</strong>{" "}
                  {quantos === 1 ? "person will be notified" : "people will be notified"}
                </span>
              </div>

              {previa.alreadyNotified > 0 && (
                <p className="text-xs text-muted-foreground">
                  {previa.alreadyNotified} already been told — they will not be told again.
                </p>
              )}

              {quantos === 0 ? (
                <p className="text-sm text-muted-foreground">
                  There is nobody left to notify. Assign the material to someone first.
                </p>
              ) : (
                <>
                  {/* Os nomes, e não só a contagem: é o que deixa ver que a
                      lista é a que você esperava antes de o telefone tocar. */}
                  <div className="max-h-40 overflow-y-auto rounded-lg border p-2 text-sm">
                    {previa.patients.map((p: any) => (
                      <div key={p.id} className="py-0.5">
                        {p.name}
                      </div>
                    ))}
                  </div>

                  {emMassa && (
                    <div className="flex items-start gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-xs">
                      <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                      <span>
                        This is a mass notification. {quantos} phones will ring. Read the list
                        above before sending.
                      </span>
                    </div>
                  )}

                  {/* A frase exata da tela bloqueada. Ela não nomeia o material
                      de propósito, e ver isso aqui é o que prova a promessa. */}
                  <div className="rounded-xl border bg-muted/30 p-3">
                    <p className="text-[11px] text-muted-foreground">On their lock screen</p>
                    <p className="mt-1 text-sm font-semibold">Your clinic</p>
                    <p className="text-sm">There is new material for you to read.</p>
                    <p className="mt-1.5 text-[11px] text-muted-foreground">
                      The title is not in the notification — it is read inside the app.
                    </p>
                  </div>
                </>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="ghost" onClick={() => setAberto(false)} disabled={ocupado}>
              Cancel
            </Button>
            {/* O botão que dispara só existe depois da prévia. */}
            {previa && quantos > 0 && (
              <Button onClick={enviar} disabled={ocupado} className="gap-1.5">
                {ocupado ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <BellRing className="h-4 w-4" />
                )}
                Notify {quantos}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
