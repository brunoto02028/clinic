# T-6: Atribuir a partir do artigo

**Status:** passo 4 feito (30/09) — a parede de inquilino; a porta vem a seguir
**Depende de:** T-2, T-3
**Origem:** o Bruno, 30/09/2026.

> *"Nos Patient education, temos os artigos ali, mas eu não sei como encaminhar a
> um paciente em específico ou a todos os pacientes. (…) quando vou em atribuir
> está vazia a página. O correto seria já clicar no artigo importado ou direto no
> artigo original e atribuir a um paciente ou a todos, e ele aparece no app."*

E, perguntado entre atalho e gesto único, escolheu: **"importar e atribuir num
gesto só"** — e perguntou qual seria a forma mais fácil e organizada.

## As peças já existem. Falta a porta.

Isto é menor do que parece, e vale dizer antes do desenho:

| o que | onde | estado |
|---|---|---|
| importar artigo → material, **sem duplicar** | `lib/education-from-article.ts` | pronto — procura por `sourceArticleId` antes de criar |
| atribuir a **um** paciente | `POST /api/admin/education/assignments` | pronto |
| enviar a **todos** da clínica | `POST /api/admin/education/send` | pronto |
| enviar **por condição** | o mesmo `send`, com `conditionTags` | pronto |
| prévia antes de avisar | `POST /notify` com `dryRun` | pronto, medido em produção |

O caminho inteiro foi medido ao vivo ontem (QA da 107) e responde certo. O que
não funciona é **achar**: hoje sai-se do artigo, vai-se a uma tela separada, e lá
escolhe-se o artigo de novo.

E a tela de atribuições lista o que **já foi** atribuído — numa clínica que ainda
não atribuiu nada, ela abre **vazia**. Foi o que o Bruno viu, e ele leu certo:
**uma tela vazia que não diz o que fazer é indistinguível de uma quebrada.**

## A forma mais fácil e organizada — a proposta

**Um botão no artigo, um diálogo, três destinos.**

No cartão do artigo — na lista de materiais e na lista de artigos do site —
um botão **"Enviar a pacientes"**. Ele abre **um** diálogo, não um assistente de
três passos:

```
Enviar "Tendinose do isquiotibial" a:

  ( ) Um paciente          [ procurar… ]
  ( ) Todos os pacientes   — 8 pessoas
  ( ) Quem tem a condição  [ isquiotibial ▾ ]  — 3 pessoas

  Observação para quem receber  [                    ]
  ( ) Obrigatório      Prazo [        ]

                          [ Cancelar ]  [ Ver a prévia ]
```

**Por que assim:**

- **O gesto é "enviar isto a alguém"**, e ele começa onde a pessoa está: olhando
  o artigo. Sair do artigo para escolher o artigo é o passo que sobra hoje.
- **A importação é invisível.** Se o material ainda não existe, ele nasce ali;
  se já existe, é reusado. A ponte já é idempotente por `sourceArticleId`, então
  isto não cria segunda cópia — e segunda cópia é o pior desfecho possível, porque
  cada uma teria as suas atribuições.
- **"Quem tem a condição" é a resposta ao "mais organizado".** Mandar um artigo
  de isquiotibial para todo mundo é ruído; mandar para quem tem a condição é o que
  uma clínica de verdade quer. Essa capacidade **já existe no servidor e não tem
  porta nenhuma** — é o achado desta tarefa.
- **A contagem aparece antes de escolher.** "Todos — 8 pessoas" é o que impede
  alguém de descobrir o tamanho depois de clicar.
- **A prévia é o botão final**, não "enviar". Atribuir alcança gente; a casa já
  decidiu que nada alcança ninguém sem alguém ver antes.

E o que **não** muda: atribuir **não toca o telefone**. Avisar continua sendo um
segundo ato, com a sua própria prévia.

## Passos

1. O botão no cartão do artigo, nos dois lugares.
2. O diálogo, com os três destinos e a contagem.
3. Importar-se-não-existe antes de atribuir, reusando a ponte.
4. Unificar: hoje "um" e "todos" são rotas diferentes com regras diferentes de
   inquilino — `send` usa `session.user.clinicId`, que é o padrão que esta casa
   já marcou como suspeito de vazamento. **Conferir a parede de inquilino nas
   duas** antes de dar-lhes uma porta mais visível.
5. A tela de atribuições vazia passa a explicar o que é e como se chega lá.

## Arquivos afetados

- `app/admin/education/page.tsx`
- `app/admin/education/assignments/page.tsx`
- `app/api/admin/education/send/route.ts` (a parede de inquilino)
- `app/api/admin/education/assignments/route.ts`
- `lib/education-from-article.ts`

## Critérios de aceite

- [ ] Dá para enviar a partir do artigo, sem sair dele
- [ ] Os três destinos funcionam: um, todos, e por condição
- [ ] A contagem aparece **antes** de escolher
- [ ] Enviar duas vezes o mesmo artigo **não** cria segundo material
- [ ] Atribuir continua não tocando o telefone
- [ ] A tela de atribuições vazia explica, em vez de abrir em branco
- [ ] O material aparece no app do paciente
- [ ] `send` e `assignments` negam paciente de outra clínica com **404**

---

# Passo 4 primeiro: a parede de inquilino

A tarefa mandava conferir a parede **antes** de dar a estas rotas uma porta mais
visivel. A conferencia achou o que temia, e uma coisa pior.

## Dois inquilinos no mesmo handler

`assignments` usava **dois** criterios para *"a minha clinica"*:

| o que | de onde vinha |
|---|---|
| a guarda do paciente (`assertPatientAccess`) | `getActor`, que honra o cookie de clinica selecionada |
| o material e o `clinicId` da linha nova | `session.user.clinicId`, a clinica **de origem** de quem esta logado |

Para toda a gente menos um superadmin que trocou de clinica, os dois dao a mesma
resposta — e e por isso que ninguem reparou.

Para esse, davam respostas diferentes: o paciente da clinica B passava a guarda,
o material tinha de ser da A, e a linha nascia carimbada com A. **Material de uma
clinica ligado ao paciente de outra** — a mesma forma do vazamento do envio em
massa de 11/09/2026: o id vem de fora, o tenant vem de dois sitios, e ninguem
confere que combinam.

## E o GET listava todas as clinicas

Pior, e nao estava na lista do que eu ia procurar:

```ts
const where: any = clinicId ? { clinicId } : {};
```

Esse `{}` **lista as atribuicoes de todas as clinicas**. Um superadmin sem
clinica propria via o material de toda a gente, e nada na resposta dizia isso. E
o `patientId` vinha da barra de enderecos sem ninguem conferir que aquele
paciente e desta clinica — a mesma forma do vazamento da lista de pacientes por
`?clinicId`, de 16/09.

## O conserto

Um criterio so, o do `getActor`, nas tres: o GET, o POST e o `send`. Sem
inquilino resolvido **nao se responde**; nao se responde tudo.

## Provas

`__tests__/educacao/um-inquilino-so-no-envio.test.ts`, 10 cenarios.

Por mutacao, duas — e a segunda ensinou de novo a mesma licao: devolver o filtro
`{}` derruba 1; devolver a escrita a sessao **nao derrubou nada** na primeira
versao, porque o teste procurava `clinicId: clinicDoAtor` solto e a outra
ocorrencia, a do `where`, continuava la. Passou a procurar **dentro do `data:`
da criacao**, que e o carimbo que decide de quem e a atribuicao.

**E um teste que ja existia acusou a correcao**: ele fixava o *nome da variavel*
(`actorParaChecar`), e a unificacao renomeou-a. Ficou sobre o comportamento.

## O que falta — a porta

O botao no artigo, o dialogo com os tres destinos e a contagem, e a tela de
atribuicoes vazia a explicar-se. O desenho esta acima e nao mudou.
