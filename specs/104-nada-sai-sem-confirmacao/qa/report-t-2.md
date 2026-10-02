# QA — T-2: O Command Center para de enviar

**Veredito:** ✅ aprovado
**Data:** 02/10/2026 · **Método:** teste + mutação. Sem Playwright e sem dev
server: há outra frente no mesmo repositório e o `.next` é compartilhado.

## Cenários

| # | cenário | resultado |
|---|---|---|
| 8 | pedir WhatsApp pelo chat → **nada sai**, 1 linha na fila | ✅ |
| 9 | nome que casa com 2+ pacientes → devolve candidatos, não escolhe | ✅ |
| 10 | a resposta não diz "enviado" para o que ficou na fila | ✅ |
| 11 | `send_email` para paciente → enfileira | ✅ |
| 12 | grep: nenhum `sendAIWhatsAppMessage`/`sendEmail` direto para paciente | ✅ |

Extras não previstos na qa-spec e cobertos: telefone solto sem paciente não
enfileira contra ninguém (400); mensagem vazia não vira linha na fila; as
duas buscas são escopadas ao `clinicId` da sessão.

```
$ npx jest __tests__/notifications/o-chat-nao-manda-ele-enfileira.test.ts
Tests:       8 passed, 8 total
```

## Mutação

| mutação | testes que caem |
|---|---|
| o chat volta a escolher o primeiro candidato e mandar | **1** |
| o e-mail do chat deixa de checar se o destinatário é paciente | **1** |

Árvore conferida por `md5sum` antes e depois de cada uma: restaurada.

## O que este QA não cobre

1. **A tela do Command Center.** O texto da resposta mudou de "sent" para
   "queued", e que isso aparece bem no chat não foi visto por ninguém.
2. **O caminho até a outbox.** Provado que `enqueueMessage` é chamado; que a
   linha aparece na fila de aprovação e entrega ao ser aprovada, não.
3. **Nada em produção.**
4. O ramo `type: "ai"` de `app/api/admin/whatsapp/route.ts` continua
   mandando texto gerado por IA sem prévia — **é outra rota**, não entrou
   na T-2 e segue aberta.
