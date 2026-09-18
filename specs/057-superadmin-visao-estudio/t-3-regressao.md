# T-3: Regressão da troca de contexto

**Status:** concluído
**Depende de:** T-1, T-2

## Objetivo
Garantir que a troca de visão não mudou nada fora do superadmin e que a volta para a BPR restaura tudo.

## Passos
Rodar os cenários da `qa/qa-spec.md` (seções T-3) com as fixtures locais e registrar as evidências.

## Critérios de aceite
- [ ] Os fluxos de personal (`qa.trainer`), aluno (`qa.aluno`), admin (`qa.admina`) e paciente (`qa.pacientea`) têm o mesmo menu e o mesmo título de antes.
- [ ] Superadmin: BPR → estúdio → BPR, e a visão acompanha cada troca.
- [ ] "View as Student" feito pelo superadmin dentro do estúdio mostra o portal do aluno de estúdio (menu de aluno, título do estúdio).
