"use client";

import { useMemo, useState } from "react";
import { Smartphone } from "lucide-react";
import { emBlocos, type Bloco } from "@/lib/rich-text-blocks";
import { naLingua, temTraducao } from "@/lib/education-language";

/**
 * O que o paciente vai ver, antes de mandar (101 T-2).
 *
 * ## Por que existe
 *
 * O Bruno atribuiu um artigo e depois abriu o telefone para descobrir o que
 * tinha mandado: *"está muito ruim a parte visual, não vê imagem, não vê
 * absolutamente nada, o texto ficou estourado o HTML"*. A tela de atribuir
 * mostrava um **título num seletor** — nada mais — e o botão dizia "Assign to
 * Patient".
 *
 * A regra da casa é que nada sai sem alguém ver a prévia. Faltava a prévia.
 *
 * ## Por que os mesmos blocos que o telefone recebe
 *
 * `emBlocos` é a **mesma função** que a rota do paciente usa
 * (`app/api/education/route.ts`). Uma prévia que renderizasse o HTML no
 * navegador mostraria uma página bonita e mentiria: o telefone não desenha
 * HTML, ele desenha blocos, e o que some é justamente o que não virou bloco.
 *
 * Então aqui se desenha o resultado da tradução, com a mesma escala
 * tipográfica do aplicativo (`mobile/src/components/ArtigoEmBlocos.tsx`) — não
 * é pele, é o conteúdo.
 *
 * ## As duas línguas
 *
 * A língua do material é a **do paciente** (`preferredLocale`), decidida no
 * servidor. Quem atribui não sabe qual é sem olhar, e o inglês é a língua
 * primária da casa — então a prévia mostra as duas, e diz quando falta uma.
 */

export interface MaterialParaPrevia {
  title: string;
  description?: string | null;
  body?: string | null;
  titlePt?: string | null;
  descriptionPt?: string | null;
  bodyPt?: string | null;
  thumbnailUrl?: string | null;
  contentType?: string | null;
  category?: { name: string } | null;
}

type Lingua = "en" | "pt";

export function PreviaDoMaterial({
  material,
  note,
}: {
  material: MaterialParaPrevia | null;
  /** A observação que a clínica escreveu — ela aparece junto do material. */
  note?: string;
}) {
  const [lingua, setLingua] = useState<Lingua>("en");

  /**
   * A queda de língua é **a do servidor**, e não uma cópia dela.
   *
   * Eu tinha reescrito a regra aqui, e ela errou no primeiro caso que testei:
   * um material só em inglês, visto em PT, mostrava o título em inglês (com
   * queda) e o corpo **vazio** (sem queda). A prévia dizia "o paciente recebe o
   * texto em inglês" e logo abaixo mostrava um material sem corpo.
   *
   * `naLingua` é a mesma função que `app/api/education/route.ts` aplica antes
   * de mandar ao telefone. Usá-la é o que torna a prévia verdadeira por
   * construção — duas cópias da regra divergem, e a divergência aparece na
   * tela de um paciente.
   */
  const versao = useMemo(() => {
    if (!material) return null;
    const locale = lingua === "pt" ? "pt-BR" : "en-GB";
    const resolvido = naLingua(material, locale);
    return {
      title: resolvido.title,
      description: resolvido.description ?? null,
      body: resolvido.body ?? null,
      temEstaLingua: temTraducao(material, locale),
    };
  }, [material, lingua]);

  const blocos: Bloco[] = useMemo(
    () => (versao?.body ? emBlocos(versao.body) : []),
    [versao?.body]
  );

  if (!material || !versao) {
    return (
      <div className="flex h-full min-h-[320px] flex-col items-center justify-center gap-2 rounded-xl border border-dashed p-6 text-center">
        <Smartphone className="h-8 w-8 text-muted-foreground/40" />
        <p className="text-sm text-muted-foreground">
          Pick a material to see what the patient will read.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
          <Smartphone className="h-3.5 w-3.5" />
          What the patient sees
        </p>
        <div className="flex overflow-hidden rounded-md border text-[11px]">
          {(["en", "pt"] as const).map((l) => (
            <button
              key={l}
              type="button"
              onClick={() => setLingua(l)}
              className={`px-2.5 py-1 transition-colors ${
                lingua === l ? "bg-primary text-primary-foreground" : "hover:bg-muted"
              }`}
            >
              {l.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Uma tradução que não existe **precisa aparecer aqui**: senão a prévia
          mostra o inglês, quem atribui acha que está tudo certo, e a paciente
          que lê em português recebe um texto noutra língua. */}
      {!versao.temEstaLingua && (
        <p className="rounded-md border border-amber-300/50 bg-amber-50 px-2.5 py-1.5 text-[11px] text-amber-800 dark:bg-amber-500/10 dark:text-amber-300">
          {lingua === "pt"
            ? "No Portuguese version — a patient reading in Portuguese gets the English text."
            : "No English version — a patient reading in English gets the Portuguese text."}
        </p>
      )}

      {/* A moldura do telefone. Largura de aparelho, para as linhas quebrarem
          onde vão quebrar de verdade — num painel largo o texto parece bem
          mais curto do que é. */}
      <div className="mx-auto w-full max-w-[380px] overflow-hidden rounded-2xl border bg-background shadow-sm">
        <div className="flex items-center gap-2 border-b px-4 py-2.5">
          {/* O logo da casa, porque nada sai sem ele. */}
          <img src="/logo.png" alt="BPR" className="h-5 w-auto" />
          <span className="text-xs font-medium text-muted-foreground">Article</span>
        </div>

        <div className="max-h-[520px] space-y-4 overflow-y-auto p-4">
          {material.thumbnailUrl ? (
            <img
              src={material.thumbnailUrl}
              alt=""
              className="h-[180px] w-full rounded-xl bg-muted object-cover"
            />
          ) : null}

          <div>
            <h3 className="text-[22px] font-semibold leading-[29px]">{versao.title}</h3>
            <div className="mt-2 flex flex-wrap gap-2">
              {material.category?.name && (
                <span className="rounded-[10px] bg-muted px-2.5 py-1 text-[11px] text-muted-foreground">
                  {material.category.name}
                </span>
              )}
              {material.contentType && (
                <span className="rounded-[10px] bg-muted px-2.5 py-1 text-[11px] text-muted-foreground">
                  {material.contentType}
                </span>
              )}
            </div>
          </div>

          {versao.description && (
            <div className="rounded-xl border bg-muted/40 p-3">
              <p className="text-[15px] leading-[22px] text-muted-foreground">
                {versao.description}
              </p>
            </div>
          )}

          {note?.trim() && (
            // A observação chega junto do material, então ela entra na prévia:
            // é texto que a clínica escreveu e o paciente vai ler.
            <div className="rounded-xl border border-primary/30 bg-primary/5 p-3">
              <p className="text-[11px] font-medium uppercase tracking-wide text-primary">
                From your clinic
              </p>
              <p className="mt-1 whitespace-pre-wrap text-[15px] leading-[22px]">{note}</p>
            </div>
          )}

          {blocos.length > 0 ? (
            <Blocos blocos={blocos} />
          ) : versao.body ? (
            <p className="whitespace-pre-wrap text-[15.5px] leading-[25px]">{versao.body}</p>
          ) : (
            // Corpo vazio é o pior dos casos, e é silencioso: o paciente abre e
            // encontra um título sozinho.
            <p className="rounded-md border border-dashed px-3 py-6 text-center text-xs text-muted-foreground">
              This material has no body text — the patient would open it and find
              only the title.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

/** Os seis tipos, com a mesma escala do `ArtigoEmBlocos.tsx` do aplicativo. */
function Blocos({ blocos }: { blocos: Bloco[] }) {
  return (
    <div className="space-y-[14px]">
      {blocos.map((b, i) => {
        switch (b.tipo) {
          case "titulo":
            return (
              <h4
                key={i}
                className="font-semibold"
                style={{
                  marginTop: i === 0 ? 0 : 10,
                  fontSize: b.nivel === 1 ? 22 : b.nivel === 2 ? 18 : 16,
                  lineHeight: `${b.nivel === 1 ? 29 : b.nivel === 2 ? 25 : 22}px`,
                }}
              >
                {b.texto}
              </h4>
            );
          case "paragrafo":
            return (
              <p key={i} className="text-[15.5px] leading-[25px]">
                {b.texto}
              </p>
            );
          case "lista":
            return (
              <ul key={i} className="space-y-2">
                {b.itens.map((item, j) => (
                  <li key={j} className="flex gap-2.5 text-[15.5px] leading-[25px]">
                    <span className="text-muted-foreground">{b.ordenada ? `${j + 1}.` : "•"}</span>
                    <span className="flex-1">{item}</span>
                  </li>
                ))}
              </ul>
            );
          case "citacao":
            return (
              <blockquote
                key={i}
                className="border-l-[3px] border-primary py-0.5 pl-3.5 text-[15.5px] italic leading-[25px] text-muted-foreground"
              >
                {b.texto}
              </blockquote>
            );
          case "imagem":
            return (
              <figure key={i} className="space-y-1.5">
                <img
                  src={b.url}
                  alt={b.legenda || ""}
                  className="h-[200px] w-full rounded-xl bg-muted object-cover"
                />
                {b.legenda && (
                  <figcaption className="text-xs text-muted-foreground">{b.legenda}</figcaption>
                )}
              </figure>
            );
          case "separador":
            return <hr key={i} className="my-1 border-t" />;
          default:
            return null;
        }
      })}
    </div>
  );
}
