# QA e code review — T-9 (03/10/2026)

Os dois correram sobre a primeira versão. Juntos devolveram **11 achados**, três
altos. A tarefa só foi marcada depois de todos terem disposição.

## O achado que importa mais: o guarda central não media nada

O teste chamado *"nenhuma frase chama 'o relógio' ao aparelho"* — o critério de
aceite nº 4 — tinha **bytes `\x08`** onde devia ter `\b`:

```
cat -A  →  /^Ho rel[oM-CM-3]gio^H|^Hthe watch^H/
```

Provado por execução: `/\x08o relógio\x08/.test("o relógio não assinalou nada")`
é `false`. Num `not.toMatch` isso **passa sempre**. Eu tinha dito que a regra
estava provada, e a regra não estava a ser medida de todo.

É a **quinta vez no mesmo dia**. Duas das anteriores eram `not.toMatch` sobre o
papel do paciente, uma delas a garantir que as datas não saem em inglês num
documento em português.

Por isso existe agora `__tests__/nenhum-byte-de-backspace-no-codigo.test.ts`:
varre o código-fonte inteiro e falha se encontrar o byte. Apanhou-me outra vez
**nesta mesma sessão**, quinze minutos depois, numa asserção nova.

## Achados e disposição

| # | Gravidade | O que é | Estado |
|---|---|---|---|
| 1 | **alto** | o guarda do critério 4 tinha `\x08` e nunca podia falhar | **corrigido** + teste de varredura permanente |
| 2 | **alto** | o cartão do painel ficou a contradizer-se: título *"device"*, três frases *"The watch"* | **corrigido** — e a asserção passou a medir o corpo, não só o título |
| 3 | **alto** | o **PDF que o paciente leva ao médico** mantinha *"O relógio encontrou sinais de fibrilhação"*, três linhas abaixo de imprimir *"Gravado com: BeamO"* | **corrigido** |
| 4 | médio | *"O aparelho da clínica encontrou sinais…"* põe **a clínica** a concluir | **corrigido** — o sujeito é o aparelho, a clínica é **lugar**, noutra linha |
| 5 | médio | um teste activo **exigia** *"watch"*/*"relógio"* do lado do servidor | **corrigido** — mede o que sempre quis medir: o sujeito é o aparelho e não nós |
| 6 | médio | o mapeamento da rota só era testado como texto | **aceite** — a mutação que apaga o campo do `select` mata um teste; um teste de execução da rota fica para a T-10 |
| 7 | médio | `deviceName` entrou no caminho crítico sem `try/catch` | **aceite** — a coluna existe em produção (a rota do PDF já a pedia desde 02/10) |
| 8 | baixo | `deviceName` sem `trim()`: *"O    não assinalou nada"* | **corrigido** |
| 9 | baixo | `lib/patient-report.ts` ainda dizia *"as conclusões do próprio relógio"* | **corrigido** (4 frases) |
| 10 | baixo | `mobile/src/api/wearables.ts` declarava uma forma sem os campos novos | **corrigido** — e o `temTracado` da 119, que estava no mesmo estado |
| 11 | baixo | em pt-BR, *"Chegam do seu aparelho"* lê-se como **o telemóvel** — e afirma que a pessoa tem aparelho | **corrigido** — *"Chegam de um aparelho conectado, ou depois de uma medição na clínica"* |

## Inventário: a conclusão era redigida em cinco sítios

`mobile/src/lib/ecg-lista.ts`, `lib/ecg-record.ts`, `lib/ecg-pdf.ts`, e dois
`? :` soltos em `patient-monitoring-tab.tsx` e `biohacking/page.tsx`. A primeira
versão desta tarefa corrigiu **um**. Agora são os cinco.

## Mutações, segunda rodada

| # | Mutação | Testes mortos |
|---|---|---|
| M18 | o nome do aparelho deixa de ser aparado | 2 |
| M19 | `undefined` volta a valer "na clínica" | 1 |
| M20 | o papel volta a dizer "o relógio" | 1 |
| M21 | o relatório volta a dizer "o relógio" | 1 |
| M22 | o **corpo** do cartão do painel volta a "The watch" | 1 (zero antes da correcção do achado 2) |
| M23 | a fila da clínica volta a "detected by the watch" | 1 |
| — | controlo | 0 |

## O inverso: perdeu-se informação verdadeira?

O QA procurou e encontrou **um** caso: uma gravação feita genuinamente num
ScanWatch cuja linha tem `deviceName = null` passou de *"O relógio encontrou…"*
— que ali era verdade — para *"O aparelho encontrou…"*. Mais vago, nunca falso.

E vale saber: `deviceName` só é escrito no bloco que vai buscar o traçado, logo
as gravações sem traçado e todas as anteriores a 02/10 têm `null`. Na prática o
sujeito genérico é hoje o caso comum, não a excepção.

O que afirmava algo sobre o **pulso** — `wearPosition`, *"Pulso esquerdo"* no
PDF — não foi tocado, e continua a ser o único sítio do produto que o diz.

## O que ainda não é verdade

O binário instalado traz a sua própria cópia das frases. Até sair o `eas update`,
**o paciente continua a ler "O relógio…"** no telemóvel dele. O servidor, o
papel e o painel já estão corrigidos.
