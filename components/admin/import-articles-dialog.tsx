"use client";

import { useEffect, useState } from "react";
import { Loader2, FileText, Check, RefreshCw, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

/**
 * Escolher quais artigos do site viram material do paciente (096 T-4).
 *
 * ## Por que escolher, em vez de importar tudo
 *
 * Artigo do site é material de marketing; conteúdo educacional é material
 * clínico. Nem todos servem a alguém em tratamento, e **essa escolha é de quem
 * conhece a clínica**.
 *
 * Importar os trinta e cinco de uma vez seria repetir o erro que a 095 T-5
 * corrigiu nos exercícios: a lista do paciente encheria de textos que ninguém
 * escolheu para ele.
 *
 * ## O que este diálogo **não** faz
 *
 * Não atribui nada a ninguém. Trazer para a clínica e mandar para um paciente
 * são duas decisões, e juntá-las num clique faria a segunda acontecer sem que
 * alguém a tomasse.
 */

interface ArtigoNaLista {
  id: string;
  title: string;
  titlePt: string | null;
  createdAt: string;
  temPortugues: boolean;
  imported: { contentId: string; isPublished: boolean; desatualizado: boolean } | null;
}

export function ImportArticlesDialog({
  open,
  onOpenChange,
  onImported,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onImported: () => void;
}) {
  const { toast } = useToast();
  const [artigos, setArtigos] = useState<ArtigoNaLista[] | null>(null);
  const [busca, setBusca] = useState("");
  const [escolhidos, setEscolhidos] = useState<Set<string>>(new Set());
  const [importando, setImportando] = useState(false);

  useEffect(() => {
    if (!open) return;
    setArtigos(null);
    setEscolhidos(new Set());
    fetch("/api/admin/education/from-articles")
      .then((r) => (r.ok ? r.json() : { articles: [] }))
      .then((d) => setArtigos(d.articles ?? []))
      .catch(() => setArtigos([]));
  }, [open]);

  const alternar = (id: string) =>
    setEscolhidos((s) => {
      const n = new Set(s);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });

  const importar = async () => {
    if (escolhidos.size === 0) return;
    setImportando(true);
    try {
      const res = await fetch("/api/admin/education/from-articles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ articleIds: [...escolhidos] }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "Failed");
      /**
       * Criados e atualizados, separados.
       *
       * "7 importados" quando cinco já existiam faria quem clicou procurar doze
       * materiais novos numa lista que ganhou dois.
       */
      const partes = [];
      if (d.created) partes.push(`${d.created} novo${d.created === 1 ? "" : "s"}`);
      if (d.updated) partes.push(`${d.updated} atualizado${d.updated === 1 ? "" : "s"}`);
      toast({
        title: partes.join(" · ") || "Nada mudou",
        description:
          "Chega ao paciente quando você atribuir. Até lá, fica só na clínica.",
      });
      onImported();
      onOpenChange(false);
    } catch (e: any) {
      toast({ title: "Não importou", description: e.message, variant: "destructive" });
    } finally {
      setImportando(false);
    }
  };

  const lista = (artigos ?? []).filter(
    (a) =>
      !busca ||
      a.title.toLowerCase().includes(busca.toLowerCase()) ||
      (a.titlePt || "").toLowerCase().includes(busca.toLowerCase())
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Trazer artigos do site</DialogTitle>
          <DialogDescription>
            Vira material do paciente, com as duas línguas. Nasce <strong>restrito</strong>: só chega a
            quem você atribuir depois.
          </DialogDescription>
        </DialogHeader>

        <Input
          placeholder="Procurar pelo título…"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          className="text-sm"
        />

        {artigos === null ? (
          <div className="flex justify-center py-10">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
          </div>
        ) : lista.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            {busca ? "Nada com esse nome." : "Nenhum artigo publicado no site."}
          </p>
        ) : (
          <div className="max-h-[45vh] overflow-y-auto space-y-1 pr-1">
            {lista.map((a) => {
              const marcado = escolhidos.has(a.id);
              return (
                <button
                  key={a.id}
                  onClick={() => alternar(a.id)}
                  className={`w-full text-left px-3 py-2 rounded-lg border text-sm transition-colors ${
                    marcado ? "border-primary/50 bg-primary/10" : "border-border hover:bg-muted/50"
                  }`}
                >
                  <div className="flex items-start gap-2">
                    <FileText className="h-3.5 w-3.5 mt-0.5 shrink-0 text-muted-foreground" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium line-clamp-1">{a.title}</p>
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap text-[11px]">
                        {/* Sem o português, o material chega em inglês a quem lê
                            português — a tela mostra o que existe. É um estado
                            aceitável, e quem importa merece saber antes. */}
                        {!a.temPortugues && (
                          <span className="text-amber-600">só em inglês</span>
                        )}
                        {a.imported && (
                          <span className="text-emerald-600 inline-flex items-center gap-1">
                            <Check className="h-3 w-3" /> já importado
                            {a.imported.isPublished ? " · na biblioteca" : " · só atribuído"}
                          </span>
                        )}
                        {a.imported?.desatualizado && (
                          <span className="text-amber-600 inline-flex items-center gap-1">
                            <AlertCircle className="h-3 w-3" /> o artigo mudou depois
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={importando}>
            Cancelar
          </Button>
          <Button onClick={importar} disabled={escolhidos.size === 0 || importando} className="gap-2">
            {importando ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            {escolhidos.size === 0
              ? "Escolha um artigo"
              : `Trazer ${escolhidos.size}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
