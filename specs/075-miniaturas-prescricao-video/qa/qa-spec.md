# QA Spec — 075: Miniaturas ao prescrever vídeos

Fixtures: uma clínica de teste com categoria → subpasta → exercícios,
incluindo pelo menos **um exercício com `thumbnailUrl` preenchida** e
**um sem** (pra exercitar o fallback), uma **pasta vazia**, e uma
**segunda clínica** com pasta própria (isolamento). Paciente de teste,
nunca um paciente real.

## T-1 — Backend (`GET /api/admin/exercises`)

1. **API** — `?folderId=<pastaA>&all=true` → `200`, devolve só os
   exercícios da pasta A, cada um com `thumbnailUrl`, `videoUrl`,
   `defaultSets`, `defaultReps`.
2. **API** — sem `folderId` → resposta idêntica à de antes da mudança
   (comparar contagem total e primeiros ids com o comportamento atual).
3. **API** — `?folderId=<pastaVazia>&all=true` → `200` com
   `{exercises: []}`, não erro.
4. **API** — `?folderId=<pastaDaClinicaB>&all=true` com sessão da clínica
   A → `200` com lista **vazia** (nunca o conteúdo da clínica B).
5. **API** — exercício marcado `isActive: false` na pasta A não aparece.
6. **API** — `?folderId=` (vazio) se comporta como "sem filtro", não quebra.
7. **Regressão** — a Biblioteca de Exercícios (que usa o mesmo endpoint
   com paginação e filtros) continua listando normalmente.

## T-2 — Grade de miniaturas (UI)

8. **UI** — abrir a aba Exercises do paciente → "Add folder" → cada linha
   de pasta mostra a ação "Ver vídeos".
9. **UI** — clicar "Ver vídeos" numa pasta → o modal troca pra grade, com
   o nome da pasta no título, e os vídeos daquela pasta aparecem.
10. **UI** — clicar "Ver vídeos" **não** seleciona a pasta pra prescrição
    em massa (o rodapé não passa a dizer "Prescrever 10").
11. **UI** — vídeo com `thumbnailUrl` mostra a imagem; vídeo sem mostra o
    ícone de fallback. Nenhum card quebrado, nenhum erro no console.
12. **UI** — marcar 2 vídeos → rodapé diz "Prescrever 2 selecionados";
    desmarcar tudo → botão desabilitado.
13. **UI** — clicar no card (não só no checkbox) alterna a seleção.
14. **UI** — prescrever 2 selecionados → toast informa quantos entraram;
    modal fecha; a lista da aba passa a mostrar exatamente esses 2 (e
    nada além deles).
15. **API/DB** — confirmar por consulta que só os 2 exercícios marcados
    viraram prescrição pra esse paciente, com os defaults do próprio
    exercício em sets/reps.
16. **UI** — prescrever de novo os mesmos 2 → toast diz que já estavam
    prescritos (`skipped`), sem duplicar na lista.
17. **UI** — frequência e notas preenchidas na grade são aplicadas aos
    vídeos marcados (conferir no banco ou reabrindo a edição do item).
18. **UI** — "Voltar" retorna pra lista de pastas, modal segue aberto.
19. **UI** — pasta vazia mostra "nenhum vídeo", não grade quebrada.
20. **UI** — pasta com 33 vídeos rola dentro do modal sem estourar a
    altura da tela.
21. **Regressão** — prescrever a **pasta inteira** continua funcionando
    igual: seleciona a pasta, rodapé mostra "Prescrever N", prescreve
    todos, toast com count/skipped.
22. **UI** — erro de rede ao carregar a grade (simular offline) mostra
    mensagem, não tela em branco silenciosa.

## T-3 — Colapsar categoria redundante (UI)

23. **UI** — categoria com exatamente 1 subpasta de mesmo nome aparece
    **uma vez só** na lista.
24. **UI** — prescrever por essa linha única prescreve o mesmo conjunto
    de exercícios que antes prescreveria (conferir count no toast e no
    banco).
25. **UI** — categoria com 2+ subpastas continua mostrando categoria e
    todas as subpastas.
26. **UI** — categoria com 1 subpasta de nome **diferente** continua
    mostrando as duas linhas.
27. **UI** — nenhuma pasta existente desaparece da lista em nenhum caso
    (comparar o conjunto de pastas visíveis antes/depois da mudança).
28. **UI+API** — categoria espelhada que **também tem vídeos direto nela**
    (estado que nasce ao deletar uma categoria: as subpastas são promovidas
    com os vídeos dentro): a linha colapsada tem que contar, mostrar e
    prescrever **categoria + filho**, não só o filho. Cenário acrescentado
    depois do code review, que achou aqui uma regressão real — a versão
    original colapsava pro filho e deixava os vídeos diretos contados mas
    inalcançáveis.
