# T-2: A política diz o que o produto faz

**Status:** pendente
**Depende de:** T-1

## Objetivo

Que a política de privacidade descreva o produto que existe — e não uma versão
dele com dois fornecedores.

## O achado

A política nomeia **Anthropic e Stripe**. O rastreio da T-1 encontrou **32
terceiros** que o código alcança, dos quais **16 recebem dado de paciente hoje**
e **15 recebem categoria especial** — saúde ou gravação de consulta.

A lista não se escreve mais à mão: está em `lib/terceiros.ts`, com o que cada um
recebe, a sede e o estado, e um teste que cai quando aparece um terceiro novo.
**Esta tarefa gera a política a partir daquele registo**, não de uma lista
copiada para um terceiro lugar — foi assim que a contagem errada nasceu.

O inventário com arquivo e linha está em [`inventario.md`](inventario.md).

Não é um detalhe de redação. É a diferença entre uma pessoa saber que a conversa
com o terapeuta dela passa por um serviço de transcrição de terceiros, e não
saber.

## O que a política precisa de ganhar

1. **Quem recebe, e o quê** — por categoria, com os nomes. "Parceiros
   tecnológicos" não é resposta; é a forma educada de não responder.
2. **Onde é processado** — vários destes são dos Estados Unidos, e transferência
   internacional tem regra própria.
3. **Por quanto tempo** se guarda cada coisa. Gravação de consulta e recibo de
   pagamento não têm o mesmo prazo nem a mesma razão.
4. **Com que base legal** se trata dado de saúde, que é categoria especial.
5. **Como exercer os direitos** — e a T-3 é o que faz isso ser verdade em vez de
   um endereço de e-mail.

## O que não fazer

**Não copiar um modelo.** Uma política genérica que não cite a transcrição da
consulta é pior que nenhuma: dá a aparência de conformidade e descreve outro
produto.

E **não escrever o que ainda não é verdade**. Se a exportação não existe, a
política não a promete — ou sai junto com a T-3, ou não se menciona.

## Passos

1. Reescrever a partir do inventário da T-1, nas duas línguas, inglês primeiro.
2. Subir `TERMS_CONTENT_VERSION` — quem já aceitou aceitou outra coisa, e o
   registo tem de saber distinguir.
3. Decidir se a mudança exige novo aceite. **É decisão do Bruno**, e a
   recomendação é que sim: a lista de quem recebe dado de saúde não é um ajuste
   de redação.
4. Um teste: **todo terceiro com `especial: true` em `lib/terceiros.ts` aparece
   na política, nas duas línguas**. O guarda da T-1 garante que o registo
   conhece o código; este garante que a política conhece o registo. São dois
   elos, e sem o segundo a política volta a envelhecer sozinha.

## Critérios de aceite

- [ ] Cada terceiro que recebe dado de paciente está nomeado
- [ ] Os de categoria especial estão identificados como tal
- [ ] A versão subiu, e o registo de consentimento distingue as versões
- [ ] A política não promete nada que o produto não faça
- [ ] Um terceiro novo sem entrada na política derruba o teste
