# QA Report — Atividade 092 (a pressão, a chamada e os ajustes)

**Data:** 27/09/2026
**Resultado:** ⚠️ **aprovado com ressalvas** — 24 passaram, 2 reprovaram, 13 não
executados.

> **Nota de arquivo, honesta:** o agente de QA foi impedido pelo harness de
> gravar este `.md`, e o texto integral do relatório dele ficou na conversa, que
> depois passou por compactação de contexto. O que está aqui é o **veredito e os
> achados**, que ele repetiu no fechamento — não o corpo completo com cada
> comando e saída. As três screenshots estão em `qa/screenshots/`.
>
> A lição de processo fica registrada em
> [[093-a-fatura-do-paciente]] e nas outras: **o relatório tem de ser salvo por
> mim, assim que o agente entrega**, e não no fim da sessão.

## Veredito

- **T-1 (9/9)** e **T-4 (4/4)** passaram inteiras, medidas contra o código
  congelado (rodada de 11:10:31Z, com o sha1 de cada arquivo registrado).
- Duas reprovações, **nenhuma delas regressão desta atividade**.
- Banco de teste limpo e conferido por consulta direta: zero clínicas, usuários,
  conexões, leituras e caixa com o prefixo `qa092`. A pasta `.qa092/` foi
  removida.

## As duas reprovações

**3.1b — o descarte não é registrado em lugar nenhum.** É a T-3 da 092, que está
`pendente`. Não é defeito do que foi entregue; é trabalho que não foi feito
ainda.

**2.5 — 307 para `/login` em vez de 401.** O `middleware.ts` intercepta antes da
rota, e o app recebe um redirecionamento onde esperava um erro em JSON. Achado
novo, e o mesmo padrão do defeito 3.1 da 093: **o middleware decidindo antes de
a rota poder responder**.

## Três achados fora de cenário

1. **O painel diz "a Withings não confirmou" para um manguito que ela
   confirmou.** No BPM Connect o estado `partial` é permanente, e o painel o lê
   como falha. Existe `bloodPressureMissing()` no código, e ela **não é usada
   ali** — a função certa está escrita e não está ligada.
2. **O 307 quebra o `res.json()` de quem chama** — consequência prática do 2.5.
3. **As bolinhas do calendário pioraram no tema claro** (4,93 → 3,16 de
   contraste). Já registrado na memória como *"cor nova: medir a que sai"*, e é a
   razão de a T-4 da 095 começar medindo antes de trocar.

## O que fazer com isto

| achado | destino |
|---|---|
| 3.1b (descarte sem registro) | T-3 da 092, que segue pendente |
| 2.5 + o `res.json()` quebrado | vale uma tarefa própria: o middleware responder **401 em JSON** para caminho de API do app, em vez de 307 para uma tela de login que o app não abre |
| Withings `partial` | ligar `bloodPressureMissing()` onde o painel decide a frase |
| contraste das bolinhas | 095 T-4, junto da cor do "Mark as done" |
