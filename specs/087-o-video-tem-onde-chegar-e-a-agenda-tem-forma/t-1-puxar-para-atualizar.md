# T-1: Puxar para atualizar em toda tela

**Status:** implementada · QA pendente
**Depende de:** nenhuma

## Objetivo
O gesto de puxar a tela para baixo atualiza o que está nela, em toda tela do paciente.

## Contexto
> "É para eu não precisar sair do aplicativo e atualizar." — Bruno

O gesto existia **zero vezes**. O único caminho para ver algo novo era fechar e reabrir, que é o que
`refetchOnWindowFocus` cobre — e era o único que existia.

O `Screen` é dono do `ScrollView`, então 50 telas se resolvem num lugar. As listas com `FlatList`
rolam sozinhas e não passam por ele: essas recebem o controle na mão.

Atualiza **tudo o que está montado**, não uma chave escolhida. Uma chave por tela daria metade da
tela nova e metade velha — o contador do cabeçalho muda e a lista não, que é pior do que nada.

## Passos
1. `src/lib/pull-to-refresh.tsx`: hook com `refetchQueries({ type: "active" })`, roda do tema, e
   `setAtualizando(false)` em `finally`.
2. `Screen` ganha `refreshable` (padrão ligado) e entrega o controle ao seu `ScrollView`.
3. As 10 listas de clínica e laboratório recebem `refreshControl={controle}`.
4. Teste que **varre** as telas: lista nova sem o gesto derruba a suíte.

## Arquivos afetados
- `mobile/src/lib/pull-to-refresh.tsx` (novo)
- `mobile/src/components/ui/Screen.tsx`
- 10 telas com `FlatList` em `(clinica)` e `(lab)`
- `__tests__/mobile/puxar-para-atualizar.test.ts` (novo)

## Critérios de aceite
- [x] Puxar para baixo atualiza em tela que rola
- [x] Puxar para baixo atualiza em tela com lista própria
- [x] A roda para de girar mesmo quando a atualização falha
- [x] A roda é visível no tom escuro
- [ ] Confirmado no aparelho (só existe em nativo)
