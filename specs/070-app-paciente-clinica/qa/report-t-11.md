# QA — T-11: Logo da BPR + comparativo web × app

**Data:** 22/09/2026 · **Branch:** `brunoto02028/app_clinic` em `4e18085f`
**Ambiente:** Next dev :4000 · Expo Web :8081 (`--offline`) · Postgres `bpr_clinic_local`
**Paciente de teste:** `qa-t11@example.com`, clínica `qa-clinic-a`, `fullAccessOverride` — criado e removido.

---

# Parte 1 — Logo: ⚠️ aprovado com ressalvas

O logo real entrou e é legível nos três fundos. Três defeitos, dois deles corrigidos em seguida.

| # | Cenário | Resultado |
|---|---|---|
| 1-4 | Abertura, login e registro: logo legível, contraste real | ✅ |
| 2 | Sem wordmark "BPR" duplicado na abertura | ✅ |
| 5 | **Largura do logo estourando o layout** | ❌ → corrigido |
| 6 | Nenhuma marca desenhada à mão fora de `tokens.ts` | ✅ |
| 7-8 | Assets idênticos aos do site (md5), nenhum placeholder do Expo | ✅ |
| 9 | Regressão: compila, login e navegação funcionam | ✅ |
| 10 | **`splash-icon.png` era asset órfão** | ❌ → corrigido |
| 11 | Logo ausente no seletor de módulo | ⚠️ → corrigido |
| 12 | Ícone e splash nativos | ⚠️ exige build EAS |

### Defeito 5 — `aspectRatio` não constrange largura no react-native-web

`Logo.tsx` declarava `aspectRatio: 581/674` sem `width`. No react-native-web o elemento assume a **largura intrínseca da arte (581px)** em qualquer `height`. Medido em runtime a 414×896:

| Tela | Caixa do logo | Efeito |
|---|---|---|
| Abertura | `x=-83, w=581` | `scrollWidth 497` vs `clientWidth 414` → **scroll horizontal** |
| Login / Registro | `x=16, w=581` | transborda 183px; a arte renderiza a ~290px da margem enquanto todo o resto começa em `x=16` |

Na abertura o `alignItems: "center"` do pai mascarava visualmente, mas a página ganhava scroll.

**Corrigido:** `width: Math.round(height * RATIO)` explícito. Provável que no nativo o Yoga já tratasse certo — mas o Expo Web é alvo declarado no `app.json` e lá estava quebrado.

### Defeito 10 — splash sem imagem

`app.json` tinha `splash` com `backgroundColor` e `resizeMode`, **sem `image`**, e `expo-splash-screen` está nas dependências mas não em `plugins`. O splash nativo renderizaria um retângulo slate liso. Pré-existente — a chave nunca existiu —, mas a T-11 gerou o asset e não o conectou, e a spec afirmava que o `backgroundColor` "aparece atrás", o que era falso.

**Corrigido:** `"image": "./assets/splash-icon.png"`.

### Ressalva aberta

`<TriBar work health />` continua na home do paciente (`(tabs)/index.tsx:196`), sem props de valor. Não é o logo — é o indicador dos pilares do BA One, decorativo e fixo. Resíduo de BA One numa tela de paciente.

---

# Parte 2 — Comparativo web × app

## 🔴 O inventário da T-1 estava errado

O `report-t-1.md` classificou **15 páginas como "já cobertas no app"**. A verificação tela a tela derruba isso em duas dimensões independentes.

### (a) 9 das 15 não são alcançáveis pelo paciente

As tabs do módulo clínica são quatro: Home, Sessions, Exercises, Profile. Varredura de todo `router.push`/`href` em `mobile/app` e `mobile/src`:

| Tela | Entrada |
|---|---|
| `consent`, `documents`, `guide`, `quizzes`, `tasks`, `treatment-protocol`, `assessment-progress`, `wearables`, `wearable-data` | ❌ zero referências |
| `screening` | só via `guide`, que é inalcançável |
| `education` | só pela home do **BA One** (`(ba)/(tabs)/index.tsx:280`) |

São arquivos de rota que só abrem por URL digitada. Do ponto de vista do paciente, não existem.

### (b) Entre as que abrem, várias mostram dado falso

**Cobertura real: 6 telas** (home, appointments, appointments/[id], appointments/book, exercises, profile) — e quatro delas com regressões.

## Tabela — as 15 "cobertas"

| Tela web | App | Dados batem? | O que falta / o que está errado |
|---|---|---|---|
| `(home)` | abre | ❌ | `"YOUR PLAN · Shoulder"` e `"Day 12 of 42"` são **literais no JSX** (`index.tsx:186-188`). "~15 min" é `nExercícios × 5`. "Directions" é `onPress={() => {}}`. **"Message the clinic" leva a `/clinical-notes`** (notas SOAP), não a mensagens. Faltam onboarding, check-in semanal, CTA de screening, cards do `PortalConfig` |
| `appointments` | abre | ✅ | Falta paywall, filtro por status, **preço e estado de pagamento**, Waitlist. `SCHEDULED` não existe no enum → todo `PENDING` vira "Agendado" |
| `appointments/[id]` | abre | ✅ | **Tudo que é ação**: pagar, cancelar, política 24h. **Renderiza `data.notes`, campo interno do terapeuta que o paciente nunca vê na web** |
| `appointments/book` | abre | ❌ | **Bug de fuso**: envia `T${hora}:00.000Z`; web usa `zonedTimeToUtc`. 09:00 vira 10:00 na agenda durante o BST. Confirmação mostra **endereço e terapeuta de outro tenant** |
| `clinical-notes` | abre | ❌ | **`/api/patient/clinical-notes` retorna 404**; o cliente tem `catch { return [] }`. Tela morta que parece vazia |
| `consent` | órfã | ❌ | **Zero chamadas de API.** Textos fixos. **"Você aceitou os termos em 04/06/2026"** é literal. Card "Termos aceitos" renderiza incondicionalmente. Sem checkbox |
| `documents` | órfã | parcial | Mostra `application/pdf` onde a web mostra a categoria. Upload só aceita imagem, `documentType: "OTHER"` fixo |
| `education` | via BA | parcial | Descarta `progress` → "Concluído" nunca aparece. Descarta nota do terapeuta, prazo e "obrigatório" |
| `guide` | órfã | n/a | Perde o aviso de triagem 24h, o cronograma e a **FAQ com a política de cancelamento**. Diz "9 etapas"; o wizard tem 7 |
| `outcome-measures` | abre | ⚠️ | Salvar pelo app envia `faamAdl: {}` e o GET lê a linha mais recente → **um save pelo app apaga o FAAM do paciente** |
| `profile` | abre | parcial | `firstName`/`lastName` editáveis **e nunca salvam** (fora de `allowedFields`). `preferredLocale` grava `"pt"` onde o sistema espera `"pt-BR"`. Botão de câmera sem `onPress` |
| `quizzes` | órfã | ❌ | Renderiza `item.title`, mas o model tem `titleEn`/`titlePt` → **todo card mostra a literal "Quiz"**. Card sem `onPress`: impossível responder |
| `screening` | via guide | ⚠️ | **As 12 red flags não existem no app** e a rota grava `?? false` → ficam "Não" sem terem sido perguntadas. `screening.tsx:72` envia **`consentGiven: true`** sem texto nem checkbox. `smoker` envia string para coluna `Boolean` |
| `tasks` | órfã | parcial | Prioridade mostra `high` cru. `dueDate` não renderizado. **Sem `actionUrl`** — a tarefa não leva a lugar nenhum |
| `treatment` | órfã | ❌ | Imprime **"Fase SHORT_TERM"** para o paciente. Mostra sets/reps **da biblioteca, não da prescrição**. Usa `PATCH` legado increment-only enquanto a web usa `toggleLog` — os dois brigam pelo mesmo `completedCount` |

## As 17 ausentes

Confirmadas ausentes. Três notas:

- **`achievements` e `membership`** existem no app e consomem **os mesmos endpoints da web** — mas sob `(ba)/`. Funcionalidade pronta, exposta no produto errado.
- **`biohacking`** está decomposto em `wearables`, `wearable-data` e `daily-checkin` (~2/3); falta `/api/biohacking/my-protocol`.
- **`questions`** não existe em nenhum produto do app. É para onde a home aponta e entrega notas SOAP.

## Divergência `exercises` confirmada

`app/dashboard/exercises/page.tsx` é hoje `redirect("/dashboard/treatment")`. A T-8 segue real.

Resíduo: `app/api/admin/exercise-prescriptions/route.ts:252` ainda manda `${appUrl}/dashboard/exercises` **no email/WhatsApp ao paciente**. Funciona via redirect, mas é o link vivo apontando para rota aposentada.

---

## ⚠️ A área do paciente na web não renderiza em dev

`/login` e `/dashboard/**` servem HTML e payload RSC (200, sem erro no console) mas o React nunca monta — 3 a 4 `<div>` e texto vazio. A homepage pública, na mesma aba e sessão, renderiza normal. O `next dev` registrou `Fast Refresh had to perform a full reload due to a runtime error`.

**Não é desta branch:** `git diff --stat main...HEAD` mostra um único arquivo web alterado (`app/api/mobile/modules/route.ts`). É pré-existente em `main`.

**Consequência metodológica:** o lado web da comparação apoia-se em leitura do código que renderiza e nas respostas reais das APIs, com o mesmo paciente. O lado app foi todo verificado ao vivo com screenshot. Onde o relatório afirma "a web mostra X", é evidência de código e API, não de tela vista.

---

## Falhas, por gravidade para o paciente

1. **`screening.tsx:72` — `consentGiven: true` automático + 12 red flags gravadas como "Não" sem serem perguntadas.** Risco clínico e de compliance.
2. **`consent.tsx` — tela de consentimento GDPR inteiramente mock**, com data de aceite fabricada.
3. **`book-appointment.tsx:57` — desvio de 1h no BST.** Sete meses por ano paciente e clínica veem horários diferentes.
4. **`booking-confirmed.tsx` — endereço e terapeuta de outro tenant** apresentados como fato.
5. **`clinical-notes.ts:18` — endpoint 404** engolido por `catch { return [] }`.
6. **`outcome-measures.tsx:25` — o save do app apaga o FAAM** do paciente.
7. **9 das 15 telas sem ponto de entrada.**
8. **Home com "Shoulder" e "Day 12 of 42" fixos**, lidos como informação clínica.
9. ~~`Logo.tsx` — largura de 581px~~ — corrigido.
10. ~~`app.json` — splash sem `image`~~ — corrigido.
11. **Idioma misturado, sem i18n no módulo clínica.** Shell em inglês, telas internas em PT fixo, exercícios sempre em inglês porque `namePt`/`instructionsPt` vêm da API e o cliente não os declara. Nenhuma dessas strings passou por revisão PT+EN.

## Correção obrigatória no `report-t-1.md`

"15 já cobertas no app" media **existência de arquivo de rota**, não cobertura. Por cobertura real — alcançável e com dado verdadeiro — são **6**, quatro delas com regressões. A recomendação de fases da T-1 parte de uma linha de base que não existe.
