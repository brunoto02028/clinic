# Atividade 110 — O interruptor que não acende

**Aberta:** 30/09/2026
**Origem:** o Bruno ligou *Achievements*, *BPR Journey* e *Community* no painel de
permissões e nada apareceu no app do paciente.

## O que ele pediu

1. Conferir se o que cada botão do painel faz reflete no app do paciente.
2. Ordenar a lista alfabeticamente.
3. Um setup de permissões configurável para usuários novos.

## O que foi encontrado

O menu do app é uma **lista fixa** em
`mobile/app/(app)/(clinica)/(tabs)/profile.tsx`, e cada item pode ou não carregar
a chave de um módulo. O painel tem 24 interruptores. Cruzados os dois:

### Quatro não ligam nada — não existe tela no app

`mod_achievements`, `mod_community`, `mod_marketplace`, `mod_recordings`.

São exatamente os que o Bruno testou. O interruptor existe, muda o banco, e não
há para onde o paciente ir.

### Quatro são ignorados — a tela está no menu **sem** a chave

Messages, My documents, Terms & consent e **My records**. O app mostra sempre,
independentemente do painel.

### Quatro governam coisa de outro nome

| o painel diz | o app mostra |
|---|---|
| BPR Journey | **Daily check-in** |
| Education | **Articles** |
| My Records | **Outcome measures** e **My reports** |
| Plans & Membership | Plans |

### O que ninguém pediu para olhar, e é o mais sério

Somando a segunda e a terceira lista: **desligar "My Records" não esconde "My
records"**. Esconde as medidas de evolução e os relatórios; o prontuário — as
notas clínicas — continua visível, porque aquele item não carrega chave nenhuma.
Uma clínica que restringe o prontuário acha que restringiu e não restringiu.
Existe um `mod_clinical_notes` no catálogo e ele não governa coisa alguma.

E o portão do app **falha aberto**: `!acesso || acesso.modules.includes(...)`.
Se a chamada de permissões falhar, o menu inteiro aparece. É defensável — não
trancar o paciente fora por rede ruim — mas significa que o interruptor é
conselho na tela, não tranca. Quem tranca tem de ser o servidor, e isso ainda
não foi verificado rota a rota.

### O terceiro pedido já existia

`/admin/patients/permissions-default` existe, a API existe, e o padrão é
**copiado** para o paciente quando a conta nasce — snapshot, então mudar o padrão
depois não mexe em quem já existe. Ligado nos **seis** caminhos de criação:
cadastro público, Google, admin, registro pelo app, agente de voz e login social.

Nada a construir. Fica a confirmação com o Bruno de que a tela faz o que ele quer.

## Decisões do Bruno (30/09)

| pergunta | escolha |
|---|---|
| os quatro sem tela | **marcar "ainda não no app"** — ficam no painel, desligados, com selo |
| os quatro ignorados | **passam a obedecer, e o servidor também** — inclusive o prontuário |
| a ordem | **alfabética dentro de cada grupo**, mantendo os cinco grupos |

`Terms & consent` fica fora da regra, de propósito: aceitar termos não é
funcionalidade que uma clínica desligue, pela mesma razão que "Quem tem acesso" e
"Notificações" não têm chave.

## Tarefas

| T-N | nome | status |
|---|---|---|
| T-1 | [O painel para de prometer o que o app não tem](t-1-o-painel-para-de-prometer.md) | 🟢 concluída (30/09) — QA aprovado 5/5 |
| T-2 | [O prontuário obedece ao interruptor](t-2-o-prontuario-obedece.md) | 🟢 concluída (30/09) — QA 22/24, as 2 falhas corrigidas |
| T-3 | [O servidor nega, e não só a tela](t-3-o-servidor-nega.md) | 🟢 concluída (30/09) — QA 22/24, as 2 falhas corrigidas |
| T-4 | [Cada interruptor diz o que acende](t-4-cada-interruptor-diz-o-que-acende.md) | 🟢 concluída (30/09) — QA aprovado |
| T-5 | [Ordem alfabética dentro dos grupos](t-5-ordem-alfabetica.md) | 🟢 concluída (30/09) — QA aprovado |

## Suposições

Tudo abaixo foi decidido por mim e precisa de validação:

- **`mod_recordings` entra no grupo dos sem tela.** A gravação pré-consulta tem
  rota na web (`/dashboard/recordings`) e nenhuma tela no app. Como o app é o
  único alvo do paciente depois do lançamento, tratei como "ainda não no app".
- **O selo é informativo, não uma trava.** Um módulo marcado "ainda não no app"
  continua gravável pela API — só não engana quem olha a tela. Travar a escrita
  criaria um segundo lugar para esquecer de destravar quando a tela nascer.
- **"Plans & Membership" → "Plans" não é defeito**, é o mesmo lugar com nome
  curto no telefone. Entra na T-4 só como acerto de rótulo.
- **A T-3 pode crescer.** Verificar rota a rota se o servidor nega pode revelar
  rotas que entregam dado de módulo desligado. Se encontrar, aviso antes de
  consertar — pode virar atividade própria.
- **Não mexo no fail-open do app.** Trancar o menu quando a chamada falha
  deixaria um paciente sem nada numa rede ruim. A tranca certa é no servidor
  (T-3), e é ela que estou fazendo.
