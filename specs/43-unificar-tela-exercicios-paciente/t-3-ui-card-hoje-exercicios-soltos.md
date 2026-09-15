# T-3: UI — card "Hoje" + seção de exercícios soltos na Treatment Plan

**Status:** pendente
**Depende de:** T-2

## Objetivo
Ao abrir `/dashboard/treatment`, a paciente vê primeiro um card "Hoje" com o que precisa fazer
naquele dia (venha de protocolo ou de prescrição solta), com vídeo à mão e um botão de marcar
feito bem visível. Quem não tem protocolo nenhum (só prescrições soltas) também tem uma
experiência completa nessa mesma tela.

## Contexto
Ver plan.md, decisões 2, 3 e 4. Arquivo principal: `app/dashboard/treatment/page.tsx` (já tem
`WeekSection`, `DayStrip`, `weekDates()`, `toDateStr()` da Ativ. 42 — reaproveitar essas funções
pro card "Hoje" e pra seção nova, não duplicar lógica de data).

## Passos
1. Buscar também `GET /api/exercises` (prescrições soltas, com `completionLogs`) além do já
   existente `GET /api/patient/protocol`, na mesma página.
2. Novo componente `TodayCard`, renderizado no topo, acima das seções de semana: junta (a) itens
   de protocolo cuja faixa de semana inclui `currentWeek` e (b) todas as prescrições soltas
   ativas. Cada linha: nome do exercício, séries/reps/hold, botão "assistir vídeo" (se
   `exercise.videoUrl` existir) e um botão grande de marcar feito hoje (chama o toggle certo pro
   tipo do item — protocolo usa `POST /api/patient/protocol`, solta usa `PATCH /api/exercises`).
3. Nova seção "General Exercises" / "Exercícios Gerais", abaixo das seções de semana de
   protocolo, só quando existem prescrições soltas: mesma tira de 7 dias do `DayStrip` já
   existente (semana = últimos 7 dias corridos, não semana de calendário), aplicada às
   prescrições soltas.
4. Trocar o rótulo de progresso: em vez de "Done Nx" (itens de protocolo) e "Completed 1x"
   (prescrições soltas), mostrar "X/7 dias esta semana" — X = nº de datas distintas com log nos
   últimos 7 dias (incluindo hoje), calculado a partir de `completionLogs`, não do contador
   antigo.
5. Cobrir o caso "paciente sem protocolo nenhum": a tela não pode ficar vazia/quebrada — mostra
   só o card "Hoje" + a seção "Exercícios Gerais", sem as seções de semana de protocolo.

## Arquivos afetados
- `app/dashboard/treatment/page.tsx`

## Critérios de aceite
- [ ] Card "Hoje" aparece no topo, junta itens de protocolo da semana atual + prescrições soltas
- [ ] Botão de marcar feito no card "Hoje" é visivelmente maior/mais fácil de tocar que a tira de
      dias de baixo
- [ ] Paciente sem nenhum `TreatmentProtocol` (só prescrições soltas) vê a tela completa, sem
      erro, sem seção de semana vazia
- [ ] Rótulo mudou de "Done Nx"/"Completed 1x" pra contagem "X/7 dias esta semana" em ambos os
      tipos de item
- [ ] Marcar num tipo (protocolo) e no outro (solto) no mesmo card "Hoje" funciona sem erro no
      console, cada um chamando o endpoint certo
- [ ] Responsivo em ~390px
