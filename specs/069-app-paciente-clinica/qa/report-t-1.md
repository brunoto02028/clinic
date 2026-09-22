# T-1 — Inventário das 42 páginas do dashboard web

**Data:** 22/09/2026 · **Base:** `main` em `32878da6` · **Tipo:** discovery, sem código de feature

## Método
A audiência não foi adivinhada página a página: o projeto já centraliza essa decisão em três lugares, e o inventário saiu deles.

| Fonte | O que define |
|---|---|
| `lib/module-registry.ts` | Os 20 módulos do paciente, cada um com `href` e se é `alwaysVisible` ou gated |
| `lib/patient-sections.ts` | O menu curado, com as flags `personalOnly` e `clinicalOnly` |
| `components/dashboard/patient-sidebar.tsx` | `CLINICAL_PATIENT_KEYS` — o que é escondido do aluno de estúdio |
| `components/dashboard/module-gate.tsx` | Como o gate resolve href → módulo e bloqueia |

## Resultado: 42 páginas

### Aluno de estúdio — FORA do app do paciente (6)
Marcadas `personalOnly` no menu curado ou servidas por componente de aluno.

| Página | Evidência |
|---|---|
| `workouts` | `personalOnly: true` |
| `nutrition` | `personalOnly: true` |
| `billing` | `personalOnly: true` |
| `challenges` | `personalOnly: true` |
| `assessments` | renderiza `StudentAssessments` |
| `patients`, `patients/[id]` | visão de staff/terapeuta (`PatientsList`) — nem paciente nem aluno |

### Já cobertas no app (15)
`(home)`, `appointments` (+`[id]`, +`book`), `clinical-notes`, `consent`, `documents`, `education`, `guide`, `outcome-measures`, `profile`, `quizzes`, `screening`, `tasks`, `treatment`, `assessment-flow` (parcial — o app tem `assessment-progress`).

### Faltando no app — paciente de clínica (17)
Todas consomem `/api/patient/**`, que já existe. **Nenhuma exige backend novo.**

| Página | Endpoint | Módulo |
|---|---|---|
| `questions` | `/api/patient/questions`, `/api/patient/messages` | — (menu curado, "Messages") |
| `records` | `PatientRecords` | `mod_records` |
| `recordings` | `/api/patient/consultation-recording` | `mod_recordings` |
| `journey` | `/api/patient/journey`, `/api/dashboard/evolution` | `mod_journey` |
| `community` | `/api/patient/journey/community` | `mod_community` |
| `achievements` | `/api/patient/achievements` | `mod_achievements` |
| `marketplace` | `/api/patient/marketplace/*` | `mod_marketplace` |
| `membership` | `/api/patient/membership/*` | `mod_plans` |
| `plans` | `/api/patient/service-prices`, `/status` | — |
| `my-plan` | `/api/patient/rehab-plan` | — |
| `follow-up` | `/api/patient/adherence`, `/outcome-measures` | — |
| `quiz` | `/api/patient/journey/quiz` | parte da Jornada |
| `blood-pressure` | `/api/patient/blood-pressure`, `/bp-reminder` | — |
| `biohacking` | `/api/biohacking/my-protocol`, `/api/wearables/*` | — |
| `waitlist` | `/api/patient/waitlist`, `/treatment-types` | — |
| `cancellation-policy` | estático bilíngue | — |
| `clinical-notes/create` | sub-rota | `mod_clinical_notes` |

## Três correções ao plano

**1. A T-7 estava errada.** Eu havia agrupado `billing` como financeiro do paciente. É `personalOnly` — são os pagamentos do **aluno** via Stripe Connect (ativ. 028). Sai do escopo. O financeiro do paciente é `membership`, `plans`, `my-plan`, `marketplace` e `cancellation-policy`.

**2. A T-8 não encolhe — ao contrário.** Eu suspeitava que `achievements`, `community` e `journey` fossem do produto do personal. É o inverso: as três estão em `CLINICAL_PATIENT_KEYS`, isto é, são **escondidas do aluno justamente por serem da clínica**. As atividades 058 e 059 tiraram Jornada e Comunidade do aluno — elas são do paciente da BPR. Confirmadas no escopo.

**3. Falta a tela mais usada.** `questions` ("Messages") é item do **menu curado, visível para os dois públicos** — o canal do paciente com o terapeuta. Não está no app. É a ausência mais grave do inventário e deveria abrir a Fase 2, não ficar no meio da T-6.

## Duas divergências app × web

**`exercises` — o app está atrasado.** A atividade 043 aposentou a página separada de exercícios na web: `mod_exercises` agora aponta para `/dashboard/treatment`, e o menu curado leva "Exercises" para lá. O app mantém uma **aba própria** `exercises` nas tabs. Ou o app segue a web e funde exercícios no plano de tratamento, ou assume-se a divergência por decisão de UX mobile. **Precisa de decisão do Bruno.**

**Wearables.** O app tem `wearables` e `wearable-data`, que na web vivem dentro de `biohacking`. Ao portar `biohacking`, reaproveitar o que já existe em vez de duplicar.

## Recomendação de fases (revisada)

| Fase | Telas | Por quê |
|---|---|---|
| **2A** | `questions`, `records`, `recordings`, `clinical-notes/create` | O canal com o terapeuta e o prontuário — o núcleo clínico |
| **2B** | `journey`, `quiz`, `achievements`, `community` | A Jornada BPR e o que pende dela |
| **3A** | `membership`, `plans`, `my-plan`, `cancellation-policy`, `marketplace` | Plano e assinatura (ver regra de IAP) |
| **3B** | `follow-up`, `blood-pressure`, `biohacking`, `waitlist` | Acompanhamento e ferramentas |

## Critérios de aceite

- [x] As 42 páginas classificadas, nenhuma sem audiência definida
- [x] Toda página "ausente + paciente" tem endpoint mapeado — nenhuma exige backend novo
- [x] Nenhuma página de aluno de estúdio entrou na lista de porte
- [ ] Fases atualizadas no `plan.md` — pendente da decisão sobre `exercises`
