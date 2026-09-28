# T-4: Uma varredura — que outra tela não tem caminho?

**Status:** pendente
**Depende de:** T-1

## Objetivo

Descobrir, de uma vez, **todas** as telas que existem e não estão no menu — em
vez de descobri-las uma a uma, cada vez que o Bruno procura alguma coisa.

## Contexto

Em 28/09 apareceram quatro numa tarde: a seção educacional, a tela de atribuir,
o biohacking e — antes disso — a consulta por vídeo. Nenhuma estava quebrada.
Todas estavam inalcançáveis.

Isso é mecanizável: `app/admin/**/page.tsx` dá o conjunto das telas que
existem, e `lib/admin-sections.ts` dá o conjunto das que o menu cita. A
diferença entre os dois é a lista que falta.

## Passos

1. Um teste que percorre `app/admin/**/page.tsx` e confronta com as rotas
   citadas em `ADMIN_SECTIONS` (incluindo `matchRoutes`).
2. Uma **lista de exceções explícita** — telas de detalhe (`[id]`), telas
   alcançadas a partir de outra, e as que ainda não devem aparecer. Cada
   exceção com o motivo escrito ao lado.
3. O teste falha quando nasce uma tela fora das duas listas. Assim a próxima
   funcionalidade sem caminho não chega ao Bruno: chega à suíte.
4. O mesmo para o aplicativo, se valer: `mobile/app/(app)/**` contra as
   entradas de `CLINIC_SECTIONS`.

## Arquivos afetados

- `__tests__/tenant/toda-tela-tem-caminho.test.ts` (novo)
- `lib/admin-sections.ts`, se a varredura achar buracos

## Critérios de aceite

- [ ] A varredura roda na suíte e lista o que não tem caminho
- [ ] Cada exceção tem motivo escrito
- [ ] Uma tela nova sem entrada no menu **quebra o teste**
- [ ] O relatório da primeira execução vai para o QA desta atividade
