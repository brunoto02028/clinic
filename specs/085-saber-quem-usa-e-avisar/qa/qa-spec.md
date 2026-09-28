# QA — Atividade 085 (saber quem usa, e avisar)

Escrita junto do plano. Paciente de teste identificado, nunca paciente real.

## T-1 — Sessão do app

| # | tipo | cenário | esperado |
|---|---|---|---|
| 1.1 | API | Dois sinais com 3 min entre eles | **uma** `AppSession`, `lastSeenAt` atualizado |
| 1.2 | API | Sinal depois de 40 min de silêncio | sessão nova; a anterior com `endedAt = lastSeenAt` |
| 1.3 | API | Sinal sem token | 401, nada gravado |
| 1.4 | API | Sinal com `userId` no corpo diferente do token | o do token vence |
| 1.5 | API | Sessão de outra clínica | não entra na contagem desta |
| 1.6 | UI | App em segundo plano por 10 min | nenhum sinal enviado |
| 1.7 | UI | Sem rede | o sinal falha em silêncio; nenhuma tela trava |
| 1.8 | shell | `prisma migrate diff` contra o `main` | **zero DROPs**, output colado |

## T-2 — Cidade por IP

| # | tipo | cenário | esperado |
|---|---|---|---|
| 2.1 | API | Login com IP público conhecido | `city` e `country` gravados na sessão |
| 2.2 | API | Provedor fora do ar | login **funciona**; sessão sem cidade |
| 2.3 | API | Mesmo IP duas vezes no mesmo dia | uma consulta só (cache) |
| 2.4 | API | IP privado (`192.168.*`) | nenhuma consulta, nenhuma cidade |
| 2.5 | banco | Depois de vários logins | **nenhum IP cru** em `AppSession` |
| 2.6 | shell | `app.json` | inalterado — nenhuma permissão nova, nenhum build |

## T-3 — O painel

| # | tipo | cenário | esperado |
|---|---|---|---|
| 3.1 | UI | Abrir `/admin/usage` | lista carrega com as três respostas |
| 3.2 | API | Actor da clínica A | nenhum dado da clínica B |
| 3.3 | UI | Pessoa que nunca abriu o app | aparece como "nunca abriu" |
| 3.4 | UI | Sessão sem cidade | mostra "—" |
| 3.5 | UI | Versão do app na lista | bate com o que o aparelho mostra no rodapé |

## T-4 — Aviso manual

| # | tipo | cenário | esperado |
|---|---|---|---|
| 4.1 | UI | Compor um aviso | prévia obrigatória antes de qualquer botão de enviar |
| 4.2 | UI | A prévia | as duas línguas e o logo BPR, como chega no aparelho |
| 4.3 | UI | Contagem do público | número certo, e só desta clínica |
| 4.4 | **API** | **Público de outra clínica** | **impossível — teste reprova a remoção do filtro** |
| 4.5 | API | Enviar duas vezes | uma entrega só |
| 4.6 | API | Pessoa sem token de push | não recebe, e isso aparece na contagem |
| 4.7 | shell | Varredura de crons e automações | nenhum caminho envia sem clique |
| 4.8 | UI | Histórico | o que foi enviado, para quem, quando, por quem |

## T-5 — Novidade dentro do app

| # | tipo | cenário | esperado |
|---|---|---|---|
| 5.1 | UI | Exame novo no catálogo | faixa aparece na tela do laboratório |
| 5.2 | UI | Dispensar a faixa | some, e não volta |
| 5.3 | UI | Sem exame novo | faixa não existe (nada de "nenhuma novidade") |
| 5.4 | API | Catálogo atualizado | **nenhum** push disparado |
| 5.5 | UI | EN e PT | as duas versões conferidas |

## QA online (obrigatório, depois do deploy)

Repetir 1.1, 2.1, 3.2 e 4.4 em produção com o paciente de teste, e conferir o commit pela lista de
deployments do Coolify — `buildDate` não prova o deploy.
