# T-1: Discovery + gap de dados (protocolos)

**Status:** pendente
**Depende de:** nenhuma

## Objetivo
Entender o que `ProtocolTemplate`/`ProtocolTemplateItem` e `app/admin/protocols` já fazem e definir exatamente quais campos faltam para "protocolo por região do corpo" aplicável a um paciente.

## Contexto
O app já tem os models e a página admin. Evitar recriar. Só o que faltar vira migração aditiva.

## Passos
1. Ler os models `ProtocolTemplate`, `ProtocolTemplateItem`, `TreatmentProtocol`, `ProtocolItem` e a página `app/admin/protocols`.
2. Mapear o fluxo atual de "aplicar template" (se existir) e onde ele grava (`TreatmentPlan`? `TreatmentProtocol`?).
3. Listar campos faltantes candidatos: `bodyRegion`, `condition`/`conditionSlug`, `evidenceRefsJson`, campos bilíngues (`*Pt`), progressão.
4. Produzir `qa/report-t-1.md` com o mapa + decisão de migração (o quê e por quê). Se houver migração, script aditivo pronto (não aplicado ainda).

## Arquivos afetados
- `specs/18-kit-rotina-clinica/qa/report-t-1.md` (relatório)
- (possível) script de migração aditiva

## Critérios de aceite
- [ ] Mapa do fluxo atual documentado.
- [ ] Lista final de campos a adicionar (ou "nenhum") justificada.
- [ ] Nenhuma quebra: migração é aditiva.
