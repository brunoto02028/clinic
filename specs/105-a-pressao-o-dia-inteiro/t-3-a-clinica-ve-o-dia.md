# T-3: A clínica vê o dia, não só o ponto

**Status:** pendente
**Depende de:** T-2

## Objetivo

Quem cuida da Mione abre a ficha dela e entende a semana em segundos.

## Contexto

A 099 já deu gráficos de monitoramento e relatórios. Falta a forma que só existe
com medida contínua: o dia inteiro numa linha, a noite marcada, e a comparação
entre dias.

## Passos

1. Na ficha do paciente, a pressão contínua ao lado do que já existe — não numa
   tela nova que ninguém acha.
2. Um dia em detalhe: a linha das 24 horas, com a noite sombreada.
3. A semana: uma barra por dia, com dia e noite lado a lado.
4. A origem à vista — "bracelete", "aparelho da clínica", "digitado" — porque
   elas não se comparam de igual para igual.
5. Entra nos relatórios de monitoramento que a 099 já gera.

## Arquivos afetados
- `app/admin/patients/[id]/page.tsx` (aba de pressão)
- `components/admin/pressao-continua.tsx` (novo)
- `app/api/admin/patients/[id]/blood-pressure/*`

## Critérios de aceite
- [ ] O dia e a semana, com a noite distinguível.
- [ ] A origem de cada série está dita.
- [ ] A rota respeita a parede entre inquilinos (varredura da 102 T-10).
- [ ] Paciente sem bracelete não vê tela quebrada.
