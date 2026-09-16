# T-3: UI — form de item completo + "Add item" escondido

**Status:** implementado — aguardando QA
**Depende de:** T-1, T-2

## Objetivo
Ao adicionar ou editar um item, o Bruno escolhe a semana, escreve as instruções e liga o item a um
exercício da biblioteca (vendo se tem vídeo e com atalho pra subir). Item novo nunca aparece em
branco pra paciente.

## Contexto
Ver plan.md, decisões 3, 4 e 5. Form atual (~linhas 2076-2106 de
`app/admin/patients/[id]/page.tsx`) só tem Title, Phase, Frequency, Sets, Reps, Description.
`saveProtoItem` (~linha 404) já converte `startWeek`/`endWeek`. `addProtoItem` (~linha 447) cria
item visível na semana 1.

## Passos
1. Form de item: adicionar **Start week** (número ≥ 1), **End week** (opcional, ≥ start),
   **Hold (s)**, **Instructions** (textarea) e **Exercise from library**:
   - campo de busca que consulta `GET /api/admin/exercises?search=<texto>&limit=10` (com debounce)
     e lista nome + "🎬 video" / "no video";
   - item ligado mostra o nome do exercício, se tem vídeo, e botões "Unlink" e
     "Open in library to add video" (abre `/admin/exercises?search=<nome>` em nova aba);
   - ao salvar, envia `exerciseId` (ou `null` ao desligar) junto do `itemUpdate` (T-1).
2. Validar no form: start week inteiro ≥ 1; end week vazio ou ≥ start week (mensagem inline, não
   envia).
3. "Add item" sai do topo e vai pra cada grupo de semana ("+ Add to this week"), criando o item com
   `startWeek`/`endWeek` do grupo e `hiddenFromPatient: true`, abrindo direto em edição. Manter um
   "+ Add item" geral (abre o form com start week vazio pra escolher) também criando escondido.
4. No item escondido recém-criado, mostrar dica "Hidden until you release it".
5. `app/admin/exercises/page.tsx`: ler `?search=` da URL no carregamento e preencher a busca.

## Arquivos afetados
- `app/admin/patients/[id]/page.tsx`
- `app/admin/exercises/page.tsx`

## Critérios de aceite
- [ ] Editar item permite mudar semana inicial/final, hold e instruções, e salva certo
- [ ] End week menor que start week → erro no form, nada é enviado
- [ ] Buscar e ligar um exercício → item passa a mostrar o exercício; na tela da paciente aparece
      "Watch video" quando o exercício tem vídeo
- [ ] "Unlink" desliga o exercício
- [ ] "Open in library" abre a biblioteca já filtrada pelo nome
- [ ] "Add to this week" cria item escondido naquela semana; a paciente não vê nada até liberar
- [ ] Sem erro no console
