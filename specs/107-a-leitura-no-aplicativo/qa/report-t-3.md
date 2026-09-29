# QA — 107 T-3: o TODO que chegou ao paciente

**Data:** 29/09/2026
**Onde:** aplicativo do paciente, build web em `http://localhost:8090`
(`expo start --web --port 8090`, worktree
`C:\Users\bruno\orca\workspaces\clinic\app_clinic`). Banco local
`bpr_clinic_local`, mais uma varredura independente de **produção**.
**Resultado geral:** aprovado — com uma ressalva de cobertura em produção e um
achado fora do pedido.

**Paciente:** `Qa107 PacienteTeste` (`qa107.paciente@example.test`), na clínica
de teste `QA107 Clinica de Teste`. Nenhum paciente real foi tocado.

## Onde a API estava, e por que isto importa

O servidor Expo da 8090 aponta para `http://127.0.0.1:4020` (vem de
`EXPO_PUBLIC_API_URL`; `mobile/src/api/config.ts` cai em `https://bpr.clinic`
quando ela falta). **Não havia nada escutando na 4020** — o primeiro login
morreu em `ERR_CONNECTION_REFUSED`. A única 4000 de pé vinha de
`C:\Users\bruno\Documents\clinic`, o checkout principal, **não deste worktree**.

Subi `npx next dev -p 4020` a partir deste worktree e foi ele que serviu tudo
abaixo. Sem esse passo, o QA teria medido um app que não fala com API nenhuma.

## Resumo

| # | cenário | tipo | resultado |
|---|---|---|---|
| 3.1 | varrer **o banco** local atrás de marca de rascunho | dados | aprovado — 0 em 36 registros |
| 3.1b | varrer **produção** (o alcançável sem credencial) | dados | aprovado — 0 em 35 artigos; EducationContent fora de alcance |
| 3.2 | abrir no app um protocolo que tinha a linha | UI | aprovado — 5 referências reais, a última é de verdade |
| 3.3 | os onze arquivos de origem | código | aprovado — 10 perderam 1 linha; o 11º não tinha |
| 3.4 | a marca não volta na semeadura | teste | aprovado — 14 casos, 175 testes verdes |

---

## 3.1 — o banco local, medido por fora

Varri o banco com regra **própria**, não com a do script de limpeza — de
propósito: reusar a regra dele seria medi-la contra si mesma. A minha procura as
marcas em **qualquer posição** do texto visível (sem tags, sem espaço teimoso), e
não só no começo do item de lista.

`TODO` entrou sensível a maiúsculas, que é a armadilha que a própria T-3
registra: a busca indiferente a caixa casa com "todos os planos".

```
### article: 34 registros
### educationContent: 2 registros

== TOTAL: 0 registros, 0 campos ==
```

Campos varridos: `article.content`, `.contentEn`, `.contentPt`;
`educationContent.body`, `.bodyPt`. Marcas: TODO, FIXME, XXX, Lorem ipsum,
`[inserir`, TBD.

A T-3 mediu 9 artigos e 18 campos no local antes de aplicar. Agora são **0 e 0**.

### Idempotência, medida agora

```
$ node scripts/limpar-marcas-de-rascunho.js --dry-run
[limpar-rascunho] SIMULAÇÃO — nada será escrito

[limpar-rascunho] 0 item(ns) em 0 registro(s) — nada foi escrito
```

Segunda passada não acha nada e não escreve. É o que a tarefa prometeu.

---

## 3.1b — produção, sem credencial nenhuma (parcial)

Não tenho `PROD_DATABASE_URL` nesta sessão (não está no `.env`, nem no ambiente,
nem nos perfis de shell — `scripts/backup.ps1` lê-a do perfil do Bruno). Cheguei
em produção pelo único caminho que existe sem segredo: a **API pública de
artigos**, artigo por artigo, com 350 ms entre chamadas para não acordar o
limitador.

```
artigos publicados: 35

== PROD: lidos 35/35 (erros 0) — 0 registros, 0 campos com marca ==
```

**35 de 35 lidos, nenhum erro, nenhuma marca.** Confirma de forma independente a
medição do Bruno.

**O que esta varredura NÃO cobre, e é preciso dizer:**

| não medido | por quê |
|---|---|
| `Article` **não publicado** em produção | a rota devolve 404 para rascunho a quem não é SUPERADMIN |
| `EducationContent` em produção | não tem rota pública; precisa de sessão de paciente **em produção** |

O segundo é o que mais falta: a T-3 registrou **8 conteúdos de Education
afetados em produção**, e é exatamente esse modelo que o app do paciente lê.
Para fechar é preciso ou o `PROD_DATABASE_URL`, ou um paciente de teste em
produção. **Marcado como não executado, com o motivo** — não como aprovado.

---

## 3.2 — o protocolo aberto no app

*Chronic Lower Back Pain*, lido na tela do aplicativo pelo paciente de teste:

```json
{
  "titulo": "Chronic Lower Back Pain",
  "n_referencias": 5,
  "referencias": [
    "Banks, K. (2013) Maitland Peripheral Manipulation Management. Elsevier.",
    "Banks, K. (2013) Maitland Vertebral Manipulation Management. Elsevier.",
    "Sharkey, J. (2017) The Concise Book of Dry Needling. Lotus Publishing.",
    "Watson, T. (2008) Electrotherapy: Evidence Based Practice. Elsevier.",
    "Clarkson, H. M. (2013) Musculoskeletal Assessment. 3rd edn. Lippincott."
  ],
  "ultima_referencia": "Clarkson, H. M. (2013) Musculoskeletal Assessment. 3rd edn. Lippincott.",
  "tem_TODO": false, "tem_FIXME": false, "tem_Lorem": false
}
```

(os apóstrofos de *Maitland* saem no texto real; foram tirados aqui só para o
bloco não brigar com o shell que gravou este relatório)

**As cinco reais continuam lá**, na ordem original, e a lista **acaba numa
referência de verdade**. Era isso que estava em causa.

Screenshot: `screenshots/t-3-referencias-sem-todo.png`

O mesmo artigo, em produção, pela API pública, termina igual: cinco itens, o
último é Clarkson, sem a linha de rascunho.

Sobrou uma **linha em branco** dentro da lista, onde o item foi retirado. Não
aparece na tela (o conversor de blocos descarta item vazio — há teste para
isso), mas fica no HTML de quem abrir pelo painel.

---

## 3.3 — dez arquivos, uma linha cada

```
 recovered-content/protocols/protocol_01_patella_tendonitis.md         | 1 -
 recovered-content/protocols/protocol_02_plantar_fasciitis.md          | 1 -
 recovered-content/protocols/protocol_03_hamstring_tendinosis.md       | 1 -
 recovered-content/protocols/protocol_04_frozen_shoulder.md            | 1 -
 recovered-content/protocols/protocol_05_whiplash.md                   | 1 -
 recovered-content/protocols/protocol_06_snapping_hip.md               | 1 -
 recovered-content/protocols/protocol_07_chronic_lower_back_pain.md    | 1 -
 recovered-content/protocols/protocol_08_runner_s_knee_itb_syndrome.md | 1 -
 recovered-content/protocols/protocol_09_trochanteric_bursitis.md      | 1 -
 recovered-content/protocols/protocol_10_carpal_tunnel_syndrome.md     | 1 -
 10 files changed, 10 deletions(-)
```

Dez arquivos, **exatamente uma deleção cada**, nenhuma inserção — nada foi
reescrito, só retirado. O 11º (`00_INDEX_and_SCHEMA.md`) não aparece no diff,
como a tarefa previa.

---

## 3.4 — a marca não volta

`__tests__/education/nada-de-rascunho-no-conteudo.test.ts`, 14 casos, incluindo
os que mordem:

- não tira uma linha legítima que começa por "todos" — o falso positivo que a
  própria medição inicial cometeu;
- tira o item traduzido: a redação varia, a marca não;
- tira mesmo com espaço teimoso no lugar de cada espaço;
- as referências de verdade continuam lá;
- rodar de novo não acha nada (idempotente);
- a lista que ficou vazia não vira moldura vazia na tela.

```
Test Suites: 9 passed, 9 total
Tests:       175 passed, 175 total
Time:        2.062 s
```

---

## Erros de console

Do app (origem `localhost:8090` / `127.0.0.1:4020`): **4 erros na sessão
inteira**, nenhum do conteúdo:

| erro | o que é |
|---|---|
| `POST 127.0.0.1:4020/api/mobile/login` -> `ERR_CONNECTION_REFUSED` | a minha sonda **antes** de subir a 4020 |
| 3x `localhost:3000/api/image-serve/<id>` -> `ERR_CONNECTION_REFUSED` | endereço de capa, ver abaixo |

Avisos: 2 únicos, ambos do build web (`expo-notifications` não escuta push na
web; `props.pointerEvents` obsoleto no React Native Web). Nenhum do conteúdo.

O resto do log do navegador vem de **outra aba, de outra sessão**
(`appstoreconnect.apple.com`, 140 linhas) — não é deste app e não entra na conta.

---

## Falhas e recomendações

Nenhuma falha nos cenários pedidos.

### 1. Produção: o lado do EducationContent continua não medido

É o modelo que o app lê, e o que a T-3 mediu com 8 registros afetados. Confirmei
só a metade alcançável (os 35 artigos publicados). Para fechar, o caminho mais
curto é um paciente de teste em produção e a mesma varredura pela rota
`/api/education` — ou o `PROD_DATABASE_URL` no ambiente.

### 2. Achado que ninguém pediu para olhar

`recovered-content/protocols/00_INDEX_and_SCHEMA.md`, **linha 54**, ainda diz que
marcas TODO indicam onde uma referência de protocolo de carga deve ser
acrescentada a partir das anotações do módulo.

O arquivo de esquema continua documentando a convenção que acabou de ser apagada
dos dez protocolos. Ele **não vira artigo** e o paciente nunca o lê — não é o
defeito da T-3. Mas quem semear um protocolo novo lendo este índice vai
reintroduzir a marca seguindo a instrução, e aí o teste da 3.4 reprova sem que a
pessoa entenda por quê.

### 3. O endereço da capa sai errado fora da porta padrão

`urlAbsoluta` (`lib/rich-text-blocks.ts`) monta o endereço absoluto a partir de
`NEXTAUTH_URL` — aqui, `localhost:3000` — e não do host do pedido. Com a API na
4020, as três capas deram `ERR_CONNECTION_REFUSED`. **Em produção não aparece**
(`NEXTAUTH_URL` é o próprio domínio), mas em qualquer QA local numa porta
diferente as imagens do conteúdo somem em silêncio. Contornei no QA gravando a
capa com endereço absoluto.
