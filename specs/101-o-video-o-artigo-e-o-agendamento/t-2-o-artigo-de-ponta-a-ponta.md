# T-2: O artigo, da clínica até a tela do paciente

**Status:** concluída (28/09/2026)
**Depende de:** nenhuma

## Objetivo

Percorrer o material educativo inteiro — importar o artigo do site, escolher o
paciente, enviar, e ler no telefone — e consertar o que estiver no caminho.

## Contexto

A [096](../096-o-artigo-vira-material-do-paciente/) construiu a ponte, e em
28/09 o Bruno usou pela primeira vez. Três coisas apareceram, e as três já foram
corrigidas no mesmo dia:

- o telefone mostrava **HTML cru** (`<h2><span style="…` e dezenas de `&nbsp;`);
- as imagens do artigo **não apareciam** (endereço relativo não resolve no
  telefone);
- o menu levava a atribuir material para dentro de **Agenda**.

O que **não** foi percorrido de ponta a ponta ainda: a importação a partir do
site (a imagem de capa vem junto?), o preview antes de enviar, e o que o
paciente vê quando o artigo está em inglês e ele lê em português.

## Passos

1. Importar um artigo do site com imagens e conferir o que chega ao painel.
2. Atribuir a um paciente de teste, com preview antes de enviar.
3. Abrir no app e conferir texto, capa, imagens do corpo e idioma.
4. Conferir que nada sai para o paciente sem alguém apertar um botão.

## Arquivos afetados

- `components/admin/previa-do-material.tsx` — novo: o que o paciente vai ver.
- `app/admin/education/assignments/page.tsx` — a prévia na caixa, e as duas
  línguas.
- `app/admin/education/create/page.tsx` — a caixa de envio não abre sozinha,
  nada pré-selecionado, e confere quem recebe antes de enviar.
- `app/api/admin/education/assignments/route.ts` — o paciente e o material são
  desta clínica.
- `app/api/admin/education/send/route.ts` — o mesmo, nos três ramos, mais
  `dryRun`.
- `__tests__/education/antes-de-enviar-ao-paciente.test.ts` — novo.

## Critérios de aceite

- [x] Artigo importado traz a capa e as imagens do corpo, com endereço absoluto.
- [x] O preview mostra o que o paciente vai ver, com o logo BPR — e usa a
      **mesma** tradução de blocos e a **mesma** regra de língua do servidor.
- [x] Nenhuma tag, entidade ou endereço quebrado no que chega ao telefone.
- [x] As duas línguas conferidas, inglês primeiro.
- [x] Nada chega ao paciente sem um botão apertado por uma pessoa — e o botão
      agora diz **para quantas pessoas**.
- [x] O material e o paciente são desta clínica (dois furos fechados).
