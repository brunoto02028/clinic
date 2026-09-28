# Atividade 085 — Saber quem usa o app, e avisar

**Status:** aguardando aprovação
**Data:** 26/09/2026

## Objetivo

O Bruno:

> "eu quero sempre saber realmente quem são, onde estão, quanto tempo elas estão usando... e as
> notificações que eu quero mandar quando tiver algum tipo de exame novo, algum tipo de promoção"

E depois, fechando o escopo:

> "promoção de exames não teremos, só avisos"
> "cidade por IP mesmo por enquanto"

## O que existe, e o que não

| o que você quer | estado |
|---|---|
| Push para o aparelho | ✅ existe (`PushDeviceToken`, `lib/push-send.ts`, `/api/push-token`) |
| Quem são | ⚠️ o cadastro, e nada sobre uso |
| **Onde estão** | ❌ existe só para o **site** (`SiteVisitor`, por IP). O app não registra nada |
| **Quanto tempo usam** | ❌ nenhum modelo de sessão do app |
| **Mandar um aviso** | ❌ sem público, sem prévia, sem histórico |

## Decisões de design

### 1. Cidade por IP, não GPS

Decisão do Bruno. Responde "onde estão meus usuários" sem prompt no aparelho, sem texto de
propósito, e **sem mexer nas respostas de privacidade da ficha na App Store** — que é o que GPS
custaria. Também evita um build: a permissão de localização vive no `app.json`, e mexer ali muda o
fingerprint.

O IP já chega em toda requisição. A resolução para cidade acontece no servidor, no login e na
renovação de sessão — não em toda chamada, que seria ruído.

### 2. "Aviso" e "promoção" são a mesma coisa quando anunciam o que vendemos

O Bruno tirou a promoção do escopo, e isso simplifica de verdade: cai o consentimento separado de
marketing e cai a ferramenta de campanha.

Mas a linha precisa estar escrita: *"exame novo disponível"* enviado por push **é marketing no Reino
Unido**, porque anuncia um produto — a palavra "aviso" não muda o enquadramento. Então:

- **Push** fica para o transacional: resultado liberado, consulta amanhã, mensagem da terapeuta,
  pendência a resolver.
- **Novidade sobre o que vendemos** aparece **dentro do app**, numa faixa na tela do laboratório.
  Quem abre vê; ninguém é interrompido; nenhuma pergunta de consentimento.

Isto é melhor como produto, não só como conformidade: se a promoção incomodar, a pessoa desliga a
notificação **inteira** — inclusive a do resultado dela.

### 3. O público nasce filtrado por tenant, e com teste que prova

O envio em massa é **exatamente a forma do incidente de 11/09/2026** — vazamento cross-tenant no
envio de mensagens. Um seletor de público é o mesmo desenho. Então o filtro de tenant é a primeira
tarefa, não um detalhe da última, e vem com um teste que reprova quem o remover.

### 4. Nada sai automaticamente, e nada sai sem prévia

Regra do Bruno, e continua valendo sem ele repetir: botão manual, crons de lembrete seguem
desligados, e a prévia com o logo BPR é etapa obrigatória — na conversa e na tela.

### 5. Tempo de uso é sessão, não evento

Contar toques geraria uma tabela enorme para responder uma pergunta simples. Uma sessão tem começo,
último sinal e fim; "quanto tempo" é a soma. O app manda um sinal na abertura e a cada poucos
minutos enquanto está em primeiro plano.

## Tarefas

| T-N | nome | depende de | status |
|---|---|---|---|
| T-1 | Sessão do app: modelo, sinal e fechamento | — | pendente |
| T-2 | Cidade por IP, no login e na renovação | — | pendente |
| T-3 | O painel: quem são, onde estão, quanto usam | T-1, T-2 | pendente |
| T-4 | Aviso manual: público por tenant, prévia, histórico | T-3 | pendente |
| T-5 | Novidade dentro do app, em vez de push | — | pendente |

## Suposições

1. **Sessão expira em 30 minutos sem sinal.** Fechar o app não manda nada confiável; o que fecha a
   sessão é o silêncio.
2. **Cidade e país, não coordenada.** Nada mais fino que cidade é guardado.
3. **O IP não é guardado junto do perfil** — só a cidade resolvida. O IP cru já vive no
   `ConsentLog` quando há consentimento, que é onde ele tem função.
4. **Um provedor de geolocalização gratuito por IP**, com cache por IP. Se ele cair, a sessão é
   gravada sem cidade — não falha.
5. **Aviso só para quem tem token de push válido**; sem token, a pessoa simplesmente não recebe.
6. **Sem agendamento.** O aviso sai quando o Bruno aperta, ou não sai.
7. **Todo texto em EN e PT**, inglês primeiro.

## Fora do escopo

- GPS, geofence, mapa.
- Promoção e campanha de marketing (decisão do Bruno).
- Segmentação por comportamento ("quem não abre há 30 dias") — depende da T-1 existir primeiro.
- E-mail e SMS: aqui é push e in-app.
