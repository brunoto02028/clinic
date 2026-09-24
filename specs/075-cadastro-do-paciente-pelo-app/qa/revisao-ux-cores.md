# Revisão de UX e de cor — app do paciente

**Data:** 24/09/2026
**Escopo:** `mobile/` (app do paciente, Expo/React Native), paleta BA One pilar Health.
**Restrição respeitada:** nenhuma proposta troca a paleta. Todas as correções usam tokens que já existem em `src/theme/tokens.ts` / `src/theme/index.ts`. As três exceções que pedem alterar um token estão marcadas como **EXCEÇÃO** e vêm com o número que as justifica.
**Nenhum arquivo foi alterado.**

Método dos números: razão de contraste WCAG 2.1 (SC 1.4.3 texto, 1.4.11 não-texto). Simulação de daltonismo pelo modelo LMS de Viénot/Brettel, com distância ΔE (CIE76) entre as cores simuladas.

---

## Sumário: o que está bom

Antes dos problemas, o que não precisa mexer:

- **A paleta em si não é o problema.** `ink` sobre `bone` dá **14,13:1**; sobre `card` branco, **15,54:1**. `textSecondary #4A4F59` dá **7,48:1** sobre bone e **8,22:1** sobre branco. O par principal de botão, `greigeFg #26221C` sobre `greige #CDC7BE`, dá **9,42:1** — e **8,04:1** no estado pressionado. Esses quatro pares cobrem a maior parte do texto do app e passam com folga.
- Os botões coloridos passam AA com texto branco: `work` **7,15:1**, `ok` **5,43:1**, `health` **5,31:1**, `bad` **4,97:1**, `warn` **4,85:1**.
- O `NonEmergencyNotice` (`mobile/src/components/NonEmergencyNotice.tsx`) está **certo na decisão de cor**: ele é deliberadamente neutro (`surfaceMuted` + `border` + ícone `textMuted`). Um aviso de "isto não é emergência" pintado de vermelho competiria com os alertas reais. A decisão está certa; só o tamanho de fonte (10,5px) está errado — ver §3.
- A faixa de classificação de PA **tem rótulo em texto** ("Normal", "Elevada", "Estágio 1"…) ao lado da cor. Isso é o que impede o problema de daltonismo de virar um defeito grave nessa tela específica. Manter essa regra.
- `Card variant="highlight"` e `variant="elevated"` já existem e já usam `health` como borda — a ferramenta para dar peso a um card está pronta; só não é usada onde mais importa (§1.4).

---

## 1. COR COM SIGNIFICADO CLÍNICO

Ordenado por dano ao paciente.

### 1.1 🔴 A faixa `LOW` (hipotensão) não existe no app — e a web tem

| | web | app |
|---|---|---|
| arquivo | `lib/blood-pressure.ts:11-18` | `mobile/src/api/blood-pressure.ts:62-68` |
| 85/55 mmHg | `LOW` (azul, `components/admin/blood-pressure-tab.tsx:67`) | **`normal`** → `ok` verde |

`bpBand()` só desce até `return "normal"`. Uma leitura de **85/55** — hipotensão, em paciente pós-cirúrgico ou em anti-hipertensivo, com risco real de queda — aparece no app com o selo **verde "Normal"**. O `classifyBP()` da web, no mesmo dado, devolve `LOW`.

O comentário em `blood-pressure.ts:55-60` diz que o band foi mantido em passo com a rota do servidor "deliberadamente… uma tela que chamasse uma leitura de normal enquanto o servidor manda alerta seria pior que não mostrar nada". A intenção está certa e o bug é exatamente esse: as duas classificações divergiram.

**Correção:** acrescentar `low` a `BpBand` com o mesmo limiar da web (`systolic < 90 || diastolic < 60`) e mapeá-la em `blood-pressure.tsx:67` para `{ color: t.colors.work, bg: t.colors.workSoft }` — `work #46587A` é o azul da paleta, é o que a web já usa para LOW, e dá **6,26:1** sobre `workSoft`, o melhor par de estado do sistema. Azul aqui significa "fora da faixa, mas não é a via do vermelho" — que é a leitura clínica correta da hipotensão.

---

### 1.2 🔴 Cinco faixas, três cores: crise se parece com estágio 2

`mobile/app/(app)/(clinica)/blood-pressure.tsx:67-71`

```
normal   → ok / okSoft
elevated → warn / warnSoft   ┐ idênticas
stage1   → warn / warnSoft   ┘
stage2   → bad / badSoft     ┐ idênticas
crisis   → bad / badSoft     ┘
```

**180/120 (crise hipertensiva, emergência médica) é pixel a pixel igual a 140/90 (estágio 2, rotina de acompanhamento).** A única diferença é a palavra dentro do selo, renderizada a **10px** (`blood-pressure.tsx:142` e `:246`). A gravidade não cresce com a intensidade da cor: ela é uma escada de três degraus com dois degraus duplicados.

Comparação com a web, que acerta: `components/admin/blood-pressure-tab.tsx:71-72` separa `STAGE2` (`red-500`) de `CRISIS` (`red-700`), e `app/dashboard/blood-pressure/page.tsx:1705` ainda mostra um banner explícito — *"⚠️ CRISE HIPERTENSIVA — Procure atendimento médico IMEDIATAMENTE"*. **O app do paciente dá a mesma informação num selo de 10px.**

**Correção dentro da paleta:**
- `elevated` → `warnSoft` de fundo com texto `ink` (13,21:1), sem borda.
- `stage1` → `warnSoft` + borda `warn` de 1px. (O degrau passa a ser "tem borda", não uma cor nova.)
- `stage2` → `badSoft` + borda `bad`.
- `crisis` → inverter: fundo `bad` sólido com texto `#FFFFFF` (**4,97:1**), que é o único nível do app com preenchimento sólido. Inverter figura/fundo dá um salto de luminância que nenhuma variação de matiz consegue, e funciona em qualquer tipo de daltonismo.
- Além do selo, `crisis` deveria disparar o mesmo bloco de texto da web, no mesmo componente do `ExerciseBlockCard`. Hoje não dispara nada.

---

### 1.3 🔴 `bad` não comunica perigo — e os três estados são indistinguíveis sob daltonismo

Os números, que é o que foi pedido.

**Contraste entre os três estados (o quanto eles se separam por luminância):**

| par | razão |
|---|---|
| `warn #8A6D3B` vs `bad #A85A4B` | **1,02:1** |
| `ok #55705F` vs `bad #A85A4B` | **1,09:1** |
| `ok` vs `warn` | **1,12:1** |
| `okSoft` vs `warnSoft` | **1,00:1** |
| `warnSoft` vs `badSoft` | **1,05:1** |

Os três estados têm **a mesma luminância**. Só se distinguem por matiz. Isso é a definição de um sistema de cor que falha em daltonismo — e também numa tela com brilho baixo, ao sol, ou em olho de catarata (que é frequente em 50+ e reduz justamente discriminação de matiz).

**Simulação de daltonismo (ΔE CIE76; abaixo de ~10 é praticamente a mesma cor):**

| par | normal | deuteranopia | protanopia |
|---|---|---|---|
| `ok` vs `warn` | 32,1 | 29,5 | 22,7 |
| `warn` vs `bad` | 26,8 | **6,6** 🔴 | 15,4 |
| `ok` vs `bad` | 47,2 | 23,3 | **8,2** 🔴 |
| `okSoft` vs `badSoft` | 8,5 | **3,3** 🔴 | **2,7** 🔴 |
| `warnSoft` vs `badSoft` | 6,7 | **4,4** 🔴 | **5,6** 🔴 |

Traduzindo:
- **Deuteranopia:** `warn` vira `#767639` e `bad` vira `#787847`. "Estágio 1" e "Estágio 2/Crise" são a mesma cor.
- **Protanopia:** `ok` vira `#6D6D5F` e `bad` vira `#67674C`. **"Normal" e "Crise" são a mesma cor.**
- Os fundos `*Soft` já são quase idênticos entre si **para quem enxerga normalmente** (ΔE 6,7 a 8,5). Sob daltonismo caem para 2,7–4,4, abaixo do limiar de percepção.

**Resposta direta à pergunta "`bad` comunica perigo com força suficiente?": não.** Ele tem a mesma luminância do `warn` (1,02:1), é quase terracota, e sob protanopia se confunde com o verde de "normal". Como cor de marca ele é correto; como sinal de alerta clínico, ele não carrega a informação sozinho.

**Correções, em ordem de preferência:**

1. **Nunca deixar a cor ser o único sinal.** Na tela de PA isso já é feito (há rótulo textual) — manter. Onde a cor está sozinha, adicionar forma/ícone/preenchimento: ver §1.2 (crisis com fundo sólido), §1.5 (pontos do histórico).
2. **Separar por luminância, não por matiz.** É o que a inversão figura/fundo do §1.2 faz, e não muda nenhum token.
3. **EXCEÇÃO justificada, se quiserem separar `warn` de `bad` também no texto:** hoje `bad` sobre `badSoft` dá **4,02:1** — falha AA para texto normal, e é assim que o selo de "Crise" e a mensagem de erro do login são renderizados. Escurecer `bad #A85A4B → #9C5446` (93% do brilho) leva a **4,51:1** sobre `badSoft` e **5,57:1** sobre `card`. Um escurecimento de 7% é imperceptível ao lado da cor original e não altera o matiz — a identidade continua a mesma. Mesma conta para `warn #8A6D3B → #826637` (94%, dá **4,57:1**) e `community #A87438 → #926531` (87%, dá **4,53:1**). `ok` já passa (4,60:1) e não precisa mexer.

---

### 1.4 🔴 O card mais grave do app não tem peso nenhum

`mobile/src/components/ExerciseBlockCard.tsx:27-60`

É o card que diz **"Hoje não vamos treinar"** porque a pressão está acima do limite de liberação. Ele é renderizado como um `<Card>` **padrão**: fundo `card` branco, borda `line #E4E3DF` (**1,28:1** contra o branco — invisível), exatamente igual ao card de cada exercício da lista logo abaixo. A única marca de gravidade é o título em `variant="label"` (12px) na cor `danger`, e o corpo em `variant="body"` = **11,5px**.

O comentário do próprio arquivo (linhas 13-14) diz: *"uma tela travada sem motivo é lida como bug, e aí o paciente treina assim mesmo"*. A explicação está lá — o que não está é o peso visual que faz alguém parar e ler.

**Correção:** `<Card variant="elevated">` com `style={{ backgroundColor: t.colors.badSoft, borderColor: t.colors.bad }}`. O `variant="elevated"` já existe e já eleva a sombra. `ink` sobre `badSoft` dá **12,59:1** para o corpo do texto. Subir o título de `label` para `subtitle` (17px) e o corpo de `body` para pelo menos 15px.

Segundo ponto, de hierarquia: o botão de recuperação ("Registrar nova medida", `:56`) é `variant="greige"`. O `greige #CDC7BE` sobre um fundo `badSoft` seria a ação mais importante da tela pintada na cor mais apagada do sistema. Usar `variant="danger"` (fundo `bad` sólido, branco a 4,97:1) ou `variant="primary"` (ink, 15,54:1).

---

### 1.5 🟠 A escala de dor é verde no pior valor

**VAS — `mobile/app/(app)/(clinica)/outcome-measures.tsx:130`**

```
backgroundColor: v === vasScore ? t.colors.okSoft : "transparent"
color={v === vasScore ? t.colors.ok : t.colors.textMuted}
```

O número selecionado na escala 0–10 sempre fica em **verde `ok`/`okSoft`**. A legenda logo acima (`:106`) diz *"10 = Pior dor imaginável"*. Escolher 10 pinta o 10 de verde.

Pior: **na mesma tela, a 20px de distância, a mesma informação usa a regra certa.** `outcome-measures.tsx:114` e `:124` colorem o número grande e a barra com `vasScore > 6 ? bad : vasScore > 3 ? warn : ok`. Duas gramáticas de cor para o mesmo dado, lado a lado, contradizendo-se.

**Correção:** aplicar em `:130` a mesma expressão de `:114`.

**Funcionalidade geral — `outcome-measures.tsx:152, 160, 168`**

`color={t.colors.ok}` e `backgroundColor: t.colors.ok` fixos. **0% — cuja legenda em `:147` é "Incapacidade total" — é mostrado em verde.** Mesma correção invertida: `overallFunction < 40 ? bad : < 70 ? warn : ok`.

**Check-in diário — `mobile/app/(app)/(clinica)/daily-checkin.tsx:186-187`**

```
<SliderRow label="Dor"     color={t.colors.bad} />
<SliderRow label="Energia" color={t.colors.warn} />
```

A cor é do *rótulo*, não do *valor*. Dor **0** (que é a boa notícia que o paciente queria dar) aparece no vermelho de perigo; energia **10** aparece no âmbar de alerta. Em `SliderRow` (`:33` e `:38`) essa cor pinta tanto o número quanto o degrau selecionado.

**Correção:** passar a cor em função do valor, como o VAS faz. Para "Dor", `pain > 6 ? bad : pain > 3 ? warn : ok`. Para "Energia" e "Qualidade do sono", a escala é invertida — usar `health` como cor neutra de seleção e deixar a cor de estado fora, já que não há um limiar clínico.

**Contraste associado:** o degrau selecionado usa texto `primaryFg` branco a 10px sobre a cor. Para o slider "Estresse" (`:189`, `community #A87438`) isso dá **4,02:1** — falha AA para texto normal. Os não selecionados usam `textMuted #767B85` sobre `surfaceMuted #EBEAE6` = **3,53:1**, também falha. Trocar os não selecionados por `textSecondary #4A4F59` → **6,83:1**.

---

### 1.6 🟠 `bad` e `warn` usados como decoração, o que gasta o sinal

Um token de perigo que aparece em contextos sem perigo deixa de significar perigo. Casos concretos:

| arquivo:linha | uso | problema |
|---|---|---|
| `app/(app)/(clinica)/exercise/[id].tsx:190-204` | botão **"Assistir vídeo"** com fundo `badSoft` e ícone play em `bad` | o CTA mais convidativo da tela do exercício está pintado de alerta |
| `app/(app)/(clinica)/education/[id].tsx:84-86` | idem, "Assistir vídeo" em `badSoft`/`bad` | mesmo problema, repetido |
| `app/(app)/(clinica)/guide.tsx:78` | ícone de **"Comunicação direta"** em `bad` | canal de conversa com o terapeuta em cor de perigo |
| `app/(app)/(clinica)/exercise/[id].tsx:28-30` | dificuldade `EASY/MEDIUM/HARD` → `ok/warn/bad` | "Avançado" não é um risco clínico; usar os estados para dificuldade dilui o vermelho |
| `app/(app)/(clinica)/documents.tsx:59-62` | `MEDICAL_REPORT`→`ok`, `PRESCRIPTION`→`ok`, `IMAGING`→`warn` | tipo de documento não tem gravidade; um exame de imagem marcado em âmbar sugere que há algo de errado com ele |
| `app/(app)/(clinica)/guide.tsx:52,65,76,77` | passos do guia coloridos com `warn`/`ok` | são etapas, não estados |
| `app/(app)/(clinica)/daily-checkin.tsx:177` | `{progress.xp} XP` na cor `warn` | gamificação em cor de alerta |
| `app/(app)/(clinica)/education/[id].tsx:109` | estrelas de avaliação em `warn` | idem |

**Correção:** tudo que é **categoria, etapa ou decoração** deve usar os pilares (`health` / `work` / `community`) ou `ink`/`textSecondary`, nunca `ok`/`warn`/`bad`. Os três estados ficam reservados para: classificação de PA, bloqueio de exercício, erro de operação e prazo vencido. Especificamente:
- Vídeo (ambos os arquivos) → `healthSoft` + ícone `health` (**5,31:1**), que é o pilar da clínica e é o que o resto do app já usa para ação de saúde.
- Dificuldade → `healthSoft`/`health` com o rótulo textual carregando a diferença, ou `workSoft`/`work` para HARD.
- Categorias de documento → `work`/`health`/`community`, que é para isso que os pilares existem.
- Estrelas e XP → `community #A87438` (o âmbar da marca, sem carga de alerta).

Regra geral que resolve os oito de uma vez: **`ok`/`warn`/`bad` só entram onde um clínico interpretaria o dado.**

---

### 1.7 🟡 Pontos do histórico: cor como único sinal — mas já corrigido por acaso

`daily-checkin.tsx:66-78`. Os pontos dos últimos 7 dias usam `okSoft`+`ok` vs `warnSoft`+`warn`, que sob deuteranopia ficam a ΔE 7,2 (indistinguíveis). **Mas** cada ponto tem um ícone dentro — `checkmark` vs `remove` (`:76-77`) — e há legenda textual embaixo (`:233-241`). O sinal não é só cor. **Está correto como está**; registrado só para que o padrão seja mantido ao alterar essa tela.

---

## 2. CONTRASTE — todos os pares que falham

Calculado sobre os pares que o app realmente usa. AA normal = 4,5:1; AA grande/elemento de interface = 3:1.

### 2.1 Texto abaixo de 4,5:1

| # | par (fg sobre bg) | razão | onde | correção |
|---|---|---|---|---|
| 1 | `#9AA0AC` sobre `#FFFFFF` | **2,63:1** 🔴 | `tabBarInactiveTintColor` — `(clinica)/(tabs)/_layout.tsx:15`. **Falha até o mínimo de 3:1 de elemento de interface.** É o rótulo das abas do app inteiro, a 8,5px | `textMuted #767B85` = 4,25:1, ou melhor `textSecondary #4A4F59` = **8,22:1** |
| 2 | `#9AA0AC` sobre `#F0EFEB` | **2,28:1** 🔴 | `Pill` variante `muted` — `src/components/ui/Pill.tsx:22`, texto a **9px**. O pior par do app | `textSecondary #4A4F59` sobre `#F0EFEB` = **7,15:1** |
| 3 | `muted #767B85` sobre `bone #F5F4F1` | **3,86:1** | `textMuted` — usado em praticamente toda tela (258 nós `variant="caption"`) | ver §2.2 |
| 4 | `muted #767B85` sobre `card #FFFFFF` | **4,25:1** | idem, dentro de `Card` | ver §2.2 |
| 5 | `muted #767B85` sobre `surfaceMuted #EBEAE6` | **3,53:1** | números não selecionados do slider — `daily-checkin.tsx:39`, a 10px | `textSecondary` = 6,83:1 |
| 6 | `muted #767B85` sobre `badSoft #F4E4E0` | **3,44:1** | `ExerciseBlockCard.tsx:47` — a linha que diz "com dor no peito, falta de ar ou tontura, ligue para a emergência" | `ink` sobre `badSoft` = **12,59:1** |
| 7 | `bad #A85A4B` sobre `badSoft #F4E4E0` | **4,02:1** | selo "Crise" (`blood-pressure.tsx:142,246`, 10px), erro de login (`login.tsx:87`), erro de cadastro (`register.tsx:227`) | `ink` sobre `badSoft` = 12,59:1, ou §1.3 exceção 3 |
| 8 | `warn #8A6D3B` sobre `warnSoft #F3ECDD` | **4,12:1** | selos "Elevada"/"Estágio 1", badge de pendentes (`tasks.tsx:47`), `Pill` warn | `ink` sobre `warnSoft` = 13,21:1 |
| 9 | `community #A87438` sobre `communitySoft #F7F1E7` | **3,58:1** | `Pill` community (`Pill.tsx:20`), `Avatar` pilar community | `ink` sobre `communitySoft` = 13,83:1 |
| 10 | `#FFFFFF` sobre `community #A87438` | **4,02:1** | `Button variant="community"` e slider "Estresse" a 10px (`daily-checkin.tsx:39,189`) | §1.3 exceção 3 → `#926531` dá 5,09:1 |
| 11 | `#6A6F79` sobre `#EBEAE6` | **4,19:1** | segmento inativo — `src/components/ui/SegmentedControl.tsx:57`, a 11px | `textSecondary #4A4F59` = 6,83:1 |
| 12 | `warn #8A6D3B` sobre `bone #F5F4F1` | **4,41:1** | texto `warn` em fundo de tela | `ink`, ou §1.3 exceção 3 |

### 2.2 Sobre o `muted #767B85` — o caso mais importante da lista

O pedido citou este par nominalmente, e ele merece a resposta separada.

- sobre `bone`: **3,86:1** — falha
- sobre `card`: **4,25:1** — falha por pouco
- sobre `surfaceMuted`: **3,53:1** — falha

Ele é `textMuted` em `theme/index.ts:52` e aparece em **258 nós `variant="caption"`**, quase sempre a **10,5px**. Ou seja: o cinza que falha AA é também o menor tamanho do app. As duas falhas se somam no mesmo texto.

**A correção não precisa de token novo:** `textSecondary #4A4F59` já existe em `theme/index.ts:50`, já é usado, e dá **7,48:1 / 8,22:1 / 6,83:1** nos mesmos três fundos. Recomendação: **aposentar `textMuted` de tudo que é texto** e mantê-lo apenas para ícones decorativos e placeholders (onde 3:1 basta). `muted #767B85` continua na paleta — só deixa de ser cor de texto.

Se preferirem manter um terceiro nível de cinza, é uma **EXCEÇÃO** defensável: `muted` é o único token da paleta que falha contraste mesmo bem usado, porque a 3,86:1 sobre bone ele já nasce fora da norma. Não existe posicionamento sobre fundo claro em que ele passe.

### 2.3 Não-texto abaixo de 3:1 (SC 1.4.11)

| par | razão | onde | nota |
|---|---|---|---|
| `line #E4E3DF` sobre `card #FFFFFF` | **1,28:1** | borda padrão de todo `Card` (`Card.tsx:45`) e borda superior da tab bar (`_layout.tsx:17`) | a borda é decorativa, não delimita controle — aceitável, mas explica por que o `ExerciseBlockCard` desaparece (§1.4) |
| `line #E4E3DF` sobre `bone #F5F4F1` | **1,17:1** | mesma borda sobre fundo de tela | idem |
| `greige #CDC7BE` sobre `bone #F5F4F1` | **1,53:1** 🔴 | **o botão principal do app** — `Button variant="greige"` é o default (`Button.tsx:20`), 65 chamadas sem variante | ver abaixo |
| `greige` sobre `card #FFFFFF` | **1,68:1** 🔴 | mesmo botão dentro de `Card` | ver abaixo |
| `healthSoft` / `okSoft` / `warnSoft` / `badSoft` sobre `bone` | **1,02 / 1,07 / 1,07 / 1,12:1** | todos os fundos `*Soft` como superfície | são fundos de selo com texto dentro, não controles — ok |

**Sobre o `greige`:** o *texto* do botão está impecável (9,42:1). O que falha é a **borda do botão contra o fundo**: a 1,53:1 o contorno do controle é praticamente invisível, e o que o paciente enxerga é uma mancha um pouco mais escura. Para um usuário de 60 anos, "onde exatamente eu aperto" fica ambíguo. Isto é 1.4.11, não 1.4.3.

**Correção dentro da paleta:** dar ao `variant="greige"` uma borda `greigePress #BFB8AD` de 1px — `greigePress` sobre `bone` dá 1,85:1, ainda pouco. Melhor: usar `border: t.colors.border` não resolve (é mais claro ainda). A saída limpa é **reservar `greige` para ação secundária e usar `primary` (ink, 15,54:1) ou `health` (5,31:1) para a ação principal de cada tela** — que é o que §4.1 recomenda por outra razão.

### 2.4 Tema escuro

**Não existe.** `theme/index.ts:88` exporta `themes = { light }`; `theme/useTheme.ts:24` devolve `themes.light` fixo e `scheme: "light"` fixo. Não há `useColorScheme` em lugar nenhum do app.

Mas `mobile/app.json:12` declara **`"userInterfaceStyle": "automatic"`**. Isso é uma contradição com efeito visível: num aparelho em modo escuro, o iOS escurece splash, teclado, `Alert.alert` nativo, action sheets e o picker de imagem — enquanto o app permanece `bone`. O paciente vê a interface piscar entre claro e escuro a cada diálogo. E `app/_layout.tsx:83` fixa `<StatusBar style="dark" />`, que fica errado se alguma superfície nativa escurecer.

**Correção (uma linha, sem tocar na paleta):** `"userInterfaceStyle": "light"` em `app.json:12`. Se um dia quiserem tema escuro de verdade, aí sim é trabalho de paleta — e vale notar que `ink #20242D` como fundo com `bone #F5F4F1` de texto daria **14,13:1**, ou seja, a paleta suporta, só não foi construída.

---

## 3. LEGIBILIDADE E ALVO DE TOQUE

### 3.1 🔴 Duas escalas tipográficas, e a que vale é a pequena

`src/theme/tokens.ts:64-73` define `fontSize` com `xs: 9.5` e `sm: 11`. **Esses tokens têm 0 referências em todo o app** — estão mortos. Quem manda é o mapa interno de `src/components/ui/Text.tsx:12-21`, que tem números *diferentes*:

| variante | px | uso |
|---|---|---|
| `eyebrow` | **9,5** | 12 |
| `caption` | **10,5** | **258** |
| `body` | **11,5** | 97 explícitos + 54 `<Text>` sem variante (é o default, `Text.tsx:39`) |
| `label` | **12** | 112 |
| `heading` | 14,5 | 8 |
| `subtitle` | 17 | 50 |
| `title` | 19 | 23 |
| `hero` | 30 | 12 |

Somando: **≈438 de 655 nós de texto (67%) estão abaixo de 12px.**

**Respondendo direto: 9,5px não é legível para um paciente de 60 anos.** A referência prática é a HIG da Apple, que fixa 11pt como o *mínimo absoluto* e 17pt como o corpo de texto padrão. O corpo de texto deste app é 11,5px — **um terço do recomendado**, num produto cujo público tem presbiopia por definição etária.

Agravante: **`allowFontScaling` nunca é desabilitado (0 ocorrências), o que é bom** — o Dynamic Type do sistema funciona. Mas a base é tão baixa que o paciente precisa subir o sistema inteiro para conseguir ler este app.

**Onde isso vira problema clínico** (amostra, não lista completa):

| arquivo:linha | px | conteúdo |
|---|---|---|
| `(clinica)/treatment-protocol.tsx:153,156` | **10,5** | **"Cuidados" + o texto de precaução** — "pare qualquer movimento que reproduza dor aguda". O aviso de segurança mais explícito do app |
| `(clinica)/screening.tsx:403` | **11,5** | **o texto de consentimento informado** que o paciente aceita |
| `(clinica)/screening.tsx:407-411` | **10,5** | "N perguntas de segurança ainda não foram respondidas" |
| `(clinica)/blood-pressure.tsx:142,246` | **10** | a classificação da pressão — enquanto o número em si tem 34px (`:132`) |
| `(clinica)/outcome-measures.tsx:106,147` | **10,5** | "0 = Sem dor, 10 = Pior dor imaginável" / "0% = Incapacidade total" |
| `(clinica)/treatment-protocol.tsx:180` | **10,5** | `{sets}x{reps} · {frequency}` — a **dose prescrita** |
| `(clinica)/exercise/[id].tsx:134,148,162,176` | **10,5** | rótulos "Séries"/"Repetições"/"Sustentar" — os numerais acima têm 24px, e a unidade que lhes dá sentido tem 10,5 |
| `(clinica)/exercise/[id].tsx:236` | **11,5** | **as instruções de execução do exercício** |
| `(clinica)/exercise/[id].tsx:265` | **11,5** | a nota do terapeuta |
| `src/components/NonEmergencyNotice.tsx:50,53` | **10,5** | "Isto não é um serviço de emergência" + a lista de sintomas |
| `src/components/ui/Pill.tsx:38` | **9** | todo selo de status do app |
| `(clinica)/(tabs)/_layout.tsx:26` | **8,5** | **os rótulos das abas** — menor que o próprio `fontSize.xs` |

**Correção:** subir a escala do `Text.tsx` inteira, mantendo as proporções: `caption 10,5→13`, `body 11,5→15`, `label 12→15`, `heading 14,5→17`. `fontSize.md: 13` e `fontSize.lg: 15` já existem nos tokens e são exatamente esses valores — a escala pretendida está escrita, só nunca foi ligada. E alinhar `Text.tsx` aos tokens, para não haver duas verdades. Para as abas, `tabBarLabelStyle.fontSize: 8.5 → 11` (mínimo da HIG).

### 3.2 🔴 Alvos de toque abaixo de 44×44

`hitSlop` aparece **4 vezes em 220 `Pressable`/`TouchableOpacity`** do app, e as quatro estão no módulo `(ba)` (comunidade/trabalho). **Zero `hitSlop` em `(clinica)`.** Não existe `minHeight: 44` em lugar nenhum do código.

**Entradas clínicas — os piores:**

| arquivo:linha | caixa | conteúdo |
|---|---|---|
| `(clinica)/outcome-measures.tsx:126-134` | **24 × 24** 🔴 | **A escala VAS de dor, 0–10.** Onze alvos de 24pt com `justifyContent: "space-between"` (sem folga para absorver o erro). Pior: é um `<View onTouchEnd>`, não um `Pressable` — sem feedback de toque, sem `accessibilityRole`, e `onTouchEnd` dispara mesmo num gesto que virou scroll. Um paciente com tremor ou com dor na mão registra a dor errada |
| `(clinica)/outcome-measures.tsx:164-172` | ~34 × 25 | Funcionalidade geral (0/25/50/75/100%) — mesmo `<View onTouchEnd>` |
| `(clinica)/daily-checkin.tsx:37-41` | ~27 × **32** | **Slider de dor/energia/sono/estresse, 0–10.** `height: 32` explícito; a 11 itens com `gap: 4` numa tela de 390pt sobram ~27pt de largura |
| `(treino)/[id].tsx:171` | **28 × 22** | Checkbox de série concluída, sem área-pai, ao lado de três `TextInput` numa linha densa |
| `register.tsx:311,316` | ~**13** de altura 🔴 | **"Termos de Uso" / "Política de Privacidade"** — sem padding nenhum; o alvo é exatamente a caixa de linha do caption de 10,5px. O pior alvo do app, num link jurídico obrigatório |
| `login.tsx:128-136, 138-150` | ~25 | "Criar uma conta" / "Esqueci minha senha" |
| `login.tsx:170-183`, `register.tsx:338-351` | ~25 × 75 | seletor de idioma |
| `(clinica)/education/[id].tsx:105-112` | **28 × 28** | estrelas de avaliação |
| `(clinica)/wearables.tsx:267,284,299,326` | ~28 | "Corrigir" / "Sincronizar" / "Desconectar" / "Conectar" |
| `(clinica)/guide.tsx:134-140` | ~27 | CTAs do guia |
| `(clinica)/book-appointment.tsx:122-123` | ~30 | chips de tipo de consulta |

**Componentes compartilhados — cada consumidor herda o defeito:**

| arquivo:linha | caixa | nota |
|---|---|---|
| `src/components/ui/Chip.tsx:21-36` | ~**27** de altura | `paddingVertical: 5` + texto 10,5. É o controle de filtro padrão do app |
| `src/components/ui/SegmentedControl.tsx:31-51` | ~**28** de altura | `paddingVertical: 7` + texto 11; o `padding: 3` é do contêiner, não do alvo |
| `src/components/ui/Button.tsx:37` | `sm: 36` | usado em **20 lugares**, incluindo botões de recuperação de erro: `consent.tsx:141`, `screening.tsx:203`, `LoadFailure.tsx:52,94`, `PlanGate.tsx:83` |

**Correção:** um `minHeight: 44` no `Chip`, no `SegmentedControl` e no `Button size="sm"` resolve mais da metade da lista de uma vez. Para a VAS e o slider do check-in, `hitSlop={{top:10,bottom:10,left:4,right:4}}` e trocar `<View onTouchEnd>` por `<Pressable accessibilityRole="button">` — o `hitSlop` é a correção certa aqui porque a caixa visual precisa mesmo ser pequena (são 11 degraus numa linha), e o `hitSlop` amplia o alvo sem mexer no layout.

**Acessibilidade em geral:** `accessibilityRole`/`accessibilityLabel` aparecem em **10 arquivos** do app inteiro, nenhum deles em `(clinica)`. Um paciente com VoiceOver não consegue usar a escala de dor.

---

## 4. HIERARQUIA E CONSISTÊNCIA

### 4.1 A ação principal é dita de quatro maneiras

| forma | ocorrências | exemplo |
|---|---|---|
| `Button variant="health"` | 18 | "Começar os exercícios de hoje" (`(tabs)/index.tsx:283`), "Salvar leitura" (`blood-pressure.tsx:179`) |
| `Button variant="primary"` (ink) | 16 | "Entrar" (`login.tsx:113`), "Criar conta" (`register.tsx:292`) |
| `Button` sem variante (= `greige`) | 65 | por toda parte |
| `Pressable` feito à mão com `t.colors.primary` | 3 | **"Salvar" do check-in diário** (`daily-checkin.tsx:217-226`) |

O caso do `daily-checkin.tsx:217` é o mais claro: é um `Pressable` cru com `padding: 16`, `backgroundColor: primary` e texto `fontSize: 16`/`fontWeight: 700`. Nenhum outro botão do app tem 16px de texto — o componente `Button` usa 12/13,5/15. **O botão de salvar do check-in é, literalmente, o maior texto de botão do app**, e é um botão que o `Button` já saberia desenhar.

E o inverso: na mesma família de telas, "Salvar leitura" da pressão é `health`, "Salvar medidas" do outcome-measures é o default `greige`, e "Salvar" do check-in é ink-16px. Três telas de registro diário, três botões diferentes.

**Correção:** uma regra só — ação primária de tela clínica = `variant="health"`; ação primária fora da clínica = `variant="primary"`; `greige` só para secundária; `ghost` para terciária. E substituir os 3 `Pressable` à mão por `<Button>`.

### 4.2 A aba ativa muda de cor dependendo de qual aba é

`(clinica)/(tabs)/_layout.tsx:14` define `tabBarActiveTintColor: t.colors.health` para as abas. Mas `:63` sobrescreve **só na aba Perfil**: `tabBarActiveTintColor: t.colors.text`.

O paciente aprende "verde = onde eu estou" em três abas e a regra quebra na quarta. Não há motivo aparente no código. **Correção:** remover a linha 63.

### 4.3 A escala de texto tem quatro níveis que são o mesmo nível

`caption 10,5` → `body 11,5` → `label 12` → `heading 14,5`. Entre `body` e `label` há **0,5px (razão 1,04)**; entre `caption` e `body`, 1px. Uma diferença de tamanho só é percebida como hierarquia a partir de ~1,2× — abaixo disso ela lê como inconsistência, não como estrutura.

Na prática, `caption`, `body` e `label` são o mesmo nível visual usado para três propósitos diferentes, e a diferenciação real acaba vindo do peso e da cor — o que joga carga extra em cima do `textMuted` que já falha contraste (§2.2).

**Correção:** ao subir a escala (§3.1), separar os degraus: `caption 13 / body 15 / label 15 semibold / heading 17`. Três tamanhos, não quatro quase-iguais.

### 4.4 O mesmo selo de status existe em três implementações

- `src/components/ui/Pill.tsx` — 9px, `paddingHorizontal: 8, paddingVertical: 3`
- `blood-pressure.tsx:136-143` e `:242-248` — selo montado à mão, 10px, `paddingHorizontal: 8, paddingVertical: 3`, `borderRadius: 10`
- `tasks.tsx:21-26` + `assessment-progress.tsx:34-36` + `exercise/[id].tsx:28-30` — três mapas `{bg, text, label}` separados, com a mesma estrutura

São quatro cópias da mesma ideia. O `Pill` já aceita `variant="ok"|"warn"|"bad"` — e a tela de pressão, que é a que mais precisa de um selo consistente, não o usa. **Correção:** estender `Pill` com um `size` e usá-lo nos quatro lugares; a correção de tamanho e de contraste passa a valer em um arquivo só.

### 4.5 O "eyebrow" secundário compete com o título

`(clinica)/(tabs)/index.tsx:250-254` mostra "SEU PLANO · {plano}" em `eyebrow` (9,5px, `letterSpacing: 0.8`), e logo abaixo `:259` mostra o conteúdo real — "N exercícios hoje" — em `variant="heading"`, que tem **14,5px**. O `heading` é o segundo menor dos títulos; num card cuja função é dizer o que fazer hoje, a informação principal está a 14,5px enquanto o `hero` (30px) existe e não é usado ali.

**Correção:** o número do dia em `subtitle` (17px) ou `title` (19px).

---

## Ordem de correção sugerida

| # | item | seção | por quê |
|---|---|---|---|
| 1 | faixa `LOW` ausente no `bpBand` | §1.1 | hipotensão marcada como normal em verde |
| 2 | `crisis` idêntico a `stage2` | §1.2 | emergência com a aparência de rotina |
| 3 | `ExerciseBlockCard` sem peso visual | §1.4 | o card que impede o treino passa despercebido |
| 4 | escala de texto (`caption`/`body`) | §3.1 | 67% do texto abaixo de 12px, incluindo precauções e consentimento |
| 5 | VAS / funcionalidade / dor sempre verdes | §1.5 | cor contradiz o dado na mesma tela |
| 6 | alvos da VAS e do slider (24×24 / 32) | §3.2 | paciente com dor registra o valor errado |
| 7 | `textMuted` → `textSecondary` | §2.2 | 258 nós abaixo de AA |
| 8 | rótulo e cor inativa das abas (8,5px, 2,63:1) | §2.1, §3.1 | navegação do app inteiro |
| 9 | `ok`/`warn`/`bad` como decoração | §1.6 | gasta o sinal de alerta |
| 10 | botão de ação primária em quatro dialetos | §4.1 | o paciente não aprende onde apertar |
| 11 | `userInterfaceStyle: automatic` sem tema escuro | §2.4 | uma linha |
| 12 | escurecer `bad`/`warn`/`community` em 6–13% | §1.3 | **EXCEÇÃO** — leva os selos de estado a AA sem mudar matiz |
