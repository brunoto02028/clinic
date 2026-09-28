# QA — 101 T-2: o artigo, da clínica até a tela do paciente

**Data:** 28/09/2026
**Onde:** local, `npx next dev`, banco local
**Paciente:** `Qa095b Paciente` — paciente de teste identificado, `preferredLocale` português.
**Material de QA:** dois, criados para isto — um com HTML de editor, imagens e
as duas línguas; outro **só em inglês**, para provar o aviso de tradução.
**Tokens e cookies:** nenhum valor neste relatório.

---

## O que o Bruno viu, e o que faltava

> *"Desde a clínica atribuir um artigo ao paciente, está muito ruim a parte
> visual, não vê imagem, não vê absolutamente nada, o texto ficou estourado o
> HTML."*

O HTML e as imagens foram corrigidos em 28/09 (blocos no servidor, endereços
absolutos). O que ainda faltava é o motivo de ele ter descoberto o problema
**abrindo o telefone**: a tela de atribuir mostrava **um título num seletor**, e
o botão dizia "Assign to Patient".

A regra da casa é que nada sai sem alguém ver a prévia. Não havia prévia.

---

## 1. A prévia — o que passou a existir

`components/admin/previa-do-material.tsx`, nas **duas** caixas: a de atribuir a
um paciente e a de enviar em massa.

Ela desenha com `emBlocos` — **a mesma função** que `app/api/education/route.ts`
usa antes de mandar ao telefone. Uma prévia que renderizasse o HTML no navegador
mostraria uma página bonita e mentiria: o telefone não desenha HTML.

Medido na caixa de atribuir, material com HTML de editor:

```
What the patient sees | EN | PT | Article
QA — confidence isn't correctness | article
A short QA article with images and both languages.
FROM YOUR CLINIC | Read this before Thursday.
Confidence isn't correctness
It is tempting to think of consensus as a straight line.
[imagem] A diagram
• First point  • Second point
Evidence changes.
Closing paragraph.
```

Nenhuma tag, nenhum `&nbsp;`, imagem e legenda no lugar, logo da BPR no topo da
moldura, e a observação da clínica no meio — que é texto que o paciente vai ler.
📷 `screenshots/previa-atribuir-en.png`

---

## 2. Uma reprovação da própria prévia, na primeira medição

| | |
|---|---|
| cenário | material **só em inglês**, visto na aba PT |
| esperado | o aviso de tradução **e** o texto em inglês |
| medido | o aviso, e **"This material has no body text"** |

Eu tinha reescrito a queda de língua dentro do componente, e ela ficou
assimétrica: o **título** caía para o inglês, o **corpo** não. A prévia dizia
*"o paciente recebe o texto em inglês"* e logo abaixo mostrava um material sem
corpo.

**Corrigido** trocando a minha regra por `naLingua`/`temTraducao` de
`lib/education-language.ts` — as mesmas que o servidor aplica. Duas cópias da
regra divergem, e a divergência aparece na tela de um paciente.

Remedido, material só em inglês:

```
EN: Article | QA — English only | article | Only English here.
PT: No Portuguese version — a patient reading in Portuguese gets the English text.
    Article | QA — English only | article | Only English here.
```

---

## 3. A volta inteira: atribuir → o que chega ao telefone

Atribuí o material ao paciente de teste e li a resposta de `/api/education` com
o bearer dele.

```
titulo     : QA — confiança não é acerto
descricao  : Um artigo de QA com imagens e as duas línguas.
capa       : http://<base>/uploads/qa-capa.png
nota       : Read this before Thursday.
blocos     : ['titulo', 'paragrafo', 'imagem']
titulo     : Confiança não é acerto
paragrafo  : É tentador pensar no consenso como uma linha reta.
imagem     : http://<base>/uploads/qa-artigo.png | legenda: Um diagrama
tem HTML?  : False
tem &nbsp;?: False
campos *Pt vazaram?: False
```

Três coisas que isto prova de uma vez:

1. **A língua é a do paciente.** Ele lê em português, e o servidor resolveu para
   português — e é exatamente o que a aba **PT** da prévia mostrava.
2. **As imagens viajam.** Capa e imagem do corpo com endereço **absoluto**; um
   `/uploads/...` relativo não resolve contra nada dentro do telefone.
3. **Nada de HTML chega.** Nem tag, nem entidade.

---

## 4. Dois furos de inquilino, achados e fechados

A mesma forma do vazamento do envio em massa de 11/09/2026: **o id vem do corpo,
o tenant vem da sessão, e ninguém verifica que os dois combinam.**

### 4.1 `POST /api/admin/education/assignments` — **reprovado**

`clinicId` saía da sessão e ia para a linha nova, mas `contentId` e `patientId`
entravam como vieram. Quem administra a clínica A podia:

- mandar o id de um material da clínica B — e **ler o texto dela** na resposta;
- mandar o id de um **paciente** da clínica B, e a atribuição aparecia no
  aplicativo dele.

**Corrigido** com `assertPatientAccess` e um `findFirst` com `clinicId`. Medido:

| tentativa | HTTP |
|---|---|
| atribuir a paciente de **outra** clínica | **404** Not found |
| atribuir material que não existe | **404** Not found |
| atribuir ao paciente de teste | **200** |

404 nos dois: dizer "existe, mas não é sua" já conta que existe.

### 4.2 `POST /api/admin/education/send` — **reprovado**

- `contentId` lido com `findUnique({ where: { id } })`, sem dono.
- `sendTo: "specific"` buscava `{ id: { in: patientIds }, role: "PATIENT" }` —
  **sem `clinicId`**. Uma lista de ids de outra clínica virava uma lista de
  atribuições e avisos na caixa deles.

**Corrigido** nos três ramos. Medido, como ADMIN da clínica de QA:

| tentativa | resultado |
|---|---|
| material de outra clínica | **404** |
| `specific` com paciente de outra clínica | `No matching patients found` |

E de quebra: o ramo "por condição" não trazia `preferredLocale`, então **mandava
o aviso sempre em inglês** enquanto os outros dois respeitavam a língua da
pessoa. Corrigido junto.

---

## 5. Mandar para a clínica inteira era um clique

`sendMode` nascia `"all"`, e a caixa **abria sozinha** ao publicar um material.
Publicar → "Send Now" escrevia uma atribuição e uma notificação para **todo
paciente ativo da clínica**, sem ninguém saber quantos eram.

Não é envio automático — alguém clica —, mas é a forma exata do incidente de
11/09, e contraria *"nada sai sem o Bruno ver a prévia"*.

**O que mudou:**

- **nada vem pré-selecionado** (`sendMode` começa `null`);
- **publicar não abre mais a caixa** — publicar é pôr na biblioteca, mandar é
  outra decisão;
- o botão agora é **"Check who receives it"**, e só depois aparece **"Send to
  N"**, com os nomes de quem vai receber;
- trocar o critério **invalida a conferência**, senão o número seria de outro
  grupo de pessoas;
- a prévia do material está ao lado das escolhas.

A conferência é `dryRun` no servidor. Medido:

```
antes:              atribuicoes deste material = 0
dryRun (todos):     {"dryRun": true, "totalPatients": 1, "wouldSend": 1, "alreadyAssigned": 0}
depois do dryRun:   atribuicoes deste material = 0
```

**Conta sem escrever.**

---

## 6. A tela de atribuir falava duas línguas ao mesmo tempo

Título "Assignments" em inglês, subtítulo em português, botões em inglês, um
botão em português, e o estado vazio inteiro em português. O painel tem chave
EN/PT e esta tela a ignorava.

**Corrigido.** Medido, a mesma tela nas duas:

```
EN: Assignments | Two steps: 1) bring the article from the site into the clinic;
    2) assign it to a patient. Only the second one makes it appear in their app.
    | Bring articles from the site | Assign material
PT: Atribuições | Dois passos: 1) trazer o artigo do site para a clínica;
    2) atribuir a um paciente. Só o segundo faz o material aparecer no aplicativo
    dele. | Trazer artigos do site | Atribuir material
```

📷 `screenshots/atribuir-em-ingles.png`

---

## 7. O que a suíte passou a proteger

`__tests__/education/antes-de-enviar-ao-paciente.test.ts` — 25 asserções:
a prévia usa blocos e não HTML, tem o logo, avisa a tradução que falta, usa a
regra de língua **do servidor**; a conferência não escreve; os três ramos de
destinatário filtram por clínica; e nenhuma frase de tela ficou só em português.

**Verificado por sabotagem:** tirei o `clinicId` do ramo `specific` e voltei
`sendMode` para `"all"` —

```
Tests: 2 failed, 18 passed
```

Restaurado, volta a passar.

---

## 8. Provas de sanidade

```
npx tsc --noEmit   → 0 erros
npx jest           → 150 suítes, 2167 testes, tudo verde
npm run build      → compilou
```

---

## 9. O que eu não mexi

1. **A opção "specific" da caixa de envio em massa nunca funcionou pela tela.**
   O servidor a aceita, mas a tela **nunca manda `patientIds`** — só oferece
   "All Patients" e "By Condition". Escolher "specific" sempre daria
   "nenhum paciente encontrado". Deixei a rota correta e a tela como está:
   inventar um seletor de pacientes aqui é outra tarefa, e quem quer escolher
   pessoa por pessoa usa a tela de atribuir, que é feita para isso.
2. **A importação continua trazendo a imagem por referência**, não copiando
   bytes. É o desenho certo — a mesma URL, servida pelo mesmo lugar —, mas
   significa que apagar a imagem do site apaga a do material. Anotado.

---

## Veredito

**Aprovado, depois de cinco correções** — uma delas na própria prévia, achada na
primeira medição.

O artigo agora atravessa inteiro e **a clínica vê o que está mandando antes de
mandar**, nas duas línguas. Os dois furos de inquilino estavam abertos desde
antes desta atividade e não tinham a ver com o pedido do Bruno — apareceram
porque a revisão era de ponta a ponta.

**Falta medir em produção** depois do deploy, com o commit confirmado na lista
de deployments do Coolify.
