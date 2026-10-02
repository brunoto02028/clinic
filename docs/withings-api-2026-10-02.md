# A API da Withings, lida de ponta a ponta — 02/10/2026

Documento de referência levantado a partir **apenas de documentação pública** da
Withings (portal de programador e páginas de planos), em 02/10/2026.

**Como ler este documento.** Cada afirmação está marcada:

- **[DOC]** — está escrito na documentação da Withings. Tem URL.
- **[VERBATIM]** — citação literal.
- **[OMISSO]** — a documentação não diz. Isto é um achado, não uma falha de busca.
- **[INFERÊNCIA]** — raciocínio meu a partir do que está documentado. Não é fonte.
- **[CONTRADIÇÃO]** — duas páginas da Withings discordam. Mostro as duas.

---

## 0. A resposta curta à pergunta que decide o produto

A pergunta era: **o `signal` do `v2/heart get` depende do nosso pacote de
biomarcadores (a), da assinatura Withings+ do paciente (b), ou de outra coisa (c)?**

A documentação permite **excluir (b) como explicação do que medimos**, **enfraquecer
muito (a)**, e aponta para **(c)**. O detalhe completo está na secção 10. Em resumo:

| hipótese | o que a documentação diz |
|---|---|
| **(a) pacote de biomarcadores** | **Documentado que existe**: `ECG Signal` é **Total Biomarker Pack** / plano *Advanced Biomarkers*, fora do plano grátis. **Mas não explica a nossa medição** — ver abaixo. |
| **(b) Withings+ do utilizador** | **Excluído.** A regra existe, mas só **a partir de 12/10/2026**, só para **contas criadas depois dessa data**, e bloqueia **toda** a partilha — não o ECG. E a Withings diz, literalmente: *"the ECG feature and atrial fibrillation detection are included with your watch **without any subscription**"*. |
| **(c) outra coisa** | **Mais provável.** O OAuth scope está excluído (é o mesmo dos dois lados). Sobra a **sincronização do aparelho** e, acima de tudo, o facto de **as duas sondagens não terem pedido o mesmo `signalid`**. |

**O argumento que mais pesa, e que é lógico e não documental.** O campo
`ecg.afib` está catalogado pela Withings no **mesmo** pacote (*Total*) que o
`signal`. O `afib` **chegou em 01/10, antes do Withings+**. Logo o nosso
`client_id` já satisfazia, naquele dia, o que é preciso para um campo *Total* de
ECG. Se o pacote fosse a tranca, o `afib` teria sido bloqueado junto.
**[INFERÊNCIA]**, mas em cima de factos documentados dos dois lados.

---

## 1. Método, e o que não se consegue ler

| página | estado |
|---|---|
| `developer-guide/v3/data-api/all-available-health-data` | **Legível** em HTML. A coluna *Pack* é um `<div class="biomarker-dot basic-pack">` / `total-pack` — invisível a quem só extrai texto. Foi lida pela classe CSS. |
| `developer-guide/v3/withings-solutions/withings-api-plans` | **O corpo da página está vazio.** É só um `<iframe src="https://static.withings.com/content/api/plans/plans.html">`. Lido directamente no iframe. |
| **`developer.withings.com/api-reference`** | **Renderizada por JavaScript — o HTML servido diz só "Loading ...".** Não é legível por fetch simples. |
| a especificação OpenAPI por trás do `/api-reference` | **Recuperada.** Está embutida como objecto JS em `assets/js/main.8ae1c0ad.js` (`customFields.apiSpec`, `openapi: 3.0.3`, `info.version: 2.0`). **Não existe URL público para um `.json`/`.yaml` da spec** — não há pedido de rede para um ficheiro de especificação; ela vem no bundle. **[OMISSO]** |
| tooltips (ⓘ) de cada métrica na página *Available Health Data* | **Não legíveis.** O texto é injectado no cliente e não está em nenhum chunk que se consiga baixar. Não sei o que dizem. |
| `developer.withings.com/blog` | **Vazia** — sem posts. Não há anúncio da mudança de planos ali. |

A especificação recuperada tem **57 endpoints**. Confirmei a leitura renderizando
a página num browser real (o corpo tem ~124 KB de texto), e a spec extraída bate
com o que o browser mostra.

**Fontes principais**

- https://developer.withings.com/api-reference (só via browser / bundle)
- https://developer.withings.com/developer-guide/v3/data-api/all-available-health-data/
- https://static.withings.com/content/api/plans/plans.html (o conteúdo real da página de planos)
- https://developer.withings.com/developer-guide/v3/integration-guide/public-health-data-api/data-api/notifications/notification-overview/
- https://developer.withings.com/developer-guide/v3/integration-guide/public-health-data-api/data-api/notifications/notification-content/
- https://developer.withings.com/developer-guide/v3/integration-guide/public-health-data-api/get-access/oauth-authorization-url/
- https://developer.withings.com/developer-guide/v3/integration-guide/public-health-data-api/data-api/raw-data/
- https://web.archive.org/web/20260210103752if_/https://static.withings.com/content/api/plans/plans.html (a versão anterior da página de planos)

**Fontes do lado do consumidor** (secção 8.3)

- https://www.withings.com/en-us/pages/ecg-watches · https://www.withings.com/en-uk/pages/ecg-watches — **o FAQ que diz que o ECG não precisa de assinatura**
- https://support.withings.com/hc/en-us/articles/17091647688465-ScanWatch-2-Sharing-ECG-recordings-with-your-doctor
- https://support.withings.com/hc/en-us/articles/14166469200529-Withings-Subscribing-to-Withings (preços e teste gratuito)
- https://support.withings.com/hc/en-us/articles/8986672043153-Withings-FAQ
- https://support.withings.com/hc/en-us/articles/11132728427921-Withings-Terms-and-Conditions
- https://support.withings.com/hc/en-us/articles/33789946387217-Withings-App-Sharing-data-with-a-Healthcare-Professional (o tecto de 3 meses)
- https://support.withings.com/hc/en-us/articles/15547200464273-Withings-Health-Improvement-Score
- https://support.withings.com/hc/en-us/articles/32557735511953-Withings-Cardio-Check-Up
- https://support.withings.com/hc/en-us/articles/201489647-Partner-Apps-Linking-a-Partner-app-to-my-Withings-account

---

## 2. Os pacotes de biomarcadores

### 2.1 Os nomes — e aqui já há contradição

**[CONTRADIÇÃO]** A Withings usa **três vocabulários diferentes** para a mesma ideia:

| onde | os nomes |
|---|---|
| *Available Health Data* (legenda da coluna *Pack*), hoje | **"Basic Biomarker Pack"** e **"Total Biomarker Pack"** |
| *API plans*, hoje (02/10/2026) | **"Core biomarkers"** vs **"FDA/CE cleared biomarkers"**; e um **plano** chamado **"Advanced Biomarkers"** |
| *API plans*, versão anterior (arquivo de 10/02/2026) | **"Basic Biomarkers"** vs **"Advanced Biomarkers with FDA/CE clearance"** |

A expressão **"Total Biomarker Pack"** aparece **só na legenda da página
*Available Health Data***, e **em nenhum lugar da página de planos**. A página de
planos nunca usa a palavra "pack". **[INFERÊNCIA]** "Total Biomarker Pack" ≡
"Advanced Biomarkers" ≡ "FDA/CE cleared biomarkers" — é a mesma fronteira descrita
por três equipas diferentes, mas **a Withings não publica essa equivalência**.

### 2.2 O que está em cada pacote — a tabela completa

Lida da página *Available Health Data* pela classe CSS da coluna *Pack*
(`basic-pack` / `total-pack`). **[DOC]** Contagem na página de hoje: **49 linhas
Basic, 47 linhas Total**.

> **[VERBATIM]**, do topo da página:
> "This page details all available biomarkers, their device compatibility, and
> which API plan includes access to each metric."

Note o verbo: **"which API plan includes access"**. A página atribui o acesso ao
**plano de API**, nunca à assinatura do utilizador.

#### Scales (Body, Body Pro, Body Smart, Body Comp, Body Pro 2, Body Scan, Body Scan 2, Body Fit)

| métrica | pack |
|---|---|
| Weight, Fat Mass, Fat Free Mass, Muscle Mass, Bone Mass, Water Mass | **Basic** |
| Fat Free Mass Segmental, Fat Mass Segmental, Muscle Mass Segmental | **Total** |
| Intracellular Water, Extracellular Water | **Total** |
| Standing Heart Rate | **Basic** |
| Pulse Wave Velocity (🇪🇺) | **Total** |
| Vascular Age, Visceral Fat, Basal Metabolic Rate | **Total** |
| Nerve Response Score (NRS) (🇺🇸), Nerve Health Score (NHS) (🇪🇺) | **Total** |

#### Sleep (Sleep, Sleep Analyzer, Sleep Rx)

*Wellness Metrics*

| métrica | pack | aparelhos |
|---|---|---|
| **Sleep Score** | **Total** | Sleep, Sleep Analyzer, Sleep Rx |
| Sleep Efficiency, Sleep Latency, Sleep Time, Time In Bed | **Basic** | todos |
| Wakeup Latency, Out of bed count, Asleep Duration | **Basic** | todos |
| Deep / Light / REM Sleep Duration, REM Episodes Count | **Basic** | todos |
| Wake Up Count, Awake Duration | **Basic** | todos |
| **Heart Rate Variability (Overnight)** | **Total** | Sleep, Sleep Analyzer (**não** Sleep Rx) |
| Vitality Score (*Coming Soon*) | **Total** | todos |
| Respiratory Rhythm | **Total** | Sleep, Sleep Rx |
| Breathing Quality Assessment | **Total** | só Sleep |
| Heart Rate | **Total** | só Sleep |
| Snoring duration | **Total** | todos |

*Medically Regulated Metrics*

| métrica | pack | aparelhos |
|---|---|---|
| Heart Rate | **Total** | Sleep Analyzer, Sleep Rx |
| Respiration Rate | **Total** | Sleep Analyzer |
| Movement score | **Total** | Sleep Analyzer, Sleep Rx |
| Sleep Apnea Index | **Total** | Sleep Analyzer |
| Withings AHI | **Total** | Sleep Rx |
| Breathing sounds duration | **Total** | Sleep Rx |

#### Trackers (Pulse 0x, Steel HR/Pulse HR, Scanwatch Light, Scanwatch, Scanwatch 2)

| métrica | pack | aparelhos |
|---|---|---|
| Steps, Distance, Calories, Intensity, **Workouts** | **Basic** | todos |
| Continuous Heart Rate, Punctual Heart Rate, **Sleep Heart Rate** | **Basic** | Steel HR/Pulse HR, SW Light, SW, SW 2 |
| VO2 Max | **Total** | Steel HR/Pulse HR, SW Light, SW, SW 2 |
| **Heart Rate Variability (HRV)** | **Total** | **só ScanWatch 2** |
| SpO₂ Auto | **Total** | ScanWatch, ScanWatch 2 |
| Manual SpO₂ | **Basic** | Pulse 0x, ScanWatch, ScanWatch 2 |
| Core Body Temperature (+ Night Summary) | **Total** | só ScanWatch 2 |
| Sleep Duration, Sleep State Duration, Sleep Wakeup Counts | **Basic** | todos menos Pulse 0x |
| Respiratory Rate (RR) | **Total** | só ScanWatch 2 |
| Vitality Score (*Coming Soon*) | **Total** | só ScanWatch 2 |
| QR, PR, QT, QTC Intervals | **Total** | ScanWatch, ScanWatch 2 |
| **ECG Signal** | **Total** | ScanWatch, ScanWatch 2 |
| Atrial Fibrillation (PPG) | **Total** | ScanWatch, ScanWatch 2 |
| **Atrial Fibrillation (ECG)** | **Total** | ScanWatch, ScanWatch 2 |

> **Isto é o parágrafo mais importante da secção.** `ECG Signal` **e**
> `Atrial Fibrillation (ECG)` estão **no mesmo pacote (Total)**, para os mesmos
> aparelhos. A Withings não distingue os dois em nenhum eixo de acesso.

#### Blood Pressure (BPM Connect, BPM Core, BPM Connect Pro, BPM Pro 2, BPM Vision)

| métrica | pack | aparelhos |
|---|---|---|
| Diastolic / Systolic Blood Pressure | **Basic** | todos |
| Heart Rate | **Basic** | todos |
| **ECG Signal** | **Total** | **só BPM Core** |
| Survey Feature | **Basic** | só BPM Pro 2 |

**Relevante para nós:** o **BPM Connect** da clínica **não faz ECG** — só o **BPM
Core** faz. **[DOC]**

#### Thermo / BeamO / U-Scan

| métrica | pack |
|---|---|
| Thermo — Body Temperature | **Basic** |
| Thermo — Skin Temperature | **Total** |
| BeamO — Body Temperature, Pulse Rate, SpO₂ | **Basic** |
| BeamO — Heart Rate | **Total** |
| BeamO — **ECG Signal** | **Total** |
| BeamO — **AFib Detection** | **Basic** ⚠️ |
| BeamO — Stethoscope Signal | **Total** |
| U-Scan — todas as 8 métricas urinárias | **Basic** |

**[CONTRADIÇÃO]** No BeamO, **`AFib Detection` é Basic**; nos trackers,
`Atrial Fibrillation (ECG)` é **Total**. A mesma conclusão clínica tem pacote
diferente dependendo do aparelho. A página não explica.

#### APIs "Coming Soon"

Withings Intelligence API (Data Insight, Trends Insight) e Withings Scores API
(Vitality Score, Health Improvement Score, Hypertension Score, Diabetes Risk
Score, CHF Risk Score) — **todas Total**, todas marcadas *Coming Soon*.

### 2.3 Os planos de hoje (02/10/2026)

Da página real de planos (`static.withings.com/content/api/plans/plans.html`,
rodapé `v1.0.0`). Três planos: **Start for Free**, **Enterprise**,
**Advanced Biomarkers**.

| linha da tabela de comparação | Start for Free | Enterprise | Advanced Biomarkers |
|---|---|---|---|
| **Active users** | **10** — *"More after a Withings review"* | Unlimited | Unlimited |
| **Withings+ required for your end users** ¹ | **Yes** — *"Accounts created after October 12, 2026"* | *"Can be removed"* ³ | *"Can be removed"* ³ |
| Withings review to exceed the user cap | Required | Handled at onboarding | Handled at onboarding |
| **API rate limit** | **Standard** | **1,500+ req/min** | 1,500+ req/min |
| Dedicated instances for faster sync | ✗ | ✓ | ✓ |
| Uptime SLA | ✗ | ✓ | ✓ |
| **Core biomarkers** (Activity, Sleep, Body, Heart) | ✓ | ✓ | ✓ |
| Webhooks & notifications | ✓ | ✓ | ✓ |
| **FDA/CE cleared biomarkers** — *"ECG, AFib, SpO₂, vascular age, AHI, EDA/NHS"* | **✗** | **✗** | **✓** |
| Risk scores for chronic conditions | ✗ | ✗ | ✓ |
| Symptom tracking & questionnaires | ✗ | ✗ | ✓ |
| AI model training contract | ✗ | ✗ | ✓ |
| Data anonymization services | ✗ | ✗ | ✓ |
| EU-hosted, GDPR compliant | ✓ | ✓ | ✓ |
| US-hosted, HIPAA compliant | ✗ | ✓ | ✓ |
| HDS certified French health data hosting | ✗ | ✓ | ✓ |
| DPA, BAA and security questionnaire | ✗ | ✓ | ✓ |
| Regulatory compliance assistance | ✗ | ✗ | ✓ |
| Documentation, sandbox & community | ✓ | ✓ | ✓ |
| Priority technical support | ✗ | ✓ | ✓ |
| Named CSM & solution engineer | ✗ | ✓ | ✓ |
| Self-service fleet management | ✗ | ✓ | ✓ |
| Clinical study support team | ✗ | ✗ | Add-on |
| Device dropshipping API | ✗ | Add-on | Add-on |
| Custom packaging | ✗ | Add-on | Add-on |

**Preço publicado:** apenas **"Free"** para o Start for Free. Enterprise e
Advanced Biomarkers dizem **"Custom"** — *"Based on number of active users"* e
*"Based on active users and biomarkers"*. **Nenhum valor monetário é publicado.**
**[OMISSO]**

> **[VERBATIM]**, descrição do Start for Free:
> "Kick-start your project, prototype end to end, and run small to medium
> consumer health apps once reviewed."
> "Self-serve · stays free past 10 users, once Withings reviews your app"

> **[VERBATIM]**, descrição do Advanced Biomarkers:
> "Cleared biomarkers, risk scores and symptom tracking, plus AI model training
> rights."
> "✓ FDA/CE cleared biomarkers: ECG, AFib, SpO₂, vascular age, AHI"

**O que isto diz, em uma linha:** **o ECG está fora do plano grátis e fora do
Enterprise.** Está só no **Advanced Biomarkers**, que é contrato comercial
negociado. **[DOC]**

### 2.4 Os planos de antes — o que o nosso app assinou

Versão arquivada de **10/02/2026** (Wayback). Estrutura **diferente**: quatro
caixas — **Start Developing for Free**, **Enterprise**, **Healthcare**,
**Research**.

> **[VERBATIM]**: "Start Developing for Free 🚀 — Ideal for innovators &
> startups. **Basic biomarkers availability and 1000 active users limitation**"

E a composição de cada um:

| plano (versão antiga) | biomarcadores |
|---|---|
| Start Developing for Free | **Basic biomarkers**, 1000 active users |
| **Enterprise** | "Basic Biomarkers" — **❌ Advanced Biomarkers with FDA/CE clearance** |
| **Healthcare** | "Custom Biomarkers" — Advanced Biomarkers **(Add-on)** |
| **Research** | "Advanced Biomarkers" — **✅** tudo, incl. *"Higher frequency and Raw Sensor Data (PPG, Accel, etc.)"* |

**[VERBATIM]**, Enterprise antigo: `❌ Advanced Biomarkers with FDA/CE clearance`.

**Dois factos que saem desta comparação:**

1. **A versão antiga não menciona Withings+ em nenhum lugar.** A exigência de
   assinatura do utilizador final é **nova**, posterior a 10/02/2026.
2. **O limite do plano grátis caiu de 1.000 para 10 utilizadores activos.** Quem
   leu a documentação há meses tem um número errado na cabeça. (Resultados de
   busca de terceiros ainda repetem "1000 active users" e "Basic Biomarker Pack" —
   **estão desactualizados**.)

**Em ambas as versões, antiga e nova, o ECG está fora do plano grátis.** **[DOC]**

### 2.5 Como se pede / activa um pacote

**[DOC]** Não há auto-serviço para o pacote. O que a página publica:

- **Para subir o limite de 10 utilizadores**: formulário de revisão.
  > **[VERBATIM]**: "Submit your app for review. We look at what you are
  > building, which biomarkers you request and how you protect them. Once
  > approved, your cap is raised to a level that fits your use case, so small and
  > medium apps can keep running on Start for Free."
  > "Have ready: your Withings client ID, a link to the live app or a demo, and
  > your privacy policy URL. It is 10 questions, about 5 minutes."
- **Para ECG / biomarcadores limpos**: *"Talk to our team"* — contacto comercial.
  Não há botão.
- Dentro da própria especificação OpenAPI, o único gating explícito remete para a
  mesma página:
  > **[VERBATIM]**, `v2/sleep get`, valores de `state`:
  > "`15` | Sleep out of bed (**require a specific plan**, contact-us)"
  > — com link para `/developer-guide/v3/withings-solutions/withings-api-plans/`.

**[OMISSO]** **Nenhum endpoint diz qual pacote o nosso `client_id` tem.** Não há
`action=getplan`, não há campo de entitlement em resposta nenhuma. A única forma de
saber é olhar o **Withings Partner Hub** (`developer.withings.com/dashboard`),
que exige login — não consegui ver, e não devo.

---

## 3. Tabela por endpoint

Base URL de todos: `https://wbsapi.withings.net`. **Todos são `POST`**, com
`action` em query e `Authorization: Bearer {access_token}` no header.

**Nota sobre a coluna "pacote":** a Withings **não** atribui pacote a *endpoints*
— atribui a *métricas*. A coluna abaixo é a leitura da tabela da secção 2.2
aplicada ao que cada endpoint devolve. **[INFERÊNCIA]** onde indicado.

| endpoint | action | obrigatórios | janela máxima documentada | pacote |
|---|---|---|---|---|
| `/measure` | `getmeas` | `action` | **[OMISSO]** — `startdate`+`enddate` **ou** `lastupdate`, todos opcionais; paginação por `offset`/`more` | **mistura**: peso/pressão/SpO₂ manual = Basic; `130`/`135`–`139`/`155`/`123` (afib, QT/PR/QRS, vascular age, VO2) = **Total** |
| `/v2/measure` | `getactivity` | `action` + (`startdateymd`+`enddateymd` **ou** `lastupdate`) | **[OMISSO]**; `offset`/`more` | **Basic** (steps, distance, calories, intensity, hr_*) |
| `/v2/measure` | `getintradayactivity` | `action` | **24 h** — ver citação abaixo. Sem `offset` documentado | **mistura**: steps/calories/distance/heart_rate = Basic; `spo2_auto`, `rmssd`, `sdnn1`, `hrv_quality`, `core_body_temperature`, `rr` = **Total** |
| `/v2/measure` | `getworkouts` | `action` + (`startdateymd`+`enddateymd` **ou** `lastupdate`) | **[OMISSO]**; `offset`/`more` | **Basic** (`Workouts`) |
| `/v2/sleep` | `get` | `action`, **`startdate`**, **`enddate`** | **24 h OU 7 dias — contraditório**, ver 3.2 | **mistura**: `state` (hipnograma) = Basic; `hr`, `rr`, `snoring`, `rmssd`, `sdnn_1`, `mvt_score`, `withings_index` = **Total**; `state:15` = **plano específico** |
| `/v2/sleep` | `getsummary` | `action` + (`startdateymd`+`enddateymd` **ou** `lastupdate`) | **[OMISSO]**; `offset`/`more` | **mistura** — ver 3.3, campo a campo |
| `/v2/heart` | `list` | `action` | **[OMISSO]** — `startdate`/`enddate` **opcionais**; `offset`/`more` | **Total** (`ecg.afib`); `bloodpressure` = Basic |
| `/v2/heart` | `get` | `action` + **`signalid`** (ou o quarteto assinado) | não tem janela — é por registo | **Total** (`ECG Signal`) |
| `/v2/user` | `getdevice` | `action` | n/a | **[OMISSO]** — não aparece na tabela de packs |
| `/v2/user` | `get` | `action`, `client_id`, `nonce`, `signature` | n/a | **indisponível para nós** — ver 3.6 |
| `/v2/rawdata` | `activate` / `deactivate` / `get` | — | — | **"Contracted partners only"** |

### 3.1 `measure getmeas` — os `meastype` todos

**[DOC]** 44 tipos documentados:

`1` Weight (kg) · `4` Height (meter) · `5` Fat Free Mass (kg) · `6` Fat Ratio (%) ·
`8` Fat Mass Weight (kg) · `9` Diastolic Blood Pressure (mmHg) ·
`10` Systolic Blood Pressure (mmHg) · `11` Heart Pulse (bpm) — *"only for BPM and
scale devices"* · `12` Temperature (celsius) · `54` SP02 (%) ·
`71` Body Temperature (celsius) · `73` Skin Temperature (celsius) ·
`76` Muscle Mass (kg) · `77` Hydration (kg) · `88` Bone Mass (kg) ·
`91` Pulse Wave Velocity (m/s) · `123` VO2 max (ml/min/kg) ·
**`130` Atrial fibrillation result** · **`135` QRS interval duration based on ECG
signal** · **`136` PR interval** · **`137` QT interval** · **`138` Corrected QT
(QTc)** · **`139` Atrial fibrillation result from PPG** · `147` Urinary pH ·
`148` Urine Specific Gravity · `151` Urinary Nitrites (µmol/L) · `155` Vascular age ·
`167` Nerve Health Score Conductance 2 electrodes Feet · `168` Extracellular Water
(kg) · `169` Intracellular Water (kg) · `170` Visceral Fat · `173` Fat Free Mass for
segments · `174` Fat Mass for segments · `175` Muscle Mass for segments ·
`196` Nerve Response Score (NRS) · `204` Urinary Ketones (mmol/L) ·
`205` Urinary Vitamin C (mmol/L) · `226` Basal Metabolic Rate (BMR) ·
`227` Metabolic Age · `229` Electrochemical Skin Conductance (ESC) ·
`248` Urinary Calcium (mmol/L) · `249` Urinary Creatinine (mmol/L) ·
`251` Urinary Calcium/Creatinine Ratio (mmol/mmol)

**Achado accionável:** os intervalos **`135`–`138` (QRS, PR, QT, QTc)** e o
**`130` (afib)** saem pelo **`getmeas`**, não pelo `v2/heart`. O PDF do ECG da
Withings mostra esses intervalos — é daqui que vêm. **[DOC]** (pacote: **Total**.)

`category`: `1` para medidas reais, `2` para objectivos do utilizador. **[DOC]**

### 3.2 `v2/sleep get` — e a contradição da janela

**[CONTRADIÇÃO]** O mesmo endpoint diz duas coisas:

> **[VERBATIM]**, nas *Notes* da descrição:
> "If your input `startdate` and `enddate` are separated by more than 24h, only
> the first 24h after `startdate` will be returned."

> **[VERBATIM]**, na descrição do campo `series.enddate` da resposta:
> "The end datetime for the sleep data. **A single call can span up to 7 days
> maximum.** To cover a wider time range, you will need to perform multiple
> calls."

24 h e 7 dias, na mesma página. **[INFERÊNCIA]** A nota de topo é a que descreve o
comportamento real (é afirmativa sobre o que *será devolvido*); a dos 7 dias
parece texto antigo herdado. **Na prática: pedir 1 dia.**

`data_fields` documentados (todos, um a um): **[DOC]**

| campo | o que é |
|---|---|
| `hr` | Heart Rate (beats per minute) |
| `rr` | Respiration Rate (breaths per minute) |
| `snoring` | Total snoring time (seconds) |
| **`sdnn_1`** | HRV — *"Standard deviation of the NN over 1 minute (in miliseconds)"* |
| **`rmssd`** | HRV — *"Root mean square of the successive differences over 'a few seconds' (in miliseconds)"* |
| `hrv_quality` | HRV — quality score |
| `mvt_score` | Intensidade de movimento na cama, minuto a minuto, 0–255. *"only available for Sleep Analyzer devices in the EU and prescription-based devices in the US (Sleep Rx)"* |
| `chest_movement_rate` | Chest movement rate (events per minute) |
| **`withings_index`** | Withings Sleep Rx (FDA Cleared) — eventos respiratórios por hora. `0–15` No/Mild, `15–30` Moderate, `>30` Severe. *"5 hours of sleep are required in order to calculate the Withings Index"* |
| `breathing_sounds` | Total time when breathing sounds were tracked (seconds) |

`state` (o hipnograma): `0` awake · `1` light · `2` deep · `3` rem · `4` manual ·
`5` unspecified · **`15` out of bed — "require a specific plan"**. **[DOC]**

`model` da resposta: `16` = tracker, `32` = Sleep Monitor. **[DOC]**

### 3.3 `v2/sleep getsummary` — todos os `data_fields`, e o erro que cometemos

**[DOC]** Agrupados como a própria Withings agrupa:

**Standard sleep medicine metrics**

| campo | o que é | pacote |
|---|---|---|
| `total_timeinbed` | Total time spent in bed (seconds) | Basic |
| `total_sleep_time` | *"Sum of light, deep and rem durations (seconds)"* | Basic |
| `asleepduration` | Duração quando a noite vem de fonte externa; light/deep/rem ficam nulos | Basic |
| `lightsleepduration`, `remsleepduration`, `deepsleepduration` | durações por fase (seconds) | Basic |
| `sleep_efficiency` | *"Ratio of the total sleep time over the time spent in bed"* | Basic |
| `sleep_latency` | Time spent in bed before falling asleep (seconds) | Basic |
| `wakeup_latency` | Time spent in bed after waking up (seconds) | Basic |
| `wakeupduration` | Time spent awake (seconds) | Basic |
| `wakeupcount` | *"Does not include the number of times the user got out of bed"* | Basic |
| `waso` | Wake After Sleep Onset (seconds) | Basic |
| `nb_rem_episodes` | Count of the REM sleep phases | Basic |

**Sleep apnea and breathing disturbances**

| campo | o que é | pacote |
|---|---|---|
| `breathing_disturbances_intensity` | *"Available for all Sleep and Sleep Analyzer devices (wellness metric)"* | Total |
| **`apnea_hypopnea_index`** | *"Medical grade AHI... Only available for devices purchased in **Europe and Australia**, with the sleep apnea detection feature **activated**"* | Total |
| `withings_index` | igual ao de cima; precisa de **5 h** de sono | Total |

**Other sleep datapoints and vitals**

| campo | o que é | pacote |
|---|---|---|
| `durationtosleep` | **(deprecated)** | Basic |
| `durationtowakeup` | **(deprecated)** | Basic |
| `out_of_bed_count` | vezes que saiu da cama | Basic |
| `hr_average`, `hr_min`, `hr_max` | frequência cardíaca | Total (*Heart Rate* no sono) |
| `rr_average`, `rr_min`, `rr_max` | respiração (breaths per minute) | Total |
| `breathing_quality_assessment` | mesmo texto do `breathing_disturbances_intensity` | Total |
| **`snoring`** | Total snoring time (seconds) | Total |
| `snoringepisodecount` | episódios de ronco ≥ 1 minuto | Total |
| **`sleep_score`** | *"Sleep score"* — e é tudo o que a documentação diz | **Total** |
| `night_events` | dicionário `{tipo: [timestamps]}`. `1` got in bed · `2` fell asleep · `3` woke up · `4` got out of bed · `5` início de período adormecido inserido à mão · `6` idem acordado | Basic |
| `mvt_score_avg` | média do movimento 0–255; Sleep Analyzer (EU) / Sleep Rx (US) | Total |
| `mvt_active_duration` | duração do movimento (seconds); mesmos aparelhos | Total |
| **`rmssd_start_avg`** | *"Heart rate variability - Start average"* | Total |
| **`rmssd_end_avg`** | *"Heart rate variability - End average"* | Total |
| `chest_movement_rate_wellness_{average,min,max}` | respiração (breaths per minute) | Total |
| `breathing_sounds` | tempo com sons respiratórios (seconds) | Total |
| `breathing_sounds_episode_count` | episódios ≥ 1 minuto | Total |
| `chest_movement_rate_{average,min,max}` | chest movement rate (events per minute) | Total |
| `core_body_temperature_{min,max,avg}` | temperatura central (°C) | Total |
| `core_body_temperature_status` | `'unknown'` · `'usual'` · `'elevated'` | Total |

> ### ⚠️ `rmssd` e `sdnn_1` **não existem** no `getsummary`
>
> **[DOC]** A lista acima é completa. No `v2/sleep getsummary` os campos de HRV
> chamam-se **`rmssd_start_avg`** e **`rmssd_end_avg`**. Não há `rmssd`, não há
> `sdnn_1`, não há `sdnn`.
>
> A nossa sondagem de 02/10 pediu **`rmssd` e `sdnn_1` ao `getsummary`** e
> registou "HRV não veio — pedido, e ausente do corpo". **O HRV não veio porque
> foi pedido no endpoint errado**, não por causa de plano nem de assinatura.
>
> Onde o HRV vive de verdade:
>
> | onde | campos |
> |---|---|
> | `v2/sleep get` (alta frequência) | `rmssd`, **`sdnn_1`**, `hrv_quality` |
> | `v2/measure getintradayactivity` | `rmssd`, **`sdnn1`** (sem underscore!), `hrv_quality` |
> | `v2/sleep getsummary` | `rmssd_start_avg`, `rmssd_end_avg` |
>
> **[CONTRADIÇÃO]** O mesmo biomarcador é **`sdnn_1`** no `v2/sleep get` e
> **`sdnn1`** no `v2/measure getintradayactivity`. As duas grafias estão na mesma
> especificação. Quem escrever uma constante partilhada erra num dos dois.
>
> **[DOC]** E há um limite de aparelho independente do pacote: `Heart Rate
> Variability (HRV)` nos trackers é **só ScanWatch 2**; `HRV (Overnight)` é só
> Sleep e Sleep Analyzer.

**Dois outros campos que a nossa medição deu por ausentes, e porquê**

- **"respiração 12 rpm"** — veio. São `rr_average`/`rr_min`/`rr_max`, e vieram
  (12/11/16). Não existe nenhum campo com prefixo `breathing_*` numérico de
  frequência: `breathing_quality_assessment` é uma *intensidade de perturbação*,
  não a frequência. **[DOC]**
- **"SpO₂ do sono 96%"** — **não existe no `getsummary`.** Não há nenhum campo de
  SpO₂ na lista. SpO₂ vem por `getmeas` (`meastype 54`) ou por
  `getintradayactivity` (`spo2_auto`). **[OMISSO]** / **[DOC]**

### 3.4 `v2/measure getintradayactivity`

> **[VERBATIM]**: "If your input `startdate` and `enddate` are separated by more
> than 24h, only the first 24h after `startdate` will be returned."
> "If no `startdate` and `enddate` are passed as parameters, the most recent
> activity data will be returned."

Isto **confirma por documentação** o que a sondagem de 02/10 descobriu por
tentativa: pedir 7 dias devolve vazio/parcial. A correcção para 1 dia está certa.

`data_fields`: `steps` · `elevation` · `calories` · `distance` · `stroke` ·
`pool_lap` · `duration` · `heart_rate` · `spo2_auto` · **`rmssd`** · **`sdnn1`** ·
`hrv_quality` · `core_body_temperature` · `rr` · `chest_movement_rate`. **[DOC]**

A resposta é `series: { "<timestamp>": {...} }` — um dicionário com o epoch como
chave, não um array. **[DOC]**

### 3.5 `v2/measure getworkouts`

`data_fields`: `calories` · `intensity` · `manual_intensity` · `manual_distance` ·
`manual_calories` · `hr_average` · `hr_min` · `hr_max` · `hr_zone_0..3` ·
`pause_duration` (e os restantes partilhados com `getactivity`). **[DOC]**

> **[VERBATIM]**, sobre `intensity`: "Intensity of the workout, from 0 to 100, as
> inputed by the user. If the user didn't manually give the intensity of his
> workout, the value will be 0."

Resposta: `{series, more, offset}`. **Um `series` vazio com `more` e `offset`
presentes é uma resposta bem-formada de "não há treinos"** — não é falta de
permissão. `Workouts` é **Basic**. **[DOC]**

### 3.6 `v2/user get` e `v2/user getdevice`

**`v2/user get` não serve para nós.** **[DOC]**

> **[VERBATIM]**: "**For data privacy reasons, this webservice is only available
> for integration solutions for which the provider is responsible for the account
> creation (ie Withings Cellular Solutions and Withings Mobile SDK
> integrations).** **This webservice will return an error the above condition is
> not met.**"

E, mesmo que servisse, o que devolve é: `email`, `firstname`, `lastname`,
`shortname`, `gender`, `birthdate`, `preflang`, `timezone`, `mailingpref`,
`unit_pref`, `phonenumber`. **Nenhum campo de assinatura.**

**`v2/user getdevice`** (scope `user.info`) devolve, por aparelho: `type`,
`model`, `model_id`, `battery` (`high` >75% / `medium` >30% / `low`), `deviceid`,
`hash_deviceid`, `timezone`, `first_session_date`, **`last_session_date`**,
`sim_status`; e `mac_address`, `fw`, `network`, `last_used_network` marcados
*"advanced partners only"*. **[DOC]**

> **`last_session_date`** — *"The timestamp of the last server connection of the
> device"*. **É o único instrumento documentado para testar sincronização**, e
> por isso é central na hipótese (c). Ver secção 10.

`model_id` relevantes: `44` BPM Core · `45` BPM Connect · `46` BPM Connect Pro ·
`47` BPM Pro 2 · `48` BPM Vision · `90` Move · `91`/`92` Move ECG · **`93`
ScanWatch** · **`94` ScanWatch 2** · `95` ScanWatch Light · `71` BeamO. **[DOC]**

### 3.7 Nenhum endpoint diz o estado de assinatura

**[OMISSO] — e isto é um achado central.**

Varri os **57 endpoints** da especificação. **Não existe nenhum endpoint, nem
nenhum campo em nenhuma resposta, que diga:**

- se o utilizador final tem **Withings+** activo;
- que **pacote de biomarcadores** o nosso `client_id` tem;
- que métricas este utilizador/aparelho **está autorizado** a partilhar.

As palavras `Withings+`, `premium`, `entitlement` e `subscription` (no sentido de
assinatura de pessoa) **não aparecem uma única vez na especificação OpenAPI**.
`subscription` só aparece a falar de **subscrição de webhook**.

**Consequência directa para nós:** não há como perguntar à API "este dado falta
porque não temos direito, ou porque não existe?". A resposta é a mesma nos dois
casos: **corpo bem-formado, lista vazia, `status: 0`**. É exactamente o problema
que a tarefa 119 T-6 existe para resolver, e isto confirma que **não há atalho**:
a distinção tem de ser construída por nós, por comparação ao longo do tempo.

---

## 4. `ecg.afib` — confirmado

A nossa correcção de hoje está **certa**. **[DOC]**, do schema
`heart_measurement_object`:

> **[VERBATIM]**
> `afib`: "Atrial fibrillation classification.
>
> | Value | Description |
> |---|---|
> | 0 | Negative |
> | 1 | Positive |
> | 2 | Inconclusive |"

| valor | documentação | a nossa tradução | veredicto |
|---|---|---|---|
| `0` | **Negative** | "sem sinais de fibrilhação" | ✅ **confirmado** |
| `1` | **Positive** | "fibrilhação" | ✅ **confirmado** |
| `2` | **Inconclusive** | "não classificável" | ✅ **confirmado** |

**Não há outros valores documentados.** Só três. **[DOC]**

E há **confirmação cruzada independente**: a sondagem de 02/10 leu
`ecg.afib: 0`, `heart_rate: 63` para o registo das 23:54 de 01/10, e o app da
Withings mostra, para esse mesmo registo, **"Sinus Rhythm, 63 bpm"**. Número cru
e conclusão deles lado a lado.

**Cuidado de linguagem:** a Withings chama isto *classification*, e os valores são
*Negative* / *Positive* / *Inconclusive* — nunca "normal" nem nome de doença. O
texto para o paciente deve seguir isso: **é um relatório, não um ato médico**. E
`0` = *Negative* significa **"sem sinais de fibrilhação auricular"**, o que é mais
estreito do que "coração normal" — a leitura não exclui nada além de FA.

**Campos vizinhos no mesmo objecto** (`v2/heart list` → `series[]`): **[DOC]**

| campo | o que é |
|---|---|
| `deviceid` | id do aparelho; cruzar com `v2/user getdevice` |
| `model` | `44` BPM Core, `91` Move ECG — **ver o alerta abaixo** |
| `ecg.signalid` | **o id a passar ao `v2/heart get`** |
| `ecg.afib` | `0`/`1`/`2` |
| `bloodpressure.{systole,diastole}` | só com BPM Core |
| `stetho.{signalid,vhd}` | estetoscópio |
| `heart_rate` | frequência média do registo (integer) |
| `modified` | timestamp da última modificação |
| `timestamp` | timestamp da gravação |

> **[CONTRADIÇÃO]** A tabela do campo `model` lista **só `44` (BPM Core) e `91`
> (Move ECG)**, mas a descrição do `v2/heart get` fala explicitamente de
> **ScanWatch**, e a tabela de aparelhos (`user_device_object`) tem `93`
> ScanWatch e `94` ScanWatch 2. **A tabela `model` do `v2/heart` está
> incompleta.** Não assumir que `model` só pode ser 44 ou 91 — um `93`/`94` é
> esperável e não deve quebrar a tela.

> **[DOC]** `v2/heart list`, descrição: "Returns a list of ECG records and Afib
> classification for a given period of time. To get the full ECG signal, use the
> Heart v2 - Get service. **If the ECG recordings have been taken with BPM Core,
> systole and diastole measurements will also be returned.**"

---

## 5. O formato do sinal

**[DOC]**, descrição do `v2/heart get`, citada inteira:

> **[VERBATIM]**
> "Provides the high frequency data of an ECG recording in micro-volt (μV).
>
> **Duration:**
>  - BPM Core: 20 seconds.
>  - Move ECG: 30 seconds.
>  - ScanWatch: 30 seconds.
>
> **Sampling frequency:**
>  - BPM Core: 500 Hz.
>  - Move ECG: 300 Hz.
>  - ScanWatch: 300 Hz."

| pergunta | resposta documentada |
|---|---|
| **unidade** | **micro-volt (μV)** — dito duas vezes: na descrição e no campo `signal` |
| **frequência de amostragem** | **500 Hz** (BPM Core) · **300 Hz** (Move ECG, ScanWatch). E vem no corpo, em `sampling_frequency` |
| **duração** | **20 s** (BPM Core) · **30 s** (Move ECG, ScanWatch) |
| **derivação (Lead I?)** | **[OMISSO]** — a documentação **nunca** diz a derivação. Não diz "Lead I", não diz "single-lead", não diz nada |
| ScanWatch 2 | **[OMISSO]** — não está em nenhuma das duas listas, embora tenha `ECG Signal` na tabela de packs |

**Confere com a nossa medição.** 9.000 amostras ÷ 300 Hz = **30 s** — ScanWatch.
**[INFERÊNCIA]**, mas a aritmética é exacta.

### 5.1 O corpo da resposta, campo a campo

| campo | tipo | o que é |
|---|---|---|
| `signal` | `array<integer>` | *"Signal value in micro-volt (μV)."* Exemplo da doc: `[1,2,3,4,5,6,7,8,9]` |
| `sampling_frequency` | `integer` | *"Signal Sampling Frequency (Hz)."* Exemplo: `500` |
| `wearposition` | `integer` | onde o utilizador tinha o aparelho — **32 valores**, ver abaixo |
| `model` | `integer` | `44` BPM Core, `91` Move ECG (tabela incompleta, ver secção 4) |
| `heart_rate` | `object` | `{grpid, value, date, is_deleted}` — frequência média |

`wearposition`, todos os valores documentados: **[DOC]**

`0` Right Wrist · **`1` Left Wrist** · `2` Right Arm · `3` Left Arm · `4` Right
Foot · `5` Left Foot · `6` Between Legs · `8` Left part of the body · `9` Right
part of the body · `10` Left leg · `11` Right leg · `12` Torso · `13` Left hand ·
`14` Right hand · `15` Cardiovascular aortic area · `16` Cardiovascular pulmonic
area · `17` Cardiovascular tricuspid area · `18` Cardiovascular mitral area ·
`19` Cardiovascular apex area · `20`–`23` Pulmonary front (upper/bottom,
right/left) · `24`–`27` Pulmonary back (upper/bottom, left/right) · `28` Wide mode
area · `29` Between arms · `30` Hold Right · `31` Hold Left

**Não há `7`** na tabela. **[DOC]** (salta de `6` para `8`.)

### 5.2 Dois parâmetros opcionais que provavelmente não estamos a usar

**[DOC]**, e isto é accionável para o PDF do ECG:

| parâmetro | descrição literal |
|---|---|
| **`with_filtered`** | *"Request filtered version of the signal"* (boolean) |
| **`with_intervals`** | *"Request features with inactive ones"* (boolean) |

**[OMISSO]** A documentação **não diz** que filtro é (passa-banda? notch de
50/60 Hz?), nem o que são as *"features"*, nem o formato que `with_intervals`
acrescenta à resposta. Mas **`with_filtered` é o candidato óbvio para o traçado
impresso** — o PDF da Withings mostra um traçado limpo, e é improvável que seja o
sinal cru. **Vale medir.**

### 5.3 Os dois modos de autenticação do `v2/heart get`

**[DOC]** O endpoint tem **dois modos mutuamente exclusivos**, e a especificação
marca **todos** os parâmetros como `required` — o que é um defeito da spec, porque
não se pode cumprir os dois:

| modo | parâmetros |
|---|---|
| **A — com token** (o nosso) | `signalid` + `Authorization: Bearer` |
| **B — assinado** | `client_id` + `signature` + `nonce` + **`signal_token`** |

Cada parâmetro traz a ressalva *"DO NOT USE WITH FOLLOWING PARAMS: [...]"*. No
modo B o identificador do sinal chama-se **`signal_token`**, não `signalid`.
**[OMISSO]** De onde vem o `signal_token` — nenhuma página diz.

---

## 6. Notificações / webhooks

**[DOC]** Lista completa dos `appli`, da página *Payload and Categories*:

| `appli` | scope | o que é | passo seguinte documentado |
|---|---|---|---|
| `1` | `user.metrics` | Weight & body composition | `measure getmeas` |
| `2` | `user.metrics` | Temperature | `measure getmeas` |
| `4` | `user.metrics` | Blood pressure & heart rate | `measure getmeas` |
| `16` | `users.activity` | Activity (steps, distance, workouts) | `getactivity` / `getintradayactivity` / `getworkouts` |
| `44` | `users.activity` | Sleep summary | `v2/sleep get` / `getsummary` |
| `46` | `user.info` | User profile change (`delete`/`unlink`/`update`) | — |
| `50` | `user.sleepevents` | Bed in | — |
| `51` | `user.sleepevents` | Bed out | — |
| `52` | `user.sleepevents` | Sleep sensor inflated | — |
| `53` | — | Unassociated device setup | `v2/user activate` / `link` |
| **`54`** | `user.metrics` | **ECG measurement** — *"A new ECG recording was completed."* | **`v2/heart list`** |
| **`55`** | `user.metrics` | **ECG measurement failed** — *"An ECG recording was attempted but failed."* | nenhum — só notificação |
| `58` | `user.metrics` | Glucose | `measure getmeas` |
| `60` | `user.data` | Survey answered | `v2/answers get` |
| `61` | `user.metrics` | Stethoscope | `measure getmeas` |
| **`62`** | `user.metrics` | **Heart Rate Variability (HRV)** — *"New HRV data is available."* | `measure getmeas` |
| `63` | `user.metrics` | Urine biomarkers (U-Scan) | `measure getmeas` |
| `98` | `user.sleepevents` | Bed occupied (10-min poll) — **requer Live Sync** | — |
| `99` | `user.sleepevents` | Bed empty (10-min poll) — **requer Live Sync** | — |
| `100` | `user.sleepevents` | Bed in/out (10-min poll) — **requer Live Sync** | — |

**Sim, há `appli` para ECG — dois.** `54` para gravação concluída e **`55` para
gravação falhada**. **[DOC]** O `55` é valioso: diz que o paciente *tentou* e não
conseguiu, o que nenhuma consulta de dados revela.

E **há um `appli` para HRV: `62`**. **[DOC]**

> **[VERBATIM]**, sobre `98`/`99`/`100`: "**Requires: Live Sync** — requires a
> Withings contract enabling this feature, and Live Sync activation on the
> device."
>
> Mais um gating por **contrato** (nosso), não por assinatura do paciente.

**Campos do payload** (`application/x-www-form-urlencoded`): `userid`, `appli`,
`startdate`, `enddate`, `date` (`YYYY-MM-DD` **ou** epoch, depende do evento),
`deviceid`, `action` (só em `appli=46`: `delete`/`unlink`/`update`). **[DOC]**

**[CONTRADIÇÃO]** menor: a tabela de scopes da Withings escreve
**`user.activity`**; a página de notificações escreve **`users.activity`** (com
`s`) para os `appli` `16` e `44`. Uma das duas está errada — **[INFERÊNCIA]** a
dos scopes (`user.activity`) é a canónica, porque está na página de autorização.

### 6.1 Fiabilidade e segurança do webhook

**[DOC]**, da página *Notifications overview*:

- **Retentativas por notificação**: 5 ciclos em ~5 h — `T+0`, `+10 s`, `+1 min`,
  `+1 h`, `+4 h`. *"Each cycle does 2 HTTP attempts (10 attempts total)."* Com
  jitter aleatório nas últimas.
- O endpoint tem de devolver **HTTP < 400** *"within a few seconds"*.
- **Escalada por subscrição**: 4 falhas seguidas → e-mail de aviso (máx. 4);
  **20 dias de falhas → subscrição cancelada automaticamente**.
- > **[VERBATIM]**: "**Missed notifications are not redelivered.** Once your
  > endpoint is back up, backfill via the Data API using `lastupdate`."
- > **[VERBATIM]**: "Typical delivery delay is under 2 minutes, but it can
  > occasionally be longer. **Withings does not commit to a real-time SLA on the
  > standard plan.**"
- **IPs** publicados como registos DNS TXT:
  `dig +short TXT ipblock-notify.withings.net` (EU) e
  `dig +short TXT ipblock-notify.us.withingsmed.net` (US Medical Cloud).
  *"Withings updates these records at least one week before any change."*
- Segredo partilhado: pôr um query param secreto no `callbackurl` e validá-lo na
  chegada.
- **É preciso subscrever por utilizador**, um a um (excepto `appli=53`, que é uma
  vez por aplicação). **[DOC]**

---

## 7. Limites e erros

### 7.1 Taxa

**[DOC]**, da página *Notifications overview* — e é **o único número de taxa
publicado em toda a documentação**:

> **[VERBATIM]**: "The standard Withings API enforces a **120
> requests-per-minute limit across your application** (see API plan details).
> Polling for fresh data hits this ceiling quickly and adds latency you can't
> tune."

| plano | taxa |
|---|---|
| Start for Free | **120 req/min** — *"Standard"* na página de planos; o número só aparece aqui |
| Enterprise / Advanced Biomarkers | **1,500+ req/min** |

Atenção ao escopo: **"across your application"** — é um balde por **`client_id`**,
não por utilizador. Com muitos pacientes a sincronizar, 120/min chega depressa.

### 7.2 O erro `601`

**[DOC]** `601` = **"Too many request"** (sic, singular no original).

**[OMISSO]** A documentação **não diz**: qual a janela do balde, se há header de
`Retry-After`, se o balde é por minuto deslizante ou fixo, nem quanto tempo dura o
bloqueio. Nada disso é publicado.

### 7.3 Os códigos de status

**[DOC]** Primeiro, a advertência da própria Withings — e ela explica muito do
nosso desconforto:

> **[VERBATIM]**: "**For security reasons Withings cannot share with partners the
> exact nature of the API error status they may receive.** Instead, we share
> families of errors, and some webservices will also return a detailled message
> about the nature of the error."

As famílias, e o que a Withings manda fazer com cada uma:

| família | instrução literal |
|---|---|
| **Timeout** | "The service encountered a timeout, please retry." |
| **Authentication failed** | "Check if your tokens are correct and properly set." |
| **Invalid params** | "Check your tokens and your params." |
| **Not Implemented** | "The service does not exist." |
| **Unauthorized** | "**You are not allowed to call this service.**" |
| **An error occurred** | "Check your tokens and your params. If the error persists please contact us." |

A tabela de valores (intervalos, como a Withings publica):

| valor | família |
|---|---|
| **`0`** | **Operation was successful** |
| `100..102`, `200` | Authentication failed |
| `201..213` | Invalid params |
| **`214`** | **Unauthorized** |
| `215` | An error occurred |
| `216..218` | Invalid params |
| `219`, `222`, `224`, `226` | An error occurred |
| `220..221`, `223`, `225`, `227..230` | Invalid params |
| `231..233` | An error occurred |
| `234..236`, `238`, `240..252`, `254` | Invalid params |
| `237`, `253`, `255..259` | An error occurred |
| `260..267`, `271..272`, `275..276` | Invalid params |
| `268..270`, `273..274` | An error occurred |
| **`277`** | **Unauthorized** |
| `278..282`, `289`, `291..292`, `296`, `298` | An error occurred |
| `283..288`, `290`, `293..295`, `297` | Invalid params |
| `300..304`, `321`, `323..353` | Invalid params |
| `305..320`, `322`, `370..375`, `383`, `391` | An error occurred |
| `380..382`, `400` | Invalid params |
| `401` | Authentication failed |
| `402` | An error occurred |
| `501..511`, `523`, `532` | Invalid params |
| `516..521`, `525..531`, `533` | An error occurred |
| **`522`** | **Timeout** |
| **`524`** | **Bad state** |
| **`601`** | **Too many request** |
| `602`, `700`, `1051..1054`, `2551..2552` | An error occurred |
| **`2553`**, **`2555`** | **Unauthorized** |
| **`2554`** | **Not implemented** |
| `2556..2559`, `3000..3016`, `3020..3024` | An error occurred |
| `3017..3019` | Invalid params |
| `5000..5006`, `6000`, `6010..6011`, `9000`, `10000` | An error occurred |

> **Os códigos "Unauthorized" são `214`, `277`, `2553` e `2555`.** **[DOC]**
>
> **[INFERÊNCIA], e é importante:** se a falta de pacote de biomarcadores fosse
> sinalizada, seria **aqui** — um destes quatro. Mas a nossa medição de 01/10 deu
> **`status: 0`** (sucesso) com `signal` vazio. **A Withings tinha um código para
> dizer "não tens direito" e não o usou.** Isso é evidência — fraca, mas na
> direcção de que **não foi uma negação de autorização**.

### 7.4 Janelas por endpoint, consolidado

| endpoint | janela máxima | fonte |
|---|---|---|
| `v2/measure getintradayactivity` | **24 h** | **[DOC]** explícito |
| `v2/sleep get` | **24 h** (notas) / **7 dias** (campo `enddate`) | **[CONTRADIÇÃO]** |
| `measure getmeas` | **[OMISSO]** — paginar por `offset`/`more` | — |
| `v2/measure getactivity` | **[OMISSO]** — `offset`/`more` | — |
| `v2/measure getworkouts` | **[OMISSO]** — `offset`/`more` | — |
| `v2/sleep getsummary` | **[OMISSO]** — `offset`/`more` | — |
| `v2/heart list` | **[OMISSO]** — `startdate`/`enddate` **opcionais**, `offset`/`more` | — |

**[DOC]** A Withings recomenda **`lastupdate`** em vez de `startdate`+`enddate`:

> **[VERBATIM]**: "Check the max(`modified`): Look at the maximum `modified`
> timestamp you've already stored for this data type. ... use this max(`modified`)
> as your `lastupdate` parameter. The API will then return all data that has been
> created or modified after this timestamp."

Isto resolve janela **e** notificação perdida de uma vez. O `heart list` devolve
`modified` por registo — **dá para usar `lastupdate` no ECG também**, e evita a
janela de 7 dias fixa que a nossa sondagem usa.

### 7.5 Autorização: os scopes, todos

**[DOC]** São **quatro**, e só quatro:

| scope | o que permite (literal) | webservices |
|---|---|---|
| `user.activity` | "Get data related to user physical activity and sleep activities. Also required for notification management." | `getactivity`, `getintradayactivity`, `getworkouts`, `v2/sleep get`, `v2/sleep getsummary`, `notify *` |
| **`user.metrics`** | "Get data related to user health measurements, **heart recordings**, stethoscope data, and user goals. Also required for notification management." | `measure getmeas`, **`v2/heart get`**, **`v2/heart list`**, `measurev2 confirmuser`, `user getgoals`, `stetho get/list`, `notify *` |
| `user.info` | "Access user account information, linked devices, goals, and manage device linking." | `user get`, **`user getdevice`**, `user getgoals`, `user link`, `user unlink`, `notify list/subscribe` |
| `user.sleepevents` | "Scope used to receive notifications when sleep events happen (bed in, bed out, inflate done)." | `notify list/subscribe` |

> **Isto exclui o scope como hipótese.** **`v2/heart list` e `v2/heart get`
> partilham exactamente o mesmo scope (`user.metrics`).** O `list` funcionou em
> 01/10; logo o `user.metrics` estava concedido; logo o `get` não pode ter falhado
> por scope. **[DOC]** + **[INFERÊNCIA]**

Outros detalhes de OAuth: o `code` de autorização vale **30 segundos**. **[DOC]**
Existe um **utilizador de demonstração** (`mode=demo` no `authorize2`) — útil para
QA sem tocar paciente real. **[DOC]**

### 7.6 Raw data — fora do nosso alcance

> **[VERBATIM]**: "**Contracted partners only** — Access to raw data is a special
> feature available only for contracted partners."

PPG + acelerómetro a ~25 Hz, **só ScanWatch**. E dois avisos duros: **[DOC]**

> **[VERBATIM]**: "Raw data activation will put the Withings device in a specific
> mode that will **disable all features except raw data capture**."
> "Raw data activation will **strongly impact battery life** ... it will typically
> drop four to seven times faster ... For Withings ScanWatch, continuous
> collection of raw data would reduce battery life to **3-4 days**."

Nada disto é o ECG — é outra via de sinal. Não serve para o traçado.

---

## 8. Tudo o que depende da assinatura do utilizador final

Varri **todas** as páginas por `subscription`, `Withings+`, `premium`,
`entitlement`, `requires`, `not available`, `membership`. O resultado é curto, e
está **todo numa só página**: a de planos.

**[DOC]** O banner, no topo da página de planos:

> **[VERBATIM]**
> "**Withings+ becomes required on the Start for Free API plan from October 12,
> 2026.**
> Withings accounts created after that date will need a membership to share
> health data with a free-plan app, including apps that are already live.
> Accounts created before that date are unaffected, and Enterprise lifts the
> requirement for specific use cases."

**[DOC]** As notas de pé da tabela:

> **[VERBATIM]**
> "¹ Applies to Withings accounts created after October 12, 2026. **Accounts
> created before that date keep sharing health data with no membership
> required.**"
> "³ The Withings+ requirement can be removed for specific use cases: Cellular
> Solutions, SDK and Research partners."

**[DOC]** E o FAQ, que é a parte mais explícita de toda a documentação:

> **[VERBATIM]** — *"Does this affect my existing app and users?"*
> "**Your existing users are fine.** Withings accounts created before October 12,
> 2026 keep sharing data with no membership required, and your app keeps its
> current user limit. Withings accounts created after that date will need an
> active Withings+ membership to connect, unless your app is on Enterprise or
> Advanced Biomarkers."

> **[VERBATIM]** — *"What if a user lets their Withings+ membership lapse?"*
> "**Sharing pauses until the membership is active again.** Historical data is
> not deleted, and sharing resumes where it left off. On Enterprise and Advanced
> Biomarkers the requirement is lifted for the specific use cases covered by your
> agreement."

> **[VERBATIM]** — *"Can my users share through Apple Health or Google Health
> instead?"*
> "**No. The requirement covers those routes too.** Integrating directly with the
> Withings API on Enterprise is the only way to guarantee your users can share
> data without their own membership."

> **[VERBATIM]** — *"Do I pay for my users' Withings+ memberships?"*
> "**No.** On Enterprise and Advanced Biomarkers the requirement is lifted for the
> specific use cases in your agreement. Your users do not subscribe individually
> and there is no per-member charge."

> **[VERBATIM]** — *"Why is Withings introducing this?"*
> "Withings+ funds the clinical validation, regulatory clearances and
> infrastructure behind the data you consume. Tying open data sharing to either a
> membership or a commercial agreement keeps that investment sustainable, and the
> API genuinely free to build on."

> **[VERBATIM]** — *"What counts as an 'active user'?"*
> "An end user whose Withings account is currently connected to your app with a
> valid authorization. When a user disconnects, the slot frees up."

### 8.1 A leitura exacta disto, e o que importa para nós

**Quatro propriedades desta regra, e cada uma importa:**

1. **É tudo-ou-nada, não por métrica.** O verbo é *"share health data"* /
   *"connect"* / *"Sharing pauses"*. **Não há uma única frase que ligue
   Withings+ a um biomarcador específico**, e muito menos ao ECG. Se o Withings+
   faltar, **tudo** para — não é o traçado que desaparece sozinho.
2. **Tem data: 12/10/2026.** Hoje é **02/10/2026**. A regra **ainda não está em
   vigor**.
3. **Aplica-se por data de criação da conta**, não por data de uso. Contas
   anteriores a 12/10/2026 ficam **isentas para sempre**.
4. **Pode ser removida por contrato.** Enterprise e Advanced Biomarkers levantam a
   exigência. E a Withings diz explicitamente que **não se paga por utilizador**.

**Isto é a resposta de produto à pergunta "vamos ter de pedir ao paciente que
assine o relógio?":**

> **[DOC]** Para os pacientes de hoje, **não** — contas criadas antes de
> 12/10/2026 estão isentas, permanentemente.
>
> Para **pacientes novos a partir de 12/10/2026**, no plano grátis, **sim** — e
> a saída documentada **não é fazer o paciente pagar**: é o **Enterprise**, onde
> a própria Withings diz *"Your users do not subscribe individually and there is
> no per-member charge."*
>
> E a porta de trás está fechada: pedir via **Apple Health / Google Health não
> contorna** a regra. **[DOC]**

### 8.2 E o que **não** depende da assinatura

**[OMISSO] e vale afirmar pela negativa**, porque é o núcleo da pergunta:

- A especificação OpenAPI — **57 endpoints** — **nunca** menciona `Withings+`,
  `premium`, nem assinatura de utilizador. Zero ocorrências.
- A página *Available Health Data* — a que define os packs — **nunca** menciona
  assinatura, Withings+ nem membership. **O eixo dela é só "which API plan".**
- O `v2/heart get` e o `v2/heart list` **não têm uma palavra** sobre assinatura,
  plano ou pacote nas suas descrições.
- **Não há nenhuma página da Withings que diga que o sinal bruto do ECG depende de
  o utilizador ter Withings+.**

Os **outros** gatings documentados são **todos do nosso lado do contrato**, nunca
do paciente:

| o que está trancado | por quê | fonte |
|---|---|---|
| `ECG Signal`, `AFib (ECG)`, QT/PR/QRS, SpO₂ Auto, AHI, vascular age | **Total Biomarker Pack / Advanced Biomarkers** — plano de API | packs + planos |
| `sleep state: 15` (out of bed) | *"require a specific plan"* | OpenAPI |
| `appli` `98`/`99`/`100` (Live Sync) | *"requires a Withings contract enabling this feature"* | notificações |
| Raw data (PPG/accel) | *"Contracted partners only"* | raw-data |
| `mac_address`, `fw`, `network` em `getdevice` | *"advanced partners only"* | OpenAPI |
| `v2/user get` | só Cellular Solutions / Mobile SDK | OpenAPI |
| > 10 utilizadores activos | revisão da app pela Withings | planos |

E há gatings que não são contrato nenhum — são **geografia e aparelho**:

| limite | detalhe |
|---|---|
| `apnea_hypopnea_index` | *"Only available for devices purchased in **Europe and Australia**, with the sleep apnea detection feature **activated**"* |
| `mvt_score`, `mvt_score_avg`, `mvt_active_duration` | só Sleep Analyzer (EU) e Sleep Rx (US, sob prescrição) |
| `withings_index` | só Sleep Rx; e precisa de **5 h** de sono |
| Pulse Wave Velocity, Nerve Health Score | 🇪🇺 só aparelhos comprados na Europa |
| Nerve Response Score | 🇺🇸 só aparelhos comprados nos EUA |
| `HRV` (trackers) | **só ScanWatch 2** |
| Sleep / Sleep Rx vs Sleep Analyzer | *"Sleep and Sleep Rx are available only in the US. Sleep Analyzer is available only in the EU, Australia and the UK."* |

**[INFERÊNCIA]** Esta última tabela é a que mais vai morder uma clínica no Reino
Unido: metade das métricas de sono "Total" dependem de um **Sleep Analyzer**, que
é o aparelho de cabeceira — não do relógio. Comprar o pacote não as traz se o
aparelho não existir.

### 8.3 O lado do consumidor — e a frase que fecha a questão

Até aqui, só documentação de programador. Mas o Withings+ é um produto de
**consumidor**, e a Withings publica, no site de produto e no centro de ajuda,
exactamente o que ele tranca. **E diz, literalmente, que o ECG não é trancado.**

**[DOC]** FAQ da página de produto dos relógios com ECG — idêntica nas versões
US e UK (https://www.withings.com/en-us/pages/ecg-watches ·
https://www.withings.com/en-uk/pages/ecg-watches):

> **[VERBATIM]** — *"Do I need a Withings+ subscription to take an ECG?"*
> "**Taking and viewing an ECG does not require a Withings+ subscription.** The
> Cardio Check-Up cardiologist review though is a separate, Withings+
> subscription-only feature: you submit a recording you have already taken, a
> board-certified cardiologist reviews it, and you receive a report in under 24
> hours. This feature needs a subscription, but **the ECG feature and atrial
> fibrillation detection are included with your watch without any
> subscription**."

> **[VERBATIM]** — *"Can I export an ECG as a PDF to send to my doctor?"*
> "Yes, you can export and share your ECG as a PDF directly in your Withings App,
> **for free**. You can't share an ECG directly through your watch though."

> **[VERBATIM]** — *"Where do I find my past ECG recordings?"*
> "**Every recording is saved in the Withings app**, where you can look back
> through them in the ECG results and share any of them with your doctor."

E sobre o **traçado bruto** estar no PDF — **[DOC]**, de
https://support.withings.com/hc/en-us/articles/17091647688465-ScanWatch-2-Sharing-ECG-recordings-with-your-doctor
(actualizado 26/09/2026):

> **[VERBATIM]**
> "Interval measurements (such as PR, QRS, and QT) will no longer shown in the ECG
> PDF report. While interval measurements are no longer shown, the current report
> continues to provide key information such as heart rhythm analysis, heart rate,
> and **the raw ECG waveform**, which can still be shared with your doctor for
> further interpretation."

**Três coisas saem disto:**

1. **O ECG — gravar, ver, histórico, PDF, e o traçado bruto dentro do PDF — é
   grátis, por declaração explícita da Withings.** O único elemento de ECG atrás
   do Withings+ é a **revisão humana por cardiologista** (*Cardio Check-Up*), que
   é um serviço clínico deles e não um dado.
2. **A Withings mudou o PDF**: os intervalos PR/QRS/QT **já não aparecem** no
   relatório. Se o PDF que o Bruno mandou tem esses intervalos, é de uma versão
   anterior. Se vamos gerar o nosso PDF, **podemos ser mais completos que o deles**
   — os intervalos continuam acessíveis por `getmeas` (`meastype` `135`–`138`,
   pacote **Total**).
3. **Quando a assinatura cai, o aparelho não perde funções.** **[DOC]**, dos
   Termos e Condições:
   > **[VERBATIM]**: "the Withings+ service will be discontinued with all included
   > features on the date your subscription ends. **Your devices and all their
   > features will continue to function normally.**"

   E do FAQ do Withings+:
   > **[VERBATIM]**: "Withings+ is a subscription service that offers users an
   > enhanced experience with a range of unique features. **All the rest of the app
   > (what we already have) will remain free for our users.**"

#### O que o Withings+ tranca de verdade

**[DOC]** Não há **nenhuma página oficial com uma matriz "grátis vs Withings+"**
— **[OMISSO]**. A lista abaixo foi montada varrendo o centro de ajuda artigo a
artigo. Cada linha tem declaração explícita:

| trancado atrás do Withings+ | citação |
|---|---|
| **Health Improvement Score** | *"a way for you to track your overall wellness journey **as a Withings+ user**"* |
| **Health Tab** (Longevity, Body, Lifestyle Intelligence, BodyPath, Body Profile) | *"available only to BodyScan 2 and BodyFit users **with Withings+**"* |
| **Glucose Resilience** | *"**reserved for Withings+ users**"* |
| **Cardio Check-Up** (revisão de ECG por cardiologista) | *"A Withings+ subscriber is provided with 4 free check-ups per year."* |
| **Withings Intelligence / Health Assistant** e **Smart Trends** | *"**exclusively available to Withings+ subscribers**"*; *"Smart Trends (W+ only)"* |
| **StethO Sense AI** (BeamO) | *"Is StethO Sense available without Withings+? **No. A Withings+ subscription is required.**"* |
| **Readiness** — só a camada extra (o indicador base é grátis) | *"Additional features available to Withings+ users"* |
| **"My Focus"** no ecrã inicial | *"Only available to Withings+ users."* |
| **Mission screen** no visor da balança | *"Withings+ subscribers benefit from a unique Personalized Insight screen"* |
| **Withings+ Protect** (garantia estendida, só EU) | *"available only while you hold an active, paid Withings+ Membership"* |
| **Year in Review** — acesso automático | sem W+, exige *"at least 30 days of registered activity"* |

**E o que, por varredura completa, não tem uma única menção a Withings+:**
**ECG** (gravar, resultados, histórico, PDF), **detecção de AFib**, **HRV**,
**SpO₂**, **sleep score**, **detecção de apneia do sono / AHI**, **vascular age**,
**Health Report PDF / HealthLink** para profissional de saúde, e **exportação CSV**
de todos os dados. **[DOC]**

**Isto confirma a nossa própria tabela da 119.** Lá já estava escrito que o
**Health Improvement Score** é *"Withings+, do consumidor"* — e está certo. E que
Readiness, Recovery e Effort são *"pontuação deles"*. Também certo.

**Um limite que vale conhecer:** o **Health Report PDF / HealthLink** da Withings
cobre **no máximo 3 meses**, para **todos**, assinantes incluídos — e o link
expira em 7 dias e vai anonimizado. **[DOC]** Isso é um argumento para o nosso
próprio relatório: o histórico da clínica não tem esse tecto.

#### O preço, e porque os números não batem

**[CONTRADIÇÃO]** A Withings publica **três preços diferentes** para a mesma
assinatura, dependendo do canal:

| fonte | mensal | anual |
|---|---|---|
| Centro de ajuda, *Subscribing to Withings+* (act. 21/09/2026) | 9,95 €/$ · **£8,95** | 99,50 €/$ · **£89,50** |
| Centro de ajuda, *Withings+ FAQ* | €9,95 / $9,95 / £8,95 | €99,95 / $99,95 / **£89,95** |
| **Termos e Condições** | — | *"automatically charged 99.95€ (or $99.95 or £89.95) per year"* |
| **App Store UK** (compra dentro da app) | **£9,99** | **£99,99** |

> **O £99,99 que medimos é o preço de compra dentro da app, na App Store do Reino
> Unido.** O site da Withings diz **£89,50 / £89,95**. Não é erro nosso: são
> canais com preços diferentes.

**O teste gratuito** — **[DOC]**, e isto importa para a data de 16/10:

> **[VERBATIM]**: "All Withings products purchased through the Withings Web Store
> come with **1 month free** of Withings+."
> "**Note:** Subscribing directly through the Withings App will offer a **2-week
> free trial**. In order to get the 1-month deal, you must purchase a qualifying
> product through the Withings Web Store."

**Duas semanas** se foi assinado dentro da app — o que bate com a nossa estimativa
de 16/10/2026. **[INFERÊNCIA]**

**[OMISSO]** A página de marketing oficial do Withings+
(`withings.com/en-uk/pages/withings-plus`) **não publica preço nenhum**, e três
das suas quatro abas (*Body*, *Recovery*, *Cycle*) são carregadas por JavaScript
só ao clique — **não foi possível ler o que dizem**. Se a lista de funcionalidades
vier a importar juridicamente, essas três abas precisam de ser abertas à mão.

### 8.4 E o Withings+ afecta a partilha com apps de terceiros?

**[OMISSO] — e, por implicação, não.** Varrendo o centro de ajuda, a única
coocorrência de "Withings+" com partilha/parceiros/API é o *Share Tab* a listar o
*Cardio Check-Up* como serviço de assinatura. A secção de apps parceiros ao lado
**não tem nenhuma condição de assinatura**.

**[DOC]** Os dois artigos sobre apps parceiros dizem o contrário, por implicação:

> **[VERBATIM]**: "**Important:** Because we have an **open API**, our partners
> get to decide which data is shared between the apps."

**[INFERÊNCIA]** Isto é texto escrito **antes** do anúncio de 12/10/2026 e
provavelmente vai ficar desactualizado. Mas, hoje, **o lado do consumidor da
Withings não diz em nenhum lugar que uma assinatura é necessária para partilhar
dados com um app de terceiros** — e o lado do programador diz que passa a ser, só
para contas novas, só a partir de 12/10/2026.

---

## 9. Sobre fontes de terceiros

Durante a pesquisa apareceram resultados de busca a afirmar coisas como
*"Free (Basic biomarkers, 1000 active users), Enterprise (Basic, unlimited users,
1500+ req/min), Healthcare (advanced as add-ons), Research (everything)"* e
*"Basic pack (41 metrics) vs Total pack (45 metrics)"*.

**Tratar com cuidado:**

- A parte dos **planos** bate com a versão **arquivada** da página (10/02/2026) —
  ou seja, está **desactualizada** face à página de hoje (10 utilizadores, não
  1.000; três planos, não quatro; e Withings+).
- A contagem **"41 vs 45"** **não bate** com a página de hoje, onde contei **49
  linhas Basic e 47 Total**. Pode ser contagem de nomes únicos, ou de uma versão
  anterior. **Não usar.**
- Um dos resultados de busca devolveu uma descrição do comportamento "campo
  simplesmente ausente, indistinguível de 'não há ECG'" que vinha de **um PR do
  nosso próprio repositório** (`brunoto02028/clinic#207`). **Isso não é
  confirmação independente — é o nosso próprio texto a voltar.** Descartado.
- **Blogs de SEO** (`carefocusdaily.com`, `wellness.alibaba.com`,
  `thewearify.com`) afirmam que *"PDF export of all health data"* e
  *"lifetime storage of medical data"* são benefícios **exclusivos** do Withings+.
  **Não há base nenhuma para isso em fonte Withings** — a exportação em PDF e em
  CSV está documentada como livre. **Descartado.**
- **Imprensa:** a Notebookcheck, ao noticiar o *Cardio Check-Up*, cita
  *"£89.50/€99.95"* ao ano — **corrobora o preço do site**, e não o £99,99 da App
  Store. Útil só como confirmação secundária.
- **Reddit e fóruns: não foram lidos.** `reddit.com` está bloqueado para o agente
  de busca. **Não há nenhum relato de utilizador neste documento**, nem a favor
  nem contra.

**Nenhuma afirmação deste documento depende de fonte de terceiros.**

**Nota de método sobre o centro de ajuda:** `support.withings.com` devolve **403**
a fetch directo. As citações do centro de ajuda foram lidas pela API pública de
Zendesk (`/api/v2/help_center/en-us/articles.json`, 2.210 artigos), que devolve o
corpo íntegro dos mesmos artigos. As URLs `html_url` citadas são as canónicas e
abrem num browser normal.

---

## 10. O que isto responde sobre o nosso caso

### 10.1 Os factos, lado a lado

| | **01/10/2026** (sem Withings+) | **02/10/2026** (com Withings+) |
|---|---|---|
| `v2/measure getactivity` | ✅ veio | ✅ veio |
| `measure getmeas` | ✅ veio | ✅ veio (16 grupos) |
| `v2/sleep getsummary` | ✅ veio | ✅ veio (`sleep_score: 47`) |
| `v2/measure getintradayactivity` | ✅ veio (`intradayDays: 1`) | ⚠️ vazio (**janela de 7 dias — erro nosso**) |
| **`v2/heart list` → `ecg.afib`** | **✅ veio** | ✅ veio (2 registos) |
| **`v2/heart get` → `signal`** | **⚠️ vazio, `status: 0`** | **✅ 9.000 amostras** |
| `v2/sleep get` (hipnograma) | ⚠️ vazio (**`data_fields` inválido — erro nosso**) | ✅ 12 fases |
| HRV (`rmssd`, `sdnn_1` no `getsummary`) | ❌ ausente | ❌ ausente (**endpoint errado — erro nosso**) |

### 10.2 Hipótese (a) — o pacote de biomarcadores da **nossa** chave

**O que a documentação suporta:**

- ✅ **O mecanismo existe, e é exactamente este.** `ECG Signal` é **Total
  Biomarker Pack**; na página de planos, *"FDA/CE cleared biomarkers: ECG, AFib,
  SpO₂, vascular age, AHI"* é **✗ no Start for Free e ✗ no Enterprise**, **✓ só no
  Advanced Biomarkers**. Era assim também na versão antiga. **[DOC]**
- ✅ A Withings **confirma que gating por plano devolve ausência silenciosa** em
  pelo menos um caso análogo: `sleep state: 15` *"require a specific plan"* — e
  não há código de erro associado; o valor simplesmente não aparece na série.

**O que a documentação exclui, ou torna muito improvável:**

- ❌ **`ecg.afib` chegou em 01/10.** E `ecg.afib` está no **mesmo pacote
  (Total)**, para os **mesmos aparelhos**, catalogado pela própria Withings na
  mesma tabela, duas linhas acima de `ECG Signal`. Se o pacote fosse a tranca, o
  `afib` tinha de estar trancado também. **Não estava.**
- ❌ O mesmo vale para o `sleep_score`, que é **Total**, e veio.
- ❌ E para `hr_average`/`rr_average` do sono, que são **Total**, e vieram.
- ❌ O activar o **Withings+ do consumidor não muda o nosso pacote de API.** São
  contratos de lados opostos. Nada na documentação sugere que uma assinatura de
  pessoa física altere o entitlement de um `client_id`. Então **(a) não pode
  explicar uma mudança que aconteceu de um dia para o outro por causa do
  Withings+** — (a) é estático em relação a esse evento.

**Veredicto de (a):** o mecanismo é real e é a tranca certa para o **futuro**
(se quisermos ECG garantido por contrato, é *Advanced Biomarkers*). Mas **(a) não
explica a observação de 01/10 → 02/10**. Pelo contrário: o facto de termos lido
`afib`, `sleep_score` e o `signal` com uma chave aparentemente no plano grátis
sugere que **o gating por pacote não está a ser aplicado ao nosso `client_id`** —
por antiguidade, por o pacote já estar concedido, ou por não ser aplicado neste
endpoint. **[INFERÊNCIA]**

**Como se decide, de vez:** abrir o **Withings Partner Hub**
(`developer.withings.com/dashboard`) e ler o plano da aplicação. É login do Bruno
— não consigo e não devo. **É uma pergunta de 30 segundos para quem tem a conta.**

### 10.3 Hipótese (b) — o **Withings+** do paciente

**O que a documentação suporta:**

- ✅ **O mecanismo existe.** Está documentado, por extenso, e é sério: *"Sharing
  pauses until the membership is active again."*

**O que a documentação exclui:**

- ❌ **Data.** A regra entra em vigor em **12/10/2026**. A medição é de
  **01–02/10/2026**. **Não estava em vigor.**
- ❌ **Conta.** Aplica-se *"to Withings accounts created **after** October 12,
  2026"*. A conta do Bruno é anterior. *"Accounts created before that date keep
  sharing health data with no membership required."* **Isento.**
- ❌ **Granularidade.** A regra é sobre **partilhar dados de saúde**, ponto. Se
  tivesse morder, teria mordido **tudo**. Mas em 01/10, sem Withings+, vieram
  passos, medições pontuais, resumo do sono, e **a conclusão do ECG**. **Um gate
  tudo-ou-nada que deixa passar 5 de 6 chamadas não é um gate tudo-ou-nada.**
- ❌ **Declaração explícita em contrário, do lado do consumidor.** **[DOC]**
  > **[VERBATIM]**: "**Taking and viewing an ECG does not require a Withings+
  > subscription.** ... **the ECG feature and atrial fibrillation detection are
  > included with your watch without any subscription**."
  > "Yes, you can export and share your ECG as a PDF directly in your Withings
  > App, **for free**."

  E ainda: *"**Your devices and all their features will continue to function
  normally**"* quando a assinatura termina. Nenhum artigo do centro de ajuda sobre
  ECG, HRV, SpO₂, sleep score ou apneia menciona Withings+ — nem uma vez. O único
  elemento de ECG atrás da assinatura é a **revisão humana por cardiologista**.
- ❌ **Nenhuma página liga Withings+ ao ECG.** Nem à API, exceto pela regra geral
  de partilha. **[OMISSO]**

**Veredicto de (b):** **a documentação exclui (b)**, por **quatro razões
independentes** — data (12/10/2026), conta (criada antes, isenta para sempre),
granularidade (a regra é tudo-ou-nada e passaram 5 de 6 chamadas), e **declaração
explícita da Withings de que o ECG e o seu PDF são grátis**. A coincidência
temporal com o teste gratuito é real, mas nenhuma regra documentada a explica.

**A ressalva honesta:** isto exclui o Withings+ **como regra de acesso**. Não
exclui que **o acto de ir assinar** tenha tido um efeito colateral — abrir o app
sincroniza o relógio. Ver (c).

### 10.4 Hipótese (c) — outra coisa

Aqui é onde a documentação aponta. Por eliminação e por indício.

**Excluído: OAuth scope.** **[DOC]** `v2/heart list` e `v2/heart get` partilham
`user.metrics`. O `list` funcionou. Fim.

**Excluído: negação de autorização.** **[DOC]** A Withings tem quatro códigos
*Unauthorized* (`214`, `277`, `2553`, `2555`) e devolveu **`status: 0`**.

**Pouco provável: modelo do aparelho.** 9.000 ÷ 300 Hz = 30 s, o que corresponde
a ScanWatch — e o mesmo aparelho gravou os dois registos. Não mudou de aparelho
entre os dois dias.

**Pouco provável: idade do registo / janela.** O `v2/heart get` não tem janela —
é por `signalid`. **[DOC]**

#### A explicação mais provável, e é desconfortável: **não pedimos o mesmo sinal**

Esta é a descoberta que mais muda o que fazer a seguir, e vem de ler o **nosso**
código, não a documentação deles.

A sondagem escolhe o `signalid` assim:

- `v2/heart list` devolve `series[]`;
- a sondagem guarda **`exemplo: valores[0]`** — **o primeiro elemento da lista**;
- e pede `v2/heart get` com **esse** `signalid`.

Ora: o registo que deu 9.000 amostras em 02/10 é o das **23:54 de 01/10**. Em
01/10, quando a sondagem correu, **esse registo ou ainda não existia, ou não era
`valores[0]`**. **Logo as duas sondagens pediram, muito provavelmente,
`signalid` diferentes.**

**A comparação de 01/10 vs 02/10 não é a mesma pergunta feita duas vezes.** É uma
pergunta sobre o registo X e outra sobre o registo Y. E a conclusão "o Withings+
destravou o traçado" assentava em tratá-las como iguais. **[INFERÊNCIA]**, mas
sobre código que se lê.

#### A segunda explicação, e combina com a primeira: **sincronização**

**[DOC]** A documentação repete isto em **três** lugares — nas tags `measure`,
`heart` e `sleep`:

> **[VERBATIM]**: "The data are only available once a synchronization occured
> between the device and Withings servers (which might include synchronizing with
> **Withings mobile application** or via Withings Mobile SDK)."

E note o que é **activar um teste gratuito do Withings+**: é **abrir o app da
Withings** e tocar em coisas. Abrir o app **força uma sincronização** do relógio.

**[INFERÊNCIA]** A conclusão do ECG (`afib`, `heart_rate`) é um punhado de bytes;
o traçado são 9.000 inteiros. É inteiramente plausível que a conclusão suba numa
sincronização leve e **o traçado só suba numa sincronização completa** — a mesma
que o Bruno provocou ao ir assinar. Isto explicaria **exactamente** o padrão
observado, sem invocar contrato nenhum: `list` cheio, `get` vazio, e depois ambos
cheios.

**[DOC]** E temos instrumento para medir isto: **`v2/user getdevice` →
`last_session_date`**, *"the timestamp of the last server connection of the
device"*.

### 10.5 O veredicto, e o teste que o decide

**Ordenado por quanto a documentação suporta cada um:**

| # | hipótese | suporte |
|---|---|---|
| 1 | **(c) — sondagens pediram `signalid` diferentes** | **forte** — lido no nosso código; e as duas chamadas não são comparáveis |
| 2 | **(c) — sincronização do aparelho** | **forte** — documentado três vezes; e activar Withings+ implica abrir o app |
| 3 | **(a) — pacote de biomarcadores** | **mecanismo real, mas não explica a mudança**; e contrariado por `afib`/`sleep_score` terem vindo |
| 4 | **(b) — Withings+ do paciente** | **excluído** — quatro razões independentes: data, conta, granularidade, e declaração explícita de que o ECG é grátis |
| 5 | (c) — scope OAuth | **excluído** — mesmo scope dos dois lados |
| 6 | (c) — negação de autorização | **excluído** — `status: 0`, e há código próprio para isso |

### 10.6 O que fazer, e o que **não** fazer

**Não fazer:** esperar por 16/10 para remedir às cegas. Esse teste, como está
desenhado, **vai sofrer do mesmo defeito** — vai pedir `valores[0]`, que daqui a
duas semanas será outro registo. Pode "confirmar" qualquer coisa.

**Fazer, por ordem de valor:**

1. **Pedir o `v2/heart get` para o `signalid` EXACTO do registo das 23:54 de
   01/10 — hoje, e outra vez depois de 16/10.** Esse é o teste controlado: mesmo
   sinal, mesma chave, mesmo scope, única variável = assinatura. **Guardar o
   `signalid` agora**, antes que a lista mude. Sem isto, o re-teste não decide
   nada.
2. **Abrir o Partner Hub e ler o plano da aplicação.** Responde (a)
   definitivamente, em 30 segundos, sem medir nada.
3. **Registar `last_session_date` do `v2/user getdevice` em cada sondagem.** É o
   que separa "não temos direito" de "ainda não sincronizou" — e é a única variável
   da hipótese 2 que se pode observar.
4. **Corrigir o HRV: pedir `rmssd_start_avg`/`rmssd_end_avg` ao `getsummary`,
   e `rmssd`/`sdnn_1`/`hrv_quality` ao `v2/sleep get`.** O HRV de 14 ms do app
   dele provavelmente **sempre esteve disponível** — foi pedido no sítio errado.
   Atenção: `sdnn_1` no sleep, **`sdnn1`** no intraday.
5. **Subscrever `appli=54` e `appli=55`.** Em vez de sondar, ser avisado quando um
   ECG é gravado — e **saber quando uma gravação falhou**, que hoje é invisível.
   Resolve a janela e o *polling* de uma vez.
6. **Medir `with_filtered=true` no `v2/heart get`.** É o candidato a traçado
   limpo para o PDF, e é um booleano.
7. **Trocar a janela fixa de 7 dias por `lastupdate`** no `heart list` e nos
   resumos — é a recomendação explícita da Withings, e o `heart list` devolve
   `modified`.
8. **Não prometer HRV, AHI, snoring nem SpO₂ do sono a partir de um relógio.** A
   tabela de aparelhos exclui: HRV nos trackers é **só ScanWatch 2**; AHI e
   snoring querem **Sleep Analyzer**; SpO₂ do sono **não existe no `getsummary`**.
   Isto não é pacote — é aparelho, e comprar plano não resolve.
9. **Construir a 119 T-6 (dizer o campo que desaparece) de qualquer forma.** Não
   porque o Withings+ vai morder em 16/10 — a documentação diz que não vai, para
   esta conta — mas porque **a 12/10/2026 a regra entra em vigor para pacientes
   novos**, e porque **nenhum endpoint da Withings diz se um dado falta por falta
   de direito ou por falta de dado**. A ambiguidade é estrutural, não temporária.

### 10.7 O que isto significa para o produto, em três linhas

- **Não vamos ter de pedir ao paciente que assine o relógio.** Nem para os
  pacientes de hoje (isentos para sempre), nem como solução para os de amanhã — a
  saída documentada é **Enterprise**, onde a Withings diz expressamente que
  *"there is no per-member charge."* E, no lado do consumidor, a Withings afirma
  que *"the ECG feature and atrial fibrillation detection are included with your
  watch **without any subscription**"* e que o PDF do ECG se exporta **"for
  free"**. **[DOC]** **O produto não morre.**
- **O ECG, esse sim, é contrato nosso.** Está no *Advanced Biomarkers*, fora do
  grátis e fora do Enterprise. Se o PDF do ECG vai ser prometido a pacientes, isso
  é uma conversa comercial com a Withings — e **é melhor tê-la antes de
  prometer**, não depois.
- **Antes de qualquer das duas**, fazer o passo 1 e o passo 2. São baratos, e um
  deles pode revelar que não há problema nenhum.

---

## Apêndice — os 57 endpoints da especificação

Para saber o que existe sem ter de renderizar a página. **[DOC]**

**oauth2** (2): `oauth2-authorize` (em `account.withings.com/oauth2_user/authorize2`),
`oauth2-getaccesstoken`
**measure** (5): `measure-getmeas`, `measurev2-getactivity`,
`measurev2-getintradayactivity`, `measurev2-getworkouts`, `measurev2-confirmuser`
**heart** (2): `heartv2-list`, `heartv2-get`
**sleep** (2): `sleepv2-get`, `sleepv2-getsummary`
**stetho** (2): `stethov2-list`, `stethov2-get`
**user** (7): `userv2-get`, `userv2-getdevice`, `userv2-getgoals`, `userv2-link`,
`userv2-unlink`, `userv2-activate`, `userv2-addtorpm`
**notify** (5): `notify-subscribe`, `notify-get`, `notify-list`, `notify-update`,
`notify-revoke`
**device** (4): `devicev2-enablefeature`, `devicev2-disablefeature`,
`devicev2-getfeatures`, `devicev2-endpartnerprogram`
**rawdata** (3): `rawdatav2-activate`, `rawdatav2-deactivate`, `rawdatav2-get`
**survey** (5) + **answers** (1): `surveyv2-{activate,deactivate,get,list,listusers}`,
`answersv2-get`
**nudge** (5) + **nudgecampaign** (8): campanhas de *Health Nudges*
**dropshipment** (5) + **order** (1) + **signature** (1): logística

Nomes de tags/grupos, na ordem da Withings: `oauth2`, `dropshipment`, `order`,
`user`, `measure`, `heart`, `stetho`, `sleep`, `notify`, `survey`, `answers`,
`signature`, `rawdata`, `device`, `models`, `response_status`, `Glossary`,
`nudge`, `nudgecampaign`.

Glossário: a Withings remete para
`https://developer.withings.com/developer-guide/glossary/glossary` — **essa URL
não está no sitemap**, e não a verifiquei. **[OMISSO]**
