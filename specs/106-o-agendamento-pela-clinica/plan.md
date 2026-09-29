# Atividade 106 — O agendamento feito pela clínica

## Objetivo

> O Bruno, 29/09/2026, com prints do painel:
>
> *"Quando a clínica vai fazer um agendamento, eu não quero que vá uma
> notificação automaticamente para o paciente. Eu quero ter a liberdade de
> escolher quando enviar. (…) Quando eu fizer algum agendamento, eu quero poder
> escolher o tipo de tratamento ali, que no caso só tem tratamento condicionado
> e pago, e eu não quero isso. (…) E quando eu colocar a duração do tratamento,
> eu tenho que bloquear na agenda os slots com aqueles horários, que tem que
> aparecer visível para mim."*

## O que eu encontrei antes de planejar

Dois dos três já têm resposta no código, e uma delas é desconcertante.

### 1. O envio automático **já não acontece** — mas o texto diz que sim

O diálogo abre com *"The patient will receive a confirmation email
automatically."* Quinze linhas abaixo, a caixa **desmarcada por padrão** diz
*"Send the confirmation email now (no preview) — leave unchecked to write and
preview it afterwards."*

O comportamento é o que o Bruno quer. **O texto é que afirma o oposto**, e foi
ele que criou a impressão de que o sistema envia sozinho.

Um texto que mente sobre o próprio sistema é pior que um defeito: o defeito
alguém mede, a frase todo mundo acredita. Este custou um pedido de
funcionalidade que já existia.

### 2. A duração **não** ocupa o horário na agenda

Confirmado: nada liga a duração à altura do bloco no calendário. Uma consulta de
60 minutos ocupa o mesmo espaço que uma de 30, e o horário seguinte parece
livre.

### 3. "Tratamento condicionado e pago" — **não entendi, e não vou adivinhar**

O diálogo hoje oferece: tipo de tratamento (com preço e duração), formato (na
clínica / vídeo / domicílio), modo de pagamento (na clínica / online), e duas
caixas — *sessão cortesia* e *isentar a cobrança*.

Gratuito já é possível pelas duas caixas. Então "condicionado e pago" é outra
coisa, e está nas perguntas abaixo.

## Tarefas

| T-N | nome | status |
|---|---|---|
| T-1 | [O texto que mente sobre o próprio sistema](t-1-o-texto-que-mente.md) | 🟢 concluída (29/09) |
| T-2 | [A duração ocupa o horário](t-2-a-duracao-ocupa-o-horario.md) | 🟢 concluída (29/09) |
| T-3 | [Tipo e pagamento, sem camisa de força](t-3-tipo-e-pagamento.md) | 🟢 concluída (29/09) — aguardando QA |
| T-4 | [A agenda começa às oito, e o que vier antes some](t-4-a-agenda-comeca-as-oito.md) | 🟢 concluída (29/09) — aguardando QA |
| T-5 | [Uma caixa marcada, dois e-mails enviados](t-5-uma-caixa-dois-emails.md) | 🟢 concluída (29/09) — aguardando QA |

## Decisões de design

### Nada sai para o paciente sem alguém decidir

Já é a regra da casa desde 17/09/2026, e o agendamento pela clínica a respeita.
O que falta é **a tela dizer isso**, em vez de dizer o contrário. E o envio,
quando acontecer, passa pela prévia com o logo — como todo envio da casa.

### A agenda tem de mostrar o que está ocupado

Um calendário que não mostra a duração não é um calendário: é uma lista com
colunas. O bloco ocupa o tempo real, e o que está ocupado **parece** ocupado.

## O que o QA encontrou, 29/09/2026

Os relatórios estão em `qa/report-t-1.md` e `qa/report-t-2.md`, medidos na porta
4010 deste worktree, com paciente de teste `Qa106 PacienteTeste` numa clínica
isolada. Os dois aprovaram. Seis achados saíram junto:

| # | achado | o que foi feito |
|---|---|---|
| 1 | consulta às 07:00 é invisível na grade | virou a **T-4** |
| 2 | bloco das 19:30 vazava 28px para fora da moldura | **corrigido** — defeito que a T-2 introduziu |
| 3 | três sobrepostas cortam o nome | aceito: o `title` cobre, e três ao mesmo tempo é raro |
| 4 | dia pelo relógio do navegador, hora pelo da clínica | **corrigido** — a chave do dia passou a ser a da clínica |
| 5 | marcar a caixa manda **dois** e-mails | virou a **T-5** |
| 6 | `NEXTAUTH_URL` aponta para `:3000` no ambiente local | ambiente, não código |

A prova do 1.2 foi feita como eu pedi: medindo primeiro que o log **fala**
quando o e-mail sai, e só então tratando o silêncio como prova. O QA ainda
sabotou o `pediramEnviarAoPaciente` de volta para `!== false` e confirmou que
oito testes reprovam — a trava tem quem a segure.

## O que o code review encontrou, 29/09/2026

| # | achado | o que foi feito |
|---|---|---|
| 4 | consulta invisível fora da faixa **roubava coluna** de quem aparece | **corrigido** — efeito colateral novo da T-2; `dentroDaGrade()` filtra antes de dispor |
| 5 | a tela de videoconsulta deixou de avisar o paciente, em silêncio | **corrigido no aviso** — o admin passa a ler que ninguém foi notificado e para onde ir |
| 6 | ~840 `Intl.DateTimeFormat` por render, 37 ms medidos | **corrigido** — o minuto de cada consulta é calculado uma vez, em `useMemo` |
| 8 | asserções que congelavam a grafia do código | **corrigidas** — passaram a medir comportamento |

O achado 5 é consequência direta da T-1 e ela não o tinha registrado. A direção
continua certa: nada sai sem alguém pedir. O que faltava era a tela dizer isso.

## O que o code review encontrou, 29/09/2026

| # | achado | o que foi feito |
|---|---|---|
| 4 | consulta invisível fora da faixa **roubava coluna** de quem aparece | **corrigido** — efeito colateral novo da T-2; `dentroDaGrade()` filtra antes de dispor |
| 5 | a tela de videoconsulta deixou de avisar o paciente, em silêncio | **corrigido no aviso** — o admin passa a ler que ninguém foi notificado e para onde ir |
| 6 | ~840 `Intl.DateTimeFormat` por render, 37 ms medidos | **corrigido** — o minuto de cada consulta é calculado uma vez, em `useMemo` |
| 8 | asserções que congelavam a grafia do código | **corrigidas** — passaram a medir comportamento |

O achado 5 é consequência direta da T-1 e ela não o tinha registrado. A direção
continua certa: nada sai sem alguém pedir. O que faltava era a tela dizer isso.

## Perguntas para o Bruno

1. **"Só tem tratamento condicionado e pago"** — o que falta? As possibilidades
   que eu enxergo: (a) criar um tipo novo ali na hora, sem sair para outra tela;
   (b) marcar sem tipo nenhum; (c) mudar preço e duração naquele agendamento,
   sem mexer no cadastro; (d) outra coisa que eu não vi.
2. **Bloquear o horário** é só desenhar o bloco ocupando os minutos, ou é também
   **impedir** que outra consulta seja marcada em cima? A T-2 entregou o
   desenho; impedir é outra tarefa, e não foi feita por conta própria.
