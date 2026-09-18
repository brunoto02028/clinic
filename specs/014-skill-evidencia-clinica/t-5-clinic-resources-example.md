# T-5: templates/clinic-resources.example.json — modelo do catálogo

**Status:** pendente
**Depende de:** nenhuma

## Objetivo
Modelo do catálogo de recursos da clínica (equipamentos, exercícios, protocolos) que a skill
lê para o cruzamento — para ser copiado para `clinic-resources.json` e preenchido.

## Contexto
- A clínica já tem exercícios/protocolos no banco. Esta fase usa arquivo; ver Suposições do
  plan.md (talvez gerar o `clinic-resources.json` real a partir do DB local — decisão do Bruno).

## Passos
1. Definir o schema JSON: `equipment[]` (nome, categoria, para que serve), `exercises[]`
   (nome, região, vídeo/《id》, parâmetros típicos), `protocols[]` (nome, condição-alvo,
   fases). Campos alinhados aos modelos do DB (`ExercisePrescription`, `TreatmentProtocol`).
2. Preencher com 2–3 exemplos realistas por seção (dados fictícios, claramente de exemplo).
3. Documentar no topo (comentário/《_note》) como copiar para `clinic-resources.json`.

## Arquivos afetados
- `Skills/clinical-evidence-report/templates/clinic-resources.example.json` (novo)

## Critérios de aceite
- [ ] JSON válido, com `equipment`/`exercises`/`protocols`.
- [ ] Campos compatíveis com os modelos do DB.
- [ ] Exemplos claramente fictícios; instrução de cópia presente.
