# T-2: O artigo, da clínica até a tela do paciente

**Status:** pendente
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

*(a preencher)*

## Critérios de aceite

- [ ] Artigo importado traz a capa e as imagens do corpo.
- [ ] O preview mostra o que o paciente vai ver, com o logo BPR.
- [ ] Nenhuma tag, entidade ou endereço quebrado na tela do telefone.
- [ ] As duas línguas conferidas, inglês primeiro.
- [ ] Nada chega ao paciente sem um botão apertado por uma pessoa.
