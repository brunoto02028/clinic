# QA Report — T-6: Perfil (ver + editar)

**Data:** 07/06/2026 · **Resultado:** ✅ APROVADO (4/4) · Playwright/Expo Web.

| # | Cenário | Obtido | OK |
|---|---------|--------|----|
| 6.1 | Dados reais | "Sarah Thompson" + e-mail + telefone | ✅ |
| 6.2 | Editar telefone e salvar | "Salvo." → após reload, `+44 7700 999888` persiste (PATCH `/api/patient/profile`) | ✅ |
| 6.3 | Validação/erro | erro real da API exibido (pós-review); botão desabilitado durante salvar | ✅ |
| 6.4 | Logout pelo perfil | → `/login` | ✅ |

Evidência: `qa/screenshots/t6-profile.png`.

## Ajuste de escopo (Suposição #2)
A rota `/api/patient/profile` (PATCH) **não** aceita `firstName/lastName` — só campos como
`phone`. Portanto a edição nesta fase cobre **telefone**; nome/e-mail ficam read-only.

## Correções pós-review aplicadas
- `useEffect` inicializa o telefone **uma vez** (ref), evitando sobrescrever o que o
  usuário digita após o refetch.
- Mensagem de erro mostra o motivo real (`mutation.error.message`); `phone` com `trim()`.
