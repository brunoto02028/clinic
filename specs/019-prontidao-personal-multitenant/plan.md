# Atividade 19 — Prontidão para personal trainers e multi-tenant (auditoria)

## Objetivo

Auditar — com code review e QA em runtime — se o sistema está pronto para ser
usado por **vários tenants**: várias clínicas **e** vários personal trainers,
cada um com seus alunos na web e no app.

Não altera código. O entregável é o **relatório de achados com evidência** e um
**roadmap priorizado** do que precisa mudar.

## Escopo

| Visão | O que se verifica |
|---|---|
| Profissional (personal/fisio) | prescrever treino, agendar sessões, disponibilidade, biblioteca de vídeos |
| Aluno — web e app | receber treino + vídeo, ver agenda, agendar com o seu profissional |
| Multi-tenant | isolamento de dados entre tenants, cadastro do aluno no tenant certo, branding e vocabulário, pagamento e plano por tenant |

## Método

- **T-1 — code review estático:** schema, middleware, helpers de tenant, rotas de API, app mobile.
- **T-2 — QA em runtime:** banco **local**, com um segundo tenant de teste ("QA Studio PT") criado por fixture.
- **T-3 — relatório e roadmap:** achados priorizados + fases de implementação.

## Decisões

- Escrita **só no banco local**. Prod: apenas leitura de contagens, sem PII.
- Nenhum teste destrutivo em registro real: DELETE só contra o paciente descartável `qa.pacientea@example.test`.
- Severidade: **Crítico** (vazamento/perda de dados entre tenants ou pacientes) · **Alto** (bloqueia multi-tenant) · **Médio** (bloqueia uso por personal) · **Baixo**.

## Tarefas

| T-N | Nome | Status |
|-----|------|--------|
| T-1 | Code review estático de isolamento e prontidão | concluído |
| T-2 | QA runtime com segundo tenant | concluído (resultado: REPROVADO — ver qa/report-t-2.md) |
| T-3 | Relatório consolidado + roadmap | concluído (qa/report-final.md) |

## Suposições (validar com o Bruno)

1. **Personal trainer = um tenant (`Clinic`)** com 1+ profissionais; aluno = `PATIENT`. Alternativa seria o personal como usuário avulso numa plataforma aberta — muda o modelo de dados.
2. **Um aluno pode ter mais de um profissional/tenant** (ex.: aluno do personal que também é paciente da clínica). Hoje o schema não permite (`User.email` único global + um único `clinicId`).
3. O app é o mesmo (`mobile/`), com módulos por tenant — não um app por tenant.
4. Pagamento de cada tenant deve cair na conta Stripe **do tenant** (Stripe Connect), não na da plataforma.
