# T-3: O vínculo de cuidado — o paciente atravessa a parede, com consentimento

**Status:** concluída (28/09/2026) — falta a criação pelo pagamento, que é a T-6
**Depende de:** T-1

## Objetivo

Um profissional de outro inquilino alcança um paciente da BPR **porque existe
um vínculo**, aceito pelo paciente — e por nenhum outro motivo.

## Contexto

Esta é a tarefa perigosa da atividade, e por isso ela é explícita.

Em 28/09 eu fechei dois vazamentos com exatamente a forma que esta tarefa
abre: o id vem de fora, o inquilino vem da sessão, e ninguém verifica que os
dois combinam. A diferença entre vazamento e funcionalidade aqui é **uma linha
no banco dizendo que o paciente concordou**.

Por isso: `clinicId` continua sendo a parede. O vínculo não a derruba — ele é
a única porta, e toda consulta que atravessa passa por um helper só.

## Passos

1. `CareLink`: `patientId`, `professionalClinicId`, `acceptedAt`, `endedAt`,
   `scope` (o que foi liberado).
2. Um helper — no espírito de `assertPatientAccess` — que responde "este ator
   pode agir sobre este paciente?" olhando **tenant OU vínculo vivo**. Nenhuma
   rota faz essa conta sozinha.
3. O vínculo **nasce do pagamento** (T-6). Não existe criar vínculo à mão no
   painel: profissional não ganha paciente por estar na plataforma.
4. O paciente vê e **encerra** o vínculo no app, e encerrar corta o acesso
   futuro sem apagar o que já aconteceu.
5. Registro em auditoria de toda leitura atravessada.

## Critérios de aceite

- [x] Sem vínculo, o profissional recebe **404** — nunca 403.
- [x] Vínculo encerrado não dá mais acesso, e o histórico continua.
- [x] A porta é **uma só**: o vínculo entra dentro de `assertPatientAccess`, e
      nenhuma rota consulta `careLink` por conta própria (teste prova).
- [x] Varredura de **todas** as rotas de paciente, seguindo a cadeia de
      helpers: zero sem guarda, lista de exceções vazia.
- [x] A reabilitação não muda: paciente do próprio inquilino nem chega a
      consultar vínculo.
- [x] A consulta do vínculo **falha fechado** — erro de banco responde "não".
- [x] Toda leitura atravessada vai para a auditoria, sem atrasar o atendimento.
- [x] O paciente vê quem tem acesso e encerra, no app — com caminho no perfil.
- [ ] **O vínculo nascer do pagamento é a T-6**, que depende do Stripe.
