# Atividade 115 — A pressão vem do aparelho

**Aberta:** 30/09/2026, a pedido do Bruno.

## O que ele disse

> *"Não é para medir a pressão assim. Agora medir com um medidor de pressão…
> só pelo Withings é que nós vamos medir a pressão, que vai vir um sinal direto
> da API."*

Ele disse isto olhando o cartão de `/admin/blood-pressure`, que anuncia à clínica:

> **Scan to Measure Blood Pressure** — *the patient can measure via **camera
> PPG** (photoplethysmography) or enter readings **manually**.*

## O que o código faz hoje, e a surpresa

A câmera **nunca existiu no app**. `mobile/app/(app)/(clinica)/blood-pressure.tsx`
tem zero referências a PPG, e `mobile/src/api/blood-pressure.ts` manda sempre
`method: "MANUAL"`.

| onde | o quê |
|---|---|
| `app/dashboard/blood-pressure/page.tsx` | a captura de verdade — flash, forma de onda, "estimativa de pressão", arritmia, VFC. 41 referências em 2015 linhas |
| `app/admin/blood-pressure/page.tsx` | o cartão que anuncia a câmera à clínica |
| ficha do paciente e painel | o crachá `PPG` / `Camera` numa leitura antiga |
| `lib/i18n.ts` | ~40 textos, incluindo *"Estimativa de pressão arterial… tudo pela câmera do celular"* |
| `prisma/schema.prisma` | o valor `CAMERA_PPG` no enum |

A Withings entra por outro caminho — `wearables/callback`,
`cron/wearables-sync` e a caixa de medições não atribuídas — e grava
`CLINIC_DEVICE`.

**Então o produto que vai ao ar já não mede por câmera.** O que está errado hoje
é a clínica ver um cartão a vender isso, e o código continuar a prometer
*"estimativa de pressão arterial pela câmera do celular"* — que é exatamente a
frase que empurra o produto para a definição de dispositivo médico, do mesmo
modo que *"Stage 2 hypertension"* empurrava (105 T-6).

## Isto já tinha sido levantado — e por que sobreviveu

O Bruno, em 30/09: *"eu já havia falado isso outras vezes, para tirar qualquer
possibilidade de a gente oferecer medição de pressão pela câmera do celular."*

Fui procurar. O registro mais antigo é a **atividade 006**, sobre a captura no
telefone, onde a linha da pressão por PPG está marcada ❌ com este motivo:

> *"**Clínico/regulatório**: é screening, não medição. Validar com responsável
> clínico/jurídico."*

**A decisão foi tomada e aplicada só ao app.** O app nunca teve a câmera — é por
isso que `mobile/` tem zero referências a PPG. A web do paciente, que já tinha,
ficou; e o painel da clínica continuou a anunciá-la.

Não encontro nenhuma spec onde a remoção da web tenha sido pedida e não feita. O
que houve foi pior de outro jeito: **uma decisão que valeu para a superfície nova
e não voltou para a antiga.** É exatamente o defeito que a regra do Bruno de
30/09 existe para impedir — todo pedido vira spec, senão vive numa conversa e
morre nela.

## O destino: não é só a Withings

> *"Nós vamos vincular APIs de outros fornecedores que, através de medidores de
> pressão, do relógio, do anel, vão trazer essas informações para dentro do nosso
> sistema."*

O caminho é o de **wearables**, no plural. Hoje só a Withings está ligada; os
outros seis provedores estão com `enabled: false`. A pressão é o primeiro dado a
passar por ali de verdade, e a 114 é quem resolve o cano.

A T-4 desta atividade, então, não aponta para um fornecedor — aponta para **o
caminho**: o dado entra pelo aparelho que a pessoa usa, seja ele qual for.

## A decisão

**Confirmado pelo Bruno em 30/09:** fica o caminho dos aparelhos **e** a
digitação manual.

| caminho | quem usa | fica? |
|---|---|---|
| aparelho por API — medidor, relógio, anel | é a medição de verdade | **sim** |
| digitação | o terapeuta na ficha (069) e o paciente no app | **sim** |
| câmera do telefone | ninguém, no app | **sai** |

A digitação fica porque é o que existe quando o aparelho não está por perto — e
é o que a tela da 069 e o formulário do app usam hoje.

## O histórico não se apaga

`CAMERA_PPG` **continua no enum**. Há leituras gravadas com ele, e trocar o valor
delas seria reescrever o que aconteceu — uma leitura medida por câmera não vira
uma leitura medida a dedo porque o produto mudou de ideia.

O que muda é que **nenhum caminho vivo escreve mais esse valor**, e um teste
cobra isso. O crachá continua a saber desenhar o que já está gravado.

## Tarefas

| T-N | nome | status |
|---|---|---|
| T-1 | [O painel deixa de oferecer a câmera](t-1-o-painel-deixa-de-oferecer.md) | pendente |
| T-2 | [A captura sai da web do paciente](t-2-a-captura-sai.md) | pendente |
| T-3 | [Os textos, o crachá e o enum](t-3-os-textos-e-o-enum.md) | pendente |
| T-4 | [O que fica no lugar do cartão](t-4-o-que-fica-no-lugar.md) | pendente |

## Suposições

- **A web do paciente perde acesso no lançamento**, então a T-2 é limpeza de
  código e não correção de uma tela que alguém vai usar. É por isso que ela vem
  **depois** da T-1, que é o que a clínica vê hoje.
- **O QR em si pode ficar.** Ele abre a página de pressão do paciente; o que
  estava errado era o que o cartão prometia lá dentro. A T-4 decide se o QR
  sobrevive sem a promessa — e isso depende de a web do paciente continuar a
  existir, o que ela não vai.
- **A caixa de medições não atribuídas é o caminho real da Withings** quando um
  aparelho serve vários pacientes (a conta tem um perfil só). A T-4 aponta para
  ela em vez de inventar um caminho novo.
- A 114 (*o Withings não traz dado*) é irmã desta: se o sinal não chega, tirar a
  câmera deixa a clínica sem nenhum caminho. **As duas têm de sair juntas.**
