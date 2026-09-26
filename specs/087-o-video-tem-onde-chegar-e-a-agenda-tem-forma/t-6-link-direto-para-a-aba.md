# T-6: Link direto para a aba de exercícios

**Status:** pendente
**Depende de:** nenhuma

## Objetivo
`/admin/patients/<id>?tab=exercicios` abre o prontuário já na aba certa.

## Contexto
A aba é estado local (`useState("resumo")`), sem parâmetro na URL. Por isso nada consegue apontar
para o painel de vídeos: nem o badge, nem o e-mail, nem a fila da T-4, nem um link colado numa
conversa.

É a peça que faz a T-4 e a T-5 terem para onde levar.

## Passos
1. A aba inicial sai de `?tab=`, com queda para `resumo` quando ausente ou desconhecida.
2. Trocar de aba atualiza a URL sem recarregar a página.
3. Uma aba que não existe naquele tenant cai em `resumo` em vez de mostrar tela vazia.

## Arquivos afetados
- `app/admin/patients/[id]/page.tsx`
- `__tests__/exercises/link-direto-aba.test.ts` (novo)

## Critérios de aceite
- [ ] `?tab=exercicios` abre na aba de exercícios
- [ ] Sem `?tab=`, abre em `resumo` como hoje
- [ ] `?tab=inexistente` cai em `resumo`, não em tela vazia
- [ ] Trocar de aba reflete na URL
