# T-1: O painel deixa de oferecer a câmera

**Status:** pendente
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

- [ ] A tela não oferece medir por câmera em lugar nenhum
- [ ] A lista, a legenda e a frase do NHS continuam onde estavam
- [ ] O teste cai se alguém puser a oferta de volta
