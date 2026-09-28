# T-8: Webhooks — kit despachado, amostra recebida, resultado pronto

**Status:** pendente
**Depende de:** T-1, T-7

## Objetivo
O pedido anda sozinho conforme a LML avisa, e o paciente sabe onde está sem precisar perguntar.

## Contexto
Eles mandam eventos de **Order** (despacho, entrega) e de **Test Registration** (amostra recebida,
lab id criado, resultado pronto, reteste). Autenticação por segredo compartilhado no header
`X-Webhook-Secret`.

**Qualquer resposta diferente de 200 faz eles reenviarem com backoff crescente** — então mesmo um
evento que a gente não sabe tratar responde 200, depois de registrado. É a mesma regra do webhook
da Withings, aprendida na marra: sempre responder sucesso.

## Passos
1. `POST /api/webhooks/lml`: comparar o segredo em **tempo constante**; sem segredo configurado,
   recusar tudo.
2. Mapear evento → `LabOrderStatus` e `LabRegistrationStatus`, gravando sempre um `LabOrderEvent`
   com o payload cru em `metadata`.
3. Evento desconhecido: registra e responde 200.
4. Evento fora de ordem (resultado antes do despacho, que acontece em reenvio) não pode fazer o
   pedido andar para trás — a transição é por ordem do ciclo, não por ordem de chegada.
5. Notificação ao paciente por `pushDocumento`/`pushTarefa`, **sem dado clínico no texto** — regra
   da 077: nada que apareça na tela de bloqueio diz o que o exame mediu.
6. Resultado pronto **não** notifica o paciente se a liberação for manual (T-6); notifica a clínica.

## Arquivos afetados
- `app/api/webhooks/lml/route.ts` (novo)
- `lib/lml/webhook.ts` (novo)
- `lib/push-notify.ts`

## Critérios de aceite
- [ ] Segredo errado → 401 e nada gravado
- [ ] Segredo certo, evento conhecido → 200 e estado mudou
- [ ] Evento desconhecido → 200, registrado, estado intacto
- [ ] Mesmo evento duas vezes → um só efeito
- [ ] Evento antigo depois de um novo não retrocede o pedido
- [ ] Nenhum texto de push contém nome de exame ou valor
