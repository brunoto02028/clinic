# QA — Atividade 24 (Getting started do trainer)

Ambiente: dev local + fixtures (trainer `qa.trainer@example.test`, clínica admin `qa.admina@example.test`). Prod não tocada.

## T-1 — card getting started
- **UI**: trainer em `/admin` vê "Getting started" com 5 passos e link "Full guide". Passo "Invite your first student" concluído quando há ≥1 aluno (fixtures têm alunos no estúdio).
- **UI**: Dismiss → card some; reload → continua sumido (localStorage).
- **UI (regressão)**: admin de clínica (`qa.admina`) **não** vê o card.

## T-2 — página guide
- **UI**: `/admin/studio-guide` abre, lista os 5 passos com links; o link "Full guide →" do card leva até ela.
