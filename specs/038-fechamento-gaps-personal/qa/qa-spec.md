# QA Spec — Atividade 38: Fechamento dos gaps pequenos/médios

## T-1: Paywall no servidor
1. **API — sem acesso ao módulo, bloqueado**
   - Passos: paciente sem `mod_treatment` no plano, `GET` direto na rota/API do plano de tratamento.
   - Esperado: 403, sem dado no corpo da resposta.
2. **API — com acesso, funciona normal**
   - Passos: mesmo paciente, módulo incluído no plano.
   - Esperado: dado retornado normalmente.
3. **API — Full Access override dá acesso mesmo assim**
   - Passos: paciente com `fullAccessOverride` ligado, sem o módulo no plano.
   - Esperado: acesso liberado (VIP).
4. **API — override manual do admin (unlock) libera mesmo sem o plano**
   - Passos: admin dá unlock manual do módulo pro paciente na tela de permissões; paciente sem o módulo no plano.
   - Esperado: acesso liberado.
5. Repetir 1-4 pra `mod_exercises` e `mod_records`.

## T-2: `clinicId` obrigatório
6. **Script — backfill resolve os nulos existentes**
   - Passos: rodar o script de backfill.
   - Esperado: 0 `Appointment` com `clinicId: null` depois.
7. **Script — idempotência**
   - Passos: rodar duas vezes seguidas.
   - Esperado: segunda rodada não muda nada.
8. **Schema — `db push` com o campo obrigatório**
   - Passos: rodar `db push` depois do backfill.
   - Esperado: sem erro.
9. **API — criar agendamento sempre grava `clinicId`**
   - Passos: criar um agendamento novo por cada um dos 3 caminhos auditados (paciente, admin, voice/Vapi).
   - Esperado: `clinicId` preenchido em todos.

## T-3: Limites de plano
10. **UI — SUPERADMIN define limite**
    - Passos: `/admin/clinics` → Clinic Settings de um tenant de teste → definir `maxPatients` = 1, salvar.
    - Esperado: persiste.
11. **API — bloqueio no limite**
    - Passos: tenant já com 1 paciente (limite atingido), tentar cadastrar um segundo.
    - Esperado: recusado, mensagem clara.
12. **API — abaixo do limite, permite**
    - Passos: tenant com 0 pacientes, limite 1, cadastrar o primeiro.
    - Esperado: sucesso.
13. **API — sem limite configurado, sem enforcement**
    - Passos: tenant sem `maxPatients` definido, cadastrar vários.
    - Esperado: nenhum bloqueio.

## T-4: Marca do tenant nos emails
14. **API — tenant padrão (BPR) inalterado**
    - Passos: disparar um email de teste (ex. welcome) pra um paciente do tenant padrão.
    - Esperado: logo/cor iguais a antes da atividade.
15. **API — tenant diferente usa a própria marca**
    - Passos: mesmo teste pra um aluno de um tenant com `logoUrl`/`primaryColor` configurados.
    - Esperado: email usa a marca DAQUELE tenant.
16. **API — tenant sem marca configurada usa o fallback genérico**
    - Passos: tenant sem `logoUrl`/`primaryColor`.
    - Esperado: fallback estático, email não quebra.

## T-5: Mensalidade do personal
17. **UI — criar plano como personal, sem vocabulário clínico**
    - Passos: logar como `qa.trainer@example.test`, criar um plano em `/admin/memberships`.
    - Esperado: nenhuma string "Patient"/"Treatment" visível.
18. **UI — aluno assina o plano, sem vocabulário clínico**
    - Passos: logar como aluno, ver/assinar o plano.
    - Esperado: mesma checagem de vocabulário.
19. **API — nenhuma cobrança real durante o QA**
    - Passos: completar o fluxo de checkout em modo teste.
    - Esperado: guarda de outbound/Stripe test-mode confirma que nada real foi cobrado.
