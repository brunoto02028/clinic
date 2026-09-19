# Atividade 062 — Guia da consulta domiciliar, permissões padrão e idioma dos lembretes

## Objetivo

Três pedidos relacionados, nascidos do caso da paciente Mione De Almeida (78 anos, só fala
português, dificuldade de usar o sistema):

1. Adicionar, no guia do paciente, um texto sobre a importância de ter histórico/exames/
   relatórios preenchidos antes de uma consulta em domicílio.
2. Um "setup" de permissões padrão no admin, aplicado automaticamente a todo paciente que se
   cadastra — hoje isso não existe, cada paciente começa só com o mínimo e precisa de ação manual.
3. Poder escolher explicitamente o idioma (EN/PT) dos lembretes automáticos (Today/Yesterday/
   Onboarding), do mesmo jeito que já existe pro Fechamento Semanal — em vez de só confiar na
   detecção automática pelo `preferredLocale` da paciente.

## Contexto técnico já levantado

- **Guia (`app/dashboard/guide/page.tsx`)**: página 100% estática hoje (sem fetch/useEffect).
  Não existe campo real de "visita domiciliar" no schema — o único lugar do projeto que detecta
  isso é um **regex sobre texto livre** (`appointment.notes`) em
  `app/api/appointments/[id]/route.ts:195`. Não é uma fonte confiável pra gatear conteúdo de uma
  página.
- **Permissões (`lib/patient-access.ts` `computePatientAccess()`)**: ordem de prioridade —
  `ALWAYS_VISIBLE_MODULES` sempre → auto-grant total se `PERSONAL_TRAINER` → `subscription.plan.features`
  → pacote pago desbloqueia módulos de tratamento → `User.moduleOverrides` (JSON por paciente,
  maior prioridade) por último. Paciente novo de clínica, sem plano/pacote, recebe **só**
  `ALWAYS_VISIBLE_MODULES` — nada além disso é concedido automaticamente hoje. Existe
  `DEFAULT_FREE_FEATURES` (`lib/module-registry.ts:461`), mas é só o ponto de partida quando um
  admin cria um Plano gratuito novo — não é aplicado no cadastro, não é editável isoladamente.
  A tela `app/admin/patients/[id]/permissions/page.tsx` (741 linhas) já tem toda a UI de seleção
  de módulo pronta, mas é 100% por-paciente.
- **Idioma dos lembretes (`lib/notify-patient.ts`)**: o padrão "EN/PT como botões separados,
  escolha explícita sempre vence" já existe pro Fechamento Semanal (ativ. 60) porque lá o texto é
  montado fora da função e só um idioma é passado em `plainMessage` (nunca `plainMessagePt`). Pros
  lembretes Today/Yesterday/Onboarding isso **não funciona** — `notifyPatient` tem branches
  especiais (`yesterdayMissingTitles`, `useReminderTemplate`, `onboardingPending`) que recalculam
  `isPt` **internamente** a partir do `preferredLocale` da paciente, ignorando qualquer coisa que
  o chamador passe. Hoje é literalmente impossível forçar o idioma nesses três tipos de lembrete.

## Decisões de design

1. **Guia — texto genérico, não condicional.** Em vez de tornar a página dinâmica e depender do
   regex frágil sobre `notes`, o texto entra de forma genérica (visível pra todo mundo, com a
   frase condicionada no próprio texto: "se a sua consulta for em domicílio..."). Zero lógica
   nova, zero dependência de heurística de texto livre. Ver Suposição 1 se o Bruno preferir a
   versão condicional (escopo maior).
2. **Permissões padrão — novo campo por clínica + reaproveita a UI existente.**
   `Clinic.defaultPatientModuleOverrides Json?` (mesmo formato que `User.moduleOverrides` já usa)
   — edição via uma versão adaptada da tela de permissões que já existe (`.../permissions/page.tsx`),
   só trocando o alvo de gravação. Aplicado **apenas na criação** de um `User` novo com
   `role: PATIENT` (não retroativo — pacientes já cadastrados não mudam).
3. **Idioma dos lembretes — `forceLocale` central em `notifyPatient`.** Um parâmetro novo
   `forceLocale?: "en" | "pt"` que, quando presente, sobrescreve o cálculo de `isPt` em **todos**
   os branches da função (não só o genérico) — resolve a limitação na raiz, não só workaround.
   As rotas de envio (`send-reminder`, `send-yesterday-followup`, `send-onboarding-reminder`)
   passam a aceitar `locale` no body e repassam como `forceLocale`.
4. **UI do idioma — toggle inline, não duplicar seções.** Em vez de duplicar cada seção em EN+PT
   (como o Fechamento Semanal, que iria de 3 pra 6 seções no card "Adherence" e ficaria poluído),
   cada seção existente (Today/Yesterday/Onboarding) ganha um pequeno seletor EN/PT ao lado do
   botão "Send now", com o idioma escolhido persistindo como preferência local (não precisa
   escolher toda vez). Ver Suposição 3 se preferir o padrão de seções duplicadas mesmo assim.

## Suposições (peço validação)

1. **Guia**: texto genérico (decisão 1), não condicional por tipo de consulta. A versão
   condicional exigiria buscar o agendamento do paciente na página + reusar o regex heurístico
   sobre `notes` — mais frágil e mais escopo. Avise se prefere essa via mesmo assim.
2. **Permissões padrão não é retroativa** — só afeta cadastros feitos depois de configurado.
   Pacientes já cadastrados (como a Mione) continuam exatamente como estão, sem mudança nenhuma.
3. **UI do idioma dos lembretes**: toggle inline (decisão 4) em vez de seções duplicadas — mais
   compacto. Confirma ou prefere igual ao Fechamento Semanal?
4. **T-5 (editor de templates) é opcional e depende de confirmação explícita sua** — você
   perguntou "onde e como edito esses textos" mas ainda não respondeu se quer que eu já construa
   isso agora ou se prefere continuar me pedindo os ajustes (mais rápido no curto prazo). T-1 a
   T-4 não dependem dessa resposta; T-5 só entra em execução se você confirmar.
5. Pontos de criação de paciente que precisam aplicar o padrão (T-2): cadastro público
   (`/join/[slug]`), Google OAuth (`lib/auth-options.ts`, `signIn` callback), e criação manual
   pelo admin — vou confirmar essa lista completa durante a implementação do T-2 e listar todos
   os arquivos tocados no `t-2` antes de mexer.

## Rascunho do texto do guia (T-1) — PT e EN, pra sua aprovação

**PT:**
> Se a sua consulta for na sua casa, é muito importante que seu histórico médico, exames,
> recomendações médicas (se houver) e relatórios já estejam adicionados no seu perfil com
> antecedência. Essa informação ajuda bastante na sua avaliação.

**EN:**
> If your session is a home visit, it's important that your medical history, any exam results,
> medical recommendations (if any) and reports are already added to your profile beforehand.
> This information helps a lot with your assessment.

## Tarefas

| Tarefa | Nome | Status |
|---|---|---|
| T-1 | Texto do guia (consulta domiciliar) | concluído |
| T-2 | Permissões padrão por clínica | concluído |
| T-3 | `forceLocale` central em `notifyPatient` | concluído |
| T-4 | Escolha de idioma na UI dos lembretes (depende de T-3) | concluído |
| T-5 | Editor de templates de e-mail (opcional — só com confirmação) | concluído |

## QA e code review (T-1 a T-4)

QA (agente qa-tester, ambiente local, fixtures QA Clinic A / QA Studio PT): todos os cenários da
`qa-spec.md` aprovados, com evidência real (envios de teste capturados em modo sink, screenshots,
consultas diretas ao banco). Cobriu especificamente: texto do guia em PT/EN sem quebrar mobile;
paciente criado via `/api/signup` depois de configurar um padrão já nasce com o módulo
correspondente liberado, paciente anterior não muda; guard de auth (staff só lê/grava o padrão
da própria clínica, paciente autenticado recebe 403); `forceLocale` confirmado nos 3 branches
especiais de `notifyPatient` (onboarding/yesterday/today) nos dois sentidos; seletor de idioma
na UI confirmado ponta a ponta (preview + envio real refletindo PT/EN escolhido); regressão das
atividades 60/61 sem alteração.

Nota de implementação (não é bug, é uma mudança de abordagem em relação ao rascunho do plano): o
T-2 não alterou `lib/patient-access.ts` — em vez de misturar o padrão da clínica dentro de
`computePatientAccess()`, a implementação faz um **snapshot no momento da criação do usuário**
(`lib/patient-defaults.ts`, chamado nos 5 pontos de criação), gravando direto em
`User.moduleOverrides`. Resultado equivalente (mesmos critérios de aceite atendidos), com a
vantagem de não precisar tocar a função central de cálculo de acesso.

Code review (self-review sobre o diff completo): sem achados que exigissem correção.

Achados fora do escopo, registrados e não corrigidos (pré-existentes, não são regressão desta
atividade): hydration warnings em `SectionTabs`/`Journey` na navegação admin; cache de chunk JS
imutável no dev server escondendo mudanças até desabilitar cache manualmente (já documentado em
memória).

## T-5 — editor de templates de e-mail

Confirmado pelo Bruno depois do plano inicial. Implementado: `Clinic.reminderTemplatesJson`
(shape `{today,yesterday,onboarding,weeklyClosing} x {en,pt}`), helper `lib/reminder-templates.ts`
(fallback pro texto hardcoded quando vazio, tokens `{items}`/`{name}`), plugado em
`lib/daily-adherence-email.ts`, `lib/onboarding-reminder.ts`, `lib/weekly-closing.ts`,
`lib/notify-patient.ts` e as rotas de preview/send correspondentes. Tela nova
`/admin/reminder-templates` com prévia client-side (substituição de token com exemplo, nunca
envia de verdade), rota `app/api/admin/reminder-templates` (GET/PATCH, escopada por clínica).

**Bug crítico achado e corrigido no primeiro QA**: a tela nasceu em `/admin/settings/reminder-templates`
— esse prefixo é tratado como exclusivo de SUPERADMIN (`lib/superadmin-routes.ts`), então
qualquer ADMIN/THERAPIST de clínica era redirecionado silenciosamente, sem conseguir abrir a
tela de jeito nenhum. Movida pra `/admin/reminder-templates` (fora de qualquer prefixo
superadmin-only) e registrada em `lib/admin-sections.ts` (aba "Reminder Templates" dentro de
Notifications, corrigindo também o destaque do nav — achado cosmético do reteste).

QA (2 rodadas — a primeira achou o bug de rota, a segunda confirmou a correção): todos os
cenários aprovados — edição + prévia + salvar + reflexo no preview real com itens reais da
paciente, "reset to default" volta ao texto padrão, regressão sem customização, isolamento
cross-tenant (dois tenants QA, configuração de um não vaza pro outro), guards de auth (401/403),
entrada inválida (400), e os 4 tipos de lembrete com seus tokens corretos.

Code review: sem achados de segurança — todo texto customizado passa por `escapeHtml()` antes de
entrar no HTML do e-mail, tanto no caminho novo quanto no já existente.
