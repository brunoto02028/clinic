# T-1: Middleware — aluno/paciente fora de `/api/admin/*`

**Status:** concluído (QA aprovado `qa/report-t-1.md` + code review sem achados)
**Depende de:** nenhuma

## Objetivo
Um usuário `PATIENT` (paciente da clínica ou aluno do personal) recebe **403 JSON** em qualquer `/api/admin/*`, a não ser nas rotas de uma allowlist explícita. Isso fecha, de uma vez, as rotas admin que só checam "tem sessão" (finance, finance/stripe, marketplace, social/upload, etc.).

## Contexto
- Hoje `middleware.ts` só nega PATIENT em páginas `/admin/*` (`staffRoutes`, ~linha 341). Em `/api/*` o aluno passa, e cada rota decide sozinha. Várias não decidem.
- Confirmado ao vivo (18/09): o aluno `qa.aluno` recebe 200 em `GET /api/admin/finance`, `GET /api/admin/finance/stripe` e `GET /api/admin/marketplace/products`.
- A tela do aluno `/dashboard/consent` chama `GET /api/admin/consent-texts`. É a única chamada conhecida do lado do aluno a `/api/admin`.
- O ramo Bearer (mobile) do middleware retorna antes da checagem de papel (`middleware.ts` ~262). O bloqueio também precisa valer para token Bearer de PATIENT.

## Passos
1. **Levantamento:** listar toda chamada a `/api/admin/` feita por código renderizado para PATIENT (`app/dashboard/**`, componentes usados nessas páginas, `mobile/**`). Separar o que é tela de staff (ex.: `assessment-panel`, `billing-panel`) do que o aluno realmente abre.
2. Para cada uso legítimo do aluno, das duas uma:
   - mover para uma rota de aluno já existente (`/api/patient/*`) ou nova;
   - ou pôr na allowlist, **só com o método necessário** (ex.: `GET /api/admin/consent-texts`).
3. No middleware, depois de resolver o token (cookie e Bearer): se `role === "PATIENT"` e o caminho começa com `/api/admin/` e não está na allowlist, retornar `NextResponse.json({ error: "Forbidden" }, { status: 403 })`.
4. Manter as exceções existentes que são autenticadas por header, não por sessão (`/api/admin/maintenance`, `/api/admin/backup`).
5. Staff impersonando aluno continua passando (papel no JWT = staff).

## Arquivos afetados
- `middleware.ts`
- possivelmente `app/dashboard/consent/page.tsx` (se a chamada for movida para rota de aluno)
- rota nova em `app/api/patient/...` (só se o levantamento pedir)

## Critérios de aceite
- [x] Aluno (cookie) → `GET /api/admin/finance`, `/api/admin/finance/stripe`, `/api/admin/marketplace/products`, `POST /api/admin/social/upload` → **403**.
- [x] Aluno (Bearer, `/api/mobile/login`) → qualquer `/api/admin/*` não passa (o middleware só aceita Bearer nas rotas mobile; sem cookie → redirect para login/401).
- [x] Aluno continua conseguindo ver os termos em `/dashboard/consent` (allowlist ou rota nova).
- [x] Portal web do aluno inteiro (crawl das rotas do menu) sem nenhum 403 novo no console/rede.
- [x] Personal (ADMIN) e SUPERADMIN: nenhuma rota `/api/admin/*` que funcionava passa a dar 403.
- [x] Impersonação ("View as Student") continua funcionando.
