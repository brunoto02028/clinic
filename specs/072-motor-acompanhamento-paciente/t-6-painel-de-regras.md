# T-6: Painel de regras

**Status:** pendente
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

- [ ] Mudar um limite pela tela muda o comportamento da regra **sem deploy**
- [ ] Desligar uma regra numa clínica não afeta as outras
- [ ] Toda alteração aparece no `AuditLog` com valor antes e depois
- [ ] A prévia mostra inglês e português, inglês primeiro
- [ ] Usuário sem permissão administrativa recebe 403 na API e não vê a tela
- [ ] Não é possível salvar uma `condition` inválida (validação com Zod, mensagem clara)
