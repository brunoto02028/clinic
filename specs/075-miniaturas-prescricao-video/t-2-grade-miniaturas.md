# T-2: Frontend — grade de miniaturas e prescrição por vídeo

**Status:** concluído
**Depende de:** T-1

## Objetivo

Dentro do modal de prescrição, poder entrar numa pasta, ver os vídeos
em grade com miniatura, marcar os que interessam e prescrever só
aqueles — sem sair da ficha do paciente.

## Contexto

- Tudo acontece em `components/admin/patient-exercises-tab.tsx`, no
  `Dialog` que hoje se chama "Prescribe a folder" (linhas ~201-291) e
  no `FolderRow` (linhas ~409-439).
- O modal ganha **dois modos**: lista de pastas (o de hoje) e grade de
  vídeos de uma pasta. Não é um segundo `Dialog` — é o mesmo, trocando
  o conteúdo, com "Voltar" retornando pra lista.
- Prescrever os marcados usa o endpoint que **já existe**:
  `POST /api/admin/exercise-prescriptions` com
  `{patientId, exercises: [{exerciseId}], frequency, notes}`. O retorno
  (`count`/`restored`/`skipped`) é o mesmo da prescrição por pasta, então
  o toast atual (linhas ~122-127) serve pros dois caminhos — extrair numa
  função em vez de duplicar o texto.
- Miniatura: `thumbnailUrl` quando existe, senão o ícone `FileVideo` —
  mesmo padrão já usado na lista de prescritos (linhas ~326-332).
- Frequência e notas do lote: reaproveitar os mesmos dois campos que já
  aparecem quando uma pasta é escolhida, agora também na grade.

## Passos

1. Estados novos: modo da visão (`folders` | `videos`), pasta aberta
   (`{id, name}`), lista de vídeos carregada, ids selecionados, loading
   da busca.
2. `FolderRow` ganha uma ação secundária "Ver vídeos" — botão próprio,
   separado do clique que já seleciona a pasta pra prescrição em massa
   (cuidado com `<button>` dentro de `<button>`: a linha inteira é um
   `<button>` hoje; transformar em `<div role="button">` com dois alvos
   de clique, ou posicionar a ação fora do botão).
3. Ao abrir uma pasta: `GET /api/admin/exercises?folderId=<id>&all=true`,
   guardar os vídeos, limpar a seleção anterior.
4. Grade: miniatura + nome, checkbox por card, clique no card alterna a
   seleção. Scroll dentro do modal, mesma altura máxima que a lista de
   pastas usa hoje (`max-h-[45vh]`).
5. Rodapé no modo grade: "Voltar", e "Prescrever N selecionados"
   desabilitado com 0 marcados. Ao concluir: toast com o mesmo formato de
   hoje, fechar o modal, `fetchPrescriptions()`.
6. Pasta vazia: mensagem curta ("Nenhum vídeo nesta pasta"), sem grade
   vazia quebrada.
7. Título/descrição do modal acompanham o modo (na grade, o título é o
   nome da pasta).

## Arquivos afetados

- `components/admin/patient-exercises-tab.tsx`

## Critérios de aceite

- [ ] "Ver vídeos" abre a grade da pasta certa, sem disparar a seleção
      de pasta pra prescrição em massa.
- [ ] Cada vídeo mostra miniatura real quando tem `thumbnailUrl`, e o
      ícone de fallback quando não tem — nenhum card quebrado.
- [ ] Marcar/desmarcar funciona por clique no card e no checkbox.
- [ ] "Prescrever N selecionados" só prescreve os marcados, e o toast diz
      quantos entraram / quantos já existiam.
- [ ] "Voltar" retorna pra lista de pastas com o modal aberto.
- [ ] Prescrever pasta inteira continua funcionando exatamente como antes.
- [ ] Pasta vazia mostra mensagem, não grade quebrada.
