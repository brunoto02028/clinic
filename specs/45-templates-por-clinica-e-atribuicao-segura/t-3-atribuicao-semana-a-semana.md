# T-3: Atribuição semana a semana + idioma do paciente + aviso de duplicado (API)

**Status:** concluído
**Depende de:** T-2

## Objetivo
O protocolo atribuído já nasce liberado só nas primeiras semanas, no idioma do paciente, e a API
avisa quando o paciente já tem um protocolo ativo do mesmo template.

## Contexto
Ver plan.md, decisões 4, 5 e 6.

## Passos
1. Body do assign aceita `visibleThroughWeek` (número ≥ 1 ou `null` = tudo). Padrão quando
   ausente: `null` (comportamento atual, pra não quebrar chamadas antigas); a janela (T-4) manda 2
   por padrão. Itens com `startWeek > visibleThroughWeek` nascem com `hiddenFromPatient: true`.
2. `language` ausente → usa `patient.preferredLocale` (pt-* → pt-BR, senão en-GB).
3. Antes de criar: se o paciente tem protocolo com `templateId` igual e status ≠ ARCHIVED:
   - sem `onExisting` no body → 409 `{ error, existing: [{ id, title, status, createdAt }] }`;
   - `onExisting: "archive"` → arquiva os existentes e segue;
   - `onExisting: "keep"` → segue sem mexer neles.
4. Nova rota leve `GET /api/admin/patients/[id]/protocol-templates` (ou parâmetro no GET de
   templates) não é necessária — a janela usa `GET /api/admin/protocols` (já filtrado por clínica)
   e os protocolos do paciente que a ficha já carrega.
5. Testes: itens escondidos conforme `visibleThroughWeek`, idioma padrão, 409 / archive / keep.

## Arquivos afetados
- `app/api/admin/protocols/[id]/assign/route.ts`
- `__tests__/protocol/assign-route.test.ts`

## Critérios de aceite
- [x] `visibleThroughWeek: 2` → só itens com semana inicial 1–2 visíveis; paciente recebe só eles
- [x] `visibleThroughWeek: null`/ausente → tudo visível (compatível)
- [x] Sem `language`, paciente com `preferredLocale` en-GB → protocolo em inglês; pt-BR → português
- [x] Protocolo ativo do mesmo template → 409 com a lista; `archive` arquiva e cria; `keep` cria
      sem arquivar
