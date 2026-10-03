# 120 — A falha que parece ausência

**Estado:** em andamento — **8 de 10 feitas** (03/10); a T-10 nasceu do QA. Duas rodadas de QA e review, 56 achados, 52 fechados
**Aberta em:** 02/10/2026
**Vem de:** os achados do code review e do QA comparativo da leva de 02/10 (specs [118](../118-a-aba-saude/plan.md) e [119](../119-o-que-a-withings-mostra/plan.md)) que **não** foram corrigidos nessa leva, porque cada um é uma decisão própria e não um conserto de linha.

## Objetivo

Fechar os oito itens que sobraram, todos da mesma família: **o produto não pode
dizer "não há" quando o que houve foi uma falha nossa.**

É o defeito mais caro desta base, e já apareceu de seis formas diferentes num
mês: a gaveta `BODY` vazia, o `sdnn_1` que não existe, a coluna `deviceName` que
faltava, o `temTracado: undefined`, as rotas que devolvem `[]` quando o banco
tropeça, e a VFC que vai caducar com o plano da Withings. Em todos, a tela do
paciente e o papel do médico ficam **exactamente iguais** a um paciente que
nunca mediu nada.

## Decisões de design

**Uma ausência tem de ter causa.** Onde hoje se devolve `[]` ou `null` por
falha, passa a haver um estado distinto — *"não conseguimos ler"* — que a tela e
o papel sabem escrever. Não é um erro 500 na cara do paciente: é a diferença
entre *"você não mediu"* e *"não conseguimos mostrar"*.

**O critério é um, lido pelos dois lados.** O `temTracado` e o papel do ECG
decidem hoje com réguas diferentes; quem lista diz que há traçado e quem desenha
diz que não. Ver [[esconder-botao-nao-e-fechar-porta]]: um critério só.

**Nada aqui inventa dado.** O SpO₂ é média de médias e vai continuar a ser uma
média — o que muda é **dizê-lo**.

**O que depende do Bruno fica dito, não contornado.** A T-2 pede um env novo no
Coolify e a T-3 uma coluna; nenhuma das duas se resolve com um palpite.

## Tarefas

| T | Nome | Depende | Estado |
|---|---|---|---|
| T-1 | [A falha do banco não pode parecer ausência de dado](t-1-a-falha-nao-e-ausencia.md) | — | **feita** (02/10) — QA achou 8 `catch` acima, fechados |
| T-2 | [O segredo da sondagem sai da query string](t-2-o-segredo-da-sondagem.md) | — | **feita** (02/10) — o `?listar=1` escapava; fechado. **Espera 2 envs no Coolify** |
| T-3 | [A pressão ganha fuso, e deixa de ser a excepção](t-3-a-pressao-ganha-fuso.md) | — | **feita** (02/10) — coluna nova; conferir `in sync` no deploy |
| T-4 | [O ECG mudo: o `throw` que o `catch` dos vitais engole](t-4-o-ecg-mudo.md) | — | **feita** (02/10) |
| T-5 | [`temTracado` e o papel usam a mesma régua](t-5-a-mesma-regua.md) | — | **feita** (02/10) — QA reprovou, régua refeita com a frequência; [16 casos medidos](qa/medicoes-t-5-a-regua.md) |
| T-6 | [O SpO₂ é média de médias, e o papel não diz](t-6-media-de-medias.md) | — | **feita** (02/10) — QA reprovou a guarda; passa a contar as métricas do HTML |
| T-7 | [O relatório que acabei de pedir não está no topo](t-7-o-relatorio-no-topo.md) | — | **feita** (02/10) |
| T-8 | [Dois toques no botão, dois relatórios](t-8-dois-toques-dois-relatorios.md) | — | **feita** (02/10) — o Bruno respondeu: coexistem, só não podem ser iguais. `contentHash` + a colisão deixa de dar 500 |
| T-9 | [A VFC caduca com o Withings+ e ninguém avisa](t-9-a-vfc-caduca.md) | T-1 | **pendente** — mede-se depois de ~16/10 |
| T-10 | [A resposta guardada, em vez de recalculada](t-10-a-resposta-guardada.md) | T-5 | **pendente** — a régua em SQL custa 3,5× o `select` que substitui |

## As duas rodadas de QA e review

| rodada | achados | relatório |
|---|---|---|
| 1ª | 20 (review) + 6 (QA), **2 tarefas reprovadas** | [report-t-1-a-t-7.md](qa/report-t-1-a-t-7.md) |
| 2ª | 18 (review) + 12 (QA), **4 altos** | [report-2a-rodada.md](qa/report-2a-rodada.md) |

**O que as duas rodadas ensinaram, e vale mais do que qualquer achado:** uma
correcção minha **desapareceu da árvore** e a suíte continuou verde, porque o
ramo que ela consertava não tinha teste nenhum. Aconteceu duas vezes — no
`?listar=1` e no `lerOuFalhar` do documento, que era o achado mais grave da 1ª
rodada. Os dois têm teste agora, e as mutações que os desfazem matam 2 e 13.

Ver também [as medições da régua](qa/medicoes-t-5-a-regua.md).

## Suposições

Postas aqui para validação, porque cada uma muda o que a tarefa entrega:

1. **O paciente pode ver "não conseguimos ler agora"** sem que isso o assuste —
   é melhor do que um gráfico vazio que ele leia como *"parei de medir"*. Se o
   Bruno preferir que a tela fique calada e só a clínica veja a falha, a T-1
   muda de forma.
2. **A coluna de fuso da pressão é `String?`**, guardando o identificador IANA
   como a Withings o manda (`"Europe/London"`), e não um offset — o offset muda
   com a hora de verão e o identificador não.
3. ~~**A sondagem aceita `WEARABLES_PROBE_SECRET` com recurso ao actual**
   enquanto o env não existir no Coolify.~~ → **mudei isto ao implementar**, e a
   mudança é a parte que precisa de validação.

   O recurso mantinha o `NEXTAUTH_SECRET` como chave válida, e é exactamente o
   buraco que a tarefa existe para fechar: quem tem o segredo que assina as
   sessões lê o prontuário de qualquer paciente, de qualquer clínica. Um recurso
   assim só serve a minha conveniência de medir em produção.

   **Ficou fechado por omissão.** Sem `WEARABLES_PROBE_SECRET` a rota responde
   503 e diz qual env falta; sem o e-mail em `WEARABLES_PROBE_EMAILS` responde
   403. O custo: a sondagem **não funciona em produção** até o Bruno pôr os dois
   envs. O que não fica bloqueado é a verificação do schema, que se lê no
   `in sync` do log do contentor.
4. **O tecto de dez minutos resolve-se com uma chave única no banco**, e não com
   um `lock` aplicacional: o produto corre em mais de um contentor.
5. **A VFC a caducar escreve-se como estado da ligação**, não como propriedade do
   dia — o plano é da conta, não da noite.

## O que esta atividade não faz

- Não mexe no que a leva de 02/10 já corrigiu e já tem QA (o papel por folha, a
  hora à meia-noite, as barras no dia do telefone, o papel PT).
- Não acrescenta métricas novas. O `distance` e o `soft` do `getactivity` são
  colunas novas e ficam para a 119, onde a medição vive.
