# T-2: Os dois textos vazios passam a dizer a verdade

**Status:** pendente
**Depende de:** T-1

## Objetivo
Quem abre a aba sem exercicio entende o que esta acontecendo e o que vem a seguir.

## Contexto
Hoje sao duas mensagens, e as duas enganam:

- **Sem o modulo:** *"Exercicios nao esta incluido no seu plano"*. Para quem acabou de se
  cadastrar, isso soa como muro de vendas — quando a verdade e que a clinica ainda nao montou o
  programa dele.
- **Com o modulo e sem prescricao:** *"Nenhum exercicio prescrito."* Ponto final, sem dizer o que
  acontece depois nem o que a pessoa pode fazer.

## Passos
1. Texto do `PlanGate` para `mod_exercises`: "Seu programa ainda nao foi montado. Sua clinica
   libera seus exercicios aqui assim que definir o tratamento." EN primeiro, PT depois.
2. Estado vazio da lista: explica que o terapeuta monta na consulta, e oferece **Falar com a
   clinica**, que leva para a conversa que ja existe.
3. Sem promessa de prazo, e sem botao que nao faca nada.

## Arquivos afetados
- `mobile/src/components/PlanGate.tsx`, `mobile/app/(app)/(clinica)/(tabs)/exercises.tsx`

## Criterios de aceite
- [ ] Nenhuma das duas telas menciona "plano" como se fosse assinatura
- [ ] O caminho para a conversa funciona
- [ ] EN e PT revisados, ingles primeiro
- [ ] Vai por `eas update` — sem build
