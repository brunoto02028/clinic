import { prisma } from "@/lib/db";

/**
 * O artigo do site vira material do paciente (096 T-2).
 *
 * ## Por que cópia, e não vínculo
 *
 * Um vínculo vivo seria mais elegante: editar o artigo atualizaria o app na
 * hora, e não haveria duas verdades. Ele tem uma falha que decide a questão —
 * **despublicar um artigo do site tiraria da mão de um paciente o material que
 * o terapeuta mandou ele ler.** A página pública e o tratamento de alguém têm
 * ciclos de vida diferentes, e o segundo não pode depender do primeiro.
 *
 * O preço da cópia é a divergência com o tempo, e ele é pago com o aviso de
 * `artigoMudouDepois`: o painel mostra que a origem mudou, e **uma pessoa**
 * decide reimportar. Nada se atualiza por trás de quem está lendo.
 *
 * ## O mapeamento, e o detalhe que ele esconde
 *
 * `Article` guarda a língua principal nos campos sem sufixo (`title`,
 * `content`) e diz qual é em `publishLanguage`. Então "o inglês do artigo" nem
 * sempre está em `titleEn` — num artigo publicado em português, ele está em
 * `titleEn` e o **português** é que está em `title`.
 *
 * Ler isso errado produziria material com as duas línguas trocadas, e o
 * sintoma apareceria só na tela de um paciente.
 *
 * Em 28/09/2026 os 35 artigos publicados são todos `publishLanguage: "en"` e
 * **todos têm versão em português completa** — foi o que tornou a T-1
 * obrigatória antes desta.
 */

export interface ArtigoParaImportar {
  id: string;
  title: string;
  excerpt: string;
  content: string;
  titleEn: string | null;
  excerptEn: string | null;
  contentEn: string | null;
  titlePt: string | null;
  excerptPt: string | null;
  contentPt: string | null;
  publishLanguage: string | null;
  imageUrl: string | null;
  tags: string[];
  updatedAt: Date;
}

/** Os campos que a importação precisa ler. Um lugar só, para não divergirem. */
export const CAMPOS_DO_ARTIGO = {
  id: true,
  title: true,
  excerpt: true,
  content: true,
  titleEn: true,
  excerptEn: true,
  contentEn: true,
  titlePt: true,
  excerptPt: true,
  contentPt: true,
  publishLanguage: true,
  imageUrl: true,
  tags: true,
  updatedAt: true,
} as const;

/** O primeiro que tiver texto de verdade. Espaço em branco não conta. */
function primeiro(...v: (string | null | undefined)[]): string | null {
  for (const x of v) if (x && x.trim()) return x;
  return null;
}

/**
 * O artigo, traduzido para os campos do material — as duas línguas separadas.
 */
export function materialDoArtigo(a: ArtigoParaImportar) {
  const principalEhPt = (a.publishLanguage || "en").toLowerCase().startsWith("pt");

  // Quando o artigo é publicado em português, os campos sem sufixo **são** o
  // português, e o inglês só existe se alguém escreveu `*En`.
  const ingles = {
    title: principalEhPt ? primeiro(a.titleEn) : primeiro(a.titleEn, a.title),
    description: principalEhPt ? primeiro(a.excerptEn) : primeiro(a.excerptEn, a.excerpt),
    body: principalEhPt ? primeiro(a.contentEn) : primeiro(a.contentEn, a.content),
  };
  const portugues = {
    title: principalEhPt ? primeiro(a.titlePt, a.title) : primeiro(a.titlePt),
    description: principalEhPt ? primeiro(a.excerptPt, a.excerpt) : primeiro(a.excerptPt),
    body: principalEhPt ? primeiro(a.contentPt, a.content) : primeiro(a.contentPt),
  };

  /**
   * `title` é obrigatório no banco. Num artigo só em português, o inglês não
   * existe — e o material precisa de **algum** título, senão a importação
   * falha por uma tradução que ninguém escreveu. O português assume o posto, e
   * a tela do paciente resolve a língua na leitura (`lib/education-language`).
   */
  const titulo = ingles.title || portugues.title || a.title;

  return {
    title: titulo,
    description: ingles.description ?? portugues.description,
    body: ingles.body ?? portugues.body,
    titlePt: portugues.title,
    descriptionPt: portugues.description,
    bodyPt: portugues.body,
    contentType: "article",
    // A mesma URL, servida pelo mesmo lugar — nada de copiar bytes.
    thumbnailUrl: a.imageUrl,
    tags: a.tags ?? [],
    sourceArticleId: a.id,
    sourceArticleUpdatedAt: a.updatedAt,
  };
}

/**
 * Importa — ou **atualiza**, quando aquele artigo já virou material.
 *
 * Reimportar tem de atualizar e não duplicar: duas cópias do mesmo texto
 * partiriam o progresso de leitura do paciente entre elas, e a lista da clínica
 * encheria de pares.
 *
 * O que a atualização **não** toca: `categoryId`, `isPublished` e `isFeatured`.
 * São decisões que alguém tomou sobre aquele material aqui dentro; reimportar é
 * trazer o texto de novo, não desfazer o que a clínica organizou.
 */
export async function importarArtigo(opts: {
  artigo: ArtigoParaImportar;
  clinicId: string;
  createdById?: string | null;
  categoryId?: string | null;
}): Promise<{ id: string; criado: boolean }> {
  const dados = materialDoArtigo(opts.artigo);

  const existente = await prisma.educationContent.findFirst({
    where: { clinicId: opts.clinicId, sourceArticleId: opts.artigo.id },
    select: { id: true },
  });

  if (existente) {
    await prisma.educationContent.update({ where: { id: existente.id }, data: dados });
    return { id: existente.id, criado: false };
  }

  const criado = await prisma.educationContent.create({
    data: {
      ...dados,
      clinicId: opts.clinicId,
      createdById: opts.createdById ?? null,
      categoryId: opts.categoryId ?? null,
      slug: dados.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
      /**
       * Nasce **não publicado** (096 T-3).
       *
       * O pedido foi *"liberar determinados artigos para determinados
       * pacientes"*. Material que nasce publicado apareceria para a clínica
       * inteira no instante da importação — o contrário do que foi pedido, e
       * sem ninguém ter decidido.
       */
      isPublished: false,
    },
    select: { id: true },
  });
  return { id: criado.id, criado: true };
}

/**
 * O artigo mudou depois da importação?
 *
 * Só diz. Quem decide reimportar é uma pessoa, olhando o que mudou — e não o
 * sistema, trocando o texto por baixo de quem está lendo.
 */
export function artigoMudouDepois(m: {
  sourceArticleUpdatedAt: Date | null;
  sourceArticle?: { updatedAt: Date } | null;
}): boolean {
  if (!m.sourceArticle || !m.sourceArticleUpdatedAt) return false;
  return m.sourceArticle.updatedAt.getTime() > m.sourceArticleUpdatedAt.getTime();
}
