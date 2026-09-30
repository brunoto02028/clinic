# T-2: A clínica arrasta, e o app obedece

**Status:** pendente
**Depende de:** T-1

## Objetivo

Que a clínica possa arrastar um módulo — e um grupo — para a posição que quiser,
e que o app do paciente mostre aquela ordem.

## Contexto

Hoje a ordem é alfabética, entregue ontem. Esta tarefa põe a clínica **acima** do
alfabeto: quando alguém arrasta, aquilo passa a valer; quando ninguém arrastou,
a lista continua alfabética.

Isso quer dizer que a ordem deixa de ser calculada e passa a ser **dado**. É a
parte cara: precisa de uma coluna por clínica, de uma rota que grave, e de o app
ler aquilo junto com os módulos — que ele já busca em `/api/patient/access`.

## Passos

1. Guardar a ordem por clínica. Uma lista de chaves, e não um número por módulo:
   número por módulo dá empate e buraco quando um módulo entra.
2. `lib/ordenar-modulos.ts` e `mobile/src/lib/ordenar-secoes.ts` passam a aceitar
   uma ordem explícita e **caem no alfabeto** para o que não estiver nela — um
   módulo novo não pode sumir por não ter sido arrastado.
3. O app lê a ordem junto com os módulos, na mesma resposta, para não haver um
   segundo pedido que pode falhar sozinho.
4. Arrastar no painel grava; nada de botão "salvar" separado, que é como se
   perde a ordem arrastada.

## Critérios de aceite

- [ ] Arrastar no painel muda a ordem no app do paciente
- [ ] Clínica que nunca arrastou continua alfabética
- [ ] Módulo novo, nunca arrastado, aparece — e não some
- [ ] A ordem sobrevive a recarregar a página e a sair e entrar no app
- [ ] Módulo desligado não deixa buraco nem guarda lugar
