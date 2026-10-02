# T-8: Puxar a tela fala com a Withings, não só com o nosso banco

**Status:** concluído (02/10/2026)

> **O QA reprovou a primeira rodada, e tinha razão em dois pontos que apagavam a
> tarefa.** O `NEEDS_REAUTH` que eu filtrava **não existe neste código** — o
> schema diz `CONNECTED | DISCONNECTED | ERROR` — e como o `lastSyncedAt` não
> avança numa falha, o tecto de 2 minutos deixava de existir para sempre a partir
> do primeiro erro. E a pendência que justificava não mostrar alerta nenhum
> também não existia: a rota nunca gravava `lastSyncError` e a rota das ligações
> nunca o devolvia. Os dois fechados, mais a guarda de concorrência no servidor,
> que faltava por completo.

**Depende de:** nenhuma

## O pedido

> "Podemos atualizar os dados quando entramos no app e baixamos a tela assim? Dá
> pra deixar configurado?" — Bruno, 02/10/2026, com a tela de Saúde a girar

## O que o gesto faz hoje, e porque não chega

A 087 T-1 pôs o *puxar para atualizar* em todas as telas do paciente, e ele faz
exactamente o que foi construído para fazer: `refetchQueries` — **relê o nosso
banco**. Na aba Saúde:

```tsx
onRefresh={() => {
  dados.refetch();
  ligacoes.refetch();
}}
```

Nenhuma das duas fala com a Withings. Se a última sincronização foi às 07:05,
puxar a tela às 10:20 relê com toda a diligência os números de **07:05**, mostra
a roda a girar enquanto o faz, e devolve o mesmo ecrã.

Foi o que produziu a contradição que o Bruno viu em 02/10: o nosso app dizia
*"Steps 182"* e o da Withings dizia *"Daily Steps 391"*. Os dois números estavam
certos — eram o mesmo contador em dois instantes. A 119 já pôs a hora da leitura
na tela (*"Atualizado às 07:05"*), o que **explica** a diferença. Esta tarefa
**fecha-a**.

## A decisão que precisa de ser explícita: o tecto

Sincronizar fala com a API deles, e o limite publicado é de **120 pedidos por
minuto por `client_id`** — nosso, partilhado por **todos** os pacientes a
sincronizar ao mesmo tempo. Uma sincronização são cerca de uma dúzia de chamadas.
Um gesto sem tecto, numa tela que convida a repeti-lo, é um 601 à espera de
acontecer — e um 601 falha a chamada de quem vier atrás, não a de quem puxou.

**Intervalo mínimo entre duas conversas com a Withings: 2 minutos.** Dentro
disso, puxar continua a reler o nosso banco (que é o que ele já fazia, e é
instantâneo). Passados os 2 minutos, puxar vai à fonte.

**O relógio é o `lastSyncedAt` da ligação, não um carimbo local.** Já vem na
resposta que a tela usa, é a verdade do servidor, e sobrevive a trocar de
telemóvel — um carimbo em `AsyncStorage` diria "sincronizei agora" num aparelho e
"nunca sincronizei" no outro, para a mesma pessoa.

## Ao abrir o app

A mesma regra, no mesmo sítio: ao ganhar foco, se passaram os 2 minutos, vai à
fonte. É `useFocusEffect`, que dispara ao entrar na aba e ao voltar ao app — e o
tecto é o que impede que trocar de aba três vezes sejam três sincronizações.

## O que não se faz

**Não se mostra erro de sincronização aqui.** Se a conversa com a Withings
falhar, a tela mostra o que tem, e as pendências — que já existem — dizem *"a
última sincronização falhou"*. Um alerta vermelho por cima de um gesto que a
pessoa fez por hábito ensina a não fazer o gesto.

**A roda gira até ao fim.** Hoje é `refreshing={dados.isRefetching}`, que para
assim que o nosso banco responde. Com a sincronização no meio, parar aí seria
dizer que acabou enquanto a parte lenta ainda corre.

## Passos

1. `mobile/src/lib/sincronizar-se-vale-a-pena.ts`: a regra — recebe as ligações e
   o relógio, devolve se vale a pena falar com a Withings. Fica fora da tela
   porque é a parte verificável.
2. A aba Saúde usa-a no `onRefresh` e num `useFocusEffect`, com estado próprio
   para a roda.
3. Testes da regra, com mutação.

## Arquivos afetados

- `mobile/src/lib/sincronizar-se-vale-a-pena.ts` (novo)
- `mobile/app/(app)/(clinica)/(tabs)/saude.tsx`
- `__tests__/wearables/puxar-fala-com-a-fonte.test.ts` (novo)

## Critérios de aceite

- [ ] Puxar com a última sincronização há mais de 2 min chama `/api/wearables/sync`
- [ ] Puxar com a última sincronização recente **não** chama, e relê na mesma
- [ ] Entrar na aba segue a mesma regra
- [ ] A roda gira até a sincronização acabar
- [ ] Uma falha da Withings não produz alerta novo — a pendência existente basta
- [ ] Sem ligação Withings nenhuma, não se tenta sincronizar
