# Atividade 114 — O Withings não traz dado

**Aberta:** 30/09/2026, a pedido do Bruno.

## O que ele viu

> *"A conexão lá em devices no Withings está ok, mas não tem nenhum update,
> nenhuma informação atualizada. Isso não pode acontecer, as informações precisam
> vir em tempo real sempre que o paciente receber dados lá no Withings. O View my
> data está vazio mesmo a conta estando conectada."*

Nas capturas: a conta aparece **conectada**, com *"Last sync: 30 Sep 2026"* —
hoje. E *"View my data"* abre uma tela com **"Last 7 days"** e nada embaixo.

## Um detalhe das capturas que muda o diagnóstico

A tela de **pressão arterial** do mesmo paciente mostra leituras marcadas *"from
your device"* — de **24 de setembro**. Então o Withings **já entregou** dado por
este caminho; parou.

Isso separa duas perguntas que pareciam uma:

1. **A pressão** chega por um caminho que já funcionou. Por que parou em 24/09?
2. **Sono, atividade e recuperação** — o que o *View my data* mostraria — nunca
   apareceram, ou vêm por outro caminho?

**Nada será consertado antes de responder isso.** Tratar as duas como o mesmo
defeito é como se conserta o caminho errado.

## "Em tempo real", e o que a API da Withings permite

O pedido é que o dado chegue assim que existir. A integração tem `webhook`,
`sync` e `resubscribe` em `app/api/wearables/`, então o desenho já previa isso.

O que esta casa já aprendeu sobre essa API, e vale relembrar antes de mexer:

- o webhook é **por tipo de dado** (`appli`), e cada tipo precisa de assinatura
  própria — assinar pressão não traz sono;
- o webhook tem de **sempre responder status 0**, senão a Withings desativa a
  assinatura em silêncio;
- **não dá para revogar token pela aplicação**;
- a conta da clínica tem de ter **um perfil só**, senão a leitura some sem erro.

Uma assinatura que caiu explica exatamente o quadro: conexão "ok", *last sync* de
hoje, e nenhum dado novo.

## Tarefas

| T-N | nome | status |
|---|---|---|
| T-1 | [Medir antes de consertar](t-1-medir-antes.md) | parcial — [metade medida](qa/report-t-1.md) |
| T-2 | [O que "conectado" está dizendo](t-2-o-que-conectado-diz.md) | pendente |
| T-3 | [A assinatura que cai em silêncio](t-3-a-assinatura-que-cai.md) | pendente |
| T-4 | [A tela vazia que não explica](t-4-a-tela-vazia.md) | pendente |

## Suposições

- **A assinatura caída é a hipótese principal**, não a conclusão. A T-1 existe
  para não repetir o que acabou de acontecer com o `version.json`: três
  tentativas de conserto antes de medir.
- **"Tempo real" pode não ser alcançável para tudo.** A Withings entrega alguns
  tipos por webhook e outros só por consulta. Se sono for do segundo grupo, o
  honesto é dizer de quanto em quanto tempo chega — e não prometer tempo real.
- **O plano gratuito vai até 5.000 chamadas.** Uma varredura por paciente a cada
  poucos minutos estoura isso; o webhook existe por essa razão.
- **Isto toca dado clínico de paciente real.** Nenhuma medição em produção com a
  conta de um paciente que não seja de teste — e o Bruno já ofereceu a dele para
  este tipo de verificação.
