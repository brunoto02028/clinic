# QA — 101

Cenários por tarefa. Cada relatório (`report-t-N.md`) responde a estes, com
evidência medida — nunca "deve funcionar".

## Regras que valem em todos

- **Paciente de teste identificado.** Nunca logar ou semear num paciente real.
- **Nenhum token, cookie ou chave no relatório.** Tamanho e veredito, nunca o
  valor.
- **QA online depois do deploy**, com o commit confirmado na lista de
  deployments do Coolify — `buildDate` não prova nada.
- **Um QA por vez.** Dois servidores de dev disputando `.next`, a porta e o
  cookie por host falham em silêncio.

---

## T-1 — A consulta por vídeo

### API (contra a Daily de verdade, não mock)

| # | cenário | esperado |
|---|---|---|
| 1.1 | Paciente entra dentro da janela | 200, URL real da sala, token, `ehTerapeuta: false` |
| 1.2 | Terapeuta entra | 200, `ehTerapeuta: true`, nome e duração |
| 1.3 | Consulta de amanhã | 409 `too_early` |
| 1.4 | Consulta de ontem | 409 `too_late` |
| 1.5 | Consulta presencial | 409 `not_video` |
| 1.6 | Alguém que não é da consulta | 404 `not_found` (nunca 403) |
| 1.7 | Sem autenticação | 401 |
| 1.8 | Chamar o paciente | 200 com a contagem de aparelhos |
| 1.9 | Chamar sendo outro que não o terapeuta | 404 |
| 1.10 | Chamar uma consulta concluída | 409 `not_scheduled` |

### Painel da clínica

| # | cenário | esperado |
|---|---|---|
| 1.11 | Consulta de outro terapeuta | sem botão de entrar/chamar, **e com o nome de quem atende** |
| 1.12 | Consulta minha | os dois botões |
| 1.13 | Consulta `CONFIRMED` que já passou | aparece em "passadas", não some |
| 1.14 | Contadores | por vir + passadas = total |
| 1.15 | Cada aba da agenda | a aba acesa é a aba em que se está |

### Sala na web

| # | cenário | esperado |
|---|---|---|
| 1.16 | Dentro da janela | iframe da Daily, com token, câmera e microfone liberados |
| 1.17 | Cedo demais | frase que diz **a partir de quando**, com "tentar de novo" |
| 1.18 | Tarde demais | frase de encerrada, **sem** "tentar de novo" |
| 1.19 | Inglês e português | as duas, inglês como padrão |
| 1.20 | Tarja de cookie | não aparece por cima da chamada |

### App do paciente

| # | cenário | esperado |
|---|---|---|
| 1.21 | Lista de consultas | a consulta por vídeo se anuncia, e o botão aparece na janela |
| 1.22 | Detalhe da consulta | botão de entrar |
| 1.23 | Toque no aviso de chamada | abre a tela da consulta, com o app aberto e fechado |
| 1.24 | Consulta cancelada | sem botão de entrar |

---

## T-2 — O artigo, da clínica até a tela do paciente

*(a escrever quando a T-1 fechar)*

---

## T-3 — A clínica marca, o paciente paga

*(a escrever quando a T-2 fechar)*
