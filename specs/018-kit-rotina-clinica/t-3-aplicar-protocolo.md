# T-3: UI admin "Aplicar protocolo ao paciente"

**Status:** pendente
**Depende de:** T-1, T-2

## Objetivo
Do catálogo de templates, o clínico aplica um protocolo a um paciente e o sistema gera o plano de tratamento + itens/prescrições no prontuário.

## Contexto
Reaproveitar o fluxo de prescrição/plano existente (ativ. 11). Botão "Aplicar ao paciente" no `admin/protocols` (ou no prontuário do paciente).

## Passos
1. Ação "Aplicar protocolo" → seletor de paciente (ou a partir do prontuário).
2. Endpoint que instancia `TreatmentPlan`/itens a partir do `ProtocolTemplate` (copia campos, mantém referência à origem).
3. Feedback de sucesso + link pro plano gerado.
4. Bilíngue.

## Arquivos afetados
- `app/admin/protocols/**` (botão/ação)
- `app/api/admin/**` (endpoint de aplicação)
- reuso dos componentes de plano/prescrição

## Critérios de aceite
- [ ] Aplicar template gera plano + itens no paciente escolhido.
- [ ] Origem (template) fica registrada no plano.
- [ ] Erros tratados (paciente inválido, template inexistente).
