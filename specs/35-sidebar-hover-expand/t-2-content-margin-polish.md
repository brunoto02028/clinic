# T-2: Margem do conteúdo fixa no colapsado + polish visual

**Status:** concluído
**Depende de:** T-1

## Objetivo
Ajustar `.admin-content-area` para refletir a nova largura colapsada (68px) como margem fixa, e dar o acabamento visual (sombra no menu expandido, z-index correto, sem "pulo" de conteúdo).

## Contexto
Decisão do plano: overlay, não reflow. O conteúdo nunca se move quando o menu expande — só a margem base muda de 220px (atual) para 68px (novo padrão colapsado), sempre.

## Passos
1. Em `app/globals.css`, trocar `.admin-content-area { margin-left: 220px; }` (desktop) para `margin-left: 68px` (ou o valor final decidido no T-1, se diferente de 68px).
2. Confirmar que a regra mobile (`@media (max-width: 1023px) { .admin-content-area { margin-left: 0; } }`) continua intacta — não mexe nisso.
3. Adicionar sombra (`box-shadow`) ao `<nav>` quando `expanded === true`, pra separar visualmente do conteúdo por baixo (que fica coberto, não reajustado).
4. Confirmar `z-index` do `<nav>` (hoje 40) segue acima do conteúdo principal e de qualquer overlay/modal que não deva ficar atrás — não precisa mudar, só validar visualmente.
5. Rodar por telas principais do admin (dashboard, pacientes/alunos, configurações) pra confirmar que nenhum conteúdo cortado ou sobreposição ruim aparece quando o menu expande por cima.

## Arquivos afetados
- `app/globals.css`
- `components/admin/admin-mini-sidebar.tsx` (sombra condicional)

## Critérios de aceite
- [ ] Conteúdo da página nunca se desloca/reflow quando o menu expande ou recolhe.
- [ ] Margem do conteúdo bate com a largura colapsada (68px) o tempo todo.
- [ ] Menu expandido tem sombra visível separando do conteúdo por baixo.
- [ ] Nenhuma sobreposição ruim (texto cortado, botão inacessível) nas telas principais do admin ao expandir o menu.
