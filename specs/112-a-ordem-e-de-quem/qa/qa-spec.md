# QA — Atividade 112

O teste central é sempre a **cascata**: mudar num nível e confirmar o que
acontece nos outros. Um cenário que só olha um nível passa com uma implementação
que ignora os outros dois.

## T-1 — os grupos

| # | tipo | cenário | esperado |
|---|---|---|---|
| 1.1 | UI | Ler os cabeçalhos em inglês e em português | Cada um na língua exibida |
| 1.2 | UI | Contar os módulos por grupo | Nenhum ficou sem grupo, nenhum em dois |
| 1.3 | teste | A suíte de ordem da 110 | Continua verde |

## T-2 — a clínica arrasta

| # | tipo | cenário | esperado |
|---|---|---|---|
| 2.1 | UI | Arrastar um módulo no painel e abrir o app | A ordem nova, no telefone |
| 2.2 | UI | **Clínica que nunca arrastou** (o controle) | Alfabética — sem isto, um app que sempre lê "ordem gravada" passaria |
| 2.3 | API | Módulo novo no catálogo, ordem já gravada | Aparece, em ordem alfabética entre os não-arrastados |
| 2.4 | UI | Recarregar o painel e reabrir o app | A ordem se manteve nos dois |
| 2.5 | UI | Desligar um módulo que foi arrastado | Some, e a lista fecha sem buraco |
| 2.6 | UI | Duas clínicas, ordens diferentes | Cada paciente vê a da sua — e é a parede de inquilino outra vez |

## T-3 — o paciente arruma

| # | tipo | cenário | esperado |
|---|---|---|---|
| 3.1 | UI | Arrastar no app, fechar e abrir | A ordem dele voltou |
| 3.2 | UI | Entrar noutro aparelho | A ordem dele foi junto |
| 3.3 | UI | Clínica reordena **depois** | O combinado no `plan.md` — e o cenário existe para provar qual foi |
| 3.4 | UI | Arrastar perto do topo | **Não** dispara a atualização por puxar (113) |

## T-4 — voltar

| # | tipo | cenário | esperado |
|---|---|---|---|
| 4.1 | UI | Clínica volta | Alfabética, e a tela avisou antes |
| 4.2 | UI | Paciente volta | À ordem da clínica, não ao alfabeto |
| 4.3 | API | Depois de voltar, módulo novo | Entra em ordem, e não no fim |
| 4.4 | UI | Paciente volta, clínica intacta | A ordem da clínica não se mexeu |

## O que não se faz

- Não se arrasta nada na conta de paciente real.
- QA em produção usa paciente de teste identificado.
