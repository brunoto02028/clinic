# QA — T-2: Rotas de social/marketing na clínica ativa

**Resultado:** APROVADO
**Data:** 16/09/2026 · **Commits:** cd30d75, 77497f0

## Produção (antes × depois do deploy, clínica BPR)
| Rota | Antes | Depois |
|---|---|---|
| `social/accounts` | 200 (1) | 200 (1) |
| `social/posts` | 200 (8) | 200 (8) |
| `social/campaigns` | 200 (0) | 200 (0) |
| `social/templates` | 200 (0) | 200 (0) |
| `social/instagram-overview` | 200 | 200 (conta `bprehabilitation`) |
| `marketing/content-calendar` | 200 (0) | 200 (0) |
| `articles/instagram` | 200 (8) | 200 (8) |

## Produção (Active Clinic = "Bruno")
- Todas as listas acima vêm vazias e `instagram-overview` responde 404 (essa clínica não tem conta
  conectada) — antes traziam os dados da BPR.
- `DELETE /api/admin/social/accounts/<conta da BPR>` trabalhando na outra clínica → **404**.
- Voltando para a BPR, tudo idêntico à linha de base.

## Produção (telas)
`/admin/marketing/instagram`, `/admin/marketing/instagram-dashboard`,
`/admin/marketing/instagram-studio`, `/admin/marketing/content-calendar` abrem sem nenhuma chamada
de API com erro (o único 403 no console é uma imagem expirada do CDN do Instagram). Prints em
`screenshots/prod-t2-*.png`.

## Local (duas clínicas com dados de teste, apagados depois)
| Quem | Vê |
|---|---|
| SUPERADMIN com BPR ativa | equipamento, conta, post, campanha e template da BPR |
| SUPERADMIN com clínica A ativa | os da clínica A |
| Terapeuta da clínica A | os da clínica A |
| Terapeuta da clínica A apagando conta da BPR | 404 |

A tela do Instagram mostrou a conta da clínica ativa (`qa47_BPR`) — `screenshots/local-t2-01-instagram.png`.

## Unit
`__tests__/tenant/social-routes-clinic.test.ts`: a lista de posts sempre filtra por clínica e
responde 403 sem clínica; desconectar conta de outra clínica → 404; sem clínica → 403 em vez de
pular a checagem de dono.
