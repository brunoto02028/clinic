# Achados do teste no iPhone — 24/09/2026

Lista viva do que o Bruno encontra usando o app de verdade, no aparelho. Cada item com o que
era, o que passou a ser, e como chegou até ele (update OTA ou build novo).

---

## 1. O teclado cobria o campo que estava sendo preenchido

**Onde:** em qualquer tela com formulário — ele viu na avaliação, e disse que acontece em todas.

**O que era:** o `Screen` com `scroll` monta um `ScrollView` que não avisava o iOS sobre o
teclado. Quando o campo ficava na metade de baixo, o teclado subia por cima e a pessoa digitava
sem ver o que estava digitando. Numa triagem clínica isso não é só incômodo: é onde alguém
responde errado por não conseguir conferir.

**A correção:** `automaticallyAdjustKeyboardInsets` no `ScrollView` do `Screen` — o próprio
sistema passa a reservar a altura do teclado. Vale para as **45 telas** que usam esse componente
de uma vez, em vez de um `KeyboardAvoidingView` colado em cada uma. De brinde,
`keyboardDismissMode="interactive"`: arrastar para baixo fecha o teclado, como no resto do iOS.

**Chega por:** update OTA, sem build novo (a partir do build 8).

---

## 2. Não havia botão de voltar — e em algumas telas, saída nenhuma

**Onde:** ele viu na avaliação e nas telas de módulo. E depois na tela de "não incluído no seu
plano", que é a pior das três: só diz "não" e não oferece porta.

**O que era:** três coisas somadas.

1. Os grupos **treino, avaliações, nutrição, BA e lab** definiam `headerShown: false` no layout
   inteiro — nenhuma dessas telas tinha barra, logo nenhuma tinha seta de voltar.
2. O `module-select` entrava no módulo com **`replace`**, que apaga o seletor da pilha. Mesmo com
   header, não haveria para onde voltar: não dava para trocar de área sem fechar o app.
3. O `PlanGate` desenhava o cadeado sem nenhuma ação.

**A correção:** os cinco grupos passam a mostrar o header **só com a seta** — cada tela já desenha
o próprio título grande no conteúdo, então repetir o nome na barra seria ruído. Escolher um módulo
passa a **empilhar**; a escolha automática de quem só tem um módulo continua com `replace`, que é o
certo lá (voltar para um seletor de uma opção só não leva a lugar nenhum). E o cadeado ganhou
"Voltar", quando há para onde.

**Chega por:** update OTA, a partir do build 8.

---

## 3. Conta da clínica entrava no app e ficava presa

Registrado em detalhe no commit `347aee4b`. Resumo: o app aceitava conta de staff, mostrava
módulos, cada tela recusava com 403 e não havia como sair. Agora é recusada no login e no refresh,
com a frase dizendo para usar o bpr.clinic. **Já está em produção** — vale mesmo no binário antigo,
porque o bloqueio é do servidor.

---

## 4. "Não foi possível carregar" quando o servidor dizia 403

Mesma leva. A frase convidava a tentar de novo, e tentar nunca ia resolver. Agora diz que a área
não está disponível para aquela conta.

---

## 5. Sem botão de sair

O "Sair" existia só no ramo de quem não tem nenhum módulo. Quem tinha módulos que não abriam
ficava numa tela com três portas e nenhuma saída. Agora está nos dois ramos.


---

## 6. A foto de perfil não pode ser trocada — porque não existe

**Pedido do Bruno**, e é funcionalidade, não ajuste.

**O que existe hoje:** o avatar no perfil são as **iniciais do nome**, desenhadas
(`ModuleProfile.tsx:73`). Não há foto de paciente em lugar nenhum do app, e não há rota no
servidor que aceite uma. As colunas `profileImageUrl` e `profileImagePath` existem no `User` e são
usadas pelo cadastro por Google — nada além disso as preenche.

**O que precisa:**

1. **Armazenamento** — reusar o pipeline de mídia do R2 (`lib/exercise-media.ts`), que já valida
   tipo e tamanho (`ALLOWED_THUMBNAIL_TYPES`, `MAX_THUMBNAIL_BYTES`). Não inventar um segundo jeito
   de guardar arquivo.
2. **Rotas** — `POST` e `DELETE` em `/api/patient/profile/photo`, com o gate de paciente.
3. **App** — tocar no avatar abre o seletor; o `expo-image-picker` já está instalado e já é usado
   na tela de documentos.
4. **Web** — a mesma coisa no `/dashboard/profile`. Foto que aparece num canal aparece no outro.

**Já coberto:** o encerramento de conta (`lib/account-closure.ts`) já zera as duas colunas — uma
foto é dado pessoal e sai junto com o resto.

**Feito** em 24/09/2026 (T-14). O avatar virou botão: câmera ou galeria, recorte quadrado
obrigatório (o avatar é redondo em toda tela, e sem recorte uma foto deitada entraria esticada).
A mesma foto tem card próprio em `/dashboard/profile`. A anterior sai do R2 depois que a nova
está gravada — se a remoção falhar, o paciente fica com a foto nova e um objeto órfão, nunca sem
foto nenhuma.


---

## 7. Os botões de voltar apareciam, mas não voltavam

*"Os botao de voltar nao funciona revisa tudo"* — e era outra coisa do que o achado 2. Ali
faltava o botão; aqui ele existia e não levava a lugar nenhum.

Duas causas:

1. **O rótulo dizia "(tabs)".** O Expo Router nomeia o botão de voltar com o nome do grupo de
   rotas, e o grupo se chama literalmente `(tabs)`. O paciente lia o nome de uma pasta do nosso
   código. Resolvido com `headerBackTitle: ""` nos layouts de grupo.

2. **Sete botões que não eram botões.** Telas em que a navegação foi feita com `router.replace`
   em vez de `push`: o `replace` troca a tela atual em vez de empilhar, então não há para onde
   voltar — a pilha fica com um item só. O caso mais visível era o seletor de módulos.

Corrigido no commit `27608606`.

---

## 8. O Withings ainda não conecta

*"O wothings quero conectar e ele nao funciona ainda."*

**O que já está pronto do nosso lado:** a confirmação de assinatura por tipo de medida
(peso, pressão, atividade, sono), quatro estados de entrega — `recebendo`, `parcial`, `silencioso`,
`não verificado` —, o botão "Corrigir" que re-assina, e o cron de sincronização de 6 em 6 horas
que o código antes prometia sem cumprir. A tela de dispositivos mostra, em faixa âmbar, **por que**
o Connect está desabilitado, em vez de só não responder ao toque.

**O que falta, e não é código:**

1. **Uma conta Withings dedicada da clínica.** O Bruno criou uma com o Gmail pessoal dele. A
   recomendação é `brunoto02028+bpr@gmail.com` — separa o aparelho da clínica do aparelho de casa.
2. **Um perfil só no BPM Connect.** O aparelho divide as medições entre os perfis cadastrados; com
   dois, metade das leituras vai para o lugar errado e nunca chega.
3. **A URL de callback conferida** em `https://bpr.clinic/api/wearables/callback`.
4. ~~**O ambiente da aplicação, que segue em `Development`.**~~ **Resolvido em 24/09/2026**, com o
   Bruno logado no painel deles. Ver abaixo.

### O que foi corrigido no painel da Withings (24/09/2026)

Conferido campo a campo contra a produção, e **a configuração estava certa**: ClientID idêntico,
Secret terminando em `4735`, callback `https://bpr.clinic/api/wearables/callback` exato, API
endpoint `https://wbsapi.withings.net` — que é a nuvem que o nosso código chama. O `NEXTAUTH_URL`
com `bpr.rehab` que apareceu no Coolify é do ambiente de **preview** (`is_preview: true`); a
produção está com `bpr.clinic`.

Duas coisas mudaram:

1. **A URL de notificação não estava registrada — e é provavelmente a causa real.** O campo do
   painel diz "Register the URLs you will be using for the OAuth2 services **and data notification
   services**", e só o callback do OAuth estava lá. Mas são caminhos **diferentes**:

   ```
   OAuth        https://bpr.clinic/api/wearables/callback
   notificação  https://bpr.clinic/api/wearables/withings/webhook
   ```

   A Withings só assina notificação para URL registrada. Sem a segunda, a conexão é feita e o dado
   nunca chega — exatamente o sintoma. Registrada agora.

2. **`Development` → `Production`.** O dropdown oferecia Development / Stage / Production, sem
   contrato de permeio. ClientID e Secret **não mudaram**, então nenhuma conexão existente foi
   invalidada.

Nosso lado já estava pronto e foi provado ao vivo antes de mexer em qualquer coisa:

```
webhook em produção   HEAD  HTTP 200
                      GET   HTTP 200  {"status":0}
                      POST  HTTP 200  {"status":0}
```

### Provado de ponta a ponta, 24/09/2026 16:23

O Bruno pareou o BPM Connect no Wi-Fi (conta Withings do Gmail dele, **um perfil só**), conectou
no `/dashboard/devices` e mediu. A assinatura, que antes a Withings recusava:

```json
{"confirmed":[1,4,16,44],"missing":[],"delivery":"receiving"}
```

Os quatro tipos — `1` peso, `4` **pressão**, `16` atividade, `44` sono. E as duas medições
chegaram em segundos, sem nenhuma intervenção:

| horário  | sis | dia | pulso | fonte            |
|----------|-----|-----|-------|------------------|
| 16:21:11 | 154 |  98 |    60 | PATIENT_DEVICE / HOME |
| 16:23:06 | 171 |  90 |    61 | PATIENT_DEVICE / HOME |

Caminho completo: aparelho → Wi-Fi → Withings → webhook → banco → API do paciente.

Sobre `method: "MANUAL"` no registro: **não é defeito.** Nesse enum `MANUAL` quer dizer braçadeira
oscilométrica, por oposição a `CAMERA_PPG`; quem diz a origem é `source: "PATIENT_DEVICE"`, que a
ingestão grava corretamente (`lib/withings-ingest.ts`, com comentário sobre isto). O nome do valor
é que engana quem lê o JSON — eu mesmo caí nele.

**Ainda pendente, e é outro cenário:** a conta Withings dedicada da clínica, para o aparelho de
consultório que mede vários pacientes. O que foi validado hoje é o aparelho **do paciente**, na
conta dele. Ver [[aparelho-pressao-clinica]].

Ver também [[withings-api-limites]].

---

## 9. Varredura das 63 telas — todas têm saída

Depois das correções 2 e 7, varri **todas** as telas do app procurando as que não têm header,
nem `router.back`, nem logout. Sobraram 15, e todas são legítimas:

- **raízes de aba** (clínica, BA, lab) — a barra de abas é a navegação, e voltar dali seria sair
  do módulo, que é o que a seta do header faz;
- **telas de entrada** (`login`, `register`, `forgot-password`, `index`) — as três últimas têm
  "voltar para entrar" escrito no conteúdo;
- **`booking-confirmed`** — tem "Voltar para Saúde";
- **`dev/ui`** — tela de desenvolvimento, não chega ao paciente.

Ou seja: **não sobrou beco sem saída**. Era o que o Bruno pediu para revisar por inteiro.

---

## 10. Face ID — pedido, e exige build

**O que ele resolve, e o que não resolve:** o app já guarda a sessão no cofre do iPhone
(`expo-secure-store`), então o paciente **já não digita senha toda vez**. Face ID não economiza
digitação — ele põe uma **tranca** em cima. O ganho é num app de saúde que fica desbloqueado no
celular: quem pega o aparelho não abre o prontuário sem o rosto do dono.

**Custo:** `expo-local-authentication` é módulo **nativo**. Não está instalado, e instalar exige
**build novo** — que agora só sai com autorização explícita
([[feedback_build-so-com-autorizacao]]).

**Feito** em 24/09/2026 (T-15), com a observação do Bruno no centro: *"isso depende do aparelho
que a pessoa está usando"*. O rótulo vem do sistema, não de nós — iPhone com TrueDepth lê
"Face ID", iPhone com sensor de digital lê "Touch ID", Android lê "digital". Escrever "Face ID"
para todo mundo mandaria metade dos pacientes procurar um botão que o telefone deles não tem.

Como ficou:
- opção no perfil, desligada por padrão, que **some** em aparelho sem sensor e aparece
  desligada (dizendo o que fazer) em aparelho com sensor sem cadastro;
- ligar pede o rosto na hora — confirma que o sensor funciona para aquela pessoa **antes** de a
  tranca passar a valer, em vez de ela descobrir na próxima abertura que não consegue entrar;
- com a tranca ligada, o `bootstrap` para antes de chamar o servidor: nada do paciente é
  carregado enquanto o rosto não passa;
- re-tranca depois de 2 minutos em segundo plano — trancar só na abertura a frio não protegeria
  quase nada, já que o app fica semanas vivo na bandeja do telefone;
- **quem apagou o rosto do aparelho tem a tranca derrubada sozinha.** Essa é a regra que não pode
  quebrar: a senha continua sendo a chave de verdade, e ninguém perde acesso à própria conta por
  causa de um sensor.

Exige build (módulo nativo) e `NSFaceIDUsageDescription` no `app.json` — sem a frase declarada o
iOS derruba o app no primeiro prompt.


---

## 11. Varredura de botão morto e de ação sem confirmação

O Bruno pediu "as funções de cada página". Duas varreduras sobre as 63 telas:

**Ações destrutivas que disparam sem perguntar:** três, nenhuma defeito. Sair da conta não
destrói dado e o rótulo já diz o que vai acontecer; a terceira remove um item de orçamento no
módulo BA, refazível num toque.

**Botões sem ação:** doze, e onze não embarcam para o paciente — oito são a vitrine interna
`dev/ui`, três são do módulo BA, que o `CLINIC_ONLY` não inclui neste binário.

**O décimo segundo era real:** `(lab)/result/[id].tsx:100` tinha "Discuss with physiotherapist"
sem `onPress` nenhum — o botão enchia a tela e não fazia nada. Dois defeitos na mesma linha, na
verdade: o texto também dizia *physiotherapist*, o termo que não vai para paciente
([[feedback_terapeuta-nao-fisioterapeuta]]). Agora leva para a conversa com a clínica e diz
"your therapist". O mesmo termo aparecia em `(lab)/[id].tsx:86` e saiu junto.

**No módulo da clínica — o que o paciente de fato usa — nenhum botão morto restou.**

---

## 12. O build seguinte sai com o laboratório desligado

**Autorizado pelo Bruno em 24/09/2026:** o próximo build vai com `EXPO_PUBLIC_SHOW_LAB=false`,
depois do code review.

**Por quê.** O app da BA não faz parte deste produto, e o laboratório é o próximo a liberar —
mas só depois que o app da clínica for validado, e só quando a API deles existir. Hoje o
laboratório está **alcançável**: o `CLINIC_ONLY` apenas pula o seletor, e "Trocar de módulo", no
perfil, mostra um card "Laboratory" que entra num módulo sem API. No meio de uma validação do app
da clínica, isso vira falso achado.

**O que a flag faz.** Com ela em `false`, o laboratório sai do seletor e a decisão volta para o
servidor — `DIAGNOSTICS` em `ClinicModuleAccess`. Quando a integração estiver pronta, o Bruno
liga pelo painel, **sem build novo**. O lever já existia em `mobile/src/lib/feature-flags.ts`; eu
é que não estava usando.

**O que NÃO fazer agora:** traduzir as 10 telas do laboratório. Elas não têm tradução nenhuma,
mas nome de exame, preço, método de coleta e texto de resultado vêm do catálogo do laboratório —
traduzir antes da API é traduzir duas vezes. Observação do Bruno, e está correta.

**Comando do build:**

```
EXPO_PUBLIC_SHOW_LAB=false eas build --profile production --platform ios
```

---

## 13. A mesma pressão recebe dois nomes diferentes (achado, não corrigido)

Encontrado em 24/09/2026, com dado real, durante o teste do Withings. A leitura de **149/99**
apareceu como:

- **"High (Stage 2)"** na tela do paciente (`/dashboard/blood-pressure`);
- **"Stage 1 Hypertension"** no alerta da clínica (`/admin/alerts`).

Mesmo número, duas severidades. São dois classificadores:

| onde | arquivo | regra |
|---|---|---|
| paciente | `lib/blood-pressure.ts` | faixas fixas NHS/ACC-AHA — `>= 140/90` é Estágio 2 |
| automação | `lib/automation/bp-bands.ts` | Estágio 2 = ponto médio entre o alerta e a crise da clínica — com os padrões, **160/105** |

A intenção do segundo está comentada e é legítima: uma clínica que baixasse o alerta para 110/70
não deveria ver 115/75 chegando ao terapeuta rotulado como hipertensão. Mas a correção moveu a
**fronteira** e manteve o **nome clínico**, e "Estágio 1"/"Estágio 2" não são rótulos nossos para
redefinir — pelo padrão que o próprio arquivo cita, 149/99 é Estágio 2. O alerta da clínica
subestima.

**Não corrigido**: está fora do escopo da T-14/T-15 e é decisão clínica, não técnica.

**Recomendação:** o **nome** sempre da tabela fixa (`classifyBP`); os limites configuráveis da
clínica decidem apenas **se dispara alerta**. Hoje "isto é grave?" e "devemos avisar alguém?"
estão no mesmo cálculo, e é a mistura que produz o rótulo errado.

---

## 14. O aparelho da clínica não tem como ser trocado pela interface (achado)

Encontrado em 24/09/2026, conectando o BPM Connect de consultório.

`app/admin/measurements/inbox/page.tsx` só mostra o botão **"Connect the clinic device"** quando
`device === null`. Conectado, o botão some — e não existe nenhum "desconectar" nem "trocar conta"
naquela tela. O paciente tem `Disconnect` na dele; a clínica não tem nada equivalente.

**Por que isso importa:** a tela de autorização da Withings assume a conta que já está logada no
navegador, e anuncia isso numa linha discreta ("You are connected to the account …"). É fácil —
aconteceu aqui — autorizar com a conta **errada**. O sintoma não é um erro: é tudo parecer
conectado e **nenhuma leitura chegar**, que é o silêncio mais caro de diagnosticar num manguito
que alimenta vários pacientes.

**Saída atual, que é uma URL decorada:** ir direto em
`/api/wearables/connect/withings?clinic=1`, que é o que o botão chama. O callback faz `upsert` por
`(userId, provider)` e `saveWithingsTokens` sobrescreve, então reconectar troca a conta sem
precisar desconectar antes.

**Correção sugerida:** mostrar sempre, no cartão do aparelho conectado, **de qual conta ele é** e
um botão de trocar/desconectar. Saber a conta na tela teria evitado o erro em vez de exigir
descobri-lo pelo silêncio. Ver [[feedback_self-service-over-backend-scripts]] — é o mesmo
princípio: o Bruno precisa resolver isso pela interface, não com uma URL que eu digitei para ele.

---

## 15. Dois ajustes de tela no prontuário (corrigidos)

Apontados pelo Bruno durante o teste do manguito de consultório, 24/09/2026.

**A barra de medição cobria o nome do paciente.** Aberta, a barra
("Waiting for Daniel To's reading… 2:57") é muito mais larga que o botão que a originou, e nenhum
dos dois lados podia ceder: o grupo de botões não tinha `min-w-0` e as barras não quebravam linha.
Resultado: transbordava por cima do `<h1>` com o nome. Agora as quatro barras do
`ClinicMeasurementButton` têm `flex-wrap min-w-0 max-w-full`, o grupo de botões encolhe, e o nome
e o e-mail usam `truncate` para degradar com elegância em vez de empurrar.

**A última linha do histórico ficava colada na borda.** `pb-16` na aba de pressão — e é
justamente a linha onde se clica para editar ou apagar uma leitura.

---

## 16. Manguito de consultório validado de ponta a ponta

24/09/2026, 17:57. Janela aberta no prontuário do Daniel To, medição feita dentro dos 3 minutos:

```
24/09/2026, 17:57 · 148/94 · High (Stage 2) · HR 59
Origin:      Clinic device
Recorded by: Bruno Admin · Withings (clinic device)
```

O contraste com as leituras do próprio Bruno, no mesmo aparelho físico, é o que prova a
atribuição: aquelas dizem `Patient's own device / Patient self-reported`; esta diz **Clinic
device** e **nomeia quem abriu a janela**. O prontuário registra de onde veio e sob
responsabilidade de quem.

Ciclo completo: janela de 3 min → medição → Wi-Fi → Withings → webhook → atribuição por sessão →
prontuário certo.

**Pendência de proteção de dado, e não é pequena:** o manguito está na conta Withings **pessoal**
do Bruno. Toda pressão de paciente medida nele fica gravada também no Health Mate dele, sob o
perfil dele. Para uso de rotina com pacientes reais, mover o aparelho para uma conta da clínica —
mesmo caminho de hoje, mais `/api/wearables/connect/withings?clinic=1`. Ver
[[aparelho-pressao-clinica]].
