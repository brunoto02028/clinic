# T-5: Enviar exercício avulso, não a pasta inteira

**Status:** feita (27/09) — em QA
**Depende de:** nenhuma

## Objetivo

Mandar **um** exercício para um paciente, sem mandar a pasta em que ele está — e
o paciente ver a lista do que foi mandado para ele, não o nome de uma pasta da
clínica.

## Contexto

Palavras do Bruno: *"A forma como os exercícios aparecem para o paciente, quero
poder enviar exercícios individuais e não a pasta toda."*

Hoje o exercício vive numa pasta (`lib/exercise-folders.ts`, `folderId` na
criação), e a atribuição ao paciente acompanha esse recorte. O efeito na tela do
paciente é ele receber "Advanced Core" com dez itens quando o terapeuta queria
mandar três — foi o que apareceu no card de aderência do próprio Bruno: *"Missing
10 activities today"*, com Advanced Core 001 a 010.

A pasta continua útil: é como a clínica organiza o acervo. O que ela não pode
ser é **a unidade de envio**.

## Passos

1. Na tela do exercício, no painel, um botão "mandar para um paciente" com busca
   de paciente — o mesmo exercício, sem a pasta.
2. Na tela do paciente, a lista do que ele recebeu com origem por item
   (avulso ou de uma pasta), para dar para tirar um sem tirar o resto.
3. Do lado do paciente: a lista é **dele**, agrupada por dia/sessão, não por
   pasta da clínica. O nome da pasta some da tela do paciente.
4. Prescrição por item — séries, repetições, observação — continua valendo para
   o avulso.
5. Nada é enviado sozinho: mandar exercício continua sendo um botão, e o aviso
   ao paciente segue a regra de sempre.

## Arquivos afetados

- `app/admin/exercises/page.tsx` (o botão de mandar)
- `app/api/admin/exercises/**` e a rota de atribuição
- `app/admin/patients/[id]` aba Exercises
- `mobile/app/(app)/(clinica)/exercise/**` e a lista do protocolo
- `prisma/schema.prisma` se a atribuição hoje só guardar pasta

## Critérios de aceite

- [ ] Dá para mandar um exercício sem mandar a pasta
- [ ] Dá para tirar um exercício de um paciente sem tirar os outros
- [ ] O paciente não vê nome de pasta da clínica
- [ ] Séries e repetições valem para o avulso
- [ ] Nada sai para o paciente sem alguém apertar um botão

---

## Como ficou

**O modelo já sabia.** `ExercisePrescription` é uma linha por exercício, e a
rota do painel já aceitava `exercises: [...]`. O que não existia era a porta: a
única forma de prescrever pelo painel era a pasta inteira — e foi isso que fez o
card de aderência cobrar dez exercícios por dia.

| o quê | onde |
|---|---|
| **Add one** | na aba de exercícios do paciente, **antes** do "Add folder", porque é o caso mais comum |
| busca na biblioteca | com o nome da pasta embaixo de cada item — para **quem prescreve** se situar |
| sem plano pendurado | `protocolId` nulo: arquivar um plano não leva o avulso junto |
| tirar um | já existia e continua: remover uma prescrição não mexe nas outras |
| a pasta | continua funcionando, para quem manda um programa inteiro |

**E o paciente deixou de receber o nome da pasta.** A rota `/api/exercises`
mandava `exercise.folder.name` — nome da nossa estante, "Advanced Core" — para o
aparelho dele. Agora manda `grupo`, que é o `displayGroup` da prescrição **dele**
e pode ser nenhum. Ninguém consumia o campo antigo, então nada quebrou; o que
some é a exposição da organização interna da clínica.
