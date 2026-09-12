# Atividade 36 — Gate de permissão pro "Import from Instagram"

## Objetivo
O botão "Instagram" na biblioteca de exercícios (`/admin/exercises`) e o endpoint que ele chama (`app/api/admin/exercises/instagram/route.ts`) hoje são liberados pra qualquer usuário com role `ADMIN`/`SUPERADMIN`/`THERAPIST`, sem distinção de tenant. O recurso faz scraping (yt-dlp + fallbacks Cobalt/ddinstagram/embed) de **qualquer** post/reel/perfil do Instagram — não só do próprio trainer — e guarda o vídeo baixado permanentemente no R2 da BPR como exercício do tenant.

**Risco:** copyright (a plataforma reidroespeda conteúdo de terceiros) e técnico (rate-limit/bloqueio do IP pela Instagram se vários tenants usarem ao mesmo tempo). Virar um gate opt-in por clínica, desligado por padrão pros personal trainers, ligado manualmente pelo Bruno (SUPERADMIN) quando quiser liberar.

## Decisões de design
- **Campo novo:** `Clinic.instagramImportEnabled Boolean @default(false)`, mesmo padrão de `Clinic.stripePayoutsEnabled` já existente no schema.
- **Default por tipo de tenant:** a clínica principal (`type: CLINIC`) já usa essa feature hoje e não deve perder acesso — migração de boot (mesmo padrão de `scripts/migrate-personal-trainer-colors.js`) liga o flag pra `true` em todas as clínicas `type: CLINIC` existentes. Personal trainers (`type: PERSONAL_TRAINER`), existentes e novos, nascem/ficam com `false` — Bruno libera manualmente quem ele quiser via `/admin/clinics`.
- **Gate no backend:** o endpoint de import checa o flag do `clinicId` da sessão além do role atual; sem o flag, retorna 403 (defesa real — não é só esconder botão).
- **Como o flag chega no client:** pelo mesmo caminho que `clinicType`/`isPersonal` já usam hoje — copiado pro JWT/session do NextAuth (`lib/auth-options.ts`), lido via `useSession()`. Mesma contrapartida que `isPersonal` já tem: se o Bruno ligar o flag pra alguém já logado, só reflete depois do refresh do token/sessão (login de novo ou expiração natural) — aceitável, já é o comportamento padrão de todo o resto que depende de `clinicType`.
- **UI de toggle:** não existe hoje nenhum toggle de configuração por clínica em `/admin/clinics` (o item de menu "Clinic Settings" é um stub sem `onClick`). Vamos adicionar um diálogo de edição simples nessa página com o toggle — a API de PATCH (`app/api/admin/clinics/[id]/route.ts`) já aceita qualquer campo do `Clinic` via passthrough, então o backend dessa parte não muda.

## Tarefas
| T-N | Nome | Status |
|-----|------|--------|
| T-1 | Campo `instagramImportEnabled` no schema + migração de boot pra clínicas existentes | concluído |
| T-2 | Gate no backend (403 sem o flag) + expor o flag na sessão | concluído |
| T-3 | Esconder o botão "Instagram" em `/admin/exercises` quando desligado | concluído |
| T-4 | Toggle em `/admin/clinics` pro Bruno ligar/desligar por tenant | concluído |
| T-5 | QA consolidada (personal sem flag bloqueado, personal com flag liberado, clínica mantém acesso, toggle funciona) | concluído |

## Suposições
1. **Default por tipo:** clínicas `type: CLINIC` nascem/migram com `true` (mantém o comportamento atual pra quem já usa); `type: PERSONAL_TRAINER` nasce/migra com `false` sempre. Não dá pra saber pelo código se algum personal trainer real em produção já usa essa feature hoje (não achei nenhum tenant nomeado além do fixture de QA) — se algum precisar manter acesso, você liga manualmente depois pelo novo toggle. Confirma esse critério ou prefere eu consultar o banco de produção antes pra ver se algum personal trainer específico já tem exercícios com a tag `instagram-import`?
2. **Staleness da sessão:** ligar/desligar o flag pra um usuário já logado não reflete até a sessão dele renovar (mesmo comportamento de `isPersonal` hoje). Sem problema pra esse caso de uso (não é uma revogação de emergência).
3. **Alcance do toggle:** só SUPERADMIN edita esse campo (mesma proteção de `/admin/clinics` hoje). Sem exposição pro próprio ADMIN da clínica pedir/ativar sozinho.
