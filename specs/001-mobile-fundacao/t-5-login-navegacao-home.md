# T-5: Fluxo de login + navegação protegida + home com dados reais

**Status:** concluído (QA `report-t-5.md` aprovado 6/6)
**Depende de:** T-3, T-4

## Objetivo
Entregar o fluxo ponta-a-ponta: tela de login (e-mail/senha), navegação que separa rotas
públicas de protegidas, e uma tela home protegida que exibe dados reais do paciente vindos
da API.

## Contexto
Junta o design system (T-3) e a camada de auth/API (T-4). Login com Google fica fora desta
atividade (Suposição #1). A home consome uma API de perfil/dashboard existente
(Suposição #6 — confirmar rota; candidata `/api/patient` ou `/api/dashboard`).

## Passos
1. Grupo de rotas `(auth)` com `login.tsx`: formulário (RHF + validação), estados de
   loading/erro, chamada de `login` do store.
2. Grupo protegido `(app)` com guarda: sem sessão válida → redireciona para login.
3. `bootstrap` no boot decide a rota inicial (login vs home) conforme token.
4. Tela `home`: busca dados do paciente via TanStack Query, exibe nome/clínica e um
   resumo simples (placeholder das fases seguintes).
5. Botão de logout (revoga refresh, limpa store, volta ao login).
6. Tratar erros de rede/credenciais com feedback ao usuário.

## Arquivos afetados
- `mobile/app/(auth)/login.tsx` (novo)
- `mobile/app/(app)/_layout.tsx` (guarda de rota)
- `mobile/app/(app)/home.tsx` (novo)
- `mobile/src/api/patient.ts` (query de perfil/dashboard)

## Critérios de aceite
- [ ] Login com credenciais válidas leva à home.
- [ ] Credenciais inválidas mostram mensagem de erro clara.
- [ ] Rota protegida sem sessão redireciona para login.
- [ ] Home exibe dados reais do paciente (nome/clínica vindos da API).
- [ ] Logout limpa a sessão e retorna ao login.
- [ ] Reabrir o app com sessão válida vai direto à home (sem novo login).
