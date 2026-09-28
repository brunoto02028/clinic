# QA — Atividade 097 (entrar com Google e com Apple)

Escrita com o plano, em 28/09/2026. O que não puder ser executado é **"não
executado"**, nunca "passou".

## O ambiente, e um aviso que vale mais que os outros

- **Nenhum token vai para o relatório.** Nem trecho, nem "os primeiros dez
  caracteres". Se precisar mostrar que um token existe, mostre o **tamanho** e o
  `aud`, nunca o valor.
- Dev server em porta própria, confirmada como este checkout. Havendo QA em
  paralelo, valem as cinco regras de
  [095/qa/como-rodar.md](../../095-ajustes-para-publicar/qa/como-rodar.md).
- **Nunca logar em paciente real.** Paciente de teste identificado — e aqui isso
  pesa mais: este QA mexe com **entrar na conta de alguém**.
- Em produção hoje `/api/auth/providers` responde só `credentials`. O estado
  inicial é esse, e vale medi-lo antes.

## T-1 — O backend valida

| # | passos | esperado |
|---|---|---|
| 1.1 | token válido, paciente que já tem `Account` do Google | 200, com access + refresh |
| 1.2 | o formato da resposta | **idêntico** ao de `/api/mobile/login` |
| 1.3 | token com assinatura adulterada | 401 |
| 1.4 | token expirado | 401 |
| 1.5 | token com `aud` de outro aplicativo | 401 |
| 1.6 | `email_verified: false` | recusado |
| 1.7 | `nonce` diferente do enviado | recusado |
| 1.8 | **pessoa gerida** (com `managedById`) | recusada, com a mesma frase do login por senha |
| 1.9 | paciente que nunca aceitou os termos | cai no portão de consentimento, não passa direto |
| 1.10 | 11 tentativas no mesmo minuto | a 11ª é barrada |
| 1.11 | os logs do servidor, depois de tudo | **nenhum token**, em sucesso ou em falha |

**As que mais importam:** 1.5, 1.8 e 1.11. Um `aud` aceito por engano deixa
outro aplicativo entrar como se fosse o nosso; a pessoa gerida é a regra que
diz que criança não tem credencial; e token em log é o vazamento que ninguém vê
acontecer.

## T-2 — O vínculo

*(Os cenários dependem da decisão do Bruno. Abaixo, o caminho "não vincular", que
é o da spec dele.)*

| # | passos | esperado |
|---|---|---|
| 2.1 | Google com e-mail de um paciente que já existe, sem `Account` | `409 account_exists`, com a frase que diz o que fazer |
| 2.2 | e o que **não** acontece | nenhuma sessão emitida, nenhuma conta criada |
| 2.3 | entrar com a senha e vincular | o `Account` nasce com o `sub` |
| 2.4 | entrar com Google depois | entra direto |
| 2.5 | e-mail novo, sem paciente nenhum | cria `User` + `Account` e leva ao onboarding |
| 2.6 | o mesmo Google, e-mail trocado no Google depois | continua entrando na **mesma** conta (é o `sub`, não o e-mail) |
| 2.7 | web e app | respondem igual |
| 2.8 | desvincular tendo senha | some o `Account` |
| 2.9 | desvincular **sem** senha | recusado — ficaria sem forma de entrar |

**A que mais importa:** 2.1. É a diferença entre pedir uma prova e aceitar um
e-mail como prova.

## T-3 — O botão no app

**Depende de build.** Sem ele, tudo aqui é **não executado**, verificado por
código.

| # | passos | esperado |
|---|---|---|
| 3.1 | Android em desenvolvimento | entra |
| 3.2 | **`.aab` do teste interno do Play** | entra — é aqui que o SHA-1 da App signing key aparece, ou não |
| 3.3 | iOS no TestFlight | entra |
| 3.4 | cancelar a tela do Google | volta ao login **sem** mensagem de erro |
| 3.5 | logout | limpa a sessão BPR **e** o estado do Google |
| 3.6 | entrar de novo depois do logout | pede a conta; não entra sozinho |
| 3.7 | sem rede no meio | erro amigável nas duas línguas |

**A que mais importa:** 3.2. É o cenário que a spec do Bruno avisa: funciona no
teste e quebra na loja, com `DEVELOPER_ERROR`.

## T-4 — Entrar com a Apple

| # | passos | esperado |
|---|---|---|
| 4.1 | o botão no iOS | mesmo destaque do Google |
| 4.2 | primeiro login | nome e e-mail **gravados na hora** |
| 4.3 | segundo login | funciona sem nome e e-mail (a Apple não os manda de novo) |
| 4.4 | e-mail escondido (`@privaterelay`) | a clínica consegue enviar, com o domínio configurado |
| 4.5 | token adulterado ou `aud` errado | 401 |
| 4.6 | excluir a conta | vínculos apagados **e** token revogado na Apple |
| 4.7 | o prontuário, depois da exclusão | mantido pela retenção de 8 anos |

**A que mais importa:** 4.2. Não há segunda chance: quem não gravar no primeiro
login fica sem o nome para sempre.

## T-5 — O Google na web

| # | passos | esperado |
|---|---|---|
| 5.1 | `/api/auth/providers` antes | só `credentials` |
| 5.2 | com as variáveis, depois | `google` aparece |
| 5.3 | `/login` | o botão aparece |
| 5.4 | paciente existente | entra e cai no lugar certo |
| 5.5 | pessoa gerida | continua sem entrar |
| 5.6 | quem não aceitou os termos | cai no portão |
| 5.7 | o `Account` criado | tem o `sub` como `providerAccountId` |

## T-6 — Privacidade e exclusão

| # | passos | esperado |
|---|---|---|
| 6.1 | a política | tem a seção, nas duas línguas |
| 6.2 | o que ela diz | nome, e-mail e foto — e o que **não** recebemos |
| 6.3 | excluir a conta | `Account` apagados |
| 6.4 | e na Apple | token revogado |
| 6.5 | o prontuário | intacto, sob retenção |
| 6.6 | a versão da política | subiu |
