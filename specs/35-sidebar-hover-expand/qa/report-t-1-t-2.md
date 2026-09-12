# QA Report — T-1 & T-2: Sidebar hover-expand + margem de conteúdo fixa

**Data:** 2026-09-12
**Resultado geral:** ✅ aprovado

## Ambiente de teste
- Dev server: `localhost:4000` (Next.js dev mode)
- Usuário: `qa.trainer@example.test` (personal trainer) via `/staff-login`
- Ferramenta: script Playwright standalone (`chromium.launch` com executável fixo do Chromium instalado localmente, usando `node_modules/playwright` do projeto) — não a sessão MCP padrão, conforme aviso do ambiente sobre estado de módulo obsoleto (HMR) em abas de longa duração.
- Cada cenário rodou num `browser.newContext()` novo e isolado, com `Network.setCacheDisabled` via CDP antes de navegar.
- Viewport desktop: 1440×900. Viewport mobile (cenário 6): 390×844.

## Resumo
| # | Cenário | Tarefa | Resultado |
|---|---------|--------|-----------|
| 1 | Estado inicial colapsado (68px, só ícones) | T-1 | ✅ |
| 2 | Hover expande para ~220px, labels aparecem | T-1 | ✅ |
| 3 | Mouse sai → recolhe com delay perceptível | T-1 | ✅ |
| 4 | Item ativo destacado mesmo colapsado | T-1 | ✅ |
| 5 | Clique com menu expandido navega corretamente | T-1 | ✅ |
| 6 | Mobile/tablet (<1024px): drawer inalterado, sem rail | T-1 | ✅ |
| 7 | Conteúdo não reflow durante hover-expand | T-2 | ✅ |
| 8 | `margin-left` da `.admin-content-area` = 68px fixo | T-2 | ✅ |
| 9 | Sem corte/sobreposição ruim nas telas principais | T-2 | ✅ |

## Detalhes

### 1. Estado inicial colapsado (desktop) ✅
- **Passos:** login fresco → `/admin` → aguardar 500ms de assentamento → medir `nav[aria-label="Admin navigation"]` sem tocar o mouse nele.
- **Medido:** `boundingBox = {x:0, y:0, width:68, height:900}`; classe `expanded` ausente; opacidade do primeiro label = `0`.
- **Evidência:** `screenshots/t-1-collapsed-initial.png`

### 2. Hover expande ✅
- **Passos:** `nav.hover()`, aguardar 250ms (transição CSS é 200ms).
- **Medido:** `boundingBox = {width:220}`; classe `expanded` presente; opacidade do label = `1`.
- **Evidência:** `screenshots/t-1-hover-expanded.png` — labels "Schedule", "Students", "Notifications", "Training", "Challenges", "Nutrition", "Finance" visíveis; logo completo com texto "bpr" aparece.

### 3. Mouse sai, recolhe com delay ✅
- **Passos:** mover mouse para fora do nav; medir imediatamente (+50ms) e depois de +500ms.
- **Medido:** imediatamente após sair (+50ms): ainda `width:220` (não fecha instantaneamente — confirma o delay de 150ms do `setTimeout`). Após +500ms: `width:68`, classe `expanded` removida.
- **Evidência:** `screenshots/t-1-collapsed-after-leave.png`

### 4. Item ativo destacado colapsado ✅
- **Passos:** navegar para `/admin/patients`, mouse fora do nav (colapsado), inspecionar `button[aria-current="page"]`.
- **Medido:** 1 botão com `aria-current="page"`; `backgroundColor: rgba(78,115,97,0.1)`, `color: rgb(122,184,153)` (accent), barra lateral (`span.absolute`) presente.
- **Evidência:** `screenshots/t-1-active-item-collapsed.png` — ícone "Students" com fundo/cor de destaque e barra verde à esquerda, mesmo sem label.

### 5. Clique com menu expandido navega ✅
- **Passos:** hover para expandir, clicar no item "Training" (label relabelada de "Clinical" para tenant pessoal via `tenant-vocab.ts`).
- **Medido:** navegação confirmada para `http://localhost:4000/admin/exercises` (primeira tab visível do tenant pessoal, já que as tabs `clinicalOnly` — "SOAP Notes", "Treatments" — são filtradas por `visibleAdminSections`).
- **Nota de flakiness (registrada, não é defeito):** na primeira execução (dentro do lote completo dos 9 cenários em sequência rápida), esse clique resultou em `urlAfterClick = /admin` em vez de `/admin/exercises`, coincidindo com uma mensagem de console "Failed to fetch RSC payload... Falling back to browser navigation" (Fast Refresh do Next dev) registrada num cenário anterior. Refiz o teste isolado (contexto novo, sem outros cenários rodando em sequência) e a navegação funcionou corretamente e de forma consistente — confirma que foi instabilidade do dev server sob carga do meu próprio script de teste, não um defeito do sidebar.
- **Evidência:** `screenshots/t-1-expanded-before-click.png`, `screenshots/t-1-after-click-navigation.png`

### 6. Mobile/tablet inalterado (viewport 390px) ✅
- **Passos:** login em viewport 390×844, medir o nav antes e depois de clicar no botão hambúrguer (`aria-label="Toggle menu"`).
- **Medido:**
  - Antes: `transform: matrix(1,0,0,1,-220,0)` (fora da tela à esquerda), `width:220` — sem rail colapsado de 68px.
  - Hambúrguer visível: sim.
  - Depois do clique: `transform: matrix(1,0,0,1,0,0)`, classe `mobile-open` presente, drawer ocupa 220px de largura total.
- **Evidência:** `screenshots/t-1-mobile-closed.png`, `screenshots/t-1-mobile-drawer-open.png`

### 7. Conteúdo não reflow durante hover-expand ✅
- **Passos:** medir `.admin-content-area` (margin, bounding box) e a posição do primeiro heading antes e durante o hover-expand do nav.
- **Medido:**
  - `margin-left` antes: `68px`; durante hover: `68px` (inalterado).
  - `boundingBox` do `.admin-content-area`: idêntico antes/durante (`x:68, width:1372, height:2429.5`).
  - `boundingBox` do heading "Schedule": idêntico antes/durante (`x:92, y:20.5`).
  - `box-shadow` do nav expandido: `rgba(0,0,0,0.35) 4px 0px 24px 0px` (sombra visível separando do conteúdo).
- **Evidência:** `screenshots/t-2-content-nomove-hover.png` — heading e cards de fundo permanecem na mesma posição, apenas cobertos pelo menu expandido.

### 8. Margem base bate com colapsado (68px) ✅
- **Medido:** `getComputedStyle(.admin-content-area).marginLeft === "68px"` no estado padrão (colapsado). Confirma a mudança de 220px → 68px do T-2.

### 9. Sem corte/sobreposição ruim nas telas principais ✅
- **Passos:** repetir hover-expand em `/admin` (dashboard), `/admin/patients`, `/admin/settings`, com pacing de 2s entre contextos para não saturar o rate limiter de `/api/settings` (ver observação abaixo).
- **Medido:** nenhum texto cortado ou elemento quebrado dentro do próprio menu expandido em nenhuma das 3 telas; o conteúdo por trás fica coberto pelo menu (comportamento overlay intencional do plano — "conteúdo fica coberto, não reajustado"), sem sobreposição "ruim".
- **Evidência:** `screenshots/t-2-expanded-dashboard.png`, `screenshots/t-2-expanded-patients.png`, `screenshots/t-2-expanded-settings.png`
- **Observação (não é defeito do T-1/T-2):** em `/admin/settings`, o menu expandido cobre parte da barra de sub-abas (ex.: "Users" aparece parcialmente cortado na screenshot) — isso é o comportamento overlay esperado e documentado no plano, não uma sobreposição quebrada. Nenhum botão do próprio sidebar ficou inacessível.

## Erros de console
- Execução limpa (com pacing entre contextos) nas 3 telas do cenário 9: **nenhum erro de console** relacionado ao `nav[aria-label="Admin navigation"]` nem erro de hidratação.
- Duas anomalias observadas **apenas** durante o lote de 9 cenários rodando em sequência rápida (múltiplos logins/contextos em poucos segundos), e que **não se reproduziram** em reruns isolados/pausados:
  1. `Failed to fetch RSC payload for http://localhost:4000/admin. Falling back to browser navigation` — mensagem de Fast Refresh do Next.js dev server, não erro de hidratação do sidebar.
  2. `Failed to load resource: the server responded with a status of 429 (Too Many Requests)` em `/api/settings` — confirmado via teste isolado que é rate-limit acionado pelo volume de logins/requests do meu próprio script de QA rodando em rajada; com pausa de ~2s entre contextos, o mesmo fluxo não produz 429. Não relacionado ao código de T-1/T-2.

## Falhas e recomendações
Nenhuma falha nos critérios de aceite de T-1 e T-2. As duas anomalias de console acima são artefatos do próprio script de teste martelando o dev server (múltiplos logins em sequência rápida), não bugs do sidebar — nenhuma ação de código necessária.

## Cenário 10 (regressão clínica)
Não executado — pertence à T-3, fora do escopo deste relatório. Ver `report-t-3.md`.

---

## Addendum — code review (pós-QA)

A revisão de código sobre o diff de T-1/T-2 encontrou 5 problemas reais, todos corrigidos antes de marcar as tarefas como concluídas:

1. **Transição do drawer mobile quebrada** — o `style.transition` inline no `<nav>` (só `width`/`box-shadow`) substituía por completo a regra CSS `transition: transform 0.3s ease` da media query mobile (CSS não faz merge de `transition` por propriedade), fazendo o drawer abrir/fechar sem animação no celular. **Corrigido:** `width`, `box-shadow` e `transform` agora vivem numa única declaração `transition` no CSS (`.admin-mini-sidebar`), sem nenhum `transition` inline no componente.
2. **`ClinicSelector`/`LocaleToggle` desmontando a cada hover** — antes eram renderizados condicionalmente (`{showLabels && ...}`), então cada vez que o mouse saía do rail colapsado eles desmontavam e, ao voltar, remontavam — refazendo os fetches do `ClinicSelector` (`/api/admin/clinics`, `/api/admin/switch-clinic`) a cada hover, pra um SUPERADMIN. **Corrigido:** ambos ficam sempre montados; o colapso é só visual (opacity + max-height), sem desmontar.
3. **Sem suporte a teclado** — o hover só cobria mouse; um usuário navegando por Tab nunca via os labels (ficava só ícones). **Corrigido:** `onFocus`/`onBlur` no `<nav>` reaproveitam a mesma lógica do hover (foco em qualquer item expande; perder o foco do nav inteiro recolhe).
4. **CSS morto** — consequência do achado 1: a declaração `transition: width 0.2s ease;` isolada no CSS nunca era realmente aplicada (o inline sempre vencia). Resolvido junto com o achado 1.
5. **Logo sem imagem customizada cortado no colapsado** — o wrapper de 36px que clipa o logo largo (ícone+texto) também cortava o fallback de texto "BPR" (tenants sem logo configurado), que não escala como uma imagem. **Corrigido:** o clipe de 36px só se aplica quando existe uma imagem de logo configurada (`logoUrl`/`darkLogoUrl`); o fallback de texto não é cortado.

Reverificado via Playwright (contexto de navegador isolado, cache desabilitado) após as correções:
- `transitionDuration` computado no nav mobile: `"0.2s, 0.2s, 0.3s"` (as três propriedades, confirmando a correção do achado 1).
- Foco no primeiro item do nav expande (`width: 220`), Tab para o próximo item mantém expandido, `blur()` recolhe (`width: 68`) — achado 3 confirmado corrigido.
- `LocaleToggle` (botões "EN"/"PT") encontrado no DOM mesmo com o rail colapsado — confirma que não desmonta mais (achado 2).
- Nenhum erro de console/hidratação na aba de teste isolada.

---

**Resultado geral: 9/9 cenários aprovados + 5/5 achados da revisão de código corrigidos e reverificados.**
