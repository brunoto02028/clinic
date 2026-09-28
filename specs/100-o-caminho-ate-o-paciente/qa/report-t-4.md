# QA — 100 T-4: a varredura

**Data:** 28/09/2026
**Como:** `__tests__/tenant/toda-tela-tem-caminho.test.ts`, que confronta
`app/admin/**/page.tsx` com as rotas citadas em `lib/admin-sections.ts` e com
os links de arquivos vivos.

## O número

| | |
|---|---|
| Telas em `app/admin` | **113** |
| Sem entrada no menu | 33 |
| **Sem caminho nenhum** (nem menu, nem link de tela viva) | **16** |

As 17 que estão "sem menu mas com link" são legítimas: a lista que leva ao
detalhe é caminho. `/admin/articles/new` a partir de Artigos,
`/admin/foot-scans/[id]` a partir da lista, e assim por diante.

## O que conta como caminho — e o que não conta

Conta: uma entrada no menu, ou um link a partir de outra tela viva.

**Não conta `admin-sidebar.old.tsx`.** Ele não é mais usado — e foi exatamente
ele que deu a falsa impressão de que a educação estava no menu: era o único
arquivo do repositório que a citava. Nove das dezesseis órfãs estão nessa
situação.

Também não conta uma rota de `app/api`: ninguém navega para ela.

## As dezesseis, e por quê

**Só o menu antigo as citava** — ninguém chega nelas pelo painel desde que ele
saiu de uso:

`/admin/body-models` · `/admin/command-center` · `/admin/cpd-courses` ·
`/admin/documents` · `/admin/email-test` · `/admin/foot-scans` ·
`/admin/global-dashboard` · `/admin/my-education` · `/admin/study`

**Nunca citadas em lugar nenhum:**

`/admin/login` (o login da equipe é `/staff-login`) · `/admin/scans` ·
`/admin/scans/report-preview` · `/admin/treatments`

**Sub-telas do paciente que a ficha dele não abre:**

`/admin/patients/[id]/documents` · `/admin/patients/[id]/permissions` ·
`/admin/patients/[id]/report` — esta última é a que mais engana: a ficha abre a
**API** do relatório (`/api/admin/patients/…/report`), e a **tela** de mesmo
nome fica sem uso.

## A prova de que o teste protege

Tirei `/admin/biohacking` do menu de propósito e rodei:

```
Tests: 2 failed, 3 passed
  ● nenhuma tela nova sem caminho
  ● o que o Bruno procurou hoje tem caminho
```

Devolvi a linha e voltou a passar. Ou seja: **uma tela nova sem caminho quebra
a suíte**, em vez de chegar ao Bruno como "está pronto".

## O que não é decisão minha

As dezesseis não foram postas no menu. Pôr dezesseis entradas de uma vez
encheria o painel de telas cuja utilidade eu não sei julgar — algumas podem
estar mortas, outras podem ser exatamente o que falta.

Elas estão na lista de exceções do teste, **com motivo escrito**, e cada linha
é uma decisão: pôr no menu, ligar a partir de alguma tela, ou apagar.

Quatro que me parecem valer a pergunta: **`/admin/documents`**,
**`/admin/foot-scans`**, **`/admin/treatments`** e **`/admin/global-dashboard`**.

## Correção da própria varredura (mesma tarde)

O Bruno perguntou onde ficam as **consultas por vídeo**. A varredura dizia que
`/admin/video-consultations` tinha caminho. **Não tinha**, e a varredura estava
errada por dois motivos:

1. **`matchRoutes` contava como caminho.** Ele só **acende a seção** quando
   você já está na tela — não leva a lugar nenhum. Só `href:` é clicável.
2. **Menção em comentário contava como link.** As duas citações da rota em
   `app/admin/appointments/page.tsx` são comentários explicando por que algo
   mudou.

Corrigidas as duas, apareceram **mais sete** sem caminho: `agent-keys`,
`ai-coworker`, `analytics`, `calls`, `clinical-ai`, `sales`, `voice-costs`.

Total real: **24 telas sem caminho**, não 16.

## O que foi feito com elas

*"Coloca tudo no menu (…) eu quero escolher o que não vamos usar depois"* —
então entraram **todas as 20 que podem virar entrada de menu**:

- **Agenda:** Consultas por vídeo · Ligações
- **Clínico:** IA clínica · Escaneamento de pés · Scans (2ª versão?) ·
  Tratamentos (2ª versão?) · Modelos 3D · Documentos
- **Marketing:** Vendas · Analytics
- **Configurações:** IA colega · Chaves de agente · Custos de voz · Central de
  comando · Todas as clínicas · Estudo · Cursos CPD · Minha educação · Teste de
  e-mail · Tela de login (antiga)

Dois rótulos dizem o que eu não sei julgar: **"Scans (2ª versão?)"** e
**"Tratamentos (2ª versão?)"** usam os mesmos títulos de telas que já existem —
provavelmente são duplicatas, e a decisão é sua.

## As quatro que sobraram, e por quê

Três são sub-telas do paciente (`documents`, `permissions`, `report`): não
podem virar entrada de menu, porque não existe menu sem um paciente escolhido.
O caminho delas é um link na ficha — ainda não existe.

A quarta é `/admin/scans/report-preview`, prévia alcançada a partir de
`/admin/scans`.

## Veredito

**Aprovado.** A varredura roda na suíte, acha as 113 telas, aponta as 16 sem
caminho, e falha quando aparece uma nova. O teste foi verificado por sabotagem
deliberada, não só por passar.
