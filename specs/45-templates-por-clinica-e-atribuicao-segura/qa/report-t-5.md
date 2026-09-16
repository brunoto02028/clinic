# QA — T-5: `sentToPatientAt` preservado + duplicar item com exercício de fora

**Resultado:** APROVADO
**Data:** 16/09/2026 · **Commit:** 725c840

| Cenário | Ambiente | Obtido |
|---|---|---|
| `edit_protocol` (título + comentário, status SENT) num protocolo enviado | produção | 200; `sentToPatientAt` 2026-09-16T13:10:44.877Z antes e depois; comentário "QA45 re-save" salvo |
| `edit_protocol` num protocolo enviado | local | 200; data igual antes e depois |
| Protocolo DRAFT sem data salvo como SENT | local | `[DRAFT, null]` → `[SENT_TO_PATIENT, 2026-09-16T13:02:46Z]` |
| `edit_protocol` com `protocolId` de outro paciente/inexistente | local | 404 |
| Duplicar item ligado a exercício da clínica (botão na aba Protocol) | produção | cópia "Quad Sets (Isometric) (copy)" na mesma semana, **escondida**, com o mesmo exercício (ícone de vídeo, 4×10) — `prod-t5-01-duplicar-ligado.png` |
| Duplicar item ligado a exercício de outra clínica | local (vínculo de outra clínica criado só no banco local) | 1ª requisição recusada (`EXERCISE_NOT_IN_CLINIC`), 2ª sem vínculo; aviso "Item duplicated without its linked exercise (not in this clinic's library) — hidden until released" — `local-t5-01-duplicar-sem-vinculo.png` |
