# T-1: Inventário das 42 páginas do dashboard web

**Status:** pendente
**Depende de:** nenhuma

## Objetivo
Saber exatamente **quais** das 42 páginas de `app/dashboard` são do paciente de clínica — e portanto entram no app — antes de portar qualquer uma.

## Contexto
`app/dashboard` é o portal compartilhado: atende paciente de clínica **e** aluno de estúdio. As atividades 055, 058 e 059 já esconderam Jornada e Comunidade do aluno, o que confirma que a audiência varia por página. Portar às cegas colocaria tela de aluno dentro do app da clínica, violando a separação personal × clínica.

Sem código de feature nesta tarefa — só relatório.

## Passos
1. Para cada página em `app/dashboard/**/page.tsx`, ler o que ela consome e classificar em: **paciente de clínica**, **aluno de estúdio**, **ambos**, ou **staff/impersonation**.
2. Registrar de que gating cada uma depende (tipo de tenant, `ClinicModuleAccess`, `moduleOverrides`, flags).
3. Cruzar com as 21 telas de `mobile/app/(app)/(clinica)/` e marcar: já portada, parcial, ausente.
4. Para as ausentes e de paciente, anotar quais rotas de `/api/patient/**` já existem (o app não deve precisar de backend novo) e sinalizar as que exigiriam endpoint novo.
5. Escrever `qa/report-t-1.md` com a tabela final e a lista de porte recomendada por fase.

## Arquivos afetados
- `specs/070-app-paciente-clinica/qa/report-t-1.md` (novo)
- `specs/070-app-paciente-clinica/plan.md` (atualizar a lista de fases com o resultado)

## Critérios de aceite
- [ ] As 42 páginas classificadas, nenhuma sem audiência definida
- [ ] Toda página marcada "ausente + paciente" tem endpoint mapeado ou marcada como "precisa de backend"
- [ ] A divisão das Fases 2 e 3 no plan.md reflete o inventário
- [ ] Nenhuma página de aluno de estúdio entrou na lista de porte
