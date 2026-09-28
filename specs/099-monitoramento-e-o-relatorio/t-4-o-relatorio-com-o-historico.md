# T-4: O relatório passa a incluir o histórico inteiro

**Status:** concluído (28/09/2026)
**Depende de:** nenhuma

## Objetivo

O relatório que já existe passa a conter o que o paciente viveu no período, não
só o que está no cadastro dele.

## Contexto

`lib/patient-report.ts` já reúne triagem, avaliação corporal, diagnóstico,
protocolos e notas SOAP, e já rende HTML e PDF. **Nada de monitoramento entra
nele.** Esta tarefa é somar seções, não escrever um relatório novo.

## Passos

1. Seções novas, cada uma com o período e a contagem de dias com dado:
   - **Sinais** — sono, FC de repouso, HRV, SpO2, pressão; valor, variação e
     dias medidos
   - **ECG** — quantos registros, e o que o aparelho concluiu em cada um
   - **Exercício** — prescrito × feito, e os envios de vídeo
   - **Como você se sentiu** — dor por data e check-in diário
   - **Tratamento** — consultas do período, presença e formato
2. **Fatos e mudanças, com datas.** Nenhuma frase que conclua algo clínico.
3. Uma seção **"Do seu terapeuta"**, opcional, que só existe quando alguém
   escreveu — e que sai assinada com o nome dele.
4. Seção sem dado **não aparece**: um relatório com seis "sem dados" é pior que
   um relatório curto.
5. Duas línguas, como o resto — e a língua é a do paciente.

## Arquivos afetados

- `lib/patient-report.ts`
- `lib/patient-report-pdf.ts`
- `app/api/admin/patients/[id]/report/route.ts`

## Critérios de aceite

- [ ] As cinco seções aparecem quando há dado, e somem quando não há
- [ ] Nenhuma frase interpreta um número
- [ ] O trecho do terapeuta sai com o nome dele
- [ ] O PDF continua saindo, com as seções novas
- [ ] Paciente sem nada gera um relatório honesto e curto, não um vazio
