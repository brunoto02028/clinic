# T-19: Onboarding e módulos do tenant personal

**Status:** pendente
**Trilha:** PERSONAL
**Depende de:** T-17, T-18

## Objetivo
O aluno do personal entra sem o fluxo clínico da BPR e acessa o que o personal liberou (AL-1, AL-2 e PT-4 da atividade 19).

## Passos
1. Onboarding do tenant personal, em quatro passos:
   - perfil;
   - termos do tenant;
   - **questionário de prontidão para atividade física** (autoral e bilíngue, com critérios de encaminhamento revisados pelo painel clínico);
   - primeira sessão.
2. Módulos padrão do tenant personal (treino, agenda, vídeos, planos):
   - o acesso vem do tenant ou do plano do tenant;
   - o paywall da BPR não se aplica.
3. Catálogo de serviços do tenant (`TreatmentType` por clínica) no diálogo de nova sessão. Hoje é a lista fixa de fisioterapia (`lib/types.ts`, a confirmar).

## Critérios de aceite
- [ ] Cenários da T-19 passando.
- [ ] Questionário aprovado pelo painel.
- [ ] Regressão: o onboarding da BPR fica igual.
