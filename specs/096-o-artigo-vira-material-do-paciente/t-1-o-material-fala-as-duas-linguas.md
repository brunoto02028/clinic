# T-1: O conteúdo educacional fala as duas línguas

**Status:** feita (28/09) — em QA
**Depende de:** nenhuma

## Objetivo

`EducationContent` passa a guardar título, descrição e corpo em **inglês e
português**, e a tela mostra a língua de quem está lendo.

## Contexto

`Article` já tem `titleEn/excerptEn/contentEn` e `titlePt/excerptPt/contentPt`,
com `publishLanguage` dizendo qual é a principal. `EducationContent` tem **um**
`title`, **uma** `description` e **um** `body`.

Importar como está joga fora metade do que já foi escrito. E não é detalhe de
conforto: a Ana lê em inglês, outro paciente lê em português, e a regra da casa
é inglês primeiro com o português junto
([[feedback_revisar-pt-en-sempre]]).

Esta tarefa vem antes de tudo porque **material importado antes dela nasce
torto** e teria de ser reimportado.

## Passos

1. Colunas novas, **anuláveis e aditivas**: `titlePt`, `descriptionPt`,
   `bodyPt`. O que existe hoje continua sendo a versão principal.
2. Um helper que escolhe a versão pela língua do paciente e **cai para a que
   existe** — material só em inglês aparece em inglês, não em branco.
3. A rota `/api/education` devolve já resolvido, como `/api/terms` faz: a tela
   não escolhe língua, ela mostra o que recebeu.
4. O editor do painel ganha as duas abas, EN e PT, lado a lado.

## Arquivos afetados

- `prisma/schema.prisma`
- `app/api/education/route.ts` e `app/api/education/[id]` (se existir)
- `app/api/admin/education/content/route.ts`
- a tela de edição de conteúdo no painel
- `mobile/app/(app)/(clinica)/education*`

## Critérios de aceite

- [ ] Um material com as duas versões aparece na língua do paciente
- [ ] Um material só com inglês aparece em inglês para todo mundo
- [ ] O editor mostra e salva as duas
- [ ] Nada do que existe hoje mudou de lugar

---

## Como ficou, e um furo que apareceu no caminho

Três colunas anuláveis (`titlePt`, `descriptionPt`, `bodyPt`) e um resolvedor em
`lib/education-language.ts`, que a rota usa — **a escolha da língua acontece no
servidor**, como nos termos, e nenhuma tela decide por conta.

A queda é assimétrica de propósito: **mostra o que existe**. Material só em
inglês aparece em inglês para quem lê português, em vez do espaço vazio que uma
queda "correta" para nulo produziria. Um texto na língua errada é lido com
esforço; um card sem título não é lido.

**O furo:** a tela de detalhe do app lê `item.body` da lista que já está em
memória — e a lista **nunca mandava corpo nenhum**. Quer dizer: mesmo depois de
importar um artigo, o paciente veria título e resumo e **nada do texto**. O
corpo passa a vir na lista.

Isso engorda a resposta, e é uma troca consciente: com dezenas de textos é
aceitável, e tem a vantagem de **funcionar no aplicativo que já está
instalado**, sem build. Quando a biblioteca passar de umas centenas, a resposta
certa é uma rota de detalhe — e aí a tela do app muda junto.
