# T-8: As três decisões em aberto

**Status:** concluído (decidido em 02/10/2026)
**Depende de:** nenhuma (é conversa antes de código)

---

## ✅ Decidido — 02/10/2026

Bruno, respondendo ao plano com as quatro perguntas abertas: **"aprovado
tudo."**

Leitura adotada, pergunta por pergunta. **Se alguma estiver errada, é só
dizer — nenhuma virou código ainda.**

| pergunta | decisão |
|---|---|
| 1. Crise de pressão continua sendo exceção? | **Sim, fica.** O envio automático em crise permanece. O risco de assinatura do webhook vira atividade separada. |
| 2. Lista de espera continua automática? | **Sim, fica.** A vaga perde valor em horas; enfileirar perderia a vaga. |
| 3. Fan-out de broadcast disparado por paciente? | **Tirar.** É defeito. O agendamento continua; quem dispara passa a ser o cron ou o botão. |
| 4. Destino da oferta de plano (`MEMBERSHIP_OFFER`)? | **Botão dele.** Sai do handler do protocolo e vira envio manual como todo o resto — é a leitura coerente com a regra inteira desta atividade. |
| extra. Crons: trava simples ou fila? | **Trava simples** (passo 1 da T-6). A fila fica registrada como opção futura, não some. |

Também confirmadas por "aprovado tudo" as suposições 4, 5 e 6 do
`plan.md`: Command Center passa a só enfileirar; teto de 5/h somando todos
os canais; e push conta como envio.

**Fica em aberto, por ser segurança e não política de envio:** a assinatura
do webhook da Withings (ver abaixo). Precisa de atividade própria.

---

## Objetivo

Três envios automáticos ao paciente estão **ligados hoje** em produção e
não são defeito óbvio. Cada um precisa da palavra do Bruno — não de
conserto presumido.

Esta tarefa existe para que a decisão fique escrita. Sem isso, alguém
"consertando" no futuro quebra algo que foi aprovado de propósito.

## Contexto e a pergunta de cada um

### 1. Alerta de crise de pressão arterial

`app/api/wearables/withings/webhook/route.ts:138` → `lib/bp-alerts.ts:78`.

A medição chega da Withings sozinha. Se for crise (`if (isCrisis)`,
limiares em `AutomationRule BP_THRESHOLDS`), o paciente recebe e-mail,
WhatsApp ou SMS mandando procurar atendimento. Sem humano no circuito.

O código diz que isso foi aprovado — `bp-alerts.ts:28-30`:

> "The patient is written to only in a crisis. That exception is the one the
> clinic approved."

**Clinicamente defensável**: esperar aprovação humana para mandar alguém ao
pronto-socorro é pior que mandar sozinho.

**Pergunta:** confirma que esta exceção continua?

**Risco separado, independente da resposta:** o webhook **não verifica
assinatura**. Comentário na linha 27: *"No shared secret to verify. Withings
does not sign the body."* O único gate é a conexão existir e estar
`CONNECTED`. Quem descobrir a URL pode fabricar uma leitura e fazer o
sistema mandar um paciente ao hospital. Isto é segurança, não política de
envio — merece atividade própria.

### 2. Lista de espera

`lib/waitlist.ts:49`, acionado por `app/api/appointments/[id]/route.ts:309`.

Quando uma consulta é cancelada — **inclusive pelo próprio paciente, de
madrugada, sem ninguém da clínica por perto** — até 5 pessoas da lista de
espera recebem aviso. Gates: `status: "ACTIVE"`, match de tipo/terapeuta/
janela, e `MAX_NOTIFIED_PER_SLOT = 5`.

**A favor de manter:** vaga de última hora perde valor em horas. Enfileirar
para aprovação pode significar perder a vaga.

**Contra:** é envio em massa disparado por ação de terceiro.

**Pergunta:** fica automático, ou enfileira e você solta?

### 3. Fan-out de broadcast disparado por paciente

`lib/broadcast-dispatch.ts:54`, acionado por
`app/api/patient/messages/route.ts:32`:

```ts
await dispatchDueBroadcasts().catch(() => {});
```

**Um paciente abrindo o chat dispara o envio dos broadcasts agendados para
todos os pacientes do tenant.** O gate é só `status: "scheduled"` e
`scheduledFor <= now` — alguém da clínica de fato agendou. Mas quem aperta
o gatilho é a visita de um paciente qualquer.

Efeitos: a hora real do disparo depende de alguém abrir o chat; o envio
roda dentro do pedido de um paciente; e o `.catch(() => {})` engole
qualquer falha sem log.

**Este é o único dos três que parece defeito, não decisão.** A proposta é
tirar daí e deixar o disparo com o cron ou com o botão.

**Pergunta:** concorda em tirar?

### 4. E a oferta de plano? (vem da T-5)

O `MEMBERSHIP_OFFER` sai do handler do protocolo na T-5. **Para onde?**
Botão próprio na ficha, fila para você soltar, ou deixa de existir?

## Passos

1. Levar as quatro perguntas ao Bruno, juntas, numa conversa só.
2. Escrever a resposta de cada uma **neste arquivo**, com data e a frase
   dele.
3. Transformar em tarefa nova só o que exigir código.
4. Atualizar a seção Suposições do `plan.md`, trocando o que foi adivinhado
   pelo que foi decidido.

## Arquivos afetados

- este arquivo (as respostas)
- `specs/104-nada-sai-sem-confirmacao/plan.md` (Suposições)

## Critérios de aceite

- [ ] As quatro perguntas respondidas, com a frase dele registrada.
- [ ] Nenhuma das quatro continua como suposição no `plan.md`.
- [ ] O risco de assinatura do webhook da Withings virou atividade própria
      ou foi registrado como aceito, com data.
- [ ] O que exigir código virou t-N nova, não ficou solto nesta.
