# T-3: O botão no app

**Status:** pendente
**Depende de:** T-1

## Objetivo

"Continuar com Google" na tela de entrada do app, Android e iOS.

## Contexto

O app é Expo, então vale o caminho React Native da sua spec:
`@react-native-google-signin/google-signin`, com config plugin e **development
build** — não funciona no Expo Go.

**Isso é módulo nativo:** dependência nova, fingerprint muda, e a tela só chega
ao telefone com **build novo**. Build só com a sua autorização
([[feedback_build-so-com-autorizacao]]). Vale juntar com o build que já está
esperando a cota renovar.

Cuidado conhecido, da sua própria spec: **os três SHA-1**. Sem o da *App signing
key* do Play, o login funciona no teste e quebra no app baixado da loja, com
`DEVELOPER_ERROR` — um erro que aparece longe da causa.

## Passos

1. `GoogleSignin.configure({ webClientId, iosClientId })`.
2. Gerar um `nonce` aleatório por tentativa e mandar junto ao backend.
3. `signIn()` → `idToken` → `POST /api/mobile/auth/google` → guardar o par de
   tokens no armazenamento seguro que o app já usa (`expo-secure-store`).
4. Botão com o visual oficial do Google, nas duas línguas.
5. **Cancelar não é erro.** Quem fecha a tela do Google volta ao login em
   silêncio — sem alerta vermelho.
6. No logout, limpar também o estado do Google (`signOut`), senão a próxima
   tentativa entra sozinha na conta anterior.

## Arquivos afetados

- `mobile/package.json`, `mobile/app.json` (plugin)
- a tela de login do app
- `mobile/src/api/auth.ts`, `mobile/src/store/auth.ts`

## Critérios de aceite

- [ ] Entra no Android em desenvolvimento e no aparelho
- [ ] Entra no iOS pelo TestFlight
- [ ] Entra no `.aab` baixado do teste interno do Play (é aqui que o SHA-1 da
      App signing key aparece, ou não)
- [ ] Cancelar volta sem mensagem de erro
- [ ] Logout limpa a sessão BPR **e** o estado do Google
