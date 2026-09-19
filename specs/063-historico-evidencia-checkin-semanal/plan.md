# Atividade 063 — Histórico de relatórios de evidência clínica + check-in semanal de dor/função

## Objetivo

Nasceu do caso da paciente Mione De Almeida: eu gerei manualmente (via chat, pela skill
`clinical-evidence-report`) um relatório preliminar de evidência pra ela, e o Bruno perguntou o
que precisa existir no sistema pra que, conforme a paciente for preenchendo mais dados, essas
análises "vão evoluindo... desde o primeiro até o último... uma sequência" registrada na ficha
dela. Investigando, achei que grande parte já existe — esta atividade cobre só o que falta.

Dois pedidos, tratados como duas tarefas independentes:

1. **Histórico completo de relatórios de evidência** — hoje o sistema só mostra o mais recente.
2. **Check-in semanal de dor/função** — o paciente já tem onde registrar (`PatientOutcomeMeasure`
   + tela `/dashboard/outcome-measures`), mas nada convida ele a fazer isso com regularidade.

## Contexto técnico já levantado (correção de premissa)

Cheguei a desenhar um plano anterior propondo um model novo (`ClinicalEvidenceReport`) e uma
rota de criação — descobri, pesquisando antes de escrever, que **isso já existe e já está em
produção** (atividades 014/015, specs concluídas):

- Model `ClinicalEvidenceReport` (`prisma/schema.prisma:3747`) — `status` (`DiagnosisStatus`:
  GENERATING → DRAFT → UNDER_REVIEW → APPROVED → ARCHIVED), `caseSummary`/`evidence`/
  `clinicCrossRef`/`suggestions`/`gaps` em Json, `narrativeEn`/`narrativePt`, `reviewedById`,
  `approvedAt`.
- `lib/evidence-report.ts` — pipeline completo: red-flag gate primeiro (aborta e não sugere
  tratamento se achar sinal urgente, igual a skill que rodei manualmente), busca na Europe PMC,
  cruza com o catálogo **ao vivo** de `Exercise`/`ProtocolTemplate` da própria clínica (função
  `loadClinicCatalog`) — ou seja, o problema que eu resolvi na mão com um `clinic-resources.json`
  estático já está resolvido aqui, sem arquivo nenhum, sempre atual.
- `lib/background-jobs.ts` — job em processo (`generatePendingEvidenceReports`, a cada 2min) que
  processa relatórios `GENERATING`, com retry/attempts guard.
- Rota `app/api/admin/patients/[id]/evidence-report/route.ts` (GET latest / PATCH review status /
  POST regenerar ou traduzir) + aba "Evidência" em `app/admin/patients/[id]/page.tsx`
  (`components/admin/evidence-report-tab.tsx`).

Perguntei ao Bruno, com a informação corrigida (a geração automática não é escopo/custo novo —
já roda), se ele queria manter isso ou continuar pedindo geração manual via Claude Code. Escolha
dele: **manter o automático que já existe**. Esta atividade não mexe em geração — só no que falta
em volta dela.

**O gap real**: `GET .../evidence-report` faz só `findFirst` (`orderBy: createdAt desc`) — não
existe listagem. A aba do admin só renderiza esse único registro. Não há como ver a evolução.

Sobre o check-in semanal: também descobri infraestrutura pronta —
`PatientOutcomeMeasure` (dor VAS, FAAM ADL/Sport, função geral, `recordedAt`) e a rota
`app/api/patient/outcome-measures/route.ts` (já suporta `?history=true` pra série temporal,
usada pelos gráficos), tela `app/dashboard/outcome-measures/page.tsx`. Falta só o convite
recorrente pra paciente preencher.

**Trava importante, achada antes de desenhar isso**: existe uma regra permanente do Bruno —
"nunca enviar nada a paciente sem eu apertar o botão" (memória `feedback_no-automatic-patient-sends`)
— por causa dela, os crons automáticos de lembrete pro paciente (`daily-adherence`,
`onboarding-reminder`) foram **desativados de propósito** no Coolify em 17/09/2026
(`specs/049-relatorio-adesao-diaria/plan.md`). Um cron semanal automático de check-in bateria de
frente com essa regra. Perguntei ao Bruno como reconciliar — escolha dele: **nada de mensagem
automática saindo pro paciente; um aviso só dentro do próprio app**, mostrado quando ele já está
logado no dashboard. Cadência escolhida: **semanal** (7 dias desde o último registro).

## Decisões de design

1. **T-1 (histórico) reaproveita o padrão já usado em `outcome-measures/route.ts`**: mesmo query
   param `?history=true` na rota já existente, sem quebrar quem já chama sem parâmetro (continua
   devolvendo só o mais recente, comportamento atual preservado).
2. **UI do histórico é uma timeline dentro da aba "Evidência" já existente** — não uma página
   nova. Cada entrada: data de geração, badge de status (mesmas cores/labels que a aba já usa pro
   registro único hoje), resumo do `caseSummary` (queixa/escores daquele momento), narrativa
   expansível, e o botão de "marcar como revisado" por entrada (a rota PATCH já aceita qualquer
   `reportId`, já funciona pra qualquer item do histórico sem mudança — só passa a ser chamada de
   dentro de cada card em vez de só do card único atual).
3. **T-2 (check-in semanal) é 100% passivo — nenhuma mensagem sai do sistema.** Segue o mesmo
   padrão do `OnboardingWizard` (`components/dashboard/onboarding-wizard.tsx`, renderizado
   condicionalmente em `components/dashboard/patient-dashboard.tsx:127`): um componente
   auto-contido que busca se o check-in está "devido" e se renderiza (ou não) sozinho — sem exigir
   mudança na página do dashboard além de importar e renderizar, como o Onboarding já faz.
4. **"Devido" = 7+ dias desde o último `PatientOutcomeMeasure.recordedAt`**, ou nunca registrou e
   já passou 7+ dias desde `User.createdAt` (proxy pro "primeiro dia", ver Suposição 2).

## Suposições (peço validação)

1. **Sem conceito de "alta" no sistema hoje** — não existe campo de discharge/alta em nenhum
   model (`User.isActive` é uma flag genérica de conta ativa/desativada, não de tratamento
   finalizado; o mais próximo é `TreatmentPlan.status`, mas nem todo paciente tem um
   `TreatmentPlan` formal). Pra não inventar uma feature de "alta" que não existe só pra gatear
   isso, a versão 1 do check-in semanal **não para automaticamente** ao fim do tratamento — ele
   simplesmente para de aparecer quando o paciente passa a registrar toda semana (deixa de estar
   "devido"). Se um paciente realmente recebe alta e some do sistema, o card fica "devido" mas
   invisível pra ele mesmo (só reaparece se ele logar de novo). Avise se isso é insuficiente e
   quer um campo de alta de verdade — isso viraria escopo maior (schema novo + UI de marcar alta).
2. **"Primeiro dia" = `User.createdAt`** quando não há nenhum registro ainda — não achei um campo
   melhor ("início do tratamento" também não existe formalmente). Se o paciente ficou cadastrado
   muito antes de começar o tratamento de fato, o card pode aparecer "atrasado" já no primeiro
   login dele — aceitável pra v1, mas registrando a limitação.
3. **Sem snooze/dispensar** — o card não some ao ser fechado, só some quando o paciente de fato
   preenche o formulário (o que reseta o contador de 7 dias). Menos código, e evita o risco oposto
   (paciente clica "depois" e nunca mais é lembrado). Se isso incomodar na prática, ajustamos
   depois — não quero adicionar estado de "dispensado" especulativamente.
4. **T-1 não inclui revisão de qualidade do conteúdo que a IA já gera** — isso foi cogitado
   (Bruno mencionou querer melhorar as análises), mas não é uma tarefa de código: só dá pra
   avaliar com um relatório real gerado (ex. quando a Mione enviar a triagem dela). Fica como
   acompanhamento manual, não task desta spec.

## Tarefas

| Tarefa | Nome | Status |
|---|---|---|
| T-1 | Histórico de relatórios de evidência (rota + timeline na aba existente) | concluído |
| T-2 | Card passivo de check-in semanal no dashboard do paciente | concluído |
