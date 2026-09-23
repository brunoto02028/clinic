# QA Spec — Atividade 071: Alerta de adesão para o staff

## T-1: Cálculo de streak de adesão

**API**
1. Paciente com protocolo `SENT_TO_PATIENT`, item liberado esta semana, sem
   nenhum `ExerciseCompletionLog` há 4 dias, threshold 3 → aparece na lista
   com `daysWithoutActivity: 4`.
2. Mesmo paciente, mas logou algo ontem → não aparece (streak resetado).
3. Paciente com protocolo `SENT_TO_PATIENT` mas nenhum item ainda liberado
   (todos com `startWeek` futuro) → não aparece, mesmo sem log nenhum.
4. Paciente sem protocolo `SENT_TO_PATIENT` (só `DRAFT`) → nunca aparece.
5. **Tenant:** staff da Clínica A nunca vê paciente da Clínica B na resposta
   de `GET /api/admin/adherence/falling-behind`, mesmo que esse paciente
   esteja claramente atrasado.
6. Sem sessão / sessão de PATIENT → 401/403.

## T-2: Card "Patients Falling Behind"

**UI**
1. Dashboard admin, clínica com paciente(s) atrasado(s) → card lista cada um
   com dias sem atividade e link funcional pro perfil.
2. Clínica sem nenhum paciente atrasado → card mostra estado vazio, não
   desaparece nem quebra o layout.
3. Paciente com nota não vista → sinal visível no card.
4. Confirmar que a página não faz nenhuma chamada de envio (rede — checar
   que não há POST pra rota de notificação/e-mail disparado por esse card).

## T-3: Caixa de observação do paciente

**UI**
1. Paciente abre `Today`/semana, escreve uma observação num exercício,
   salva → recarrega a página → observação continua lá.
2. Deixar o campo vazio e salvar → não quebra, não cria nota vazia
   perceptível como "tem nota".
3. Marcar o exercício como feito sem escrever nada → funciona igual a antes
   (campo é aditivo, não obrigatório).
4. Paciente A não consegue ver/editar observação de item do paciente B (via
   chamada direta à API com id de outro paciente) → 404/403.

## T-4: Observação visível pro staff

**UI**
1. Paciente (via T-3) deixa observação → staff da mesma clínica abre o
   perfil dele → observação aparece junto ao item certo.
2. Staff de outra clínica não consegue ver essa observação (mesma checagem
   de tenant do resto do projeto).
3. Staff abre o perfil (ou marca como lida) → sinal de "nota nova" some do
   card de T-2 pro próximo carregamento.

## T-5 (se implementada): Observação no mobile

**Manual/App**
1. Mesmo cenário de T-3, no app mobile — observação escrita lá aparece pro
   staff no mesmo lugar de T-4.

## Transversal (todas as tarefas)

- Nenhum cenário deve disparar `notifyPatient` ou qualquer envio automático
  pro paciente — essa atividade é 100% staff-facing.
- `tsc --noEmit` e `eslint` limpos nos arquivos tocados por cada tarefa.
- `npm run build` local limpo antes de qualquer push.
