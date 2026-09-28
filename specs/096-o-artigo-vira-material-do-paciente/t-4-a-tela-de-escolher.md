# T-4: A tela de escolher quais artigos atravessam

**Status:** pendente
**Depende de:** T-2

## Objetivo

Uma tela onde o Bruno vê os 35 artigos, marca os que viram material do paciente,
e importa.

## Contexto

Artigo do site é material de marketing; conteúdo educacional é material clínico.
Nem todos os 35 servem a alguém em tratamento, e **essa escolha não é minha**.

Importar tudo de uma vez seria o mesmo erro da pasta de exercícios: a lista do
paciente encheria com trinta e cinco textos que ninguém escolheu para ele.

## Passos

1. Em `/admin/education`, uma aba **"Dos artigos"**: lista os artigos
   publicados, com título, data, língua e se já foi importado.
2. Marcar vários e importar de uma vez — mas **um por um também**, que é o caso
   comum depois da primeira vez.
3. Quem já foi importado aparece marcado, com link para o material, e com o
   aviso da T-2 quando o artigo mudou.
4. Depois de importar: ir direto para o material, para escolher categoria e
   decidir se é restrito ou aberto.
5. Nada é atribuído a ninguém neste passo. Importar é trazer para a clínica;
   atribuir é outra ação, com outro botão.

## Arquivos afetados

- `app/admin/education/page.tsx`
- `app/api/admin/education/content/route.ts` (o `POST` de importação)

## Critérios de aceite

- [ ] Os 35 artigos aparecem, com o estado de cada um
- [ ] Dá para importar um, e dá para importar vários
- [ ] Reimportar mostra o que vai mudar antes
- [ ] Importar não atribui nada a ninguém
- [ ] Artigo não publicado não aparece para importar
