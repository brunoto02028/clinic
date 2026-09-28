# T-3: O vínculo de cuidado — o paciente atravessa a parede, com consentimento

**Status:** pendente
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

- [ ] Sem vínculo, o profissional recebe **404** — nunca 403, que confirma que
      o paciente existe.
- [ ] Vínculo encerrado não dá mais acesso, e o histórico continua.
- [ ] Nenhuma rota consulta paciente de outro inquilino sem passar pelo helper.
- [ ] Um teste que percorre **todas** as rotas de paciente e falha se alguma
      aceitar `patientId` sem checar tenant nem vínculo.
- [ ] A reabilitação existente não muda: o paciente dela continua alcançado
      por tenant, sem vínculo nenhum.
