# T-4: Fonte única de acesso, admin e portal

**Status:** concluído
**Depende de:** T-2

## Objetivo

Que a tela de permissões e o portal do paciente respondam a mesma coisa quando
perguntados "o que este paciente enxerga?".

## Contexto

Existem duas implementações independentes da mesma regra:

- `app/api/admin/patients/[id]/permissions/route.ts` — tem a própria lista
  fixa de módulos concedidos por tratamento (linhas 72–74) e a própria leitura
  de `moduleOverrides` (linhas 79–86)
- `app/api/patient/access/route.ts` — tem a dele: sempre-visíveis, planos
  ativos, pacote de tratamento, override total, e então os overrides
  individuais (linhas 108–191)

Enquanto forem duas, vão divergir. É a explicação mais provável para o relato
de módulos liberados no admin que não aparecem no portal.

As chaves (`mod_*`, `perm_*`) já batem entre as duas, então o problema não é de
formato — é de regra.

## Passos

1. Extrair a decisão para `lib/patient-access.ts`: uma função que recebe o
   paciente com as relações necessárias e devolve módulos e permissões
   concedidos, mais o motivo de cada concessão.
2. As duas rotas passam a chamá-la. Nenhuma mantém regra própria.
3. Antes de trocar, **capturar o comportamento atual dos dois lados** para
   cada paciente real de produção, e comparar depois: a refatoração não pode
   mudar o acesso de ninguém sem que a diferença seja intencional e listada.
4. A tela de permissões passa a mostrar *por que* cada módulo está liberado
   (plano, pacote, sempre-visível, override, acesso total) — é o que torna a
   divergência visível no futuro.
5. Testes cobrindo as combinações: sem plano, com plano, override total,
   módulo escondido, módulo liberado à mão.

## Arquivos afetados

- `lib/patient-access.ts` (novo)
- `app/api/patient/access/route.ts`
- `app/api/admin/patients/[id]/permissions/route.ts`
- `app/admin/patients/[id]/permissions/page.tsx`

## Critérios de aceite

- [ ] Um módulo liberado no admin aparece no portal do paciente
- [ ] Um módulo escondido no admin some do portal
- [ ] Acesso Total libera tudo nas duas telas
- [ ] Antes/depois idênticos para todos os pacientes de produção, salvo diferenças listadas
- [ ] A tela de permissões mostra a origem de cada liberação
- [ ] Testes cobrem as cinco combinações
