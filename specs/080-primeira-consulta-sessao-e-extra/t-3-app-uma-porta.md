# T-3: O app mostra uma porta so

**Status:** pendente
**Depende de:** T-2

## Objetivo
O paciente ve um botao e entende o que vai acontecer antes de tocar.

## Contexto
A tela de marcar hoje nao fala de preco nem de sessao. Quem tem pacote nao sabe quantas restam;
quem vai pagar descobre depois.

## Passos
1. `book-appointment.tsx` le `booking-options` e monta o cabecalho conforme o `kind`.
2. Sessao de pacote: "Restam 4 de 10". Primeira consulta e extra: o preco, antes do toque.
3. Bloqueado pela triagem: o caminho para a triagem, nao um botao morto.
4. Pagamento abre o Checkout do Stripe no navegador do sistema e volta para a confirmacao.
5. EN primeiro, PT depois.

## Arquivos afetados
- `mobile/app/(app)/(clinica)/book-appointment.tsx`, `mobile/src/api/booking.ts`

## Criterios de aceite
- [ ] Os quatro estados aparecem com o texto certo
- [ ] Preco visivel antes de confirmar
- [ ] Pagamento cancelado no Stripe nao deixa horario reservado
- [ ] EN e PT revisados
