# T-9: Porte — extras

**Status:** pendente
**Depende de:** T-1

## Objetivo
Fechar a paridade com a web portando o que sobrou.

## Contexto
Agrupamento provisório. Candidatas: `biohacking`, `marketplace`, `waitlist`.

`biohacking` tem área web própria (`app/biohacking`) e endpoint (`app/api/biohacking/patients`) — confirmar se a página do dashboard é do paciente ou é vitrine.

`marketplace` pode esbarrar na mesma regra de IAP da T-7.

## Passos
1. Classificar cada uma pelo resultado da T-1.
2. Portar as que forem do paciente.
3. Registrar no report as que ficarem de fora e por quê.

## Arquivos afetados
- `mobile/src/api/*.ts`
- `mobile/app/(app)/(clinica)/*.tsx`

## Critérios de aceite
- [ ] Toda página da lista tratada: portada ou justificada
- [ ] Nenhum fluxo de compra que viole a regra de IAP
- [ ] `plan.md` com o quadro final de cobertura web × app
