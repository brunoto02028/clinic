# T-18: Vocabulário por tipo de tenant

**Status:** pendente
**Trilha:** PLATAFORMA
**Depende de:** T-12

## Objetivo
No tenant personal, os termos passam a ser: aluno, personal, treino, sessão, estúdio. No tenant clínica, continuam: paciente, fisioterapeuta, tratamento, clínica.

## Passos
1. `lib/tenant-vocab.ts`: mapa por tipo × idioma (EN/PT), com hook no cliente e helper no servidor.
2. Aplicar em:
   - navegação do admin;
   - lista e ficha do aluno;
   - dashboard do aluno;
   - agendamento;
   - assuntos dos e-mails.
3. Esconder do tenant personal o que é só clínico: SOAP, triagem clínica, Rehab Agent, Evidência e foot scan. Fica por módulo, não por texto.

## Critérios de aceite
- [ ] Cenários da T-18 passando.
- [ ] Regressão: os textos da BPR ficam inalterados.
