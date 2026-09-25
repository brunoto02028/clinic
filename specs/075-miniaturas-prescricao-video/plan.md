# 075 — Miniaturas ao prescrever vídeos pro paciente

## Objetivo

Hoje, na aba **Exercises** da ficha do paciente, o botão "Add folder" abre
um modal que só sabe fazer uma coisa: **prescrever a pasta inteira**. A
lista é puro texto (nome da pasta + contagem) — não dá pra ver o que tem
dentro, nem escolher um vídeo específico. Pra prescrever um vídeo só, o
staff precisa sair da ficha do paciente, ir na Biblioteca de Exercícios,
prescrever de lá, e voltar.

Pedido do Bruno: *"se eu for prescrever para o paciente algum video direto
da area do paciente, quero poder ver miniaturas, deixar o layout melhor,
tem como?"*

Esta atividade adiciona um passo de navegação dentro do modal: entrar numa
pasta, ver os vídeos em **grade com miniatura**, marcar os que quiser e
prescrever só aqueles.

## Decisões de design

- **Passo novo, não redesenho** (validado com o Bruno antes do plano). O
  fluxo de "prescrever pasta inteira" continua exatamente como está — já
  funciona e já foi testado. A grade de miniaturas entra como um caminho
  alternativo a partir da mesma lista de pastas.
- **Backend praticamente pronto.** `POST /api/admin/exercise-prescriptions`
  já aceita `exercises: [{exerciseId, ...}]` como alternativa a `folderId`
  — é o mesmo endpoint, mesmo retorno (`count`/`restored`/`skipped`). Não
  precisa de rota nova pra prescrever vídeos escolhidos a dedo; só faltava
  UI que montasse esse array.
- **Única falta real no backend**: `GET /api/admin/exercises` não filtra
  por `folderId`. É uma linha no `where` — o modelo `Exercise` já tem o
  campo, e o `?all=true` desse mesmo endpoint já devolve exatamente os
  campos que a grade precisa (`thumbnailUrl`, `videoUrl`, `defaultSets`,
  `defaultReps`, …).
- **Sem sets/reps por vídeo nesta versão.** Cada vídeo entra com o default
  do próprio exercício, igual ao que a prescrição de pasta inteira já faz
  hoje. Ajustar sets/reps depois de prescrito já é possível na lista da
  própria aba — não vale encher a tela de inputs agora.
- **Fallback de miniatura já existe no componente**: a lista de exercícios
  prescritos (logo abaixo, no mesmo arquivo) já mostra `thumbnailUrl` com
  fallback pro ícone `FileVideo`. A grade reusa exatamente esse padrão, em
  vez de inventar um placeholder novo.
- **Colapsar categoria redundante.** No screenshot, cada categoria aparece
  duas vezes seguidas ("Advanced Core" em negrito, e logo abaixo
  "Advanced Core" indentado, mesma contagem). Não é bug de código — é
  categoria com exatamente 1 subpasta de nome idêntico. Quando isso
  acontecer, mostrar uma linha só. Entra aqui porque o pedido inclui
  "deixar o layout melhor", e é a poluição mais visível da tela.

## Tarefas

| T-N | Nome | Status |
|---|---|---|
| T-1 | Backend — filtro `folderId` no GET de exercícios | concluído |
| T-2 | Frontend — grade de miniaturas e prescrição por vídeo | concluído |
| T-3 | Frontend — colapsar categoria/subpasta de nome idêntico | concluído |
| T-4 | Backend — prescrição recusa exercício de outra clínica | concluído |

> **T-4 entrou depois do plano aprovado.** Ao implementar a T-2 achei que o
> caminho de lista do endpoint de prescrição não verificava a dona dos
> `exerciseId` recebidos — vazamento entre clínicas, pré-existente, mas
> agora mais usado por causa da grade. Levado ao Bruno, que pediu pra
> fechar nesta mesma atividade em vez de abrir outra.

## Suposições (validar com o Bruno)

1. **Todos os vídeos de uma vez, com scroll** — sem paginação dentro da
   grade. A maior pasta hoje tem 33 vídeos; miniaturas pequenas em scroll
   devem dar conta. Se ficar pesado, paginar vira uma melhoria posterior.
2. **Multi-seleção com checkbox**, prescrevendo tudo num clique só ao
   final — não "clicou, prescreveu na hora".
3. **Frequência e notas continuam sendo do lote** (os mesmos campos que já
   existem hoje pra pasta inteira), aplicados a todos os vídeos marcados —
   não um campo por vídeo.

## Fora de escopo

- Biblioteca de Exercícios (`app/admin/exercises`) — só a ficha do paciente.
- Editar sets/reps/frequência por vídeo dentro da grade.
- Upload ou geração de miniaturas (`thumbnailUrl` já existe no modelo; a
  atividade só passa a exibi-la).
