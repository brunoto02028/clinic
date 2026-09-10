# QA Spec — Atividade 20 (multi-tenant: clínicas e personal)

Ambiente: **somente local** (`next dev` numa porta nova a cada rodada, banco `bpr_clinic_local`). Nunca prod.
Autenticação: sim — sessão web (cookie) e Bearer do app (`/api/mobile/login`).
Fixtures: `scripts/qa/tenant-fixtures.cjs` (criado na T-2) sobe dois tenants: **A** = clínica (tipo CLINIC) e **B** = personal (tipo PERSONAL_TRAINER). Cada um tem profissional, aluno ou paciente, exercício e agendamento. A limpeza fica em `scripts/qa/tenant-cleanup.cjs`.

**Regras de todo QA:**
- A guarda de e-mail (T-1) precisa estar ativa. Qualquer `Sent via Resend` no log reprova a rodada.
- DELETE só em registros de fixture.
- **Regressão da clínica (REG)** em toda tarefa que mexe em rota ou tela usada pela BPR:
  - o staff do tenant padrão continua vendo os mesmos pacientes e a mesma agenda;
  - o paciente da BPR continua vendo exercícios e agenda como antes.

## T-1 — Guarda de e-mail
| Tipo | Passos | Esperado |
|---|---|---|
| API | Criar agendamento local (dispara notificação) | Registro criado; log `[OUTBOUND-SINK]`; nenhum `Sent via Resend` |
| Unit | Destino na `OUTBOUND_ALLOWLIST` (teste unitário — em runtime dispararia envio real) | Enviado só quando todos os destinos estão na lista |
| Review | Caminho de produção | Sem mudança de comportamento com `NODE_ENV=production` |

## T-2 — tenant-access + fixtures
| Tipo | Passos | Esperado |
|---|---|---|
| Unit | `npx jest __tests__/tenant` | Verde: cada papel × mesmo tenant, outro tenant e `clinicId` nulo |
| Script | Rodar fixtures 2× e depois a limpeza | Idempotente; aborta se `DATABASE_URL` não for local; a limpeza não deixa nada para trás |

## T-3 — Avaliação corporal
| Tipo | Passos | Esperado |
|---|---|---|
| API | Paciente A → `GET /api/admin/body-assessments/{avaliação de outro paciente A}` | 403/404 |
| API | Staff B → avaliação do tenant A (GET, PUT, analyze, generate-notes, send-to-patient, upload-photo, report-pdf) | 404 em todas |
| API | Staff A → avaliação do próprio tenant | 200 |
| API | Paciente A → a própria avaliação (rota do paciente e PDF) | 200 |
| REG | SUPERADMIN do tenant padrão → lista e ficha de avaliações | Iguais a antes |

## T-4 — Prontuário por ID
| Tipo | Passos | Esperado |
|---|---|---|
| API | Staff B → `GET/PATCH /api/admin/patients/{pacienteA}` e sub-rotas (messages, questions, invite, atlas-chat, documents/generate, protocol-revise) | 404 |
| API | Staff B → `GET/PATCH/DELETE /api/patients/{pacienteA}` | 404; paciente continua no banco |
| API | Staff B → `/api/soap-notes/{nota A}` (GET, PUT, DELETE, PDF) | 404 |
| API | Staff B → `/api/admin/screening/{triagem A}` e `/api/admin/users/{usuário A}` | 404 |
| API | Staff A → os mesmos registros do próprio tenant | 200; o DELETE apaga só PATIENT |
| REG | SUPERADMIN → ficha completa de paciente da BPR | Igual a antes |

## T-5 — Agenda
| Tipo | Passos | Esperado |
|---|---|---|
| API | Aluno B → `GET /api/therapists` | Só profissionais de B |
| API | Aluno B → `GET /api/availability?therapistId={profissional A}` | 404 |
| API | Aluno B → `GET /api/availability` com Bearer do app | 200 (hoje devolve 307) |
| API | Aluno B → `POST /api/appointments` com profissional A | 404; nada criado |
| API | Aluno B → `POST /api/appointments` sem profissional | Atribuído a um profissional **reservável** de B; `clinicId` = B |
| API | Staff B → `GET /api/appointments?viewAll=true` | Só agendamentos de B |
| API | Staff B → `POST /api/appointments` com paciente A | 404 |
| API | Reagendar agendamento de outro tenant | 404 |
| API | `GET /api/public/schedule` | Horário do tenant padrão; `?clinic=<slug>` devolve o do tenant |
| REG | Paciente da BPR agenda com o Bruno | Funciona como antes; `clinicId` gravado |

## T-6 — Demais rotas de staff
| Tipo | Passos | Esperado |
|---|---|---|
| Doc | `qa/triagem-rotas.md` | Cada rota da varredura classificada: **tenant**, **plataforma (só SUPERADMIN)** ou **usuário** |
| API | Uma amostra por grupo (clinical-scribe, education, image-library, upload, packages, dashboard/stats, payments, agent, clinics, broadcasts, email-config) acessada por staff B contra recurso de A | 404/403 |
| API | Rota de plataforma chamada por ADMIN de tenant | 403 |
| REG | Telas do admin da BPR que usam essas rotas | Sem erro |

## T-7 — Suíte automatizada
| Tipo | Passos | Esperado |
|---|---|---|
| Script | `npm run test:tenants` com o dev server local | Sobe os fixtures, roda todos os ISO-* da atividade 19 (+ X1), limpa, sai com 0 |
| Script | Reverter de propósito uma checagem (ex.: T-3) e rodar | A suíte falha apontando o cenário |

## T-8 — Paywall pela URL
| Tipo | Passos | Esperado |
|---|---|---|
| UI | Paciente sem plano → `/dashboard/appointments/book` direto | Bloqueado, como no menu |
| UI | Paciente com plano ou `fullAccessOverride` | Acessa normalmente |

## T-9 — Lista de pacientes
| Tipo | Passos | Esperado |
|---|---|---|
| UI | `/admin/patients` | Console sem erro de hidratação nem de `key`; links e ações funcionando |

## T-10 — Consentimento
| Tipo | Passos | Esperado |
|---|---|---|
| UI | Paciente novo aceita os termos e abre `/dashboard/screening` | Sem o bloqueio de "Terms & Consent Required" |

## T-11 — Token do paciente
| Tipo | Passos | Esperado |
|---|---|---|
| API | Login de paciente (web session e `/api/mobile/login`) | Flags de staff ausentes ou `false` |
| API | Login de staff | Flags inalteradas |

## T-12 — Tipo de tenant + tenant padrão
| Tipo | Passos | Esperado |
|---|---|---|
| DB | Migração | `clinics.type` existe, padrão `CLINIC`; clínicas atuais continuam `CLINIC` |
| API | Signup, Google e fallbacks sem slug | Vão para o tenant **padrão** (`DEFAULT_CLINIC_SLUG`), nunca para o `findFirst` |
| API | Duas clínicas e nenhum `DEFAULT_CLINIC_SLUG` | Erro explícito no log; nada atribuído ao acaso |
| REG | Cadastro web de paciente na BPR | Igual a antes |

## T-13 — Entrada do aluno
| Tipo | Passos | Esperado |
|---|---|---|
| UI | `/join/{slug B}` → cadastro | Aluno criado com `clinicId` = B; a página mostra o tenant B |
| API | `POST /api/mobile/register` com `tenantSlug` B | `clinicId` = B |
| API | `POST /api/mobile/register` sem slug | Tenant padrão (não `null`) |
| API | Slug inexistente ou tenant inativo | 404 |
| API | Convite do profissional de B | Aluno entra em B |

## T-14 — Backfill da agenda
| Tipo | Passos | Esperado |
|---|---|---|
| Script | Backfill em dry-run | Lista o que mudaria e não escreve nada |
| Script | Backfill real, 2× | Zero `clinicId` nulo em appointments e availability; idempotente |
| API | Toda criação de agendamento e disponibilidade | Grava `clinicId` |

## T-15 — Gestão de tenants
| Tipo | Passos | Esperado |
|---|---|---|
| UI | SUPERADMIN cria tenant (tipo, admin inicial, módulos, plano) | Tenant criado; o admin recebe o convite (vai para o sink) |
| API | ADMIN de tenant chama a API de tenants | 403 |
| API | Tenant no limite `maxPatients` cria mais um aluno | Bloqueado, com mensagem clara |

## T-16 — Stripe Connect (modo teste)
| Tipo | Passos | Esperado |
|---|---|---|
| UI | Admin B inicia o onboarding | Redireciona ao link do Stripe (teste); ao voltar, status "pendente/concluído" |
| API | Checkout de aluno B com Connect ativo | Sessão com `transfer_data.destination` = conta de B |
| API | Checkout de paciente da BPR | Igual a antes, sem Connect |
| API | Tenant sem onboarding tenta cobrar | Mensagem clara; nenhuma cobrança na conta da plataforma |

## T-17 — Marca por tenant
| Tipo | Passos | Esperado |
|---|---|---|
| UI | Admin B, aluno B e `/join/{slug B}` | Nome, logo e cores de B; nenhum "BPR" na área logada |
| UI | Termos e consentimento do aluno B | Texto do tenant B (ou modelo neutro) |
| E-mail | Notificação ao aluno B (no sink) | Remetente e assinatura de B |
| REG | Área logada da BPR | Visual idêntico ao atual |

## T-18 — Vocabulário
| Tipo | Passos | Esperado |
|---|---|---|
| UI | Telas do personal e do aluno de B, em EN e PT | "Student/Aluno", "Trainer/Personal", "Workout/Treino"; sem "Patient", "SOAP" ou "Clinical" |
| REG | Telas da BPR | Textos inalterados |

## T-19 — Onboarding do personal
| Tipo | Passos | Esperado |
|---|---|---|
| UI | Aluno novo de B | Perfil → termos de B → questionário de prontidão → primeira sessão; sem triagem médica clínica |
| UI | Módulos do aluno B | Treino, agenda e vídeos liberados pelo tenant; sem o paywall da BPR |
| UI | Diálogo de nova sessão do personal B | Serviços e preços do tenant B, não a lista fixa de fisioterapia |
| REG | Onboarding do paciente da BPR | Igual a antes (com triagem) |

## T-20 — Modelo e API de treino
| Tipo | Passos | Esperado |
|---|---|---|
| DB | Migração aditiva | Tabelas novas; nenhuma tabela existente alterada |
| API | Personal B: CRUD de treino do aluno B (exercícios, ordem, superset, séries, faixa de reps, carga, RPE/RIR, cadência, descanso) | 200; validação de faixas (ex.: RPE 1–10) |
| API | Personal B → treino do aluno A, ou staff A → treino do aluno B | 404 |
| API | Tenant tipo CLINIC chama a API de treino | 403 (módulo desligado) |

## T-21 — Montagem pelo personal (web)
| Tipo | Passos | Esperado |
|---|---|---|
| UI | Ficha do aluno B → aba Treinos → criar Treino A com 3 exercícios da biblioteca (com vídeo), superset e cargas | Salvo e reaberto igual |
| UI | Duplicar treino e editar semana/progressão | Cópia independente |
| REG | Ficha do paciente da BPR | Sem aba Treinos |

## T-22 — Aluno web
| Tipo | Passos | Esperado |
|---|---|---|
| UI | Aluno B → treino do dia → registrar séries (carga, reps, RPE) | Registro salvo; histórico mostra a sessão |
| UI | Vídeo do exercício | Toca (ou placeholder se não houver) |
| API | Aluno B tenta registrar num treino de outro aluno | 404 |

## T-23 — App do aluno
| Tipo | Passos | Esperado |
|---|---|---|
| App (web) | `expo start --web`; login do aluno B | Módulo Treino aparece; treino do dia com vídeo; registrar séries |
| API | `/api/mobile/modules` para o aluno B e para o paciente da BPR | "treino" só para B |

## T-24 — Progresso
| Tipo | Passos | Esperado |
|---|---|---|
| UI | Personal B → aluno B após 2 sessões registradas | Aderência, volume e evolução de carga por exercício |

## T-25 — Aulas em grupo
| Tipo | Passos | Esperado |
|---|---|---|
| UI | Personal B cria aula com capacidade 2 | Listada na agenda |
| UI/API | 2 alunos reservam; o 3º tenta | O 3º é bloqueado (lotada) |
| UI | Personal marca presença | Salva |
| API | Aluno de outro tenant tenta reservar | 404 |

## T-26 — Planos do personal
| Tipo | Passos | Esperado |
|---|---|---|
| UI | Personal B cria plano mensal | Listado para os alunos de B |
| API | Aluno B assina (Stripe teste, Connect) | Assinatura ativa; módulos do plano liberados |

## T-27 — Modo profissional no app
| Tipo | Passos | Esperado |
|---|---|---|
| App (web) | Login do personal B | Módulo "Pro": agenda do dia, alunos, últimos registros; ajuste rápido de carga |
| API | Personal B vê só os próprios alunos | Nada de outro tenant |

## Limpeza (toda rodada)
- `node scripts/qa/tenant-cleanup.cjs`; conferir contagem zero de fixtures.
