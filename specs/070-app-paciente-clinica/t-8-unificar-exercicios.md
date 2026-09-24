# T-8: Unificar exercícios no plano de tratamento

**Status:** pendente
**Depende de:** T-1

## Objetivo
Alinhar o app à web: exercícios deixam de ser tela separada e passam a viver no plano de tratamento.

## Contexto
A atividade 043 aposentou a página separada de exercícios na web **de propósito**. Em `lib/module-registry.ts`, `mod_exercises` aponta para `/dashboard/treatment`, e o comentário explica o porquê: `fetchProtocols()` na página de tratamento trata `mod_treatment` ausente como "sem protocolos", então um paciente só-exercícios continua com página funcional.

O app ficou atrás: mantém `(tabs)/exercises.tsx` como tela própria — divergência encontrada pela T-1.

**Decisão (22/09/2026):** o app segue a web. A **aba continua** (acesso em um toque é bom no mobile), mas passa a abrir o plano de tratamento unificado. Manter duas telas recriaria a duplicação que a 043 removeu.

## Passos
1. Conferir o que `(tabs)/exercises.tsx` e `treatment-protocol.tsx` mostram hoje e onde se sobrepõem.
2. Unificar na tela de plano de tratamento, replicando o comportamento da web para paciente sem `mod_treatment`.
3. Apontar a aba "Exercises" para a tela unificada.
4. Conferir que `exercise/[id]` continua alcançável.
5. Remover o código que sobrar, sem deixar import órfão.

## Arquivos afetados
- `mobile/app/(app)/(clinica)/(tabs)/exercises.tsx`
- `mobile/app/(app)/(clinica)/treatment-protocol.tsx`
- `mobile/app/(app)/(clinica)/(tabs)/_layout.tsx`
- `mobile/src/api/exercises.ts`, `protocol.ts`

## Critérios de aceite
- [ ] Uma única tela mostra exercícios e protocolo, como na web
- [ ] Paciente sem `mod_treatment` vê os exercícios, sem erro
- [ ] A aba continua funcionando e `exercise/[id]` alcançável
- [ ] Nenhum import órfão
