# T-1: Tela de cadastro no app

**Status:** em revisão · **Depende de:** nenhuma

## Objetivo
Um caminho para criar conta a partir da tela de login, usando a rota que já existe.

## Contexto
`POST /api/mobile/register` está pronto (tenant, limite de pacientes, módulos padrão, tokens) e
`registerRequest()` já está em `mobile/src/api/auth.ts`. Falta só a tela e o link.

## Passos
1. `mobile/app/register.tsx`: nome, sobrenome, e-mail, senha (mínimo 8, a regra do servidor),
   confirmação de senha, e o texto de que ao continuar a pessoa aceita os Termos, com link.
2. Link "Criar conta" na `login.tsx`, ao lado do "Esqueceu sua senha?" da 074.
3. Tratar cada resposta da rota pelo que ela significa, não com uma frase genérica:
   `409` conta já existe (→ T-3), `403` limite de pacientes da clínica, `503` nenhuma clínica
   resolvida, `400` campos.
4. EN e PT, inglês primeiro, pelo mesmo `tr(lang, …)` do login.

## Arquivos afetados
- `mobile/app/register.tsx` (novo)
- `mobile/app/login.tsx`

## Critérios de aceite
- [ ] Cadastro com dados válidos entra no app já autenticado
- [ ] Senha curta é recusada na tela, sem ir ao servidor
- [ ] Cada erro da API tem sua própria frase, nas duas línguas
- [ ] Nenhum campo de "código do profissional" ainda (é a T-5)
