# QA Spec — Atividade 35: Menu lateral hover-to-expand

## T-1: Comportamento hover-expand

1. **UI — Estado inicial colapsado (desktop)**
   - Passos: logar como `qa.trainer@example.test` (personal), abrir `/admin` em viewport desktop (≥1024px), com cache do browser desabilitado.
   - Esperado: `<nav>` do admin com largura ~68px, só ícones visíveis, sem texto de label.

2. **UI — Hover expande**
   - Passos: mover o mouse sobre o `<nav>`.
   - Esperado: menu anima para ~220px, labels de texto aparecem (Schedule, Students, Training, etc.), transição suave (~150-200ms), conteúdo da página não se move.

3. **UI — Mouse sai, recolhe com delay**
   - Passos: mover o mouse pra fora do `<nav>`.
   - Esperado: menu recolhe de volta a ~68px após um pequeno delay perceptível (não instantâneo, não travado aberto).

4. **UI — Item ativo visível colapsado**
   - Passos: navegar para `/admin/patients`, observar o menu colapsado.
   - Esperado: ícone do item "Students"/"Patients" com destaque visual (cor/barra lateral) mesmo sem o label.

5. **UI — Clique funciona expandido**
   - Passos: hover pra expandir, clicar em um item (ex. "Finance").
   - Esperado: navega corretamente para a página do item clicado.

6. **UI — Mobile/tablet inalterado**
   - Passos: viewport < 1024px, abrir `/admin`.
   - Esperado: sidebar off-canvas (fora da tela), botão hambúrguer visível; clicar nele abre o drawer em 220px como hoje; sem rail colapsado, sem hover.

## T-2: Margem do conteúdo + polish

7. **UI — Conteúdo não reflow no hover**
   - Passos: em `/admin`, observar a posição do conteúdo principal (heading "Schedule") antes e durante o hover-expand do menu.
   - Esperado: conteúdo não se move nem redimensiona; menu expandido fica sobreposto por cima (overlay), com sombra visível separando do conteúdo.

8. **UI — Margem base bate com colapsado**
   - Passos: inspecionar `.admin-content-area` com o menu no estado padrão (colapsado).
   - Esperado: `margin-left` ~68px (não mais 220px).

9. **UI — Sem corte/sobreposição em telas principais**
   - Passos: repetir o hover-expand em `/admin` (dashboard), `/admin/patients`, `/admin/settings`.
   - Esperado: nenhum texto cortado, nenhum botão inacessível por trás do menu expandido.

## T-3: Regressão consolidada

10. **UI — Clínica (não-personal) idêntico**
    - Passos: logar como `qa.admina@example.test`, repetir os cenários 1-5.
    - Esperado: mesmo comportamento, com os labels/seções corretos do tenant clínica (ex. "Clinical" em vez de "Training").
