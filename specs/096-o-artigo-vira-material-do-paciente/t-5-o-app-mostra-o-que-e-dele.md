# T-5: O app mostra o que é dele, e o que é da clínica

**Status:** pendente
**Depende de:** T-3

## Objetivo

A aba Educação do app separa **o que o terapeuta mandou para você** do que está
na biblioteca — e diz quando algo é obrigatório ou tem prazo.

## Contexto

A tela já existe e já recebe `assignments`, `published`, `progress` e
`categories`. Hoje ela mostra uma lista só, porque nunca houve conteúdo para
revelar a diferença.

`EducationAssignment` já guarda `note`, `dueDate`, `isRequired` e `isCompleted`
— quatro coisas que a tela não mostra, e que mudam o que a pessoa faz primeiro.

## Passos

1. No topo: **"Para você"** — o que foi atribuído, com a nota do terapeuta, o
   prazo e o selo de obrigatório.
2. Abaixo: **"Da clínica"** — a biblioteca aberta, por categoria.
3. Marcar como lido usa o `EducationProgress` que já existe, e o painel passa a
   mostrar quem leu o quê.
4. Vazio é um estado: sem nada atribuído, a tela diz isso, em vez de parecer que
   não carregou.
5. A cor da ação principal é a da clínica, medida — a mesma lição da 095 T-4
   ([[cor-nova-medir-a-que-sai]]).

## Arquivos afetados

- `mobile/app/(app)/(clinica)/education.tsx` e `education/[id].tsx`
- `app/api/education/route.ts` (se faltar algum campo da atribuição)

## Critérios de aceite

- [ ] "Para você" aparece antes da biblioteca
- [ ] A nota do terapeuta, o prazo e o obrigatório aparecem
- [ ] Lido é registrado e o painel enxerga
- [ ] Sem atribuição, a tela diz que está vazia
- [ ] Material restrito de outro paciente nunca aparece
