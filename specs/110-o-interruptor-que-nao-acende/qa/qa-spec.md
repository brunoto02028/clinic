# QA — Atividade 110

O teste central desta atividade é sempre o **par**: ligar e desligar o mesmo
interruptor e ler o app das duas vezes. Um cenário que só liga passa com um app
que mostra tudo; um que só desliga passa com um app que não mostra nada.

**Paciente de teste identificado**, nunca um real. Em produção, `TZ=UTC` no
servidor e o commit conferido em `/version.json` antes de medir.

## T-1 — o painel para de prometer

| # | tipo | cenário | esperado |
|---|---|---|---|
| 1.1 | UI | Abrir as permissões de um paciente | Achievements, Community, Marketplace e Pre-Consultation Recording com o selo "ainda não no app" |
| 1.2 | UI | Ler os outros vinte | **Nenhum** com o selo — o controle que prova que o selo discrimina |
| 1.3 | UI | Abrir a tela de padrão para novos | O mesmo selo nos mesmos quatro |
| 1.4 | API | `PATCH` ligando um módulo marcado | **200** — o selo informa, não trava |
| 1.5 | UI | Ligar um marcado e abrir o app | O menu não muda; nenhum item novo |

## T-2 — o prontuário obedece

Cada linha é medida **duas vezes**: com o módulo ligado e desligado.

| # | tipo | cenário | esperado |
|---|---|---|---|
| 2.1 | UI | `mod_clinical_notes` **desligado** | **My records** some do menu do app |
| 2.2 | UI | `mod_clinical_notes` **ligado** | **My records** volta |
| 2.3 | UI | `mod_documents` desligado / ligado | **My documents** some / volta |
| 2.4 | UI | `mod_messages` desligado / ligado | **Messages** some / volta |
| 2.5 | UI | **Tudo** desligado | **Terms & consent**, **Who has access** e **Notifications** continuam |
| 2.6 | UI | Estado de hoje, nada mexido | O menu é idêntico ao de antes da mudança — ninguém perde acesso ao atualizar |

O 2.5 é o que impede a correção de ir longe demais: aceitar termos, saber quem lê
o seu prontuário e mexer nos próprios avisos não são funcionalidades de plano.

## T-3 — o servidor nega

| # | tipo | cenário | esperado |
|---|---|---|---|
| 3.1 | API | Levantamento módulo → rota | Uma tabela, sem buracos |
| 3.2 | API | Rota do prontuário, módulo **desligado** | Status exato, e nenhum dado clínico no corpo |
| 3.3 | API | A mesma rota, módulo **ligado** | 200 com dado — o controle |
| 3.4 | API | Sessão de outro inquilino | **404**, nunca 403 |
| 3.5 | UI | Menu escondido + rota digitada à mão | A tela não entrega |

## T-4 — cada interruptor diz o que acende

| # | tipo | cenário | esperado |
|---|---|---|---|
| 4.1 | UI | Ligar cada módulo, um a um, e ler o menu | O item que aparece tem o nome que o painel prometeu |
| 4.2 | UI | O módulo que governa vários itens | A descrição lista os itens |
| 4.3 | teste | Rótulos do registry × títulos do menu | Nenhum rótulo nomeia coisa que o app chama de outro jeito |

O 4.1 é o cenário do Bruno, invertido: em vez de ligar três e ver nada, ligar cada
um e ver **o que** acendeu.

## T-5 — a ordem

| # | tipo | cenário | esperado |
|---|---|---|---|
| 5.1 | UI | Ler cada grupo em inglês | Ordem alfabética dentro do grupo |
| 5.2 | UI | Trocar para português | Ordem alfabética **portuguesa**, não a inglesa traduzida |
| 5.3 | UI | Um rótulo com acento | Não vai para o fim da lista |
| 5.4 | UI | A ordem dos grupos | Igual à de hoje |

## O que não se faz neste QA

- Não se liga nada em paciente real.
- Não se manda e-mail nem push para ninguém.
- Não se cria paciente novo: não há rota para apagar.
