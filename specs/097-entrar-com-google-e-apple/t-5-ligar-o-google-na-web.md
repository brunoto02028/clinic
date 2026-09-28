# T-5: Ligar o Google na web, que já está escrito

**Status:** pendente
**Depende de:** nenhuma

## Objetivo

Fazer aparecer na web o botão do Google que **já existe no código**.

## Contexto

`lib/auth-options.ts` já tem o `GoogleProvider`, com um comentário explicando
que ele some quando faltam as variáveis — e é o que acontece:
`/api/auth/providers` em produção responde só `credentials`.

Ou seja: **esta tarefa é quase só configuração**, e dá para testar sem build
nenhum. É o caminho mais curto para você ver o login com Google funcionando de
verdade.

## Passos

1. `GOOGLE_CLIENT_ID` e `GOOGLE_CLIENT_SECRET` no Coolify — o cliente Web que
   você já criou (`48914887762-n5snld1o…`).
2. Conferir os *Authorized redirect URIs* do cliente Web:
   `https://bpr.clinic/api/auth/callback/google`.
3. Publicar a tela de consentimento (sair de "Testing"), senão só usuários de
   teste entram.
4. Aplicar a decisão da T-2 sobre vincular ou não vincular.
5. Conferir que o portão de consentimento e a recusa de pessoa gerida continuam
   valendo por este caminho também.

## Critérios de aceite

- [ ] O botão do Google aparece em `/login`
- [ ] Paciente existente entra e cai no lugar certo
- [ ] Pessoa gerida continua sem entrar
- [ ] Quem não aceitou os termos cai no portão de consentimento
- [ ] O `Account` é criado com o `sub`, não com o e-mail
