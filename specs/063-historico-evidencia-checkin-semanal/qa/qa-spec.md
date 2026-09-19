# QA — Atividade 063

## T-1: Histórico de relatórios de evidência

### API
1. **Happy path — múltiplos relatórios.** Fixture: paciente com 3+ `ClinicalEvidenceReport` em
   status diferentes (ex. um ARCHIVED, um DRAFT, um APPROVED), `createdAt` espaçados. `GET
   /api/admin/patients/[id]/evidence-report?history=true` com sessão de staff válida da mesma
   clínica → 200, `{ reports: [...] }` com todos os 3, ordenados `createdAt desc`.
2. **Compatibilidade — sem parâmetro.** Mesmo fixture, `GET .../evidence-report` (sem
   `?history=true`) → continua devolvendo `{ report }` só o mais recente, formato inalterado.
3. **Paciente sem relatório.** `GET .../evidence-report?history=true` → 200, `{ reports: [] }`
   (não erro).
4. **Auth.** Sem sessão → 401. Sessão de paciente (role PATIENT) → 401/403. Staff de outra clínica
   pedindo o histórico de um paciente que não é da clínica dele → 404 (mesmo comportamento de
   `staffPatientAccess` hoje, não deve mudar).
5. **PATCH em item não-mais-recente.** Marcar como revisado (`status: APPROVED`) um `reportId` que
   NÃO é o mais recente do histórico → 200, aquele item específico muda de status,
   `reviewedById`/`approvedAt` preenchidos, os outros itens do histórico continuam com seus
   status originais.

### UI
6. Admin abre a aba "Evidência" de um paciente com histórico de 3+ relatórios → timeline visível,
   ordenada do mais recente pro mais antigo, cada item com data + badge de status corretos.
7. Item mais recente aparece expandido/destacado por padrão; anteriores colapsados (clicáveis pra
   expandir).
8. Clicar "marcar como revisado" num item antigo da timeline → UI atualiza o badge daquele item
   sem afetar os outros, sem precisar recarregar a página.
9. Paciente com um relatório só → timeline mostra 1 item, sem quebra visual (regressão do estado
   atual).
10. Paciente sem nenhum relatório → estado vazio claro ("nenhum relatório gerado ainda" ou
    equivalente), sem erro no console, sem spinner infinito.
11. Regressão cross-tenant: histórico de uma clínica QA (fixture A) nunca aparece pra staff de
    outra clínica QA (fixture B).

## T-2: Card passivo de check-in semanal

### API
1. **Devido — nunca registrou, cadastro antigo.** Fixture: paciente sem nenhum
   `PatientOutcomeMeasure`, `User.createdAt` há 8+ dias. `GET .../outcome-measures/due` (sessão do
   próprio paciente) → `{ due: true }`.
2. **Não devido — nunca registrou, cadastro recente.** Mesmo fixture, mas `createdAt` há 2 dias →
   `{ due: false }`.
3. **Devido — último registro antigo.** Fixture com `PatientOutcomeMeasure.recordedAt` há 10 dias
   → `{ due: true }`.
4. **Não devido — registro recente.** `recordedAt` há 1 dia → `{ due: false }`.
5. **Auth.** Sem sessão → 401. Um paciente não pode consultar `due` de outro (a rota só lê a
   própria sessão, sem parâmetro de id — confirmar que não há como injetar outro patientId).

### UI
6. Paciente devido (fixture do cenário 1 ou 3) faz login → card de check-in aparece no dashboard,
   textos corretos no idioma ativo (testar PT e EN).
7. Paciente não devido → card não aparece em lugar nenhum do dashboard.
8. Clicar no card leva pra `/dashboard/outcome-measures`.
9. Preencher e salvar o formulário de outcome measures → voltar ao dashboard → card não aparece
   mais (o novo registro resetou a janela de 7 dias).
10. **Nenhum envio real.** Durante todo o teste (paciente devido, card aparecendo), confirmar via
    logs/AuditLog que nenhuma notificação (WhatsApp/Telegram/SMS/email) foi disparada — o card é
    puramente visual, dentro do app já autenticado.
11. Impersonação: staff impersonando um paciente devido → vê o card corretamente (mesmo
    comportamento que o paciente veria).
12. Mobile: card não quebra layout nem fica atrás do banner de impersonação (regressão do bug
    corrigido na atividade anterior — conferir com o banner de impersonação ativo ao mesmo tempo).
