# T-4: Porte — plano e jornada

**Status:** pendente
**Depende de:** T-1

## Objetivo
Levar para o app as telas em que o paciente acompanha o próprio plano e o progresso ao longo do tratamento.

## Contexto
Agrupamento **provisório** — a T-1 confirma quais destas são do paciente de clínica e pode mover itens entre as fases.

Candidatas: `my-plan`, `journey`, `plans`, `follow-up`.

A Jornada já foi escondida do aluno de estúdio (ativ. 058), o que indica que é uma tela de paciente de clínica — confirmar na T-1.

## Passos
1. Para cada tela, identificar o endpoint `/api/patient/**` que a versão web consome.
2. Criar o client em `mobile/src/api/` seguindo o padrão dos existentes (`apiFetch`, tipos em `types.ts`).
3. Criar a tela em `mobile/app/(app)/(clinica)/`, usando o design system do app — não replicar o layout web.
4. Ligar a navegação a partir da home/tabs do módulo clínica.
5. Tratar estados de carregando, vazio e erro em cada tela.

## Arquivos afetados
- `mobile/src/api/*.ts` (novos clients)
- `mobile/app/(app)/(clinica)/*.tsx` (novas telas)
- `mobile/app/(app)/(clinica)/(tabs)/index.tsx` (pontos de entrada)

## Critérios de aceite
- [ ] Cada tela confirmada pela T-1 como "paciente de clínica" está no app
- [ ] Nenhum endpoint novo no backend (ou, se necessário, justificado no report)
- [ ] Estados de carregando/vazio/erro cobertos
- [ ] Conteúdo bilíngue onde a versão web é bilíngue
