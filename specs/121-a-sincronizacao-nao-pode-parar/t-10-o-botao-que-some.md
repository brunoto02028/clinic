# T-10: O botão que some sem dizer porquê

**Status:** implementado — QA e review pendentes
**Depende de:** T-3

## O estado real, em 03/10/2026

A ligação do aparelho da clínica está em `ERROR` — token morto, à espera de
reautorização. E `clinicDevice()` só devolve ligações `CONNECTED`.

Resultado na ficha do paciente: **nenhum botão, nenhuma palavra.**

```ts
if (!device) return null;
```

O terapeuta chega ao pé do paciente com o aparelho na mão e não tem onde
carregar. A única leitura possível da tela é *"esta clínica não tem aparelho"* —
que é falso, e manda-o procurar o problema no sítio errado.

É a mesma forma de defeito que esta atividade e a 120 combateram, agora do lado
da interface: **uma falha nossa com a cara de uma ausência.**

## E não é cosmético

Sem janela de medição não há atribuição nenhuma: a pressão vai para a caixa de
entrada ou para o dono do aparelho, e o ECG do BeamO não é atribuído a paciente
nenhum. O botão é **a porta inteira do fluxo da clínica** — é o passo 0 do
`o-fluxo-do-beamo.md`.

## A correção

A rota, quando `clinicDevice` devolve `null`, procura uma ligação de clínica em
qualquer estado que não seja `DISCONNECTED` e devolve `deviceParado` com o
estado e se precisa de reconectar. A tela desenha um aviso âmbar com a frase e o
link.

**`DISCONNECTED` fica de fora de propósito**: é alguém a ter desligado o
aparelho, não uma falha — e um aviso ali seria ruído permanente em quem não tem
nada a resolver. Uma clínica que nunca ligou um aparelho continua a não ver nada.

O link vai para `/admin/measurements/inbox`, que é *"o único sítio que o liga"*:
é lá que está o botão de reconectar e o texto que explica o token morto. Um link
para uma página inexistente seria trocar um silêncio por um 404 — e a primeira
versão desta correção apontava para `/admin/settings/wearables`, que não existe.

## Arquivos afetados

- `app/api/admin/measurement-sessions/route.ts` — `deviceParado`
- `components/admin/clinic-measurement-button.tsx` — o aviso, nas duas línguas
- `__tests__/wearables/o-botao-que-some-sem-dizer-porque.test.ts`

## Critérios de aceite

- [x] Ligação em `ERROR` → a tela diz que há aparelho e que precisa reconectar
- [x] Sem aparelho nenhum → continua a não haver nada a dizer
- [x] `DISCONNECTED` não vira alarme
- [x] Aparelho a funcionar → resposta inalterada
- [x] Nenhum token sai na resposta
- [x] Frase em inglês e em português, sem a palavra "diagnóstico"
- [x] O link aponta para uma página que existe
- [ ] QA aprovado
- [ ] Code review feito
