# T-4: A agenda começa às oito, e o que vier antes some

**Status:** 🟢 concluída (29/09) — aguardando QA
**Depende de:** T-2 (feita)

## Objetivo

Que nenhuma consulta fique invisível por causa do horário em que foi marcada.

## Contexto — achado do QA da T-2

O QA marcou uma consulta às **07:00** e ela não apareceu em lugar nenhum. A
grade desenha 08:00–19:00, e o que cai fora não é escondido com aviso: some.

É anterior à T-2 — o bloco de altura fixa também não desenhava as 07:00 —, mas
é exatamente o defeito que a T-2 existe para corrigir. Uma agenda que esconde
uma consulta é pior que uma agenda que a desenha errado: o erro alguém vê.

A clínica pode marcar às 07:00. O diálogo aceita, o servidor grava, a consulta
existe, o paciente a vê no aplicativo — e quem organiza o dia não.

## Por que está parada

A correção depende de uma decisão que é do Bruno, não minha:

| | o que seria |
|---|---|
| **(a)** | a faixa acompanha o horário de funcionamento cadastrado da clínica |
| **(b)** | a faixa se estica sozinha quando existe consulta fora dela |
| **(c)** | faixa fixa maior (ex.: 06:00–22:00), com rolagem |
| **(d)** | a faixa continua 08:00–19:00 e aparece um aviso — *"1 consulta antes das 08:00"* — com atalho |

A **(b)** é a que menos exige decisão e nunca esconde nada; a **(a)** é a que
mais combina com o resto do sistema, que já sabe o horário da clínica.

## O efeito colateral já foi tratado

O code review mostrou que a consulta invisível não só sumia: ela **roubava
coluna** de quem aparece. A das 07:00 fazia a das 08:00 desenhar em meia
largura, com a outra metade vazia e nada explicando por quê. Isso foi
corrigido — quem não aparece não disputa espaço.

O que continua em aberto, e é o que esta tarefa espera, é a faixa em si.

## A resposta do Bruno, 29/09/2026

> *"Pode corrigir... somente horários disponíveis podem ter agendamento."*

A resposta é melhor que a pergunta. Eu tinha oferecido quatro formas de
**mostrar** a consulta das 07:00; ele apontou que o problema é antes: **não
devia dar para marcar ali.**

## O que estava acontecendo

O seletor de hora do diálogo era uma lista **escrita à mão** — 20 itens, de
08:00 a 17:30, de meia em meia hora — que não sabia nada da agenda da clínica.
Errava nos dois sentidos ao mesmo tempo: oferecia horário fechado e escondia
horário aberto.

## O que foi feito

1. Os horários passam a vir de `GET /api/availability?date=&duration=`, que já
   existia e já sabe da agenda configurada, das exceções e do que está ocupado.
   A **duração** entra na pergunta: 90 minutos não cabem em toda janela onde 30
   caberiam.
2. Dia fechado ou cheio **diz isso**, em vez de mostrar uma lista vazia.
3. Trocar a data limpa a hora escolhida, se ela não existir no dia novo.
4. **A rede:** a faixa da grade deixou de ser fixa e estica para cobrir qualquer
   consulta que exista fora dela — marcada por API, importada, ou porque a
   clínica abriu mais cedo. O fim da consulta conta, não só o início.

O 4 é rede, e não a correção: com o agendamento restrito à agenda real, no uso
normal a faixa nem se mexe. Mas uma agenda que **esconde** uma consulta é pior
que uma que a desenha errada — o erro alguém vê.

## Critérios de aceite
- [x] O Bruno escolheu: restringir o agendamento, não esticar a faixa.
- [x] Só horário disponível é oferecido, e a duração entra na conta.
- [x] Dia fechado ou cheio diz o que é.
- [x] Nenhuma consulta do dia fica sem representação na grade.
- [ ] QA: marcar num dia fechado, num dia cheio, e conferir a grade esticada.
