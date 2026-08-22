---
name: clinical-evidence-report
description: Gera um relatório de cruzamento de evidência científica internacional para um paciente de fisioterapia/reabilitação logo após a triagem — busca literatura (revisões sistemáticas, RCTs, guidelines) em múltiplos idiomas via Europe PMC, classifica por nível de evidência, cruza com o catálogo real de equipamentos e exercícios da clínica, e produz sugestões de tratamento e exercício rastreáveis até a fonte. Use esta skill sempre que o usuário pedir para "cruzar dados de literatura", "gerar relatório de evidência para o paciente", "ver o que a ciência diz sobre esse caso", "sugestão de tratamento baseada em evidência", ou depois que uma triagem/anamnese de paciente for preenchida e o próximo passo natural for embasar a conduta — mesmo que o usuário não use a palavra "evidência" explicitamente, mas descreva um paciente com queixa, escores (dor, FAAM, Sport, função) e peça ajuda para decidir tratamento ou exercícios.
---

# Relatório de cruzamento de evidência clínica

## O que esta skill faz e por que ela existe

Depois que um paciente preenche a triagem, esta skill busca o que a literatura internacional
diz sobre a condição dele, separa isso por força de evidência, e cruza com o que a clínica
realmente tem disponível (equipamento, exercícios, protocolos) — para que a sugestão final
seja tanto embasada quanto executável. O objetivo não é substituir o fisioterapeuta, é
chegar à consulta com o trabalho de levantamento já feito e citável.

Isso é sensível por natureza — é sugestão de conduta de saúde. Todo o desenho abaixo existe
para que o sistema seja útil sem nunca se comportar como se fosse o profissional de saúde.
Leia a seção de "Limites" antes de rodar isso pela primeira vez.

## Antes de tudo: checagem de segurança (red flags)

Leia `references/red-flags.md` e compare com os dados da triagem. Se qualquer sinal de
alerta estiver presente, **pare aqui** — não busque evidência, não gere sugestão de
tratamento. Produza só um alerta curto dizendo qual sinal foi identificado e que o caso
precisa de avaliação humana prioritária. Isso é mais importante que qualquer outra parte
desta skill.

Se não houver red flags, siga o fluxo abaixo.

## Fluxo de trabalho

### 1. Estruturar a entrada

A partir da triagem/anamnese do paciente, extraia (ou peça, se faltar): queixa principal,
localização, tempo de evolução, escores relevantes (dor, FAAM ADL, FAAM Sport, função — o
que estiver disponível), e qualquer achado clínico já registrado. Isso vira o cabeçalho do
relatório final.

### 2. Buscar literatura

Use `scripts/search_literature.js` — não tente reimplementar a chamada à API à mão, o script
já resolve parsing, extração de campos e classificação por nível de evidência de forma
determinística (o mesmo input sempre produz a mesma classificação; se você tentar julgar
"isso é uma revisão sistemática?" a cada execução, a resposta varia).

```
node scripts/search_literature.js "<query em inglês>" [maxResults]
```

Retorna JSON no stdout, já ordenado do nível de evidência mais forte para o mais fraco.
Alguns pontos importantes:

- **Monte a query em inglês.** A cobertura e a terminologia consistente da literatura de boa
  qualidade estão majoritariamente em inglês — inclusive estudos publicados originalmente em
  outros idiomas costumam ter título/abstract em inglês indexados. Combine condição +
  intervenção, por exemplo "patellofemoral pain syndrome exercise therapy" ou "lateral
  epicondylitis eccentric loading". Evite queries genéricas demais ("knee pain").
- **Rode 2 a 4 queries** cobrindo ângulos diferentes do mesmo caso (ex.: uma pela condição +
  exercício, outra pela condição + modalidade específica que a clínica tem), e junte os
  resultados removendo duplicatas por `id`.
- O campo `language` de cada resultado te diz o idioma original do artigo — isso é o "vários
  idiomas, vários lugares do mundo" que dá lastro internacional ao relatório.
- O script não requer chave de API (Europe PMC é público e gratuito). **Só termos clínicos
  vão na query — NUNCA nome, e-mail, data de nascimento ou qualquer dado do paciente.**

### 3. Selecionar o que entra no relatório

Não despeje tudo que voltou da busca. Priorize: até ~3 revisões sistemáticas/meta-análises,
até ~3 RCTs, e só complete com revisões narrativas/outros se a busca não trouxe evidência
mais forte. Um relatório com 6-8 fontes bem escolhidas é mais útil — e mais lido — que um com 20.

### 4. Cruzar com os recursos da clínica

Leia `clinic-resources.json` (nesta pasta da skill). Se ainda não existir, gere-o com
`node scripts/generate_clinic_resources.mjs` (lê o banco da clínica) ou copie
`templates/clinic-resources.example.json` e preencha à mão. Para cada sugestão de tratamento
ou exercício que a evidência aponta, verifique se ela é viável com o que está catalogado.
Separe sempre em **"disponível agora"** vs. **"mencionado na literatura mas fora do que a
clínica oferece hoje"** — a segunda lista não é descartada, ela é sinal de oportunidade de
investimento, mas nunca deve ser apresentada como algo que o paciente pode receber amanhã.

### 5. Escrever o relatório

Use `templates/report-template.md` como estrutura fixa — preencha as seções, não invente
novas, e **nunca remova o aviso clínico do final**. O relatório deve deixar rastreável, para
cada sugestão, de qual fonte da seção 2 ela veio (isso é o que torna o relatório auditável em
vez de uma lista de afirmações soltas).

Quando gerar texto com IA, use o provider **GDPR-safe (Claude)** — nunca Minimax — porque o
contexto envolve dados de saúde do paciente.

### 6. Gráficos

Se o relatório for exibido dentro do sistema (não como markdown puro), a seção de evolução do
paciente deve reaproveitar o componente de gráfico que a clínica já usa —
`components/dashboard/trend-chart.tsx` (`TrendChart`, small-multiples por entidade: dor,
FAAM ADL, Sport, função — cada um com sua cor própria) — em vez de desenhar um gráfico novo
do zero. Consistência visual entre "seu progresso" e "o que a evidência diz" ajuda o paciente
a conectar os dois.

## Limites — leia isto

Esta skill não diagnostica, não prescreve e não decide conduta sozinha. Ela levanta e
organiza evidência para acelerar o trabalho de quem decide — o fisioterapeuta responsável.
Todo relatório gerado precisa passar por revisão humana antes de qualquer contato com o
paciente. Se em algum momento o sistema em que isso rodar permitir que o relatório vá direto
ao paciente sem essa revisão, isso é uma falha de processo a corrigir fora desta skill, não
algo que a skill deva tentar compensar sozinha.

## Arquivos desta skill

- `scripts/search_literature.js` — busca + classificação de evidência (Node 18+, sem
  dependências, sem chave de API).
- `scripts/generate_clinic_resources.mjs` — gera `clinic-resources.json` a partir do banco
  da clínica (exercícios + protocolos + equipamentos). Rode contra produção para o catálogo
  completo.
- `templates/report-template.md` — estrutura fixa do relatório final.
- `templates/clinic-resources.example.json` — modelo do catálogo; copie para
  `clinic-resources.json` e preencha, ou use o gerador acima.
- `references/red-flags.md` — checagem de segurança obrigatória antes de gerar qualquer sugestão.
