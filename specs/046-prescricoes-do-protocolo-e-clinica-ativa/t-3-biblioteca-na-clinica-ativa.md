# T-3: Biblioteca de exercícios, pastas e prescrição manual seguem a "Active Clinic"

**Status:** concluído
**Depende de:** nenhuma

## Objetivo
Com a "Active Clinic" trocada, a biblioteca, as pastas, os seletores de exercício e a prescrição
manual trabalham na mesma clínica que pacientes e protocolos.

## Contexto
plan.md, decisões 4–5. Hoje essas rotas usam `session.user.clinicId` / `resolveClinicId(session)`.
Para contas que não são SUPERADMIN nada muda (a clínica ativa é a da conta).

## Passos
1. Resolver a clínica por `getActor` (staff + clínica obrigatória) em:
   `app/api/admin/exercises/route.ts` (GET/POST), `[id]/route.ts`, `bulk`, `translate`, `instagram`,
   `app/api/admin/exercise-folders/route.ts`, `[id]/route.ts`, `app/api/admin/exercise-prescriptions/route.ts`.
2. Manter papéis permitidos de cada rota como estão.
3. `reset-library`, `backfill-duration`, `normalize-videos`, `voice-parse`: sem mudança.
4. Testes: SUPERADMIN com Active Clinic lista/edita só exercícios dessa clínica; exercício de outra
   clínica → 404.

## Arquivos afetados
- rotas listadas no passo 1
- `__tests__/tenant/` (novo teste)

## Critérios de aceite
- [x] BPR (padrão): biblioteca igual a antes (mesma contagem)
- [x] Active Clinic = "Bruno": biblioteca mostra só os exercícios dessa clínica; editar exercício
      da BPR → 404
- [x] Seletor de exercício da aba Protocol e do editor de templates oferece só exercícios aceitos
- [x] Prescrição manual criada com Active Clinic = X nasce na clínica X
