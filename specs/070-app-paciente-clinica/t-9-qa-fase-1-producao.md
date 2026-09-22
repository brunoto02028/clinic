# T-9: QA da Fase 1 em producao

**Status:** pendente
**Depende de:** T-2, T-3, e o deploy

## Objetivo
Provar que o paciente de clínica não alcança BA/Lab por nenhum caminho e que a identidade do app ficou consistente.

## Contexto
Fase 1 é a parte de segurança/visibilidade da atividade. Vale tanto a verificação pela API quanto pela UI: o gating correto no endpoint não basta se a navegação do app ainda expuser uma rota.

## Passos
1. Rodar o agente **qa-tester** com os cenários de Fase 1 de `qa/qa-spec.md`.
2. Testar com quatro perfis: paciente de clínica sem `ClinicModuleAccess`, paciente com acesso configurado, admin de clínica, aluno de tenant PERSONAL.
3. Tentar alcançar `/(app)/(ba)/(tabs)` e `/(app)/(lab)/(tabs)` por deep link estando logado como paciente.
4. Rodar o QA online em produção depois do deploy, além do local.
5. Gerar `qa/report-t-10.md` com evidências e limpar os dados de teste.

## Arquivos afetados
- `specs/070-app-paciente-clinica/qa/report-t-9.md` (novo)
- `specs/070-app-paciente-clinica/qa/screenshots/`

## Critérios de aceite
- [ ] Os quatro perfis testados, com evidência de cada
- [ ] Deep link para BA/Lab como paciente não abre a área
- [ ] QA local **e** online executados
- [ ] Dados de teste removidos
