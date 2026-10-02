# O que a API da Withings devolve — medido

**Medido em:** 02/10/2026, 05:12 UTC, em **produção**, na ligação do Bruno.
**Como:** `POST /api/cron/wearables-probe`, janela de 7 dias.
**Ligação:** `CONNECTED`, token válido (não precisou renovar), aparelho pessoal.
**Withings+ do consumidor:** **activo** — o Bruno activou o teste gratuito **no
próprio dia 02/10/2026**. Catorze dias: acaba por volta de **16/10/2026**.

> ## ⚠️ Esta tabela foi medida **com o Withings+ ligado**
>
> Não prova que estes dados vêm no plano gratuito. Pode ser a assinatura do
> consumidor a abri-los.
>
> **E há um indício de que é mesmo isso.** Em 01/10, *antes* do teste, o traçado
> do ECG voltou **vazio** — registei-o na altura como *"VAZIO SEM ERRO
> (ambíguo)"*. Hoje, com o teste ligado, vieram **9.000 amostras**.
>
> O hipnograma também voltou vazio em 01/10, mas essa leitura está
> **contaminada**: nessa chamada havia um `data_fields` inválido (`spo2`) que
> derrubava as três séries de uma vez. Não serve de linha de base.
>
> **O traçado não tem essa desculpa.** `v2/heart get` era uma chamada isolada, e
> voltou vazia.
>
> ### O que fazer com isso
>
> **Remedir depois de 16/10**, com o teste expirado. Se o traçado desaparecer, o
> PDF do ECG depende de uma assinatura **que é do paciente, não nossa** — e isso
> é uma decisão de produto, não de engenharia: não se pode exigir que cada
> paciente assine o Withings+ para a clínica ler o ECG dele.
>
> Até lá, construir — mas construir de forma que **um campo que desapareça seja
> dito**, não escondido. É a 119 T-6, e deixa de ser um extra: passa a ser o que
> impede a tela de mentir quando a assinatura cair.

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
| **HRV** | `v2/sleep getsummary` → `rmssd`, `sdnn_1` | ⛔ **pergunta errada** | esses campos **não existem** nesse endpoint — ver abaixo |

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

## ⛔ O HRV nunca esteve bloqueado — eu perguntei no sítio errado

A análise da documentação (`docs/withings-api-2026-10-02.md`) desmente a linha
que eu próprio escrevi aqui.

**`rmssd` e `sdnn_1` não existem no `v2/sleep getsummary`.** Nesse endpoint o
HRV chama-se `rmssd_start_avg` e `rmssd_end_avg`. Os nomes que pedi vivem
noutros sítios:

| endpoint | como o HRV se chama lá |
|---|---|
| `v2/sleep get` | `rmssd`, **`sdnn_1`**, `hrv_quality` |
| `v2/measure getintradayactivity` | `rmssd`, **`sdnn1`** — *sem underscore* |
| `v2/sleep getsummary` | `rmssd_start_avg`, `rmssd_end_avg` |

A mesma métrica tem **três grafias** na mesma documentação, e eu escolhi a que
não servia para o endpoint que estava a usar — e depois escrevi na tabela que
*"a API não devolveu"*. Foi o **terceiro** "vazio" desta atividade que era
defeito nosso e não falta de plano, depois do `data_fields` inválido de 01/10 e
da janela de sete dias do intraday.

A sondagem passou a pedir os três nomes, cada um no seu endpoint. **Por medir.**

## A outra correcção: o `601` não é só dedupe

Tinha escrito aqui, e no código, que o `601` da Withings é *"dedupe, não limite
de taxa"*. A documentação diz que `601` é **"Too many request"**, e publica um
limite de **120 pedidos por minuto por `client_id`**.

As duas coisas são verdade ao mesmo tempo — argumentos iguais em menos de dez
segundos também dão `601` —, mas tratar o código **só** como dedupe faria uma
sondagem agressiva concluir "sem direito" onde o que há é excesso de pedidos.

## O que continua por responder

- **O HRV**, agora com os nomes certos. Era nome de campo, não plano.
- **Se isto depende do Withings+.** A documentação **exclui** essa hipótese por
  quatro razões independentes — entre elas a Withings dizer, no próprio FAQ,
  que *"the ECG feature and atrial fibrillation detection are included with your
  watch **without any subscription**"*. Ver a secção 0 de
  `docs/withings-api-2026-10-02.md`.
- **E a comparação que eu tinha planeado não serve.** As duas sondagens **não
  pediram o mesmo `signalid`**: a de 02/10 pede sempre o primeiro da lista, e em
  01/10 o primeiro era outro. Remedir às cegas depois de 16/10 responderia a uma
  pergunta diferente. O teste controlado é pedir **o mesmo `signalid`** —
  `763283988`, o das 23:54 de 01/10 — hoje e depois do fim do teste.
