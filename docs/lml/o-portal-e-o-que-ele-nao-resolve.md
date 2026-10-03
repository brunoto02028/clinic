# O Client Portal da LML — o que ele faz, e o que não resolve

**Guia guardado em** `docs/lml/LML-Client-Portal-User-Guide-2024.pdf` (24 páginas,
quase todo capturas de ecrã). O texto extraído está em `portal-guide-texto.txt`.

**Lido em** 03/10/2026, a pedido do Bruno.

## O que o portal é

O fluxo **manual** de uma clínica que colhe sangue no próprio local. Passo a
passo, como o guia o descreve:

1. **Login** na conta de admin — as credenciais são pedidas por um formulário
   Microsoft Forms, não criadas por nós.
2. **Configurar a conta**: morada, horário de funcionamento, e **um utilizador
   por membro da equipa**.
3. **Criar o paciente** — e o guia avisa, com todas as letras, que o e-mail tem
   de estar certo *"so that the patient receives their results"*. Ou seja: **é a
   LML que entrega o resultado ao paciente**, por e-mail.
4. **Pedir o exame**: achar o paciente → criar marcação → escolher dia e hora →
   escolher o produto pelo nome ou **pelo código** (*"e.g. Cholesterol Profile
   (LIP)"*) → confirmar.
5. **Na marcação**: check-in → confirmar dados (há um campo opcional de detalhes
   clínicos) → **imprimir o formulário de pedido** → colher → conferir data e
   hora da amostra → **etiquetar as amostras à frente do paciente** e recolher as
   assinaturas → marcar a amostra como colhida.
6. **Marcar noutro local**: por **código postal**, vendo os pontos disponíveis e
   os horários com vaga.
7. **Ver exames**: lista cronológica com o estado, incluindo se a amostra já
   chegou ao laboratório.

Contactos que o guia dá: `info@londonmedicallaboratory.co.uk` e
**+44 (0)20 7183 3718**.

## O que isto não resolve

**Não substitui o token da API, e não desbloqueia nada da 081.**

A varredura de 26/09 (`specs/081-.../lml-api-map.md`) já mostrou que a API cobre
este mesmo fluxo, e melhor:

| o portal faz à mão | a API já expõe |
|---|---|
| escolher produto pelo código | `/docs/products`, com `appointment_only` e biomarcadores |
| saber se é kit ou colheita | `GET /api/product/{id}/shipping` → `home_kit`, `walk_in`, … |
| procurar local por código postal | `GET /api/test_location/nearest/{lat}/{long}`, com `next_available_slot` |
| ver o estado do exame | o que a 081 T-8 espera resolver por webhook |

Automatizar o portal seria escrever um robô para clicar num site que **já tem
API** — frágil a cada mudança de ecrã, e a mexer num sistema com dados de
pacientes reais. O que falta continua a ser **uma coisa só: o token**.

## O que o portal acrescenta, e é real

**Mostra o passo que a 081 deixou de fora de propósito.** A decisão de 25/09 foi
*"só kit de casa nesta atividade"*, porque a colheita venosa puxa agendamento,
local e um profissional. O portal é exactamente esse fluxo — e é a prova de que
a LML o suporta para uma clínica como a BPR colher no próprio consultório.

Isso é uma atividade à parte, não uma tarefa da 081.

**E destapa uma pergunta que ainda não fizemos:** no portal, **é a LML que manda
o resultado ao paciente por e-mail**. No nosso desenho, o resultado entra no
prontuário e o terapeuta liberta-o (081 T-9). Os dois caminhos ao mesmo tempo
significam o paciente a receber o resultado por e-mail do laboratório **antes** de
alguém o ter visto — que é precisamente o que a T-4 (consentimento e liberação)
existe para evitar.

## O que pedir à LML

Uma pergunta, pelos contactos acima:

1. **Credenciais de API** para o ambiente de testes e para produção — é o que
   está a bloquear T-5 a T-9.
2. Se a API cobre o fluxo de **marcação e colheita** que o portal faz à mão.
3. Se dá para **desligar o envio do resultado por e-mail ao paciente**, ou
   escolher que ele vá só para a clínica.

## Sobre aceder ao portal

As credenciais vão para o `.env` (`LML_PORTAL_USER`, `LML_PORTAL_PASSWORD`),
nunca para a conversa. E com um limite escrito: **só para ler** — catálogo,
códigos, nomes de campos, o desenho do fluxo. Não criar paciente, não criar
marcação, não tocar em dado de pessoa real. Um portal de laboratório tem dados
clínicos de gente de verdade, e um clique errado ali não é um teste.
