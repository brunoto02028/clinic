# T-2: As telas da pressão

**Status:** pendente
**Depende de:** T-1 (a medição) e **115 T-1** (o cartão sai)

## Objetivo

Deixar legível o que sobrar de `/admin/blood-pressure` depois de o cartão do QR
sair, e a aba de pressão da ficha do paciente.

## Contexto

É a tela da captura do Bruno, e é também a tela onde a 105 T-6 acabou de pôr
texto novo — a frase do parâmetro do NHS e a legenda das faixas. Esse texto novo
entrou com `text-muted-foreground` sobre fundos crus: **a correção de vocabulário
pode ter nascido ilegível**, e isso é para medir, não para supor.

As quinze classes cruas da tela, hoje:

| classe | quantas | onde tipicamente |
|---|---|---|
| `bg-amber-50` | 6 | notas e avisos |
| `bg-red-50` | 3 | faixas altas |
| `bg-orange-50` | 2 | faixa `Above UK guidance` |
| `bg-emerald-50` | 2 | faixa `Normal` |
| `bg-blue-50` | 1 | faixa `Low` |
| `bg-red-600` | 1 | um selo cheio |

A legenda das faixas é o caso mais delicado: **as cores ali carregam
significado** — a escada tem de continuar a subir, como o QA da 105 T-6 mediu no
app. Trocar por token sem medir pode achatar a escada e desfazer o controle
contra o eufemismo.

## Passos

1. Medir os pares de hoje (vem da T-1).
2. Trocar por token, faixa a faixa, mantendo a ordem de gravidade visível.
3. Medir de novo, e mostrar os dois números.
4. A aba de pressão da ficha, com o mesmo critério.

## Arquivos afetados

- `app/admin/blood-pressure/page.tsx`
- `components/admin/blood-pressure-tab.tsx`

## Critérios de aceite

- [ ] Todo par de fundo e texto medido, antes e depois
- [ ] Nenhum par abaixo de 4,5:1 no texto corrido
- [ ] A escada de gravidade continua a subir — medida, não olhada
- [ ] A frase do NHS e a legenda legíveis nas duas línguas
