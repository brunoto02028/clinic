# T-5: Rotas de manutenção da biblioteca

**Status:** concluído
**Depende de:** T-1

## Objetivo
As quatro rotas de manutenção que tinham ficado de fora passam a trabalhar na clínica ativa.

## Contexto
Pedido do usuário depois da T-4 ("pode migrar as 4 rotas tb"). Situação encontrada:
- `backfill-duration` e `normalize-videos` **não filtravam clínica nenhuma** — varriam os exercícios
  de todas as clínicas;
- `reset-library` (destrutiva) já resolvia a clínica, mas pelo apelido em `exercise-folders`;
- `voice-parse` não lê nem grava nada: manda o texto ditado para a IA e devolve os campos.

## Passos
1. `backfill-duration` e `normalize-videos`: resolver `sessionClinicId`, filtrar por ela, aceitar
   `?allClinics=true` para a varredura da plataforma inteira e recusar (403) sem clínica.
2. `reset-library`: passar a usar `sessionClinicId` direto e a mesma recusa (403 no lugar de 400).
3. `voice-parse`: registrar em comentário por que não resolve clínica.
4. Informar no retorno **qual** clínica foi varrida (nome, não id).

## Arquivos afetados
- `app/api/admin/exercises/{backfill-duration,normalize-videos,reset-library,voice-parse}/route.ts`
- `__tests__/tenant/exercise-maintenance-clinic.test.ts`

## Critérios de aceite
- [x] As duas varreduras só tocam exercícios da clínica ativa; `?allClinics=true` para a plataforma
- [x] Sem clínica resolvida → 403, em vez de rodar em todas
- [x] Continuam só para SUPERADMIN, inclusive com `?allClinics=true`
- [x] `reset-library` continua exigindo `?confirm=DELETE-ALL` e agora apaga só dentro da clínica
- [x] O retorno diz qual clínica foi varrida
