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
| T-1 | [O texto que mente sobre o próprio sistema](t-1-o-texto-que-mente.md) | pendente |
| T-2 | [A duração ocupa o horário](t-2-a-duracao-ocupa-o-horario.md) | pendente |
| T-3 | [Tipo e pagamento, sem camisa de força](t-3-tipo-e-pagamento.md) | **bloqueada** — espera o Bruno |

## Decisões de design

### Nada sai para o paciente sem alguém decidir

Já é a regra da casa desde 17/09/2026, e o agendamento pela clínica a respeita.
O que falta é **a tela dizer isso**, em vez de dizer o contrário. E o envio,
quando acontecer, passa pela prévia com o logo — como todo envio da casa.

### A agenda tem de mostrar o que está ocupado

Um calendário que não mostra a duração não é um calendário: é uma lista com
colunas. O bloco ocupa o tempo real, e o que está ocupado **parece** ocupado.

## Perguntas para o Bruno

1. **"Só tem tratamento condicionado e pago"** — o que falta? As possibilidades
   que eu enxergo: (a) criar um tipo novo ali na hora, sem sair para outra tela;
   (b) marcar sem tipo nenhum; (c) mudar preço e duração naquele agendamento,
   sem mexer no cadastro; (d) outra coisa que eu não vi.
2. **Bloquear o horário** é só desenhar o bloco ocupando os minutos, ou é também
   **impedir** que outra consulta seja marcada em cima?
