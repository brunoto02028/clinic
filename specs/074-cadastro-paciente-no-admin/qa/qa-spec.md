# QA Spec — 074: Cadastro do paciente no admin

## T-1 — Backend

### API — happy path
1. `GET /api/admin/patients/[id]` (paciente fixture com todos os
   campos preenchidos) → `200`, resposta inclui `address`,
   `dateOfBirth`, `emergencyContactName`, `emergencyContactPhone`,
   `emergencyContactRelation` com os valores corretos.
2. `GET` de um paciente sem nenhum desses campos preenchidos → `200`,
   todos vêm `null` (não quebra, não omite as chaves).
3. `PATCH { action: "edit_registration", address: "novo endereço" }` →
   `200`, `address` atualizado; demais campos preservados (não
   apagados por omissão).
4. `PATCH` com `emergencyContactName: ""` (string vazia explícita) →
   `200`, campo grava `null` no banco (confirmar via SELECT direto,
   não só pela resposta da API).
5. `PATCH` alterando `firstName`/`lastName` → `200`, refletido também
   no cabeçalho/listagem de pacientes (não só no card).
6. `PATCH` alterando `dateOfBirth` pra uma data válida → `200`,
   persistido como `DateTime` correto (checar timezone não desloca o
   dia).

### API — entrada inválida
7. `PATCH { action: "edit_registration", firstName: "" }` → `400`,
   nome não é apagado no banco.
8. `PATCH { action: "edit_registration", dateOfBirth: "not-a-date" }`
   → `400`, não estoura 500, campo não é alterado.
9. `PATCH { action: "edit_registration" }` (nenhum campo válido) →
   comportamento definido (idealmente `400` "nada pra atualizar", não
   um update vazio silencioso).

### Auth / tenant isolation
10. `PATCH edit_registration` num paciente de OUTRA clínica (sessão de
    staff da clínica A tentando editar paciente da clínica B) → `403`
    ou `404` (mesmo padrão do resto da rota), paciente da clínica B
    não é alterado.
11. Requisição sem sessão válida → redirect `307` pro `/login` (padrão
    do `middleware.ts` pra toda `/api/admin/*`, não um `401` JSON —
    confirmado no QA de 24/09/2026, ver report.md).

### Auditoria
12. Depois de um `PATCH edit_registration` bem-sucedido, existe um
    `AuditLog` novo com `action: "PATIENT_REGISTRATION_UPDATED"`,
    `entityId` = id do paciente, e a descrição lista os campos que
    mudaram (não os valores em texto puro).

## T-2 — Frontend

### UI — visualização
13. Abrir `/admin/patients/[id]` de um paciente com cadastro completo
    → card "Registration" visível logo no topo da aba Summary, antes
    do bloco de Invite Link, com todos os campos preenchidos e
    formatados (data em `DD/MM/YYYY`, idade calculada ao lado).
14. Abrir um paciente SEM nenhum campo de cadastro preenchido → card
    aparece com placeholders limpos ("—"), não quebra layout nem
    lança erro no console.

### UI — edição
15. Clicar "Edit" → campos viram inputs editáveis; e-mail continua só
    leitura (não aparece um input de e-mail no card).
16. Editar telefone + endereço, clicar "Save" → card volta pro modo
    leitura com os novos valores, sem reload da página (chamada de
    rede confirmada via devtools/network).
17. Editar `dateOfBirth` pelo seletor de data → salva corretamente,
    idade recalculada na tela.
18. Tentar salvar com nome vazio → mensagem de erro visível pro staff,
    formulário permanece em modo edição (não perde o que foi digitado).
19. Cancelar edição (se houver botão "Cancel"/fechar sem salvar) →
    volta ao modo leitura com os valores originais, sem chamar a API.

### Regressão
20. Resto da aba Summary (Invite Link, Quick Actions, Red Flags,
    Adherence panel) continua funcionando normalmente com o card novo
    acima.
21. Isolamento de tenant no lado UI: sessão de staff de outra clínica
    não consegue nem abrir a página deste paciente (comportamento já
    existente, só confirmar que não regrediu).
