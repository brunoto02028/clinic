# T-1: Medir, biomarcador a biomarcador, o que a API devolve

**Status:** pendente
**Depende de:** nenhuma
**Aberta:** 02/10/2026 — o Bruno mandou doze capturas do app da Withings.

## A confusão que esta tarefa existe para não deixarmos fazer

Nas capturas de 05:04 aparece **"Your Health, Simplified — 14 days free, then
£99.99/year"**, e noutra **"Unlock with Withings+"**.

**Isso é o Withings+, a assinatura do consumidor.** Compra-se dentro do app
deles, no telemóvel do Bruno, e desbloqueia coisas **no app deles**: o Health
Improvement Score, o detalhe do Readiness.

**Não é o plano da API.** O acesso de programador tem escalões próprios, B2B, e
é outro contrato. Assumir que os dois são a mesma coisa custaria £99,99 e não
traria necessariamente um único campo novo ao nosso lado.

Mas há uma experiência barata, e é o cerne desta tarefa:

> **Os 14 dias são grátis.** Se o Bruno activar o teste, medimos a mesma lista
> antes e depois. Se os campos aparecerem na **nossa** ligação, a assinatura do
> consumidor também abre a API para a conta dele — e isso é uma resposta que
> vale para todos os pacientes. Se não aparecerem, sabemos que o caminho é o
> contrato de programador, e o Bruno decide com o preço à frente.

Qualquer das duas respostas vale mais do que o palpite.

## Porque medir é a tarefa inteira

**Dado fora do plano não dá erro.** O campo simplesmente não vem. Já medimos em
produção, em 01/10: o hipnograma e os treinos voltaram **vazios, sem erro**, e o
minuto-a-minuto da frequência funcionou.

"Vazio" e "sem direito" são a mesma resposta e levam a acções opostas — pagar,
ou procurar um defeito nosso que não existe. E já houve um defeito nosso a
parecer isso: um `data_fields` inválido derrubou as **três** chamadas de série
de uma vez, porque partilhavam um `try`.

## O inventário, das doze capturas

| o que o app deles mostra | onde vive na API | estado |
|---|---|---|
| Passos, calorias activas, minutos activos | `measure getactivity` | ✅ chega |
| Frequência média + curva do dia | `v2/measure getintradayactivity` | ✅ chega (`intradayDays: 1` medido) |
| SpO₂ pontual · Temperatura · Pressão · Peso · Altura | `measure getmeas` | ✅ chega |
| **Conclusão** do ECG (sinusal / FA / não classificável) | `v2/heart list` → `ecg.afib` | ✅ chega |
| **Traçado do ECG + Play** | `v2/heart get` → `signal` | ⚠️ vazio sem erro |
| Hipnograma: Awake / REM / Light / Deep | `v2/sleep get` | ⚠️ vazio sem erro |
| Duração do sono | `v2/sleep getsummary` | ✅ chega |
| **Frequência durante a noite** (curva, média 55) | `v2/sleep get` → `hr` | ⚠️ por medir |
| **HRV 14 ms** | `v2/sleep getsummary` → `rmssd`/`sdnn` | ❌ nunca apareceu |
| **Frequência respiratória 12 rpm** | `v2/sleep getsummary` → `breathing_*` | ❌ nunca apareceu |
| **SpO₂ do sono 96%** (média da noite) | `v2/sleep getsummary` | ❌ nunca apareceu |
| Treinos | `v2/measure getworkouts` | ⚠️ vazio sem erro |
| **Sleep Quality Score 47** | — | é pontuação **deles** |
| **Readiness, Recovery, Effort** | — | é pontuação **deles** |
| **Health Improvement Score** | — | Withings+, do consumidor |
| Depth *Good* · Regularity *Poor* · Interruptions *None* | — | julgamentos **deles** |
| Target zones (500–3100 passos, 7h de sono) | — | metas deles; **as nossas são do paciente** |
| "How do you feel today?" (cinco caras) | — | já temos: *Daily check-in* |
| HydroStatus e as 7 métricas nutricionais | — | exigem o **U-Scan**, que não há |
| Cardio Check-Up (cardiologista em 24h) | — | serviço clínico **deles** |

## O artefato que o Bruno quer, visto de perto (02/10, 06:00)

Ele mandou o **PDF do ECG** gerado pelo app da Withings. É o alvo, e vale
descrevê-lo com precisão porque é ele que define o que a T-1 tem de encontrar:

- cabeçalho **WITHINGS**, nome, *"Age: 48 years, Biological Sex: Male"*;
- *"Average heart rate: 63 BPM"* e *"Sinus Rhythm"* com o ponto verde;
- *"Done on Thursday, 1 October 2026 at 23:54 | Duration of 30 seconds | Left
  wrist"*;
- **três faixas do traçado** em papel milimetrado;
- rodapé técnico: *"Scale: 25mm/s, 10mm/mV, Lead DI, Enhanced Filter, Main
  filter, Measurement coming from Withings ScanWatch 2, Withings 26.40.0"*.

**Tudo isto, menos o traçado, nós já temos.** A frequência, a conclusão, o
instante, o aparelho — está no `EcgRecording` desde a 119 T-2. O que falta é
exactamente uma coisa: **as amostras**. Se a T-1 disser que `v2/heart get`
devolve o sinal, o PDF é montável; se não devolver, não é, e nenhuma outra parte
do plano muda.

A escala do rodapé não é decoração: **25 mm/s e 10 mm/mV é a convenção com que
um médico lê um ECG**. Um traçado desenhado sem ela é um gráfico bonito que não
se mede com régua — e quem recebe o papel mede.

### E o que **não** vamos copiar daquele ecrã

O *Cardio Check-Up* — *"Your ECG has been reviewed by a cardiology technician"*,
com um médico nomeado e resultado em 24h — é um **serviço clínico deles**, com
profissional contratado por eles. Não é software; é um consultório. Fora do
nosso âmbito, e dizê-lo agora evita que entre na lista por imitação.

O *disclaimer* deles, porém, é um bom modelo e está alinhado com a nossa regra:
*"for self monitoring purposes only and should not be considered as medical
diagnosis"*. Ver [[feedback_nunca-dizer-diagnostico]].

## O que medir, e como

Uma rota de sondagem, protegida pelo mesmo segredo do cron — assim corre em
produção **sem sessão**, que é o que impede de a medir hoje. Para cada chamada,
regista os três desfechos, que não se confundem:

1. **Veio** — com quantos valores e um exemplo;
2. **Vazio sem erro** — o caso ambíguo, e o que esta tarefa existe para separar;
3. **Erro explícito** — com `status` e mensagem da Withings.

E cada chamada **no seu próprio `try`**. Já perdemos três de uma vez por
partilharem um.

O resultado sai no log do contentor, que se lê pela API do Coolify, e numa
tabela nesta pasta — com data, porque a resposta pode mudar no dia em que a
assinatura mudar.

## Passos

1. `lib/withings-sondagem.ts` — uma função por biomarcador, cada uma devolvendo
   `{ veio, quantos, exemplo, vazio, erro }`. Sem escrever nada no banco.
2. `app/api/cron/wearables-probe/route.ts` — o mesmo segredo do cron, recebe um
   `userId`, corre a sondagem e devolve a tabela.
3. Correr para o Bruno **antes** do teste do Withings+. Guardar o resultado.
4. O Bruno activa os 14 dias. Correr outra vez, 24h depois (a Withings calcula
   as métricas da noite de madrugada).
5. Escrever a tabela comparativa em `qa/o-que-a-api-devolve.md`.

## Critérios de aceite

- [ ] Cada biomarcador da tabela acima tem um dos três desfechos, **medido**
- [ ] Nenhuma chamada partilha `try` com outra
- [ ] A sondagem **não escreve** nada no banco — é uma pergunta, não uma sincronização
- [ ] Corre em produção sem sessão de utilizador, com o segredo do cron
- [ ] Respeita o espaçamento de 11s por conta (o `601` é dedupe, não limite)
- [ ] O resultado fica escrito com a data, porque a resposta muda quando o plano muda
- [ ] Antes e depois do teste gratuito, e a diferença é a resposta
