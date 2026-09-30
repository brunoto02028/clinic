# T-5: Ordem alfabética dentro dos grupos

**Status:** 🟢 concluída (30/09) — QA pendente
**Depende de:** T-4 (os rótulos mudam, e é por eles que se ordena)

## Objetivo

Achar um módulo pelo nome sem perder a noção de para que ele serve.

## Contexto

O Bruno pediu ordem alfabética. Escolheu manter os cinco grupos — Principal,
Clínico, Bem-estar, Conteúdo e Áreas do app — e ordenar **dentro** de cada um.
Alfabético puro misturaria "Marketplace" com "My Records".

## Passos

1. Ordenar por rótulo dentro de cada grupo, na tela de permissões e na de padrão.
2. Ordenar pelo rótulo **da língua exibida**: em português a lista tem de sair em
   ordem portuguesa, não na inglesa traduzida.
3. Usar `localeCompare` com a língua certa — `sort()` cru põe maiúscula antes de
   minúscula e erra acento.
4. Os grupos mantêm a ordem atual, que tem intenção: principal primeiro.

## Arquivos afetados

- `app/admin/patients/[id]/permissions/page.tsx`
- `app/admin/patients/permissions-default/page.tsx`
- possivelmente `lib/module-registry.ts`

## O que ficou

`lib/ordenar-modulos.ts` — **uma** função, usada pelas duas telas. Ela já estava
duplicada quando escrevi a segunda cópia; duas cópias da mesma regra são duas
ordens diferentes em duas semanas.

A tela passa o seu próprio resolvedor EN/PT, então a lib não precisa saber de
idioma, de `relabel` nem do jargão da casa.

## Critérios de aceite

- [x] Cada grupo sai em ordem alfabética
- [x] Os grupos continuam na ordem de hoje
- [x] Em português, ordena pelo rótulo português
- [x] Acento não manda item para o fim da lista

## Provas

`__tests__/permissoes/a-ordem-das-listas.test.ts` — 10 cenários, incluindo o
catálogo de verdade grupo a grupo, nas duas línguas.

O cenário que separa as duas línguas: em inglês *Achievements* vem antes de
*Devices*; em português *Conquistas* vem **depois** de *Dispositivos*. Sem ele,
uma função que ignorasse a língua passaria sempre que as duas ordens
coincidissem.

**Por mutação:** trocar por `sort()` cru derruba o teste da caixa — o cru agrupa
toda maiúscula antes de toda minúscula. Ignorar a língua e ordenar sempre em
inglês derruba o teste do catálogo.
