# T-2: A captura sai da web do paciente

**Status:** pendente
**Depende de:** T-1

## Objetivo

Remover a captura por câmera de `app/dashboard/blood-pressure/page.tsx` — o
único lugar onde ela existe de facto.

## Contexto

São 41 referências num arquivo de 2015 linhas: acesso à câmera, flash, amostragem
do sinal, `analyzePPGSignal`, forma de onda "tipo ECG", detecção de arritmia,
métricas de VFC, e as telas de ajuda que explicam como pôr o dedo.

**O que a remoção também apaga:** a estimativa de pressão, a análise de ritmo e a
VFC vinham todas do mesmo sinal. Nenhuma tem outra fonte, então nenhuma sobrevive
à câmera — e é bom que não sobreviva, porque *"detecção de arritmia pelo
telefone"* é a mais arriscada das três promessas.

A tela perde acesso no lançamento, então isto é limpeza de código e não conserto
de algo em uso. Vem depois da T-1 por esse motivo.

## Passos

1. Remover a captura, a análise e as telas de ajuda.
2. Deixar a tela com o que ela ainda faz: **ver o histórico** e **digitar uma
   leitura**, com a frase do parâmetro do NHS que a 105 T-6 pôs lá.
3. Conferir que nada mais importa o que foi removido.

## Arquivos afetados

- `app/dashboard/blood-pressure/page.tsx`

## Critérios de aceite

- [ ] A tela abre, mostra o histórico e aceita uma leitura digitada
- [ ] Nenhum pedido de permissão de câmera
- [ ] `tsc --noEmit` em 0
- [ ] Nada do que foi removido sobrou importado sem uso
