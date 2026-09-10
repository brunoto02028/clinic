# T-30: Admin em inglês UK como língua base

**Status:** concluído (sweep completo de todas as páginas admin voltadas ao usuário)
**Trilha:** PLATAFORMA
**Depende de:** —

## Objetivo
O sistema tem o inglês UK como língua base; PT é toggle de locale. Algumas páginas do admin foram escritas com strings PT hardcoded (o Bruno apontou a ficha do paciente). Trocar por inglês.

## Feito
- **`app/admin/patients/[id]/page.tsx`** — todas as strings PT visíveis → inglês UK: abas (Summary, Assessments, Clinical Notes, Documents, Messages, Protocol, Exercises, Evidence), chips (Profile Pending, Password Set, Consent Accepted, Grant Full Access, Reset Password, View as Patient), botão Permissions, rótulos de formulário (Sets, Reps, Duration, Frequency, Description, Title, Start date, Clinical Summary…) e os textos das abas clínicas (SOAP, Atlas, Protocol, Clinical Scribe, Rehab feedback). Verificado: **0 strings PT visíveis restantes**, `tsc` limpo.

## Sweep completo (2026-09-10)
Varredura de todas as 22 páginas admin com acentos PT. ~500 strings de UI PT-only → inglês UK, em ~16 arquivos com mudança efetiva (os demais já eram bilíngues via `isPt ? "PT" : "EN"`):
- **Clínico:** protocols, body-assessments, foot-scans/new, scans, patients/[id]/diagnosis.
- **Agenda/pacientes:** patient-tasks, patients/[id]/permissions, notifications (appointments já bilíngue).
- **Marketing/AI:** ai-coworker, marketing/content-calendar, instagram-connect, instagram-studio (~140 strings), marketplace.
- **Config/misc:** exercises, articles/[id] (settings, my-account, treatment-types, service-pages já bilíngues).
- **Ficha (abas clínicas):** patients/[id]/page.tsx — ~70 strings restantes (SOAP, protocolos, Atlas, diálogo de perguntas, Clinical Scribe).
- **Locales de exibição de data** `pt-BR`/`pt-PT` → `en-GB` (display), preservando `pt-BR` de reconhecimento de fala.

**Preservado (regra):** ramos PT de ternários de locale (o toggle PT), campos de conteúdo `*Pt`, prompts de IA, copy PT baked em imagens (instagram-studio), nomes de produto/equipamento, comentários.

**Verificação:** `tsc` sem erros novos (memberships:120 e scans:266 são pré-existentes, confirmados na cópia `reconstruir/`); re-grep global só retorna PT legítimo (ternários/conteúdo/produto). Riscos de persistência checados: `docKind` default bate com a `<option>`; `context` é write/display-only, nunca comparado.

## Critérios de aceite
- [x] Ficha do paciente sem PT hardcoded (inglês UK) — incl. abas clínicas.
- [x] Demais páginas admin voltadas ao usuário em inglês UK.
