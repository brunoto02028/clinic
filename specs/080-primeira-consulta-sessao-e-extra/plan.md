# Atividade 080 — Primeira consulta, sessao do pacote, e sessao extra

## Objetivo

Marcar consulta hoje nao cobra nada e nao consome nada. O Bruno descreveu o problema com
precisao: *"uma coisa e o paciente que ja esta sendo tratado, outra coisa e o paciente de
primeira consulta"* — e o sistema trata os dois igual.

## O que medi antes de planejar (25/09/2026)

| o que | estado real |
|---|---|
| `PatientPackage.sessionsUsed` e `ServicePackage.sessionsIncluded` | existem, e **nenhuma rota os le ou incrementa** — o pacote conta sessoes no papel e ninguem consome |
| marcar consulta no app | nao toca em preco nem em pagamento |
| `Appointment` | tem `price` (default 60), `paymentMethod`, `treatmentType` (string livre) — nada diz **que tipo de marcacao** aquilo e |
| `ServicePrice` | ja existe por clinica, com `CONSULTATION` e `TREATMENT_SESSION`, editavel pelo admin |
| triagem | ja e pre-requisito de modulo, e nao leva a marcar |

Ou seja: um paciente com pacote de 10 sessoes pode marcar 30, e o sistema nao percebe.

## A decisao: uma porta so, escolhida pelo servidor

O app **nao pergunta** que tipo de marcacao e. Ele mostra um botao, e o servidor decide o que
esta atras dele pelo estado do paciente:

| estado | o que o paciente ve | o que acontece |
|---|---|---|
| triagem nao preenchida | "Complete sua triagem primeiro" | nao marca |
| triagem feita, sem tratamento | **Primeira consulta**, preco de `ServicePrice(CONSULTATION)` | paga no ato; o horario so fica reservado depois |
| em tratamento, com sessao no pacote | **Marcar sessao** — "restam 4 de 10" | consome uma sessao, sem pagamento |
| em tratamento, pacote esgotado | **Sessao extra**, preco de `ServicePrice(TREATMENT_SESSION)` | pagar no ato **ou** entrar na fatura, conforme a clinica |

**Por que a primeira paga no ato e a extra nao necessariamente:** com o paciente novo nao existe
relacao nenhuma, e o pagamento e o que transforma um desconhecido num horario reservado. Quem ja
esta em tratamento voce conhece, e cobrar antecipado de quem ja confia cria atrito sem reduzir
risco.

**E nada disso engessa.** A clinica marca por fora, da sessao de cortesia e isenta a extra pelo
prontuario. A porta automatica e o caminho comum, nao a unica entrada.

## Tarefas

| T-N | nome | status |
|-----|------|--------|
| T-1 | a sessao do pacote passa a ser consumida de verdade | implementada, aguarda QA |
| T-2 | o servidor decide a porta pelo estado do paciente | implementada, aguarda QA |
| T-3 | o app mostra uma porta so, com o texto certo | pendente |
| T-4 | a clinica anula quando quiser: cortesia, isencao, marcar por fora | pendente |

T-1 e a fundacao — sem consumo de sessao, as outras tres nao tem o que decidir.

## Suposicoes — precisam do seu aval

1. **Cancelar devolve a sessao.** Consulta cancelada libera a sessao do pacote de volta. Falta
   (`NO_SHOW`) **nao** devolve: o horario foi perdido.
2. **A sessao extra entra na fatura por padrao**, e nao no pagamento no ato. E o mais proximo do
   que a clinica faz hoje; o interruptor existe para voce mudar sem deploy.
3. **Pacote vencido conta como esgotado.** `endDate` no passado tira o paciente da porta de
   sessao, mesmo com sessoes sobrando.
4. **Consulta marcada pela clinica nao cobra nada automaticamente.** Voce marcou, voce decide o
   preco — e o registro guarda que foi a clinica quem marcou.
5. **Primeira consulta e uma so.** Depois dela o paciente e "em tratamento", tendo comprado
   pacote ou nao; a segunda marcacao ja e sessao extra.
