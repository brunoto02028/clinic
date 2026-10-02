# T-2: O Command Center para de enviar

**Status:** pendente
**Depende de:** T-1

## Objetivo

Fechar o pior caso da varredura: o chat de IA do painel manda WhatsApp e
e-mail para paciente, com texto escrito pela IA, sem prévia e sem
confirmação.

## Contexto

`app/api/admin/command-chat/actions/route.ts`:

- **linha 624** — ação `send_whatsapp`. O texto é gerado por
  `sendAIWhatsAppMessage`. O destinatário, quando não vem telefone, é
  resolvido assim (linhas 600-612):

  ```ts
  const patient = await prisma.user.findFirst({
    where: { role: "PATIENT", OR: [
      { firstName: { contains: name, mode: "insensitive" } },
      { lastName:  { contains: name, mode: "insensitive" } },
    ]},
  });
  ```

  `findFirst` com `contains`: "Ana" acha a primeira Ana do banco. Pode não
  ser a Ana que ele quis.

- **linha 501** — ação `send_email`. Endereço arbitrário, corpo do LLM,
  `\n` virando `<br/>`, sem prévia.

Duas coisas erradas somadas: **manda sem confirmar** e **escolhe o
destinatário por palpite**. A segunda é pior, porque erra a pessoa.

## Passos

1. `send_whatsapp` e `send_email` deixam de enviar. Passam a criar linha
   em `lib/automation/outbox.ts` via `enqueueMessage` ("Queues a message.
   Never sends.").
2. A resposta do chat muda de "WhatsApp sent to X" para algo que diga a
   verdade: ficou na fila, e com link para aprovar.
3. **Tirar a resolução por nome.** Sem `to`/`patientId` explícito, a ação
   não executa — devolve a lista de candidatos para o Bruno escolher, em
   vez de chutar o primeiro.
4. Se mais de um paciente casar com o nome, **nunca** escolher: devolver
   os candidatos.
5. Varrer o resto de `command-chat/` atrás de outras ações que toquem o
   paciente (o arquivo é grande; `send_email` e `send_whatsapp` são as que
   a varredura achou, não necessariamente as únicas).

## Arquivos afetados

- `app/api/admin/command-chat/actions/route.ts`
- `lib/automation/outbox.ts` (leitura; só se faltar algum campo)
- componente do chat do Command Center (texto da resposta e o link)

## Critérios de aceite

- [ ] Pedir ao chat "manda um WhatsApp para a Ana" **não envia nada** —
      prova por contagem de `OutboundMessage` e pelo log do outbound-guard.
- [ ] A linha entra na fila com `status` de pendente e é visível na tela do
      T-7.
- [ ] Nome ambíguo devolve candidatos; nome único **também** não envia,
      apenas enfileira.
- [ ] A frase de resposta do chat não usa "sent"/"enviado" para algo que
      ficou na fila.
- [ ] Nenhum caminho de `command-chat/` chama `sendAIWhatsAppMessage` ou
      `sendEmail` direto (prove com grep no diff).
