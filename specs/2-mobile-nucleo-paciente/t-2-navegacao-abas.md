# T-2: Navegação por abas + esqueleto das telas

**Status:** concluído (QA `report-t-2.md` aprovado 3/3)
**Depende de:** nenhuma

## Objetivo
Estruturar a navegação principal do app por abas dentro do grupo protegido, com as 4
telas da fase (Home, Agendamentos, Exercícios, Perfil) em esqueleto.

## Contexto
Hoje `(app)/home.tsx` é uma tela única. Migrar para `(app)/(tabs)` com Tabs do Expo
Router, mantendo a guarda de autenticação do `(app)/_layout.tsx`.

## Passos
1. Criar `app/(app)/(tabs)/_layout.tsx` com `Tabs` (4 abas + ícones).
2. Mover/renomear telas: `index` (Home), `appointments`, `exercises`, `profile`.
3. Ajustar redirects (`/home` → `/` do grupo tabs) e o gate em `app/index.tsx`.
4. Telas em esqueleto (título + placeholder) para validar a navegação.
5. Tab bar com cores de marca (tema).

## Arquivos afetados
- `mobile/app/(app)/(tabs)/_layout.tsx` (novo)
- `mobile/app/(app)/(tabs)/{index,appointments,exercises,profile}.tsx`
- `mobile/app/(app)/home.tsx` (removido/migrado)
- `mobile/app/index.tsx`, `mobile/app/login.tsx` (ajuste de redirect)

## Critérios de aceite
- [ ] 4 abas navegáveis no Expo Web.
- [ ] Guarda de auth continua protegendo o grupo.
- [ ] Login redireciona para a Home (aba inicial).
- [ ] Sem erros de console.
