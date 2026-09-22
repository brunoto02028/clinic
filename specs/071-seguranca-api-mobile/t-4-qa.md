# T-4: QA

**Status:** pendente
**Depende de:** T-1, T-2, T-3

## Objetivo
Provar que os três buracos fecharam sem quebrar o app.

## Passos
1. Rodar o agente **qa-tester** com os cenários de `qa/qa-spec.md`.
2. Rodar local e, após deploy, em produção.
3. Gerar `qa/report-t-4.md` com evidências e limpar os dados de teste.

## Critérios de aceite
- [ ] Todos os cenários executados com evidência
- [ ] QA local **e** online
- [ ] Dados de teste removidos
