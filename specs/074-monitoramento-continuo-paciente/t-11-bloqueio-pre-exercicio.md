# T-11: Bloqueio da sessão por pressão pré-exercício

**Status:** ✅ concluída
**Depende de:** T-3 (o padrão de limiar como regra)

## Objetivo
Pressão acima de 200/110 antes do treino bloqueia a sessão do dia e orienta o paciente.

## Contexto
Vem do `plano-comercial.md`, tabela de segurança (critérios do ACSM):

| Situação | Limite | Ação do app |
|---|---|---|
| Antes do exercício | acima de 200/110 | bloqueia a sessão do dia e orienta o paciente |
| Durante o exercício | acima de 250/115, ou sistólica caindo com o aumento da carga | orientar interrupção imediata |

**Estes limiares não são os da T-3.** 130/80 e 180/120 classificam uma leitura feita em casa;
200/110 decide se o treino acontece. Propósitos diferentes, nomes diferentes — é o risco de
confusão que o próprio plano aponta. Chave de regra separada: `EXERCISE_BP_LIMITS`.

O "durante o exercício" depende de medir no meio do treino, o que o BPM Connect não faz sozinho.
Esta tarefa entrega o **pré-exercício**; o durante entra como orientação escrita na tela, não como
automatismo que não temos como cumprir.

## Passos
1. Regra `EXERCISE_BP_LIMITS` no seed (`blockSystolic: 200`, `blockDiastolic: 110`,
   `stopSystolic: 250`, `stopDiastolic: 115`), com o mesmo teste de plausibilidade da T-3 — um
   limiar de 2000 não pode passar e desligar o bloqueio em silêncio.
2. `lib/automation/exercise-bp.ts`: lê a regra e responde `canTrain(lastReading)` →
   `{ blocked, reason, measuredAt }`. Leitura **válida por 60 minutos**; mais velha que isso não
   bloqueia nem libera — não há medida, e dizer o contrário é inventar.
3. Na tela de treino (app e web): se bloqueado, a sessão não abre; mostra o valor, a hora, o que
   fazer (repousar 5 minutos e medir de novo; se persistir, procurar o GP) e o aviso de não
   emergência (T-13).
4. O bloqueio gera `Alert` para a clínica — "revisar e contatar o paciente" é a ação do Bruno na
   tabela do plano.
5. **Sem liberação manual — a medida nova é que libera.** Cheguei a planejar um override do
   terapeuta com registro de quem liberou; ao implementar, ficou claro que não vale a pena. O
   bloqueio dura no máximo 60 minutos (a validade da leitura), e o caminho natural é medir de novo:
   uma leitura abaixo do limite libera na hora, e é clinicamente melhor do que um botão que passa
   por cima de 205/112. Se você quiser o override mesmo assim, é uma tarefa curta — mas é uma
   decisão sua, não minha.

## Arquivos afetados
- `prisma/seed-automation-rules.ts`
- `lib/automation/exercise-bp.ts` (novo)
- API da sessão de treino / protocolo do dia
- telas de treino (web e mobile)

## Critérios de aceite
- [ ] 205/112 medido há 10 minutos bloqueia a sessão e alerta a clínica
- [ ] A mesma leitura de 3 horas atrás não bloqueia, e o app diz que não há medida recente
- [ ] 150/95 não bloqueia
- [ ] Os limiares são editáveis em `/admin/automation`, separados dos da T-3 e com outro nome
- [x] Uma leitura nova abaixo do limite libera na hora; não existe botão para ignorar o bloqueio
- [ ] Bilíngue, inglês primeiro
