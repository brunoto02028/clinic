# T-2: As telas da pressão

**Status:** ✅ concluída (30/09) — e o conserto foi outro
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

---

# O conserto não foi o que a tarefa previa

A tarefa dizia para trocar as quinze classes cruas desta tela por token. **A
medição disse que não era ali.** As classes cruas da legenda vêm em pares —
fundo claro com texto escuro da mesma cor — e dão 4,84 a 6,16.

O que falhava era o **musgo da marca usado como texto** sobre o painel escuro:
2,78 nas iniciais dos pacientes, 3,04 nos rótulos, 2,95 no diálogo.

## E o token já existia

`--accent-bright`, com o porquê escrito ao lado por quem o criou:

> *"Brighter moss for text/active-state roles on a dark surface — `--primary`
> itself (38% L) fails WCAG AA as text color here (~3:1); this clears 8:1+"*

Alguém diagnosticou isto, criou a variável, escreveu a razão — e as **382**
chamadas do painel continuaram em `text-primary`. Duas telas em todo o
repositório usavam o token.

## Uma regra, e não 382 trocas

```css
.text-primary { color: hsl(var(--accent-bright)); }
```

Segura nos dois lados porque `.public-site` redefine `--accent-bright` para o
valor do próprio `--primary`: na área clara, onde o musgo escuro já lê bem, nada
muda. E **só a cor do texto** — fundo e borda continuam com a marca, porque ali
ela é superfície e não letra.

Conferi antes de a escrever: das 382 ocorrências no painel, **zero** partilham o
`className` com um fundo claro cru. A troca não escurece caixa nenhuma.

## Medido, e não anunciado

| | antes | depois |
|---|---|---|
| elementos abaixo do mínimo | **29** de 72 | **7** de 72 |
| `.text-primary` no cartão | 3,04 | **7,05** |

O que sobra é um par só: cinza a **45% de alfa** sobre o fundo, a 3,81 — sete
ocorrências, rótulos de aba. Fica para a T-3, com o número já medido.

Esta casa lembra-se de porquê medir: já troquei 4,9 por 3,2 anunciando que
estava a melhorar.
