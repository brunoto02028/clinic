# T-13: Entrada do aluno no tenant

**Status:** concluído
**Trilha:** PLATAFORMA
**Depende de:** T-12

> QA aprovado (qa/report-t-13.md, 6/6) + code review feito. Fecha ISO-10.
> App (item 4): campo "Professional code" adicionado; não verificável localmente (mobile/ sem node_modules).

## Objetivo
O aluno entra no tenant certo por qualquer porta (achado A2; ISO-10 da atividade 19).

## Passos
1. `/join/[slug]`: página com a marca do tenant e cadastro (e-mail ou Google). O tenant vai via parâmetro ou cookie até a criação da conta.
2. `POST /api/mobile/register` passa a aceitar `tenantSlug` ou código de convite. Sem nenhum dos dois, usa o tenant padrão (nunca `null`).
3. O convite do profissional (`admin/patients/[id]/invite`) usa o tenant de quem convida.
4. Tela do app: campo "código do seu profissional" no cadastro (opcional).
5. Slug inexistente ou tenant inativo → 404.

## Critérios de aceite
- [x] Cenários da T-13 passando.
- [x] Regressão: o signup atual da BPR fica igual.
