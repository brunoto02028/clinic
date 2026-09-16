# T-2: Migrar as rotas de social/marketing

**Status:** pendente
**Depende de:** T-1

## Objetivo
As 11 rotas de social/marketing trabalham na clínica ativa e falham fechado.

## Arquivos afetados
- `app/api/admin/social/{accounts,accounts/[id],campaigns,connect-manual,instagram-overview,posts,publish-reel,refresh-token,templates}/route.ts`
- `app/api/admin/marketing/{content-calendar,publish-facebook,publish-instagram}/route.ts`

## Passos
1. Trocar o import por `@/lib/session-clinic`.
2. Em toda chamada, 403 quando não há clínica — inclusive nas que hoje seguem sem filtro
   (`posts` GET, `accounts/[id]`, `accounts` GET, `campaigns` GET, `templates` GET,
   `instagram-overview`, `content-calendar`, `publish-instagram`).
3. `posts` GET passa a filtrar sempre por `clinicId`; `accounts/[id]` compara sempre o dono.

## Critérios de aceite
- [ ] Nenhuma consulta dessas rotas roda sem `clinicId`
- [ ] Telas de Marketing/Social continuam funcionando na BPR
- [ ] Trocando a Active Clinic, as listas passam a ser da outra clínica
