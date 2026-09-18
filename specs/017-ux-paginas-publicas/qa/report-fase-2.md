# QA — Fase 2 (C2, C3, C5)

**Data:** 2026-08-25
**Ambiente:** dev local (`next dev`, porta limpa), Playwright MCP + verificação no banco. Home em desktop e mobile 390px, EN e PT.
**Resultado:** ✅ Aprovado.

## Itens verificados

| ID | Item | Evidência | Status |
|----|------|-----------|--------|
| C2 | Prova social na home — seção lê `SiteSettings.startTestimonialsJson` (mesma fonte real do `/start`) e **fica oculta enquanto vazia**. Prod tem 0 depoimentos hoje → seção não renderiza (nada falso). | assert DOM: seção ausente | ✅ |
| C3 | "Solicitar retorno de ligação" — form (nome + telefone + horário opcional) → `POST /api/callback` cria um `SalesLead` (source=website, stage=new, priority=high, interestedIn=callback) visível no `/admin/sales`. | `qa-c3-callback.png`, `qa-c3-callback-success.png` | ✅ |
| C5 | Barra fixa de ação no mobile — aparece ao rolar além do hero; botão "Começar"/"Start Your Programme" → /signup. WhatsApp flutuante sobe pra não sobrepor. | `qa-c5-mobile-bar.png` | ✅ |

## Evidências técnicas
- **C2:** `startTestimonialsJson` vazio em prod (0 itens) → `HomeTestimonials` retorna `null`; assert confirmou ausência de "What patients say / O que dizem os pacientes" no DOM.
- **C3 end-to-end:**
  - Bug encontrado e corrigido no QA: o middleware de auth interceptava `/api/callback` (POST redirecionava pra `/login`, criando falso "sucesso"). Adicionado `/api/callback` a `publicRoutes` em `middleware.ts`.
  - Após correção: `POST /api/callback` → 200 (sem redirect) e lead persistido:
    ```
    { name:"QA Lead Dois", phone:"+44 7700 900456", source:"website",
      stage:"new", priority:"high", interestedIn:"callback",
      notes:"Solicitou retorno de ligação (home). Melhor horário: manha" }
    ```
  - Submit via UI (clique) → estado de sucesso "We've got your request".
  - Anti-bot: honeypot (`hp_url`/`website`) + rate-limit 5/h por IP (padrão da atividade 16). Sem Turnstile (mantém sem fricção).
  - Leads de teste removidos do DB local após o QA (2 deletados).
- **C5:** barra com `translateY(0)` (visível) só após `scrollY > 500`; `sm:hidden` (não aparece no desktop). PT confirmado ("Começar"). WhatsApp FAB `bottom-24 sm:bottom-6` só na home.
- **PT:** C3 ("Prefere que a gente ligue" / "Solicitar retorno") e C5 ("Começar") traduzidos.
- **Typecheck:** 0 erros nos arquivos novos/alterados. (Há erros TS pré-existentes no projeto, fora do escopo — não corrigidos.)

## Observações
- Prod não tem `whatsappNumber` visível? Não — em prod o FAB carrega normal; no DB local ele às vezes não vem, então o teste do "lift" foi validado pela lógica (`pathname==="/" → bottom-24`).
- C2 entrega o mecanismo; **quando o Bruno cadastrar depoimentos reais** no admin, eles aparecem na home automaticamente.

## QA de ponta a ponta em PRODUÇÃO (2026-08-25, após deploy `V_4YVrWd06C3KNWE8Y9Zd`)
- **C3 E2E real:** callback enviado no bpr.clinic ao vivo → `SalesLead` criado no **banco de produção** (`id cmt8obn610000nw096yiozfgh`, source=website, stage=new, priority=high, interestedIn=callback, notes com horário). Registro de teste **removido** após a verificação (prod limpo).
- **C2:** oculto no HTML de prod (0 depoimentos) ✓
- **C5:** barra fixa aparece no mobile (top 775 / viewport 844) e o WhatsApp FAB fica **acima** dela (bottom 748) — `overlap: false` ✓ (`qa-prod-c5-mobile.png`).
- **Console de prod:** 0 erros (B2 do prefetch já resolvido).
- **C1 (fase 1) intacto:** link "Already a patient? Log in" presente ✓.
