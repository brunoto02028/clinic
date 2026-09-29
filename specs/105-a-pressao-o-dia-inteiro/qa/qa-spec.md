# QA — Atividade 105

Regras da casa, e uma que pesa mais aqui: **paciente de teste, nunca a Mione**.
Dado de pressão é dado clínico de uma pessoa real; todo cenário usa conta de
teste com leituras plantadas.

## T-1 — O telefone entrega

| # | tipo | cenário | esperado |
|---|---|---|---|
| 1.1 | UI | primeira vez | a tela explica **antes** de o sistema perguntar |
| 1.2 | UI | recusar no sistema | a tela não diz que ligou |
| 1.3 | API | sincronizar 40 leituras | 40 linhas, `source: PATIENT_DEVICE`, com a origem do aparelho |
| 1.4 | API | reabrir e sincronizar de novo | **nenhuma duplicada** |
| 1.5 | código | escrita na saúde do telefone | **não existe** — leitura apenas |
| 1.6 | UI | desligar | corta, e a autorização some do nosso lado |
| 1.7 | código | bundle web | compila (módulo por plataforma) |

## T-2 — Muitas medidas

| # | tipo | cenário | esperado |
|---|---|---|---|
| 2.1 | API | dia com 40 leituras | média dia, média noite, máx, mín — e **quantas** sustentam cada |
| 2.2 | API | dia com 3 leituras | marcado como incompleto |
| 2.3 | API | descenso noturno | calculado, e ausente quando não há noite medida |
| 2.4 | API | agregar não apaga | as 40 continuam lá |

## T-3 — A clínica vê

| # | tipo | cenário | esperado |
|---|---|---|---|
| 3.1 | UI | um dia | 24 horas, noite sombreada |
| 3.2 | UI | a semana | dia e noite lado a lado |
| 3.3 | UI | origens misturadas | distinguíveis, sem comparar de igual para igual |
| 3.4 | UI | paciente sem bracelete | tela vazia honesta, não quebrada |
| 3.5 | API | ficha de outro inquilino | 404 |

## T-4 — O que assusta (redesenhada em 29/09/2026)

| # | tipo | cenário | esperado |
|---|---|---|---|
| 4.1 | API | média diurna 138/88, com 20 leituras | faixa **estágio 1** pelos limiares de fora do consultório |
| 4.2 | API | a mesma média com 6 leituras | **dados insuficientes** — nenhum alerta (mínimo do NICE) |
| 4.3 | API | média 142/92 avaliada com limiar de consultório | **falharia** como normal — o teste guarda que não usamos esses números |
| 4.4 | UI | o aviso ao paciente | nunca um número solto; aponta **o médico dele**, não a clínica |
| 4.5 | UI | o texto | não diagnostica nem sugere conduta |
| 4.6 | UI | paciente marca "estou ciente" | o aviso para de repetir naquela faixa |
| 4.7 | UI | paciente marca "em tratamento" | idem, e a clínica vê o contexto |
| 4.8 | API | depois disso, a faixa **piora** | o aviso **reabre** |
| 4.9 | UI | a clínica | vê o que o paciente respondeu, e quando |
| 4.10 | UI | o material | diz que não é diagnóstico, aferição nem emergência |

## Ponta a ponta

Um paciente de teste com um dia inteiro de leituras plantadas: o app sincroniza,
o agregado sai, a clínica vê o dia e a semana, e uma leitura alta aparece na fila
sem que nada tenha saído para o paciente.
