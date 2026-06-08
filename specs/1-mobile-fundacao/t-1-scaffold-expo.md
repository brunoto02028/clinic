# T-1: Scaffold do app Expo em `mobile/`

**Status:** concluído (QA `report-t-1.md` aprovado 3/3)
**Depende de:** nenhuma

## Objetivo
Criar o projeto Expo (TypeScript + Expo Router) na pasta `mobile/` do repositório,
rodando no Expo Web sem erros, com estrutura de pastas base e scripts npm.

## Contexto
Decisão: pasta `mobile/` no mesmo repo (não monorepo formal). Managed workflow,
sem ejetar. Expo Router para espelhar o mental model do Next App Router.

## Passos
1. Criar app Expo com template TypeScript + Expo Router em `mobile/`.
2. Definir estrutura base: `app/` (rotas), `src/components/`, `src/lib/`,
   `src/theme/`, `src/api/`, `src/store/`.
3. Configurar `app.json`/`app.config.ts` com `name`, `slug`, `scheme` (`bprrehab`),
   bundle id alinhado ao Capacitor atual (`com.bpr.rehab`).
4. Adicionar scripts: `mobile:web`, `mobile:start`, `mobile:android`, `mobile:ios`.
5. Garantir que `mobile/node_modules` e artefatos Expo entrem no `.gitignore`.
6. Subir no Expo Web e confirmar a tela inicial padrão.

## Arquivos afetados
- `mobile/` (novo projeto Expo)
- `.gitignore` (entradas do Expo/mobile)
- `package.json` (scripts `mobile:*`, opcional)

## Critérios de aceite
- [ ] `mobile/` contém um app Expo válido com Expo Router e TypeScript.
- [ ] App abre no Expo Web sem erros no console.
- [ ] Estrutura de pastas base criada.
- [ ] `scheme` e bundle id configurados.
