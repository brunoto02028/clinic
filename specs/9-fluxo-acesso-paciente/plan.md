# Atividade 9 — Fluxo de acesso do paciente

## Objetivo

Quatro problemas relatados pelo Bruno em 15/08/2026, todos na fronteira entre o
que o admin mostra e o que o paciente recebe. O tema comum é que **cada tela
calcula o acesso do seu jeito**, e as respostas divergem.

## O que foi apurado antes de planejar

### 1. O dev aparece como profissional agendável

`app/api/therapists/route.ts` devolve todo usuário com role `ADMIN`,
`THERAPIST` ou `SUPERADMIN`. O Kaio Passos é `SUPERADMIN` porque é o
desenvolvedor — e isso basta para o paciente poder marcar consulta com ele.

Não existe no sistema a ideia de "quem atende paciente": ser staff e ser
profissional agendável são a mesma coisa. A rota também devolve o `email` de
cada um, que a tela de agendamento não usa.

### 2. A triagem aparece concluída sem ter sido

Duas telas leem o mesmo estado de formas diferentes:

| Tela | Como decide | Correto? |
|---|---|---|
| Permissões (`permissions/route.ts:54`) | `medicalScreening?.isSubmitted === true` | sim |
| Ficha do paciente (`[id]/page.tsx:1059`) | `data.screening ? "Completed" : "Not filled"` | **não** — só olha se a linha existe |

Basta existir um registro, por qualquer motivo, para a ficha dizer "Completed".

### 3. Uma funcionalidade escreve na ficha clínica de outra

`app/api/patient/outcome-measures/route.ts:119` **cria um registro de triagem
médica** só para guardar uma nota de dor. É o tipo de linha que faz a tela do
item 2 mentir.

**Não é o AI Import**, e **não é o Acesso Total** — ambos descartados por
evidência: o paciente investigado tem zero documentos (o AI Import exige um
arquivo) e a rota de Acesso Total só lê, nunca escreve.

### 4. O admin e o portal calculam acesso separadamente

`permissions/route.ts` tem a sua própria lista de módulos concedidos por
tratamento (linhas 72–74), e `patient/access/route.ts` tem a dele. São duas
implementações da mesma pergunta — "o que este paciente enxerga?" — livres
para discordar. É a explicação mais provável para módulos liberados no admin
não aparecerem no portal.

## Decisões de design

**Profissional agendável vira um campo explícito.** Não dá para inferir de
role: o Bruno é `SUPERADMIN` e atende; o Kaio é `SUPERADMIN` e não atende.

**A triagem passa a ter origem.** "Respondida pelo paciente" e "preenchida pela
clínica" são fatos clínicos diferentes e a ficha deve distinguir. Hoje as duas
viram o mesmo "Completed".

**Uma fonte única de verdade para acesso.** As duas telas passam a chamar a
mesma função. Enquanto forem duas implementações, vão divergir de novo.

## Tarefas

| Tarefa | Nome | Status |
|---|---|---|
| T-1 | Profissional agendável | concluído |
| T-2 | Estado real da triagem na ficha | pendente |
| T-3 | Parar a criação de triagem por efeito colateral | pendente |
| T-4 | Fonte única de acesso, admin e portal | pendente |

Ordem sugerida: T-1 e T-2 são independentes e rápidos. T-3 depende da decisão
tomada em T-2. T-4 é o maior e deve vir por último.

## Suposições

Cada uma muda o resultado se estiver errada:

1. **Só o Bruno atende hoje.** A migração marca `bookable = true` apenas para
   ele; qualquer outro profissional precisa ser marcado à mão depois.
2. **Ninguém depende do `email` devolvido por `/api/therapists`.** Vou removê-lo
   do retorno; se algum consumidor usar, quebra.
3. ~~**Triagem preenchida pela clínica continua valendo como triagem.**~~
   **CONFIRMADO pelo Bruno em 15/08/2026:** os dois caminhos liberam o portal
   — a clínica pode liberar preenchendo, e o paciente pode liberar respondendo
   pelo portal. A origem muda apenas o rótulo na ficha, nunca a regra de
   acesso.
4. **Os registros de triagem existentes foram preenchidos por gente.** São 3
   enviados e 0 parciais em produção. Nenhum será apagado; no máximo ganham a
   marcação de origem, com "preenchida pela clínica" como padrão para os que
   não tiverem como provar a origem.
5. **O comportamento do Acesso Total está correto** — libera tudo
   independente de plano. O problema é só a ficha exibir a triagem errada
   quando ele está ligado.

## Verificação

QA no site em produção (`bpr.clinic`) com paciente de teste descartável, do
mesmo jeito que foi feito nas atividades 7 e 8: conta criada, cenário
executado no navegador, evidência capturada, conta removida ao final.
