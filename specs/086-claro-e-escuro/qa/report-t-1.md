# QA T-1 / T-2 — Claro e escuro

**Data:** 26/09/2026 · **Onde:** Expo web, `localhost:8081`, checkout `clinic/app_clinic/mobile`
(PID 22960 conferido — worktrees disputam porta, e medir o servidor errado já aconteceu aqui)
**Método:** contraste calculado sobre o pixel composto — `getComputedStyle`, achatando cada camada
translúcida até o fundo real. Não é estimativa em cima do token; é a cor que sai na tela.
**Alvo:** 4,5:1 (mínimo WCAG para texto), o mesmo que o claro já cumpria.

## Veredito

**Aprovado.** Os dois tons passam nos dois. Os seis defeitos medidos na primeira volta estão
corrigidos e re-medidos; mais sete do mesmo tipo apareceram na varredura e foram corrigidos junto.

## Os seis defeitos — antes e depois

| # | onde | antes (escuro) | depois (escuro) | claro |
|---|---|---|---|---|
| F-1 | `HeaderBack` — a seta de voltar | **1,10** | 14,1 | 15,5 |
| F-2 | `Avatar` — iniciais sem pilar | **1,10** | 14,13 | 15,54 |
| F-3 | `ProfilePhotoPicker` — ícone da câmera | **1,10** | 14,13 (mesmo par) | 15,54 |
| F-4 | chip de idioma ativo (`login`, `register`) | **1,10** | 14,13 | 15,54 |
| F-5 | `Button` — `danger`/`work`/`health`/`community` | **2,66** | 5,82 · 6,07 · 5,85 · 6,80 | 5,57 · 7,15 · 5,31 · 5,09 |
| F-6 | `SegmentedControl` — selecionado | **1,10** | 10,65 | 15,54 |
| F-6b | `SegmentedControl` — não selecionado | **4,19** | 5,92 | **5,17** (era 4,19) |

F-1 e F-3 não têm tela pública para medir; os dois usam exatamente o par
`primaryFg`/`primary`, medido nos avatares e no botão `primary` da mesma página.

**F-6b reprovava nos dois tons** — `#6A6F79` sobre o trilho bege dava 4,19:1. É a única linha em que
o claro mudou, e mudou para passar.

## Os sete que a varredura achou depois

Mesmo defeito, mesma correção, em telas que a primeira volta não alcançou — todas da clínica:

| onde | o que era |
|---|---|
| `messages.tsx` — bolha da mensagem enviada (4 nós) | branco sobre o verde: a própria mensagem da pessoa |
| `messages.tsx` — hora da mensagem | 75% de branco sobre o verde: **~1,4:1** |
| `blood-pressure.tsx` — tarja de crise e as pastilhas (4 nós) | branco sobre o vermelho clareado |
| `screening.tsx` — visto do consentimento e pastilha de resposta | branco sobre `accent`, que é bone no escuro |
| `wearables.tsx` — três pastilhas | branco sobre `warn`, `health` e `primary` |
| `wearables.tsx` — "Connect" desabilitado | branco sobre `surfaceMuted`: reprovava **no claro** também |
| `(nutricao)/index.tsx` — "Done" da refeição (3 nós) | branco sobre o verde de estado |

## O que mudou na estrutura, e por quê

Nenhum valor novo foi inventado. O que faltava era **o par ter nome**:

- **`accentFg`** — a tinta em cima de um acento. Branco funciona no claro (5,31 no verde) e reprova
  no escuro (2,66). Tinta escura funciona no escuro (5,82–6,80) e reprova no claro (2,17–3,05). O
  valor certo depende do tom, e isso é a definição de token.
- **`accentFgSoft`** — a mesma coisa, apagada, para legenda em cima de acento. `accentFg` sozinho não
  resolvia a hora da mensagem.
- **`segmentTrack` / `segmentThumb`** — dois, porque a relação **se inverte**: no claro o trilho é
  bege recuado e o botão é o card branco; no escuro o trilho é a superfície e o botão é um degrau
  mais claro que ela. É o único jeito de o selecionado parecer levantado sobre fundo escuro.

## Onde branco cravado ficou, de propósito

`FileViewer` e `ExerciseVideo` têm fundo preto nos dois tons; o miniplay dos exercícios fica sobre
`rgba(0,0,0,0.5)` em cima da miniatura. Ali temar seria apagar o texto.

## O que sobrou, e por que não foi mexido

**O card "próxima sessão" da home da clínica** (`app/(app)/(clinica)/(tabs)/index.tsx`) — o card
verde sólido com texto branco, sobrerrótulo `#CBDCD2` e dois botões de véu
`rgba(255,255,255,0.15)`. No escuro o verde clareia e o card inteiro fica ilegível.

Não é troca de token: o sobrerrótulo é um verde pálido escolhido para cima de verde escuro, e o véu
branco assume fundo escuro. Fazer funcionar no escuro **muda a aparência do card no claro**, e o
claro é o que o Bruno já aprovou. É decisão de design, não correção — separado de propósito.

**As telas da BA** — `work.tsx` (9 cores), `community.tsx`, `onboarding.tsx`,
`work/invoice/[id].tsx`. Fora por decisão dele: *"a BA pode deixar fora, com certeza"*.

## Varredura de fecho

Última volta na galeria de componentes, 59 nós de texto medidos em cada tom:

- **claro:** nenhum abaixo de 4,5:1;
- **escuro:** um — `<Card dark>`, 1,10:1. A prop `dark` do `Card` pinta fundo claro no tom escuro e o
  texto em cima dela é branco. Ela é usada em **um** lugar no produto: a home da BA
  (`app/(app)/(ba)/(tabs)/index.tsx:131`), que está fora por decisão do Bruno. Fica anotado aqui
  porque, no dia em que a BA entrar, é por este fio que se começa.

## Evidência

- `specs/086-claro-e-escuro/qa/screenshots/086-escuro-dev-ui.png` — galeria no tom escuro
- `npx jest` — 90 suítes, **1040 testes**, todos passando
- `cd mobile && npx tsc --noEmit` — sem erro
- `__tests__/mobile/tema-claro-escuro.test.ts` — 36 testes, incluindo um que compara o brilho de
  `segmentThumb` com o do trilho: se alguém igualar os dois outra vez, o teste cai antes de a tela
  chegar em alguém.
