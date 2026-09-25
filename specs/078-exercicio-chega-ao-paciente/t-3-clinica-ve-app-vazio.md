# T-3: A clinica ve quem esta com o app vazio

**Status:** pendente
**Depende de:** T-1

## Objetivo
O Bruno descobre sozinho que o app de um paciente esta vazio, em vez de descobrir abrindo o app.

## Contexto
Hoje nada avisa. O paciente instala, abre, nao ve nada e a clinica so fica sabendo se ele
reclamar — ou se alguem abrir o app dele, que foi como isto apareceu.

O lugar certo ja existe: `lib/clinic-waiting.ts`, que conta o que esta parado esperando a clinica e
entra no relatorio diario (076, T-6). Um paciente sem exercicio e exatamente isso.

## Passos
1. `getClinicWaiting` ganha `patientsWithoutExercises`: pacientes ativos da clinica, com
   `mod_exercises`, e com zero prescricao ativa.
2. Entra no bloco do e-mail com o mesmo cuidado dos outros: contagem e link, **nenhum nome**.
3. Entra no badge do menu (`/api/admin/pending-count`), pelo mesmo caminho ja escopado por tenant.

## Arquivos afetados
- `lib/clinic-waiting.ts`, `app/api/admin/pending-count/route.ts`

## Criterios de aceite
- [ ] Contagem correta com paciente sem prescricao
- [ ] Some quando a prescricao existe
- [ ] Nenhum nome de paciente no e-mail
- [ ] Nao conta paciente de outra clinica
