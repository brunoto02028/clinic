# QA — T-1, T-2 e T-3

**Data:** 24/09/2026 · **Ambiente:** worktree `app_clinic`, API em `:4010`, app no alvo **Expo Web**
em `:8085` (`EXPO_PUBLIC_API_URL=http://localhost:4010`)
**Dados:** prefixo `qa-075-`, removidos ao final (1 token, 1 usuário, 1 clínica; zero sobras)
**Resultado:** ✅ **aprovado**, com **um defeito real encontrado e corrigido** e **uma regressão
minha, pega e desfeita**

Desta vez a tela foi **dirigida de verdade**, não só a API: o middleware já tem CORS para o alvo
Expo Web, então o app roda no navegador e o Playwright consegue clicar nele.

## A matriz

| # | Cenário | Resultado |
|---|---|---|
| 1.1 | Cadastro com dados válidos | ✅ entra e **vai para a avaliação** |
| 1.2 | Senha com 6 caracteres | ✅ *"Your password needs at least 8 characters."*, sem ir ao servidor |
| 1.3 | Confirmação diferente | ✅ *"The two passwords do not match."* |
| 1.4 | Botão com campo vazio | ✅ desabilitado |
| 1.6 | EN e PT | ✅ o idioma escolhido viaja entre as telas (`?lang=pt`) |
| 2.1 | Primeira tela pós-cadastro | ✅ `/screening`, avaliação de 9 etapas terminando em **Consent** |
| 3.1 | E-mail que já existe | ✅ convite *"You already have an account here"* com **Entrar** e **Definir minha senha** |
| 3.2 | Banco depois de 3.1 | ✅ **1** usuário com aquele e-mail |
| 3.3 | "Definir minha senha" | ✅ abre `/forgot-password?email=…&lang=…` com o e-mail preenchido |
| 5.3 | Código do profissional inexistente | ✅ mensagem própria; **nenhum usuário criado** |
| X.1 | Sem código e sem clínica padrão | ✅ `503`, nunca conta sem tenant |

Banco ao fim do cadastro válido: `role PATIENT`, clínica `qa-075-default`,
`consentAcceptedAt: null` (é assim que deve nascer — o aceite é a última etapa da avaliação),
`isActive: true`, senha em hash.

## O defeito que só apareceu dirigindo a tela

A tela de recuperar senha da 074 **falhava no alvo Web**:

```
Access to fetch at 'http://localhost:4010/api/auth/forgot-password'
  from origin 'http://localhost:8085' has been blocked by CORS policy
```

`MOBILE_API_PREFIXES` cobre `/api/patient` e `/api/mobile` — por isso o cadastro funcionava — mas
não `/api/auth`. No iOS nativo isso nunca apareceria, porque nativo não aplica CORS; no navegador
a tela simplesmente não funciona.

**Primeira tentativa, errada:** acrescentei os caminhos ao `MOBILE_API_PREFIXES`. Continuou
falhando — o middleware **pula `/api/auth` inteiro** antes de chegar ao bloco de CORS. Era código
morto. Revertido.

**Correção:** o padrão da casa para isto são as rotas exportarem o próprio `OPTIONS`, como as de
`/api/mobile` já fazem. `forgot-password` e `reset-password` passaram a usar
`corsPreflight()`/`corsJson()` de `lib/mobile-cors`. Provado:

```
OPTIONS /api/auth/forgot-password  → 204
  access-control-allow-origin: *
```

e a tela, em português, respondendo *"Se existir uma conta com esse e-mail, um link para definir
uma nova senha está a caminho."*

## A regressão minha, pega antes de sair

`mobile/app/register.tsx` **já existia** — eu escrevi por cima sem conferir, o mesmo erro que
cometi com `lib/patient-report.ts` mais cedo nesta sessão. A tela anterior tinha um campo que a
minha não tinha: **código do profissional**, que é o cerne da T-5. Descobri ao investigar por que
o botão "Get started" da tela inicial já apontava para `/register`: a rota não era nova.

Restaurado, com o mesmo `testID` de antes (`register-professional-code`,
`register-confirm-password`), agora traduzido e com mensagem própria para o `404`. O que a tela
anterior **não** tinha e ficou: português, erro distinto por status, o convite do 409, os links
legais e a ida para a avaliação.

## Console

Zero erros de JavaScript em todo o percurso. Os únicos registros são os HTTP esperados — o `409`
do e-mail repetido e, antes da correção, o CORS.
