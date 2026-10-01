# T-14: Categoria para 421 exames, sem inventar medicina

**Status:** em QA — implementada em 01/10/2026
**Depende de:** T-13

## O problema, medido

A planilha **não tem coluna de categoria**, e a tela do catálogo navega por
categoria. Rodei as 11 categorias que o seed já usava como regra de palavra-chave
sobre nome + composição dos 421:

| | |
|---|---|
| classificados | **238** |
| **sem categoria** | **183** |

E os que caem fora não são casos de borda: `5 HIAA`,
`6-Thioguanine Nucleotides`, `Acid Phosphatase`, `Activated Protein C
Resistance`, `Adenovirus by PCR`, `Adiponectin`, `Aldolase`. São ensaios
especializados que ninguém procura por navegação — alguém os procura porque um
clínico disse o nome.

## A tentação, e porque não

A tentação é escrever mais regras até os 421 caírem em algum balde. **Não.**
Categorizar `Activated Protein C Resistance` por palpite produz uma etiqueta
médica errada com aparência de certa — é a mesma classe de defeito das faixas de
pressão, e aqui o estrago é dizer ao paciente que um exame de coagulação é
"Imunidade".

## O que fazer

1. **Usar as categorias que a regra acerta**, com a regra escrita e revisável —
   um arquivo de mapa no repo, não regex espalhada pelo código.
2. **Os 183 restantes vão para uma categoria própria**, honesta: *Specialist
   tests* / *Exames especializados*. Não é um balde de lixo: é a informação
   verdadeira de que aquilo não se navega, se procura pelo nome.
3. **Reconciliar com a verdade deles quando o token chegar.** A API tem
   `category_slug` e `GET /api/product/{id}/categories` — a categoria real,
   deles. Aí o nosso mapa serve só para o que a API não cobrir, e a T-5 passa a
   sobrescrever a categoria (ao contrário do preço, categoria **não** é decisão
   da clínica).
4. **Ou perguntar ao gestor de conta** se a planilha pode vir com a coluna de
   categoria. É um e-mail, e resolve melhor que qualquer regra nossa.

## O que não entra nesta tarefa

Traduzir os nomes dos 421 exames. Nome de exame é termo técnico e fica em
inglês nas duas línguas; o que é traduzido é a **categoria**, a explicação e o
que o exame mede.

## Critérios de aceite

No fim desta página, com o resultado medido — e com um deles riscado, porque
deixou de ser preciso.


---

## Implementado em 01/10/2026

O Bruno decidiu o rumo: *"de acordo com as categorias que nós mesmos estamos
montando"*. Então as regras são nossas, escritas, revisáveis — e **não** há
balde de "especializados" como eu tinha proposto: a cauda de 183 foi
categorizada de verdade.

| peça | o que é |
|---|---|
| `scripts/lab-categories.js` | as regras, **ordenadas**, com a razão da ordem escrita |
| `lib/lab-category-labels.ts` | o nome de cada categoria em EN e PT, para a tela |
| `scripts/report-lab-categories.js` | gera a lista de revisão |
| [`referencia/categorias-para-revisao.md`](referencia/categorias-para-revisao.md) | **os 443 exames, categoria por categoria**, para o Bruno ler e corrigir |
| `__tests__/labs/as-categorias-cobrem-o-catalogo.test.ts` | 19 testes |

**Resultado: 443 exames em 25 categorias, nenhum em `other`.**

| | | | |
|---|---|---|---|
| immunity 65 | infection 53 | hormones 42 | nutrition 33 |
| toxicology 24 | swabs 19 | cardiovascular 18 | tumour_markers 17 |
| thyroid 16 | allergy 15 | general 15 | haematology 15 |
| kidney 15 | sexual_health 15 | coagulation 13 | diabetes 11 |
| liver 11 | drug_monitoring 10 | digestive 7 | metabolic 6 |
| fertility 6 | genetics 5 | iron 5 | bone 4 |
| inflammation 3 | | | |

### A decisão que fez a diferença: o nome pesa mais que a composição

A primeira versão olhava nome e composição juntos, e os **painéis saíam
errados**:

| exame | caía em | porquê |
|---|---|---|
| `Anaemia Profile` | rim | a composição tem ureia |
| `General Health Profile` | diabetes | a composição tem glicose |
| `Erectile Dysfunction Profile` | tiroide | a composição tem TSH |
| `Heart Health Profile` | diabetes | a composição tem HbA1c |

Todos verdade sobre a técnica e mentira sobre o que a pessoa foi procurar. A
correção são **duas passagens**: casa pelo nome; só se nada casar é que a
composição entra. O nome do exame é a intenção de quem o pede.

### Quatro defeitos meus, achados por medição e não por leitura

1. **`c peptide` casava dentro de "natriureti`c peptide`"** — o NT-pro-BNP, que é
   marcador cardíaco, foi classificado como diabetes. Corrigido com limite de
   palavra. E a primeira correção disso foi **pior**: pus limite nas duas pontas
   e quebrei todos os padrões truncados de propósito (`antibod` deixou de casar
   "Antibodies"), mandando **57 exames** para `other` de uma vez. O limite vai só
   no início.
2. **`health profile` era padrão do painel geral** e apanhava o
   `Heart Health Profile`. Um padrão que casa o nome de outra categoria não é um
   padrão, é um acidente.
3. **`profile`, `health` e `biochemistry` estavam em "metabólico"** — padrões sem
   conteúdo, que roubavam exames de categorias que diziam algo.
4. **`sexual_health` ficou sem rótulo** porque a acrescentei às regras depois dos
   rótulos. A lista de revisão saiu com `sexual_health / sexual_health` no lugar
   do nome; em produção seria um chip com um nome de variável. Há teste para isso
   agora, nos dois sentidos (chave sem rótulo, e rótulo sem chave).

### Uma categoria que eu não tinha previsto

**`sexual_health`.** Clamídia e gonorreia *são* infecção e tecnicamente
pertenciam ali. Mas quem procura não pensa "infecção" — pensa "saúde sexual", e é
assim que o material da própria LML organiza. São 15 exames que estavam
enterrados numa categoria de 66.

### Uma lista, não duas

Os 22 kits antigos tinham vocabulário próprio (`Hormones`, `Vitamins`,
`Sexual health`) e os 421 ganharam o nosso (`hormones`, `nutrition`). Os chips da
tela mostrariam **as duas como categorias diferentes**. O seed passou a chamar a
mesma função, e no banco não sobrou nenhuma chave do vocabulário antigo.

### Critérios de aceite

- [x] Todo produto tem categoria, e nenhuma foi adivinhada por semelhança vaga
- [x] A regra está num arquivo só, legível, com o resultado conferível
- [x] ~~Os especializados estão numa categoria própria~~ — **não foi preciso**: a
      cauda foi categorizada de verdade, e `other` ficou vazia
- [x] Um teste prova que mudar a regra muda o resultado — quatro mutações, quatro
      quedas (rótulo removido, padrão guloso devolvido, passagem do nome
      removida, limite de palavra removido)
- [ ] Quando a API entrar, a categoria dela vence a nossa — **falta**, e só dá
      para exercer com o token

### O que isto deixou à vista, e foi corrigido no mesmo dia

Ao verificar se os 421 já podiam aparecer na tela, encontrei o defeito que de
facto os bloqueava: **`lib/lab-patient.ts` fazia `sampleType ?? "capillary"`**.
Os exames da planilha entram sem método de coleta, então cada um chegava ao app
declarado como *"picada no dedo, em casa"* — incluindo cariótipo e painel NGS,
que são punção venosa. A tela prometia um envelope pelo correio a quem teria de
ir a um ponto de coleta.

É o mesmo defeito da varredura de 26/09, re-armado por um `??` que parecia
inofensivo. Um default que **inventa um fato** é pior que a ausência dele: a
ausência a tela sabe tratar.

Corrigido: `sampleType` é `null` quando não se sabe, e a tela de detalhe passa a
dizer *"coleta confirmada antes do envio"* e a apontar para o "Como funciona",
em vez de escolher uma das três formas por nós.
