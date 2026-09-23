# T-6: Painel de regras

**Status:** concluído — QA aprovado (`qa/report-t-6.md`, `qa/report-t-6-recheck.md`, `qa/report-t-6-recheck-2.md`)
**Depende de:** T-3, T-4

## Objetivo

Ligar e desligar regras, mudar limites e editar os textos (inglês e português) pela interface —
sem deploy e sem me pedir para rodar script.

## Contexto

Documento §3.1 ("editáveis por um painel administrativo, sem precisar de deploy") e §10.5/§10.6.

É a regra permanente do Bruno: ação administrativa é self-service, não depende de mim. A ativ. 061
já fez isso para um caso — o toggle do lembrete diário por clínica, no dialog de Settings de
`app/admin/clinics/page.tsx`. Esta tarefa generaliza.

## Passos

1. Tela de regras: lista com código, nome, gatilho, ação, estado e a que clínica se aplica.
2. Editar: `active`, os limites da `condition` (com o tipo certo por campo, não JSON cru) e os
   templates EN/PT do `actionData`.
3. Prévia do template com dados de exemplo, inglês primeiro — mesma ideia da prévia de e-mail
   (ativ. 068).
4. Toda alteração grava `AuditLog`: quem, quando, valor antes e depois.
5. Regra global × regra da clínica: a tela deixa claro qual está valendo e permite sobrepor por
   clínica sem alterar a global.

## Arquivos afetados

- `app/dashboard/automation/page.tsx` ou `app/admin/automation/page.tsx` (novo — decidir na T-1 de
  qual lado fica, staff da clínica ou superadmin)
- `app/api/automation/rules/route.ts`, `.../[id]/route.ts` (novos)

## Critérios de aceite

- [x] Mudar um limite pela tela muda o comportamento da regra **sem deploy**
- [x] Desligar uma regra numa clínica não afeta as outras
- [x] Toda alteração aparece no `AuditLog` com valor antes e depois
- [x] A prévia mostra inglês e português, inglês primeiro — a regra passou a ter `titlePt` (decisão do Bruno, 23/09: tudo nas duas línguas, inglês primeiro)
- [x] Usuário sem permissão administrativa recebe 403 na API e não vê a tela
- [x] Não é possível salvar uma `condition` inválida (validação com Zod, mensagem clara)
- [x] Placeholder inexistente em `titleEn` é recusado na tela — os fatos disponíveis são
      conhecidos, e `{naoExiste}` hoje chega cru ao título que o terapeuta lê (QA da T-3, R3)
