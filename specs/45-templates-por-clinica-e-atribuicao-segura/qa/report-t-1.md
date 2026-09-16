# QA — T-1: Templates por clínica

**Resultado:** APROVADO
**Data:** 16/09/2026 · **Commit:** 725c840 · **Ambientes:** local (Next dev :4100, banco local) e produção (bpr.clinic, sessão SUPERADMIN admin@bpr.clinic)

## Unit
`npx jest __tests__/protocol` → 5 suítes, todas passando (`protocol-template-access`, `template-routes`,
`assign-route`, `protocol-exercise-gating`, `protocol-weeks`). Suíte completa: 313 passando, 1 falha
pré-existente e fora do escopo (`__tests__/tenant/admin-sections-gating.test.ts`, quebrada desde o
commit 31435a0 de 12/09). `tsc --noEmit` sem erros nos arquivos tocados; lint sem avisos novos.

## Produção (após o deploy)
Estado antes do deploy: 4 templates, todos com `clinicId: null` (ACL criado por Bruno; Achilles,
Plantar e Knee OA por Kaio — os dois autores são da clínica BPR `cmska2rj…`, slug
`bruno-physical-rehab`).

| Cenário | Esperado | Obtido |
|---|---|---|
| Versão nova no ar | `GET /api/admin/protocols/<inexistente>` → "Template not found" | ok |
| Backfill (BPR) | 4 templates com `clinicId` da BPR | ACL, Achilles, Plantar, Knee OA → `cmska2rj90000sb4gqbfqzb0o`; ACL segue com 58 itens / 41 vínculos |
| Active Clinic = "Bruno" (`cmtwr3qw…`) | lista vazia | `[]` |
| GET / PATCH / DELETE do ACL pela outra clínica | 404, nada muda | 404 / 404 / 404; de volta na BPR, os 4 continuam com nome e itens iguais |
| `POST /api/admin/protocols` com item ligado a exercício inexistente | nasce na BPR, item sem vínculo | 201, `clinicId` BPR, `exerciseId: null`, `titlePt` preservado (template apagado em seguida, 200) |
| `POST` com `items: [null]` | 400 | 400 |

## Local
- Backfill com os 4 templates locais zerados: 1ª execução "Updated 4 template(s), skipped 0";
  2ª "nothing to do". O ACL local foi para a clínica dona dos exercícios (`cmspbifpx…`), não para a
  do autor (`cmqdug2j…`) — a regra 1 do backfill (ver plan.md) evitou o descasamento que desligaria
  os exercícios.
- Clínica A (SUPERADMIN com Active Clinic) → lista vazia; GET/PATCH/DELETE/assign do ACL da BPR →
  404 "Template not found".
- Editar e salvar o template Knee OA pela tela: `titlePt` dos 5 itens igual antes e depois (antes
  do ajuste da revisão, o save apagava as traduções).

## Observação
Active Clinic do SUPERADMIN foi restaurada para `null` ao final.
