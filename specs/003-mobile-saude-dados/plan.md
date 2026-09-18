# Atividade 3 — App nativo do paciente: Saúde & Dados (Fase 2)

**Status geral:** concluído (T-1 a T-4 com QA aprovado)
**Criada em:** 07/06/2026
**Depende de:** Atividades 1 e 2 (concluídas)

> Documento sujeito à revisão do responsável técnico.

## Objetivo
Adicionar à área do paciente as telas de **Pressão arterial**, **Tarefas**, **Documentos**
e **Educação**, consumindo as APIs existentes via auth dual.

## Decisões
- Reusa a auth dual (Atividade 2). `/api/patient/*` já está coberto (allowlist + `getEffectiveUser`).
- `/api/education` usa `getServerSession` e está fora da allowlist → T-4 ajusta (dual + allowlist).
- Novas abas/telas dentro do grupo protegido `(app)`.

## APIs (confirmadas)
| Recurso | Rota | Métodos | Auth atual |
|---------|------|---------|-----------|
| Pressão arterial | `/api/patient/blood-pressure` | GET {readings}, POST | `getEffectiveUser` (dual ✓) |
| Tarefas | `/api/patient/tasks` | GET {tasks}, PATCH (taskId,status) | dual ✓ |
| Documentos | `/api/patient/documents` | GET {documents} | dual ✓ |
| Educação | `/api/education` | GET | `getServerSession` (ajustar) |

## Tarefas
| Tarefa | Nome | Status | Depende de |
|--------|------|--------|------------|
| T-1 | Pressão arterial: histórico + registrar leitura | concluído | — |
| T-2 | Tarefas: lista + marcar concluída | concluído | — |
| T-3 | Documentos: lista + abrir | concluído | — |
| T-4 | Educação: lista + detalhe (+ auth dual na rota) | concluído | — |

## Suposições
1. Pressão arterial: registrar systolic/diastolic (+pulse opcional); histórico em lista.
2. Tarefas: marcar como `completed` via PATCH; sem criação pelo paciente.
3. Documentos: listar e abrir (link/preview); upload fora desta fase.
4. Educação: listar conteúdos atribuídos e ver detalhe; progresso fora desta fase.
5. Onde couber, adicionar entrada de navegação (aba "Saúde" agrupando, ou abas extras).
6. QA via Expo Web + Playwright; seed estendido conforme necessário.

## Critério de pronto
- [ ] As 4 telas exibem dados reais do paciente autenticado (bearer).
- [ ] Registrar pressão e marcar tarefa persistem.
- [ ] Web (cookie) sem regressão nas mesmas rotas.
- [ ] Todas as tarefas com `qa/report-t-N.md` aprovado e review feito.
