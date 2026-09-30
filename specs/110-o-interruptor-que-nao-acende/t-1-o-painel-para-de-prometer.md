# T-1: O painel para de prometer o que o app não tem

**Status:** pendente
**Depende de:** nenhuma

## Objetivo

Que a clínica não consiga ligar um interruptor que não acende nada.

## Contexto

Quatro módulos não têm tela no app: `mod_achievements`, `mod_community`,
`mod_marketplace`, `mod_recordings`. Foram os que o Bruno testou — ligou e nada
apareceu.

Decisão dele: **ficam no painel**, com selo dizendo que a tela ainda não existe.
Tirar faria a gente esquecer que existiam.

## Passos

1. Marcar os quatro no `lib/module-registry.ts` com algo como `semTelaNoApp: true`.
   O nome do campo importa: ele tem de dizer *onde* falta, porque a web tem a
   rota e o app não.
2. Na tela de permissões, o selo cinza e o interruptor desligado.
3. O texto do selo diz o que é verdade: *"Not in the app yet"* / *"Ainda não no
   app"*, com a linha de apoio dizendo que ligar não muda o que o paciente vê.
4. O mesmo selo na tela de padrão para pacientes novos — senão a armadilha muda
   de lugar.
5. O campo **não** trava a escrita pela API: é informativo. Travar criaria um
   segundo lugar para esquecer de destravar quando a tela nascer.

## Arquivos afetados

- `lib/module-registry.ts`
- `app/admin/patients/[id]/permissions/page.tsx`
- `app/admin/patients/permissions-default/page.tsx`

## Critérios de aceite

- [ ] Os quatro aparecem com o selo
- [ ] Os outros vinte **não** aparecem com o selo
- [ ] O selo aparece nas duas telas
- [ ] A API continua aceitando gravar o módulo marcado
- [ ] Um teste que falha se alguém acrescentar um módulo sem tela e esquecer o selo
