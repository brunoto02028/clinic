# T-5: QA visual + regressão consolidada

**Status:** concluído
**Depende de:** T-1, T-2, T-3, T-4

## Objetivo
Confirmar visualmente que a nova paleta está aplicada de forma consistente e que nada quebrou.

## Passos
1. Percorrer as telas principais do admin (dashboard, pacientes, ficha de paciente, agenda, configurações, os 7 componentes que usam `bruno.*`) com screenshots antes/depois.
2. Confirmar `.public-site` (site público) e `.brand-accent` (email marketing) visualmente inalterados.
3. Confirmar uma clínica com `primaryColor` customizado (ex.: uma clínica de QA com cor diferente do default) continua mostrando a cor dela em `app/clinics/[slug]/client.tsx`.
4. Confirmar logo clara (T-1) legível no sidebar (se já houver arquivo cadastrado).
5. Checagem de contraste básica (texto legível em todos os botões/cards principais) — reportar qualquer combinação ilegível como achado, não como aprovação condicional.

## Arquivos afetados
- Nenhum (só QA)

## Critérios de aceite
- [ ] Screenshots antes/depois das telas principais do admin.
- [ ] `.public-site`/`.brand-accent` confirmados inalterados.
- [ ] Cor customizada de tenant confirmada não sobrescrita.
- [ ] Nenhum problema de contraste não resolvido.
