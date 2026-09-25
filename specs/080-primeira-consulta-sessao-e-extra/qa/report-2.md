# Re-QA — atividade 080 (rodada 2)

**Data:** 25/09/2026 · **Commit medido:** `b573b926` · **Alvo:** `http://localhost:4085`, este
worktree (`NEXT_DIST_DIR=.next-qa081`, `OUTBOUND_MODE=sink`).

Porta confirmada antes de medir: um marcador escrito no `public/` deste checkout respondeu na
:4085 e deu 404 na :4000, que está com outro checkout. **Nada saiu para a Stripe** — chave falsa só
para o SDK construir, eventos assinados com HMAC local. Zero DDL; 29 usuários, 2 clínicas, 32
consultas, 6 janelas, 4 exceções e 3 pacotes `qa081-*` criados e removidos.

## Veredito: reprovado — e por algo que as correções trouxeram junto

**Os nove defeitos da rodada 1 estão corrigidos, e todos foram medidos contra o servidor.** O que
reprovou foi o efeito colateral.

| # | rodada 1 | rodada 2 |
|---|---|---|
| 1 | o enum que não existe neste modelo | corrigida e medida |
| 2 | nenhuma exceção podia ser criada | corrigida e medida (API e tela) |
| 3 | exceção caía um dia antes no horário de verão | corrigida na API; **voltou com o servidor em UTC** → N1 |
| 4 | janela nova perdia para o "not working" antigo | corrigida e medida (efeito colateral → N6) |
| 5 | folga do terapeuta perdia para a da clínica | corrigida e medida |
| 6 | apagar consulta deixava o contador mentindo | corrigida e medida |
| 7 | webhook confirmava consulta de qualquer clínica | corrigida no app, **inerte na web** → N2 |
| 8 | o paciente confirmava a própria consulta | corrigida quando exige pagamento; **não na fatura** → N5 |
| 9 | `treatmentType` vinha do cliente | corrigida e medida |
| extra | janela e capacidade só na tela | corrigida e medida — e é o que N1 quebrava em produção |

## As falhas novas — todas corrigidas depois deste relatório

### N1 · bloqueador — a agenda andava um dia, e a hora, fora de `Europe/London`

A correção da falha 3 trocou `toISOString()` por leitura **local**, e local é o fuso do
**servidor**. Produção roda em UTC: o `Dockerfile` usa `node:20-alpine` e não define `ENV TZ`.

Medido num segundo servidor com `TZ=UTC`, mesmo commit e mesmo banco:

```
# segunda 2026-10-05 — janelas de segunda: CONSULTATION 09–12, TREATMENT 14–18
Europe/London  slots: ['15:00','16:00','17:00']
UTC            slots: ['10:00','11:00']          ← a janela de DOMINGO

# terça com exceção `closed`
UTC            slots: ['11:00','14:00', …]       ← dia aberto; a exceção caiu na segunda

# POST no servidor UTC
09:00 de Londres — horário REAL da janela   409 slot_unavailable   ← recusa o certo
12:00 de Londres — FORA da janela           200 criado             ← aceita o errado
```

**Corrigido pela raiz:** a agenda passou a falar em **data escrita** (`"YYYY-MM-DD"`) e minutos do
fuso da clínica, e não lê o relógio do processo em lugar nenhum. O dia da semana sai da própria
string; as bordas do dia saem de `zonedTimeToUtc`; a ocupação usa `getZonedMinutesOfDay`, como a
rota antiga já fazia. Coberto por dois testes que não dependem do fuso da máquina.

### N2 · alta — a guarda do webhook não valia para o pagamento da web

A guarda era condicional (`...(metaPatientId ? { patientId } : {})`), e dos dois produtores de
metadata só o do app escrevia `patientId`. Todo pagamento feito pelo site gerava evento sem
checagem de dono.

**Corrigido nos dois lados:** a rota de pagamento da web passou a escrever `patientId`, e a guarda
deixou de ser condicional — quando o metadata não traz o paciente, ele é lido da própria consulta
e comparado.

### N3 · média — o painel de exceções ignorava o terapeuta selecionado

Com "Diary of: ther-a" selecionado, a exceção era gravada para a **clínica toda**. E a lista trazia
as exceções de todos sem dizer de quem eram: um clique em "Remove" apagou a folga de outro
terapeuta, que voltou a ser marcável.

**Corrigido:** o corpo leva o terapeuta selecionado, cada linha diz de quem é ("clínica toda" ou o
nome), e o texto da seção diz o que vale conforme a agenda escolhida.

### N4 · média — a tela da web prometia um preço e o servidor cobrava outro

Ela lia `service-prices` e mostrava sempre CONSULTATION; nunca chamou `booking-options`. Paciente
em tratamento via £88,50 e era cobrado £44,25.

**Corrigido:** a tela da web passou a ler a mesma porta que o servidor usa para gravar, e mostra
sessão do pacote, primeira consulta ou sessão extra, com o preço certo e se é paga agora ou na
fatura.

### N5 · média — o interruptor da sessão extra mudava o flag, não a consulta

Com `INVOICE` (o padrão) a sessão nascia `PENDING` + `ONLINE`, indistinguível de uma esperando
pagamento, e só o webhook confirmaria — que nunca viria. E como `requiresPayment` era falso, o
corpo do cliente voltava a decidir o status.

**Corrigido:** quem marca pelo app tem status e forma de pagamento decididos pelo servidor. A
sessão faturada nasce confirmada e `IN_PERSON`, porque não existe Checkout para ela.

### N6 · média — configurar uma janela fechava o resto da semana

`hasConfiguredSchedule` contava janelas **do terapeuta**, não do dia: criar uma janela de sábado
apagava a segunda inteira de quem tinha a agenda antiga, em silêncio — e o aviso da tela sumia
exatamente quando o risco começava.

**Corrigido:** a decisão é por dia. A migração passa a ser gradual: o dia configurado vale, o resto
continua como estava.

### N7 · baixa — a exceção aceitava `therapistId` de outra clínica

A rota irmã das janelas validava o dono; esta não. **Corrigido**, com a mesma checagem.

### N8 · baixa — o horário ficava preso antes do pagamento

`PENDING` contava como ocupação para sempre: um Checkout abandonado bloqueava a vaga
indefinidamente, contra o que o plano diz.

**Corrigido:** uma consulta pendente segura o horário por 30 minutos — o tempo de pagar. Passado
isso, a vaga volta.

### N9 · pendências da rodada 1

`userEmail: ""` na auditoria **corrigido** (grava o e-mail de quem autorizou). Dia encurtado sem
`startTime` agora aparece como "até 12:00" em vez de "—–12:00".

## O que a rodada 1 não conseguiu medir, e agora foi medido

| cenário | resultado |
|---|---|
| preço do `ServicePrice` nas três portas | primeira consulta 88,50 · sessão do pacote 0 · extra 44,25 |
| `extraSessionPayment` muda `requiresPayment` | sim no flag; a consulta gravada era idêntica → N5 |
| pacote vencido não oferece sessão | `endDate` ontem, 5 sessões sobrando → `EXTRA_SESSION` |
| a 4ª sessão de um pacote de 3 | as três saem do pacote; a quarta vira extra, 44,25, sem vínculo |
| pacote de outra clínica fora da conta | paciente da A com pacote da B → `EXTRA_SESSION` |
| `price: 0.30` e `treatmentType` forjados | gravado 88,50 e "Initial Consultation" |
| capacidade no servidor | a 5ª pessoa num horário de 4 → 409 `slot_unavailable`; o horário some da oferta |
| fora de janela | domingo 03:00 → 409; janela de tipo errado → 409; a clínica continua marcando fora |
| cortesia e isenção | `PACKAGE_SESSION` ligada ao pacote, contador 2→3, auditoria com autor e motivo |
| tenant no caminho novo | tudo recusado com 404, exceto a exceção aceitar terapeuta de fora → N7 |

## O que não foi medido, e por quê

| item | motivo |
|---|---|
| T-3 inteira (a tela do app) | app nativo, exige iPhone |
| Checkout criando sessão real na Stripe | proibido; as recusas passaram na rodada 1 |
| N1 em produção | medido na forma do container (`TZ=UTC`), não em produção. Depois do deploy, dá para confirmar num `GET /api/availability` de uma segunda-feira |
| corrida de capacidade com mais de uma instância | 4 POST simultâneos num horário de capacidade 1 deram 1 criação e 3×409, mas é um processo Node só, que serializa. O código é ler-depois-escrever, sem transação nem índice único: **o risco segue de pé** para mais de uma instância |

## Nota de método

Esta rodada mostrou o que a anterior não podia: **correção é onde bug novo nasce.** Sete dos nove
defeitos novos vieram de consertos da rodada 1, e o mais grave — N1 — era invisível na máquina de
desenvolvimento porque ela está no fuso da clínica. Foi preciso subir um segundo servidor com
`TZ=UTC`, que é como o container roda, para vê-lo.
