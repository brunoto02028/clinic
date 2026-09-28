# T-2: Dependente — o modelo, e a garantia de que ele não loga

**Status:** concluído (código e testes; QA e review pendentes)
**Depende de:** nenhuma

## Objetivo

O titular cadastra quem ele cuida, com o mínimo que o laboratório precisa para analisar a amostra
da pessoa certa: nome e data de nascimento.

## A decisão que estrutura tudo

**Dependente é tabela própria, não `User` com um sinalizador.**

Um `User` pode entrar. A promessa que fizemos — *"crianças e adolescentes menor de idade sempre
acompanhados com os pais"* — não pode depender de alguém lembrar de escrever uma condição em cada
rota nova. Sem `email`, sem `password`, sem `role`, **não há por onde entrar**, e a promessa passa a
ser uma propriedade da estrutura.

Os testes guardam isso diretamente: se alguém acrescentar um desses três campos ao modelo, a suíte
reprova.

## O que foi feito

| | |
|---|---|
| `model Dependent` | nome, sobrenome, data de nascimento (obrigatória), sexo, parentesco |
| `User.dependents` | `onDelete: Cascade` — some com a conta do titular |
| `lib/dependents.ts` | validação, idade em anos completos, e o recorte do que sai para o app |
| `GET/POST /api/mobile/labs/dependents` | lista e cadastra |
| `PATCH/DELETE /api/mobile/labs/dependents/[id]` | edita e remove |
| `mobile/app/(app)/(lab)/dependents.tsx` | a tela, alcançável pelo menu do laboratório |
| `mobile/src/lib/datas.ts` | `DD/MM/YYYY` ↔ ISO, agora num lugar só |

### Três cuidados que valem registro

1. **O titular vem sempre da sessão.** Nenhuma rota aceita `holderId` de fora, e a validação
   descarta o campo se ele vier no corpo. Um teste guarda exatamente isso.
2. **`where` leva o dono junto do id.** Achar pelo id e depois conferir o dono são duas operações, e
   a segunda é a que alguém esquece. Com os dois no `where`, o dependente de outra conta
   simplesmente não existe — e a resposta é 404, que não confirma nem desmente o id.
3. **A idade é calculada, nunca guardada.** Idade guardada envelhece em silêncio e um dia manda a
   faixa de referência errada para o laboratório. O cálculo é por comparação de data, não por
   divisão de milissegundos, porque a conta por milissegundo erra o aniversário de quem nasceu em 29
   de fevereiro — e "faz 16 hoje" é exatamente onde a resposta precisa estar certa.

## Como o schema foi aplicado

Banco local compartilhado entre worktrees, então **nada de `db push`**. O SQL saiu de
`prisma migrate diff` e foi aplicado com `prisma db execute`.

O diff trouxe junto um `DROP INDEX "WearableConnection_provider_providerUserId_key"` que **não é
desta tarefa** — é drift pré-existente entre o banco local e o schema. Apliquei só as minhas três
declarações (`CREATE TABLE`, `CREATE INDEX`, `ADD FOREIGN KEY`), nenhuma destrutiva. O drift segue
lá, anotado para quem for dono dele.

## Critérios de aceite

- [x] O modelo não tem e-mail, senha nem papel
- [x] Data de nascimento obrigatória; futuro e data absurda recusados
- [x] `holderId` do corpo é ignorado
- [x] Dependente de outra conta responde 404 em edição e remoção
- [x] A idade sai calculada, e acerta o caso do 29 de fevereiro
- [x] A tela diz, antes do primeiro campo, que essa pessoa não tem conta
- [x] EN e PT
- [ ] QA e code review
