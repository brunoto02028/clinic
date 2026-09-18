# T-1: Paywall — guarda de acesso a módulo no servidor

**Status:** concluído
**Depende de:** nenhuma

## Objetivo
Um paciente sem um módulo incluído no plano dele não consegue mais acessar o dado desse módulo direto pela URL/API — hoje só a aba fica escondida na UI, o dado continua servido se pedido direto.

## Contexto
`lib/module-registry.ts` define os módulos (`mod_treatment`, `mod_exercises`, `mod_records`, etc.) e `app/api/admin/patients/[id]/permissions/route.ts` (a API por trás da tela de permissões) já calcula "acesso efetivo" = grant do plano + override do admin (unlock/lock/hidden) + `fullAccessOverride`. Essa é a MESMA lógica que precisa valer no servidor pras rotas que servem o dado de cada módulo — não uma nova.

## Passos
1. Extrair a lógica de "acesso efetivo" da API de permissões pra uma função reaproveitável, ex. `assertModuleAccess(patientId, moduleKey)` em `lib/module-registry.ts` (ou um novo `lib/module-access.ts`) — lança/retorna erro se sem acesso, ecoando o padrão de `lib/tenant-access.ts` (falha fechado, nunca "deixa passar por engano").
2. Aplicar essa guarda nas rotas server-side que servem dado de `mod_treatment`, `mod_exercises` e `mod_records` (ver Suposição 2 do plano) — localizar essas rotas (provavelmente em `app/api/patient/*` e/ou nas páginas `/dashboard/*` que buscam dado direto via Server Component).
3. Resposta sem acesso: 403 com uma mensagem curta, não um erro genérico — o dashboard já deve tratar isso graciosamente (redirecionar ou mostrar "módulo não incluído no seu plano", não quebrar a tela).

## Arquivos afetados
- `lib/module-registry.ts` (ou novo `lib/module-access.ts`)
- Rotas server-side dos três módulos (a localizar durante a implementação)

## Critérios de aceite
- [x] Paciente sem `mod_treatment` no plano, acessando a API/rota direto pela URL → bloqueado (403), não recebe o dado.
- [x] Paciente COM o módulo incluído continua acessando normalmente (sem regressão).
- [x] `fullAccessOverride` (VIP) continua dando acesso a tudo, mesmo assim.
- [x] Override manual do admin (unlock/lock/hidden) continua sendo respeitado pela nova guarda, igual já é na tela de permissões.

## Resultado
Implementado `lib/module-access.ts` (`assertModuleAccess`), reaproveitando `computePatientAccess()` (lib/patient-access.ts). Guarda aplicada nas 5 rotas server-side que servem dado dos 3 módulos (incluindo as de escrita e as de detalhe/PDF, achadas pelo code review — não só as de listagem original): `GET/PATCH /api/patient/protocol`, `GET/PATCH /api/exercises`, `GET /api/soap-notes` (branch PATIENT), `GET /api/soap-notes/[id]`, `GET /api/soap-notes/[id]/pdf`. QA (2 rodadas) e code review (2 rodadas) aprovados — ver `qa/report-t-1.md`.
