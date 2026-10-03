# T-9: O ECG chega em segundos

**Status:** implementado — QA e review pendentes
**Depende de:** T-7

## O que faltava

Subscrevíamos **quatro** avisos da Withings: peso, pressão, passos e sono. O
**ECG não era um deles**. Uma gravação esperava sempre pela rede de quinze
minutos, enquanto a pressão medida no mesmo aparelho chegava em segundos.

O Bruno, 03/10/2026:

> *"O mais importante é estar sincronizado com o dia atual e hora atual."*

A nossa própria documentação, medida em 02/10, já tinha a tabela completa:

| `appli` | o que é | o que fazemos agora |
|---|---|---|
| `2` | Temperatura | `["vitals"]` — é o que o BeamO acrescenta por um aviso próprio |
| `54` | *"A new ECG recording was completed"* | `["ecg"]` |
| `55` | *"An ECG recording was attempted but failed"* | **nada a buscar** — fica registado |
| `62` | *"New HRV data is available"* | `["vitals"]` |

## O `55` é o que mais me surpreendeu

Não traz dado nenhum. Traz o facto de que o paciente **tentou gravar e não
conseguiu** — que nenhuma consulta de dados revela. Fica como registo de
sistema, e mais nada: mandar seja o que for ao paciente por causa disto seria um
envio automático, que esta base não faz.

E tem de ser tratado **antes** da ingestão: o mapa devolve `undefined` para ele
e o fallback é `["bp"]`, logo cada tentativa falhada mandava-nos pedir pressão à
Withings e escrever uma linha de log a falar de pressão sobre um ECG.

## A lista do alarme não é a lista das subscrições

`WITHINGS_APPLI_WE_WANT` passou de 4 para 8. Se o `deliveryState` continuasse a
medir-se por ela, **toda** a ligação existente apareceria como `partial` entre o
deploy e a próxima reconfirmação — um aviso âmbar a dizer que a Withings não vai
entregar, sobre ligações que entregam tudo o que importa.

É a mesma forma do defeito que o manguito da clínica teve durante semanas: pedir
passos e sono a um aparelho que só mede pressão fazia de `partial` o seu estado
permanente (092).

Por isso há duas listas: `WITHINGS_APPLI_WE_WANT` (o que pedimos) e
`WITHINGS_APPLI_ESSENCIAIS` (o que conta para o alarme — os quatro de sempre).

## Arquivos afetados

- `lib/withings.ts` — `WITHINGS_APPLI`, as duas listas
- `lib/withings-subscriptions.ts` — `deliveryState`, `missingKinds`
- `app/api/wearables/withings/webhook/route.ts` — `KINDS_BY_APPLI`, `SO_NOTIFICACAO`
- `__tests__/wearables/o-ecg-chega-em-segundos.test.ts`

## Critérios de aceite

- [x] `54`, `55`, `62` e `2` subscritos
- [x] `54` → `["ecg"]`; `62` e `2` → `["vitals"]`
- [x] `55` não chega à ingestão e fica registado
- [x] Nada é enviado ao paciente por causa de uma tentativa falhada
- [x] Uma ligação com os quatro essenciais continua `receiving`
- [ ] QA aprovado
- [ ] Code review feito
- [ ] Em produção: a reconfirmação passa a listar os oito
