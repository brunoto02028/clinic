# Ficha do BPR Clinic no Google Play

App criado em 29/09/2026. Conta **BA Intelligence** (`5096230453596766523`),
app id `4976328713190561993`, pacote **`com.bpr.clinic`** (permanente).

## Arquivos daqui

| arquivo | onde vai |
|---|---|
| `icon-512.png` | Store listing → Graphics → **App icon** (512×512, exigido) |
| `feature-1024x500.png` | Store listing → Graphics → **Feature graphic** (1024×500, exigido) |
| `data-safety.md` | as respostas do formulário **Data safety**, levantadas do código |

O uploader do Play Console **ignora arquivo enviado por automação** — ele não
abre seletor e descarta `setInputFiles`. Os dois gráficos precisam ser
arrastados à mão; é o único motivo de eles ainda não estarem lá.

## Feito e salvo no Console

- Política de privacidade → `https://bpr.clinic/privacy` (confirmado 200)
- Anúncios → nenhum (verificado: não há SDK de anúncio no `package.json`)
- Apps governamentais → Não
- Recursos financeiros → nenhum
- Ficha da loja → nome, descrição curta e longa **salvos como rascunho**

## Travado, e por quê

**Tudo converge numa coisa: uma conta de paciente de teste em produção.**

O Google diz, na própria tela: *"We can't create new accounts"*. Sem credencial
o app é reprovado na revisão — e **Sign-in details bloqueia o questionário de
público-alvo**, que por sua vez segura a classificação de conteúdo.

A mesma conta resolve as capturas de tela: o Play exige 2 a 8 de telefone, mais
tablet de 7" e de 10". Com o bundle web consertado hoje, dá para abrir o app no
navegador e fotografar as telas de verdade — mas só logado.

Regra da casa: **nunca logar em paciente real**. Então é um paciente de teste
dedicado, identificado como tal, com conteúdo plantado (uma consulta, um artigo,
um documento) para as telas não saírem vazias.

## Decisões pendentes

- **Público-alvo**: recomendo **18+**. Marcar qualquer faixa abaixo aciona a
  política de Famílias, com exigências que não fazem sentido aqui.
- **Categoria**: recomendo **Medical**, não "Health & Fitness" — é clínica, com
  receita e prontuário, não app de treino.
- **E-mail público da ficha**: `admin@bpr.clinic` (o domínio recebe; MX no Zoho).
- **Telefone público**: nenhum número real existe no código. Campo é opcional.

## E depois disso

Nunca houve build Android — zero na EAS. Antes do primeiro build eu configuro o
bloco `android` do `submit` no `eas.json` e a conta de serviço do Google Cloud.
Build só com autorização.
