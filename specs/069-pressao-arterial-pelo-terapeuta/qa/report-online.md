# QA online (produção) — atividade 069 — commit 47a8df33

**Veredito: APROVADO**, sem bugs. Executado em https://bpr.clinic (buildDate 2026-09-22T08:03:45Z), com Chromium real via Playwright (biblioteca, não MCP), sessão de staff mintada por JWT e acesso ao banco de produção via Coolify (host `86.48.18.88` confirmado). Fixture única (`qa069-online-*@example.invalid`, clínica BPR), apagada ao final.

| # | Cenário | Resultado |
|---|---|---|
| 1 | Aba "Blood Pressure" ao lado de "Measurements"; formulário com Date & time pré-preenchido (agora, horário do Reino Unido) | APROVADO |
| 2 | Leitura alta (150/95, HR 88) → badge "High (Stage 2)" vermelho; histórico mostra o nome do staff, não "self-reported" | APROVADO |
| 3 | 2ª leitura, 7 dias atrás, normal (118/76) → badge "Normal"; gráficos (Systolic/Diastolic) com 2 pontos | APROVADO |
| 4 | Diastólica ≥ sistólica (90/95) → erro "diastolic must be lower than systolic", nada salvo | APROVADO |
| 5 | Editar leitura (sistólica 150→152) → atualiza | APROVADO |
| 6 | Excluir via confirm dialog → some da lista | APROVADO |
| 7 | Troca para PT (localStorage + evento) → tudo traduzido ("Pressão arterial", "Alta (Estágio 2)" etc.) | APROVADO |
| 8 | Isolamento de tenant: staff de outra clínica (Manu Training, personal) contra o paciente fixture da BPR, via API | APROVADO — GET/POST deram 404 "Patient not found"; SELECT confirmou que o POST cross-tenant não criou nada (cobre isolamento de clínica + bloqueio de tenant personal ao mesmo tempo) |
| 9 | Console sem erro JS | APROVADO — 0 `pageerror`; o único log "Failed to load resource: 400" é o próprio fetch do cenário 4 (erro de validação intencional) |

**Limpeza:** paciente fixture e suas 2 leituras apagados via cascade; SELECT final confirmou 0 `BloodPressureReading` com esse `patientId` e 0 usuários com e-mail `qa069-online-%`. Nenhum paciente real tocado, nenhum e-mail automático disparado.

**Screenshots:** `screenshots/online-01-patient-tabs.png`, `-02-bp-tab-empty-form.png`, `-03-high-reading-saved.png`, `-04-two-readings-charts.png`, `-05-validation-error.png`, `-06-edited-reading.png`, `-07-after-delete.png`, `-08-pt-locale.png`.
