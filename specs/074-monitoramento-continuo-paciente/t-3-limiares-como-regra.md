# T-3: Limiares de pressão como `AutomationRule`

**Status:** ✅ concluída
**Depende de:** nenhuma

## Objetivo
Os números `130/80` e `180/120` saem do código e viram regra editável por clínica.

## Contexto
Decisão D2. Mesmo padrão de `lib/automation/adherence-threshold.ts` (ativ. 072): a regra vence, a
constante do código é *seed* e *fallback*. Hoje estão cravados em
`app/api/patient/blood-pressure/route.ts`.

## Passos
1. `lib/automation/bp-thresholds.ts`: `getBpThresholds(clinicId)` devolvendo `{ alert, crisis }`.
2. Semear a regra em `prisma/seed-automation-rules.ts` com os valores atuais.
3. A rota de PA passa a ler a regra em vez das constantes.
4. Expor em `/admin/automation`, como as outras regras.

## Arquivos afetados
- `lib/automation/bp-thresholds.ts` (novo)
- `app/api/patient/blood-pressure/route.ts`
- `prisma/seed-automation-rules.ts`
- `app/admin/automation/`

## Critérios de aceite
- [ ] Sem regra no banco, o comportamento é idêntico ao de hoje
- [ ] Alterar a regra muda o limiar sem deploy
- [ ] Regra da clínica vence a global (`clinicId desc nulls last`, como na 072)
- [ ] Valor inválido (crise abaixo do alerta) é recusado na tela
