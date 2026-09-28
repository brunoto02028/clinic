# QA — Atividade 091

Cenários por tarefa. O que estiver marcado **bloqueado pela LML** não reprova a tarefa: reprova se
a tela *mentir* sobre o estado, não se a lista vier vazia.

---

## T-1 — Onde se faz o exame

### API · `GET /api/mobile/labs/collection-points`

| # | passos | esperado |
|---|---|---|
| 1.1 | `?postcode=SW1A 1AA` com token de paciente | `postcode: "SW1A 1AA"`, e o perfil **não** é lido |
| 1.2 | `?postcode=sw1a1aa` | normaliza para `SW1A 1AA` |
| 1.3 | `?postcode=onde fica` | `estado: postcode_desconhecido`, sem chamar o serviço externo |
| 1.4 | `?postcode=ZZ1A 1AA` (forma certa, não existe) | `estado: postcode_desconhecido` |
| 1.5 | `?postcode=` (vazio) | cai no cadastro, sem erro |
| 1.6 | sem parâmetro | idêntico ao comportamento anterior |
| 1.7 | sem token | 401 |
| 1.8 | paciente sem código postal e sem busca | `estado: sem_postcode` |

### UI · app

| # | passos | esperado |
|---|---|---|
| 1.9 | varrer a aba Blood tests inteira | **não** existe caminho para procurar ponto antes de pagar |
| 1.9b | abrir um pedido pago de exame venoso | aparece o cartão "Choose where to give your sample" |
| 1.9c | abrir um pedido de kit em casa (todos os de hoje) | o cartão **não** aparece |
| 1.10 | ler o topo da tela de pontos | diz que a coleta **não** é no laboratório e que há pontos por todo o Reino Unido |
| 1.11 | ler "Como funciona" | diz que hoje todo exame do catálogo é kit em casa |
| 1.12 | digitar `SW1A 1AA` → Procurar | área confirmada (hoje: "lista entra quando a conexão abrir") |
| 1.13 | procurar um segundo código postal | mostra o segundo, não o primeiro do cache |
| 1.14 | tocar "Usar o código postal do meu perfil" | volta ao estado do cadastro |
| 1.15 | digitar `abc` → Procurar | erro de digitação, com a forma de exemplo |
| 1.16 | How it works, seção do ponto | explica, e diz que a escolha aparece no pedido depois de pagar |
| 1.17 | alternar EN/PT | todo texto da tela troca; nada fica em inglês no PT |
| 1.18 | tocar num ponto (quando houver lista) | abre o mapa do aparelho |

**Bloqueado pela LML:** 1.18 e a lista de 1.12 só têm dado real com o token. Até lá o cenário passa
se o estado for `laboratorio_desconectado` **com a área confirmada** — o que reprova é a tela dizer
"nenhum ponto encontrado", que seria falso.

---

## T-2 — Dependente

| # | passos | esperado |
|---|---|---|
| 2.1 | cadastrar dependente com nome e data de nascimento | aparece na lista do titular |
| 2.2 | tentar logar com o nome/e-mail do dependente | **não existe conta** — não há o que tentar |
| 2.3 | titular A pede o dependente de B pela API | 404/403, nunca os dados |
| 2.4 | apagar a conta do titular | os dependentes vão junto |
| 2.5 | data de nascimento no futuro | recusada |

## T-3 — O pedido sabe de quem é

| # | passos | esperado |
|---|---|---|
| 3.1 | pedido sem sujeito escolhido | o sujeito é o titular, como sempre foi |
| 3.2 | escolher um dependente no checkout | o pedido guarda o dependente |
| 3.3 | escolher um dependente de outra conta | recusado |
| 3.4 | conferir o que iria à LML | nome e data de nascimento **do sujeito**, não do titular |

## T-4 — Consentimento em duas vozes

| # | passos | esperado |
|---|---|---|
| 4.1 | consentir para si | texto na segunda pessoa, como hoje |
| 4.2 | consentir por um dependente | texto de responsável; registra quem, por quem, quando |
| 4.3 | ler a cláusula de idade | menor sempre com responsável; **sem prometer número que a LML não confirmou** |
| 4.4 | EN e PT | as duas versões dizem a mesma coisa |

## T-5 — O resultado arquiva sob o sujeito

| # | passos | esperado |
|---|---|---|
| 5.1 | resultado de exame de dependente | arquivado sob o dependente |
| 5.2 | o titular abre | vê o resultado, com o nome do dependente visível |
| 5.3 | faixa de referência | a da idade do **sujeito** |

## T-6 — Termos, consentimento e a ficha da Apple

| # | passos | esperado |
|---|---|---|
| 6.1 | `/api/terms` em produção | conta 16+ para ter conta; exame sem limite de idade, menor com responsável |
| 6.2 | comparar termos × consentimento × `prontidao.md` | **as três dizem a mesma coisa** |
| 6.3 | classificação etária declarada | 16+, e o motivo escrito bate com o texto publicado |

---

## T-7 — A criança como paciente, e a área do responsável

### API

| # | passos | esperado |
|---|---|---|
| 7.1 | criar pessoa gerida via `POST /api/mobile/dependents` | nasce `role: PATIENT`, `clinicId` herdado, `pushEnabled: false`, e-mail `@no-mail.invalid` |
| 7.2 | tentar logar com o e-mail sintético dela | recusado, com a mensagem genérica de e-mail desconhecido |
| 7.3 | tentar "esqueci minha senha" para esse e-mail | nenhum envio acontece |
| 7.4 | `POST /api/mobile/dependents/<id>/session` com o token do responsável | devolve token cujo `sub` é a criança e que traz `onBehalfOf` |
| 7.5 | o mesmo, com o id da criança de outra conta | 404 |
| 7.6 | o mesmo, usando um token já emprestado | 403 `already_on_behalf` |
| 7.7 | com o token emprestado, `POST /api/mobile/labs/orders` | 403 `on_behalf_read_only` |
| 7.8 | com o token emprestado, criar/editar/remover pessoa gerida | 403 |
| 7.9 | com o token emprestado, `DELETE /api/patient/account` | 403 (impersonação) |
| 7.10 | com o token emprestado, ler agenda/protocolo/exercícios | responde os **da criança** |
| 7.11 | remover pessoa gerida | `deletedAt` preenchido; a linha continua no banco |
| 7.12 | pedido de exame com `dependentId` de pessoa desligada | recusado |

### UI (app — não testável por Playwright; confirmar por leitura de código ou no aparelho)

| # | passos | esperado |
|---|---|---|
| 7.13 | tocar no olho ao lado de uma pessoa | entra na clínica como ela, cache limpo |
| 7.14 | em qualquer tela, enquanto vê como ela | faixa fixa "Vendo como \<nome\>" com "Voltar para mim" |
| 7.15 | tocar em "Voltar para mim" | volta à própria conta, cache limpo |
| 7.16 | fechar e reabrir o app enquanto vê como ela | volta à própria conta (o empréstimo não sobrevive) |

**Bloqueado:** 7.10 depende de a criança ter agenda/protocolo, que só existe depois de a clínica
criar. Vale como "responde 200 com lista vazia, e não com dados do responsável".
