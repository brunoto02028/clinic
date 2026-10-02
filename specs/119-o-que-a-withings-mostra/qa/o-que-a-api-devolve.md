# O que a API da Withings devolve — medido

**Medido em:** 02/10/2026, 05:12 UTC, em **produção**, na ligação do Bruno.
**Como:** `POST /api/cron/wearables-probe`, janela de 7 dias.
**Ligação:** `CONNECTED`, token válido (não precisou renovar), aparelho pessoal.
**Withings+ do consumidor:** **activo** (teste gratuito, activado nessa noite).

> Esta tabela tem data porque a resposta muda quando o plano muda. Quando o
> teste do Withings+ terminar, remedir — a diferença entre as duas tabelas diz
> se a assinatura do consumidor abre a API ou não.

## A tabela

| biomarcador | chamada | desfecho | o que veio |
|---|---|---|---|
| Passos, calorias, minutos activos | `v2/measure getactivity` | ✅ **veio** | 2 dias |
| Medições pontuais (SpO₂, temperatura, peso, pressão) | `measure getmeas` | ✅ **veio** | 16 grupos |
| Duração do sono | `v2/sleep getsummary` | ✅ **veio** | `total_sleep_time: 13380` = **3h43** |
| Frequência do sono, respiração, pontuação | `v2/sleep getsummary` | ✅ **veio** | ver abaixo |
| **Hipnograma da noite** | `v2/sleep get` | ✅ **veio** | **12 fases**, com `hr` dentro de cada uma |
| **ECG — a conclusão** | `v2/heart list` | ✅ **veio** | 2 registos |
| **ECG — o traçado** | `v2/heart get` | ✅ **veio** | **9.000 amostras** |
| Frequência minuto a minuto | `v2/measure getintradayactivity` | ⚠️ vazio | **janela nossa errada** — ver nota |
| Treinos | `v2/measure getworkouts` | ⚠️ vazio | resposta bem-formada; ele não tem treinos no período |
| **HRV** | `v2/sleep getsummary` → `rmssd`, `sdnn_1` | ❌ **não veio** | pedido, e ausente do corpo |

## O resumo do sono, campo a campo

O que a chamada devolveu dentro de `data`:

```
hr_average: 55      hr_min: 49      hr_max: 73
rr_average: 12      rr_min: 11      rr_max: 16
chest_movement_rate_{average,min,max}: 12, 11, 16
sleep_score: 47
total_sleep_time: 13380   wakeupcount: 0   durationtosleep: 240
timezone: "Europe/London"
```

**Bate com o que o app deles mostrava ao Bruno naquela noite:** frequência do
sono 55 bpm, respiração 12 rpm, pontuação 47, sono 3h43. O `rmssd` — o HRV de
14 ms que a tela dele mostra — **não está lá**.

A API ainda nos diz o **fuso da medição**, o que é melhor do que adivinhar.

## A confirmação que esta sondagem deu de lambuja

O registo de ECG das **23:54 de 01/10** veio com `ecg.afib: 0` e
`heart_rate: 63`. O app da Withings mostra, para esse mesmo registo, **"Sinus
Rhythm, 63 bpm"**.

Isso **confirma de forma independente** a correcção da tabela de tradução
subida nessa manhã: `0` é ritmo sinusal, não "sem sinal utilizável". Até então
a prova era indirecta (os dois registos dele estavam "Normal" no diário e o
nosso app dizia "No usable signal"); agora é o número cru ao lado da conclusão
deles.

## As duas ambiguidades, e o que elas são de verdade

**A frequência minuto a minuto não está fora do plano.** Ela **já funcionou**
em produção — `intradayDays: 1`, medido em 01/10. O endpoint devolve até 1440
pontos por dia e recusa janelas largas devolvendo **vazio, sem erro**; a
sondagem pediu sete dias.

Foi o erro que esta sondagem existe para evitar, cometido por ela própria. A
janela do intraday passou a ser de um dia, com teste e mutação.

**Os treinos voltaram `{series, more, offset}`** — uma resposta bem-formada e
vazia. É o que se espera de quem não registou treino nenhum no período, e não
há razão para suspeitar do plano. Fica como *"vazio plausível"*, e remede-se
quando houver um treino para encontrar.

## O que isto destrava

| estava bloqueado | agora |
|---|---|
| **099 T-9** — o traçado do ECG e o *play* | **destravado**: 9.000 amostras |
| O PDF do ECG para levar ao médico | **montável**: só faltavam as amostras |
| **119 T-4** — o hipnograma | **destravado**: 12 fases |
| **119 T-5** — a curva da frequência da noite | **destravado**: vem dentro de cada fase |
| A respiração e a pontuação do sono | disponíveis — a pontuação **citada como deles** |

## O que continua por responder

- **O HRV.** É o único da lista do Bruno que a API não devolveu. Pode ser plano,
  pode ser nome de campo. Remedir com outros nomes antes de concluir.
- **Se isto depende do Withings+.** Só a segunda medição, depois do teste
  gratuito, responde. **Marcar a data.**
