# T-1: Model + APIs preview/send

**Status:** concluído (QA aprovado — qa/report-t-1.md; code review feito)
**Depende de:** nenhuma

## Objetivo
Renderizar a prévia exata e enviar somente o que foi pré-visualizado, registrando o envio.

## Passos
1. Model `PatientOutboundEmail` (clinicId, patientId, sentById, locale, subject, bodyText, html, contentHash, status, providerError, createdAt).
2. `POST /api/admin/patients/[id]/email/preview` → `{subject, html, toMasked, locale, hash}`.
3. `POST /api/admin/patients/[id]/email/send` → recalcula o hash; se diferente do enviado → 409; envia via `sendEmail` (BCC admin) e grava o log.
4. `GET /api/admin/patients/[id]/email` → histórico.
5. Validação (assunto ≤ 200, corpo ≤ 5000, idioma), rate limit, sem e-mail cadastrado → 400.

## Arquivos afetados
- prisma/schema.prisma
- lib/patient-email.ts
- app/api/admin/patients/[id]/email/preview/route.ts, send/route.ts, route.ts

## Critérios de aceite
- [x] Prévia idêntica ao e-mail enviado (mesmo HTML)
- [x] Envio com conteúdo diferente do pré-visualizado → 409
- [x] Tenant/paciente errado → 404; paciente logado → 403
- [x] Nada é enviado sem chamada explícita a `send`
