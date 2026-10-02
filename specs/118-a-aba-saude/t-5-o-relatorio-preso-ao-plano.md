# T-5: O relatório preso ao plano, com a trava no servidor

**Status:** concluído (02/10/2026)

> **O QA reprovou a primeira rodada em dois pontos, e os dois eram graves.** O
> papel que o paciente leva ao médico **afirmava diagnóstico** — `<h2>Clinical
> Diagnosis</h2>`, com condição e gravidade, e zero ocorrências da frase que o
> nega. E o `POST` **aceitava conta de terapeuta**, saltando o `mod_records` por
> inteiro: o `patientGate` devolve cedo para quem não é paciente, antes da
> checagem de módulo. Fechado com o `patientOnlyWriteRefusal` — o mesmo guarda que
> eu já tinha posto na T-7 desta atividade, nesta mesma sessão, e que aqui esqueci.
>
> Também saía só em inglês: o `reportLanguage` existia e era ignorado.

**Depende de:** T-1

## O pedido

> *"Vou querer relatório de todos os dados do paciente ok? Nosso sistema precisa
> entregar isso"*
>
> *"Quero poder gerar esses reports detalhados que servirão para os pacientes
> buscarem ajuda médica ou de outros profissionais quando quiserem. Mas isso vai
> depender de planos ou pagamento da clinic."*
>
> *"Não precisamos de nada com preço agora"* — Bruno

## O que já existe, e porque isto é pequeno

**O relatório completo já está construído.** `lib/patient-report.ts` junta
triagem, avaliação corporal, protocolos, notas SOAP, o acompanhamento do período
com relógio, pressão, ECG, exercício, dor e consultas — e devolve HTML pronto
para imprimir.

O que não existe é **o paciente pedir um**. Hoje há dois caminhos, e nenhum é
dele:

| caminho | quem dispara |
|---|---|
| `/api/admin/patients/[id]/report` | a clínica, para um paciente |
| `lib/patient-report-schedule.ts` | o cron, na cadência da clínica |

A lista (`/api/patient/reports`) e a leitura (`/api/patient/reports/[id]`) do
lado do paciente **já existem e já estão travadas** em `mod_records`. Falta o
verbo que cria.

## As decisões

### A trava é `mod_records`, e fica no servidor

A Suposição #4 do plano já tinha antecipado: *"'Plano' é o que o `patientGate` já
entende"*. E `mod_records` é literalmente o módulo cujo rótulo no app é **"Meus
relatórios"** — a lista e a leitura já o pedem. Um terceiro conceito de plano só
para o botão criaria duas verdades sobre a mesma porta.

**Esconder o botão não é fechar a porta** — é regra escrita neste repositório, e
foi quebrada duas vezes no mesmo dia (110 T-3: a lista pedia módulo, a leitura
não). A trava vai no `POST`, e a tela lê o mesmo critério para decidir o que
mostra.

**Sem preço nenhum, como pedido.** O módulo é um interruptor da clínica. Quando
houver plano pago, ele liga e desliga este mesmo interruptor — nada aqui muda.

### Cada pedido é um retrato novo, não uma reescrita do antigo

O `[id]` guarda o HTML, e o comentário lá explica porquê: *"um relatório é o
retrato de um período, e regerá-lo faria o de janeiro mudar quando um dado de
janeiro fosse corrigido em março — sem que quem leu o primeiro soubesse"*.

Então cada pedido cria **uma linha nova**, com o instante exacto no
`periodStart`. Não se reaproveita a de hoje: quem mede mais ao meio-dia tem
direito a um relatório que inclua a medição do meio-dia.

### O tecto, pela mesma razão de sempre

Gerar um relatório são **nove consultas pesadas** ao banco, uma delas o
acompanhamento inteiro do período. Um botão sem tecto numa tela é um botão que
alguém carrega dez vezes.

**Um por paciente a cada 10 minutos.** Dentro disso, o pedido devolve **o último**
— que é o que a pessoa quer de qualquer forma — em vez de um erro.

### O período

`days`, entre 7 e 365, por omissão **90**. Noventa porque o pedido é levar a um
médico, e um médico quer ver a trajectória, não a semana.

## O que não se faz

**Não se gera PDF no servidor.** O HTML já sai pronto para imprimir, e o
navegador do telemóvel faz *Partilhar → Imprimir → Guardar como PDF*. Um
conversor HTML→PDF seria uma dependência nova — e o Bruno pede para ser avisado
antes de qualquer uma.

**Não se envia nada a ninguém.** O paciente pede, o paciente abre. Regra em
vigor: nada automático chega a um paciente.

**A tela diz porque não pode.** Um botão que some ensina que o produto está
estragado; um botão que explica manda a pessoa falar com a clínica.

## Passos

1. `prisma/schema.prisma`: `ON_DEMAND` em `ReportCadence`.
2. `lib/relatorio-a-pedido.ts`: a regra — o tecto, a janela, e o que fazer quando
   já existe um recente. Fora da rota porque é a parte verificável.
3. `app/api/patient/reports/route.ts`: `POST`, travado em `mod_records`.
4. `mobile/src/api/reports.ts` + a tela: o botão, o estado de espera, e a frase
   de quando o módulo está desligado.
5. Testes da regra, com mutação.

## Arquivos afetados

- `prisma/schema.prisma`
- `lib/relatorio-a-pedido.ts` (novo)
- `app/api/patient/reports/route.ts`
- `mobile/src/api/reports.ts`
- `mobile/app/(app)/(clinica)/reports.tsx` (ou onde a lista vive)
- `__tests__/...` (novo)

## Critérios de aceite

- [x] Com `mod_records` ligado, o paciente gera e o relatório aparece na lista
- [x] Com `mod_records` desligado, o `POST` responde 403 — **pela rota**, não pela tela
- [~] A tela desligada diz porquê e para quem falar — **o `PlanGate` diz, mas a linha do menu some** (`ModuleProfile.tsx:97`, governa todos os módulos; decisão de produto, ver o QA)
- [x] Dois pedidos seguidos devolvem o mesmo relatório, sem gerar duas vezes
- [x] Passados 10 minutos, um pedido gera um novo
- [x] O relatório de outro paciente continua a dar 404
- [x] `days` fora do intervalo é preso ao intervalo, não recusado
- [x] EN e PT — a tela e, desde a 2ª rodada, **o documento**
