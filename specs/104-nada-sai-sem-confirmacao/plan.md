# Atividade 104 — Nada sai para o paciente sem confirmação

**Status:** aprovado em 02/10/2026 ("aprovado tudo") — pronto para executar
**Aberta em:** 02/10/2026

> **Escopo:** só o web/painel, neste checkout (`main`). O app mobile é de
> outra frente (`brunoto02028/app_clinic`); achado de lá se alerta, não se
> executa. Se um conserto aqui pedir mudança na tela do app, vira recado
> para aquela branch.

## O pedido

> "nenhum botao é pra disparar na hora sem minha confirmação ok? Faz uma
> revisao disso" — Bruno, 02/10/2026

Isto **amplia** a regra de 17/09/2026, que até agora era aplicada só a
tarefa agendada:

> "regra, nunca enviar nada a ninguem sem eu apertar o botao, pois nao sei
> onde fica registrado os envios. So vamos automatixar depois de no
> dashboard da paciente eu ter um local para ver e acompanhar tudo."

O que mudou é o alvo: não é só o cron. É o **botão do painel** que manda
como efeito colateral de outra coisa.

## O caso que motivou

Na manhã de 02/10, ao repor oito exercícios na ficha da Ana Lívia, foi
preciso **escrever direto no banco** em vez de usar a rota do produto —
porque `POST /api/admin/exercise-prescriptions` chama `notifyPatient` no
fim do handler, sem condição. Prescrever é ato clínico de bastidor; o
botão mandava e-mail na hora.

Se a ferramenta obriga a contornar a si mesma para ser usada com
segurança, o defeito é da ferramenta.

## O que a varredura achou

Duas frentes, lidas linha a linha (não por nome de arquivo). **25 rotas
do painel** chamam `notifyPatient`.

| grupo | quantos | o que é |
|---|---|---|
| **A** — botão que manda sem opt-in | 13 | o coração do problema |
| **B** — default invertido (opt-out) | 3 | manda por omissão |
| **C** — já conformes | 6 | são a referência, não mexer |
| **D** — fora do painel | — | risco estrutural nos crons |

### Grupo A — manda sem opt-in, do mais surpreendente ao menos

| # | arquivo:linha | o que o clique parece ser | o que também faz |
|---|---|---|---|
| 1 | `command-chat/actions/route.ts:624` | conversar com o assistente | **WhatsApp escrito por IA**, paciente achado por `contains` de nome |
| 2 | `command-chat/actions/route.ts:501` | conversar com o assistente | e-mail para endereço arbitrário, corpo do LLM |
| 3 | `patients/[id]/packages/route.ts:126` | criar pacote (nasce `DRAFT`) | cobra `PACKAGE_READY_TO_PAY` de um rascunho interno |
| 4 | `patients/[id]/protocol/route.ts:590` | concluir tratamento | e-mail de **venda** 5s depois, via `setTimeout` |
| 5 | `patients/[id]/documents/route.ts:99` | anexar documento ao prontuário | vibra o celular, inclusive em `ADMIN_UPLOAD` |
| 6 | `exercise-submissions/[id]/review/route.ts:76` | marcar vídeo como revisado | push "seu Terapeuta respondeu" mesmo sem resposta |
| 7 | `patient-tasks/route.ts:157` e `:183` | criar tarefa interna | e-mail **e** push, um par por paciente do laço |
| 8 | `exercise-prescriptions/route.ts:330` | prescrever exercícios | `EXERCISES_PRESCRIBED` — **o caso que motivou** |
| 9 | `patients/[id]/questions/route.ts:68` | montar as perguntas | envia na hora, não existe rascunho |
| 10 | `protocols/[id]/assign/route.ts:201` | atribuir protocolo-modelo | avisa o paciente |
| 11 | `memberships/route.ts:120` | criar plano | avisa o paciente |
| 12 | `body-assessments/[id]/send-to-patient/route.ts:116` | enviar relatório | HTML inline, **sem logo nem template** |
| 13 | `articles/[id]/notify/route.ts:35` | notificar sobre o artigo | blast para toda a lista, sem contagem |

### Grupo B — o default manda

- `broadcasts/route.ts:103` — `notify` nasce **`true`**. Quem não desmarcar,
  manda para todos. (O push, linha 109, nasce `false` — esse está certo.)
- `appointments/route.ts:94` — `emailPatientNow = paymentMode === "online" ||
  sendConfirmation !== false`. Sai por omissão, e pagamento online sai
  **mesmo com `sendConfirmation: false`**.
- `email-test/route.ts:50/73/105` — botão rotulado "simular e-mail" que,
  recebendo `patientId`, manda e-mail **de verdade para o paciente real**.
  O rótulo mente.

### Grupo C — a referência

`patients/[id]/email/send` (preview + `hash` + teto de 5/h), `meal-plans`
POST e PUT (`notifyStudent === true`), `email/route.ts:272` `approveSend`
(claim atômico), `invoices/[id]/queue` (só enfileira),
`lib/notifications/patient-notifications.ts:79` (desligado de propósito),
`articles/[id]/route.ts:137` (`notifySubscribers === true`).

Não mexer em nenhum. São o desenho a copiar.

### Grupo D — o risco estrutural

`lib/outbound-guard.ts:16-20` é o portão global e **nenhum caminho escapa
dele**: fora de produção tudo é logado e descartado. Está certo. Não mexer.

O problema é outro: **os quatro crons de lembrete não têm trava nenhuma em
código**. Em `appointment-reminders`, `exercise-reminders`, `bp-reminders`
e `onboarding-reminder`, o único `return` antecipado é o 401 do
`cronSecret`. O que os desliga é a *scheduled task* do Coolify estar off
desde 17/09. **Religar um botão no painel do Coolify volta a mandar sem
mudar uma linha.** A política mora fora do repositório e em comentários —
`lib/notify-patient.ts:51-61` diz isso com todas as letras.

Contraste: `daily-adherence` tem três camadas (o split de 17/09,
`clinic.dailyRemindersEnabled @default(false)`, e a fila com aprovação).
Os outros três não têm nenhuma.

E há **três envios automáticos ligados hoje** que não são defeito óbvio e
precisam de decisão, não de conserto presumido (ver T-8).

## Reconferência depois do merge (02/10, à tarde)

A varredura rodou com o `main` local **229 commits atrasado**. Ao trazer o
remoto, duas coisas mudaram — as duas a favor:

1. **Metade do portão do T-1 já existe.** `pediramEnviarAoPaciente`
   (`lib/notify-patient.ts:87`) faz exatamente o "só um sim explícito
   envia", com o comentário explicando que um `!== false` já escorregou
   antes. Está usada em **duas** rotas. A T-1 deixa de ser inventar e passa
   a ser espalhar.
2. **O `appointments` do grupo B já foi consertado** por outra sessão — o
   `|| paymentMode === "online"` sumiu. Sai do escopo da T-3.

Reconferidos um a um contra o código novo, **os treze do grupo A continuam
abertos** e nenhum usa o guard. `broadcasts` continua com `notify = true`
na linha 103. As linhas citadas neste plano andaram ~3 posições; os
arquivos são os mesmos.

## Os três formatos de conserto

Não inventar um quarto. Cada rota do grupo A recai num destes:

| formato | quando usar | modelo no código |
|---|---|---|
| **preview + hash** | texto livre, que o Bruno precisa ler antes | `patients/[id]/email/send/route.ts` |
| **`notify: true` explícito** | mensagem de template, conteúdo previsível | `meal-plans/route.ts:42` |
| **fila com aprovação** | massa, ou gerado por IA | `lib/automation/outbox.ts` |

A regra do formato barato: **ausência de `notify` significa não mandar.**
Nunca o contrário.

## Decisões de desenho

1. **Um contrato, não treze consertos.** T-1 cria o portão único. As
   rotas passam a chamá-lo; nenhuma decide sozinha.
2. **O padrão é o silêncio.** Rota que não recebeu confirmação explícita
   não manda — e responde dizendo que não mandou, para a tela não mentir.
3. **Quem resolve destinatário por nome não manda.** Busca por `contains`
   de nome pode acertar outra pessoa. Vale para o Command Center.
4. **A política vai para o código.** Não basta a task do Coolify estar
   desligada: o cron precisa recusar sozinho.
5. **Separar "enviar" de "registrar".** Prescrever, anexar, criar tarefa
   e atribuir protocolo são atos internos. O aviso é um segundo ato.

## Tarefas

| T-N | nome | status |
|---|---|---|
| T-1 | O portão único de envio ao paciente | **concluído** (02/10) |
| T-2 | O Command Center para de enviar | implementado, QA pendente |
| T-3 | Defaults invertidos e o rótulo que mente | implementado, QA pendente |
| T-4 | Os treze botões passam a pedir confirmação | 1 de 10 rotas (prescrição); resto pendente |
| T-5 | O upsell automático e o e-mail sem marca | pendente |
| T-6 | Trava em código nos quatro crons | pendente |
| T-7 | A tela única de tudo que saiu | pendente |
| T-8 | As três decisões em aberto | **concluído** (02/10) |

Ordem: T-1 primeiro (todas dependem dele). T-2 e T-3 em seguida, que são
os de maior risco por menor esforço. T-8 pode correr em paralelo, porque é
conversa antes de código.

## Suposições

**Resolvidas em 02/10/2026** — Bruno respondeu "aprovado tudo" às quatro
perguntas abertas. As decisões estão na T-8, com a leitura adotada de cada
uma. O que segue abaixo é o raciocínio que levou a cada proposta; vale como
registro do porquê, não como pergunta pendente.

1. **O alerta de crise de pressão continua sendo exceção.**
   `lib/bp-alerts.ts:28-30` diz que a clínica aprovou esse envio sem humano
   no circuito, e clinicamente faz sentido — esperar aprovação para mandar
   alguém ao pronto-socorro é pior. **Assumido: fica como está.** Risco
   separado, não resolvido aqui: o webhook da Withings **não verifica
   assinatura** (`route.ts:27`, "Withings does not sign the body"), então
   qualquer um que descubra a URL pode fabricar uma crise.

2. **A lista de espera continua automática.**
   `lib/waitlist.ts:49` avisa até 5 pessoas quando alguém cancela —
   inclusive quando quem cancela é o próprio paciente, sem staff na sala.
   **Assumido: fica**, porque a vaga perde valor em horas. Alternativa, se
   ele quiser: enfileirar e ele solta.

3. **O fan-out de broadcast disparado por paciente é defeito.**
   `app/api/patient/messages/route.ts:32` chama `dispatchDueBroadcasts()`:
   **um paciente abrindo o chat dispara o envio em massa** para todos os
   pacientes do tenant. **Assumido: tirar daí.** O agendamento continua, mas
   quem dispara é o cron ou o botão, nunca a visita de um paciente.

4. **O Command Center passa a só enfileirar.**
   **Assumido:** as ações `send_email` e `send_whatsapp` do chat deixam de
   enviar e passam a criar linha na outbox, que o Bruno aprova. Se ele
   quiser manter o envio direto, é decisão dele — mas então a resolução de
   paciente por nome tem de sair de qualquer jeito.

5. **Teto de envio por paciente.** O painel de e-mail usa 5/hora
   (`MAX_PER_HOUR`). **Assumido:** o portão do T-1 aplica o mesmo teto a
   todos os canais somados, não 5 por canal.

6. **Push conta como envio.** **Assumido: sim** — vibrar o celular do
   paciente é mandar mensagem. Hoje push e e-mail moram em arquivos
   separados de propósito (`lib/push-notify.ts:5-14`), e o portão precisa
   cobrir os dois.

7. **O que não muda:** transacional disparado pelo próprio paciente
   (cadastro, login, triagem, consentimento, upload, remarcação, webhook do
   Stripe). O humano no circuito é ele.

## O que esta atividade NÃO cobre

- Reativar qualquer automação. A precondição continua sendo a tela do T-7.
- A assinatura do webhook da Withings (risco de segurança separado).
- O painel do personal/aluno — `meal-plans` já está conforme.
