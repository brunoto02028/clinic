# T-7: Fase 3B — acompanhamento e ferramentas

**Status:** pendente
**Depende de:** T-1

## Objetivo
Fechar a paridade com as telas de acompanhamento e ferramentas de saúde.

## Contexto
| Tela | Endpoint |
|---|---|
| `follow-up` | `/api/patient/adherence`, `/assessment-progress`, `/outcome-measures` |
| `blood-pressure` | `/api/patient/blood-pressure`, `/api/patient/bp-reminder` |
| `biohacking` | `/api/biohacking/my-protocol`, `/api/wearables/*` |
| `waitlist` | `/api/patient/waitlist`, `/api/patient/treatment-types` |

⚠️ **Não duplicar wearables.** O app já tem `wearables.tsx` e `wearable-data.tsx`; na web esse conteúdo vive dentro de `biohacking`. Ao portar, reaproveitar o que existe em vez de criar uma segunda tela de conexão.

## Passos
1. `follow-up`: cruza adesão, progresso e outcome measures — o app já tem clients para os três; reaproveitar.
2. `blood-pressure`: tela de escrita; validar entrada e tratar erro do servidor.
3. `biohacking`: integrar com as telas de wearables existentes.
4. `waitlist`: entrar e sair da fila.

## Arquivos afetados
- `mobile/src/api/*.ts`
- `mobile/app/(app)/(clinica)/*.tsx`
- `mobile/app/(app)/(clinica)/wearables.tsx` (integração)

## Critérios de aceite
- [ ] Nenhuma tela de wearables duplicada
- [ ] `blood-pressure` valida entrada e trata erro do servidor
- [ ] `follow-up` reaproveita os clients existentes
- [ ] Quadro final de cobertura web × app no `plan.md`
