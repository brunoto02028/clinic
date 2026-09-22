# T-10: QA das Fases 2 e 3

**Status:** pendente
**Depende de:** T-4 a T-8

## Objetivo
Verificar cada tela portada contra a versão web equivalente, para o mesmo paciente.

## Contexto
O critério de paridade é **dado**, não pixel: a tela do app mostra a mesma informação que a web mostra para aquele paciente, com o design system do app.

## Passos
1. Rodar o agente **qa-tester** com os cenários de Fase 2/3 de `qa/qa-spec.md`.
2. Para cada tela portada, comparar app × web com o mesmo paciente de teste.
3. Verificar isolamento: nenhuma tela devolve dado de outro paciente, de aluno de estúdio ou de outro tenant.
4. Verificar estados de carregando, vazio e erro (sem rede, token expirado).
5. Verificar PT e EN onde a web é bilíngue.
6. Gerar `qa/report-t-10.md` e limpar os dados de teste.

## Arquivos afetados
- `specs/070-app-paciente-clinica/qa/report-t-10.md` (novo)
- `specs/070-app-paciente-clinica/qa/screenshots/`

## Critérios de aceite
- [ ] Toda tela portada tem cenário executado e evidência
- [ ] Paridade de dados app × web confirmada por paciente de teste
- [ ] Nenhum vazamento entre pacientes ou tenants
- [ ] PT e EN conferidos
- [ ] Dados de teste removidos
