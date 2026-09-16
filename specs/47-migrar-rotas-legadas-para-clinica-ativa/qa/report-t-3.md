# QA — T-3: Equipamentos, agenda, Atlas e artigos

**Resultado:** APROVADO
**Data:** 16/09/2026 · **Commits:** cd30d75, 77497f0

| Cenário | Ambiente | Obtido |
|---|---|---|
| Equipamentos na BPR | produção | 200, mesma lista de antes do deploy (vazia); tela Settings → Equipment abre sem erro — `screenshots/prod-t3-01-equipamentos.png` |
| Equipamentos por clínica | local | cada clínica vê só o seu (`QA47 equipment BPR` × `QA47 equipment A`) |
| Bloqueios de agenda | produção | `GET /api/admin/calendar/blocks` 200 na BPR e na outra clínica, cada uma com os seus |
| **Apagar bloqueio de outra clínica** (achado alto da revisão) | código + unit | antes apagava por id, sem clínica; agora `deleteMany({ id, clinicId })` e 404 fora da clínica |
| Plano do Atlas | código | recebia `""` quando não havia clínica; agora 403 antes de montar o contexto |
| Importar artigo do Instagram | produção | `GET /api/admin/articles/instagram` 200 (8) na BPR, 200 (0) na outra clínica |

## Observação
A rota do Atlas e as de publicação (Facebook/Instagram/Reel) não foram disparadas em produção — só
verificadas por código e pelo caminho de leitura, para não publicar nada nas redes.
