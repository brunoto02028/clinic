# T-9: O app nomeia o que mediu

**Status:** concluído (03/10/2026) — QA e review feitos, 11 achados dispostos
**Depende de:** T-2

## O achado (A-6 do QA do fluxo)

Um ECG medido na clínica, com o aparelho da clínica, aparece no app do paciente
como conclusão **do relógio dele**:

```ts
normal:       pt: "O relógio não assinalou nada"
fibrilacao:   pt: "O relógio encontrou sinais de fibrilação atrial"
inconclusivo: pt: "O relógio não conseguiu classificar este registro"
```

E o rodapé: *"This is what the watch concluded."* E o estado vazio: *"They
arrive from your watch as it syncs."* E o painel da clínica: *"ECG — what the
watch concluded."*

A partir da T-2 isto passou a ser **falso com frequência**: é precisamente o ECG
que o terapeuta grava no paciente com o BeamO que entra na ficha dele. O
paciente lê que o relógio dele encontrou sinais de fibrilhação auricular, e ele
pode nem ter relógio.

A rota nem sequer manda o nome do aparelho ao telefone:

```ts
select: { id: true, recordedAt: true, heartRate: true, conclusao: true, signalId: true }
```

E a linha de auditoria que diz quem mediu existe na base desde a T-2, e nenhuma
tela a mostra.

## A regra: nomear o que se sabe, nunca adivinhar

| o que sabemos | o sujeito da frase |
|---|---|
| a Withings deu o nome do aparelho | esse nome, como ela o escreve (*"ScanWatch 2"*) |
| nada disso | *"O aparelho"* |
| a gravação veio da ligação **da clínica** | o sujeito não muda; **"Medido na clínica"** vai numa linha própria |

**O sujeito nunca somos nós.** A primeira versão punha *"O aparelho da clínica"*
como sujeito, e o code review derrubou-a: *"o aparelho da clínica encontrou
sinais de fibrilhação"* lê-se como **a clínica encontrou**, e é precisamente a
linha que mantém este produto fora de dispositivo médico. A clínica é **lugar**,
não autor.

Nunca *"o relógio"*, que é uma afirmação sobre o que o paciente tem ao pulso.

O nome vem da própria Withings (`EcgRecording.deviceName`) pela mesma razão que
já vai ao papel: uma tabela de códigos minha chamou *"ScanWatch"* ao `94`, que a
API nomeia *"ScanWatch 2"* — um palpite meu num documento clínico.

## Compatibilidade com o binário já instalado

Os campos novos são **opcionais**, como o `temTracado` da 119: um app instalado
antes desta mudança ignora-os; um app novo contra um servidor antigo recebe
`undefined` e cai no terceiro caso (*"O aparelho"*), que nunca é falso.

## O que esta tarefa **não** faz

Não mostra quem mediu. O nome do terapeuta está na auditoria e é informação da
clínica; pô-lo na tela do paciente é outra decisão, e é do Bruno.

## Passos

1. `app/api/wearables/data/route.ts` — `deviceName` e `connection.isClinicDevice`
   no `select`; a resposta leva `deviceName` e `naClinica`.
2. `mobile/src/lib/ecg-lista.ts` — `fraseDaConclusao(registo, lang)` e
   `origemDoRegisto(registo, lang)`, puras.
3. `mobile/src/components/ListaDeEcg.tsx` — usa as duas; rodapé e estado vazio
   deixam de dizer "watch".
4. `components/admin/patient-monitoring-tab.tsx` — título **e corpo**, mais o
   aviso de fibrilhação; `app/admin/biohacking/page.tsx` — a segunda cópia desse
   aviso.
5. `lib/ecg-record.ts` e `lib/patient-report.ts` — o relatório do paciente.
6. `lib/ecg-pdf.ts` — **o papel que sai do edifício**, que imprimia o nome do
   aparelho e dizia "o relógio" três linhas abaixo.
7. `__tests__/nenhum-byte-de-backspace-no-codigo.test.ts` — o guarda permanente
   contra o ``, que apanhou duas regras minhas a não medir nada.

## Critérios de aceite

- [x] Gravação da clínica → o nome do aparelho como sujeito + linha *"Medido na clínica"*, e **nunca** a clínica a concluir
- [x] Com `deviceName` → esse nome, tal como a Withings o escreve
- [x] Sem nada → *"O aparelho"*, nas duas línguas
- [x] Nenhuma frase **chama** "o relógio" ao aparelho — a palavra pode aparecer
      dentro do nome que a Withings dá ("ScanWatch 2"), e aí é o nome certo. A
      primeira versão do teste banía a palavra e reprovava o nome verdadeiro.
- [x] Campos opcionais: `undefined` não inventa origem nenhuma
- [x] Nenhuma frase contém "diagnóstico" nem "normal"
- [x] Quatro mutações, quatro testes mortos: a clínica deixar de se nomear (2),
      o nome do aparelho ser ignorado (1), `undefined` virar "na clínica" (1), e
      a rota deixar de mandar a origem (1)
- [x] QA aprovado (`qa/report-t-9.md`)
- [x] Code review feito — 3 achados altos, incluindo o guarda deste critério a não medir nada
