# T-3: Liberado para quem você escolher — e só

**Status:** pendente
**Depende de:** T-2

## Objetivo

Um material pode ser **restrito**: aparece para o paciente a quem foi atribuído,
e para mais ninguém.

## Contexto

Palavras do Bruno: *"Eu queria liberar determinados artigos para determinados
pacientes."*

Hoje `/api/education` devolve **tudo que está publicado** (`isPublished: true`)
para qualquer paciente da clínica navegar, e a atribuição só **destaca** o que é
dele. Quer dizer: atribuir hoje não restringe nada.

Não é defeito — é o desenho de uma biblioteca aberta. O pedido é outro, e os
dois podem conviver: material aberto para quem quiser ler, material restrito
para quem o terapeuta escolheu.

## Passos

1. O material importado nasce `isPublished: false`. A atribuição é o que o faz
   chegar.
2. `/api/education` devolve: os **atribuídos** (independente de publicados) e os
   **publicados** (a biblioteca aberta). Já é quase isso; falta garantir que um
   atribuído não publicado apareça.
3. A rota de leitura de um material (`/api/education/[id]`, se existir; senão
   criar) recusa quem não tem nem atribuição nem publicação — **404, não 403**,
   pela mesma razão de sempre: dizer "existe mas não é seu" conta a um estranho
   que aquilo existe.
4. No painel, cada material diz o que é: **"Só para quem eu atribuir"** ou **"Na
   biblioteca de todos"**, e dá para trocar.
5. Tirar a atribuição tira o acesso. O progresso de leitura **fica** — é
   registro do que a pessoa fez.

## Arquivos afetados

- `app/api/education/route.ts`
- `app/api/education/[id]/route.ts`
- `app/api/admin/education/assignments/route.ts`
- a tela de conteúdo do painel

## Critérios de aceite

- [ ] Material restrito não aparece para quem não foi atribuído
- [ ] Nem mesmo pedindo pelo id — 404
- [ ] Material atribuído aparece mesmo sem estar publicado
- [ ] A biblioteca aberta continua aberta
- [ ] Tirar a atribuição tira o acesso e mantém o progresso
