# T-5: Porte — registros de saúde

**Status:** pendente
**Depende de:** T-1

## Objetivo
Levar para o app os registros clínicos que o paciente consulta ou alimenta.

## Contexto
Agrupamento provisório, confirmado pela T-1.

Candidatas: `records`, `recordings`, `blood-pressure`, `clinical-notes/create`.

`blood-pressure` tem endpoint admin (`app/api/admin/patients/[id]/blood-pressure`) — verificar se existe o equivalente do lado do paciente ou se a tela é só de leitura.

`recordings` (gravações de consulta) envolve mídia: checar tamanho, streaming e permissão antes de portar.

## Passos
1. Mapear o endpoint de cada tela e o sentido (leitura, escrita ou ambos).
2. Criar clients e telas seguindo o padrão do módulo clínica.
3. Para `recordings`, definir se o app reproduz a mídia ou só lista e abre fora.
4. Para escrita (`clinical-notes/create`, `blood-pressure`), validar entrada no cliente e tratar erro do servidor.

## Arquivos afetados
- `mobile/src/api/*.ts`
- `mobile/app/(app)/(clinica)/*.tsx`

## Critérios de aceite
- [ ] Telas de leitura mostram os mesmos dados da web
- [ ] Telas de escrita validam entrada e tratam erro do servidor
- [ ] Decisão sobre reprodução de mídia registrada no report
- [ ] Nenhum dado de outro paciente acessível (conferir o escopo do endpoint)
