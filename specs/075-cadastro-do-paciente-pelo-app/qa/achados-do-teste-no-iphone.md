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

**Decisão pendente:** fazer agora ou depois que o Bruno terminar a rodada de revisão no aparelho.
