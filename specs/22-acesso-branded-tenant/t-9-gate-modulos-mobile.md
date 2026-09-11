# T-9: Gate de módulos mobile para tenant personal

**Status:** concluído (runtime M8/M9)
**Depende de:** nenhuma

## Objetivo
No app, um tenant `PERSONAL_TRAINER` não deve oferecer módulos de clínica (Lab/Clinic/BA) — só **Training** + **Assessments** — espelhando a separação da web.

## Contexto
`/api/mobile/modules` tinha dois caminhos que vazavam módulos clínicos para personal: o branch "ADMIN vê tudo" e o fallback "empty → all MODULE_DEFS". Um aluno de estúdio sem módulos clínicos configurados cairia no fallback e veria Lab/Clinic/BA.

## Passos
1. Consultar `Clinic.type` no endpoint; se `PERSONAL_TRAINER`, retornar apenas `[TREINO_DEF, AVALIACOES_DEF]` (quando training on), **antes** do branch de admin e do fallback.

## Arquivos afetados
- `app/api/mobile/modules/route.ts`
- `tests/tenant-isolation/run.cjs` (M8/M9)

## Critérios de aceite
- [x] Aluno/trainer de tenant personal → módulos mobile só `treino`+`avaliacoes`.
- [x] Paciente de clínica → mantém módulos de clínica (regressão).
