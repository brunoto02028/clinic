# Atividade 59 — Comunidade fora do aluno de estúdio e limpeza do "Journey" do personal

## Objetivo
Terminar o que a 058 começou.
- **Aluno de estúdio:** fica sem a Comunidade, que vive das conquistas da Jornada e ficaria vazia.
- **Personal:** o "Journey Control Centre" sai, porque é todo da gamificação da Jornada. Ele passa a chegar direto em **Quizzes** e **Conquistas**, que os alunos continuam usando e que hoje não têm entrada no menu dele.

## Decisão do Bruno (18/09/2026)
"sim, pode corrigir e limpar o que vc achou necessário". A resposta cobre esconder a Comunidade e limpar o Journey Control Centre.

## Diagnóstico
- **Abas do `/admin/journey`:** Overview (XP e jogadores da Jornada), Challenges (desafios da Comunidade), Marketplace (API já bloqueada para estúdio), Triggers (disparo de notificações da Jornada), Leaderboard (XP) e AI Coach (API já bloqueada). Nada disso serve ao estúdio sem Jornada nem Comunidade. No tema escuro, o título e os números quase não aparecem.
- **`/admin/quizzes` e `/admin/achievements`:** não têm link no menu atual. Só aparecem nas `matchRoutes` da aba Journey.
- **Filtro das abas (`components/admin/section-tabs.tsx`):** só esconde `clinicalOnly` para o personal e **não** esconde `personalOnly` para a clínica. Hoje a clínica vê a aba "Programs", que a redireciona.

## Decisões de design
- **Aluno (T-1):**
  - `mod_community` sai do menu do aluno de estúdio;
  - `/dashboard/community` e `/api/patient/journey` (que inclui community, quiz e marketplace) ficam bloqueados por URL para estúdio.
  - A clínica não muda.
- **Personal (T-2):**
  - a aba "Journey" vira `clinicalOnly`;
  - entram as abas `personalOnly` "Quizzes" e "Achievements" (Conquistas), na seção de alunos;
  - `/admin/journey` e `/api/admin/journey` ficam bloqueados por URL para o personal. `/api/admin/conditions` continua, porque Quizzes e Achievements usam.
- **Filtro das abas:** passa a esconder `personalOnly` para a clínica, igual ao menu lateral (`visibleAdminSections`). Quando a aba ativa pelo caminho está escondida, o destaque vai para a primeira aba visível que casa com a rota.
- **Clínica:** só perde a aba "Programs", que era quebrada para ela. O resto não muda.

## Tarefas
| T-N | Nome | Status |
|-----|------|--------|
| T-1 | Comunidade fora do menu e da URL do aluno de estúdio | concluído |
| T-2 | Personal: Quizzes e Conquistas no menu; Journey Control Centre fora (menu e URL); filtro de abas correto | concluído |

## Alertas (fora do escopo)
- Na clínica, o `/admin/journey` tem título e números quase invisíveis no tema escuro.
- O rótulo PT "Exercicios" (sem acento) na aba de exercícios.
