# T-5: A automação — cadência pelo plano, e o aviso que é escolha

**Status:** pendente — **espera a sua confirmação da tabela do plano**
**Depende de:** T-4

## Objetivo

O relatório nasce sozinho, na cadência que o plano do paciente vende, e fica
disponível no app dele. **Avisar é outra coisa, e é escolha dele.**

## Contexto

É aqui que mora a decisão que encosta na regra de 17/09. As três linhas da
tabela do plano valem como contrato desta tarefa:

| o que | automático? |
|---|---|
| gerar | sim |
| disponibilizar no app | sim, para quem assinou |
| avisar (push/e-mail) | só se a pessoa ligou |

**Estar disponível não é ser enviado.** É essa distinção que faz o produto
existir sem quebrar a regra.

## Passos

1. `PatientReport` (novo): período, conteúdo gerado, quando nasceu, e se o
   terapeuta acrescentou um trecho.
2. A cadência vira propriedade do plano: `NONE` / `DAILY` / `WEEKLY`.
3. Uma tarefa diária gera o que estiver vencido. **Ela não envia nada.**
4. Tela **Meus relatórios** no app, para quem tem cadência — e ela **não
   aparece** para quem não tem. Prometer um relatório que não vem é pior que
   não prometer.
5. Um interruptor no perfil: *"Avisar quando um relatório novo ficar pronto"*,
   **desligado de nascença**.
6. Botão no painel para disparar o aviso à mão, que diz em quantos aparelhos
   chegou.
7. Gerar é idempotente: rodar duas vezes no mesmo período não cria dois.

## Arquivos afetados

- `prisma/schema.prisma`
- `lib/patient-report-schedule.ts` (novo)
- `app/api/cron/patient-reports/route.ts` (novo)
- `mobile/app/(app)/(clinica)/reports.tsx` (novo)

## Critérios de aceite

- [ ] Sem plano com cadência, nada é gerado e a tela não aparece
- [ ] **Nenhum push ou e-mail sai sem o interruptor ligado ou sem alguém clicar**
- [ ] Rodar a tarefa duas vezes não duplica relatório
- [ ] O paciente abre o app e o relatório está lá
- [ ] Desligar a cadência para de gerar e **não apaga** os que já existem
