# QA — Atividade 084 (cupom de desconto)

Escrita junto do plano. Paciente de teste identificado, nunca um paciente real.

## T-1 — Modelo e resolução

| # | tipo | cenário | esperado |
|---|---|---|---|
| 1.1 | API | `applyCoupon` com cupom ativo, 20%, sobre £100 | `{original:100, discount:20, final:80}` |
| 1.2 | API | Código em minúsculas | acha o cupom |
| 1.3 | API | Código inexistente | `not_found`, frase EN + PT |
| 1.4 | API | Cupom `isActive:false` | `inactive` |
| 1.5 | API | `endsAt` no passado | `expired` |
| 1.6 | API | `startsAt` no futuro | `not_started` |
| 1.7 | API | Escopo `CONSULTATION` usado numa adesão a plano | `wrong_scope` |
| 1.8 | API | Cupom mirado no paciente A, pedido pelo B | `not_for_you` |
| 1.9 | API | `maxRedemptions` esgotado | `limit_reached` |
| 1.10 | API | `maxPerPatient:1` e o paciente já resgatou | `already_used` |
| 1.11 | API | Cupom de 100% | `final: 0`, válido |
| 1.12 | API | Tentar criar cupom com alcance de exame | impossível — o valor não existe no enum |
| 1.13 | API | Cupom da clínica X pedido pela clínica Y | `not_found` (nunca "existe mas não é sua") |
| 1.14 | shell | `prisma migrate diff` contra o `main` | **zero DROPs**, output colado |

## T-2 — Painel

| # | tipo | cenário | esperado |
|---|---|---|---|
| 2.1 | UI | SUPERADMIN abre `/admin/coupons` | lista carrega |
| 2.2 | API | ADMIN faz POST | 403 |
| 2.3 | API | THERAPIST faz POST | 403 |
| 2.4 | UI | Criar cupom 20% em consulta, aberto, 30 dias | aparece na lista, ativo |
| 2.5 | UI | Código repetido | frase na tela, não erro de banco |
| 2.6 | UI | Salvar sem alcance | recusa com frase |
| 2.7 | UI | % e valor fixo juntos | recusa com frase |
| 2.8 | UI | Lista de alcance | **cinco** opções (consulta, sessão, pacote, plano de tratamento, assinatura), exame ausente, com a linha que explica |
| 2.9 | UI | Clicar "Ativo" e recarregar | estado persistiu (sem gravação separada) |
| 2.10 | UI | Apagar cupom com resgate | desativa e explica |
| 2.11 | API | Toda escrita | linha em `logAudit` |

## T-3 — App

| # | tipo | cenário | esperado |
|---|---|---|---|
| 3.1 | UI | Digitar cupom válido em Book appointment | £100 riscado, £80 em destaque, nome da campanha |
| 3.2 | UI | Cupom inválido | o **motivo** na tela, em EN (e PT no aparelho em PT) |
| 3.3 | UI | Remover o cupom | volta a £100 |
| 3.4 | API | Prévia duas vezes | nenhum `CouponRedemption` criado |
| 3.5 | UI | Sem digitar nada | tela idêntica à de hoje, preço da 082 |
| 3.6 | UI | Cupom de 100% | botão "Confirmar", nenhum Checkout aberto |
| 3.7 | UI | Paciente com exceção de preço (082) + cupom | desconto sobre o preço **dele**, e nada revela que é exceção |
| 3.8 | UI | Tela do exame de laboratório | **nenhum** campo de cupom |

## T-4 — Checkout

| # | tipo | cenário | esperado |
|---|---|---|---|
| 4.1 | API | Checkout com cupom | `amount_total` no Stripe = `final` |
| 4.2 | API | Cupom manipulado no corpo (valor a mais) | servidor recalcula e ignora o valor enviado |
| 4.3 | UI | Dois toques no botão | **um** `CouponRedemption` |
| 4.4 | API | Stripe falha ao criar sessão | nenhum resgate sobra |
| 4.5 | API | Sessão expira | limite liberado |
| 4.6 | API | Limite esgotado entre a prévia e o pagamento | recusa com frase, não 500 |
| 4.7 | API | Checkout do exame com `code` no corpo | cobra cheio, nenhum resgate gravado |
| 4.8 | API | Compra com `Order` | `discountCode` e `discountAmount` preenchidos |
| 4.9 | API | Rota fora do escopo recebendo `code` | cobra cheio |

## QA online (obrigatório, depois do deploy)

Repetir 2.4, 3.1, 3.2, 4.1 e 4.3 em produção com o paciente de teste, e conferir o commit pela
lista de deployments do Coolify — `buildDate` não prova o deploy.
