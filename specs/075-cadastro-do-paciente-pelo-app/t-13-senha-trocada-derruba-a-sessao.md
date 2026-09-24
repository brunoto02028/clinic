# T-13: Senha trocada derruba a sessão do app

**Status:** pendente · **Depende de:** nenhuma

## Objetivo
Que trocar a senha signifique o que as pessoas acham que significa.

## Contexto — medido
- **Não existe rota no admin para trocar a senha de um paciente.** O admin define uma senha na
  criação (`app/api/admin/patients/route.ts:155`) e nunca mais. Quem troca é o próprio paciente,
  pela recuperação de senha.
- **`app/api/auth/reset-password` troca a senha e não revoga nada.** Nem sessão web, nem refresh
  token do app. `revokeAllForUser` existe em `lib/mobile-tokens.ts:120` e só é chamada no
  encerramento de conta e na detecção de reuso de token.

Ou seja: quem estiver dentro do app com a senha antiga **continua dentro** depois da troca. Para
uma paciente que pediu a troca justamente porque alguém tinha acesso, isso é o contrário do que
ela pediu.

## Passos
1. `reset-password` passa a revogar os refresh tokens do app e invalidar a sessão web.
2. Uma ação no admin para **disparar** a redefinição (manda o link, não escolhe a senha por ela —
   senha que a clínica conhece não é senha).
3. A tela do app trata o 401 que vem depois: manda para o login dizendo que a senha mudou, em vez
   de "sessão expirada", que não explica nada.
4. Registrar em auditoria quem disparou.

## Arquivos afetados
- `app/api/auth/reset-password/route.ts`, `lib/mobile-tokens.ts` (uso), rota nova no admin,
  `mobile/src/api/client.ts` (mensagem do 401)

## Critérios de aceite
- [ ] Depois de redefinir a senha, o app cai para o login na próxima requisição
- [ ] A sessão web antiga também cai
- [ ] A clínica dispara a redefinição sem nunca ver nem escolher a senha
- [ ] A ação aparece na auditoria
