# T-4: A agenda começa às oito, e o que vier antes some

**Status:** pendente — espera o Bruno decidir a faixa
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

## Critérios de aceite
- [ ] O Bruno escolheu a faixa.
- [ ] Nenhuma consulta do dia fica sem representação na grade.
- [ ] Teste com consulta antes e depois da faixa.
