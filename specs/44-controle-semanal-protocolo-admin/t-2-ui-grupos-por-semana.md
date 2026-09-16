# T-2: UI — itens agrupados por semana + liberar/esconder semana

**Status:** concluído
**Depende de:** T-1

## Objetivo
Na aba Protocol, o Bruno vê os itens organizados por semana (igual a paciente vê), sabe o que está
liberado e libera/esconde uma semana inteira com um clique.

## Contexto
Ver plan.md, decisões 1 e 2. Lista atual em `app/admin/patients/[id]/page.tsx` (~linhas
2066-2145) é plana, mostra 6 itens + "View all". A tela da paciente
(`app/dashboard/treatment/page.tsx`) agrupa por `startWeek-endWeek` com `weekLabel()` — usar a
mesma chave, ordem e rótulo.

## Passos
1. Substituir a lista plana por grupos: chave `${startWeek || 1}-${endWeek ?? ""}`, ordenados por
   `startWeek`. Rótulo igual ao da paciente ("Week 1", "Weeks 1-2", "Week 5+").
2. Cabeçalho de cada grupo: rótulo, contagem (`3 items`), estado — "Visible to patient" (todos
   visíveis), "Hidden" (todos escondidos) ou "Partly visible" — e um botão: "Release week" quando
   há algum escondido, "Hide week" quando todos estão visíveis. O botão chama o `bulkHidden` da T-1
   com os ids do grupo.
3. Grupos recolhidos por padrão, exceto os que têm algum item visível (o que a paciente está vendo
   agora fica aberto). Dentro do grupo, cada item mantém os botões atuais (editar, olho, duplicar,
   apagar).
4. Resumo no topo da lista: "Patient currently sees: Weeks 1–2" (menor e maior semana entre itens
   visíveis; "nothing yet" se nenhum). Se `releasedThroughWeek` estiver definido, mostrar também
   "(release limit: week N)".
5. Remover o limite de 6 itens / "View all" (os grupos recolhidos já resolvem o tamanho).

## Arquivos afetados
- `app/admin/patients/[id]/page.tsx`

## Critérios de aceite
- [ ] Itens aparecem agrupados por semana, com os mesmos rótulos da tela da paciente
- [ ] Estado de cada grupo (visível / escondido / parcial) confere com `hiddenFromPatient`
- [ ] "Release week" libera todos os itens do grupo numa ação só e a paciente passa a ver aquela
      semana; "Hide week" faz o inverso
- [ ] Resumo "Patient currently sees" bate com o que a paciente vê
- [ ] Editar / olho / duplicar / apagar continuam funcionando dentro dos grupos
- [ ] Sem erro no console; layout ok em ~390px
