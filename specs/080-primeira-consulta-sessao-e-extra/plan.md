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
| T-5 | a agenda configuravel: janelas por dia, tipo, capacidade e excecoes | motor e API prontos; falta a tela |

## T-5 — a agenda vira configuracao, nao codigo (25/09/2026)

O Bruno pediu para poder montar a agenda no painel e isso refletir no app de cada paciente, sem
depender de mim para cada regra. O que ele descreveu nao cabia no modelo: `TherapistAvailability`
tem `@@unique([therapistId, dayOfWeek])` — **uma unica janela por dia** — e a rota de horarios
apaga o slot inteiro na primeira marcacao, capacidade 1 sempre.

Agora a semana e um conjunto de janelas. Cada uma diz o dia, a faixa, **o que atende**
(`CONSULTATION` ou `TREATMENT`), **quantos cabem** (1 a 5) e de quanto em quanto abre horario. Mais
excecoes por data, para feriado, ferias e expediente curto.

**Uma agenda so, duas naturezas de janela.** Consulta e tratamento disputam a mesma sala e a mesma
pessoa: dois calendarios separados deixariam as duas coisas no mesmo horario sem avisar, e o erro
apareceria na terca-feira, com gente na porta. Por isso sobreposicao e recusada no servidor.

**Fallback, nao substituicao.** Quem nao configurou janela nenhuma continua regido pelo modelo
antigo. Ninguem acorda sem agenda porque o modelo mudou.

A capacidade e de quem esta na sala **ao mesmo tempo**: janela de 14h as 18h com capacidade 4 sao
4 pessoas as 14h e outras 4 as 15h. O paciente ve "restam 2 vagas" — **nunca quem sao as outras**.

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
