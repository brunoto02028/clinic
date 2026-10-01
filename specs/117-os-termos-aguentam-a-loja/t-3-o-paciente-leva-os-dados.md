# T-3: O paciente leva os dados dele

**Status:** pendente

## Objetivo

Que o paciente possa **ver e levar** o que está guardado sobre ele, sem pedir a
ninguém.

## O que existe e o que falta

Apagar a conta existe, e está bem feito. **Exportar não existe** — não há rota
nenhuma.

É metade de um direito: a pessoa pode destruir o que não vê. No Reino Unido o
acesso e a portabilidade são direitos próprios, e nos dois casos o prazo é de um
mês a contar do pedido — um prazo que só se cumpre com folga se a resposta for
automática.

## O desenho

Um botão na conta, ao lado do de apagar: **"Levar os meus dados"**. Gera um
arquivo com o que o prontuário tem — leituras, consultas, documentos,
mensagens, consentimentos — e manda-o para o e-mail da pessoa.

**Não é um despejo do banco.** Um JSON de tabelas internas cumpre a letra e falha
o propósito: quem pede os dados quer lê-los, não decifrá-los.

E **nada sai sem ser pedido**: é botão, como tudo o que alcança um paciente nesta
casa.

## Passos

1. A rota que monta o pacote, com o mesmo critério de inquilino de sempre.
2. O botão na conta, no app.
3. Registo de que foi pedido e quando — é o que prova o prazo cumprido.
4. O que **não** entra: nada de outro paciente, nada de nota interna da clínica
   que a lei não obrigue a entregar. Esta linha é de quem assina, não minha.

## Critérios de aceite

- [ ] O paciente exporta sozinho, do app
- [ ] O pacote é legível por uma pessoa
- [ ] Fica registado o pedido e a entrega
- [ ] Um paciente nunca recebe dado de outro
