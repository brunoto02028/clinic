# T-6: Fase 3A — plano e assinatura

**Status:** pendente
**Depende de:** T-1

## Objetivo
Levar ao app o que o paciente vê sobre plano, assinatura e compras.

## Contexto
A T-1 corrigiu o escopo do plano original: `billing` é `personalOnly` em `lib/patient-sections.ts` — são os pagamentos do **aluno** via Stripe Connect (ativ. 028), não do paciente. **Fora do escopo.**

| Tela | Endpoint |
|---|---|
| `membership` | `/api/patient/membership/*` (plans, subscribe, cancel, subscription) |
| `plans` | `/api/patient/service-prices`, `/api/patient/status` |
| `my-plan` | `/api/patient/rehab-plan` |
| `marketplace` | `/api/patient/marketplace/*` |
| `cancellation-policy` | estático bilíngue |

⚠️ **Regra de IAP da Apple.** Compra dentro do app iOS esbarra na política de in-app purchase. O módulo BA já resolve com Stripe via deep link (`(ba)/membership.tsx`) — seguir esse precedente.

## Passos
1. Portar `my-plan` e `plans` (leitura) primeiro — sem risco de loja.
2. `membership` e `marketplace`: seguir o padrão de deep link do módulo BA, sem fluxo de compra nativo.
3. `cancellation-policy`: conteúdo estático bilíngue; conferir se vem do backend ou é texto fixo.

## Arquivos afetados
- `mobile/src/api/*.ts`
- `mobile/app/(app)/(clinica)/*.tsx`

## Critérios de aceite
- [ ] Nenhum fluxo que viole a regra de IAP da Apple
- [ ] Valores e status batem com a web para o mesmo paciente
- [ ] `billing` **não** foi portada
- [ ] Política de cancelamento em PT e EN
