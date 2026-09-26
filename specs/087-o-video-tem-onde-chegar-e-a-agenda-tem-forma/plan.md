# Atividade 087 — O vídeo tem onde chegar, e a agenda tem forma

**Status:** T-1 a T-7 implementadas e medidas · `qa/report.md`
**Data:** 26/09/2026

## Objetivo

Três pedidos do Bruno, no mesmo fôlego, depois de testar o app no aparelho:

> "Toda vez que eu puxar a tela para baixo, eu quero que atualize. É para eu não precisar sair do
> aplicativo e atualizar."

> "Eu fiz um teste aqui com o paciente, eu mandei um vídeo, mas o vídeo não chegou em lugar nenhum
> dentro do sistema da clínica. Eu preciso saber onde vai ser notificado e aonde vai chegar esse
> vídeo, para conferir se o paciente está fazendo certo aquele exercício."

> "Eu queria ver um calendário semanal, pelo menos, e poder rolar para o lado. Ter um calendário
> melhor para o paciente ver uma agenda cheia, ou as datas disponíveis. Diário, semanal ou até
> mensal."

## O que o diagnóstico encontrou

### O vídeo **chegou**. O que não existe é como achá-lo

O fluxo está inteiro: o app sobe para o Cloudflare R2, os bytes são farejados de verdade (um `.exe`
renomeado para `.mp4` é recusado), nasce um `ExerciseSubmission`, e existe painel no admin — em
`/admin/patients/<id>`, aba **"Exercises"**.

O buraco é de **destino**, não de upload:

| o que falta | consequência |
|---|---|
| Tela de fila | o backend já responde `?pending=1` e **nenhuma tela usa**. O badge diz "3 esperando" e não existe lugar que liste quais |
| Marca na lista de pacientes | nada em `/admin/patients` mostra quem mandou vídeo — só abrindo um a um |
| Link direto para a aba | a aba é estado local, sem `?tab=`. O e-mail diário e o badge levam a `/admin/patients` e param |
| A aba em tenant de estúdio | escondida por `!isPersonal`: ali o vídeo entra e fica **inacessível pela interface** |

### O calendário não pode melhorar sem o servidor mudar antes

Hoje é uma tira reta de 14 dias, e `/api/availability` responde **um dia por chamada**. Pintar
"livre/cheio" na tira exigiria 14 chamadas. Mostrar um mês exigiria 31. A rota precisa saber
responder por intervalo antes de a tela poder ter forma.

## Decisões de design

### 1. A regra de um dia é escrita uma vez

A rota de um dia tem regra densa: bloqueio de terapeuta, agenda configurada, exceção do dia, modelo
antigo como fallback, horários já ocupados, horários que já passaram hoje. Duplicar isso no modo
intervalo criaria duas verdades que divergem na primeira correção — e a segunda seria a que ninguém
lembra de corrigir.

A regra sai para uma função, e as duas formas da rota chamam **a mesma**. A resposta de um dia não
muda em nada: nenhum cliente existente pode quebrar por causa de uma forma nova.

### 2. O intervalo devolve contagem, não os horários

Um mês com todos os horários de todos os dias é uma resposta enorme para pintar 31 bolinhas. O
intervalo devolve, por dia: quantos horários livres, e por que está fechado quando está. Os horários
em si continuam vindo da chamada de um dia, quando a pessoa escolhe o dia.

### 3. O calendário tem três alturas, e a semana é a casa

Dia, semana e mês — mas **a semana abre por padrão**. Um paciente marcando consulta pensa em "esta
semana ou a próxima", não em "17 de outubro". O mês existe para saltar longe; o dia, para ver as
horas.

### 4. A fila de vídeos é uma tela, não um badge

Um número que diz "3 esperando" e não diz quais obriga a abrir paciente por paciente. A fila lista
os pendentes com nome, exercício e quando chegou, e cada linha leva direto ao painel que já existe —
o que exige o link direto da T-6.

### 5. Estúdio também recebe vídeo

Hoje o vídeo entra e some da interface em tenant `isPersonal`. Duas saídas: mostrar a aba, ou não
aceitar o envio. **Aceitar e esconder é a única que não se defende** — é o defeito que o Bruno
acabou de viver, com o agravante de não ter aba nenhuma para procurar.

## Tarefas

| T-N | nome | depende de | status |
|---|---|---|---|
| T-1 | Puxar para atualizar em toda tela| —| **concluída** |
| T-2 | Disponibilidade por intervalo (a regra de um dia, extraída)| —| **concluída** |
| T-3 | Calendário do paciente: dia, semana e mês| T-2| **concluída** |
| T-4 | Fila de vídeos no admin| —| **concluída** |
| T-5 | Marca de vídeo pendente na lista de pacientes| T-4| **concluída** |
| T-6 | Link direto para a aba de exercícios (`?tab=`)| —| **concluída** |
| T-7 | O vídeo em tenant de estúdio deixa de sumir| T-6| **concluída** |

## Suposições

Toda decisão que eu tive de adivinhar, explícita para você derrubar:

1. **Nenhuma notificação imediata entra nesta atividade.** Não existe push nem e-mail na hora do
   upload — e isso foi **decisão registrada** em `lib/clinic-waiting.ts` ("não precisa ficar mandando
   um monte de e-mail cheio de notificação"). A fila e a marca na lista resolvem "onde chega" sem
   reabrir aquela decisão. Se você quiser aviso imediato, é uma tarefa a mais e eu preciso ouvir.
2. **O intervalo é limitado a 42 dias** (seis semanas — um mês com folga). Sem limite, alguém pede um
   ano e a rota calcula 365 dias de agenda.
3. **A contagem do intervalo é calculada por dia, em paralelo**, reusando a função extraída. Se o
   tempo de resposta incomodar no QA, o passo seguinte é buscar bloqueios, exceções e consultas do
   período inteiro de uma vez — mas otimizar antes de medir é escolher o problema errado.
4. **O calendário não mostra a agenda de outros pacientes.** "Agenda cheia" é quantos horários
   sobraram, nunca quem ocupou os outros.
5. **A fila de vídeos é por clínica**, com o `clinicId` do ator sempre no `where` — a rota já é assim.
6. **Em tenant de estúdio, a saída é mostrar a aba**, não recusar o envio: o aluno já gravou o vídeo
   e recusar depois do esforço é a pior das duas.
7. **A BA continua fora**, como você definiu — `achievements.tsx` é a única lista sem o gesto novo.
