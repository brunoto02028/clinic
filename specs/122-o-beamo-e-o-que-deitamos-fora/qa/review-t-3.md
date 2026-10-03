# Code review — T-3 (03/10/2026)

Oito achados, **nenhum de gravidade 1**. O que mais me interessava está provado
do lado certo, e a prova não é raciocínio: é a documentação que já estava no
repo.

## A regra aguenta contra o relógio — e porquê

A defesa escolhida foi *"só é atribuído o grupo que traz SpO₂ ou temperatura
corporal"*. O review foi ver se o relógio do dono consegue produzir um desses
sozinho, dentro de uma janela, e a resposta está em
`docs/withings-api-2026-10-02.md`:

- o **SpO₂ automático** do ScanWatch é `spo2_auto`, do `getintradayactivity` —
  **não chega como grupo de medida** no `getmeas`;
- a **temperatura contínua** chega como `core_body_temperature` no mesmo
  intraday, ou como tipo **73** (pele), que a regra exclui;
- o tipo 11 é *"only for BPM and scale devices"*.

E o SpO₂ do sono acontece às três da manhã, quando não há janela aberta.

## O buraco que fica, e é humano

**O dono medir-se a si mesmo dentro da janela do paciente** — *"deixa eu ver o
meu também"*, a demonstrar o aparelho. A regra pergunta *"alguém mediu isto?"* e
a resposta é **sim**; ela não consegue perguntar *"em quem?"*.

Probabilidade por uso, baixa. Na primeira semana com um aparelho novo, não
desprezável. Está no `o-fluxo-do-beamo.md`, e a saída é a T-4 (poder mover).

## Achados e disposição

| # | Gravidade | O que é | Estado |
|---|---|---|---|
| G1 | alto | medir **só a temperatura** escrevia o `VitalReading` e a tela respondia *"nada veio do aparelho"* — **terceira vez** nesta mesma tela | **corrigido** |
| G2 | alto | `36.800000000000004 °C` no prontuário e no ecrã — a Withings manda `368 × 10⁻¹`, e só o caminho pessoal arredondava | **corrigido** |
| G3 | médio | nada recusava um `SpO₂ 0%` de uma oximetria abortada, e o teste cristalizava *"zero é um valor"* | **corrigido** — `valorPlausivel`, com faixa larga: 41,5 °C **entra** |
| G4 | médio | `vitaisNaoAtribuidos` contava cada grupo de pressão; 60 pressões imprimiam "60 perdidos" sem nada se ter perdido | **corrigido** — perda é o que **trazia medição** e não entrou |
| G5 | médio | dentro de um grupo atribuído, o que não cabe nas três colunas é deitado fora sem contador | **aceite** — fica na T-4, com a caixa de entrada |
| G6 | médio | não há caixa de entrada para vitais, e a `UnassignedMeasurement` exige `systolic`/`diastolic` | **aceite** — a T-4 precisa de schema, e isso agora está escrito |
| G7 | baixo | a dedup é `(patientId, measureId)`; a da pressão é `(clinicId, measureId)` | **aceite** — exige cancelar e reabrir dentro de 30 s da medição |
| G8 | baixo | sem `autoAttributed` e sem rota de mover: o engano não se desfaz pela UI | **aceite** — a rota de mover é T-4 |
| — | baixo | `timezone` fora do `select` da rota; `take` sem `+1` nem aviso de corte | **corrigidos** |

## Mutações

| # | Mutação | Testes mortos |
|---|---|---|
| M31 | volta o float cru | 1 |
| M32 | o `SpO₂ 0%` volta a entrar | 2 |
| M33 | o contador volta a somar os grupos de pressão | 1 |
| M34 | a rota deixa de dizer quantos vitais entraram | 1 |
| — | controlo | 0 (27 passam) |

## O que o review disse dos testes, e vale guardar

- o mock que importa **aplica o `where`** — o padrão que nasceu do defeito de
  ontem à noite;
- **zero bytes `\x08`**;
- mas as fixtures são `any[]`: renomear `bodyTemperature` em
  `withings-vitals.ts` deixaria `grupoEAtribuivel` a devolver `false` para todo
  grupo real **com a suíte verde**. Tipar as fixtures como `WithingsVital[]`
  fecha isso, e fica anotado.

## Portões

```
npx jest   4009 testes, 0 falhas
npx tsc --noEmit        limpo
NEXT_DIST_DIR=.build-verify npx next build   ok
```
