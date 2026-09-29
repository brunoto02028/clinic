# T-4: O paciente desmarca pelo app

**Status:** implementada, review feito — aguardando QA
**Depende de:** nenhuma

## Objetivo

Dar tela à rota que já existe, para quem não pode vir avisar em vez de sumir.

## Contexto

`POST /api/patient/cancellation` pede motivo, calcula horas de antecedência,
recusa pedido duplicado — e **nenhuma tela do app a chama**. Quem não pode vir
liga, ou não aparece. Não aparecer vira falta que ninguém entende.

É **pedido**, não execução: a clínica aprova. A tela precisa dizer isso, senão a
pessoa sai achando que desmarcou.

## Passos

1. Botão na tela de detalhe, só para consulta futura e em aberto.
2. Motivo obrigatório — é o que a rota exige, e é o que a clínica lê para
   decidir.
3. A tela diz **a antecedência** ("faltam 6 horas") antes de enviar, porque é o
   que muda a resposta da clínica.
4. Depois de enviar: "pedido enviado, a clínica responde" — nunca "cancelado".
5. Pedido já existente aparece como tal, em vez de deixar pedir de novo e levar
   erro.

## Como ficou

As regras ficaram em `mobile/src/lib/desmarcar-consulta.ts`, puras: quando o
botão aparece, quantas horas faltam, o que a clínica já respondeu, e os textos.
A tela do detalhe abre um formulário no lugar, sem modal — o resto da tela não
usa modal nenhum, e não era hora de inventar um padrão.

**Conferido antes de escrever**, e não por otimismo: `/api/patient` está em
`MOBILE_API_PREFIXES` no middleware e `getEffectiveUser` entende o bearer. Esta
casa já teve três telas do aplicativo morrendo no portão de sessão da web.

O aviso de antecedência diz as horas e, abaixo de 24, a política de 50% — mas
**não calcula valor nenhum**. A conta do reembolso é do servidor; uma segunda
cópia dela aqui divergiria na primeira mudança de política. Um teste guarda
isso.

## Arquivos afetados
- `mobile/src/lib/desmarcar-consulta.ts` (novo)
- `mobile/src/api/cancellation.ts` (novo)
- `mobile/app/(app)/(clinica)/appointment/[id].tsx`
- `__tests__/mobile/o-paciente-desmarca.test.ts` (novo, 28 casos)

## O que o code review encontrou — e o pior achado do dia

**1. Pedir disparava um e-mail dizendo que a consulta foi cancelada.**

A rota mandava o modelo `APPOINTMENT_CANCELLED` — assunto *"Appointment
Cancelled"*, corpo *"your appointment has been cancelled as requested"* — no
instante em que a solicitação nasce `PENDING`. A consulta continuava na agenda.

Junto ia *"a refund of £X is being processed"*, e `refundEligible` é sempre
`true` no caminho de consulta: o reembolso só existe quando alguém aperta o
botão no painel. E o assunto saía *"Appointment Cancelled — Your appointment"*,
porque `appointmentDate` era essa string literal.

A tela cuidava de nunca dizer "cancelada". O e-mail dizia. Sem prévia, sem
ninguém pedir — contra a regra de 17/09/2026.

O código da rota é anterior a esta tarefa. **Mas era a T-4 que o tornaria
rotina**: nenhuma tela do aplicativo chamava essa rota, e o aplicativo é o alvo
do paciente. Removido.

**2. `"aprovado"` era estado morto na tela.**

O painel tem dois botões — aprovar e, depois, reembolsar — e só o segundo
cancela a consulta. Entre um e outro, o pedido está `APPROVED` e a consulta
segue `CONFIRMED` no futuro: exatamente o estado em que a tela voltava a
oferecer "Pedir cancelamento", para o servidor responder *"já existe uma
solicitação"*. Era o defeito que `estadoDoPedido` existe para impedir. Virou
`jaPediu()`.

**3.** *"cerca de 1 hora"* para vinte minutos — agora diz minutos abaixo de uma
hora, que é justamente quando o número decide se dá tempo de avisar.

## Fora do escopo, e o Bruno precisa saber

`/api/admin/cancellations` **não filtra por clínica**. O GET lista as
solicitações de todas as clínicas, com nome, e-mail e o motivo em texto livre do
paciente; o POST aceita aprovar, recusar e **reembolsar** a solicitação de outra
clínica, inclusive disparando `stripe.refunds.create` sobre o pagamento dela.

Não foi introduzido aqui e não foi consertado — a regra da casa é avisar, não
executar por conta própria. Mas é esta tarefa que começa a povoar essa tabela
com linhas reais de paciente, então o assunto deixou de ser teórico.

Menor, da mesma rota do paciente: `app/api/patient/cancellation/route.ts`
responde **403** para "não é seu", onde a regra da casa é 404.

## Critérios de aceite
- [x] Só consulta futura e em aberto oferece o botão.
- [x] Sem motivo não envia.
- [x] A tela nunca diz "cancelado" antes de a clínica decidir — o teste varre
      **todos** os textos atrás de "cancelled"/"cancelada".
- [x] Pedido duplicado é mostrado, não recusado com erro cru.
- [x] A antecedência aparece antes do envio.
- [x] Pedir **não** dispara e-mail dizendo que cancelou (achado do review).
- [x] Pedido aprovado também fecha a porta de pedir de novo (achado do review).
- [ ] QA no aplicativo, com pedido de verdade.
