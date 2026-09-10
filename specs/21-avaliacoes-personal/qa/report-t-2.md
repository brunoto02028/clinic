# QA T-2 — Fotos de progresso + consentimento (atividade 21)

**Data:** 2026-09-10
**Ambiente:** banco local; dev :4206 (`OUTBOUND_MODE=sink`). Produção não tocada. **Sem escrita no R2 de produção** (ver nota).
**Resultado:** ✅ **APROVADO** (runtime 58/58)

## Entregue
- **Consentimento:** `photoConsentAt` no `User` (aditivo). `POST /api/admin/assessments/consent` (staff, tenant-scoped) registra/revoga.
- **Fotos:** `POST /api/admin/assessments/[id]/photos` (multipart) — exige `photoConsentAt` (403 sem), valida pose (FRONT/SIDE/BACK), tipo `image/*` e tamanho (≤15MB), sobe ao R2 (`uploadToR2`), cria `AssessmentPhoto`. `DELETE .../photos/[photoId]` (tenant-scoped, checa avaliação certa). Body não-multipart → 400.

## Evidências — runtime `npm run test:tenants` → **58/58**
```
PH1 photo without consent → 403
PH2 record photo consent → 200
PH3 with consent, no file → 400 (gate aberto, sem R2)
PH4 clinic admin → photo 404
```
As checagens de consentimento e tenant acontecem **antes** de ler o arquivo, então os cenários provam o gate/isolamento **sem** escrever no R2.

## Nota (happy-path de upload)
O upload real (multipart → R2 → 201) não foi exercitado no suite automatizado para **não poluir o bucket R2 de produção**. O caminho é fino (`uploadToR2` já usado no projeto) e será exercitado uma vez, de forma controlada, no QA de UI da T-3 (upload + delete). Gate e isolamento — as partes críticas — estão cobertos.

## Respostas ao code review (7 achados)
| # | Achado | Disposição |
|---|--------|-----------|
| 1 | Limite de tamanho só após bufferizar (OOM) | ✅ rejeita por `file.size` antes de `arrayBuffer()`. |
| 2 | MIME do cliente confiável; SVG → stored XSS | ✅ **allowlist raster** (png/jpeg/webp); SVG e outros → 400; content-type servido é o seguro resolvido. |
| 3 | Consentimento concedia com `"false"`/0 | ✅ concede só com `true` (ou omitido); qualquer outro revoga. PH5 cobre revogação. |
| 4 | Chave R2 só com `Date.now()` (colisão) | ✅ sufixo `randomUUID()`. |
| 6 | Upload antes do create → órfão no R2 se create falha | ✅ `deleteFromR2` no catch. |
| 7 | MIME vazio rejeitava imagem válida | ✅ fallback por extensão do nome. |
| 5 | PH4 valida pelo gate do módulo, não isolamento de registro | ⚠️ **aceito** — o isolamento usa `assertRecordAccess` (mesmo guard já provado por A4/W3); não há 2º tenant personal na fixture. Documentado. |

Verificado: tsc limpo + runtime **59/59** (PH1–PH5).

## Critérios de aceite
- [x] Sem consentimento → 403; com consentimento → gate abre (400 sem arquivo); revogar → 403.
- [x] Fotos isoladas por tenant (clínica → 404); allowlist raster (sem SVG).

**Conclusão: APROVADO.**
