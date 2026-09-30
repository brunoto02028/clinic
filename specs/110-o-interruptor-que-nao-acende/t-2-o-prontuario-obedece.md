# T-2: O prontuário obedece ao interruptor

**Status:** pendente
**Depende de:** nenhuma

## Objetivo

Que desligar um módulo no painel esconda, no app, a coisa que o módulo nomeia.

## Contexto

Quatro itens do menu do app não carregam chave de módulo, então aparecem sempre:
**My records**, **My documents**, **Messages** e **Terms & consent**.

O grave é o primeiro — mas **não pelo motivo que eu primeiro disse**.

O servidor **já negava**: `GET /api/patient/clinical-notes` pedia `mod_records`
e respondia 403 com o módulo desligado. (Hoje pede `mod_clinical_notes` — ver a
seção da divisão abaixo.) Não há vazamento. O que há é o item **My
records** continuando no menu: o paciente vê o botão, toca, e cai num erro. A
porta está fechada; sobrou a maçaneta na parede.

O levantamento da T-3 está em `qa/levantamento-t-3.md`.

`Terms & consent` fica de fora de propósito: aceitar termos não é funcionalidade
que uma clínica desligue, pela mesma razão que "Quem tem acesso" e "Notificações"
não têm chave.

## Passos

1. `My records` (`/clinical-notes`) passa a ler **`mod_clinical_notes`**.

   **Este passo mudou duas vezes, e as duas estão registradas de propósito.**

   Escrevi `mod_clinical_notes` no plano. O levantamento da T-3 me fez achar que
   era errado — "essa chave não é lida por ninguém, o servidor usa `mod_records`"
   — e eu corrigi para `mod_records`. Depois descobri que o portão de **página da
   web** já lia `mod_clinical_notes` pelo mapa href → módulo: a chave nunca foi
   morta, eu é que não tinha olhado o lugar certo.

   O plano original estava certo pelo motivo errado. A entrega é
   `mod_clinical_notes` nos cinco lugares, com o Bruno decidindo entre um
   interruptor e dois — e escolhendo dois.
2. `My documents` passa a ler `mod_documents`.
3. `Messages` passa a ler `mod_messages`.
4. `Terms & consent` **continua sem chave**, e ganha comentário dizendo por quê —
   senão alguém "conserta" isso daqui a seis meses.
5. Conferir que os três já vêm ligados por padrão hoje, para ninguém perder
   acesso ao instalar a atualização.

## Quem perderia acesso: medido em produção, antes de virar

O QA mediu no banco local — 1 plano, 0 assinaturas ativas — e registrou, com
razão, que aquilo não responde pela produção. A medição de produção foi feita
antes da mudança, por consulta direta:

```
planos em produção: 2
  "Monthly Rehabilitation Package" (ACTIVE): records=true notes=true
  -> nenhum plano concede um sem o outro

pacientes: 8
  -> nenhum tem override de um sem o outro

pacientes com fullAccessOverride (passam por cima dos dois): 3
```

E nos caminhos padrão: o plano gratuito não concede nenhuma das duas chaves, e o
pacote de tratamento concede as duas. **Nenhum caminho cria progresso sem nota
por acidente** — a separação só acontece quando alguém a escolhe, que é o ponto.

## Arquivos afetados

- `mobile/app/(app)/(clinica)/(tabs)/profile.tsx`

## Critérios de aceite

- [ ] Desligar *Clinical Notes* esconde **My records** no app
- [ ] Desligar *My Documents* esconde **My documents**
- [ ] Desligar *Messages* esconde **Messages**
- [ ] *Terms & consent* aparece com tudo desligado
- [ ] Com os módulos ligados — o estado de hoje — o menu não muda
