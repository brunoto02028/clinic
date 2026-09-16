# QA — Ativ. 48: Linha do tempo de atividade do paciente

## T-1 — Endpoint agregador

**API**
1. `GET /api/admin/patients/{id}/activity` sem sessão → 401.
2. Staff sem clínica resolvida (mock/edge case) → 403 `{ error: "No clinic resolved for this account" }`, nenhuma query dispara.
3. Paciente de outra clínica → 404.
4. Paciente real da própria clínica, sem `limit`/`offset` → 200, `events` ordenado por `at` desc, `hasMore` coerente com o total.
5. `?limit=1&offset=0` depois `?limit=1&offset=1` → segundo evento diferente do primeiro, sem repetir.
6. Paciente sem nenhuma atividade → 200 com `events: []`, `hasMore: false`.

## T-2 — Vídeo assistido

**API**
1. `POST /api/patient/activity/video-watched` sem sessão → 401.
2. Sessão de paciente + `exerciseId` inválido → 404.
3. Sessão de paciente + `exerciseId` válido → 204, cria linha em `AuditLog` com `action: "VIDEO_WATCHED"`.

**UI**
4. Paciente abre um vídeo de exercício na página de tratamento → modal abre imediatamente (sem
   esperar o POST) → conferir depois que o evento apareceu na aba Atividade (admin).

## T-3 — Aba Atividade (admin)

**UI**
1. Abrir o perfil de um paciente com atividade real → aba "Atividade" mostra a timeline, mais
   recente primeiro, com ícone/título/horário por item.
2. Paciente sem atividade → estado vazio "Nenhuma atividade registrada ainda."
3. Clicar "Carregar mais" → nova página de eventos aparece, sem duplicar os já exibidos; some quando
   `hasMore: false`.

## T-4 — Ponta a ponta

1. Paciente real (Ana Livia) com login + exercício feito + vídeo assistido aparecendo corretamente
   na aba, com prints.
2. SUPERADMIN com Active Clinic diferente da clínica da Ana → `GET .../activity` da Ana → 404
   (confirmar que não vaza dado de outra clínica).
