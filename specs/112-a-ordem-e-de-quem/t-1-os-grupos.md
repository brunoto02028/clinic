# T-1: Os grupos, e o que o Bruno quer dividir

**Status:** 🔴 bloqueada — falta a resposta do Bruno
**Depende de:** nenhuma

## Objetivo

Decidir o que acontece com os cinco grupos do painel antes de mexer em qualquer
ordem dentro deles.

## Por que está bloqueada

O pedido foi: *"Dividir tb CONTENT & EDUCATION - WELLBEING & SELF-CARE - APP
AREAS - CLINICAL"*. Os quatro já existem. A frase pode querer dizer três coisas:

1. **Reordenar** os grupos — hoje a ordem é Principal, Clínico, Bem-estar,
   Conteúdo, Áreas do app, e ela tem intenção (o principal primeiro).
2. **Renomear** — os cabeçalhos hoje não traduzem (`CLINICAL` em vez de
   `CLÍNICO`), achado do QA de ontem e ainda por corrigir.
3. **Quebrar** um grupo em dois — `CONTENT & EDUCATION` tem seis módulos, dos
   quais quatro não têm tela no app.

São três trabalhos diferentes, e escolher errado custa uma tela refeita.

## Passos, depois de respondida

1. Aplicar a decisão no `MODULE_CATEGORIES` do `lib/module-registry.ts`.
2. Se for renomear, os cabeçalhos passam a traduzir — a tela de padrão ao lado
   já traduz, então é a do paciente que está fora do padrão.
3. Se for quebrar, cada módulo migra de categoria **uma vez**, e o teste da 110
   que cobra a ordem por grupo é atualizado junto.

## Critérios de aceite

- [ ] A decisão está escrita aqui, com a data
- [ ] Os cabeçalhos aparecem na língua exibida
- [ ] Nenhum módulo ficou sem grupo
- [ ] O teste de ordem por grupo continua verde
