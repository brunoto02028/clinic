# T-3: O servidor nega, e não só a tela

**Status:** pendente
**Depende de:** T-2

## Objetivo

Que esconder o item do menu não seja a única tranca.

## Contexto

O portão do app é `!s.module || !acesso || acesso.modules.includes(s.module)`.
O `!acesso` faz o menu **falhar aberto**: se a chamada de permissões falhar, tudo
aparece. Isso é defensável — não trancar o paciente fora por rede ruim — mas
significa que o interruptor é conselho na tela, não tranca.

Já está escrito nesta casa: *esconder botão não é fechar porta*. Um paciente com
o prontuário desligado que digite a rota, ou cujo pedido de permissões falhe,
chega na tela.

## Passos

1. Levantar, para cada módulo com chave, **qual rota de API** serve a tela.
2. Medir o que cada uma responde para um paciente com o módulo **desligado**.
3. Onde entregar, fechar — com o mesmo critério que a tela usa, lido dos dois
   lados, e não uma segunda cópia da regra.
4. Deixar o fail-open do menu como está: a tranca certa é aqui.

## Arquivos afetados

A definir pelo levantamento do passo 1.

## Critérios de aceite

- [ ] Existe uma tabela módulo → rota → o que responde desligado
- [ ] Nenhuma rota de módulo desligado entrega dado clínico
- [ ] O critério é um só, lido pela tela e pela rota

## Aviso

Se o levantamento revelar muitas rotas abertas, **isto vira atividade própria** e
eu aviso antes de consertar. O escopo aqui é medir e fechar o que for pequeno.
