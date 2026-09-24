# T-13: Aviso de não emergência no app

**Status:** ✅ concluída
**Depende de:** nenhuma

## Objetivo
Deixar explícito, onde o paciente vê, que isto não é serviço de emergência.

## Contexto
Item do `plano-comercial.md` (compliance, as nove pendências): *"aviso de não emergência no contrato
e no app: alertas revisados em horário comercial; em caso de sintomas, procurar GP, 111 ou 999"*.

É a peça de software de uma pendência jurídica, é barata, e é pré-requisito de **vender** — mas a
razão principal é o paciente. Enquanto não existir, todo alerta que o app manda carrega uma
promessa implícita de vigilância contínua que a clínica não faz.

## Passos
1. Texto curto e fixo: quem revisa, em que horário, e o que fazer diante de sintoma agudo (999/111
   no Reino Unido; no texto em português, o equivalente local).
2. Onde aparece: tela de dispositivos, tela de pressão, e no rodapé de toda mensagem de alerta —
   e-mail e push. Não é um aceite escondido nos termos.
3. Aceite explícito **uma vez**, registrado com data e versão do texto (`ConsentLog`, que já
   existe), antes de o paciente conectar o primeiro aparelho.
4. Toda mensagem de crise (≥180/120) já diz "ligue 999"; esta tarefa garante que o aviso genérico
   esteja presente também quando nada aconteceu.
5. Bilíngue, inglês primeiro. Nada de "Rehab" no texto; "Terapeuta", nunca "fisioterapeuta".

## O que foi feito

- `lib/non-emergency-notice.ts`: o texto, em EN e PT, com uma versão (`1.0`) que é gravada junto com
  o aceite — "aceitou" só significa alguma coisa com "aceitou **este** texto".
- Aparece em quatro telas: dispositivos e pressão, na web e no app.
- **Rodapé de alerta:** o e-mail de crise leva a frase curta. E, de quebra, corrigi uma incoerência
  que o QA da T-11 achou: o e-mail dizia "contate seu médico se a leitura persistir" enquanto o push
  dizia "vá ao pronto-socorro agora" — para a **mesma** leitura de crise. Agora os dois dizem a
  mesma coisa.
- **Aceite obrigatório antes do primeiro aparelho**, gravado em `ConsentLog` com
  `MONITORING_NOTICE_ACCEPTED` + versão. Recusado **no servidor** (`/api/wearables/connect`), não só
  na tela. O staff conectando o aparelho da clínica não passa por este gate: é outro ato.
- Impersonação não pode aceitar pelo paciente — a declaração é dele.

## Arquivos afetados
- componente de aviso (web + mobile)
- `lib/email-i18n.ts` (rodapé dos alertas)
- `ConsentLog`

## Critérios de aceite
- [ ] O aviso aparece nas três telas e no rodapé dos alertas
- [ ] O aceite é registrado com data e versão do texto
- [ ] Sem aceite, o paciente não conecta aparelho
- [ ] Bilíngue, inglês primeiro
