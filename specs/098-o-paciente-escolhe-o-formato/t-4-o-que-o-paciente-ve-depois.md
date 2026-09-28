# T-4: O que o paciente vê depois da decisão

**Status:** pendente
**Depende de:** T-3

## Objetivo

A pessoa que pediu precisa saber o que aconteceu — sem que nada seja enviado a
ela automaticamente.

## Contexto

*"Nunca enviar a paciente automaticamente"* vale aqui. A decisão aparece quando
ela abre o app; quem avisa é a clínica, num botão.

## Passos

1. Na lista de consultas e na consulta, três estados visíveis:
   - **pendente**: *"Pedido de atendimento em casa — aguardando a clínica"*
   - **aprovado**: o formato novo, com o ícone que já existe
   - **recusado**: *"A clínica manteve na clínica"* + o motivo
2. O estado recusado **some** depois que a pessoa vê a consulta uma vez — a
   frase informa, não acusa.
3. Botão **"Avisar o paciente"** no painel, junto da decisão, que dispara o
   aviso **naquele clique** e diz em quantos aparelhos chegou.

## Arquivos afetados

- `mobile/app/(app)/(clinica)/(tabs)/appointments.tsx`
- `mobile/app/(app)/(clinica)/appointment/[id].tsx`
- `app/admin/appointments/page.tsx`

## Critérios de aceite

- [ ] Os três estados aparecem, em inglês e português
- [ ] **Nenhum** aviso sai sem alguém clicar
- [ ] O contador de aparelhos aparece, e zero é explicado
- [ ] Consulta sem pedido não mostra nada disto
