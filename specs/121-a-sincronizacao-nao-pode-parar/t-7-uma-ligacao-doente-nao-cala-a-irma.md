# T-7: Uma ligação doente não cala a irmã sã

**Status:** implementado — QA e review pendentes
**Depende de:** 122 T-1 e T-2 (a régua que torna isto seguro)

## O achado

O Bruno perguntou se a nossa app atualiza quando a Withings atualiza, e em
quanto tempo. Fui ao log do contentor em produção, 03/10/2026:

```
[withings/webhook] descartada: conexão ERROR userid=49651552 appli=16
[withings/webhook] descartada: conexão ERROR userid=49651552 appli=44
```

A Withings **estava** a empurrar passos (`appli=16`) e sono (`appli=44`) para a
conta dele. Nós deitávamos fora cada empurrão — com a ligação pessoal dele a
funcionar perfeitamente ao lado.

O que estava em `ERROR` era a **outra** ligação da mesma conta: o manguito da
clínica, com o token morto à espera de reautorização.

## A causa

O webhook escolhia **uma** ligação:

```ts
connection = await prisma.wearableConnection.findFirst({
  where: { provider: "WITHINGS", providerUserId: String(userid) },
  orderBy: { isClinicDevice: "desc" },   // a da clínica à frente — 092 T-1
});
if (!connection || connection.status !== "CONNECTED") { descarta }
```

A ordenação resolveu o sorteio da 092. Criou, sem se ver, um silêncio pior: com
a conta ligada duas vezes, **a ligação doente escolhida à frente cala a sã**.

Resultado para ele: o tempo real desapareceu, e só a rede de quinze minutos o
segurava. É exactamente a diferença entre *"a app atualiza quando eu meço"* e
*"a app atualiza um quarto de hora depois"*.

## Porque agora é seguro processar as duas

Porque a **122 T-1/T-2** pôs uma régua só a decidir de quem é cada medição: a
ligação pessoal cala-se exactamente quando a da clínica atribui, e há um teste
que prova a equivalência nas seis combinações. Antes dessa régua, duas ligações
a processar o mesmo empurrão era o defeito que a 092 corrigiu. Depois dela, é o
conserto.

## O que muda

1. `findFirst` → `findMany`, com a mesma ordenação (a da clínica primeiro,
   porque é ela que atribui a pressão).
2. Processa **todas** as que estão `CONNECTED`.
3. **Um `try` por ligação**: uma a falhar já não impede a outra — era a mesma
   forma do defeito, um nível abaixo.
4. O descarte só acontece quando **nenhuma** serve, e o log passa a dizer o
   estado de todas (`nenhuma ligacao servivel (ERROR,DISCONNECTED)`), que era o
   que faltava para se ver uma ligação sã a ser calada.
5. A linha de sucesso diz quantas ligações serviram e o que cada uma trouxe.

## Arquivos afetados

- `app/api/wearables/withings/webhook/route.ts`
- `__tests__/wearables/uma-ligacao-doente-nao-cala-a-irma.test.ts`
- `__tests__/wearables/o-descarte-e-o-401.test.ts` (a asserção da 092 passou a
  medir a distinção, não a grafia da linha)

## Critérios de aceite

- [x] Clínica em `ERROR` + pessoal `CONNECTED` → a pessoal recebe
- [x] As duas sãs → as duas recebem, a da clínica primeiro
- [x] Uma a falhar → a outra corre na mesma, e a falha fica registada **nela**
- [x] Nenhuma servível → descarte com o estado de todas no log e no `logSystem`
- [x] Conta desconhecida continua marcada como `esperado: true`
- [x] Responde sempre `{"status":0}`
- [x] Mutação: voltar a olhar só a primeira mata 3 testes
- [ ] QA aprovado
- [ ] Code review feito
- [ ] Medir em produção: a linha `ligacoes=N/M` a aparecer com N ≥ 1
