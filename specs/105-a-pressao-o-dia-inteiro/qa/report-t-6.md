# QA — 105 T-6: O estágio não é diagnóstico

**Commit medido:** `697bf0d33` (mais as mudanças não commitadas da 112 T-1, que não tocam pressão)
**Data:** 30/09/2026 · **Veredito:** ⚠️ aprovado com ressalvas → **ressalvas corrigidas no mesmo dia** (ver o fim)
**Ambiente:** local. Web `:4107` (`NEXT_DIST_DIR=.next-qa105t6`), **app do paciente rodando de verdade** em Expo web `:8195`, `OUTBOUND_MODE=sink`. Produção não tocada.
**Evidências:** 13 capturas em `qa/screenshots/`, prefixo `t6-`.

## Resumo

| # | Cenário | Tipo | Res. |
|---|---|---|---|
| V1a/b | App: etiquetas novas por leitura, EN e PT | UI app | ✅ |
| V1c | Frase que nega o diagnóstico **acima da lista**, EN e PT | UI app | ✅ |
| V1d | A mesma frase na **web do paciente** | UI web | ❌ R2 |
| V2a/b | ≥180/120 → *"Very high reading"* + **999** | UI app | ✅ |
| V2c | Banner de crise na web, sem "crise hipertensiva" | UI web | ✅ |
| V3a/b | `/admin/blood-pressure` e aba Pressão do prontuário | UI painel | ✅ |
| V3c | Frase no painel | UI painel | ❌ R3 (importada, não usada) |
| V3d | `/admin/alerts` sem "Hypertensive crisis" | UI painel | ✅ |
| V4 | 145/85, 135/95, 115/95 na mesma faixa no painel e no app | UI ambos | ✅ |
| V4b | A mesma leitura no **alerta** e no **e-mail** | UI+módulo | ❌ **R1** |
| V5 | Corpo do `BP_HIGH_ALERT` sem Stage/Hypertension | API | ✅ |
| V5b | Linha do 999 no corpo, EN e PT | API | ✅ |
| V6 | Normal discreto; alta continua **parecendo** alta | UI | ✅ |
| E1/E2 | Relatório e PDF: não classificam | UI+API | ✅ |
| E3 | Varredura independente no repositório inteiro | estático | ❌ R4 |
| E4 | `a-etiqueta-nao-diagnostica.test.ts` | teste | ✅ 17/17 |

## V1 — App do paciente, as duas línguas ✅

Carregado de verdade, não lido como código:

```
186/122 · Very high — get help now   / Muito alta — procure ajuda agora
115/95  · Well above UK guidance     / Bem acima do parâmetro do NHS
145/85  · Well above UK guidance     / Bem acima do parâmetro do NHS
118/74  · Normal                     / Normal
138/87  · Above UK guidance          / Acima do parâmetro do NHS
120/74  · Elevated                   / Elevada
```

A frase aparece **entre o título da lista e a primeira leitura**. `AVISO_DAS_FAIXAS`
idêntico a `BP_GUIDANCE_NOTE`, e `ROTULOS_DE_PRESSAO` a `BP_LABELS` (medido objeto
a objeto).

## V2 — A urgência não enfraqueceu ✅

186/122 gravado pelo caminho real (POST `/api/patient/blood-pressure`):

> **Very high reading** — Do not wait for your therapist. **Call 999** if you feel unwell, or 111 for urgent advice.

O título deixou de julgar e continuou imperativo.

## V4 — As três leituras ✅

| leitura | app | prontuário |
|---|---|---|
| 145/85 | Well above UK guidance | Well above UK guidance |
| 135/95 | Well above UK guidance | Well above UK guidance |
| 115/95 | Well above UK guidance | Well above UK guidance |

## V6 — O controle contra o eufemismo ✅

Estilos computados dos selos: Normal verde → Elevada âmbar → Acima vermelho
sobre pálido → **Bem acima branco sobre vermelho sólido** → **Muito alta** o
mesmo + caixa de alerta. **A escada sobe.**

## E1/E2 — Relatório e PDF ✅

Nenhum dos dois classifica, por desenho. O gráfico usa corte **nomeado**
(`Alert threshold 130`). PDF de 246.917 bytes sem compressão, lido no bruto: zero
`Stage`/`Hypertens`/`Hipertens`, e os controles positivos presentes
(`Blood pressure`, `Alert threshold`).

---

# As quatro ressalvas, e o que foi feito

## ❌ R1 — Havia um **terceiro** classificador *(o mais grave)* → corrigido

`lib/automation/bp-bands.ts` alimenta o alerta da clínica e o e-mail ao paciente,
e tinha limiares próprios: o "stage 2" dele era o **ponto médio entre o alerta e
a crise daquela clínica** (com os padrões, 155/100). O commit da manhã trocou as
**palavras** dele e deixou a **aritmética**.

```
HIGH  BP_HIGH  30 Sept, 12:33
High blood pressure: 115/95 mmHg
Why it fired → classification: Above UK guidance
```

E a dois cliques dali, no prontuário do mesmo paciente, 115/95 dizia **Bem acima
do parâmetro do NHS**.

**Ficou mais difícil de ver depois da correção**: os dois passaram a falar as
mesmas palavras, então pareciam concordar.

**A causa era de desenho:** a função respondia **duas perguntas** com os mesmos
números — *devo alertar?* (da clínica, e é legítimo que varie) e *como isto se
chama?* (da régua pública, e não varia). Agora o nome vem sempre de
`classifyBP`, e os limiares da clínica decidem só `isAlert`/`isCrisis`.

De lambuja, isto conserta a hipotensão que o QA levantou como fora de escopo:
85/55 saía `"Normal"` no alerta porque estava abaixo do limiar; a régua chama
`Low`.

**Prova:** `__tests__/pressao/o-alerta-chama-a-leitura-pelo-mesmo-nome.test.ts` —
18 leituras, três clínicas com limiares diferentes, e o controle de que mudar o
limiar **muda o alerta e não muda o nome**.

## ❌ R2 — A frase não estava na web do paciente → corrigida

`hasNote: false` no `innerText` inteiro de `/dashboard/blood-pressure`, EN e PT:
a página importava `BP_LABELS` e **não** `BP_GUIDANCE_NOTE`. As etiquetas novas
chegaram; a explicação, não — e é a metade que faz a etiqueta voltar a soar como
veredito.

Ao corrigir apareceu **um quarto classificador**: aquela página tinha os limiares
escritos inline (iguais aos da lib, e por isso invisíveis). Passou a chamar
`classifyBP`; cor e ícone ficaram na tela.

## ❌ R3 — `BP_GUIDANCE_NOTE` importada e não usada no painel → corrigida

| arquivo | importava | usava |
|---|---|---|
| `app/admin/blood-pressure/page.tsx` | sim | **não** |
| `components/admin/blood-pressure-tab.tsx` | sim | **não** |

A frase entrou nos dois. No painel ela fica no cartão que **nomeia as faixas**,
que é onde a explicação delas pertence. A legenda daquele cartão também tinha
`"Low"`, `"Normal"` e `"Elevated"` como texto solto — passaram a vir de
`BP_LABELS`.

## ❌ R4 — A varredura não olhava `scripts/` → corrigida

Um resíduo, exatamente no diretório que o teste não percorria:

```
scripts/test-emails.ts
  114: classification: 'Stage 2 Hypertension'
  118: classification: 'Hipertensão Estágio 2'
```

E não é arquivo morto: **é o único caminho que força `OUTBOUND_MODE=live` e
entrega e-mail real** na caixa do Bruno. O irmão dele — a rota `test-all`, que o
guarda barra — tinha sido corrigido pelo commit. *O que atravessa a porta ficou;
o que é barrado foi arrumado.*

A varredura passou a andar por `scripts` (e o teste ficou vermelho antes de o
script ser consertado, que é o que se quer dela).

## ⚠️ R6 — `{{classification}}` em inglês no e-mail em português → corrigido

`Classificação: Very high — get help now`: a frase traduzida e o valor em inglês.
`notifyPatient` ganhou `emailVarsPt`, que sobrepõe as variáveis quando o paciente
lê em português — mecanismo geral, serve para a próxima.

## ⚠️ R5 — Selo igual para `Bem acima` e `Muito alta` — **não corrigido**

Pré-existente, já levantado em `specs/075-*/qa/revisao-ux-cores.md`. Só a palavra
separa 140/90 de 186/122; a gravidade cresce pela caixa vermelha do cartão. As
etiquetas novas são mais longas no mesmo espaço de 10px, o que enfraquece o único
separador que resta. **Fica para a revisão de cores, com a decisão do Bruno.**

## Notas de ambiente

- Paciente `qa-t6-patient@example.com` (clínica `qa-report-t6`), que já existia —
  **nenhum paciente novo criado**, nenhum paciente real tocado.
- `OUTBOUND_MODE=sink` o tempo todo; confirmado pelas linhas `[OUTBOUND-SINK]` e
  `dropped by the outbound guard`. Nada saiu para pessoa real.
- Porta confirmada pelo *command line* antes de medir: `:4107` é deste worktree;
  `:4000` é do checkout principal e não foi tocado.
- `tsconfig.json` alterado pelo `next dev` e revertido; `.next-qa105t6` removido.
- Erro de console pré-existente e fora de escopo em `/admin/blood-pressure`:
  hidratação do QR code (`Prop 'd' did not match`).

## Depois das correções

- `__tests__/pressao`: **28 testes, 2 suítes** — verdes.
- Suíte completa: **2949 testes, 199 suítes** — verdes.
- `tsc --noEmit` em **0** na web e no mobile.
- Mutação, quatro: o nome voltar a depender do limiar da clínica → caem 3; o
  `classificationFor` ignorar a língua → caem 2; e as duas da varredura de
  cabeçalho da 112.
