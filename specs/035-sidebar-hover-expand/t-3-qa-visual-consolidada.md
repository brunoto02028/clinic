# T-3: QA visual consolidada

**Status:** concluído
**Depende de:** T-1, T-2

## Objetivo
Confirmar visualmente o comportamento hover-expand funcionando corretamente em todos os cenários relevantes, sem regressão.

## Passos
1. Desktop, tenant personal (ex. `qa.trainer@example.test`): estado colapsado (screenshot), hover → expandido (screenshot), navegação por um item continua funcionando (clicar em item expandido leva pra página certa, testado com cache do navegador desabilitado — ver nota abaixo).
2. Desktop, tenant clínica (ex. `qa.admina@example.test`): mesmo teste, confirmando que o comportamento é idêntico independente do tipo de tenant.
3. Mobile/tablet (viewport < 1024px): confirmar que o drawer off-canvas com hambúrguer continua funcionando exatamente como antes — sem rail colapsado, sem hover.
4. Telas principais do admin (dashboard, pacientes/alunos, configurações) com o menu expandido por cima — confirmar que nada fica cortado ou inacessível.
5. Confirmar que o item ativo (página atual) é visualmente identificável tanto colapsado (ícone destacado) quanto expandido.

## Nota técnica importante
Ao testar via Playwright neste projeto, o dev server serve os chunks JS com `Cache-Control: immutable, max-age=1yr` — uma sessão de browser de longa duração pode ficar presa numa versão antiga do bundle mesmo após editar o código e reiniciar o servidor. Sempre desabilitar o cache do browser antes de testar (`Network.setCacheDisabled` via CDP, ou usar uma aba/contexto novo) para garantir que o comportamento testado é o código atual.

## Arquivos afetados
- Nenhum (só QA)

## Critérios de aceite
- [ ] Screenshots do colapsado e expandido, personal e clínica.
- [ ] Mobile/tablet confirmado inalterado.
- [ ] Nenhuma sobreposição/corte visual nas telas principais.
- [ ] Estado ativo identificável nos dois modos.
