# T-1: O build que deixa o push chegar

**Status:** app.json aplicado · **esperando o `eas build`** (interativo, precisa do Bruno)
**Depende de:** autorização do Bruno para `eas build` — e presença dele no provisioning

## Objetivo

Fazer o telefone conseguir se registrar para push. Hoje ele não consegue, e por isso nenhum aviso
chega por notificação — só por e-mail.

## Aplicado em 26/09/2026

O Bruno autorizou o build na mesma noite, e o motivo pesou mais que o custo: ele publica amanhã, e
o binário que vai para a App Store precisa ser o que consegue notificar. Publicar sem push e
corrigir depois custa outra revisão da Apple.

O que está escrito abaixo fica como o registro de por que a decisão não era óbvia.

## Por que não foi aplicado antes

Declarar push **muda o fingerprint do runtime**. Medido em 26/09/2026:

```
antes:  5787c66f3c8eebeb0dc9ca1ecf223e9c4fe3db42   ← o build 15, no telefone do Bruno
depois: a7210cf2b13eb060578447fcafe29d3b3a18d863
```

No minuto em que isso entrar, o build 15 **para de receber `eas update`**. O Bruno estava testando
por update a noite inteira, e congelar o canal para ligar algo que só funciona depois de um build
seria pagar o preço antes de receber a coisa.

Então a troca acontece **junto com o build**, não antes.

## O diagnóstico, para quem ler isto depois

O app **sempre teve** o código que pede o token — `getExpoPushTokenAsync` em
`mobile/src/lib/push.ts`, e a rota `/api/push-token` para guardá-lo. O que faltava era a permissão
no build. Sem `aps-environment`, a chamada estoura no aparelho, o `catch` do app a engole (de
propósito: push é o toque no ombro, não o produto), e nenhum telefone fica registrado.

Zero `PushDeviceToken` no banco. Não era o envio que falhava: era o registro que nunca acontecia.

## A mudança exata

Em `mobile/app.json`, dentro de `expo`:

```jsonc
"plugins": [
  // ...os que já existem...
  ["expo-notifications", { "color": "#4F7361", "defaultChannel": "default" }]
],
"ios": {
  // ...o que já existe...
  "entitlements": { "aps-environment": "production" }
}
```

`expo-notifications` já é dependência (`~0.32.17`) — só não estava declarado como plugin.

## Passos, na ordem

1. Aplicar o trecho acima.
2. `eas build` — **com o Bruno na frente**. A capability nova invalida o provisioning profile, e o
   menu da Apple é interativo (ver a memória `bug-capability-nova-invalida-provisioning`).
3. Instalar o build no aparelho dele.
4. Abrir o app e aceitar o aviso quando o iOS perguntar.
5. Conferir que nasceu um `PushDeviceToken` para o paciente de teste.
6. Mandar um lembrete pelo botão manual e ver o push chegar junto do e-mail.
7. Inverter de volta as asserções em `__tests__/email/push-junto-do-email.test.ts` — elas hoje
   guardam a **ausência** da permissão, de propósito.

## O que já está pronto e esperando

`notifyPatient` manda push junto do canal escolhido desde 26/09/2026. Ele:

- sai **junto** do e-mail, não no lugar dele — o e-mail é o que fica, o push é o que faz olhar agora;
- respeita `pushEnabled`, a chave que o paciente tem para dizer "chega" sem desinstalar;
- respeita o portão de saída de QA, porque push não tem desfazer;
- nunca derruba o e-mail se falhar.

Sem aparelho registrado ele simplesmente não faz nada. No dia em que o build entrar, começa a
funcionar sem mais uma linha de código.

## Critérios de aceite

- [ ] `aps-environment` no `app.json`
- [ ] Build novo instalado no aparelho do Bruno
- [ ] `PushDeviceToken` existe para o paciente de teste
- [ ] O lembrete manual chega por push **e** por e-mail
- [ ] Desligar o aviso no perfil impede o push e mantém o e-mail
