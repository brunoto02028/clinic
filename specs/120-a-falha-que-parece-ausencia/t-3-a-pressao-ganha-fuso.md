# T-3: A pressão ganha fuso, e deixa de ser a excepção

**Status:** pendente
**Depende de:** nenhuma

## Objetivo

Que uma leitura de pressão caia no mesmo dia que o sono e os vitais da mesma
noite.

## Contexto

Em 02/10 o `VITALS` passou a usar o fuso da própria medição (`diaDaMedicao`), e o
sono e a actividade já usavam o `date` que a Withings manda. **A pressão ficou
sozinha em UTC.**

Concreto: uma leitura às 00:30 de Londres no verão arquiva em `D−1`, enquanto o
sono da mesma noite arquiva em `D`. Dois gráficos lado a lado no mesmo papel, com
a mesma noite em dias diferentes.

Não é de uma linha: `BloodPressureReading` **não tem coluna de fuso**, e
`withingsBloodPressure` descarta o `group.timezone` que vem na mesma resposta do
`getmeas`.

## Passos

1. `prisma/schema.prisma`: `timezone String?` em `BloodPressureReading`,
   documentada — IANA, não offset (suposição 2 do plano).
2. `lib/withings.ts`, `withingsBloodPressure`: deixar de descartar
   `group.timezone`.
3. `lib/withings-ingest.ts`: gravar o fuso na leitura.
4. `lib/patient-monitoring.ts`, `pressaoPorDia`: usar `diaDaMedicao` — a mesma
   função do `VITALS`, não uma segunda cópia da conta.
5. Sem fuso guardado (leituras antigas e digitadas à mão), **mantém-se UTC**: é o
   que elas sempre foram, e reinterpretá-las moveria dados existentes.
6. Apagar a ressalva do comentário do `pressaoPorDia`, que passa a ser falsa.

## Arquivos afetados

- `prisma/schema.prisma`
- `lib/withings.ts`, `lib/withings-ingest.ts`, `lib/patient-monitoring.ts`
- `__tests__/wearables/a-pressao-no-dia-da-medicao.test.ts` (novo)

## Critérios de aceite

- [ ] Leitura às 23:30Z com `timezone: "Europe/London"` cai em `D+1`
- [ ] Leitura sem `timezone` continua a cair no dia UTC — nenhum dado existente
      muda de dia
- [ ] Uma leitura de pressão e um ponto de sono da mesma noite caem no **mesmo**
      dia
- [ ] Confirmar `in sync` no log do contentor depois do deploy
- [ ] Toda escrita nova leva `select`
