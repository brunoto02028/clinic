# T-2: A ponte — o artigo vira material, e lembra de onde veio

**Status:** pendente
**Depende de:** T-1

## Objetivo

Transformar um artigo publicado em conteúdo educacional, com as duas línguas, e
guardar de qual artigo ele veio.

## Contexto

São 35 artigos publicados e zero conteúdos educacionais. A ponte não existe.

**Cópia, e não vínculo** — decidido no plano. Um vínculo vivo atualizaria o app
ao editar o artigo, e despublicar um artigo tiraria da mão de um paciente o
material que o terapeuta mandou ele ler. O preço da cópia é a divergência, e
paga-se com o aviso do passo 4.

## Passos

1. `sourceArticleId` em `EducationContent` (anulável — material escrito à mão
   não vem de artigo nenhum) e `sourceArticleUpdatedAt`, para saber se o artigo
   mudou depois.
2. Uma função de importação, num lugar só: mapeia título, resumo → descrição,
   corpo, imagem → thumbnail, tags. `contentType: "article"`.
3. Importar de novo o mesmo artigo **atualiza** o material existente em vez de
   criar um segundo — senão a lista enche de cópias e o progresso do paciente se
   parte entre elas.
4. Quando `article.updatedAt > sourceArticleUpdatedAt`, o painel mostra **"o
   artigo mudou desde a importação"** com um botão de atualizar. A decisão é de
   quem importa; nada se atualiza sozinho por trás de um paciente que está lendo.
5. O material importado nasce **não publicado** (T-3 explica).

## Arquivos afetados

- `prisma/schema.prisma`
- `lib/education-from-article.ts` (novo — a função, num lugar só)
- `app/api/admin/education/content/route.ts`

## Critérios de aceite

- [ ] Um artigo vira material com as duas línguas preservadas
- [ ] Reimportar atualiza, não duplica
- [ ] O painel avisa quando o artigo de origem mudou
- [ ] O artigo nunca é alterado pela importação
- [ ] Material escrito à mão continua funcionando, sem origem
