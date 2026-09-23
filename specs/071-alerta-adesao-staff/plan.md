# Atividade 071 — Alerta de adesão para o staff + observação do paciente

## Objetivo

Hoje o staff da BPR não tem nenhum jeito de saber que um paciente com protocolo
ativo parou de fazer os exercícios e não deixou nenhum recado — só descobre
abrindo o perfil manualmente. Esta atividade fecha esse gap com duas peças:

1. Um alerta visível pro staff quando um paciente com protocolo ativo fica N
   dias sem nenhum registro de exercício.
2. Uma caixa de observação que o paciente realmente consegue usar — hoje o
   campo existe no banco e a rota de gravação existe, mas **nenhuma tela
   chama essa rota**. É código morto do ponto de vista de UI, não uma
   omissão do paciente.

Pedido original (Bruno, verbatim): *"eu quero ver a revisão da automação dos
pacientes que precisam fazer os exercícios onde o protocolo está ativo e eles
não preencheram no sistema os exercícios que fizeram nenhuma observação. Eu
acho que é importante eu ter esse feedback."*

## O que já existe (não repetir, só a base)

- `lib/patient-daily-adherence.ts:36` (`getExpectedToday`) e
  `lib/clinic-daily-adherence.ts:16` (`getClinicDailyAdherence`) — calculam
  isso só pra **hoje**, do zero, sem histórico. `components/admin/daily-adherence-card.tsx`
  e `components/admin/patient-adherence-panel.tsx` mostram esse snapshot.
  `app/api/cron/daily-report/route.ts` manda um e-mail diário com o mesmo
  corte ("hoje") pro `admin@bpr.clinic`.
- Nenhuma dessas peças olha `ProtocolItem.patientNotes`, guarda streak, ou
  soma dias.

## Decisões de design

- **Sem tabela nova.** O streak ("há quantos dias sem log") é calculado sob
  demanda a partir de `ExerciseCompletionLog` — já é a fonte real de "fez ou
  não fez", já indexada por `patientId`. Volume atual de pacientes ativos não
  justifica persistir um contador redundante; revisitar só se a query ficar
  lenta em produção.
- **Nunca vira notificação automática pro paciente.** Todo o alerta desta
  atividade é staff-facing — card no admin (e, se aprovado, um e-mail
  resumo). Não usa `notifyPatient` nem o gate `Clinic.dailyRemindersEnabled`
  (que é especificamente pra mensagens que vão PRO paciente). Isso é critério
  de aceite transversal, não uma escolha de tarefa.
- **`patientNotes` é por item do protocolo** (`ProtocolItem.patientNotes`,
  já assim no schema) — uma observação por exercício, não uma nota geral do
  dia. Reaproveita a rota já existente (`PATCH app/api/patient/protocol/route.ts:210-247`),
  só falta a tela chamá-la.
- **Web primeiro.** Segue o padrão real do projeto (mobile historicamente
  fica pra trás — ver memória `paridade-web-app-paciente`). T-3 cobre só
  `app/dashboard/treatment/page.tsx`; a versão mobile fica registrada como
  pendência explícita (T-5, não bloqueia as demais) em vez de ser esquecida
  em silêncio.

## Suposições — aprovadas (23/09/2026)

1. **Threshold do alerta:** 3 dias sem nenhum log (com pelo menos um item
   liberado nesse intervalo). Fixo por enquanto — ver princípio de
   extensibilidade abaixo, isso precisa ser fácil de mudar sem reescrever
   nada.
2. **Onde o alerta aparece:** card novo no dashboard admin nesta primeira
   versão, sem e-mail automático ainda. E-mail resumo fica como extensão
   futura, não implementada agora.
3. **Onde o staff vê a nota:** painel por paciente + sinal no card do
   dashboard quando há nota não lida.

## Princípio de extensibilidade (pedido explícito do Bruno, 23/09/2026)

> "eu quero poder também alterar, editar, mudar a automação, a forma, a
> abordagem. Então sempre construa algo aberto para mudanças futuras"

Isso não é uma tarefa própria — é uma restrição transversal em como cada
tarefa é implementada:

- **Threshold (3 dias) não fica hardcoded espalhado pelo código.** Uma única
  constante nomeada (ex.: `ADHERENCE_FALLING_BEHIND_THRESHOLD_DAYS` em
  `lib/patient-adherence-streak.ts`), fácil de achar e trocar por um valor
  diferente ou, depois, por uma coluna em `Clinic` — sem tocar em mais de um
  lugar.
- **A lógica "o que conta como atrasado" fica isolada numa função pura**
  (T-1), não espalhada dentro do componente de UI ou da rota — trocar a
  regra (ex.: passar a exigir N dias consecutivos vs. N dias corridos) deve
  significar editar uma função, não caçar por vários arquivos.
- **O card (T-2) consome o endpoint, não recalcula nada por conta própria**
  — trocar a lógica de "quem está atrasado" no backend já reflete na tela
  sem editar o componente.
- Ao implementar, preferir um pequeno objeto/config central sobre múltiplos
  números soltos, mesmo quando a v1 só usa um valor — não é over-engineering
  aqui, é o requisito explícito do Bruno.

## Fora de escopo

## Fora de escopo

- `app/api/cron/exercise-reminders/route.ts` — achado à parte: filtra por
  status que não existem no enum `DiagnosisStatus` (`ACTIVE`/`IN_PROGRESS`),
  nunca encontra nada, é código morto/quebrado. Não mexo aqui a menos que
  peça.
- `app/api/admin/settings` 404 (achado do QA da atividade 070) — reportado à
  parte, não faz parte desta atividade.
- Qualquer notificação automática pro paciente — regra fixa do produto, não
  uma decisão desta atividade.

## Tarefas

| T-N | Nome | Status |
|-----|------|--------|
| T-1 | Cálculo de streak de adesão (sem tabela nova) | concluído |
| T-2 | Card "Patients Falling Behind" no dashboard admin | concluído |
| T-3 | Caixa de observação do paciente (web) | concluído |
| T-4 | Mostrar a observação do paciente pro staff | concluído |
| T-5 | (Opcional) Observação do paciente no app mobile | pendente (opcional, não bloqueia) |

## Achado do code review — resolvido (23/09/2026)

Uma observação do paciente (`patientNotes`) só aparecia pro staff enquanto o
protocolo estava `SENT_TO_PATIENT` — arquivar o protocolo (acontece
automaticamente ao atribuir um novo template ao mesmo paciente, ver
`app/api/admin/protocols/[id]/assign/route.ts:100-104`) fazia a nota sumir
silenciosamente. Decisão do Bruno: *"sempre deixar arquivado visivel para a
clinic ok? quero acompanhar tudo que ja fizemos e o que melhoramos"*.
Corrigido: `app/api/admin/patients/[id]/protocol-notes/route.ts` e o cálculo
de `hasNote` em `lib/clinic-daily-adherence.ts` agora olham notas de
qualquer status de protocolo, não só `SENT_TO_PATIENT`. O painel do staff
marca visualmente quando a nota vem de um plano arquivado (badge "Archived
plan"), pra não confundir com o plano atual.

## Aprovação

Aprovado pelo Bruno em 23/09/2026 ("Pode seguir conforme os seus planos"),
com o princípio de extensibilidade acima incorporado ao plano.
