# T-1: O aviso não chega ao telefone

**Status:** feita (27/09) — em QA
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

---

## O que a medição mostrou (27/09/2026)

Contra **produção**, leitura apenas:

```
paciente do Bruno: cmufmab7t0004pd08hcqwoy0n | role=PATIENT | pushEnabled=true
aparelhos registrados: 2
  - ios | ativo=true | formato_valido=true | criado=2026-09-26T17:43
  - ios | ativo=true | formato_valido=true | criado=2026-09-26T15:19
no sistema inteiro: 2 tokens (2 ativos), de 1 pessoa
pacientes: 8, com pushEnabled: 8
```

E um envio de teste pela Expo, para os dois aparelhos dele:

```
--- tickets ---   [0] status=ok    [1] status=ok
--- recibos ---   status=ok        status=ok
```

**Nenhuma das quatro hipóteses era a causa.** O registro funciona, a permissão
existe, a credencial do build está boa e a Apple entregou.

**A causa:** a notificação **nunca foi enviada**. O botão "Review and send" fica
desabilitado sem título **em inglês**, e ele havia preenchido só o corpo em
português. O botão apagado não dizia nada.

Isso muda o conserto: não era entrega, era a tela não explicar o próprio estado.
O contador de aparelhos entra junto porque é a outra metade da mesma pergunta —
"vai tocar em quantos telefones?" tinha de esperar a prévia para ser respondida.

**Dois achados de infra, fora do escopo, registrados para não se perderem:**

1. **`DATABASE_URL` está duplicada em produção**, com valores diferentes — uma
   pelo IP público na porta 5490, outra pelo host interno na 5432, as duas
   apontando para `bpr_clinic`. Provavelmente o mesmo banco por dois caminhos,
   mas qual vale depende da ordem que o Coolify aplica. `DAILY_API_KEY` também
   aparece duas vezes.
2. **Não existe `OUTBOUND_MODE` em produção** — e está certo assim: sem ela o
   portão libera quando `NODE_ENV=production`. Vale saber que é `NODE_ENV` que
   segura isso, porque se ele não for "production" no contêiner, **todo** e-mail,
   SMS e push do sistema some em silêncio.
