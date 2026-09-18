# T-4: Envio para o Emanuel em produção

**Status:** pendente
**Depende de:** T-1, T-2, T-3 no ar (deploy)

## Objetivo
O Emanuel recebe o e-mail de boas-vindas do "Manu Training" com uma nova senha temporária.

## Passos
1. Depois do deploy, o Bruno abre Settings → Clinics → menu do "Manu Training" → "Send welcome e-mail to owner", escolhe o idioma e confirma.
2. Conferir o envio pela resposta da ação (toast) e pelos logs da aplicação no Coolify (`[EMAIL] Sent via Resend … id`).
3. O Bruno confirma com o Emanuel que o e-mail chegou, inclusive se foi para o spam.

## Critérios de aceite
- [ ] Toast "sent" e log do Resend com id.
- [ ] O Emanuel recebeu e conseguiu entrar com a nova senha.
