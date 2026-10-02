# T-7: A tela única de tudo que saiu

**Status:** implementada em 02/10/2026 — QA pendente

> **Decidido no passo 1:** estender a aba **Activity** que já existe
> (`components/admin/patient-activity-tab.tsx` +
> `app/api/admin/patients/[id]/activity/route.ts`), e não criar uma sexta
> superfície. Ela já juntava seis fontes; ganhou três — o que saiu
> (`PatientOutboundEmail`), o veredito do portão (`SystemLog` com
> `source: "patient-send-gate"`, **inclusive as recusas**) e a fila
> (`OutboundMessage`).
>
> **O que ficou de fora e precisa de outra passada:** o corpo completo do
> e-mail só aparece truncado em 160 caracteres na descrição — o passo 4
> pede poder abrir a mensagem inteira, e isso exige um diálogo que não
> construí.
**Depende de:** T-1

## Objetivo

Um lugar onde o Bruno vê tudo que saiu para um paciente, por qualquer
canal. É a precondição que ele mesmo pôs em 17/09 para voltar a confiar em
qualquer automação.

## Contexto

A razão original da regra não era medo de mandar — era não saber onde fica
registrado:

> "nunca enviar nada a ninguem sem eu apertar o botao, **pois nao sei onde
> fica registrado os envios**. So vamos automatixar depois de no dashboard
> da paciente eu ter um local para ver e acompanhar tudo."

Enquanto essa tela não existir, nenhuma automação volta. Por isso esta
tarefa não é enfeite: é o que destrava o resto.

Hoje o registro está espalhado: `PatientOutboundEmail` (só e-mail do
compositor), `OutboundMessage` (fila), `AuditLog` (dedupe dos lembretes),
`SystemLog` (o que foi suprimido), e o log do `outbound-guard` (o que foi
descartado fora de produção). Cinco lugares, nenhum completo.

Já existe uma aba Activity na ficha do paciente. Ela funciona, mas o Bruno
pediu algo mais visível e dedicado — então **conferir primeiro** se dá para
estender a Activity em vez de criar uma sexta superfície.

## Passos

1. Decidir: aba nova ou seção dentro da Activity. Preferir estender.
2. A linha do tempo mostra, por paciente, em ordem: **quando, por qual
   canal, qual template/assunto, quem apertou o botão, e o que aconteceu**
   (entregue, falhou, barrado pelo portão, descartado pelo sink).
3. Incluir o que **não** saiu. Uma tela que só mostra sucesso esconde
   justamente o que ele quer auditar — e o portão do T-1 já registra as
   recusas.
4. Poder abrir o corpo do que foi enviado, não só o nome do template.
5. Distinguir visualmente: disparado por ele · disparado pelo paciente
   (transacional) · disparado por sistema (alerta de crise).
6. Conferir que `patientId` chega em todos os caminhos de registro — se um
   envio não souber de quem é, não aparece na tela de ninguém.

## Arquivos afetados

- `components/admin/` — aba Activity do paciente (ou componente novo)
- `app/api/admin/patients/[id]/` — rota que lê o histórico consolidado
- `lib/patient-send-gate.ts` (o que o T-1 grava precisa bater com o que
  esta tela lê)

## Critérios de aceite

- [ ] Um envio por cada canal aparece na tela, com data, canal, assunto e
      autor.
- [ ] Um envio **barrado** pelo portão aparece, marcado como barrado e com
      o motivo.
- [ ] Dá para ler o corpo do que foi enviado.
- [ ] Transacional do paciente e alerta de sistema aparecem distintos do
      que o Bruno disparou.
- [ ] Nenhum envio ao paciente, em nenhuma rota do grupo A, fica fora
      desta tela — conferir uma a uma contra a lista do plano.
- [ ] A tela funciona no telefone, que é onde ele lê.
