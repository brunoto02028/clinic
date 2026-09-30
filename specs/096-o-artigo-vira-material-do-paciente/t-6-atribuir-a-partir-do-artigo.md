# T-6: Atribuir a partir do artigo

**Status:** pendente
**Depende de:** T-2, T-3
**Origem:** o Bruno, 30/09/2026.

> *"Nos Patient education, temos os artigos ali, mas eu não sei como encaminhar a
> um paciente em específico ou a todos os pacientes. (…) quando vou em atribuir
> está vazia a página. O correto seria já clicar no artigo importado ou direto no
> artigo original e atribuir a um paciente ou a todos, e ele aparece no app."*

## O que existe hoje

O caminho **funciona**, e foi medido em produção ontem (QA da 107): criar →
atribuir → prévia → avisar responde certo, a parede de inquilino devolve 404, e
a idempotência impede o segundo toque.

O que não funciona é **achar o caminho**. Hoje ele é:

```
/admin/education  →  "Atribuir a um paciente"  →  /admin/education/assignments
```

Ou seja: sai-se do artigo, vai-se para uma tela separada, e **lá** se escolhe o
artigo de novo. A tela de atribuições lista o que já foi atribuído — e numa
clínica que ainda não atribuiu nada, ela abre **vazia**. Que é exatamente o que o
Bruno viu, e leu, com razão, como "não funciona".

**Uma tela vazia que não diz o que fazer é indistinguível de uma tela quebrada.**

## O que ele pediu

Atribuir **de dentro do artigo** — do material importado ou do artigo original —
para um paciente ou para todos.

## Passos

1. Um botão de atribuir **em cada artigo**, na lista e na tela do artigo. O
   caminho curto, que é o que se procura quando se está olhando o artigo.
2. A escolha entre **um paciente** e **todos os pacientes da clínica**, com a
   prévia obrigatória que já existe — atribuir a todos alcança muita gente, e
   essa é a porta que precisa de confirmação.
3. A tela de atribuições vazia passa a dizer o que é e como se chega lá, em vez
   de abrir em branco.
4. Nada muda no envio: atribuir **não** toca o telefone; avisar é outro botão,
   com prévia, e continua sendo.

## Arquivos afetados

- `app/admin/education/page.tsx`
- `app/admin/education/assignments/page.tsx`
- possivelmente `app/api/admin/education/assignments`, se "todos" não existir

## Critérios de aceite

- [ ] Dá para atribuir a partir do artigo, sem sair dele
- [ ] Dá para atribuir a **um** e dá para atribuir a **todos**
- [ ] "Todos" passa por prévia, e diz quantos são antes
- [ ] Atribuir continua **não** tocando o telefone
- [ ] A tela de atribuições vazia explica, em vez de abrir em branco
- [ ] O material atribuído aparece no app do paciente

## O que o Bruno pediu e precisa de resposta antes

**"Ou direto no artigo original."** Os artigos do site e o material do paciente
são coisas diferentes: o artigo público é do site, e a 096 T-2 criou a ponte que
o transforma em material, lembrando de onde veio. Atribuir direto do artigo
original pode significar **atribuir o material que veio dele** — o caminho que já
existe, com um atalho — ou **importar e atribuir num gesto só**, que é outro
trabalho. A T-6 não começa sem essa resposta.
