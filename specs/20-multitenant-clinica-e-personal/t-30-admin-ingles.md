# T-30: Admin em inglês UK como língua base

**Status:** em andamento (ficha do paciente concluída; demais páginas pendentes)
**Trilha:** PLATAFORMA
**Depende de:** —

## Objetivo
O sistema tem o inglês UK como língua base; PT é toggle de locale. Algumas páginas do admin foram escritas com strings PT hardcoded (o Bruno apontou a ficha do paciente). Trocar por inglês.

## Feito
- **`app/admin/patients/[id]/page.tsx`** — todas as strings PT visíveis → inglês UK: abas (Summary, Assessments, Clinical Notes, Documents, Messages, Protocol, Exercises, Evidence), chips (Profile Pending, Password Set, Consent Accepted, Grant Full Access, Reset Password, View as Patient), botão Permissions, rótulos de formulário (Sets, Reps, Duration, Frequency, Description, Title, Start date, Clinical Summary…) e os textos das abas clínicas (SOAP, Atlas, Protocol, Clinical Scribe, Rehab feedback). Verificado: **0 strings PT visíveis restantes**, `tsc` limpo.

## Pendente (varredura restante)
- Auditoria apontou ~outras páginas admin com PT hardcoded (ex.: `app/admin/protocols/page.tsx`, `app/admin/ai-coworker/page.tsx`, `app/admin/marketing/instagram-connect/page.tsx`) + ~33 arquivos com acentos PT (muitos podem ser comentários/conteúdo, não UI). Fazer sweep por página, priorizando telas voltadas ao usuário.

## Critérios de aceite
- [x] Ficha do paciente sem PT hardcoded (inglês UK).
- [ ] Demais páginas admin voltadas ao usuário em inglês UK.
