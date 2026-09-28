# Atividade 096 — O artigo vira material do paciente

**Aberta em:** 28/09/2026
**Pedido do Bruno:** *"temos toda a página dos artigos e eu queria saber como é
que a gente pode transferir os arquivos… para a parte educacional dentro do app.
Eu queria liberar determinados artigos para determinados pacientes."*

## O que eu encontrei antes de planejar

A máquina inteira existe e **nunca foi usada**:

| peça | estado |
|---|---|
| `EducationContent` | pronta — título, corpo, imagem, categoria, tags, tipo |
| `EducationAssignment` | **pronta** — conteúdo → paciente, com nota, prazo, obrigatório, concluído |
| `EducationProgress` | pronta — o que cada um leu |
| telas do app e do painel, rota de "enviar ao paciente" | prontas |

Em produção, agora:

```
artigos publicados:      35
conteúdo educacional:     0
atribuições existentes:   0
```

A aba Educação do app está vazia **porque ninguém criou conteúdo**, não porque
falte função. Os 35 artigos estão de um lado e o lado do paciente vazio do outro.

## O que falta de verdade

**1. A ponte.** Nada liga `Article` a `EducationContent`.

**2. O bilíngue.** `Article` tem `titleEn/contentEn` e `titlePt/contentPt`.
`EducationContent` tem **um** título e **um** corpo. Importar como está **joga
fora metade do que já foi escrito** — e a Ana lê em inglês
([[ana-livia-lingua-ingles]]) enquanto outro paciente lê em português.

**3. A regra de acesso.** Hoje `/api/education` devolve **tudo que está
publicado** para qualquer paciente navegar, e a atribuição só *destaca*. O
pedido foi *"liberar determinados artigos para determinados pacientes"* — isso é
uma regra diferente, e é a que vamos escrever.

**4. A escolha.** Artigo do site é material de marketing; conteúdo educacional é
material clínico. Nem todos os 35 servem a um paciente em tratamento, e essa
escolha é do Bruno — a tela existe para ele marcar quais atravessam.

## Decisões que eu tomei, e você pode derrubar

**Cópia, não vínculo.** O conteúdo educacional nasce **copiado** do artigo, com
o id de origem guardado. Um vínculo vivo seria mais elegante e tem uma falha
grave: despublicar um artigo do site tiraria da mão de um paciente um material
que o terapeuta mandou para ele ler. O preço da cópia é a divergência com o
tempo, e ele é pago com um aviso — quando o artigo de origem muda, a tela do
painel mostra "o artigo mudou desde a importação" e um botão de reimportar.

**"Liberado" quer dizer restrito.** Conteúdo importado nasce **não público**: só
chega a quem foi atribuído. O que já é público continua público — a regra nova
não muda o que existe, porque não existe nada.

**Duas línguas no mesmo registro**, não dois registros. Um material com duas
versões é um material; dois registros seriam duas listas de progresso e duas
atribuições para a mesma leitura.

## Tarefas

| T-N | nome | depende de | status |
|---|---|---|---|
| T-1 | O conteúdo educacional fala as duas línguas | — | **feita** (28/09) — em QA |
| T-2 | A ponte: o artigo vira material, e lembra de onde veio | T-1 | **feita** (28/09) |
| T-3 | Liberado para quem você escolher — e só | T-2 | **feita** (28/09) |
| T-4 | A tela de escolher quais artigos atravessam | T-2 | **feita** (28/09) |
| T-5 | O app mostra o que é dele, e o que é da clínica | T-3 | **feita** (28/09) — **precisa de build** |

**Ordem:** T-1 primeiro porque tudo que for importado antes dela nasce torto e
teria de ser reimportado.

## Suposições

- **Imagem:** o artigo tem `imageUrl`; vira `thumbnailUrl` do material. Sem
  copiar bytes — é a mesma URL, servida pelo mesmo lugar.
- **Categoria:** a importação não inventa categoria. Quem importa escolhe uma,
  ou o material fica sem — e sem categoria é um estado, não um defeito.
- **Quem importa:** só quem já pode publicar artigo. Não é uma permissão nova.
- **O artigo não é alterado.** A importação lê; nunca escreve no artigo.

## O que esta atividade **não** faz

- Não mexe na página pública de artigos.
- Não traduz nada: se o artigo só tem inglês, o material só tem inglês, e a tela
  do paciente mostra o que existe em vez de um espaço vazio.
- Não manda nada ao paciente automaticamente. Atribuir é um botão, como tudo
  que chega a paciente aqui ([[feedback_no-automatic-patient-sends]]).

---

## Três defeitos que apareceram implementando (28/09)

Nenhum deles estava no plano, e os três já estavam de pé antes desta atividade:

1. **A rota nunca mandava o corpo do artigo.** A tela de detalhe do app lê
   `item.body` da lista em memória, e a lista não mandava corpo. Importar um
   artigo mostraria ao paciente título e resumo e **nada do texto**.
2. **"Marcar como lido" no app respondia 401 — sempre.** A rota de progresso
   lia só sessão de cookie, e o app manda bearer. O botão existe na tela do
   paciente e nunca funcionou no telefone.
3. **Qualquer pessoa autenticada gravava progresso em qualquer material** — de
   outra clínica, ou de um restrito atribuído a outro paciente — e a rota ainda
   incrementava o `viewCount`, confirmando a existência a quem não devia nem
   saber dela.

## O que chega sem build, e o que não

**Sem build:** importar, restringir, atribuir, e o paciente ler no app. O
aplicativo instalado já ordena os atribuídos primeiro, e agora recebe o corpo do
texto e a língua certa.

**Com build:** a separação "Para você" × "Da clínica", a observação do
terapeuta, o prazo e o selo de obrigatório — é código do app (T-5).
