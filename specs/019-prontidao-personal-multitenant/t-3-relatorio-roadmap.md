# T-3: Relatório consolidado + roadmap

**Status:** concluído
**Depende de:** T-1, T-2

## Objetivo
Consolidar T-1 + T-2 num relatório único priorizado e propor as fases de implementação (cada fase vira uma atividade própria).

## Critérios de aceite
- [x] `qa/report-final.md` com achados confirmados em runtime vs. só estáticos.
- [x] Roadmap em fases, com o que bloqueia o primeiro tenant externo.

## Roadmap proposto

**Decisão antes de tudo (suposição 2 do plan):** o aluno pode pertencer a mais de um tenant?
Se sim, `User.clinicId` vira uma tabela de vínculo usuário↔tenant (papel por tenant). Isso muda
todas as consultas — tem que ser decidido antes da Fase 1, não depois.

| Fase | O quê | Por quê agora |
|---|---|---|
| **0 — Segurança** | Helper único de acesso por tenant (modelo: `foot-scans/[id]`), aplicado em C1–C4 e nas rotas de staff da A5; `withClinicFilter` passa a falhar fechado; suíte automatizada com os cenários ISO-* | C1 vale **hoje em prod** (paciente lê avaliação de outro paciente). O resto vira vazamento no dia em que entrar o 2º tenant |
| **1 — Fundação multi-tenant** | Cadastro por link/código do tenant (web, Google, app); agenda escopada (profissionais, disponibilidade, agendamento, horário público); backfill de `clinicId` nos agendamentos/disponibilidades de prod; fim dos fallbacks "primeira clínica"; Stripe Connect no checkout; limites do plano | Sem isso não dá para abrir o 2º tenant |
| **2 — Identidade do tenant** | White-label (nome, logo, cores, domínio vindos da `Clinic`; tirar BPR fixo); config por tenant; **tipo de tenant** (clínica × personal) controlando vocabulário (paciente/aluno, tratamento/treino) e módulos obrigatórios (triagem opcional para personal) | O personal não pode ver "BPR" nem "SOAP" |
| **3 — Produto do personal** | Modelo de treino (A/B/C, ordem, supersets, semanas); carga, RPE/RIR, cadência e progressão na prescrição; registro por série no app; aula em grupo; mensalidade/pacotes | É o que o personal usa no dia a dia |
| **4 — App do profissional** | Modo profissional no app: agenda do dia, prescrição rápida, ver registros dos alunos | Hoje o personal só trabalha pela web |
