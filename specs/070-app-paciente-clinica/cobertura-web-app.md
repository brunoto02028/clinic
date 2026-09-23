# Cobertura web × app — visão do paciente

**Atualizado:** 23/09/2026 · **Documento vivo.** Toda mudança em `app/dashboard/**` ou em `/api/patient/**` deve ser refletida aqui e no app.

Verificado nesta data por inspeção: páginas em `app/dashboard`, telas em `mobile/app/(app)/(clinica)` e **os pontos de entrada reais** — uma tela que existe como arquivo mas não é alcançável não conta como coberta. Foi esse o erro do primeiro inventário.

## Resumo

| | Quantidade |
|---|---|
| Páginas da web | 42 |
| — do **aluno de estúdio** (fora do escopo) | 5 — `workouts`, `nutrition`, `billing`, `challenges`, `assessments` |
| — de **staff** (fora do escopo) | 2 — `patients`, `patients/[id]` |
| **Páginas do paciente** | **35** |
| Cobertas no app | **19** |
| Faltando | **16** |

## Coberto (19)

| Web | App | Observação |
|---|---|---|
| `(home)` | `(tabs)/index` | Plano vem do diagnóstico real |
| `appointments` | `(tabs)/appointments` | |
| `appointments/[id]` | `appointment/[id]` | Sem pagar/cancelar — ver "Pagamentos" |
| `appointments/book` | `book-appointment` | Fuso corrigido |
| — | `booking-confirmed` | Só no app |
| `treatment` | `treatment-protocol` | Sets/reps da prescrição |
| `exercises` | `(tabs)/exercises` + `exercise/[id]` | ⚠️ divergência — ver abaixo |
| `clinical-notes` | `clinical-notes` | Sem detalhe nem `create` |
| `consent` | `consent` | Termo corrigido, bilíngue |
| `documents` | `documents` | Upload só de imagem |
| `education` | `education` + `education/[id]` | |
| `guide` | `guide` | |
| **`questions`** | **`messages`** | ✅ **feito em 23/09** |
| `outcome-measures` | `outcome-measures` | Sem os questionários FAAM |
| `screening` | `screening` | Red flags e consentimento |
| `tasks` | `tasks` | Sem `dueDate` nem `actionUrl` |
| `assessment-flow` | `assessment-progress` | Parcial |
| `profile` | `(tabs)/profile` + `profile-edit` | |
| `biohacking` | `daily-checkin` | Parcial — ver abaixo |

## Faltando (16)

Agrupado por valor para o paciente. **Nenhuma exige backend novo**: todas consomem `/api/patient/**`, que já está no allowlist do app.

### Acompanhamento do tratamento
| Web | O que o paciente perde |
|---|---|
| `my-plan` | O plano de reabilitação que o terapeuta montou |
| `journey` | A Jornada BPR — marcos e progresso |
| `follow-up` | Adesão, progresso e outcome measures juntos |
| `records` | Histórico de tratamento |
| `recordings` | Gravar sintomas antes da consulta |
| `clinical-notes/create` | Registrar a própria observação |
| `clinical-notes/[id]` | Abrir uma nota inteira |

### Pagamentos e plano — **o que você pediu e hoje não existe no app**
| Web | O que o paciente perde |
|---|---|
| `membership` | Ver e gerenciar a assinatura |
| `plans` | Preços dos serviços e status |
| `marketplace` | Produtos, palmilhas, acessórios |
| `cancellation-policy` | A política antes de cancelar |

⚠️ **Regra da Apple:** compra dentro do app iOS esbarra na política de in-app purchase. O módulo BA já resolve com Stripe por deep link — o app abre o navegador e o pagamento acontece fora dele. É o caminho seguro para a loja.

### Engajamento e saúde
| Web | O que o paciente perde |
|---|---|
| `achievements` | Conquistas |
| `community` | Comunidade (alimentada pela Jornada) |
| `quiz` | Quiz de arquétipo da Jornada — **não é** o `quizzes` educativo |
| `blood-pressure` | Registrar pressão arterial |
| `waitlist` | Entrar na fila de espera |

## Telas que existem no app mas estão escondidas

| Tela | Por quê | Como liberar |
|---|---|---|
| `quizzes` | Os cards não abrem nada — não há tela de quiz | Portar a tela de responder |
| `wearables` / `wearable-data` | `/api/wearables` não está no allowlist mobile do middleware, então as chamadas vão para o login da web | **Uma linha** no `middleware.ts` — mudança no backend, segurada porque a atividade não toca na web |

## Lab

O módulo do laboratório **está no app inteiro** — catálogo, detalhe do exame, forma de coleta, checkout, pedidos e resultados — e hoje fica **oculto para o paciente**.

Ele é liberado por **dado, não por nova versão do app**: basta habilitar `DIAGNOSTICS` em `ClinicModuleAccess` da clínica. O QA provou isso: com a flag ligada, o Lab aparece e abre **sem novo build**; desligada, some e o acesso direto é bloqueado. É exatamente o que você quer para quando a API do laboratório estiver conectada.

Quando esse dia chegar, vale uma revisão de UX: hoje o Lab é um módulo irmão, com barra de abas e até um perfil próprio. Se ele vira parte da experiência do paciente, o natural é entrar **dentro** da área clínica, não como um segundo app ao lado.

## Divergência conhecida: exercícios

A atividade 043 aposentou a página separada de exercícios **na web** — `mod_exercises` aponta para `/dashboard/treatment`, e o menu leva para lá. O app manteve aba própria. Decidido em 22/09: o app segue a web, a aba continua existindo mas passa a abrir o plano de tratamento unificado. É a tarefa T-8.

## Idioma

O app ainda não tem tradução geral. O shell está em inglês, várias telas internas em português fixo, e os exercícios sempre em inglês porque `namePt`/`instructionsPt` vêm da API e o cliente não declara esses campos.

As telas novas ou revisadas (`consent`, `messages`) já seguem a regra: **inglês canônico**, português pelo `preferredLocale` do paciente. O resto precisa da mesma passagem.

## Separação personal × clínica

Vale para toda leitura deste documento: **aluno de estúdio não é paciente de clínica**. As 5 páginas `personalOnly` da web (`workouts`, `nutrition`, `billing`, `challenges`, `assessments`) não entram no app do paciente, e o backend só entrega os módulos do estúdio a tenant `PERSONAL_TRAINER`. O app do aluno é produto à parte.
