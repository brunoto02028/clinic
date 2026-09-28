# T-4: Sign in with Apple — exigência, não opção

**Status:** pendente
**Depende de:** T-1

## Objetivo

Oferecer "Entrar com a Apple" no iOS, com o mesmo destaque do botão do Google.

## Contexto

Não é preferência de produto: a diretriz 4.8 da App Review exige uma opção de
login com privacidade equivalente quando o app oferece login de terceiro. **Sem
isso o app é rejeitado** — e o app já está no TestFlight, esperando para ir à
loja.

Detalhe que morde: **nome e e-mail só vêm no primeiro login.** Quem não gravar
na hora não tem uma segunda chance.

E o e-mail pode ser um relay `@privaterelay.appleid.com`. Sem configurar o
domínio da clínica em *Sign in with Apple for Email Communication*, nenhum
e-mail da BPR chega a quem escolheu esconder o endereço — e essa pessoa some em
silêncio.

## Passos

1. Capability "Sign in with Apple" no App ID. **Ela invalida o provisioning** e
   o menu do EAS é interativo: precisa do Bruno na frente
   ([[bug-capability-nova-invalida-provisioning]]).
2. `expo-apple-authentication` no app, com o botão oficial.
3. `POST /api/mobile/auth/apple`: validar o JWT com as chaves públicas de
   `appleid.apple.com`, `iss` da Apple, `aud` = `com.bpr.clinic`, e o `nonce`
   por SHA-256.
4. Mesmo `Account`, com `provider: "apple"`.
5. Gravar nome e e-mail **no primeiro login**, porque não haverá outro.
6. Exclusão de conta **revoga o token da Apple** (`/auth/revoke`) — também
   exigência dela. O `lib/account-closure.ts` já existe e é onde isso entra.

## Critérios de aceite

- [ ] Botão da Apple com o mesmo destaque do Google, no iOS
- [ ] Primeiro login grava nome e e-mail
- [ ] Token adulterado ou com `aud` errado → 401
- [ ] Relay de e-mail chega, com o domínio configurado
- [ ] Excluir a conta revoga o token da Apple
