# QA — Atividade 55 (1º uso do personal e do aluno)

## Ambiente
Local, dev :4002, fixtures (`scripts/qa/tenant-fixtures.cjs`, senha `QaTenant#2026`): `qa.trainer` e `qa.aluno` (estúdio `qa-studio-pt`), `qa.admina` e `qa.pacientea` (clínica A). Envio de e-mail desligado. Playwright com contexto novo por rodada. Em toda tarefa: **regressão da clínica** (qa.admina/qa.pacientea) sem mudança.

| # | Tarefa | Tipo | Passos | Esperado |
|---|---|---|---|---|
| 1.1 | T-1 | UI/API | `qa.aluno`: `/dashboard`, `/dashboard/appointments/book`, `/dashboard/education` | sem "Upgrade your plan" nem "£0.90"; agenda sessão |
| 1.2 | T-1 | API | `qa.aluno` GET `/api/patient/access` | módulos liberados; `reasons` = `studio` |
| 1.3 | T-1 | UI | trainer esconde/trava um módulo do aluno em Permissions | o módulo some/trava para o aluno |
| 1.4 | T-1 | UI | `qa.pacientea` (sem plano) | paywall da clínica igual a antes |
| 2.1 | T-2 | UI | `qa.aluno`: menu (1366 e 390) | sem "Exercises" (rota bloqueada) e sem "How It Works" (guia BPR); os outros itens abrem sem redirecionar |
| 2.2 | T-2 | UI | `qa.pacientea`: menu | igual a antes |
| 3.1 | T-3 | UI | `qa.aluno`: `/dashboard/consent` (EN e PT) | termo de treino com o nome do estúdio; nenhum "clinical"/"treatment"/"Bruno Physical Rehabilitation" |
| 3.2 | T-3 | UI | anônimo: `/join/qa-studio-pt` → link/aceite de termos | termo de treino do estúdio |
| 3.3 | T-3 | UI | `qa.pacientea`: `/dashboard/consent` | termo da BPR, igual a antes |
| 4.1 | T-4 | UI/API | trainer: ficha do aluno → Summary → Onboarding; lembrete (Preview) | sem "Submit medical screening" |
| 4.2 | T-4 | UI | `qa.aluno`: onboarding do dashboard | sem passo de triagem |
| 4.3 | T-4 | UI | clínica A: paciente sem triagem | triagem continua pendente |
| 5.1 | T-5 | UI | anônimo: `/studio/qa-studio-pt` e `/join/qa-studio-pt` | `<title>` com o nome do estúdio; `/join` sem o menu/rodapé da BPR |
| 5.2 | T-5 | UI | `qa.aluno`: páginas do portal | `<title>` com o nome do estúdio |
| 5.3 | T-5 | UI | `/login`, `/join/<clínica>` e portal do paciente A | iguais a antes |
| 6.1 | T-6 | UI | trainer: ficha do aluno | sem aba "Exercises"; "Workouts" funciona |
| 6.2 | T-6 | UI | admina: ficha do paciente | aba "Exercises" continua |
| 7.1 | T-7 | UI | trainer: ficha do aluno → "View as Student" | abre a home do **aluno** ("Welcome to …"), não "Therapist Dashboard"; "Voltar ao Admin" funciona |
| 8.1 | T-8 | UI | trainer num estúdio sem exercícios com vídeo: biblioteca | estado vazio com instruções de como adicionar exercício com vídeo |
| 8.2 | T-8 | UI | trainer: Workouts → "Generate with AI" sem exercícios com vídeo | mensagem clara + link para a biblioteca |
| 9.1 | T-9 | UI | crawl do admin do trainer e do portal do aluno (script da revisão) | nenhum "patient/clinic/therapist/treatment/BPR" nas telas do menu (exceto nomes próprios) |
| 10.1 | T-10 | UI | trainer: `/admin` | "Trainers" conta o personal; ícones sem estetoscópio |
