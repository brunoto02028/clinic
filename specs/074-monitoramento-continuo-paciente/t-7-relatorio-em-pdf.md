# T-7: Exportação do relatório em PDF

**Status:** pendente
**Depende de:** T-6

## Objetivo
O mesmo relatório, em PDF, para anexar ao prontuário ou entregar ao paciente.

## Contexto
Suposição 5: usar a mesma biblioteca das faturas, sem trazer dependência nova. Regra do Bruno:
nada sai com a identidade da clínica sem o logo BPR, e nada vai ao paciente sem ele ver a prévia.

## Passos
1. Reaproveitar o gerador das faturas.
2. Cabeçalho com o logo da clínica, nome do paciente, período e data de geração.
3. Botão de download na tela de T-6.
4. **Prévia antes de qualquer envio** — o PDF é baixado pelo staff; enviar ao paciente é ação
   separada e manual.

## Arquivos afetados
- `app/api/admin/patients/[id]/report/pdf/route.ts` (novo)
- `app/admin/patients/[id]/report/page.tsx`

## Critérios de aceite
- [ ] O PDF abre em leitor comum, com o logo correto
- [ ] Conteúdo idêntico ao da tela, no mesmo período
- [ ] O nome do arquivo identifica paciente e período
- [ ] Nenhum envio automático ao paciente
