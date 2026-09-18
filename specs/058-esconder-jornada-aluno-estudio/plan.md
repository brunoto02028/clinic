# Atividade 58 — Esconder a Jornada do aluno de estúdio

## Objetivo
O aluno de um estúdio de personal não vê a "Jornada" (gamificação de reabilitação da BPR): missões de check-in de dor, "exercícios do plano de tratamento", artigos, e o quiz de arquétipo que termina oferecendo produtos da loja da BPR.

## Decisão do Bruno (18/09/2026)
"esconde a jornada do aluno para o personal". Segue a regra de que a área do aluno é independente da área do paciente.

## Decisões de design
- **Menu:** `mod_journey` sai do menu do aluno de estúdio (`CLINICAL_PATIENT_KEYS` em `components/dashboard/patient-sidebar.tsx`).
- **URL:** `/dashboard/journey` e `/dashboard/quiz` (o quiz de arquétipo da Jornada, **não** `/dashboard/quizzes`) entram em `PERSONAL_BLOCKED_PATIENT_ROUTES`, e o aluno é redirecionado para `/dashboard`. A API `/api/patient/journey` **não** é bloqueada, porque a Comunidade usa `/api/patient/journey/community`.
- **Comunidade vazia:** o botão "Comece sua jornada" some para o aluno de estúdio, porque levaria a uma rota bloqueada.
- **Lado do personal:** o "Journey Control Centre" (`/admin/journey`) continua, porque é por ali que ele chega a Quizzes, Achievements e Conditions.
- **Clínica:** não muda.

## Tarefas
| T-N | Nome | Status |
|-----|------|--------|
| T-1 | Jornada fora do menu, da URL e da Comunidade vazia para o aluno de estúdio | concluído |

## Pergunta em aberto
Os posts da Comunidade ("Victory Wall") nascem das conquistas da Jornada. Sem a Jornada, a Comunidade do aluno de estúdio tende a ficar vazia. Esconder a Comunidade também?
