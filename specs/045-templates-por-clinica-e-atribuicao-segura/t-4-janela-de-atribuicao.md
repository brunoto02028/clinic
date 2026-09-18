# T-4: Janela de atribuição reaproveitável + botão na aba Protocol

**Status:** concluído
**Depende de:** T-3

## Objetivo
Atribuir um template pela página de templates **ou** direto da ficha do paciente, com a mesma
janela: idioma (padrão = do paciente), semanas visíveis no início (padrão Weeks 1–2), nota e
tratamento do caso "já tem esse protocolo".

## Contexto
Ver plan.md, decisões 4–7. A janela atual vive dentro de `app/admin/protocols/page.tsx`
(~linhas 118-260 e 651+).

## Passos
1. Extrair `components/admin/assign-protocol-dialog.tsx`: props `open`, `onOpenChange`,
   `template?` (pré-escolhido, vindo da página de templates) ou `patient?` (pré-escolhido, vindo da
   ficha), `onAssigned`. Campos: busca de paciente (quando não veio), seleção de template (quando
   não veio, via `GET /api/admin/protocols`), idioma EN/PT (padrão do `preferredLocale` do
   paciente), "Visible to the patient at first": Weeks 1–2 / Week 1 / Everything, nota.
2. Ao receber 409: mostrar os protocolos ativos do mesmo template e dois botões — "Archive the
   old one and assign" (`onExisting: "archive"`) e "Assign anyway" (`onExisting: "keep"`).
3. Depois de atribuir, se `unlinkedExercises > 0`, avisar quantos itens ficaram sem exercício
   ligado.
4. `app/admin/protocols/page.tsx` passa a usar o componente (remove o código duplicado).
5. Aba Protocol da ficha: botão "Assign template" no topo (também no estado vazio "No active
   treatment protocol"), abrindo a janela com o paciente pré-escolhido; ao concluir, recarrega.
6. `GET /api/admin/patients` (lista usada na busca) — confirmar que traz `preferredLocale`; se não
   trouxer, a janela busca o paciente escolhido em `/api/admin/patients/[id]`.

## Arquivos afetados
- `components/admin/assign-protocol-dialog.tsx` (novo)
- `app/admin/protocols/page.tsx`
- `app/admin/patients/[id]/page.tsx`
- possivelmente `app/api/admin/patients/route.ts` (só adicionar `preferredLocale` ao select)

## Critérios de aceite
- [x] Pela página de templates: atribuir com padrões → protocolo com semanas 1–2 visíveis, no
      idioma do paciente
- [x] Pela ficha: "Assign template" → escolher template → mesmo resultado; aba recarrega e mostra o
      protocolo novo
- [x] Paciente já com o mesmo template ativo → janela mostra o aviso; "Archive…" arquiva o antigo;
      "Assign anyway" mantém os dois
- [x] Sem erro no console; ok em ~390px
