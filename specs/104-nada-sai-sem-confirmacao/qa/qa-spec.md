# QA — Atividade 104

## A regra desta spec de QA

O cenário que importa aqui é **negativo**: *aperto o botão e nada sai*.
Tela verde não prova nada — ela sempre fica verde, porque a ação principal
funciona. A prova é contagem.

### Como provar que não saiu

Antes e depois de cada chamada, contar nas quatro superfícies:

```sql
SELECT count(*) FROM "PatientOutboundEmail" WHERE "patientId" = $1;
SELECT count(*) FROM "OutboundMessage"      WHERE "patientId" = $1;
```

mais, no log do processo:
- nenhuma linha `[OUTBOUND-SINK]` nova (ambiente de teste descarta e
  **registra** — se aparecer linha, o envio foi tentado);
- nenhuma linha do portão do T-1 com veredito "passou".

**Um cenário de "não enviou" só passa com as quatro medidas iguais antes e
depois.** Se qualquer uma mexeu, falhou — mesmo que nenhum e-mail tenha
chegado, porque em produção teria chegado.

### Paciente de teste

Nunca usar paciente real. Criar/usar o paciente de teste identificado, com
e-mail que não é de ninguém. Não logar como paciente real em hipótese
alguma.

### Ambiente

Rodar em local (`NODE_ENV=development`), onde `lib/outbound-guard.ts`
descarta tudo e registra. Repetir os cenários 1, 8 e 19 em produção com o
paciente de teste, porque é lá que o portão está aberto.

---

## T-1 — O portão único

| # | tipo | passos | esperado |
|---|---|---|---|
| 1 | API | chamar `podeEnviarAoPaciente` sem campo `confirmacao` | `{ ok: false }`, código de recusa; nada registrado como "passou" |
| 2 | API | `confirmacao: { modo: "explicito", confirmado: false }` | recusa |
| 3 | API | `confirmacao: { modo: "explicito", confirmado: true }` | `{ ok: true }` |
| 4 | API | `modo: "preview"` com `hash` que não bate | recusa 409 |
| 5 | API | 6 envios na mesma hora para o mesmo paciente, canais diferentes | o 6º recusa 429 e diz quantos saíram |
| 6 | API | qualquer recusa | linha de log com `origem`, canal e `patientId` |
| 7 | mutação | inverter o default do portão para "manda" | o teste do cenário 1 **tem de ficar vermelho**; se continuar verde, o teste não testa nada |

## T-2 — Command Center

| # | tipo | passos | esperado |
|---|---|---|---|
| 8 | API | pedir ao chat "manda um WhatsApp para a \<paciente de teste\>" | **nada sai** (as 4 medidas); 1 linha nova em `OutboundMessage` pendente |
| 9 | API | mesmo pedido com nome que casa com 2+ pacientes | devolve candidatos, não escolhe, não enfileira envio |
| 10 | UI | ler a resposta do chat no cenário 8 | não diz "enviado"/"sent"; diz que ficou na fila e dá o link |
| 11 | API | `send_email` pelo chat | mesma coisa: enfileira, não envia |
| 12 | código | grep no diff por `sendAIWhatsAppMessage` e `sendEmail` em `command-chat/` | nenhuma ocorrência |

## T-3 — Defaults invertidos

| # | tipo | passos | esperado |
|---|---|---|---|
| 13 | API | `POST /api/admin/broadcasts` **sem** `notify` no corpo | broadcast criado, **nada sai** |
| 14 | API | mesma rota com `notify: true` | sai (não trocar um defeito por outro) |
| 15 | API | `POST /api/admin/appointments` com `sendConfirmation: false` e `paymentMode: "online"` | consulta criada, **nada sai** |
| 16 | API | mesma rota sem `sendConfirmation` | nada sai (o default passa a ser não mandar) |
| 17 | API | `POST /api/admin/email-test` com `patientId` do paciente de teste | não escreve para o paciente |
| 18 | UI | ler os rótulos das três telas | nenhum botão diz "simular"/"testar" para algo que sai |

## T-4 — Os botões

Repetir o **mesmo par** de cenários para cada uma das dez rotas da tabela
do T-4. Dez pares, não uma amostra — o ponto da tarefa é que nenhuma fique
para trás.

| # | tipo | passos | esperado |
|---|---|---|---|
| 19 | API | chamar a rota **sem** `notify` | a ação acontece; **nada sai**; resposta traz `notified: false` |
| 20 | API | chamar com `notify: true` | a ação acontece **e** sai |
| 21 | UI | abrir a tela de cada uma | a caixa "avisar o paciente" existe e nasce **desmarcada** |
| 22 | API | `patient-tasks` com 3 `targetIds` e `notify: true` | 3 pares e-mail+push, nem mais nem menos |
| 23 | API | `articles/[id]/notify` | devolve a contagem **antes**; a UI repete o número na confirmação |
| 24 | API | `packages` POST (nasce `DRAFT`) | não avisa, nem com `notify: true` — o aviso é da transição de status |
| 25 | API | `exercise-submissions/review` com nota vazia | a opção de avisar nem é oferecida |
| 26 | UI | **reproduzir o caso da Ana Lívia de 02/10 pela tela**: prescrever 8 exercícios sem avisar | os 8 entram; nada sai; não foi preciso tocar no banco |

## T-5 — Upsell e marca

| # | tipo | passos | esperado |
|---|---|---|---|
| 27 | API | marcar um protocolo como `COMPLETED`, medir por **30 segundos** | sai no máximo o que foi confirmado; nenhum `MEMBERSHIP_OFFER` |
| 28 | código | grep por `setTimeout` perto de envio ao paciente | nenhuma ocorrência |
| 29 | UI | enviar o relatório de avaliação corporal e abrir o e-mail | tem logo BPR e usa o template do produto |
| 30 | código | grep por HTML inline em rotas que mandam ao paciente | nenhuma monta o corpo à mão |

> O cenário 27 mede 30s de propósito: o defeito atual dispara em 5s, depois
> da resposta da rota. Medir logo após a chamada deixaria passar.

## T-6 — Crons

Quatro rotas, um par cada.

| # | tipo | passos | esperado |
|---|---|---|---|
| 31 | API | `GET /api/cron/<rota>?key=<cronSecret>` com a variável desligada | `{ disabled: true }`; **nada sai** |
| 32 | API | mesma chamada com a variável ligada em ambiente de teste | volta a funcionar (a trava não pode ser código morto) |
| 33 | API | mesma chamada com `key` errada | 401, como hoje |
| 34 | código | ler o comentário de `lib/notify-patient.ts:51-61` | descreve a trava que existe, não um risco aberto |

## T-7 — A tela

| # | tipo | passos | esperado |
|---|---|---|---|
| 35 | UI | mandar um de cada canal e abrir a tela | os 5 aparecem com data, canal, assunto e autor |
| 36 | UI | provocar uma recusa do portão e abrir a tela | aparece marcado como **barrado**, com motivo |
| 37 | UI | clicar num envio | abre o corpo do que foi mandado |
| 38 | UI | comparar com a lista de rotas do grupo A, uma a uma | nenhuma fica fora da tela |
| 39 | UI | abrir no telefone (390px) | legível, sem rolagem horizontal |

## T-8 — Decisões

| # | tipo | passos | esperado |
|---|---|---|---|
| 40 | doc | ler `t-8-tres-decisoes-em-aberto.md` | as 4 perguntas respondidas, com data e a frase do Bruno |
| 41 | doc | ler a seção Suposições do `plan.md` | nenhuma das 4 continua como suposição |

---

## Varredura final (a que vale mais que todas)

| # | tipo | passos | esperado |
|---|---|---|---|
| 42 | código | `grep -rn "notifyPatient\|sendEmail\|sendPush" app/api/admin/ --include=*.ts`, e para cada ocorrência abrir o trecho | **toda** chamada passa pelo portão do T-1 ou está na lista do grupo C |
| 43 | código | repetir fora de `app/api/admin/` | só sobram os transacionais do próprio paciente e as 3 exceções decididas no T-8 |

O cenário 42 é o único que impede a atividade de ser "consertei o que a
varredura achou em 02/10". Rota nova escrita depois disso tem de aparecer
aqui.

## Evidências

Screenshots em `qa/screenshots/`. Para os cenários de contagem, guardar o
antes/depois em texto — número isolado não prova nada.
