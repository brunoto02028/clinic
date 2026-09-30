# T-1: O painel deixa de oferecer a câmera

**Status:** implementada (30/09) — QA pendente
**Depende de:** nenhuma

## Objetivo

Tirar de `/admin/blood-pressure` o cartão que anuncia a medição por câmera. É o
que o Bruno viu, e é o único lugar onde **a clínica** é convidada a medir assim.

## Contexto

O cartão diz, em inglês, numa tela cujo título está em português:

> **Scan to Measure Blood Pressure** — *the patient can measure via **camera
> PPG** (photoplethysmography) or enter readings **manually**.*
>
> *Note: Camera PPG is for informational purposes only — not a medical device.*

A nota do rodapé já admitia o problema: um recurso que precisa de avisar que não
é dispositivo médico, **para medir pressão arterial**, é um recurso que não devia
estar a ser oferecido.

## Passos

1. Remover o bloco do cartão em `app/admin/blood-pressure/page.tsx` (hoje entre
   `{/* Prominent QR Code Section */}` e o fecho daquele `Card`).
2. Deixar o resto da tela intacto — a lista de pacientes, a legenda das faixas e
   a frase do parâmetro do NHS (105 T-6) ficam.
3. Um teste que cobra a ausência: nenhuma tela do painel oferece medir por
   câmera.

## Arquivos afetados

- `app/admin/blood-pressure/page.tsx`
- um teste novo em `__tests__/pressao/`

## Critérios de aceite

- [x] A tela não oferece medir por câmera em lugar nenhum
- [x] A lista, a legenda e a frase do NHS continuam onde estavam
- [x] O teste cai se alguém puser a oferta de volta

## O que foi feito, e o que apareceu no caminho

O cartão saiu — 2.444 caracteres, e com ele o import órfão do ícone.

**O cartão não era o único lugar.** O diálogo do QR, por paciente, dizia nas
instruções: *"It will open the Blood Pressure page where they can measure using
the camera PPG method or enter readings manually"*, e chamava a página de
*"measurement page"*. Um cartão removido e um diálogo esquecido seria o defeito
de sempre — a lista fechada e o detalhe aberto. As duas frases mudaram.

**E o crachá do histórico falava duas línguas.** Para o mesmo valor gravado,
`/admin/blood-pressure` escrevia `Camera` e a ficha do paciente escrevia `PPG`.
A sigla saiu; ficou `Camera` nas duas. O crachá **continua a desenhar** leituras
antigas — é registro, não convite.

### Provas

`__tests__/pressao/o-painel-nao-oferece-a-camera.test.ts`. A varredura separa as
duas coisas que não podem ser confundidas: **oferecer** medir por câmera (sai) e
**desenhar uma leitura antiga** medida assim (fica). Ela remove o identificador
`CAMERA_PPG` antes de procurar, e só então proíbe o resto.

Por mutação, duas: pôr a oferta de volta → caem 2; "limpar" o crachá do
histórico → cai 1 — o controle contra a limpeza que apaga o passado.

Suíte completa: **2954 testes, 200 suítes**, verdes. `tsc` em 0.
