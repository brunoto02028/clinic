# T-3: Escolha de forma de pagamento na tela de agendamento

**Status:** concluído
**Depende de:** T-1

## Objetivo
Na tela de agendamento (`components/appointments/booking-form.tsx`), o paciente escolhe
explicitamente entre "pagar online agora" e "pagar presencialmente", antes de confirmar o
pedido.

## Contexto
Ver decisão D1 e D3, suposição 4 em `plan.md`. O resumo antes do botão "Confirmar Pedido" já
mostra data/horário/duração/preço (`booking-form.tsx:446-471`). O `handleConfirmBooking`
(`booking-form.tsx:166-193`) já manda `price`/`dateTime`/etc para `POST /api/appointments` —
só falta mandar `paymentMethod` também.

## Passos
1. Adicionar `const [paymentMethod, setPaymentMethod] = useState<"ONLINE" | "IN_PERSON">("ONLINE")`
   perto dos outros states do componente.
2. No bloco de resumo (`booking-form.tsx:446-471`), logo abaixo do preço estimado, adicionar
   dois botões/radio (estilo consistente com os outros seletores do form, ex.: o seletor de
   terapeuta em `booking-form.tsx:301-315`):
   - "Pagar online agora" / "Pay online now"
   - "Pagar presencialmente" / "Pay in person"
   Só mostrar essa escolha quando `!hasActivePackage` (paciente com pacote ativo não paga por
   consulta avulsa — mesma condição já usada para mostrar o preço, linha 464).
3. Incluir `paymentMethod` no body do `fetch` em `handleConfirmBooking`
   (`booking-form.tsx:176-182`).
4. Ajustar o texto do Passo 3 (confirmação, `booking-form.tsx:504-511`): quando
   `paymentMethod === "IN_PERSON"`, trocar "you'll receive... a payment link" por algo como "a
   sua consulta já está confirmada — pague na clínica no dia" / "your appointment is already
   confirmed — pay at the clinic on the day". Manter o texto atual para `ONLINE`.

## Arquivos afetados
- `components/appointments/booking-form.tsx`

## Critérios de aceite
- [ ] Paciente sem pacote ativo vê a escolha antes de confirmar; `ONLINE` pré-selecionado.
- [ ] Escolher "pagar presencialmente" e confirmar manda `paymentMethod: "IN_PERSON"` no POST
      (visível no Network tab / `console.log` de teste).
- [ ] Texto de confirmação muda corretamente conforme a escolha, em pt-BR e en-GB.
- [ ] Paciente com pacote ativo não vê a escolha (comportamento inalterado).
- [ ] `npx tsc --noEmit` e `npx next lint` limpos no arquivo.
