# Atividade 38 — Fechamento dos gaps pequenos/médios da atividade 20

## Objetivo
Reconciliação de 13/09/2026 confirmou que a maioria dos itens pendentes da atividade 20 (multi-tenant clínica + personal) já tinha sido resolvida por atividades posteriores sem atualizar a doc. Sobraram 5 itens genuinamente reais, de porte pequeno/médio — esta atividade fecha todos eles. Os dois itens grandes (aulas em grupo, app do profissional) ficam de fora, pra planejar depois com calma.

## Decisões de design
- **T-8 (paywall):** reaproveitar a MESMA lógica de "acesso efetivo" (plano + override do admin) que a tela `/admin/patients/[id]/permissions` já usa pra decidir o que mostrar — só que aplicada como guarda no servidor, não só na UI. Sem módulo = sem dado, ponto (404/403, não vazamento parcial).
- **T-14 (clinicId obrigatório):** backfill primeiro (nunca perder um agendamento existente), só depois o schema vira obrigatório — mesma ordem seguida em toda migração aditiva deste projeto.
- **T-15 (limites de plano):** cresce o MESMO diálogo "Clinic Settings" que a atividade 36 já criou em `/admin/clinics` (hoje só tem o toggle do Instagram) — não cria uma tela nova. Enforcement só nos pontos de CRIAÇÃO (paciente/aluno novo, staff novo); não mexe em quem já existe acima do limite (não deleta ninguém).
- **T-17 (marca por tenant nos emails):** mesmo padrão de cascata já usado em `lib/admin-notify-email.ts` (atividade 37) — resolve pela `Clinic` do destinatário primeiro, só cai pro `SiteSettings` global quando for de fato o tenant padrão. **Termos de uso por tenant ficam de fora desta atividade** (ver Suposição 1) — é decisão de conteúdo legal, não só técnica.
- **T-26 (mensalidade do personal):** não é código novo por padrão — é QA dedicado no tenant QA Studio PT, corrigindo só o que vazar linguagem clínica ou quebrar.

## Tarefas
| T-N | Nome | Status |
|-----|------|--------|
| T-1 | Paywall: guarda de acesso a módulo no servidor (não só na UI) | concluído |
| T-2 | `Appointment.clinicId` obrigatório (backfill + schema + auditoria de escrita) | concluído |
| T-3 | Limites de plano por tenant (UI no Clinic Settings + enforcement na criação) | concluído |
| T-4 | Marca do tenant nos emails (para de usar só o `SiteSettings` global) | concluído |
| T-5 | QA de Planos/Mensalidade no contexto do personal trainer | concluído |

## Suposições
1. **Termos de uso por tenant ficam FORA desta atividade** — não existe nem o campo no schema hoje, e é uma decisão de conteúdo legal (o que cada tenant pode/deve declarar), não só técnica. Confirma que fica pra depois, ou quer que eu inclua já (mesmo que simples, ex. um campo de texto livre por clínica)?
2. **T-8:** o enforcement vale pra `mod_treatment` (plano de tratamento), `mod_exercises` (exercícios) e `mod_records` (registros/notas clínicas) — os três módulos com dado clínico sensível de verdade. Módulos mais "soft" (ex. `mod_education`, `mod_community`) não entram nessa primeira passada, a não ser que você prefira todos de uma vez.
3. **T-14:** o backfill resolve o `clinicId` de um agendamento nulo pelo `clinicId` do PACIENTE do agendamento (não do terapeuta) — se o paciente também não tiver clínica (não deveria acontecer, mas por segurança), cai pro tenant padrão em vez de travar o backfill.
4. **T-15:** os limites (`maxTherapists`/`maxPatients`) só bloqueiam criação de conta NOVA quando o limite já foi atingido — não afeta nada de quem já está cadastrado, mesmo que acima do limite (ex. um limite reduzido depois de já ter mais gente).
