# T-7: Catálogo de tipos de avaliação do tenant

**Status:** pendente
**Depende de:** T-1

## Objetivo
Expor "o que o PT oferece" de avaliação (catálogo por tenant), reusando `TreatmentType` (categoria ASSESSMENT_SERVICE).

## Passos
1. No fluxo do personal, listar/gerir os `TreatmentType` de categoria ASSESSMENT_SERVICE do tenant.
2. (Opcional) ligar uma avaliação registrada a um tipo do catálogo.

## Arquivos afetados
- app/admin/... (pricing/serviços do tenant), components/assessments

## Critérios de aceite
- [ ] PT vê/gere seus tipos de avaliação; isolado por tenant.
