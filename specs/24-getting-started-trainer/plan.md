# Atividade 24 — Getting started do personal trainer

## Objetivo
Quando o trainer recebe acesso ao estúdio, ele cai num admin cheio de recursos **sem orientação**. Dar uma **orientação contextual e rápida**: um checklist "Getting started" no dashboard do admin (só tenant personal) que leva aos primeiros passos, e uma página **"How it works"** de referência. Ensinar *fazendo*, na própria ferramenta.

Decisão do usuário (2026-09-11): planejar e executar; ordem — isto antes do app.

## Decisões de design
| # | Decisão | Por quê |
|---|---|---|
| D1 | Card **"Getting started"** no dashboard admin, **só para tenant personal** (via `useVocab().isPersonal`), **dispensável** (localStorage) para não incomodar depois. | Contextual e não intrusivo |
| D2 | 5 passos, cada um com ícone + 1 linha + link para a tela certa: (1) Personalize o estúdio, (2) Convide o 1º aluno, (3) Monte o 1º treino, (4) Registre uma avaliação, (5) Acompanhe o progresso. | Cobre o caminho mínimo de valor |
| D3 | Detecção de progresso **best-effort**: passo "Convide o 1º aluno" marca-se sozinho quando `studentCount > 0` (dado já disponível no dashboard); os demais são links acionáveis. Sem API nova. | Rápido, sem back-end novo |
| D4 | Página **`/admin/studio-guide`** ("How it works") com os mesmos passos expandidos (o quê + por quê), acessível pelo card ("Full guide →"). Texto + ícones (GIFs podem entrar depois). | O "local de treinamento" que o Bruno pediu |
| D5 | Reusa o padrão do `OnboardingWizard`/`StudioLinksCard` já existentes. Inglês UK (base do sistema). | Consistência + velocidade |

## Tarefas
| T-N | Nome | Status |
|-----|------|--------|
| T-1 | Card "Getting started" no dashboard admin (personal, dispensável, 5 passos, detecção de aluno) | concluído (QA) |
| T-2 | Página `/admin/studio-guide` ("How it works") + link a partir do card | concluído (QA) |

## Suposições
1. Personal only: não aparece para clínica (via `isPersonal`).
2. Sem API nova; contagem de alunos vem do `stats` já carregado no dashboard.
3. "How it works" v1 é texto + ícones; GIFs/prints entram depois se quiser.
4. Sem item de nav novo agora — a página é alcançada pelo card ("Full guide"). Item de menu fixo pode vir depois.
5. Inglês UK.

## QA (resumo — detalhes em qa/qa-spec.md)
- Trainer (personal) no `/admin` vê o card "Getting started" com 5 passos; "Convide o 1º aluno" aparece concluído quando há ≥1 aluno.
- Dispensar o card → some (e continua sumido após reload, via localStorage).
- Clínica (admin) **não** vê o card.
- `/admin/studio-guide` abre e lista os passos; link do card leva até lá.
