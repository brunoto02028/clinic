# T-1: O aviso não chega ao telefone

**Status:** pendente
**Depende de:** nenhuma

## Objetivo

Descobrir por que a notificação marcada em `/admin/notifications` -> Broadcast
não aparece no telefone do Bruno (app instalado pelo TestFlight), consertar — e
deixar o painel **dizer** quantos aparelhos o paciente tem, para esta pergunta
nunca mais depender de mim.

## Contexto

O envio existe e funciona: `lib/push-send.ts` fala com o serviço da Expo, em
lotes de 100, e sabe desativar token morto. O broadcast tem o interruptor "Also
notify on their phone", desligado por omissão de propósito — push não tem
desfazer.

São quatro causas possíveis, e elas se distinguem com dados, não com palpite:

1. **Nenhum aparelho registrado.** O app registra o token no login
   (`mobile/src/store/auth.ts` -> `registrarParaPush`). Se o Bruno entrou antes
   de a tela de permissão existir, ou recusou, não há linha em `PushDeviceToken`.
2. **Permissão negada no telefone.** O token nunca nasce.
3. **Credencial de push do build.** Já aconteceu aqui: capability nova invalida
   o provisioning, e o build sai sem push válido — a Expo aceita a mensagem e
   ela morre no caminho.
4. **`pushEnabled` desligado** no perfil do próprio paciente.

O painel hoje não distingue nenhuma delas: manda e diz "enviado".

## Passos

1. Em produção, para o paciente do Bruno: contar `PushDeviceToken` ativos
   (`countPushDevices` já existe), ver `pushEnabled`, e ver a data do último
   token. **Paciente de teste identificado; em paciente real, só leitura.**
2. Se houver token: mandar um push de teste e ler o retorno da Expo por
   mensagem — `DeviceNotRegistered`, `MismatchSenderId` e `InvalidCredentials`
   dizem coisas diferentes.
3. Se não houver: conferir no app, com o Bruno, a tela de permissão — e se o
   registro acontece no login e no interruptor de notificações.
4. Consertar o que a medição apontar.
5. **No painel**, ao lado de "Also notify on their phone": mostrar quantos
   aparelhos receberiam (zero em vermelho, e o botão dizendo que o push não vai
   sair). O mesmo no card do paciente.
6. Depois de enviar, guardar e mostrar o resultado real: enviados, falhados,
   desativados — os campos `pushSent`/`pushFailed` já existem no broadcast.

## Arquivos afetados

- `lib/push-send.ts` (talvez só leitura)
- `app/api/admin/broadcasts/route.ts`
- `app/admin/notifications/page.tsx` (o interruptor e o contador)
- `app/admin/patients/[id]/page.tsx` (o card do paciente)
- `mobile/src/lib/push.ts`, `mobile/src/store/auth.ts` (se o registro falhar)

## Critérios de aceite

- [ ] A causa do caso do Bruno está escrita, com a evidência que a mostrou
- [ ] O push chega ao telefone dele
- [ ] O painel mostra quantos aparelhos vão receber **antes** de enviar
- [ ] Zero aparelhos aparece como aviso, não como sucesso silencioso
- [ ] O resultado do envio (enviados/falhados) aparece depois
