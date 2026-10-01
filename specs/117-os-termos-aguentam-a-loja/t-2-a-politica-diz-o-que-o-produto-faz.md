# T-2: A política diz o que o produto faz

**Status:** pendente
**Depende de:** T-1

## Objetivo

Que a política de privacidade descreva o produto que existe — e não uma versão
dele com dois fornecedores.

## O achado

**Corrigido em 01/10/2026** — ver [`inventario.md`](inventario.md). São **dois
documentos** e eles **discordam**:

| | nomeia |
|---|---|
| `app/privacy/page.tsx` | Anthropic, Groq, Google Gemini, AssemblyAI, Stripe |
| `lib/terms-content.ts` v1.3 (o que o paciente aceita) | AssemblyAI, Google Gemini, MediaPipe, Stripe, WhatsApp |

Os termos aceites **não** nomeiam a Anthropic nem a Groq. E o **OpenRouter**, que
recebe o prompt primeiro, não está em nenhum dos dois.

Então esta tarefa não é acrescentar nomes a uma lista: é **reconciliar dois
documentos** e fazer os dois saírem do mesmo registo, com um teste que olhe para
os dois ficheiros. O que estava escrito aqui antes: O rastreio da T-1 encontrou **32
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


---

## O escopo cresceu: monitorização contínua (01/10/2026)

O Bruno decidiu ligar o relógio de cada paciente ao sistema (099 T-7/T-8), e
perguntou se a política aguenta. **Medi antes de responder**, procurando nos dois
documentos legais por *Withings*, *wearable*, *heart rate*, *frequência
cardíaca*, *sono*, *sleep*, *ECG* e *monitoriz*:

**Zero ocorrências, em nenhum dos dois.**

A política descreve uma clínica que marca consultas e guarda prontuário. O que
passa a existir é outra coisa: **dado fisiológico contínuo**, recolhido do
aparelho do paciente **todos os dias, sem ele fazer nada**, incluindo ECG e
deteção de fibrilhação.

### Porque isto não é "mais um processador na lista"

| | consulta | monitorização contínua |
|---|---|---|
| quando o dado nasce | num ato do paciente | **sozinho, 1440 vezes por dia** |
| o que é | o que ele contou e o terapeuta escreveu | **sinal fisiológico bruto** |
| volume | linhas | **séries** |
| apagar | apagar um registo | apagar o histórico e **parar a recolha** |

E há um item que muda a categoria do produto: **ECG e fibrilhação atrial**. Isso
é o terreno onde um texto mal escrito transforma "a BPR regista" em "a BPR
deteta" — e essa frase é a diferença entre uma clínica e um dispositivo médico.
É a mesma linha que a 105 T-6 e a 115 defenderam para a pressão.

### O que a política tem de ganhar, além do que já estava escrito acima

1. **Que existe recolha contínua, e de quê.** Nomeando: frequência cardíaca,
   sono e as suas fases, oxigenação, temperatura, atividade, ECG, fibrilhação.
   E **com que frequência** — "continuamente" é uma palavra, "a cada minuto" é
   um facto.
2. **Que é o paciente que liga, e que pode desligar.** Com o que acontece ao
   desligar: para de recolher, e o que já veio fica ou sai — **é decisão a tomar,
   não a descrever depois**.
3. **Quanto tempo se guarda a série.** Uma série minuto a minuto não tem o mesmo
   prazo que um recibo, e guardar "para sempre" é uma escolha que precisa de
   razão escrita.
4. **Quem vê.** O terapeuta vê; e dizer isso é o que separa "monitorização" de
   "vigilância".
5. **Que a Withings é a fonte**, e que o dado passa por ela — que é facto, e é
   um processador a nomear como os outros.
6. **Que nós não diagnosticamos**, aqui com todas as letras: registamos o que o
   aparelho mediu e o que o fabricante dele concluiu.

### O que isto não muda

Continua a ser verdade que há **dois documentos que se contradizem** e que o
**OpenRouter não está em nenhum**. A monitorização acrescenta escopo; não
substitui a reconciliação que esta tarefa já tinha.
