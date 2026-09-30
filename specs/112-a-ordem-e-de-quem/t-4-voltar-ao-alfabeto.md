# T-4: Voltar ao alfabeto

**Status:** pendente
**Depende de:** T-2, T-3

## Objetivo

Desfazer. Nos dois lados.

## Contexto

Toda tela que deixa arrastar precisa de um jeito de voltar, e é a parte que
costuma ficar para depois — até alguém arrastar tudo e não saber como desfazer.

Com três donos, "voltar" tem dois significados:

- **a clínica** volta ao alfabeto;
- **o paciente** volta à ordem da clínica, e não ao alfabeto — a dele não é o
  topo da cascata.

## Passos

1. Um botão em cada lado, dizendo ao que se volta.
2. Apagar a ordem guardada, e não gravar a ordem alfabética como se fosse
   escolha: uma ordem gravada "por acaso" impediria o módulo novo de aparecer no
   lugar certo depois.

## Critérios de aceite

- [ ] A clínica volta ao alfabeto, e a tela diz isso antes
- [ ] O paciente volta à ordem da clínica
- [ ] Depois de voltar, um módulo novo entra em ordem alfabética
- [ ] Voltar não mexe na ordem do outro lado
