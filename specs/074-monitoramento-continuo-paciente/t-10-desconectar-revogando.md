# T-10: Desconectar revogando o acesso na Withings

**Status:** 🟡 feita, QA pendente
**Depende de:** nenhuma

## Objetivo
"Desconectar" tem que desconectar de verdade — inclusive do lado da Withings.

## Contexto
Hoje `app/api/wearables/disconnect` apaga a conexão aqui. O token continua válido lá, e a inscrição
de notificação (T-9) continuaria ativa. Para o paciente, dizer "desconectei" e o acesso seguir de pé
é quebra de confiança — e, sob GDPR, é exatamente o que o DPIA do plano comercial vai cobrar.

## O que descobri ao implementar

**A Withings não tem endpoint para a aplicação revogar o próprio token.** Quem pode retirar a
autorização é o titular da conta, na área dele. Então "revogar" aqui é três coisas, e a terceira é
dizer a verdade sobre a quarta:

1. cancelar as inscrições de notificação (o que a T-9 criou);
2. **apagar** os tokens do nosso banco, não só marcar como desconectado;
3. manter o histórico já sincronizado — é prontuário;
4. dizer ao paciente, na tela, que a autorização do lado do fabricante só ele pode retirar, com o
   link para fazer isso.

Prometer um "desconectar" que deixa o acesso de pé é pior do que não prometer.

## Passos
1. Antes de apagar: `notify revoke` de cada `appli` inscrito.
2. Falha na revogação **não** impede a desconexão local — mas fica registrada, e a conexão é
   marcada com um estado que o admin vê, em vez de sumir como se tudo tivesse dado certo.
3. Apagar os tokens do banco, não só marcar a conexão como desconectada: token selado que não serve
   mais é passivo, não patrimônio.
4. O dado já sincronizado **permanece** — é prontuário. A desconexão para o fluxo novo; apagar
   histórico é outra ação, deliberada e separada.
5. Dizer ao paciente, na tela, o que aconteceu com cada uma dessas coisas.

## Arquivos afetados
- `app/api/wearables/disconnect/route.ts`
- `lib/withings.ts`
- tela de dispositivos (web e app)

## Critérios de aceite
- [ ] Depois de desconectar, o token antigo não serve mais na Withings
- [ ] Nenhuma notificação chega depois
- [ ] Falha na revogação: desconecta local, registra e avisa
- [ ] O histórico já sincronizado continua no prontuário
