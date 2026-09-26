# T-6: A porta para as outras áreas da conta

**Status:** implementada · testada · QA pendente
**Depende de:** T-2

## Objetivo

Uma conta com mais de uma área tem como andar entre elas.

## Contexto

O Bruno, no build 15: *"To na versao 15 mas nao vejo nada do laboratorio aqui"*.

Medido em produção antes de mexer: `Clinic.labVisibleInApp` estava `true`, 22 exames ativos, e
`GET /api/mobile/modules` devolvia `lab`. **O servidor concedia o módulo e o app não tinha como
chegar nele:**

1. `module-select` se desviava sozinho para a clínica, porque o build é `CLINIC_ONLY`; e
2. o botão que abre esse seletor estava escondido **pela mesma bandeira** (`{!CLINIC_ONLY && …}`).

Concedido e inalcançável ao mesmo tempo. É a mesma falha da R1 do review — o interruptor da 081
que só removia e nunca concedia — um nível acima: agora concede, e não havia porta.

Isto pertence à 083 porque é a tese dela: o app deixou de ser só da clínica, mas continuava
prendendo na clínica quem entrava por ela.

## Decisão

`CLINIC_ONLY` decide **onde a pessoa cai**, não onde ela pode ir. O seletor volta a ser
alcançável com `?pick=1`, que desliga o desvio só naquela visita — o próximo login continua caindo
direto na clínica, que é o motivo do build existir.

## Passos (feitos)

1. `mobile/src/lib/areas.ts` (novo) — `useAreaSwitch()` → `{ canSwitch, areaCount, switchArea }`.
   `canSwitch` é falso com uma área só: um botão que abre uma escolha de um item não faz nada.
2. `module-select.tsx` — `pediuEscolher` (de `?pick=1`) é o **primeiro** ramo do `skipTo`; depois
   de `length === 1` ou de `CLINIC_ONLY` o desvio já teria acontecido.
3. `ModuleProfile.tsx` — linha "Switch area / Trocar de área" no menu de **todo** módulo, então de
   qualquer área há volta.
4. `account.tsx` — o botão deixou de depender de `CLINIC_ONLY`; o `import` da bandeira saiu, que é
   o que permitiria condicioná-lo a ela de novo.

## Arquivos afetados

- `mobile/src/lib/areas.ts` (novo)
- `mobile/app/(app)/module-select.tsx`, `mobile/app/(app)/account.tsx`
- `mobile/src/components/ModuleProfile.tsx`
- `__tests__/labs/area-switch-door.test.ts` (novo)

## Entrega

`eas update` no canal `production`, 26/09/2026 — só JavaScript, sem build novo. Fingerprint do
update `5787c66f3c8eebeb0dc9ca1ecf223e9c4fe3db42`, **idêntico** ao do build 15, conferido em
`eas build:list` antes de prometer que chegaria ([[bug-fingerprint-eas-json-corta-ota]]).

## Critérios de aceite

- [x] `?pick=1` desliga o desvio; sem ele o build segue caindo direto na clínica
- [x] O menu de todo módulo mostra a troca de área quando há mais de uma
- [x] Com uma área só, o botão não existe
- [x] Nem `ModuleProfile` nem `account` importam `CLINIC_ONLY`
- [x] Teste provado contra o bug: desvio quebrado de propósito ⇒ 1 falha; restaurado ⇒ 6 passam
- [x] 724 testes em 76 suítes verdes; `tsc` do app limpo
- [ ] **QA:** no aparelho do Bruno — rodapé mostrando `update`, e Laboratory alcançável pelo menu
