# QA — Atividade 56 (e-mail de boas-vindas do estúdio)

Ambiente local: dev em :4002 com o outbound guard ativo. Fora de produção todo envio é interceptado e registrado no log (`logSunk`). Os cenários de envio conferem o log e o HTML renderizado, e nada sai de verdade. Fixtures: `scripts/qa/tenant-fixtures.cjs` (`qa.superadmin`, `qa.trainer` em `qa-studio-pt`, `qa.admina` em `qa-clinic-a`).

## T-1 — Template
| # | Tipo | Passos | Esperado |
|---|---|---|---|
| 1.1 | UI | Renderizar `studioWelcomeEmail` em EN e PT para "Manu Training" e abrir no navegador | Cabeçalho com o nome do estúdio; login, senha, botão `/staff-login`, link `/join/manu-training`, 4 passos; rodapé "Powered by BPR"; sem "Bruno Physical Rehabilitation" nem "Welcome to the Team" |
| 1.2 | lib | Nome do estúdio `Ana "Fit" <b>Studio</b>` | Escapado no HTML; o remetente fica sem aspas nem `<>` |
| 1.3 | UI | Largura 390 px (celular) | Legível, sem rolagem horizontal |

## T-2 — Add Clinic / Studio
| # | Tipo | Passos | Esperado |
|---|---|---|---|
| 2.1 | UI+log | SUPERADMIN cria um Personal Studio com dono e idioma PT | Um único e-mail interceptado no log, assunto "Seu estúdio … está pronto"; o dono é criado com `bookable: true` |
| 2.2 | UI | Tipo Clinic | O campo de idioma não aparece |
| 2.3 | API+log | SUPERADMIN cria THERAPIST em `qa-clinic-a` | O e-mail de hoje ("Your Therapist Account - Bruno Physical Rehabilitation") |
| 2.4 | API+log | Criar ADMIN num estúdio sem `locale`, ou com um inválido (ex.: segundo admin pela página Users) | E-mail de equipe de hoje ("Your Admin Account…"), não o do estúdio. Com `locale: "en"` → "Your studio … is ready" (ajuste após o code review) |

## T-3 — Reenvio
| # | Tipo | Passos | Esperado |
|---|---|---|---|
| 3.1 | UI+API | SUPERADMIN → menu do `qa-studio-pt` → "Send welcome e-mail to owner" → PT → confirmar | Toast de sucesso; e-mail interceptado no log com a nova senha; login do `qa.trainer` com a senha antiga falha e com a nova entra |
| 3.2 | API | `qa.trainer`, `qa.admina`, `qa.aluno` e anônimo chamam `POST /api/admin/clinics/<id>/welcome-email` | 401/403, sem trocar senha |
| 3.3 | API | SUPERADMIN com o id de `qa-clinic-a` | 400, sem trocar senha |
| 3.4 | API | Falha simulada no envio (ex.: `OUTBOUND_MODE=live` com chave inválida, ou mock) | 502, a senha antiga continua valendo |
| 3.5 | UI | Menu de uma clínica | Sem o item "Send welcome e-mail to owner" |

Depois dos testes, restaurar a senha do `qa.trainer` para `QaTenant#2026` (rodar as fixtures de novo).

## T-4 — Produção (depois do deploy)
| # | Tipo | Passos | Esperado |
|---|---|---|---|
| 4.1 | UI | Bruno envia para o "Manu Training" | Toast de sucesso; log `[EMAIL] Sent via Resend … id` no Coolify |
| 4.2 | manual | O Emanuel entra com a senha do e-mail | Login ok |
