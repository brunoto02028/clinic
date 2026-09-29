# T-4: O paciente desmarca pelo app

**Status:** pendente
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

## Arquivos afetados
- `mobile/src/api/cancellation.ts` (novo)
- `mobile/app/(app)/(clinica)/appointment/[id].tsx`
- `__tests__/mobile/o-paciente-desmarca.test.ts`

## Critérios de aceite
- [ ] Só consulta futura e em aberto oferece o botão.
- [ ] Sem motivo não envia.
- [ ] A tela nunca diz "cancelado" antes de a clínica decidir.
- [ ] Pedido duplicado é mostrado, não recusado com erro cru.
- [ ] A antecedência aparece antes do envio.
